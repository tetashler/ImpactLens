/** Process-local serialisation plus an exclusive filesystem lease for cold load/append. */
import {openSync,writeFileSync,fsyncSync,closeSync,readFileSync,unlinkSync,fstatSync,lstatSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {ensure} from '../../experiments/validation.ts';

const state=globalThis as typeof globalThis&{__socialOwners?:Map<string,Promise<unknown>>};
const owners=state.__socialOwners??=new Map<string,Promise<unknown>>();
function acquire(root:string,key:string){
 const path=join(root,'.owner-'+createHash('sha256').update(key).digest('hex')+'.lock');
 const nonce=randomUUID(),value=JSON.stringify({version:1,pid:process.pid,nonce});
 for(let attempt=0;attempt<2;attempt++){
  try{const fd=openSync(path,'wx',0o600),identity=fstatSync(fd);let failure:unknown;
   try{writeFileSync(fd,value);fsyncSync(fd);}catch(error){failure=error;}finally{closeSync(fd);}
   if(failure){const current=lstatSync(path);if(current.dev===identity.dev&&current.ino===identity.ino)unlinkSync(path);throw failure;}
   return ()=>{if(readFileSync(path,'utf8')===value)unlinkSync(path);};}
  catch(e){
   if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;
   const previous=readFileSync(path,'utf8');let owner:{pid:number};try{owner=JSON.parse(previous);}catch{throw Error('SOCIAL_BUSY');}
   ensure(Number.isSafeInteger(owner.pid)&&owner.pid>0,'SOCIAL_BUSY');
   let dead=false;try{process.kill(owner.pid,0);}catch(error){dead=(error as NodeJS.ErrnoException).code==='ESRCH';}
   ensure(dead&&readFileSync(path,'utf8')===previous,'SOCIAL_BUSY');
   // Reclaim only a verified dead process. An active or unverifiable lease is fail-closed.
   unlinkSync(path);
  }
 }
 throw Error('SOCIAL_BUSY');
}
export async function withSocialOwner<T>(root:string,key:string,work:()=>Promise<T>):Promise<T>{
 const identity=root+'/'+key,prior=owners.get(identity);
 let releaseQueue!:()=>void;const queued=new Promise<void>(resolve=>{releaseQueue=resolve;});
 const gate=(prior??Promise.resolve()).catch(()=>{}).then(()=>queued);owners.set(identity,gate);
 await prior?.catch(()=>{});
 let release:(()=>void)|undefined;
 try{release=acquire(root,key);return await work();}
 finally{try{release?.();}finally{releaseQueue();if(owners.get(identity)===gate)owners.delete(identity);}}
}
