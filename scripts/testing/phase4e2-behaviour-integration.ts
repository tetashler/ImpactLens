/** Offline capability fixtures, not observations of model intelligence or behavioural quality. */
import './offline-network.mjs';
import {copyFileSync,mkdirSync,mkdtempSync,readFileSync,statSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {phase4eCommunication,phase4eFetcher,phase4eProviderFixture,phase4eSource,type FixtureSelection,type SwarmWireContext,type WireChoice} from './phase4e-fixture.ts';
import {socialOperation,readSocialSession,checkpointSocialSession,type SocialDependencies,type SocialState} from '../../lib/server/society/service.ts';
import {startCoordinator,coordinatorStatus,stopCoordinators,type CoordinatorProgress} from '../../lib/server/society/coordinator.ts';
import {readSwarmJournal} from '../../lib/server/society/swarm-journal.ts';
import {materialCheckpointPath,readMaterialCheckpoint} from '../../lib/server/society/checkpoint.ts';
import {multiDayComplete} from '../../lib/society/engine.ts';
import {cohortIds,multiDaySwarmPolicy} from '../../lib/society/swarm.ts';
import {replayHybrid} from '../../lib/society/hybrid.ts';
import {buildIssueMenu} from '../../lib/society/issue-menu.ts';
import {publicSociety,summaryGraph} from '../../lib/server/society/summary.ts';
import {aggregateFacts} from '../../lib/server/society/facts.ts';
import {canonical,ensure} from '../../lib/experiments/validation.ts';
import type {SocietyWorld} from '../../lib/society/contract.ts';

export interface BehaviourWireContext extends Omit<SwarmWireContext,'groups'|'memories'> {
 calendar?:{day:number};
 groups?:{ref:string;member:boolean;name?:string}[];
 memories:{ref:string;kind:string;origin?:string;items:string[];primaryItem?:string;tick?:number}[];
 issueChoices?:{id:string;kind:string;sourceItem:string|null;requiredMemories:string[]}[];
}
const content=new Set(['post','comment','reply','message','group-reply']),replying=new Set(['comment','reply','group-reply']);
const authored=new Set([...content,'share']);
const dayAt=(tick:number)=>1+Math.floor((480+tick*15)/1440);

/** Chooses existing finite options only. Committed-state observations track fixture
 * objectives; they never supply private bodies or create an incoming event. */
export function createBehaviourCapabilitySelector(){
 const createdNames=new Set<string>(),emptyCreatedNames=new Set<string>(),openedActors=new Set<string>(),recalledActors=new Set<string>();
 const observe=(w:SocietyWorld)=>{
  const createdIds=new Set(w.events.filter(e=>e.type==='group-create'&&e.source==='social-model').map(e=>e.groupId));
  createdNames.clear();emptyCreatedNames.clear();
  for(const group of w.groups??[])if(createdIds.has(group.id)){createdNames.add(group.name);if(!w.items.some(i=>i.groupId===group.id))emptyCreatedNames.add(group.name);}
  for(const agent of w.agents)if((agent.issueHistory??agent.issues??[]).length)openedActors.add(agent.id);
  for(const record of w.hybrid?.records??[])if(record.status==='accepted'&&record.decision?.selection?.recallIds.length)recalledActors.add(record.context.actor.id);
 };
 const select=(c:BehaviourWireContext):FixtureSelection=>{
  ensure(c.policy==='conversation-menu-v3','BEHAVIOUR_FIXTURE_POLICY');
  const peer=(choice:WireChoice)=>replying.has(choice.action)&&c.items.some(i=>i.id===choice.target&&i.actorId!==c.actor.id);
  const privatePeer=c.choices.find(choice=>peer(choice)&&c.items.some(i=>i.id===choice.target&&!!i.groupId));
  const anyPeer=privatePeer??c.choices.find(peer);
  const bodyChoice=anyPeer??c.choices.find(choice=>choice.action==='post'||choice.action==='message');
  const closing=c.issueChoices?.find(choice=>choice.kind==='resolve'&&c.items.some(i=>i.id===choice.sourceItem));
  const firstMessage=c.choices.find(choice=>choice.action==='message'&&(c.groups??[]).some(g=>g.ref===choice.destinationGroup&&g.member&&emptyCreatedNames.has(g.name??'')));
  const create=!createdNames.size?c.choices.find(choice=>choice.action==='group-create'):undefined;
  const opening=!openedActors.has(c.actor.id)?c.issueChoices?.find(choice=>choice.kind==='question'):undefined;
  let choice:WireChoice|undefined,issue:NonNullable<BehaviourWireContext['issueChoices']>[number]|undefined;
  if(closing&&bodyChoice){choice=bodyChoice;issue=closing;}
  else if(firstMessage)choice=firstMessage;
  else if(create)choice=create;
  else if(opening&&bodyChoice){choice=bodyChoice;issue=opening;}
  else choice=anyPeer??c.choices.find(option=>option.action==='inactive');
  ensure(choice,'BEHAVIOUR_FIXTURE_NO_OPTION');
  const target=c.items.find(i=>i.id===(issue?.sourceItem??choice.target));
  let text=issue?.kind==='resolve'?'RAW_BEHAVIOUR_FIXTURE I explicitly mark my supplied earlier question resolved within this offline contract fixture: '+target!.text.slice(0,180):issue?'RAW_BEHAVIOUR_FIXTURE What explicit staffing and wage safeguards address this supplied situation?':firstMessage===choice?'RAW_BEHAVIOUR_FIXTURE This voluntary first message asks members to discuss the supplied staffing and wage safeguards.':target?'RAW_BEHAVIOUR_FIXTURE I address the supplied point while keeping the staffing and wage conditions explicit: '+target.text.slice(0,180):'RAW_BEHAVIOUR_FIXTURE The supplied staffing and wage safeguards need discussion.';
  const optional=content.has(choice.action)&&!recalledActors.has(c.actor.id)?c.memories.find(m=>m.origin==='episodic'&&m.tick!==undefined&&(c.calendar?.day??dayAt(c.tick))>dayAt(m.tick)&&c.items.some(i=>i.id===m.primaryItem||m.items.includes(i.id))):undefined;
  const anchor=optional?c.items.find(i=>i.id===optional.primaryItem)??c.items.find(i=>optional.items.includes(i.id)):undefined;
  if(anchor)text+=' I also recall the supplied earlier point: '+anchor.text.slice(0,120);
  const response=phase4eProviderFixture(c,choice,text.slice(0,1000));
  return {...response,recallIds:optional?[optional.ref]:[],issueChoiceId:issue?.id??null,discussion:issue?null:response.discussion};
 };
 return {observe,select};
}

const digest=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
const fileHash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

export async function runBehaviourIntegration(){
 const output=resolve('tmp/phase4e2-behaviour-quality');mkdirSync(output,{recursive:true});
 const privateRoot=mkdtempSync(join(output,'integration-private-')),rows:unknown[]=[];
 const report=()=>writeFileSync(join(output,'integration.json'),JSON.stringify({version:1,kind:'offline-scripted-capability-fixture',privateRoot,paidCalls:0,limitations:['Scripted choices exercise legal capabilities; they do not demonstrate model intelligence, semantic memory use, genuine issue resolution, or behavioural quality.','Capacity is an upper bound. Missing demand may leave calls unused; the fixture never injects an incoming event to fill a quota.','Quiet, adverse, permission and saturation cases are focused regressions in lib/contracts/tests/behaviour-quality-private.test.ts and phase4e2-issue-menu.test.ts.'],rows},null,2));
 report();
 try{for(const active of [50,100] as const){
  const capacity=active===50?350:700,directory=join(privateRoot,'active-'+active),jobs=join(directory,'jobs'),recovery=join(directory,'checkpoint-tail');
  const selector=createBehaviourCapabilitySelector(),mock=phase4eFetcher(c=>selector.select(c as BehaviourWireContext));
  const dependencies:SocialDependencies={directory,enabled:true,key:'offline-behaviour-fixture-only',communication:phase4eCommunication(),swarm:multiDaySwarmPolicy(active,capacity,320),fetcher:mock.fetcher,admission:{maxCalls:capacity,reservedTokens:active===50?16_000_000:32_000_000,costUsd:8}};
  const source=await phase4eSource('phase4e2-behaviour-integration-'+active),began=performance.now();
  let state:SocialState=await socialOperation({operation:'start',run:source},dependencies),steps=0,prefixRecords=0,prefixTick=0,prefixCheckpoint:Buffer|undefined;
  selector.observe(state.world);
  const progress=():CoordinatorProgress=>{const records=state.world.hybrid!.records;return {revision:state.revision,tick:state.world.tick,totalSteps:320,opportunities:records.length,acceptedDecisions:records.filter(r=>r.status==='accepted').length,participatingAgents:new Set(records.filter(r=>r.status==='accepted').map(r=>r.context.actor.id)).size,capacity,admittedCalls:state.admission.maxCalls,calls:state.admission.calls,completed:multiDayComplete(state.world),budgetLimited:state.admission.status==='budget-limited'&&state.world.tick<320,profileId:state.world.genesis.input.swarm!.multiDay!.profileId,...(state.capacityReason?{capacityReason:state.capacityReason}:{})};};
  await startCoordinator({runId:source.runId,directory:jobs,driver:{inspect:async()=>progress(),step:async signal=>{
   state=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},dependencies,signal);steps++;selector.observe(state.world);
   if(!prefixCheckpoint&&state.world.hybrid!.records.length>=4){await checkpointSocialSession(state.sessionId,dependencies);prefixCheckpoint=readFileSync(materialCheckpointPath(directory,state.sessionId));prefixRecords=state.world.hybrid!.records.length;prefixTick=state.world.tick;}
   return progress();
  },checkpoint:async()=>{await checkpointSocialSession(state.sessionId,dependencies);},publish:async()=>{}}});
  const deadline=Date.now()+30*60_000;
  while(coordinatorStatus(source.runId,jobs)?.status==='running'){ensure(Date.now()<deadline,'BEHAVIOUR_INTEGRATION_TIMEOUT');await delay(20);}
  const job=coordinatorStatus(source.runId,jobs)!;
  state=await readSocialSession(state.sessionId,dependencies);
  ensure(job.status==='completed'&&state.world.tick===320&&multiDayComplete(state.world),'BEHAVIOUR_INTEGRATION_HORIZON');
  const w=state.world,records=w.hybrid!.records,journal=join(directory,state.sessionId+'.jsonl'),journalHash=fileHash(journal),worldDigest=digest(w),replayStart=performance.now();
  ensure(digest(replayHybrid(w.genesis.input,w.tick,records,null))===worldDigest,'BEHAVIOUR_INTEGRATION_FULL_REPLAY');
  const fullReplayMs=performance.now()-replayStart;
  ensure(prefixCheckpoint&&prefixRecords>0&&prefixRecords<records.length,'BEHAVIOUR_INTEGRATION_NONEMPTY_TAIL');
  mkdirSync(recovery,{recursive:true});copyFileSync(journal,join(recovery,state.sessionId+'.jsonl'));writeFileSync(materialCheckpointPath(recovery,state.sessionId),prefixCheckpoint,{mode:0o600});
  const tailJournal=readSwarmJournal(join(recovery,state.sessionId+'.jsonl')),tailBase=readMaterialCheckpoint(recovery,tailJournal);
  ensure(tailBase?.hybrid?.records.length===prefixRecords,'BEHAVIOUR_INTEGRATION_PREFIX_BINDING');
  const tailStart=performance.now(),callsBeforeRestore=mock.calls.length,restored=await readSocialSession(state.sessionId,{...dependencies,directory:recovery}),checkpointTailMs=performance.now()-tailStart;
  ensure(digest(restored.world)===worldDigest&&mock.calls.length===callsBeforeRestore,'BEHAVIOUR_INTEGRATION_TAIL_REPLAY');
  ensure(fileHash(journal)===journalHash&&fileHash(join(recovery,state.sessionId+'.jsonl'))===journalHash,'BEHAVIOUR_INTEGRATION_JOURNAL_PRESERVATION');
  const summary=publicSociety(w),facts=aggregateFacts(w,w.events),graph=summaryGraph({version:1,scenarioIdentity:'behaviour-quality-fixture',executionIdentity:source.runId,nodes:[],edges:[],limitations:[]},summary),publicJson=canonical({summary,graph});
  const rawStrings=[...new Set([...w.items.map(i=>i.text),...records.flatMap(r=>r.decision?.motivation?[r.decision.motivation]:[])])].filter(value=>value.length>=24),rawMatches=rawStrings.filter(value=>publicJson.includes(value)).length;
  ensure(rawMatches===0&&!publicJson.includes('RAW_')&&!/"(?:joinedSequence|leftSequence|invitations|exposedIds|memoryIds)"/.test(publicJson),'BEHAVIOUR_INTEGRATION_PUBLIC_PRIVACY');
  const accepted=records.filter(r=>r.status==='accepted'),failed=records.filter(r=>r.status==='failed'),skipped=records.filter(r=>r.status==='skipped'),modelItems=w.items.filter(i=>w.events.find(e=>e.id===i.id)?.source==='social-model'),issues=w.agents.flatMap(a=>a.issueHistory??a.issues??[]);
  ensure(records.length===mock.calls.length&&state.admission.calls===mock.calls.length&&records.length<=capacity&&accepted.length+failed.length+skipped.length===records.length,'BEHAVIOUR_INTEGRATION_CALLS');
  ensure(summary.swarm?.opportunities===records.length&&summary.usage.calls===records.length-skipped.length&&summary.usage.accepted===accepted.length&&summary.usage.failed===failed.length,'BEHAVIOUR_INTEGRATION_PUBLIC_COUNTS');
  ensure(facts.view.authoredItems===w.items.length&&facts.clock?.daily.reduce((n,d)=>n+d.authoredItems,0)===w.items.length&&facts.claims.every(c=>c.sourceEventIds.every(id=>w.events.some(e=>e.id===id))),'BEHAVIOUR_INTEGRATION_FACT_COUNTS');
  ensure(summary.groups.every(g=>typeof g.members==='number'&&g.members<=8)&&w.groups!.length<=8,'BEHAVIOUR_INTEGRATION_GROUP_LIMITS');
  const createdIds=new Set(w.events.filter(e=>e.source==='social-model'&&e.type==='group-create').map(e=>e.groupId)),issueSelected=accepted.flatMap(r=>{const choice=buildIssueMenu(r.context).find(i=>i.id===r.decision?.selection?.issueChoiceId);return choice?[choice.update.kind]:[];});
  const recalled=accepted.flatMap(r=>(r.decision?.selection?.recallIds??[]).flatMap(id=>{const index=Number(id.replace('memory-',''))-1,memory=r.context.memories[index];return memory?[{origin:memory.origin,crossDay:memory.tick!==undefined&&dayAt(r.context.tick)>dayAt(memory.tick)}]:[];}));
  rows.push({active,capable:cohortIds(w).length,horizon:320,capacity,tick:w.tick,status:job.status,opportunities:records.length,accepted:accepted.length,failed:failed.length,skipped:skipped.length,unusedCapacity:capacity-records.length,acceptedInactivity:accepted.filter(r=>r.decision?.action==='inactive').length,mockCompletions:mock.calls.length,paidCalls:0,providerConcurrency:mock.maxInFlight(),selectedActions:Object.fromEntries([...new Set(mock.calls.map(c=>c.selectedAction))].map(action=>[action,mock.calls.filter(c=>c.selectedAction===action).length])),capabilities:{issueCreations:issueSelected.filter(kind=>!['resolve','withdraw'].includes(kind)).length,issueResolutions:issueSelected.filter(kind=>kind==='resolve').length,issues:{open:issues.filter(i=>i.status==='open').length,resolved:issues.filter(i=>i.status==='resolved').length,withdrawn:issues.filter(i=>i.status==='withdrawn').length},modelCreatedGroups:createdIds.size,modelCreatedGroupsWithMessages:[...createdIds].filter(id=>w.items.some(i=>i.groupId===id)).length,modelCreatedGroupsEmpty:[...createdIds].filter(id=>!w.items.some(i=>i.groupId===id)).length,privateModelItems:modelItems.filter(i=>i.groupId).length,privatePeerReplies:modelItems.filter(i=>i.groupId&&i.parentId&&w.items.find(p=>p.id===i.parentId)?.actorId!==i.actorId&&w.events.find(e=>e.id===i.parentId)?.source==='social-model').length,optionalRecalls:recalled.length,optionalCrossDayEpisodicRecalls:recalled.filter(m=>m.origin==='episodic'&&m.crossDay).length},publicReconciliation:{authoredItems:w.items.length,modelPublishedItems:modelItems.length,modelDirectContributions:summary.swarm!.modelAuthoredItems,graphNodes:graph.nodes.length,graphEdges:graph.edges.length,exact:true},privacy:{checkedRawStrings:rawStrings.length,rawLiteralMatches:rawMatches,forbiddenPrivateFields:false},integrity:{worldDigest,fullReplayExact:true,checkpointTailExact:true,prefixRecords,prefixTick,tailRecords:records.length-prefixRecords,journalUnchanged:true,restoreProviderCalls:mock.calls.length-callsBeforeRestore},storage:{journalBytes:statSync(journal).size,checkpointBytes:statSync(materialCheckpointPath(directory,state.sessionId)).size,publicBytes:Buffer.byteLength(publicJson)},timing:{elapsedMs:performance.now()-began,fullReplayMs,checkpointTailMs},serviceRequests:steps});
  report();console.log(JSON.stringify({active,tick:w.tick,opportunities:records.length,accepted:accepted.length,failed:failed.length,fullReplayExact:true,checkpointTailExact:true,privacyMatches:rawMatches,paidCalls:0}));
 }}finally{await stopCoordinators();report();}
 return rows;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 void runBehaviourIntegration().catch(error=>{const message=error instanceof Error?error.message:'';console.error(JSON.stringify({kind:'BEHAVIOUR_INTEGRATION_FAILURE',code:/^[A-Z][A-Z0-9_]{0,100}$/.test(message)?message:'INTEGRATION_ERROR'}));process.exitCode=1;});
}
