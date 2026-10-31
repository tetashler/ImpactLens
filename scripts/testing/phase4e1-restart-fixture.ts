/** Task-only, network-blocked actual-process recovery fixture. Never imported by production. */
import './offline-network.mjs';
import {readFileSync,writeFileSync,openSync,fsyncSync,closeSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';import {createHash} from 'node:crypto';
import {phase4eSource,phase4eCommunication,phase4eFetcher} from './phase4e-fixture.ts';
import {deepSwarmPolicy} from '../../lib/society/swarm.ts';
import {canonical,ensure} from '../../lib/experiments/validation.ts';
import {socialOperation,readSocialSession,checkpointSocialSession,type SocialState,type SocialDependencies} from '../../lib/server/society/service.ts';
import {startCoordinator,controlCoordinator,coordinatorStatus,coordinatorJobPath,type CoordinatorDriver,type CoordinatorProgress} from '../../lib/server/society/coordinator.ts';
import {readSwarmJournal} from '../../lib/server/society/swarm-journal.ts';
import {readMaterialCheckpoint} from '../../lib/server/society/checkpoint.ts';
import {replayHybrid,replayHybridFrom} from '../../lib/society/hybrid.ts';

interface Manifest {runId:string;sessionId:string;worldDigest:string;requestIds:string[]}
const hash=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const output=(value:unknown):never=>{process.stdout.write('PHASE4E1_RESTART_RESULT '+JSON.stringify(value)+'\n',()=>process.exit(0));return undefined as never;};
async function main(){
 const [mode,path]=process.argv.slice(2),directory=resolve(path??'');ensure(['first','passive','resume'].includes(mode)&&directory.startsWith(resolve('tmp')+sep)&&directory.includes('phase4e1-process-restart-'),'RESTART_FIXTURE_SCOPE');
 const sessions=join(directory,'sessions'),jobs=join(directory,'jobs'),manifestPath=join(directory,'manifest.json'),mock=phase4eFetcher(),requestIds:string[]=[];
 const fetcher:typeof fetch=async(url,init)=>{const context=JSON.parse(JSON.parse(String(init?.body)).messages[1].content);requestIds.push(context.id);const response=await mock.fetcher(url,init),value=await response.json();value.id='offline-restart-'+mode+'-'+requestIds.length;return Response.json(value);};
 const dependencies:SocialDependencies={directory:sessions,swarm:deepSwarmPolicy(50,175),admission:{maxCalls:4,reservedTokens:1_000_000,costUsd:0.2},communication:phase4eCommunication(),enabled:true,key:'offline-restart-fixture',fetcher};
 let latest:SocialState;let manifest:Manifest;
 const progress=(s:SocialState):CoordinatorProgress=>{const records=s.world.hybrid?.records??[],accepted=records.filter(r=>r.status==='accepted');return {revision:s.revision,tick:s.world.tick,totalSteps:s.world.genesis.config.steps,acceptedDecisions:accepted.length,participatingAgents:new Set(accepted.map(r=>r.context.actor.id)).size,capacity:s.world.genesis.input.hybrid!.maxCalls,admittedCalls:s.admission.maxCalls,calls:s.admission.calls,completed:s.world.tick===s.world.genesis.config.steps&&!s.world.hybrid?.pending,budgetLimited:s.admission.status==='budget-limited'&&records.length<s.world.genesis.input.hybrid!.maxCalls};};
 const driver=():CoordinatorDriver=>({inspect:async()=>{latest=await readSocialSession(manifest.sessionId,dependencies);return progress(latest);},step:async signal=>{if(mode==='first'&&latest.world.hybrid!.records.length>=2)await new Promise<void>(()=>{});latest=await socialOperation({operation:'step',sessionId:manifest.sessionId,revision:latest.revision},dependencies,signal);return progress(latest);},checkpoint:async()=>{await checkpointSocialSession(manifest.sessionId,dependencies);},publish:async()=>{}});
 if(mode==='first'){
  const source=await phase4eSource('phase4e1-process-restart');latest=await socialOperation({operation:'start',run:source},dependencies);manifest={runId:source.runId,sessionId:latest.sessionId,worldDigest:'',requestIds:[]};await startCoordinator({runId:source.runId,directory:jobs,driver:driver(),deadlineMs:60_000});
  for(let i=0;i<1000&&coordinatorStatus(source.runId,jobs)?.acceptedDecisions!==2;i++)await wait(2);ensure(coordinatorStatus(source.runId,jobs)?.acceptedDecisions===2,'RESTART_FIRST_PROGRESS');
  latest=await checkpointSocialSession(manifest.sessionId,dependencies);ensure(latest.world.hybrid?.records.length===2&&requestIds.length===2,'RESTART_FIRST_CALLS');manifest.worldDigest=hash(latest.world);manifest.requestIds=[...requestIds];const fd=openSync(manifestPath,'wx',0o600);try{writeFileSync(fd,JSON.stringify(manifest));fsyncSync(fd);}finally{closeSync(fd);}
  const journal=readSwarmJournal(join(sessions,manifest.sessionId+'.jsonl')),checkpoint=readMaterialCheckpoint(sessions,journal),job=JSON.parse(readFileSync(coordinatorJobPath(manifest.runId,jobs),'utf8'));ensure(job.status==='running'&&job.acceptedDecisions===2,'RESTART_FIRST_INTENT');
  // Deliberate abrupt application exit: the job and its lease remain running on
  // disk. No pause/shutdown handler runs, and no provider reservation is pending.
  return output({mode,pid:process.pid,sessionId:manifest.sessionId,calls:requestIds.length,accepted:latest.world.hybrid!.records.length,worldDigest:manifest.worldDigest,requestIds,checkpoint:!!checkpoint,job:{id:job.id,status:job.status,acceptedDecisions:job.acceptedDecisions,revision:job.revision}});
 }
 manifest=JSON.parse(readFileSync(manifestPath,'utf8'));const passiveStatus=coordinatorStatus(manifest.runId,jobs);latest=await readSocialSession(manifest.sessionId,dependencies);const beforeDigest=hash(latest.world),beforeAccepted=latest.world.hybrid!.records.filter(r=>r.status==='accepted').length;ensure(beforeDigest===manifest.worldDigest&&beforeAccepted===2&&Number(requestIds.length)===0,'RESTART_RESTORE');
 if(mode==='passive')return output({mode,pid:process.pid,job:passiveStatus,calls:requestIds.length,accepted:beforeAccepted,restoredDigest:beforeDigest});
 const beforeJournal=readSwarmJournal(join(sessions,manifest.sessionId+'.jsonl')),base=readMaterialCheckpoint(sessions,beforeJournal);ensure(base&&base.hybrid?.records.length===2,'RESTART_CHECKPOINT_BEFORE_RESUME');
 await controlCoordinator(manifest.runId,jobs,'resume',driver);
 for(let i=0;i<1000&&coordinatorStatus(manifest.runId,jobs)?.status==='running';i++)await wait(2);
 const job=coordinatorStatus(manifest.runId,jobs);latest=await readSocialSession(manifest.sessionId,dependencies);ensure(job?.status==='budget-limited'&&requestIds.length===2,'RESTART_REMAINING_BUDGET');
 const journal=readSwarmJournal(join(sessions,manifest.sessionId+'.jsonl')),full=replayHybrid(journal.input,journal.tick,journal.hybrid.records,journal.hybrid.pending),tail=replayHybridFrom(base,journal.tick,journal.hybrid.records,journal.hybrid.pending);
 return output({mode,pid:process.pid,beforeCalls:0,beforeAccepted,beforeDigest,calls:requestIds.length,accepted:latest.world.hybrid!.records.filter(r=>r.status==='accepted').length,job,revision:latest.revision,requestIds,providerConcurrency:mock.maxInFlight(),checkpointRecordsBeforeResume:base.hybrid!.records.length,fullReplay:hash(full)===hash(latest.world),checkpointTailReplay:hash(tail)===hash(latest.world)});
}
void main().catch(()=>{console.error('PHASE4E1_RESTART_FAILURE');process.exitCode=1;});
