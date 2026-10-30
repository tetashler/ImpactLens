import {openSync,writeFileSync,fsyncSync,closeSync,renameSync,unlinkSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
/** Retry the atomic filesystem replacement only. Never repeats a reducer or provider call. */
export async function replacePrivateCheckpoint(path:string,content:string,replace:typeof renameSync=renameSync){
 const pending=path+'.'+randomUUID()+'.pending',fd=openSync(pending,'wx');
 try{writeFileSync(fd,content);fsyncSync(fd);}finally{closeSync(fd);}
 try{for(let attempt=0;;attempt++){try{replace(pending,path);return;}catch(error){const code=(error as NodeJS.ErrnoException).code;if(!['EPERM','EBUSY','EACCES'].includes(code??'')||attempt>=4)throw error;await new Promise(resolve=>setTimeout(resolve,20*2**attempt));}}}
 finally{try{unlinkSync(pending);}catch{/* Successful rename has already removed it. */}}
}
