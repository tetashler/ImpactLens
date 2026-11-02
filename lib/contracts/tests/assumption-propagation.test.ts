import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import type {AssumptionReview} from '../../assumption-review/contract.ts';
import {ASSUMPTION_REVIEW_INSTRUCTION,reviewContext} from '../../assumption-review/contract.ts';
import {citizenV5Context} from './helpers/citizen-v5.ts';
import {createSocialTransport} from '../../server/inference/social.ts';
import {projectReportEvidence,reportSnapshotKey,createReportSummaryGenerator} from '../../server/report-summary.ts';
import {projectDetailedReportEvidence} from '../../report-detailed/evidence.ts';
import {detailedReportSnapshotKey,createDetailedReportGenerator} from '../../server/report-detailed.ts';
import {projectGraphSummaryContext} from '../../graph-summary/evidence.ts';
import {graphSummarySnapshotPayload} from '../../graph-summary/contract.ts';
import {createGraphNodeSummaryGenerator} from '../../server/graph-node-summaries.ts';
import type {PublicExplore} from '../../society/public-contract.ts';
import {buildPopulation,populationView} from '../../server/population/store.ts';
import {createSociety,saveSociety,restoreSociety} from '../../society/engine.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {buildDecisionContext,decisionReservation} from '../../society/hybrid.ts';
import {HYBRID_DEFAULTS} from '../../society/decision-contract.ts';
import {encodeMenuContext} from '../../society/decision-menu.ts';
import {canonical} from '../../experiments/validation.ts';
import {decisionContextBytes,packDeepContext} from '../../society/context-capacity.ts';
import {deepSwarmPolicy,swarmHybrid} from '../../society/swarm.ts';
import {TOPIC_POLICY} from '../../society/intelligence.ts';
import {phase4dWorld} from './phase4d-fixture.ts';

