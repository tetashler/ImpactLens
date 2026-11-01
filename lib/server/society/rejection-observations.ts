/** Optional private observations. These files never participate in world replay or billing. */
import {createHash} from 'node:crypto';
import {closeSync,constants,fstatSync,fsyncSync,lstatSync,openSync,readSync,unlinkSync,writeSync,type Stats} from 'node:fs';
import {join,resolve} from 'node:path';
import {ensure,freezeSnapshot,object} from '../../experiments/validation.ts';
import {parseSafeSocialDiagnostic,type SafeSocialDiagnostic} from '../../society/social-diagnostics.ts';

export interface RejectionObservation {version:1;contextSha256:string;diagnostic:SafeSocialDiagnostic}
export const REJECTION_OBSERVATION_LIMITS=Object.freeze({fileBytes:1024*1024,rowBytes:1024});
const sameFile=(a:Stats,b:Stats)=>a.dev===b.dev&&a.ino===b.ino;
const close=(fd:number|undefined)=>{if(fd!==undefined)try{closeSync(fd);}catch{/* Observation cleanup is never authoritative. */}};

export function parseRejectionObservation(value:unknown):RejectionObservation {
 const v=object(value,['version','contextSha256','diagnostic']);
 ensure(v.version===1&&typeof v.contextSha256==='string'&&/^[a-f0-9]{64}$/.test(v.contextSha256),'Invalid rejection observation.');
 return freezeSnapshot({version:1 as const,contextSha256:v.contextSha256,diagnostic:parseSafeSocialDiagnostic(v.diagnostic)});
}

/** The root is trusted caller configuration and must already exist. Contention or faults drop the observation. */
export function appendRejectionObservation(root:string,sessionId:string,contextId:string,diagnostic:unknown):boolean {
 let output:number|undefined,lock:number|undefined,lockPath:string|undefined,owner:Stats|undefined;
 try{
  ensure(typeof root==='string'&&root.trim().length>0,'Invalid observation root.');
  ensure(typeof sessionId==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(sessionId),'Invalid observation session.');
  ensure(typeof contextId==='string'&&contextId.length>0&&Buffer.byteLength(contextId)<=1024,'Invalid observation context.');
  const observation=parseRejectionObservation({version:1,contextSha256:createHash('sha256').update(contextId).digest('hex'),diagnostic});
  const row=JSON.stringify(observation)+'\n',bytes=Buffer.byteLength(row);
  ensure(bytes<=REJECTION_OBSERVATION_LIMITS.rowBytes,'Observation row exceeds limit.');
  const directory=resolve(root),directoryStat=lstatSync(directory);
  ensure(directoryStat.isDirectory()&&!directoryStat.isSymbolicLink(),'Invalid observation root.');
  const path=join(directory,sessionId+'.rejections-v1');lockPath=path+'.lock';
  // A competing or interrupted owner is never reclaimed by an optional observer.
  lock=openSync(lockPath,'wx',0o600);owner=fstatSync(lock);
  ensure(writeSync(lock,'rejection-observation-v1\n')===25,'Observation ownership write failed.');fsyncSync(lock);
  let previous:Stats|undefined;
  try{previous=lstatSync(path);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  if(previous){
   ensure(previous.isFile()&&!previous.isSymbolicLink()&&previous.nlink===1,'Invalid observation target.');
   output=openSync(path,constants.O_APPEND|constants.O_RDWR);
   const current=fstatSync(output);ensure(current.isFile()&&current.nlink===1&&sameFile(previous,current),'Observation target changed.');
  }else output=openSync(path,'ax+',0o600);
  const size=fstatSync(output).size;
  ensure(size+bytes<=REJECTION_OBSERVATION_LIMITS.fileBytes,'Observation file exceeds limit.');
  if(size){const tail=Buffer.alloc(1);ensure(readSync(output,tail,0,1,size-1)===1&&tail[0]===10,'Incomplete observation tail.');}
  const written=writeSync(output,row);fsyncSync(output);
  return written===bytes;
 }catch{return false;}
 finally{
  close(output);close(lock);
  if(lockPath&&owner)try{const current=lstatSync(lockPath);if(current.isFile()&&!current.isSymbolicLink()&&sameFile(current,owner))unlinkSync(lockPath);}catch{/* Keep any marker whose ownership cannot be verified. */}
 }
}

/** Explicit opt-in adapter; storage faults cannot escape into decision validation or accounting. */
export function createRejectionObserver(root:string,sessionId:string):(contextId:string,diagnostic:unknown)=>void {
 return (contextId,diagnostic)=>{appendRejectionObservation(root,sessionId,contextId,diagnostic);};
}
