import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroundingBundle,groundingContentId,type GroundingBundle} from '../../grounding/contract.ts';
import {createResearchBriefing,parseResearchBriefing,researchForActor} from '../../grounding/briefing.ts';
import {plannerFixture} from './helpers/planner-fixture.ts';
import {createDynamicPlan} from '../../dynamic-scenarios/plan.ts';
import {createDynamicInput} from '../../dynamic-scenarios/execution.ts';
import {deterministicTurn,type TurnContext} from '../../stakeholder-simulation/engine.ts';
import {encodeTurnContext} from '../../server/inference/deepseek.ts';
import {executeLiveRun} from '../../server/inference/service.ts';
import {createSociety,saveSociety,restoreSociety} from '../../society/engine.ts';
import {buildDecisionContext} from '../../society/hybrid.ts';
import {encodeMenuContext} from '../../society/decision-menu.ts';
import {selectCommunication} from '../../society/communication.ts';
import {citizenV5Context} from './helpers/citizen-v5.ts';
import {populationView,buildPopulation} from '../../server/population/store.ts';
import {projectReportEvidence} from '../../report-summary/evidence.ts';
import {projectDetailedReportEvidence} from '../../report-detailed/evidence.ts';
import {projectGraphSummaryContext} from '../../graph-summary/evidence.ts';
import type {PublicExplore} from '../../society/public-contract.ts';
import {parsePublicExplore} from '../../question-simulation/public-session.ts';