const review=():AssumptionReview=>({version:1,policy:'assumption-approval-v1',sourcePlanId:'dynamic-plan-'+ 'a'.repeat(64),contextKey:'b'.repeat(64),reviewedAt:'2026-11-02T15:00:00.000Z',items:Array.from({length:6},(_,index)=>({assumptionId:'review-'+index,text:'Distinct hypothetical premise '+index,decision:index%2?'allow':'do-not-allow'}))});
function run():PublicExplore{return {version:3,kind:'summary-execution',attemptId:'attempt',requestIdentity:'request',runId:'assumption-review-run',planId:null,question:'What may change?',status:'partial',request:null,graph:{version:1,scenarioIdentity:'scenario',executionIdentity:'assumption-review-run',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:['Allowed hypothetical premise'],limitations:['Incomplete run'],sources:[],accounting:{planningCalls:null,actionCalls:null,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:null,society:null};}
function observer(){const bodies:any[]=[];return {bodies,fetcher:async(_url:unknown,init?:RequestInit)=>{bodies.push(JSON.parse(String(init?.body)));return new Response('Unavailable',{status:503});}};}

for(const policy of ['conversation-menu-v3','conversation-menu-v4','conversation-menu-v5','conversation-menu-v6','conversation-menu-v7'] as const)test(`complete review constraints reach outbound ${policy} even past policy-specific encoding`,async()=>{
 const c=citizenV5Context();c.policy=policy;c.sharedBriefing={assumptions:[],sources:[],assumptionReview:review()};
 const seen=observer();await assert.rejects(createSocialTransport({key:'mock',fetcher:seen.fetcher}).generate(c));
 assert.equal(seen.bodies.length,1);const body=seen.bodies[0],context=JSON.parse(body.messages[1].content);
 assert.deepEqual(context.assumptionReview,reviewContext(c.sharedBriefing.assumptionReview));
 assert.equal(context.assumptionReview.items.length,6);assert.equal(context.assumptionReview.items[0].status,'unknown');
 assert.ok(body.messages[0].content.includes(ASSUMPTION_REVIEW_INSTRUCTION));
});
test('unreviewed social context and prompt stay on the existing path',async()=>{
 const seen=observer(),c=citizenV5Context();await assert.rejects(createSocialTransport({key:'mock',fetcher:seen.fetcher}).generate(c));
 assert.equal(seen.bodies.length,1);assert.equal(JSON.parse(seen.bodies[0].messages[1].content).assumptionReview,undefined);assert.ok(!seen.bodies[0].messages[0].content.includes(ASSUMPTION_REVIEW_INSTRUCTION));
 assert.equal(seen.bodies[0].messages[1].content,encodeMenuContext(c));
});
test('quick, detailed and graph evidence and cache identities bind all review decisions',()=>{
 const value=run(),oldQuick=reportSnapshotKey(projectReportEvidence(value)),oldDetailed=detailedReportSnapshotKey(value),oldGraph=graphSummarySnapshotPayload(value);
 value.assumptionReview=review();
 for(const evidence of [projectReportEvidence(value),projectDetailedReportEvidence(value),projectGraphSummaryContext(value)])assert.deepEqual(evidence.assumptionReview,reviewContext(value.assumptionReview));
 assert.notEqual(reportSnapshotKey(projectReportEvidence(value)),oldQuick);assert.notEqual(detailedReportSnapshotKey(value),oldDetailed);assert.notEqual(graphSummarySnapshotPayload(value),oldGraph);
 const before=reportSnapshotKey(projectReportEvidence(value));value.assumptionReview.items[5].decision='do-not-allow';assert.notEqual(reportSnapshotKey(projectReportEvidence(value)),before);
});
test('all three report/graph writer prompts enforce reviewed unknowns without altering legacy prompts',async()=>{
 const value=run();value.assumptionReview=review();const publicDiscussion={version:1 as const,scope:'No public statements.',initialStatements:0,followupStatements:0,omitted:0,statements:[],nodes:[]};
 const generators=[(fetcher:typeof fetch)=>createReportSummaryGenerator({key:'mock',fetcher}), (fetcher:typeof fetch)=>createDetailedReportGenerator({key:'mock',fetcher}), (fetcher:typeof fetch)=>createGraphNodeSummaryGenerator({key:'mock',fetcher})];
 for(const [index,create]of generators.entries()){
  const seen=observer(),evidence:any={...(index===2?projectGraphSummaryContext(value):index===1?projectDetailedReportEvidence(value):projectReportEvidence(value)),publicDiscussion};
  if(index===2)evidence.nodes=[{nodeId:'node-a',label:'Fictional venue',kind:'communication',recordType:'venue',description:'Scenario context.',provenance:'model-generated',relationships:[],metrics:{},limitations:[],evidenceScope:'public-context-and-accepted-public-statements'}];
  await assert.rejects(create(seen.fetcher)(evidence));assert.equal(seen.bodies.length,1);assert.ok(seen.bodies[0].messages[0].content.includes(ASSUMPTION_REVIEW_INSTRUCTION));assert.equal(JSON.parse(seen.bodies[0].messages[1].content).assumptionReview.items.length,6);
 }
});
test('complete review survives society save/restore and malformed review metadata is rejected',()=>{
 const f=worldFixtures()[0],input:any={runId:'reviewed-world',question:f.request.question,seed:'review-world',population:populationView(buildPopulation({size:10000,seed:'society-fixture'})),roles:f.draft.agents,jurisdictions:f.draft.jurisdictions,acceptedActions:[],socialPolicy:'memory-aware-v1',hybrid:HYBRID_DEFAULTS,briefing:{assumptions:[],sources:[],assumptionReview:review()},config:{agents:24,steps:80}};
 const world=createSociety(input),restored=restoreSociety(saveSociety(world));assert.deepEqual(restored.genesis.input.briefing?.assumptionReview,input.briefing.assumptionReview);
 const context=buildDecisionContext(restored,restored.agents[0].id,'reddit');assert.deepEqual(context.sharedBriefing?.assumptionReview,input.briefing.assumptionReview);
 const malformed=structuredClone(input);malformed.briefing.assumptionReview.items[0].decision='false';assert.throws(()=>createSociety(malformed));
});
test('review constraints count toward final social wire capacity and oversized reviewed requests never dispatch',async()=>{
 const c=citizenV5Context();c.policy='conversation-menu-v7';c.sharedBriefing={assumptions:[],sources:[],assumptionReview:review()};
 const base=encodeMenuContext(c);c.actor.goal+='x'.repeat(23900-Buffer.byteLength(base));
 const ordinaryBytes=Buffer.byteLength(encodeMenuContext(c)),finalBytes=Buffer.byteLength(canonical({...JSON.parse(encodeMenuContext(c)),assumptionReview:reviewContext(c.sharedBriefing.assumptionReview)}));
 assert.ok(ordinaryBytes<=24000);assert.ok(finalBytes>24000);
 assert.ok(decisionContextBytes(c)>=finalBytes,'reservation/packing must measure the final reviewed wire');
 assert.ok(decisionReservation(c)>=finalBytes,'token reservation must cover the complete reviewed wire');
 const seen=observer();await assert.rejects(createSocialTransport({key:'mock',fetcher:seen.fetcher}).generate(c));assert.equal(seen.bodies.length,0,'oversize review constraints must stop before provider dispatch');
});
test('packing preserves all mandatory reviewed constraints and reports no-fit rather than dropping them',()=>{
 const swarm=deepSwarmPolicy(50),world=createSociety({...phase4dWorld().genesis.input,swarm,hybrid:swarmHybrid(swarm),intelligence:TOPIC_POLICY,config:{agents:50,activation:0}});
 const c=structuredClone(buildDecisionContext(world,world.agents[0].id,'reddit'));c.sharedBriefing={assumptions:[],sources:[],assumptionReview:review()};
 const oldBytes=Math.max(Buffer.byteLength(canonical(c)),Buffer.byteLength(encodeMenuContext(c)));c.actor.goal+='x'.repeat(Math.max(0,23900-oldBytes));
 const original=canonical(c.sharedBriefing.assumptionReview),result=packDeepContext(world,c);
 assert.equal(canonical(c.sharedBriefing.assumptionReview),original);assert.equal(c.sharedBriefing.assumptionReview!.items.length,6);
 assert.equal(result.fits,decisionContextBytes(c)<=24000&&!!c.menu?.some(m=>m.action==='inactive'));
 assert.ok(decisionContextBytes(c)>=Buffer.byteLength(canonical({...JSON.parse(encodeMenuContext(c)),assumptionReview:reviewContext(c.sharedBriefing.assumptionReview)})));
 c.actor.goal='x'.repeat(24000);const impossible=packDeepContext(world,c);assert.equal(impossible.fits,false);assert.equal(canonical(c.sharedBriefing.assumptionReview),original);
});
