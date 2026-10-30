import {openSync,writeFileSync,fsyncSync,closeSync,renameSync,unlinkSync,mkdirSync,fstatSync,lstatSync,readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {join,resolve} from 'node:path';
/** Trusted server configuration only. HTTP clients cannot choose a storage path. */
export function privateStoreDirectory(kind:'accepted-private'|'social-sessions',override?:string){return override??join(process.env.SOCIAL_STORAGE_ROOT?resolve(process.env.SOCIAL_STORAGE_ROOT):join(process.cwd(),'data/derived/agents'),kind);}
/** Admission probe only: never touches existing records or dispatches inference. */
export async function verifyPrivateStore(directory:string){
 mkdirSync(directory,{recursive:true,mode:0o700});
 const marker='impactlens-storage-probe:'+randomUUID(),path=join(directory,'.storage-check-'+randomUUID()+'.probe');
 const fd=openSync(path,'wx',0o600),identity=fstatSync(fd);
 try{
  try{writeFileSync(fd,marker);fsyncSync(fd);}finally{closeSync(fd);}
  await replacePrivateCheckpoint(path,marker+':replacement');
  if(readFileSync(path,'utf8')!==marker+':replacement')throw Error('STORAGE_PROBE_READBACK');
 }finally{
  const current=lstatSync(path);
  // An atomic replacement has a new file identity. Its unguessable marker proves ownership.
  if(!current.isFile()||!(current.dev===identity.dev&&current.ino===identity.ino||readFileSync(path,'utf8')===marker+':replacement'))throw Error('STORAGE_PROBE_OWNERSHIP');
  unlinkSync(path);
 }
}
/** Retry the atomic filesystem replacement only. Never repeats a reducer or provider call. */
export async function replacePrivateCheckpoint(path:string,content:string,replace:typeof renameSync=renameSync){
 const pending=path+'.'+randomUUID()+'.pending',fd=openSync(pending,'wx');
 try{
  try{writeFileSync(fd,content);fsyncSync(fd);}finally{closeSync(fd);}
  for(let attempt=0;;attempt++){try{replace(pending,path);return;}catch(error){const code=(error as NodeJS.ErrnoException).code;if(!['EPERM','EBUSY','EACCES'].includes(code??'')||attempt>=4)throw error;await new Promise(resolve=>setTimeout(resolve,20*2**attempt));}}
 }finally{try{unlinkSync(pending);}catch{/* Successful rename has already removed it. */}}
}
