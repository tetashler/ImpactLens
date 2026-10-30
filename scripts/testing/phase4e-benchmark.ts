/** Actual service/gateway/durable-journal benchmark. Fixtures only; native egress is blocked. */
import './offline-network.mjs';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,statSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {runPhase4eServiceFixture,phase4eSource,socialRequest,evictFixtureSession,FIXTURE_USAGE} from './phase4e-fixture.ts';
import {handleSocialRequest} from '../../lib/server/society/service.ts';
import {createSociety,saveSociety,restoreSociety} from '../../lib/society/engine.ts';
import {prepareHybridStep,finishDecision} from '../../lib/society/hybrid.ts';
import {publicSociety,summaryGraph} from '../../lib/server/society/summary.ts';
import {evaluateSociety} from '../../lib/society/evaluation.ts';
import {aggregateFacts} from '../../lib/server/society/facts.ts';
import {canonical,ensure} from '../../lib/experiments/validation.ts';

const output=resolve('tmp/phase4e');mkdirSync(output,{recursive:true});
const privateRoot=mkdtempSync(join(output,'private-benchmark-'));
const digest=(text:string)=>createHash('sha256').update(text).digest('hex');
const bytes=(value:unknown)=>Buffer.byteLength(JSON.stringify(value));
const source=await phase4eSource('phase4e-benchmark');
const rows=[];
const oldEnvironment=Object.fromEntries(['SOCIAL_ACTIVE_AGENTS','SOCIAL_CONTROLLED_AGENTS','SOCIAL_MAX_DECISIONS','SOCIAL_SWARM_SIZE'].map(key=>[key,process.env[key]]));
try{
 for(const arm of [{name:'historical-24-4-8',active:50 as const,historical:true},{name:'majority-50-35-64',active:50 as const,historical:false},{name:'majority-100-70-128',active:100 as const,historical:false}]){
  if(arm.historical){process.env.SOCIAL_ACTIVE_AGENTS='24';process.env.SOCIAL_CONTROLLED_AGENTS='4';process.env.SOCIAL_MAX_DECISIONS='8';delete process.env.SOCIAL_SWARM_SIZE;}
  const f=await runPhase4eServiceFixture({active:arm.active,historical:arm.historical,directory:join(privateRoot,arm.name),source}),w=f.state.world,records=w.hybrid!.records;
  ensure(w.tick===80&&f.clockAdvances===80,'PHASE4E_CLOCK');
  ensure(f.mock.calls.length===(arm.historical?8:arm.active===50?64:128)&&records.every(r=>r.status==='accepted'),'PHASE4E_CALLS');
  let replay=createSociety(w.genesis.input),index=0,schedulerMs=0,executionMs=0,iterations=0;
  const pureStart=performance.now();
  while(replay.tick<80||replay.hybrid?.pending){
   ensure(iterations++<400,'PHASE4E_PURE_BOUND');let started=performance.now();replay=prepareHybridStep(replay);schedulerMs+=performance.now()-started;
   if(replay.hybrid?.pending){const record=records[index++];ensure(record&&canonical(record.context)===canonical(replay.hybrid.pending),'PHASE4E_PURE_CONTEXT');started=performance.now();replay=finishDecision(replay,{decision:record.decision,usage:record.usage,error:record.error});executionMs+=performance.now()-started;}
  }
  ensure(index===records.length&&canonical(replay)===canonical(w),'PHASE4E_PURE_EXACT');const pureReplayMs=performance.now()-pureStart;
  let began=performance.now();const snapshot=saveSociety(w);const snapshotMs=performance.now()-began;began=performance.now();ensure(canonical(restoreSociety(snapshot))===canonical(w),'PHASE4E_SNAPSHOT_REPLAY');const snapshotReplayMs=performance.now()-began;
  const before=readFileSync(f.journalPath,'utf8'),journalHash=digest(before),callsBefore=f.mock.calls.length;
  evictFixtureSession(f.dependencies.directory!,f.state.sessionId);began=performance.now();const response=await handleSocialRequest(socialRequest({operation:'start',run:f.source}),f.dependencies);ensure(response.ok,'PHASE4E_REOPEN');const reopened=await response.json(),durableReplayMs=performance.now()-began;
  ensure(canonical(reopened.world)===canonical(w)&&f.mock.calls.length===callsBefore&&digest(readFileSync(f.journalPath,'utf8'))===journalHash,'PHASE4E_DURABLE_REPLAY');
  began=performance.now();const summary=publicSociety(w),graph=summaryGraph({version:1,scenarioIdentity:'phase4e-benchmark',executionIdentity:w.genesis.input.runId,nodes:[],edges:[],limitations:[]},summary),facts=aggregateFacts(w,w.events),projectionMs=performance.now()-began;
  ensure(!JSON.stringify({summary,graph,facts}).includes('RAW_'),'PHASE4E_PUBLIC_LEAK');
  ensure(facts.claims.every(claim=>claim.sourceEventIds.every(id=>w.events.some(e=>e.id===id))),'PHASE4E_FACT_REFERENCE');
  const offeredIds=[...new Set(records.map(r=>r.context.actor.id))],acceptedIds=[...new Set(records.filter(r=>r.status==='accepted').map(r=>r.context.actor.id))],perAgent=f.capableIds.map(id=>({id,offered:records.filter(r=>r.context.actor.id===id).length,accepted:records.filter(r=>r.status==='accepted'&&r.context.actor.id===id).length}));
  const actorTicks=f.capableIds.map(id=>records.filter(r=>r.context.actor.id===id).map(r=>r.context.tick));
  const gaps=actorTicks.flatMap(ticks=>ticks.slice(1).map((tick,index)=>tick-ticks[index]));
  const countsPerTick=[...new Set(records.map(r=>r.context.tick))].map(tick=>records.filter(r=>r.context.tick===tick).length);
  const internalContextBytes=records.map(r=>bytes(r.context)),wireContextBytes=f.mock.calls.map(c=>c.contextBytes),journalLines=before.trimEnd().split('\n');
  const authoredEvents=w.events.filter(e=>['post','comment','reply','message','group-reply'].includes(e.type));
  const channels=w.genesis.input.communication?.channels??[],privatePlatforms=new Set(channels.filter(c=>c.style==='private-group').map(c=>c.id));
  const decisionPlatforms=Object.fromEntries(channels.map(channel=>[channel.id,records.filter(r=>r.status==='accepted'&&r.context.platform===channel.id).length]));
  const privateModelDecisions=records.filter(r=>r.status==='accepted'&&privatePlatforms.has(r.context.platform)).length,privateModelAuthoredItems=authoredEvents.filter(e=>e.source==='social-model'&&e.platform!==null&&privatePlatforms.has(e.platform)).length;
  const row={arm:arm.name,policy:w.genesis.input.swarm??'historical-no-swarm',...evaluateSociety(w),lastOpportunityTick:Math.max(...records.map(r=>r.context.tick)),opportunitiesAfterHalf:records.filter(r=>r.context.tick>w.genesis.config.steps/2).length,decisionPlatforms,privateModelDecisions,privateModelAuthoredItems,authoredProvenance:{acceptedStakeholderSeeds:authoredEvents.filter(e=>e.source==='accepted-model-action').length,modelAuthoredItems:authoredEvents.filter(e=>e.source==='social-model').length,declaredRuleInitializationItems:authoredEvents.filter(e=>e.source==='deterministic-rule'&&e.tick===0).length,runtimeRuleAuthoredItems:authoredEvents.filter(e=>e.source==='deterministic-rule'&&e.tick>0).length},activeAgents:w.agents.length,capableAgents:f.capableIds.length,distinctOffered:offeredIds.length,distinctAccepted:acceptedIds.length,offeredFraction:f.capableIds.length?offeredIds.length/f.capableIds.length:0,perAgent,minimumOpportunities:Math.min(...perAgent.map(a=>a.offered)),maximumOpportunities:Math.max(...perAgent.map(a=>a.offered)),minimumSameAgentGapTicks:gaps.length?Math.min(...gaps):null,maximumCallsPerTick:Math.max(...countsPerTick),maxConcurrentMockRequests:f.mock.maxInFlight(),httpStepRequests:f.requests,clockAdvances:f.clockAdvances,sameTickRequests:f.sameTickRequests,
   memory:{shortTermEntries:w.agents.reduce((n,a)=>n+a.memory.length,0),indexedExperiences:w.agents.reduce((n,a)=>n+(a.episodic?.length??0),0),capableWithIndexedExperiences:w.agents.filter(a=>f.capableIds.includes(a.id)&&(a.episodic?.length??0)>0).length,allAgentsWithGoals:w.agents.filter(a=>a.goal.trim()).length,episodicOnlySelections:f.mock.calls.reduce((n,c)=>n+c.episodicMemories,0),maxItems:Math.max(...f.mock.calls.map(c=>c.itemCount)),maxMemories:Math.max(...f.mock.calls.map(c=>c.memoryCount)),maxInternalContextBytes:Math.max(...internalContextBytes),maxWireContextBytes:Math.max(...wireContextBytes),meanWireContextBytes:wireContextBytes.reduce((n,v)=>n+v,0)/wireContextBytes.length},
   timing:{actualServiceJournalMs:f.serviceJournalMs,driverIncludingObserversMs:f.observedDriverMs,pureSchedulerMs:schedulerMs,pureDecisionExecutionMs:executionMs,pureWholeReplayMs:pureReplayMs,snapshotMs,snapshotReplayMs,durableServiceReopenMs:durableReplayMs,summaryGraphFactsProjectionMs:projectionMs},
   storage:{snapshotBytes:Buffer.byteLength(snapshot),journalBytes:statSync(f.journalPath).size,journalRows:journalLines.length,initialJournalBytes:f.initialJournalBytes,finalJournalRowBytes:Buffer.byteLength(journalLines.at(-1)!),maximumObservedJournalRowBytes:f.maxCheckpointBytes,pointerCheckpointBytes:existsSync(join(f.dependencies.directory!,f.state.sessionId+'.checkpoint.json'))?statSync(join(f.dependencies.directory!,f.state.sessionId+'.checkpoint.json')).size:null,journalGrowth:f.journalGrowth,publicSummaryBytes:bytes(summary),safeGraphBytes:bytes(graph),safeSummaryPlusGraphBytes:bytes({summary,graph}),graphNodes:graph.nodes.length,graphEdges:graph.edges.length},
   observedHeapUsedMiB:process.memoryUsage().heapUsed/1048576,observedPeakHeapMiB:f.peakHeap/1048576,
   mockAccounting:{calls:f.mock.calls.length,inputTokens:summary.usage.inputTokens,outputTokens:summary.usage.outputTokens,reportedFixtureUsd:summary.usage.costUsd,expectedFixtureUsd:f.mock.calls.length*FIXTURE_USAGE.cost,unknownReservedUsd:summary.usage.unknownReservedUsd,paidProviderCalls:0},
   replay:{pureExact:true,snapshotExact:true,durableExact:true,reopenDispatches:0,journalUnchanged:true},privacyLiteralLeaks:0};
  rows.push(row);writeFileSync(join(output,'benchmark-progress.json'),JSON.stringify({version:1,paidProviderCalls:0,rows},null,2));
  console.log(JSON.stringify({arm:row.arm,active:row.activeAgents,capable:row.capableAgents,offered:row.distinctOffered,accepted:row.distinctAccepted,calls:row.mockAccounting.calls,lastOpportunityTick:row.lastOpportunityTick,opportunitiesAfterHalf:row.opportunitiesAfterHalf,decisionPlatforms:row.decisionPlatforms,privateModelDecisions:row.privateModelDecisions,privateModelAuthoredItems:row.privateModelAuthoredItems,clock:row.clockAdvances,journalBytes:row.storage.journalBytes,serviceMs:row.timing.actualServiceJournalMs,replayMs:row.timing.durableServiceReopenMs}));
 }
 const result={version:1,evidence:'OFFLINE FIXTURES ONLY through handleSocialRequest and createSocialTransport. Native external fetch is blocked. Paid provider calls and actual charges: zero.',timingLimit:'Single local elapsed observations include CPU, filesystem, JSON and GC. Injected fixture token/cost values are synthetic accounting; this does not measure paid provider latency, billing, or real model behaviour. Heap samples are observed Node heap, not retained-memory or peak process RSS.',fixtureLimit:'Agent-authored fixtures deliberately choose offered peer replies. Participation demonstrates scheduler opportunity distribution and gateway/replay capability; it does not establish independent intelligent reasoning or population realism.',historicalArm:'The generated 24/4/8 comparison explicitly disables swarm. It is separate from new majority arms and does not rewrite any historical archive.',rows};
 writeFileSync(join(output,'benchmark.json'),JSON.stringify(result,null,2));
}finally{for(const [key,value]of Object.entries(oldEnvironment)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
