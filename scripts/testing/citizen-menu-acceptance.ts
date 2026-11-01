/** Network-blocked capability fixture. Scripted choices establish integration,
 * not spontaneous model intelligence, real memory use or real issue resolution. */
import './offline-network.mjs';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {phase4eCommunication,phase4eFetcher,evictFixtureSession} from './phase4e-fixture.ts';
import {worldFixtures} from '../../lib/world-graph/fixtures.ts';
import {createDynamicPlan} from '../../lib/dynamic-scenarios/plan.ts';
import {createDynamicInput} from '../../lib/dynamic-scenarios/execution.ts';
import {resolveUserConditionIds} from '../../lib/dynamic-scenarios/user-condition-source.ts';
import {deterministicTurn,runStakeholderSimulation} from '../../lib/stakeholder-simulation/engine.ts';
import {getCitizenDataset} from '../../lib/server/citizen-grounding/data.ts';
import {getBaseline} from '../../lib/server/mrt-service.ts';
import {illustrativeLine} from '../../prototype/mrt/examples/illustrative-line.ts';
import {calculateCitizenCommutes} from '../../lib/citizen-grounding/commute.ts';
import {mockPersonalityRoster} from '../../lib/citizen-grounding/personality.ts';
import {createCitizenGrounding} from '../../lib/citizen-grounding/social.ts';
import {controlledIds,replayHybrid} from '../../lib/society/hybrid.ts';
import {multiDaySwarmPolicy} from '../../lib/society/swarm.ts';
import {multiDayComplete,saveSociety,restoreSociety} from '../../lib/society/engine.ts';
import {reserveStorageAdmission,bindStorageAdmission,storageBundle} from '../../lib/server/society/storage-admission.ts';
import {socialOperation,readSocialSession,checkpointSocialSession,type SocialDependencies,type SocialState} from '../../lib/server/society/service.ts';
import {startCoordinator,coordinatorStatus,stopCoordinators,type CoordinatorProgress} from '../../lib/server/society/coordinator.ts';
import {publicSociety,summaryGraph} from '../../lib/server/society/summary.ts';
import {aggregateFacts} from '../../lib/server/society/facts.ts';
import {canonical,ensure} from '../../lib/experiments/validation.ts';

