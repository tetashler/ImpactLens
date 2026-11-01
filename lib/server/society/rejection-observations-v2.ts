/** Optional private observations. These files never participate in world replay or billing. */
import {createHash} from 'node:crypto';
import {closeSync,constants,fstatSync,fsyncSync,lstatSync,openSync,readSync,unlinkSync,writeSync,readdirSync,type Stats} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import {ensure,freezeSnapshot,object} from '../../experiments/validation.ts';
import {parseSafeSocialDiagnosticV2,type SafeSocialDiagnosticV2} from '../../society/social-diagnostics-v2.ts';

export interface RejectionObservationV2 {version:2;contextSha256:string;diagnostic:SafeSocialDiagnosticV2}
export const REJECTION_OBSERVATION_LIMITS=Object.freeze({fileBytes:1024*1024,rowBytes:1024,directoryFiles:17});
const sameFile=(a:Stats,b:Stats)=>a.dev===b.dev&&a.ino===b.ino;
const close=(fd:number|undefined)=>{if(fd!==undefined)try{closeSync(fd);}catch{/* Observation cleanup is never authoritative. */}};

export function parseRejectionObservationV2(value:unknown):RejectionObservationV2 {
 const v=object(value,['version','contextSha256','diagnostic']);
 ensure(v.version===2&&typeof v.contextSha256==='string'&&/^[a-f0-9]{64}$/.test(v.contextSha256),'Invalid rejection observation.');
 return freezeSnapshot({version:2 as const,contextSha256:v.contextSha256,diagnostic:parseSafeSocialDiagnosticV2(v.diagnostic)});
}

/** The root is trusted caller configuration and must already exist. Contention or faults drop the observation. */
export function appendRejectionObservationV2(root:string,sessionId:string,contextId:string,diagnostic:unknown):boolean {
 let output:number|undefined,lock:number|undefined,lockPath:string|undefined,owner:Stats|undefined;
 try{
  ensure(typeof root==='string'&&root.trim().length>0,'Invalid observation root.');
  ensure(typeof sessionId==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(sessionId),'Invalid observation session.');
  ensure(typeof contextId==='string'&&contextId.length>0&&Buffer.byteLength(contextId)<=1024,'Invalid observation context.');
  const observation=parseRejectionObservationV2({version:2,contextSha256:createHash('sha256').update(contextId).digest('hex'),diagnostic});
  const row=JSON.stringify(observation)+'\n',bytes=Buffer.byteLength(row);
  ensure(bytes<=REJECTION_OBSERVATION_LIMITS.rowBytes,'Observation row exceeds limit.');
  const directory=resolve(root),directoryStat=lstatSync(directory);
  ensure(!directory.split(sep).some(p=>['session-store-v2','social-sessions','accepted-private'].includes(p.toLowerCase())),'Observation root must be outside authoritative storage.');
  ensure(directoryStat.isDirectory()&&!directoryStat.isSymbolicLink(),'Invalid observation root.');
  const path=join(directory,sessionId+'.rejections-v2');lockPath=join(directory,'observations-v2.lock');
  // A competing or interrupted owner is never reclaimed by an optional observer.
  lock=openSync(lockPath,'wx',0o600);owner=fstatSync(lock);
  ensure(writeSync(lock,'rejection-observation-v2\n')===25,'Observation ownership write failed.');fsyncSync(lock);
  const entries=readdirSync(directory);ensure(entries.every(n=>n==='observations-v2.lock'||/^[a-f0-9-]{36}\.rejections-v2$/.test(n)),'Unexpected observation artifact.');
  ensure(entries.length+(entries.includes(sessionId+'.rejections-v2')?0:1)<=REJECTION_OBSERVATION_LIMITS.directoryFiles,'Observation directory exceeds limit.');
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
export function createRejectionObserverV2(root:string,sessionId:string):(contextId:string,diagnostic:unknown)=>void {
 return (contextId,diagnostic)=>{appendRejectionObservationV2(root,sessionId,contextId,diagnostic);};
}
/** Explicit server configuration only. No directories, claims or journal rows are created here. */
export function configuredProseObserver(sessionId:string,override?:{version:2;observe:(contextId:string,value:SafeSocialDiagnosticV2)=>void}){
 if(override)return override;
 const root=process.env.SOCIAL_PROSE_OBSERVATION_ROOT;
 return root?{version:2 as const,observe:createRejectionObserverV2(root,sessionId)}:undefined;
}
