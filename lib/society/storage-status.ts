/** Public aggregate capacity only. Local paths, claims and run capabilities stay server-side. */
import {ensure,object,freezeSnapshot} from '../experiments/validation.ts';

export interface StorageCapacityStatus {
 version:1;policy:'storage-admission-v1';status:'ready'|'full'|'blocked';
 reason:null|'capacity'|'maintenance'|'storage-limit'|'history-limit'|'unavailable';
 capacity:32;used:number|null;available:number|null;archivedPeriods:number|null;archiveLimit:16;
}
export function unavailableStorageCapacity():StorageCapacityStatus {
 return {version:1,policy:'storage-admission-v1',status:'blocked',reason:'unavailable',capacity:32,used:null,available:null,archivedPeriods:null,archiveLimit:16};
}
export function parseStorageCapacityStatus(value:unknown):Readonly<StorageCapacityStatus> {
 const v=object(value,['version','policy','status','reason','capacity','used','available','archivedPeriods','archiveLimit']);
 ensure(v.version===1&&v.policy==='storage-admission-v1'&&v.capacity===32&&v.archiveLimit===16,'STORAGE_STATUS_INVALID');
 ensure(['ready','full','blocked'].includes(v.status as string),'STORAGE_STATUS_INVALID');
 ensure(v.reason===null||['capacity','maintenance','storage-limit','history-limit','unavailable'].includes(v.reason as string),'STORAGE_STATUS_INVALID');
 const count=(n:unknown,max:number)=>Number.isSafeInteger(n)&&(n as number)>=0&&(n as number)<=max;
 ensure(v.used===null&&v.available===null||count(v.used,32)&&count(v.available,32)&&(v.used as number)+(v.available as number)===32,'STORAGE_STATUS_INVALID');
 ensure(v.archivedPeriods===null||count(v.archivedPeriods,16),'STORAGE_STATUS_INVALID');
 if(v.status==='ready')ensure(v.reason===null&&count(v.used,31)&&count(v.available,32)&&(v.available as number)>0&&v.archivedPeriods!==null,'STORAGE_STATUS_INVALID');
 if(v.status==='full')ensure(v.reason==='capacity'&&v.used===32&&v.available===0&&v.archivedPeriods!==null,'STORAGE_STATUS_INVALID');
 if(v.status==='blocked')ensure(v.reason!==null&&v.reason!=='capacity','STORAGE_STATUS_INVALID');
 return freezeSnapshot(v) as unknown as Readonly<StorageCapacityStatus>;
}

/** Bounded passive request. A caller owns cancellation and decides when to refresh. */
export async function readStorageCapacityStatus(fetcher:typeof fetch=fetch,signal?:AbortSignal):Promise<Readonly<StorageCapacityStatus>> {
 const response=await fetcher('/api/storage/status',{method:'GET',cache:'no-store',signal});
 ensure(response.ok,'STORAGE_STATUS_UNAVAILABLE');const reader=response.body?.getReader();ensure(reader,'STORAGE_STATUS_UNAVAILABLE');
 const cancel=()=>void reader.cancel().catch(()=>{}),chunks:Uint8Array[]=[];let size=0;
 signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 try{for(;;){signal?.throwIfAborted();const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>8192){cancel();throw Error('STORAGE_STATUS_INVALID');}chunks.push(part.value);}}
 finally{signal?.removeEventListener('abort',cancel);reader.releaseLock();}
 signal?.throwIfAborted();const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
 return parseStorageCapacityStatus(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
}
