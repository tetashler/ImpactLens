import {openSync,writeFileSync,fsyncSync,closeSync,renameSync,unlinkSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {join,resolve} from 'node:path';
/** Trusted server configuration only. HTTP clients cannot choose a storage path. */
export function privateStoreDirectory(kind:'accepted-private'|'social-sessions',override?:string){return override??join(process.env.SOCIAL_STORAGE_ROOT?resolve(process.env.SOCIAL_STORAGE_ROOT):join(process.cwd(),'data/derived/agents'),kind);}
/** Retry the atomic filesystem replacement only. Never repeats a reducer or provider call. */
export async function replacePrivateCheckpoint(path:string,content:string,replace:typeof renameSync=renameSync){
 const pending=path+'.'+randomUUID()+'.pending',fd=openSync(pending,'wx');
 try{writeFileSync(fd,content);fsyncSync(fd);}finally{closeSync(fd);}
 try{for(let attempt=0;;attempt++){try{replace(pending,path);return;}catch(error){const code=(error as NodeJS.ErrnoException).code;if(!['EPERM','EBUSY','EACCES'].includes(code??'')||attempt>=4)throw error;await new Promise(resolve=>setTimeout(resolve,20*2**attempt));}}}
 finally{try{unlinkSync(pending);}catch{/* Successful rename has already removed it. */}}
}
