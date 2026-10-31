/** Network-blocked deep-capacity evaluation using the real service/gateway, coordinator and private journal. */
import './offline-network.mjs';
import {mkdirSync,mkdtempSync,statSync,readFileSync,writeFileSync,existsSync} from 'node:fs';import {join,resolve} from 'node:path';import {performance} from 'node:perf_hooks';import {createHash} from 'node:crypto';
import {phase4eSource,phase4eCommunication,phase4eFetcher,phase4eProviderFixture} from './phase4e-fixture.ts';
import {socialOperation,readSocialSession,checkpointSocialSession,type SocialState,type SocialDependencies} from '../../lib/server/society/service.ts';
import {startCoordinator,coordinatorStatus,stopCoordinators,type CoordinatorProgress} from '../../lib/server/society/coordinator.ts';
import {deepSwarmPolicy,swarmPolicy,cohortIds} from '../../lib/society/swarm.ts';import {createSociety,saveSociety,restoreSociety} from '../../lib/society/engine.ts';import {replayHybrid,prepareHybridStep,finishDecision} from '../../lib/society/hybrid.ts';
import {publicSociety,summaryGraph} from '../../lib/server/society/summary.ts';import {aggregateFacts} from '../../lib/server/society/facts.ts';import {canonical,ensure} from '../../lib/experiments/validation.ts';
const output=resolve('tmp/phase4e1');mkdirSync(output,{recursive:true});const privateRoot=mkdtempSync(join(output,'benchmark-private-'));const source=await phase4eSource('phase4e1-benchmark'),rows:unknown[]=[];
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex'),bytes=(v:unknown)=>Buffer.byteLength(JSON.stringify(v));
const authoredKinds=new Set(['post','comment','reply','message','group-reply']);
function distribution(values:number[]){const sorted=[...values].sort((a,b)=>a-b),n=sorted.length;return {count:n,min:n?sorted[0]:null,max:n?sorted[n-1]:null,mean:n?values.reduce((a,b)=>a+b,0)/n:null,p50:n?sorted[Math.ceil(n*0.5)-1]:null,p95:n?sorted[Math.ceil(n*0.95)-1]:null};}
for(const [name,active,capacity,mode]of [['historical',24,8,'historical'],['quick-50',50,64,'quick'],['quick-100',100,128,'quick'],['intermediate-50',50,175,'deep'],['deep-50',50,350,'deep'],['intermediate-100',100,350,'deep'],['deep-100',100,700,'deep']] as const){
 const directory=join(privateRoot,name),mock=phase4eFetcher(),p=mode==='historical'?false:mode==='quick'?swarmPolicy(active as 50|100):deepSwarmPolicy(active as 50|100,capacity);
 const dependencies:SocialDependencies={enabled:true,key:'offline-fixture',communication:phase4eCommunication(),directory,swarm:p,fetcher:mock.fetcher,admission:{maxCalls:capacity,reservedTokens:mode==='deep'?32000000:mode==='historical'?200000:4800000,costUsd:mode==='deep'?8:mode==='historical'?0.2:3}};
 if(mode==='deep'&&active===50)dependencies.admission!.reservedTokens=16000000;
 if(mode==='quick'&&active===50){dependencies.admission!.reservedTokens=2400000;dependencies.admission!.costUsd=1.5;}
 const began=performance.now();let state=await socialOperation({operation:'start',run:source},dependencies),steps=0,maxHeap=process.memoryUsage().heapUsed,maxRss=process.memoryUsage().rss,serviceMs=0;
 const progress=():CoordinatorProgress=>({revision:state.revision,tick:state.world.tick,totalSteps:80,acceptedDecisions:state.world.hybrid!.records.filter(r=>r.status==='accepted').length,participatingAgents:new Set(state.world.hybrid!.records.filter(r=>r.status==='accepted').map(r=>r.context.actor.id)).size,capacity,calls:state.admission.calls,admittedCalls:state.admission.maxCalls,completed:state.world.tick===80,budgetLimited:state.admission.status==='budget-limited'&&state.world.hybrid!.records.length<capacity&&state.world.tick<80});
 const advance=async(signal:AbortSignal)=>{const began=performance.now();state=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},dependencies,signal);serviceMs+=performance.now()-began;steps++;const sampled=process.memoryUsage();maxHeap=Math.max(maxHeap,sampled.heapUsed);maxRss=Math.max(maxRss,sampled.rss);return progress();};
 // Full-capacity policy continues remaining coarse ticks without additional inference.
 // A smaller live provider grant instead pauses before the reasoning capacity is exhausted.
 if(mode==='deep'){
  const driver={inspect:async()=>progress(),step:advance,checkpoint:async()=>{await checkpointSocialSession(state.sessionId,dependencies);},publish:async()=>{}};
  await startCoordinator({runId:source.runId,directory,driver});
  for(let tries=0;tries<20000;tries++){const job=coordinatorStatus(source.runId,directory)!;if(job.status!=='running'){ensure(['completed','budget-limited'].includes(job.status),'DEEP_COORDINATOR_'+String(job.reason));break;}await new Promise(r=>setTimeout(r,10));}
  state=await readSocialSession(state.sessionId,dependencies);
 }
 for(let i=0;state.world.tick<80&&i<capacity+100;i++)await advance(new AbortController().signal);
 ensure(state.world.tick===80,'DEEP_BENCH_CLOCK');await checkpointSocialSession(state.sessionId,dependencies);
 const w=state.world,records=w.hybrid!.records,counts=cohortIds(w).map(id=>records.filter(r=>r.context.actor.id===id).length);
 ensure(records.length<=capacity&&records.every(r=>r.status==='accepted'),'DEEP_BENCH_ACCEPTANCE');
 let beganReplay=performance.now();const replay=replayHybrid(w.genesis.input,w.tick,records,null),fullReplayMs=performance.now()-beganReplay;ensure(canonical(replay)===canonical(w),'DEEP_BENCH_REPLAY');
 // Separate measured pure reconstruction from storage/provider/HTTP timing. The
 // finish phase includes mandatory stale-context validation and its context
 // rebuild as well as reduction; it is not presented as isolated reducer CPU.
 let instrumented=createSociety(w.genesis.input),index=0,purePrepareMs=0,pureFinishMs=0,preparationCalls=0,finishCalls=0;
 const instrumentedStart=performance.now();
 for(let turn=0;turn<capacity+180;turn++){
  if(instrumented.tick===w.tick&&index===records.length&&instrumented.hybrid?.pending===null)break;
  let phaseStart=performance.now();instrumented=prepareHybridStep(instrumented);purePrepareMs+=performance.now()-phaseStart;preparationCalls++;
  if(instrumented.hybrid?.pending){const record=records[index];ensure(record&&canonical(record.context)===canonical(instrumented.hybrid.pending),'DEEP_BENCH_TIMED_CONTEXT');phaseStart=performance.now();instrumented=finishDecision(instrumented,{decision:record.decision,usage:record.usage,error:record.error});pureFinishMs+=performance.now()-phaseStart;finishCalls++;ensure(canonical(instrumented.hybrid!.records.at(-1))===canonical(record),'DEEP_BENCH_TIMED_RECORD');index++;}
 }
 const instrumentedReplayMs=performance.now()-instrumentedStart;ensure(index===records.length&&canonical(instrumented)===canonical(w),'DEEP_BENCH_TIMED_REPLAY');
 const journal=join(directory,state.sessionId+'.jsonl'),journalHash=hash(journal);(globalThis as typeof globalThis&{__socialSessions?:Map<string,unknown>}).__socialSessions?.delete(directory+'/'+state.sessionId);
 beganReplay=performance.now();const restored=await readSocialSession(state.sessionId,dependencies),checkpointTailMs=performance.now()-beganReplay;ensure(canonical(restored.world)===canonical(w)&&hash(journal)===journalHash,'DEEP_BENCH_RESTORE');
 const projectionStart=performance.now(),summary=publicSociety(w),facts=aggregateFacts(w,w.events),graph=summaryGraph({version:1,scenarioIdentity:'deep-benchmark',executionIdentity:source.runId,nodes:[],edges:[],limitations:[]},summary),projectionMs=performance.now()-projectionStart;
 ensure(!JSON.stringify({summary,graph,facts}).includes('RAW_'),'DEEP_BENCH_PRIVACY');ensure(facts.claims.every(c=>c.sourceEventIds.every(id=>w.events.some(e=>e.id===id))),'DEEP_BENCH_FACTS');
 const modelAuthored=w.events.filter(e=>e.source==='social-model'&&authoredKinds.has(e.type)),ruleAuthored=w.events.filter(e=>e.source==='deterministic-rule'&&authoredKinds.has(e.type));
 const eventById=new Map(w.events.map(e=>[e.id,e])),triggerAges=records.flatMap(r=>{const source=r.context.opportunity?.sourceEventId,event=source?eventById.get(source):undefined;return event?[r.context.tick-event.tick]:[];});
 const participation=cohortIds(w).map(agentId=>{const own=records.filter(r=>r.context.actor.id===agentId),ticks=own.map(r=>r.context.tick),gaps=ticks.slice(1).map((t,i)=>t-ticks[i]);return {agentId,offered:own.length,accepted:own.filter(r=>r.status==='accepted').length,authored:modelAuthored.filter(e=>e.actorId===agentId).length,inactive:own.filter(r=>r.status==='accepted'&&r.decision?.action==='inactive').length,ticks,gaps};});
 const totalOffered=counts.reduce((a,b)=>a+b,0),sumSquares=counts.reduce((a,b)=>a+b*b,0),jainFairness=sumSquares?totalOffered*totalOffered/(counts.length*sumSquares):null;
 const row={
  name,active,capacity,capable:cohortIds(w).length,offered:new Set(mock.calls.map(c=>c.actorId)).size,acceptedAgents:new Set(records.filter(r=>r.status==='accepted').map(r=>r.context.actor.id)).size,
  accepted:records.filter(r=>r.status==='accepted').length,rejected:records.filter(r=>r.status==='failed').length,skipped:records.filter(r=>r.status==='skipped').length,acceptedInactivity:records.filter(r=>r.status==='accepted'&&r.decision?.action==='inactive').length,
  authored:modelAuthored.length,distinctModelAuthors:new Set(modelAuthored.map(e=>e.actorId)).size,
  activity:{modelEvents:w.events.filter(e=>e.source==='social-model').length,modelAuthoredPublic:modelAuthored.filter(e=>!e.groupId).length,modelAuthoredPrivate:modelAuthored.filter(e=>!!e.groupId).length,ruleAuthoredPublic:ruleAuthored.filter(e=>!e.groupId).length,ruleAuthoredPrivate:ruleAuthored.filter(e=>!!e.groupId).length,initialStakeholderAuthored:w.events.filter(e=>e.source==='accepted-model-action'&&authoredKinds.has(e.type)).length},
  perAgent:{min:Math.min(...counts),max:Math.max(...counts),counts,participation,jainFairness},
  waiting:{definition:'Trigger age is decision tick minus recorded source-event tick, not time continuously eligible in a queue.',triggerAgeTicks:distribution(triggerAges),interDecisionGapTicks:distribution(participation.flatMap(p=>p.gaps))},
  early:records.filter(r=>r.context.tick<27).length,middle:records.filter(r=>r.context.tick>=27&&r.context.tick<54).length,late:records.filter(r=>r.context.tick>=54).length,maxDepth:facts.view.maxDepth,peerReplies:facts.view.peerReplies,
  events:w.events.length,ruleEvents:w.events.filter(e=>e.source==='deterministic-rule').length,
  memories:{maxIndexed:Math.max(...w.agents.map(a=>a.episodic?.length??0)),episodicOnly:mock.calls.reduce((n,c)=>n+c.episodicMemories,0),maxItems:Math.max(0,...mock.calls.map(c=>c.itemCount)),maxMemories:Math.max(0,...mock.calls.map(c=>c.memoryCount)),maxWireBytes:Math.max(0,...mock.calls.map(c=>c.contextBytes)),maxInternalCanonicalContextBytes:Math.max(0,...records.map(r=>Buffer.byteLength(canonical(r.context))))},
  timing:{serviceMs,elapsedMs:performance.now()-began,fullReplayMs,checkpointTailMs,projectionMs,instrumentedReplayMs,purePrepareMs,pureFinishMs,preparationCalls,finishCalls,instrumentation:'Pure prepare includes coarse routines, scheduling, exposure and context assembly. Pure finish includes stale-context rebuild, validation and reduction. Instrumented replay also performs untimed canonical integrity comparisons.'},
  storage:{journal:statSync(journal).size,checkpoint:existsSync(join(directory,state.sessionId+'.materialized.json'))?statSync(join(directory,state.sessionId+'.materialized.json')).size:null,world:Buffer.byteLength(saveSociety(w)),publicPayload:bytes({summary,graph}),graphNodes:graph.nodes.length,graphEdges:graph.edges.length},
  heapMiB:maxHeap/1048576,rssMiB:maxRss/1048576,memorySampling:'Sampled after service operations in a shared benchmark process; these are observed samples, not continuous or isolated per-run peaks.',
  requests:steps,concurrency:mock.maxInFlight(),fullReplayExact:true,checkpointReplayExact:true,instrumentedReplayExact:true,privacyLeaks:0,paidCalls:0
 };
 rows.push(row);writeFileSync(join(output,'benchmarks.json'),JSON.stringify({version:1,privateRoot,rows},null,2));console.log(JSON.stringify(row));
}
await stopCoordinators();
