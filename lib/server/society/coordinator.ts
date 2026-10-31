/** Managed owner for a local, long-lived Node application. No browser request
 * owns its lifetime; process restart never automatically restarts a job. */
import {mkdirSync,existsSync,readFileSync,openSync,writeFileSync,fsyncSync,closeSync,unlinkSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {replacePrivateCheckpoint} from './storage.ts';
import {ensure} from '../../experiments/validation.ts';
import type {SocietyJobSummary} from '../../society/public-contract.ts';

export interface CoordinatorProgress {revision:number;tick:number;totalSteps:number;acceptedDecisions:number;participatingAgents:number;capacity:number;admittedCalls:number;calls:number;completed:boolean;budgetLimited:boolean}
export interface CoordinatorDriver {inspect():Promise<CoordinatorProgress>;step(signal:AbortSignal):Promise<CoordinatorProgress>;checkpoint():Promise<void>;publish():Promise<void>}
interface StoredJob extends SocietyJobSummary {runId:string;ownerPid:number;ownerNonce:string;deadline:number}
interface ManagedJob {stored:StoredJob;directory:string;driver:CoordinatorDriver;abort:AbortController;timer:ReturnType<typeof setTimeout>|null;work:Promise<void>|null;stopping:'paused'|'cancelled'|null;lastCheckpoint:number}
interface Registry {jobs:Map<string,ManagedJob>;starts:Map<string,Promise<SocietyJobSummary>>}
const globalState=globalThis as typeof globalThis&{__impactlensDeepCoordinator?:Registry};
const registry=globalState.__impactlensDeepCoordinator??={jobs:new Map(),starts:new Map()};
const keyFor=(runId:string,directory:string)=>directory+'/'+runId;
export const coordinatorJobPath=(runId:string,directory:string)=>join(directory,createHash('sha256').update(runId).digest('hex')+'.job.json');
const leasePath=(runId:string,directory:string)=>coordinatorJobPath(runId,directory)+'.lease';
function readStored(runId:string,directory:string):StoredJob|null {const path=coordinatorJobPath(runId,directory);if(!existsSync(path))return null;ensure(statSync(path).size<=8192,'JOB_STORAGE');const s=JSON.parse(readFileSync(path,'utf8')) as StoredJob;ensure(s.version===1&&s.runId===runId&&typeof s.id==='string'&&/^[a-f0-9-]{36}$/.test(s.id)&&Number.isSafeInteger(s.ownerPid)&&typeof s.ownerNonce==='string'&&/^[a-f0-9-]{36}$/.test(s.ownerNonce)&&['running','paused','cancelled','completed','budget-limited','failed'].includes(s.status),'JOB_RECORD');for(const n of [s.tick,s.totalSteps,s.acceptedDecisions,s.participatingAgents,s.capacity,s.admittedCalls,s.remainingCalls,s.revision])ensure(Number.isSafeInteger(n)&&n>=0&&n<=10000,'JOB_RECORD');ensure(s.capacity<=700&&s.admittedCalls<=s.capacity&&s.remainingCalls<=s.admittedCalls&&(s.reason===null||['APPLICATION_RESTART','DEADLINE','PROVIDER_BUDGET','PROVIDER_IDENTITY','STORAGE','ACCESS','OPERATION'].includes(s.reason)),'JOB_RECORD');return s;}
const alive=(pid:number)=>{try{process.kill(pid,0);return true;}catch(error){return (error as NodeJS.ErrnoException).code!=='ESRCH';}};
function publicJob(s:StoredJob):SocietyJobSummary {return {version:1,id:s.id,status:s.status,tick:s.tick,totalSteps:s.totalSteps,acceptedDecisions:s.acceptedDecisions,participatingAgents:s.participatingAgents,capacity:s.capacity,admittedCalls:s.admittedCalls,remainingCalls:s.remainingCalls,reason:s.reason,revision:s.revision};}
function releaseLease(entry:ManagedJob){const path=leasePath(entry.stored.runId,entry.directory);if(!existsSync(path))return;const v=JSON.parse(readFileSync(path,'utf8'));ensure(v.ownerPid===entry.stored.ownerPid&&v.ownerNonce===entry.stored.ownerNonce,'JOB_OWNER');unlinkSync(path);}
function takeLease(s:StoredJob,directory:string){const path=leasePath(s.runId,directory);let recoveryFd:number|undefined;const recovery=path+'.reclaim';try{if(existsSync(path)){recoveryFd=openSync(recovery,'wx',0o600);writeFileSync(recoveryFd,s.ownerNonce);fsyncSync(recoveryFd);const previous=JSON.parse(readFileSync(path,'utf8'));ensure(Number.isSafeInteger(previous.ownerPid)&&typeof previous.ownerNonce==='string','JOB_OWNER');ensure(!alive(previous.ownerPid),'JOB_OWNER');unlinkSync(path);}const fd=openSync(path,'wx',0o600);try{writeFileSync(fd,JSON.stringify({version:1,ownerPid:s.ownerPid,ownerNonce:s.ownerNonce}));fsyncSync(fd);}finally{closeSync(fd);}}finally{if(recoveryFd!==undefined){closeSync(recoveryFd);if(readFileSync(recovery,'utf8')===s.ownerNonce)unlinkSync(recovery);}}}
async function save(entry:ManagedJob){await replacePrivateCheckpoint(coordinatorJobPath(entry.stored.runId,entry.directory),JSON.stringify(entry.stored));}
function update(entry:ManagedJob,p:CoordinatorProgress){ensure(Number.isSafeInteger(p.revision)&&p.revision>=entry.stored.revision&&p.tick>=entry.stored.tick&&p.calls>=0&&p.calls<=p.admittedCalls,'JOB_PROGRESS');Object.assign(entry.stored,{revision:p.revision,tick:p.tick,totalSteps:p.totalSteps,acceptedDecisions:p.acceptedDecisions,participatingAgents:p.participatingAgents,capacity:p.capacity,admittedCalls:p.admittedCalls,remainingCalls:Math.max(0,p.admittedCalls-p.calls)});}
async function settle(entry:ManagedJob,status:StoredJob['status'],reason:SocietyJobSummary['reason']=null){entry.stored.status=status;entry.stored.reason=reason;await entry.driver.checkpoint();update(entry,await entry.driver.inspect());await entry.driver.publish();await save(entry);releaseLease(entry);registry.jobs.delete(keyFor(entry.stored.runId,entry.directory));}
function schedule(entry:ManagedJob){entry.timer=setTimeout(()=>{entry.timer=null;entry.work=turn(entry).finally(()=>{entry.work=null;});},5);}
async function turn(entry:ManagedJob){
 try{
  if(entry.stopping){await settle(entry,entry.stopping);return;}
  if(Date.now()>=entry.stored.deadline){await settle(entry,'paused','DEADLINE');return;}
  const p=await entry.driver.step(entry.abort.signal);update(entry,p);
  if(entry.stopping){await settle(entry,entry.stopping);return;}
  if(p.completed){await settle(entry,'completed');return;}
  if(p.budgetLimited){await settle(entry,'budget-limited','PROVIDER_BUDGET');return;}
  if(p.acceptedDecisions-entry.lastCheckpoint>=50){await entry.driver.checkpoint();entry.lastCheckpoint=p.acceptedDecisions;}
  await save(entry);schedule(entry);
 }catch(error){
  const status=entry.stopping??'failed',message=error instanceof Error?error.message:'';
  const reason=entry.stopping?null:/IDENTITY|PROVIDER_MISMATCH/.test(message)?'PROVIDER_IDENTITY':/STORAGE|JOURNAL|CHECKPOINT|ENOSPC|EACCES|EPERM/.test(message)?'STORAGE':/PRIVATE|ACCESS|PERMISSION/.test(message)?'ACCESS':'OPERATION';
  const known=['SOCIAL_SHAPE','SOCIAL_STALE','SOCIAL_FATAL','SOCIAL_PROVIDER_IDENTITY','SOCIAL_JOURNAL_HASH','SOCIAL_CHECKPOINT_WRITE','JOB_PROGRESS','JOB_OWNER'];
  console.warn('DEEP_JOB_SAFE',JSON.stringify({code:known.includes(message)?message:entry.stopping?'CONTROL':'OPERATION',tick:entry.stored.tick,revision:entry.stored.revision,acceptedDecisions:entry.stored.acceptedDecisions}));
  // No provider action is retried here. A failed durable checkpoint leaves the
  // last intent in place, whose next-process projection is explicitly paused.
  // A provider failure may already have committed its failed/uncertain record.
  // Refresh progress before checkpointing, including if that checkpoint fails.
  try{update(entry,await entry.driver.inspect());}catch{/* The failed settlement below remains fail-closed. */}
  try{await settle(entry,status,reason);}catch{entry.stored.status='failed';entry.stored.reason='STORAGE';try{await save(entry);releaseLease(entry);}catch{}registry.jobs.delete(keyFor(entry.stored.runId,entry.directory));}
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
  const p=await driver.inspect();const stored:StoredJob={version:1,id:old?.id??randomUUID(),runId,status:'running',tick:p.tick,totalSteps:p.totalSteps,acceptedDecisions:p.acceptedDecisions,participatingAgents:p.participatingAgents,capacity:p.capacity,admittedCalls:p.admittedCalls,remainingCalls:Math.max(0,p.admittedCalls-p.calls),reason:null,revision:p.revision,ownerPid:process.pid,ownerNonce:randomUUID(),deadline:Date.now()+Math.max(1000,Math.min(6*60*60_000,deadlineMs))};
  takeLease(stored,directory);const entry:ManagedJob={stored,directory,driver,abort:new AbortController(),timer:null,work:null,stopping:null,lastCheckpoint:p.acceptedDecisions};registry.jobs.set(key,entry);
  try{await save(entry);if(p.completed)await settle(entry,'completed');else if(p.budgetLimited)await settle(entry,'budget-limited','PROVIDER_BUDGET');else schedule(entry);return publicJob(entry.stored);}catch(error){registry.jobs.delete(key);releaseLease(entry);throw error;}
 })();registry.starts.set(key,start);try{return await start;}finally{registry.starts.delete(key);}
}
export async function controlCoordinator(runId:string,directory:string,operation:'pause'|'resume'|'cancel',driver:()=>CoordinatorDriver|Promise<CoordinatorDriver>):Promise<SocietyJobSummary>{
 const key=keyFor(runId,directory),entry=registry.jobs.get(key);if(operation==='resume'){if(entry)return publicJob(entry.stored);ensure(readStored(runId,directory),'JOB_UNKNOWN');return startCoordinator({runId,directory,driver:await driver(),resume:true});}
 if(entry){entry.stopping=operation==='cancel'?'cancelled':'paused';entry.abort.abort(new Error('JOB_CONTROL'));if(entry.timer){clearTimeout(entry.timer);entry.timer=null;}if(entry.work)await entry.work;else await settle(entry,entry.stopping);return publicJob(entry.stored);}
 const s=readStored(runId,directory);ensure(s,'JOB_UNKNOWN');ensure(s.status!=='running'||!alive(s.ownerPid),'JOB_OWNER');if(!['completed','cancelled'].includes(s.status)){s.status=operation==='cancel'?'cancelled':'paused';s.reason=null;await replacePrivateCheckpoint(coordinatorJobPath(runId,directory),JSON.stringify(s));}return publicJob(s);
}
/** Test/shutdown owner hook. It never deletes historical records. */
export async function stopCoordinators(directory?:string){for(const entry of [...registry.jobs.values()])if(!directory||entry.directory===directory)await controlCoordinator(entry.stored.runId,entry.directory,'pause',()=>entry.driver);}
