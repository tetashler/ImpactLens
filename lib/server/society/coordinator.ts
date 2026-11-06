import {PROVIDER_JOB_REASONS,providerJobReason} from '../../society/job-failure.ts';
import {jobFailureDiagnostic,validJobFailure,type JobFailureDiagnostic,type JobStage} from './coordinator-diagnostics.ts';
/** Managed owner for a local, long-lived Node application. No browser request
 * owns its lifetime; process restart never automatically restarts a job. */
import {mkdirSync,existsSync,readFileSync,openSync,writeFileSync,fsyncSync,closeSync,unlinkSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {replacePrivateCheckpoint} from './storage.ts';
import {executionProfile} from '../../society/execution-profile.ts';
import {ensure} from '../../experiments/validation.ts';
import type {SocietyJobSummary,SocietyCapacityReason} from '../../society/public-contract.ts';

export interface CoordinatorProgress {opportunities?:number;profileId?:string;capacityReason?:SocietyCapacityReason;revision:number;tick:number;totalSteps:number;acceptedDecisions:number;participatingAgents:number;capacity:number;admittedCalls:number;calls:number;completed:boolean;budgetLimited:boolean}
export interface CoordinatorDriver {inspect():Promise<CoordinatorProgress>;step(signal:AbortSignal):Promise<CoordinatorProgress>;checkpoint():Promise<void>;publish():Promise<void>}
interface StoredJob extends SocietyJobSummary {failure?:JobFailureDiagnostic;settlementFailure?:JobFailureDiagnostic;runId:string;ownerPid:number;ownerNonce:string;deadline:number}
interface ManagedJob {stage:JobStage;stored:StoredJob;directory:string;driver:CoordinatorDriver;abort:AbortController;timer:ReturnType<typeof setTimeout>|null;work:Promise<void>|null;stopping:'paused'|'cancelled'|null;lastProgress:{tick:number;opportunities:number}}
interface Registry {jobs:Map<string,ManagedJob>;starts:Map<string,Promise<SocietyJobSummary>>}
const globalState=globalThis as typeof globalThis&{__impactlensDeepCoordinator?:Registry};
const registry=globalState.__impactlensDeepCoordinator??={jobs:new Map(),starts:new Map()};
const keyFor=(runId:string,directory:string)=>directory+'/'+runId;
export const coordinatorJobPath=(runId:string,directory:string)=>join(directory,createHash('sha256').update(runId).digest('hex')+'.job.json');
const leasePath=(runId:string,directory:string)=>coordinatorJobPath(runId,directory)+'.lease';
function readStored(runId:string,directory:string):StoredJob|null {const path=coordinatorJobPath(runId,directory);if(!existsSync(path))return null;ensure(statSync(path).size<=8192,'JOB_STORAGE');const s=JSON.parse(readFileSync(path,'utf8')) as StoredJob;ensure(s.version===1&&s.runId===runId&&typeof s.id==='string'&&/^[a-f0-9-]{36}$/.test(s.id)&&Number.isSafeInteger(s.ownerPid)&&typeof s.ownerNonce==='string'&&/^[a-f0-9-]{36}$/.test(s.ownerNonce)&&['running','paused','cancelled','completed','budget-limited','capacity-limited','failed'].includes(s.status),'JOB_RECORD');for(const n of [s.tick,s.totalSteps,s.acceptedDecisions,s.participatingAgents,s.capacity,s.admittedCalls,s.remainingCalls,s.revision])ensure(Number.isSafeInteger(n)&&n>=0&&n<=10000,'JOB_RECORD');const profile=s.profileId===undefined?null:executionProfile(s.profileId);ensure((profile?s.totalSteps===profile.steps&&s.capacity===profile.decisions&&s.acceptedDecisions<=profile.decisions&&s.participatingAgents<=profile.modelAgents:s.totalSteps<=144&&s.capacity<=700)&&s.tick<=s.totalSteps&&s.admittedCalls<=s.capacity&&s.remainingCalls<=s.admittedCalls&&(s.reason===null||['APPLICATION_RESTART','DEADLINE','PROVIDER_BUDGET','PROVIDER_IDENTITY',...PROVIDER_JOB_REASONS,'STORAGE','ACCESS','OPERATION','EVENT_CAPACITY','ITEM_CAPACITY','STORAGE_CAPACITY','JOURNAL_CAPACITY'].includes(s.reason)),'JOB_RECORD');ensure(s.failure===undefined||validJobFailure(s.failure),'JOB_RECORD');ensure(s.settlementFailure===undefined||validJobFailure(s.settlementFailure),'JOB_RECORD');return s;}
const alive=(pid:number)=>{try{process.kill(pid,0);return true;}catch(error){return (error as NodeJS.ErrnoException).code!=='ESRCH';}};
function publicJob(s:StoredJob):SocietyJobSummary {return {...(s.profileId?{profileId:s.profileId}:{}),version:1,id:s.id,status:s.status,tick:s.tick,totalSteps:s.totalSteps,acceptedDecisions:s.acceptedDecisions,participatingAgents:s.participatingAgents,capacity:s.capacity,admittedCalls:s.admittedCalls,remainingCalls:s.remainingCalls,reason:s.reason,revision:s.revision};}
function releaseLease(entry:ManagedJob){entry.stage='lease';const path=leasePath(entry.stored.runId,entry.directory);if(!existsSync(path))return;const v=JSON.parse(readFileSync(path,'utf8'));ensure(v.ownerPid===entry.stored.ownerPid&&v.ownerNonce===entry.stored.ownerNonce,'JOB_OWNER');unlinkSync(path);}
function takeLease(s:StoredJob,directory:string){const path=leasePath(s.runId,directory);let recoveryFd:number|undefined;const recovery=path+'.reclaim';try{if(existsSync(path)){recoveryFd=openSync(recovery,'wx',0o600);writeFileSync(recoveryFd,s.ownerNonce);fsyncSync(recoveryFd);const previous=JSON.parse(readFileSync(path,'utf8'));ensure(Number.isSafeInteger(previous.ownerPid)&&typeof previous.ownerNonce==='string','JOB_OWNER');ensure(!alive(previous.ownerPid),'JOB_OWNER');unlinkSync(path);}const fd=openSync(path,'wx',0o600);try{writeFileSync(fd,JSON.stringify({version:1,ownerPid:s.ownerPid,ownerNonce:s.ownerNonce}));fsyncSync(fd);}finally{closeSync(fd);}}finally{if(recoveryFd!==undefined){closeSync(recoveryFd);if(readFileSync(recovery,'utf8')===s.ownerNonce)unlinkSync(recovery);}}}
async function save(entry:ManagedJob){entry.stage='save';await replacePrivateCheckpoint(coordinatorJobPath(entry.stored.runId,entry.directory),JSON.stringify(entry.stored));}
function update(entry:ManagedJob,p:CoordinatorProgress){entry.stage='progress';ensure(Number.isSafeInteger(p.revision)&&p.revision>=entry.stored.revision&&p.tick>=entry.stored.tick&&p.calls>=0&&p.calls<=p.capacity,'JOB_PROGRESS');ensure(p.opportunities===undefined||Number.isSafeInteger(p.opportunities)&&p.opportunities>=entry.lastProgress.opportunities&&p.opportunities<=p.capacity,'JOB_PROGRESS');entry.lastProgress={tick:p.tick,opportunities:p.opportunities??entry.lastProgress.opportunities};Object.assign(entry.stored,{...(p.profileId?{profileId:p.profileId}:{}),revision:p.revision,tick:p.tick,totalSteps:p.totalSteps,acceptedDecisions:p.acceptedDecisions,participatingAgents:p.participatingAgents,capacity:p.capacity,admittedCalls:p.admittedCalls,remainingCalls:Math.max(0,p.admittedCalls-p.calls)});}
async function settle(entry:ManagedJob,status:StoredJob['status'],reason:SocietyJobSummary['reason']=null){
 entry.stored.status=status;entry.stored.reason=reason;
 if(!entry.stored.profileId||status==='paused'||status==='completed'){entry.stage='checkpoint';await entry.driver.checkpoint();}
 entry.stage='inspect';const p=await entry.driver.inspect();update(entry,p);
 entry.stage='publish';await entry.driver.publish();await save(entry);releaseLease(entry);registry.jobs.delete(keyFor(entry.stored.runId,entry.directory));
}
function schedule(entry:ManagedJob){entry.timer=setTimeout(()=>{entry.timer=null;entry.work=turn(entry).finally(()=>{entry.work=null;});},5);}
async function turn(entry:ManagedJob){
 try{
  if(entry.stopping){await settle(entry,entry.stopping);return;}
  if(Date.now()>=entry.stored.deadline){await settle(entry,'paused','DEADLINE');return;}
  const before={revision:entry.stored.revision,...entry.lastProgress};entry.stage='step';const p=await entry.driver.step(entry.abort.signal);update(entry,p);
  if(entry.stopping){await settle(entry,entry.stopping);return;}
  if(p.capacityReason){await settle(entry,'capacity-limited',p.capacityReason);return;}
  if(p.completed){await settle(entry,'completed');return;}
  if(p.budgetLimited){await settle(entry,'budget-limited','PROVIDER_BUDGET');return;}
  ensure(entry.stored.profileId?p.tick>before.tick||(p.opportunities??before.opportunities)>before.opportunities:p.revision>before.revision||p.tick>before.tick,'JOB_NO_PROGRESS');
  await save(entry);schedule(entry);
 }catch(error){
  const message=error instanceof Error?error.message:'',code=(error as NodeJS.ErrnoException)?.code;
  const capacity:SocietyCapacityReason|undefined=!entry.stopping&&entry.stored.profileId?(message==='SOCIAL_STORAGE_LIMIT'?'JOURNAL_CAPACITY':message==='SOCIAL_CHECKPOINT_LIMIT'||code==='ENOSPC'?'STORAGE_CAPACITY':undefined):undefined;
  const status=entry.stopping??(capacity?'capacity-limited':'failed');
  const reason=entry.stopping?null:capacity??providerJobReason(error)??((code==='AI_PROVIDER_IDENTITY'||/IDENTITY|PROVIDER_MISMATCH/.test(message))?'PROVIDER_IDENTITY':/STORAGE|JOURNAL|CHECKPOINT|ENOSPC|EACCES|EPERM/.test(message)?'STORAGE':/PRIVATE|ACCESS|PERMISSION/.test(message)?'ACCESS':'OPERATION');
  const diagnostic=jobFailureDiagnostic(error,entry.stage);entry.stored.failure=diagnostic;
  console.warn('DEEP_JOB_SAFE',JSON.stringify({...diagnostic,code:entry.stopping?'CONTROL':diagnostic.code,tick:entry.stored.tick,revision:entry.stored.revision,acceptedDecisions:entry.stored.acceptedDecisions}));
  // No provider action is retried here. A failed durable checkpoint leaves the
  // last intent in place, whose next-process projection is explicitly paused.
  // A provider failure may already have committed its failed/uncertain record.
  // Refresh progress before checkpointing, including if that checkpoint fails.
  try{update(entry,await entry.driver.inspect());}catch{/* The failed settlement below remains fail-closed. */}
  try{await settle(entry,status,reason);}catch(settlementError){entry.stored.settlementFailure=jobFailureDiagnostic(settlementError,entry.stage);entry.stored.status='failed';const secondary=settlementError instanceof Error?settlementError.message:'';const secondaryCode=(settlementError as NodeJS.ErrnoException)?.code;entry.stored.reason=providerJobReason(settlementError)??(/STORAGE|JOURNAL|CHECKPOINT|ENOSPC|EACCES|EPERM/.test(secondary)||['ENOSPC','EACCES','EPERM','EIO','ENOENT'].includes(secondaryCode??'')?'STORAGE':'OPERATION');try{await save(entry);releaseLease(entry);}catch{}registry.jobs.delete(keyFor(entry.stored.runId,entry.directory));}
 }
}
/** Passive and bounded. It does not construct a decision context or resume work. */
export function coordinatorStatus(runId:string,directory:string):SocietyJobSummary|null {
 const entry=registry.jobs.get(keyFor(runId,directory));if(entry)return publicJob(entry.stored);
 const saved=readStored(runId,directory);if(!saved)return null;
 if(saved.status==='running'&&!alive(saved.ownerPid)){saved.status='paused';saved.reason='APPLICATION_RESTART';}
 // A live PID without a tracked owner is never automatically attached/restarted.
 if(saved.status==='running'&&saved.ownerPid===process.pid){saved.status='paused';saved.reason='APPLICATION_RESTART';}
 return publicJob(saved);
}
export async function startCoordinator({runId,directory,driver,deadlineMs=30*60_000,resume=false}:{runId:string;directory:string;driver:CoordinatorDriver;deadlineMs?:number;resume?:boolean}):Promise<SocietyJobSummary>{
 const key=keyFor(runId,directory),current=registry.jobs.get(key);if(current)return publicJob(current.stored);const pending=registry.starts.get(key);if(pending)return pending;
 const start=(async()=>{
  mkdirSync(directory,{recursive:true,mode:0o700});const old=readStored(runId,directory);if(old&&!resume)return coordinatorStatus(runId,directory)!;
  ensure(!old||!['completed','cancelled'].includes(old.status),'JOB_TERMINAL');
  const p=await driver.inspect();const stored:StoredJob={...(p.profileId?{profileId:p.profileId}:{}),version:1,id:old?.id??randomUUID(),runId,status:'running',tick:p.tick,totalSteps:p.totalSteps,acceptedDecisions:p.acceptedDecisions,participatingAgents:p.participatingAgents,capacity:p.capacity,admittedCalls:p.admittedCalls,remainingCalls:Math.max(0,p.admittedCalls-p.calls),reason:null,revision:p.revision,ownerPid:process.pid,ownerNonce:randomUUID(),deadline:Date.now()+Math.max(1000,Math.min(6*60*60_000,deadlineMs))};
  takeLease(stored,directory);const entry:ManagedJob={stage:'inspect',stored,directory,driver,abort:new AbortController(),timer:null,work:null,stopping:null,lastProgress:{tick:p.tick,opportunities:p.opportunities??0}};registry.jobs.set(key,entry);
  try{await save(entry);if(p.capacityReason)await settle(entry,'capacity-limited',p.capacityReason);else if(p.completed)await settle(entry,'completed');else if(p.budgetLimited)await settle(entry,'budget-limited','PROVIDER_BUDGET');else schedule(entry);return publicJob(entry.stored);}catch(error){registry.jobs.delete(key);releaseLease(entry);throw error;}
 })();registry.starts.set(key,start);try{return await start;}finally{registry.starts.delete(key);}
}
export async function controlCoordinator(runId:string,directory:string,operation:'pause'|'resume'|'cancel',driver:()=>CoordinatorDriver|Promise<CoordinatorDriver>):Promise<SocietyJobSummary>{
 const key=keyFor(runId,directory),entry=registry.jobs.get(key);if(operation==='resume'){if(entry)return publicJob(entry.stored);ensure(readStored(runId,directory),'JOB_UNKNOWN');return startCoordinator({runId,directory,driver:await driver(),resume:true});}
 if(entry){entry.stopping=operation==='cancel'?'cancelled':'paused';entry.abort.abort(new Error('JOB_CONTROL'));if(entry.timer){clearTimeout(entry.timer);entry.timer=null;}if(entry.work)await entry.work;else await settle(entry,entry.stopping);return publicJob(entry.stored);}
 const s=readStored(runId,directory);ensure(s,'JOB_UNKNOWN');ensure(s.status!=='running'||!alive(s.ownerPid),'JOB_OWNER');if(!['completed','cancelled'].includes(s.status)){s.status=operation==='cancel'?'cancelled':'paused';s.reason=null;await replacePrivateCheckpoint(coordinatorJobPath(runId,directory),JSON.stringify(s));}return publicJob(s);
}
/** Test/shutdown owner hook. It never deletes historical records. */
export async function stopCoordinators(directory?:string){for(const entry of [...registry.jobs.values()])if(!directory||entry.directory===directory)await controlCoordinator(entry.stored.runId,entry.directory,'pause',()=>entry.driver);}