function bundle(research=true):GroundingBundle {
 const retrievedAt='2026-11-02T00:00:00.000Z';
 const sources=Array.from({length:research?16:2},(_,i)=>{const passage=i===15?'Nurses staffing clinical training responsibilities. '+ 'Clinical staffing background. '.repeat(24):`Published source ${i} reports general background. `+'General context. '.repeat(40);return {id:'source-'+i,title:i===15?'Nurses staffing':'Background '+i,url:`https://www.moh.gov.sg/fixture-${i}`,publisher:'www.moh.gov.sg',publishedAt:null,retrievedAt,passages:[{id:groundingContentId('p',passage),text:passage}]};});
 return createGroundingBundle({status:'retrieved',query:'Singapore care scenario',retrievedAt,sources,limitations:['No waiting-time calculation is available.'],usage:{searches:research?4:1,credits:research?4:1},...(research?{research:{version:1 as const,budgetCredits:30 as const,reservedCredits:4,stopReason:'coverage' as const,queries:Array.from({length:4},(_,i)=>({query:'Singapore care '+i,topic:'background',status:'retrieved' as const,credits:1,sourceIds:sources.slice(i*4,i*4+4).map(s=>s.id)}))}}:{})});
}
test('extractive briefing retains all excerpts, accounting and dates without manufacturing verified findings',()=>{
 const input=bundle(),value=createResearchBriefing(input)!;
 assert.equal(value.sources.length,16);assert.equal(value.sources[15].passage,input.sources[15].passages[0].text);
 assert.equal(value.reportedCredits,4);assert.equal(value.reservedCredits,4);assert.equal(value.budgetCredits,30);
 assert.equal(value.sources[0].publishedAt,null);assert.equal(value.sources[0].url,'https://www.moh.gov.sg/fixture-0');
 assert.match(value.assumption,/initial background/i);assert.match(value.assumption,/not.*encounter|not.*read/i);assert.match(value.gaps.join(' '),/not verified/i);
 assert.equal(createResearchBriefing(bundle(false)),undefined);
 const hostile={...value,profiles:[{private:'PRIVATE_PROFILE'}]};assert.throws(()=>parseResearchBriefing(hostile));
 assert.throws(()=>parseResearchBriefing({...value,sources:[{...value.sources[0],url:'file:///private'}]}));
 for(const patch of [{reportedCredits:31},{reportedCredits:5},{searches:3},{status:'failed'},{stopReason:'not-configured'}])assert.throws(()=>parseResearchBriefing({...value,...patch}));
});
test('role highlights select matching retained source IDs while preserving common background',()=>{
 const value=createResearchBriefing(bundle())!,context=researchForActor(value,'Nurse staffing clinical responsibilities');
 assert.equal(context.sources.length,16);assert.equal(context.highlights[0].sourceId,'source-15');
 assert.equal(context.highlights[0].passage,value.sources[15].passage);assert.equal(context.sources[0].id,'source-0');
 assert.ok(Buffer.byteLength(JSON.stringify(context))<10000);
});
test('every initial stakeholder turn receives all retained research rather than only ontology selections',async()=>{
 const f=plannerFixture();f.draft.ontology!.entities[0].support=null;const input=await createDynamicInput(await createDynamicPlan(f.request,f.draft,bundle()));let firstTurns=0;
 const result=await executeLiveRun(input,'research-initial',{enabled:true,key:'offline-only',transport:{records:[],generate:async(c:TurnContext)=>{
  const value=JSON.parse(encodeTurnContext(c));assert.equal(value.researchContext.sources.length,16);assert.equal(value.researchContext.sources[15].id,'source-15');assert.ok(value.researchContext.sources[15].passage.startsWith('Nurses staffing'));assert.ok(Buffer.byteLength(encodeTurnContext(c))<=24000);if(c.round===1)firstTurns++;return {value:deterministicTurn(c),record:{status:'accepted',inputTokens:null,outputTokens:null,totalTokens:null,costUsd:null}};
 }} as any});
 const {run}=result;assert.equal(firstTurns,4);assert.equal(run.events.length,8);assert.ok(result.inference.reservedTokens<=214400);assert.ok(!run.limitations.some(s=>/dialogue is ungrounded/i.test(s)));assert.match(run.limitations.join(' '),/published.*claims/i);
});
test('retained society research reaches decisions and replay without creating read events',()=>{
 const f=plannerFixture(),research=createResearchBriefing(bundle())!,input={runId:'research-society',question:f.request.question,seed:'research',population:populationView(buildPopulation({size:10000,seed:'research'})),roles:f.draft.agents,jurisdictions:f.draft.jurisdictions,acceptedActions:[],socialPolicy:'memory-aware-v1' as const,communication:selectCommunication([],[],['care']),hybrid:{selectedAgents:4,maxCalls:8,reservedTokens:200000,costUsd:.2},briefing:{assumptions:[],sources:[],research}};
 const world=createSociety(input),context=buildDecisionContext(world,world.agents[0].id,'channel:discussion');
 assert.equal(context.researchContext?.sources.length,16);assert.equal(world.events.length,0);assert.equal(world.agents[0].seen.length,0);
 const encoded=JSON.parse(encodeMenuContext({...context,policy:'action-menu-v1'}));assert.equal(encoded.researchContext.sources.length,16);
 assert.deepEqual(restoreSociety(saveSociety(world),world.genesis),world);
 assert.throws(()=>createSociety({...input,briefing:{...input.briefing,research:{...research,profiles:[]} as unknown as typeof research}}));
 for(const policy of ['conversation-menu-v4','conversation-menu-v5','conversation-menu-v6','conversation-menu-v7']){
  const citizen=citizenV5Context();citizen.policy=policy;citizen.researchContext=context.researchContext;
  assert.equal(JSON.parse(encodeMenuContext(citizen)).researchContext.sources.length,16,policy);
 }
});
test('quick, full and graph evidence reuse source claims; old evidence shapes remain absent',()=>{
 const run:PublicExplore={version:3,kind:'summary-execution',attemptId:'attempt',requestIdentity:'request',runId:'research-report',planId:null,question:'What changes?',status:'partial',request:null,graph:{version:1,scenarioIdentity:'scenario',executionIdentity:'research-report',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:null,actionCalls:null,inputTokens:null,outputTokens:null,costUsd:null},demographics:{private:'PRIVATE_PROFILE'},session:null,society:null};
 for(const project of [projectReportEvidence,projectDetailedReportEvidence,projectGraphSummaryContext]){
  assert.equal(Object.hasOwn(project(run),'research'),false);
  const value=project({...run,research:createResearchBriefing(bundle())});assert.equal(value.research?.sources.length,16);assert.doesNotMatch(JSON.stringify(value),/PRIVATE_PROFILE/);assert.match(value.research!.assumption,/claims/i);
 }
 const input=bundle(),large=createGroundingBundle({...input,sources:input.sources.map(s=>({...s,title:'資'.repeat(240),url:s.url+'?q='+'a'.repeat(1900),passages:[{...s.passages[0],text:'資'.repeat(800)}]}))});
 assert.equal(parsePublicExplore({...run,research:createResearchBriefing(input)}).research?.sources.length,16);
 assert.throws(()=>parsePublicExplore({...run,research:{...createResearchBriefing(input),profiles:[]}}));
 const research=createResearchBriefing(large)!;assert.ok(Buffer.byteLength(JSON.stringify(research))>60000);
 assert.equal(projectReportEvidence({...run,research}).research?.sources[15].passage,'資'.repeat(800));
 assert.equal(projectDetailedReportEvidence({...run,research}).research?.sources.length,16);
});