const output=resolve('tmp/citizen-menu-storage-20261101/integration');mkdirSync(output,{recursive:true});
const privateRoot=mkdtempSync(join(output,'private-')),rows:unknown[]=[];
const dataset=getCitizenDataset(),baseline=getBaseline('2026-10-27'),commutes=calculateCitizenCommutes(dataset,baseline,illustrativeLine);
async function mrtSource(active:number){
 const f=structuredClone(worldFixtures()[3]),question="How could the hypothetical Illustrative North Link affect the same synthetic citizens' commutes, schedules, practical questions and local discussions over the following days?";
 f.request.question=question;f.draft.description=question;f.draft.trigger=question;Object.assign(f.draft,resolveUserConditionIds(['question-1'],question));
 const coordinates=illustrativeLine.stations.map(s=>{if(s.kind==='new')return {lat:s.lat,lon:s.lon};const station=baseline.stations.get(baseline.aliases.get(s.stationId)??s.stationId);ensure(station,'CITIZEN_ACCEPT_PLOT_STATION');return {lat:station.lat,lon:station.lon};});
 f.request.geometry={version:1,scenarioId:'citizen-mrt-capability',features:[...coordinates.map((coordinate,i)=>({kind:'point' as const,id:'station-'+i,label:'Illustrative station '+String.fromCharCode(65+i),coordinate,role:'station' as const,provenance:'user-drawn' as const})),{kind:'line',id:'illustrative-route',label:'Hypothetical North Link',coordinates,provenance:'user-drawn'}]};
 f.draft.assumptions.push({id:'technical-fixture',text:'A separately calculated hypothetical MRT proposal supplies immutable citizen commute references; construction, crowding and empirical behaviour are not modelled.'});
 return runStakeholderSimulation(await createDynamicInput(await createDynamicPlan(f.request,f.draft)),{attemptId:'citizen-grounded-'+active,provider:'offline-fixture',model:'fixture',generateTurn:async c=>deterministicTurn(c)});
}
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const authored=new Set(['post','message','comment','reply','group-reply']);
const mrtCommunication=()=>({...phase4eCommunication(),topics:['Commute route reviews','Work schedule coordination'].map((label,i)=>({id:'topic-'+(i+1),label}))});
interface WireChoice {id:string;action:string;target:string|null;destinationGroup:string|null;requiredMemories:string[]}
interface WireIssueChoice {id:string;kind:string;subjectId:string;basisRefs:string[];criterionId:string|null;sourceItem:string|null}
interface CitizenWire {id:string;tick:number;policy:string;actor:{id:string};choices:WireChoice[];topics:{id:string}[];items:{id:string;actorId:string;tick?:number;text:string;modelAuthored?:boolean}[];issues:{sourceItem:string;createdTick:number}[];issueChoices:WireIssueChoice[];grounding:{citizenId:string;facts:{id:string;value:unknown}[]};memories:{origin?:string}[]}
function fixture(){
 let contexts=0,createdGroups=0,maxContextBytes=0;const actors=new Set<string>(),selectedKinds:Record<string,number>={};
 const select=(raw:unknown)=>{
  const c=raw as any;ensure(c.policy==='conversation-menu-v5'&&c.grounding.citizenId===c.actor.id&&!Object.hasOwn(c.grounding,'profiles'),'CITIZEN_ACCEPT_ACTOR_CONTEXT');
  actors.add(c.actor.id);maxContextBytes=Math.max(maxContextBytes,Buffer.byteLength(JSON.stringify(c)));ensure(maxContextBytes<=24000,'CITIZEN_ACCEPT_CONTEXT_BOUND');
  const index=contexts++,inactive=c.choices.find((o:any)=>o.action==='inactive');
  let option=c.choices.find((o:any)=>['group-reply','message'].includes(o.action))??c.choices.find((o:any)=>['comment','reply'].includes(o.action)&&c.items.some((i:any)=>i.id===o.target&&i.modelAuthored&&i.actorId!==c.actor.id))??c.choices.find((o:any)=>authored.has(o.action))??inactive;
  if(index%17===8)option=inactive;
  const group=c.choices.find((o:any)=>o.action==='group-create');if(group&&createdGroups<1&&index%19===3){option=group;createdGroups++;}
  const isAuthored=authored.has(option.action);let text=isAuthored?'RAW_CITIZEN_MENU The commute route review has been recorded in this fictional discussion before the proposed service begins.':null;
  let evidence:any;if(isAuthored&&index%23!==2){
   evidence=c.issueOptions.find((o:any)=>o.subjectId==='commute'&&o.kind==='resolve');
   if(evidence)text='RAW_CITIZEN_MENU. My question is answered because the commute route review has been recorded before the proposed service begins.';
   else{evidence=c.issueOptions.find((o:any)=>o.subjectId==='commute'&&o.kind==='progress');if(evidence)text='RAW_CITIZEN_MENU. The commute route question is still pending before the proposed service begins.';}
   if(!evidence){evidence=c.issueOptions.find((o:any)=>o.subjectId==='commute'&&o.kind==='question');if(evidence)text='RAW_CITIZEN_MENU. Which commute route review will be recorded before the proposed service begins?';}
  }
  if(evidence)selectedKinds[evidence.kind]=(selectedKinds[evidence.kind]??0)+1;
  return {choiceId:option.id,text,motivation:'Explicit scripted capability selection, not live model evidence.',recallIds:[],stanceId:'keep',discussion:evidence?null:{topicIds:[],argument:'unspecified' as const},issueEvidenceId:evidence?.id??null,factIds:isAuthored&&index%5===0&&c.proseRules.allowedFactIds.includes('fact-mode')?['fact-mode']:[]};
 };
 return {select,stats:()=>({contexts,distinctActorContexts:actors.size,maxContextBytes,createdGroups,selectedKinds})};
}

