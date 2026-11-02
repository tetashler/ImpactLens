/** Fixed additional retention. Claims are immutable, consumed forever, and confer no inference authority. */
import {mkdirSync,existsSync,lstatSync,readFileSync,openSync,writeFileSync,fsyncSync,closeSync,opendirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {canonical,ensure,object} from '../../experiments/validation.ts';

export const STORAGE_ADMISSION_POLICY='storage-admission-v1' as const;
export const STORAGE_ADMISSION_SLOTS=32;
export const STORAGE_NAMESPACE_LIMITS=Object.freeze({files:256,bytes:3*1024*1024*1024,directories:8,depth:3});
export interface StorageClaim {version:1;policy:typeof STORAGE_ADMISSION_POLICY;slot:number;nonce:string;attemptHash:string;requestHash:string;sessionId:string}
export interface StorageBinding {version:1;policy:typeof STORAGE_ADMISSION_POLICY;slot:number;nonce:string;runId:string;sessionId:string}
export interface StorageAdmission {base:string;claim:StorageClaim}
export interface StorageBundle {archives:string;sessions:string;jobs:string;historical:boolean}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
export const storageBase=(override?:string)=>resolve(override??process.env.SOCIAL_STORAGE_ROOT??join(process.cwd(),'data/derived/agents'));
export function storageBundle(base:string,historical=false):StorageBundle {
 const root=historical?storageBase(base):join(storageBase(base),'session-store-v2'),archives=join(root,'accepted-private');
 return {archives,sessions:join(root,'social-sessions'),jobs:join(archives,'jobs'),historical};
}
const directory=(base:string)=>join(storageBase(base),'session-store-v2','admission');
const pathFor=(base:string,slot:number,extension:string)=>join(directory(base),'slot-'+String(slot).padStart(2,'0')+'.'+extension);
/** Inspection threshold, not a prepaid filesystem reservation. Never reads private bodies or removes evidence. */
export function inspectStorageAdmission(base=storageBase()){
 const root=join(storageBase(base),'session-store-v2');let files=0,bytes=0,directories=0;
 if(!existsSync(root))return {files,bytes};
 function visit(path:string,depth:number){
  const info=lstatSync(path);ensure(info.isDirectory()&&!info.isSymbolicLink()&&depth<=STORAGE_NAMESPACE_LIMITS.depth&&++directories<=STORAGE_NAMESPACE_LIMITS.directories,'STORAGE_ADMISSION_FILES');
  const handle=opendirSync(path);
  try{for(let entry=handle.readSync();entry;entry=handle.readSync()){
   const child=join(path,entry.name);let stat:ReturnType<typeof lstatSync>;
   try{stat=lstatSync(child);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')continue;throw error;}
   ensure(!stat.isSymbolicLink(),'STORAGE_ADMISSION_FILES');
   if(stat.isDirectory()){visit(child,depth+1);continue;}
   ensure(stat.isFile()&&++files<=STORAGE_NAMESPACE_LIMITS.files,'STORAGE_ADMISSION_FILES');
   bytes+=stat.size;ensure(bytes<=STORAGE_NAMESPACE_LIMITS.bytes,'STORAGE_ADMISSION_BYTES');
   // Atomic replacement can be actively retrying in another process. Pending
   // files consume the same bounded inventory; their presence alone proves no failure.
   ensure(!entry.name.includes('.incomplete-'),'STORAGE_ADMISSION_ARTIFACT');
  }}finally{handle.closeSync();}
 }
 visit(root,0);return {files,bytes};
}
function legacyAttemptUsed(attemptHash:string,base:string){
 const root=storageBundle(base,true).archives;if(!existsSync(root))return false;
 const handle=opendirSync(root);let count=0,matched=false;
 try{for(let entry=handle.readSync();entry;entry=handle.readSync()){
  if(!entry.name.endsWith('.json'))continue;
  ensure(++count<=64,'STORAGE_ADMISSION_LEGACY');const path=join(root,entry.name),st=lstatSync(path);ensure(st.isFile()&&!st.isSymbolicLink()&&st.size<=3*1024*1024,'STORAGE_ADMISSION_LEGACY');
  let stored:unknown;try{stored=JSON.parse(readFileSync(path,'utf8'));}catch{throw Error('STORAGE_ADMISSION_LEGACY');}
  const attempt=(stored as {execution?:{attemptId?:unknown}})?.execution?.attemptId;
  ensure(typeof attempt==='string'&&attempt.length<=64,'STORAGE_ADMISSION_LEGACY');if(hash(attempt)===attemptHash)matched=true;
 }}finally{handle.closeSync();}
 return matched;
}
function readBounded(path:string){
 try{const st=lstatSync(path);ensure(st.isFile()&&!st.isSymbolicLink()&&st.size>0&&st.size<=2048,'STORAGE_ADMISSION_CORRUPT');return JSON.parse(readFileSync(path,'utf8'));}
 catch{throw Error('STORAGE_ADMISSION_CORRUPT');}
}
function claimValue(v:unknown,slot:number):StorageClaim {
 try{const c=object(v,['version','policy','slot','nonce','attemptHash','requestHash','sessionId']);
  ensure(c.version===1&&c.policy===STORAGE_ADMISSION_POLICY&&c.slot===slot&&uuid(c.nonce)&&uuid(c.sessionId)&&typeof c.attemptHash==='string'&&/^[a-f0-9]{64}$/.test(c.attemptHash)&&typeof c.requestHash==='string'&&/^[a-f0-9]{64}$/.test(c.requestHash),'STORAGE_ADMISSION_CORRUPT');return c as unknown as StorageClaim;
 }catch{throw Error('STORAGE_ADMISSION_CORRUPT');}
}
function bindingValue(v:unknown,c:StorageClaim):StorageBinding {
 try{const b=object(v,['version','policy','slot','nonce','runId','sessionId']);
  ensure(b.version===1&&b.policy===c.policy&&b.slot===c.slot&&b.nonce===c.nonce&&b.sessionId===c.sessionId&&typeof b.runId==='string'&&b.runId.length>0&&b.runId.length<=160,'STORAGE_ADMISSION_BINDING');return b as unknown as StorageBinding;
 }catch{throw Error('STORAGE_ADMISSION_BINDING');}
}
/** All reads are bounded by thirty-two fixed slots; a partial file always blocks dispatch. */
function inventory(base:string){
 const result:{claim:StorageClaim;binding:StorageBinding|null}[]=[],attempts=new Set<string>(),sessions=new Set<string>(),nonces=new Set<string>(),runs=new Set<string>();
 for(let slot=0;slot<STORAGE_ADMISSION_SLOTS;slot++){
  const path=pathFor(base,slot,'claim'),bindingPath=pathFor(base,slot,'binding'),intent=pathFor(base,slot,'initialization');
  if(!existsSync(path)){ensure(!existsSync(bindingPath)&&!existsSync(intent),'STORAGE_ADMISSION_CORRUPT');continue;}
  const claim=claimValue(readBounded(path),slot);ensure(!attempts.has(claim.attemptHash)&&!sessions.has(claim.sessionId)&&!nonces.has(claim.nonce),'STORAGE_ADMISSION_CORRUPT');attempts.add(claim.attemptHash);sessions.add(claim.sessionId);nonces.add(claim.nonce);
  const binding=existsSync(bindingPath)?bindingValue(readBounded(bindingPath),claim):null;
  if(binding){ensure(!runs.has(binding.runId),'STORAGE_ADMISSION_BINDING');runs.add(binding.runId);}
  if(existsSync(intent)){ensure(binding,'STORAGE_ADMISSION_BINDING');ensure(canonical(readBounded(intent))===canonical(binding),'STORAGE_ADMISSION_CORRUPT');}
  result.push({claim,binding});
 }
 return result;
}
function writeExclusive(path:string,value:unknown){
 const fd=openSync(path,'wx',0o600);
 // Failed writes remain consumed evidence. No slot is deleted or reclaimed.
 try{writeFileSync(fd,JSON.stringify(value));fsyncSync(fd);}finally{closeSync(fd);}
}
export function reserveStorageAdmission(attemptId:string,requestHash:string,base=storageBase()):StorageClaim {
 ensure(typeof attemptId==='string'&&attemptId.length<=64&&/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(attemptId)&&/^[a-f0-9]{64}$/.test(requestHash),'STORAGE_ADMISSION_INPUT');
 inspectStorageAdmission(base);const attemptHash=hash(attemptId);ensure(!legacyAttemptUsed(attemptHash,base),'STORAGE_ADMISSION_DUPLICATE');mkdirSync(directory(base),{recursive:true,mode:0o700});
 ensure(!inventory(base).some(v=>v.claim.attemptHash===attemptHash),'STORAGE_ADMISSION_DUPLICATE');
 // Legacy hybrid attempt claims remain authoritative and are never reused.
 ensure(!existsSync(join(storageBundle(base,true).archives,'hybrid-attempts',attemptHash+'.json')),'STORAGE_ADMISSION_DUPLICATE');
 for(let slot=0;slot<STORAGE_ADMISSION_SLOTS;slot++){
  const path=pathFor(base,slot,'claim'),claim:StorageClaim={version:1,policy:STORAGE_ADMISSION_POLICY,slot,nonce:randomUUID(),attemptHash,requestHash,sessionId:randomUUID()};
  try{writeExclusive(path,claim);inventory(base);inspectStorageAdmission(base);return Object.freeze(claim);}
  catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;const occupied=claimValue(readBounded(path),slot);ensure(occupied.attemptHash!==attemptHash,'STORAGE_ADMISSION_DUPLICATE');}
 }
 throw Error('STORAGE_ADMISSION_CAPACITY');
}
function owned(claim:StorageClaim,base:string){
 ensure(Number.isSafeInteger(claim?.slot)&&claim.slot>=0&&claim.slot<STORAGE_ADMISSION_SLOTS,'STORAGE_ADMISSION_BINDING');
 const entry=inventory(base).find(v=>v.claim.slot===claim.slot);ensure(entry&&canonical(entry.claim)===canonical(claim),'STORAGE_ADMISSION_BINDING');return entry;
}
export function bindStorageAdmission(claim:StorageClaim,run:{runId:string;attemptId:string},base=storageBase()):StorageBinding {
 const entry=owned(claim,base);ensure(hash(run.attemptId)===claim.attemptHash,'STORAGE_ADMISSION_BINDING');
 const value=bindingValue({version:1,policy:claim.policy,slot:claim.slot,nonce:claim.nonce,runId:run.runId,sessionId:claim.sessionId},claim);
 ensure(!inventory(base).some(v=>v.binding?.runId===run.runId&&v.claim.slot!==claim.slot),'STORAGE_ADMISSION_BINDING');
 if(entry.binding){ensure(canonical(entry.binding)===canonical(value),'STORAGE_ADMISSION_BINDING');return entry.binding;}
 try{writeExclusive(pathFor(base,claim.slot,'binding'),value);}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;ensure(canonical(readBounded(pathFor(base,claim.slot,'binding')))===canonical(value),'STORAGE_ADMISSION_BINDING');}
 return value;
}
export function findStorageBinding(runId:string,base=storageBase()){
 return inventory(base).find(v=>v.binding?.runId===runId)??null;
}
export function assertStorageAdmission(admission:StorageAdmission,runId:string){
 const entry=owned(admission.claim,admission.base);ensure(entry.binding?.runId===runId,'STORAGE_ADMISSION_BINDING');return entry.binding;
}
export function beginStorageInitialization(claim:StorageClaim,runId:string,base=storageBase()){
 inspectStorageAdmission(base);
 const binding=assertStorageAdmission({claim,base},runId);
 try{writeExclusive(pathFor(base,claim.slot,'initialization'),binding);}catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')throw Error('STORAGE_INITIALIZATION_UNCERTAIN');throw error;}
}