const selection=process.argv[2];ensure(selection===undefined||selection==='50'||selection==='100','CITIZEN_ACCEPT_ARGUMENT');
try{
 for(const active of [50,100] as const){
  if(selection&&selection!==String(active))continue;
  const capacity=active===50?350:700,base=join(privateRoot,'cohort-'+active),directory=storageBundle(base).sessions,source=await mrtSource(active),f=fixture(),mock=phase4eFetcher(f.select);
  const claim=reserveStorageAdmission('citizen-menu-'+active,createHash('sha256').update(source.runId).digest('hex'),base);bindStorageAdmission(claim,{runId:source.runId,attemptId:'citizen-menu-'+active},base);
  const dependencies:SocialDependencies={directory,storageBase:base,storageAdmission:{base,claim},citizenMenuPolicy:'conversation-menu-v5',enabled:true,key:'offline-fixture-only',communication:mrtCommunication(),swarm:multiDaySwarmPolicy(active,capacity,320),fetcher:mock.fetcher,admission:{maxCalls:capacity,reservedTokens:active===50?16000000:32000000,costUsd:8},citizenGrounding:async preview=>{
   const activeIds=preview.agents.map(a=>a.id),capableIds=controlledIds(preview),roster=await mockPersonalityRoster({runId:source.runId,capableIds,backgroundIds:activeIds.filter(id=>!capableIds.includes(id)),seed:'citizen-grounded-acceptance-'+active});
   return createCitizenGrounding(dataset,commutes,roster,activeIds,capableIds);
  }};
  const began=performance.now();let state:SocialState=await socialOperation({operation:'start',run:source},dependencies),steps=0;
  ensure(state.world.genesis.version===6&&state.world.genesis.input.intelligence?.context==='conversation-menu-v5'&&state.world.genesis.input.citizenGrounding?.datasetId===dataset.id,'CITIZEN_ACCEPT_POLICY');
  const progress=():CoordinatorProgress=>({revision:state.revision,opportunities:state.world.hybrid!.records.length,tick:state.world.tick,totalSteps:320,acceptedDecisions:state.world.hybrid!.records.filter(r=>r.status==='accepted').length,participatingAgents:new Set(state.world.hybrid!.records.filter(r=>r.status==='accepted').map(r=>r.context.actor.id)).size,capacity,calls:state.admission.calls,admittedCalls:state.admission.maxCalls,completed:multiDayComplete(state.world),budgetLimited:state.admission.status==='budget-limited'&&state.world.tick<320,profileId:state.world.genesis.input.swarm!.multiDay!.profileId,capacityReason:state.world.status==='event-limit'?'EVENT_CAPACITY':state.world.status==='item-limit'?'ITEM_CAPACITY':undefined});
  const driver={inspect:async()=>progress(),step:async(signal:AbortSignal)=>{ensure(steps++<capacity+320+64,'CITIZEN_ACCEPT_PROGRESS_BOUND');state=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},dependencies,signal);return progress();},checkpoint:async()=>{await checkpointSocialSession(state.sessionId,dependencies);},publish:async()=>{}};
  await startCoordinator({runId:source.runId,directory,driver});let finalJob=coordinatorStatus(source.runId,directory)!;
  for(let i=0;i<180000;i++){finalJob=coordinatorStatus(source.runId,directory)!;if(finalJob.status!=='running')break;await new Promise(r=>setTimeout(r,10));}
  ensure(['completed','budget-limited','capacity-limited'].includes(finalJob.status),'CITIZEN_ACCEPT_COORDINATOR_TERMINAL');state=await readSocialSession(state.sessionId,dependencies);
  const w=state.world,records=w.hybrid!.records;ensure(records.length<=capacity&&records.length>0&&records.every(r=>r.status==='accepted'),'CITIZEN_ACCEPT_DECISIONS');ensure(w.tick===320||finalJob.status==='budget-limited'||finalJob.status==='capacity-limited','CITIZEN_ACCEPT_CLOCK');
  ensure(mock.maxInFlight()===1&&records.length===mock.calls.length&&new Set(records.map(r=>r.id)).size===records.length,'CITIZEN_ACCEPT_DISPATCH');
  const replayBegan=performance.now(),replayed=replayHybrid(w.genesis.input,w.tick,records,w.hybrid!.pending),fullReplayMs=performance.now()-replayBegan;ensure(canonical(replayed)===canonical(w)&&canonical(restoreSociety(saveSociety(w)))===canonical(w),'CITIZEN_ACCEPT_GENESIS_REPLAY');
  await checkpointSocialSession(state.sessionId,dependencies);const journal=join(directory,state.sessionId+'.jsonl'),before=hash(journal),callsBefore=mock.calls.length;evictFixtureSession(directory,state.sessionId);
  const tailBegan=performance.now(),restored=await readSocialSession(state.sessionId,{...dependencies,citizenGrounding:undefined}),checkpointTailMs=performance.now()-tailBegan;ensure(canonical(restored.world)===canonical(w)&&hash(journal)===before&&mock.calls.length===callsBefore,'CITIZEN_ACCEPT_CHECKPOINT_REPLAY');
  const summary=publicSociety(w),facts=aggregateFacts(w,w.events),graph=summaryGraph({version:1,scenarioIdentity:'citizen-grounded-fixture',executionIdentity:source.runId,nodes:[],edges:[],limitations:[]},summary),publicText=JSON.stringify({summary,graph,facts});
  ensure(!publicText.includes('RAW_CITIZEN_MENU')&&!publicText.includes('employmentRelationship')&&!publicText.includes('communicationStyle')&&!publicText.includes('fieldProvenance'),'CITIZEN_ACCEPT_PRIVACY');ensure(Buffer.byteLength(JSON.stringify(summary))<262144,'CITIZEN_ACCEPT_PUBLIC_BOUND');
  ensure(summary.counts.events===w.events.length&&summary.usage.accepted===records.length&&summary.clock?.daily.reduce((n,d)=>n+d.acceptedDecisions,0)===records.length&&facts.claims.every(c=>c.sourceEventIds.every(id=>w.events.some(e=>e.id===id))),'CITIZEN_ACCEPT_FACT_RECONCILIATION');
  const history=w.agents.flatMap(a=>a.issueHistory??a.issues??[]),authoredEvents=w.events.filter(e=>e.source==='social-model'&&authored.has(e.type));
  const row={active,capable:controlledIds(w).length,capacity,horizon:320,tick:w.tick,terminal:finalJob.status,accepted:records.length,rejected:0,inactive:records.filter(r=>r.decision?.action==='inactive').length,participatingAgents:new Set(records.map(r=>r.context.actor.id)).size,modelAuthored:authoredEvents.length,privateAuthored:authoredEvents.filter(e=>!!e.groupId).length,groups:w.groups?.length??0,modelGroupCreations:w.events.filter(e=>e.source==='social-model'&&e.type==='group-create').length,issueUpdates:records.filter(r=>r.decision?.issueUpdate).length,issues:{total:history.length,open:history.filter(i=>i.status==='open').length,resolved:history.filter(i=>i.status==='resolved').length,withdrawn:history.filter(i=>i.status==='withdrawn').length,progress:records.filter(r=>r.decision?.issueUpdate?.kind==='progress').length},episodicOnlyReferences:records.reduce((n,r)=>n+r.context.memories.filter(m=>m.origin==='episodic').length,0),fixture:f.stats(),clock:summary.clock,commute:{datasetId:dataset.id,scenarioFingerprint:commutes.scenarioFingerprint,representedAgents:commutes.facts.length,diagnostics:commutes.diagnostics},storage:{journal:statSync(journal).size,checkpoint:statSync(join(directory,state.sessionId+'.materialized.json')).size,world:Buffer.byteLength(saveSociety(w)),publicPayload:Buffer.byteLength(JSON.stringify({summary,graph}))},timing:{elapsedMs:performance.now()-began,fullReplayMs,checkpointTailMs},fullGenesisReplayExact:true,checkpointTailReplayExact:true,privacyLeaks:0,providerConcurrency:mock.maxInFlight(),paidCalls:0,interpretation:'Scripted offline capability fixture. Initial stakeholder fixture and illustrative MRT calculation are technical inputs, not a live accepted MRT plan. Owner-reported issue closure and episodic inclusion do not prove real-world resolution or substantive memory use.'};
  rows.push(row);writeFileSync(join(output,'citizen-menu-'+active+'.json'),JSON.stringify({version:1,privateRoot,rows:[row]},null,2));console.log(JSON.stringify(row));await stopCoordinators(directory);
 }
}finally{await stopCoordinators();}
