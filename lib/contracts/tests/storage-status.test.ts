import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,mkdtempSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';

const ready={version:1,policy:'storage-admission-v1',status:'ready',reason:null,capacity:32,used:3,available:29,archivedPeriods:0,archiveLimit:16};
async function contract(){const m=await import('../../society/storage-status.ts').catch(()=>null);assert.ok(m?.parseStorageCapacityStatus,'a strict browser-safe capacity parser is required');return m;}
async function endpoint(){const m=await import('../../server/society/storage-status.ts').catch(()=>null);assert.ok(m?.handleStorageStatus,'a passive storage status handler is required');return m;}

test('capacity DTO rejects private fields, unknown reasons and contradictory known counts',async()=>{
 const {parseStorageCapacityStatus:parse}=await contract();assert.deepEqual(parse(ready),ready);
 for(const change of [{path:'PRIVATE_PATH'},{claims:[]},{token:'PRIVATE_TOKEN'},{reason:'PRIVATE_REASON'},{used:4},{available:30},{used:-1},{archivedPeriods:17},{capacity:64},{status:'full'},{files:385}])assert.throws(()=>parse({...ready,...change}));
 const blocked={...ready,status:'blocked',reason:'unavailable',used:null,available:null,archivedPeriods:null};assert.deepEqual(parse(blocked),blocked);
 assert.deepEqual(parse({...ready,status:'full',reason:'capacity',used:32,available:0}),{...ready,status:'full',reason:'capacity',used:32,available:0});
});

test('status rejects path selectors and cross-origin requests before inspecting storage',async()=>{
 const {handleStorageStatus}=await endpoint();let reads=0;const read=()=>{reads++;return ready;};
 for(const request of [new Request('http://localhost/api/storage/status?root=PRIVATE_PATH'),new Request('http://localhost/api/storage/status',{headers:{Origin:'https://other.example'}}),new Request('http://localhost/api/storage/status',{method:'POST',body:'PRIVATE_PATH'})]){
  const response=handleStorageStatus(request,{read});assert.ok(response.status>=400);assert.doesNotMatch(await response.text(),/PRIVATE_PATH/);
 }
 assert.equal(reads,0);
 const accepted=handleStorageStatus(new Request('http://localhost/api/storage/status',{headers:{Origin:'http://localhost'}}),{read});assert.equal(accepted.status,200);assert.equal(accepted.headers.get('Cache-Control'),'no-store');assert.equal(accepted.headers.get('X-Content-Type-Options'),'nosniff');assert.deepEqual(await accepted.json(),ready);assert.equal(reads,1);
});

test('status failure returns finite unknown capacity without exposing internal errors',async()=>{
 const {handleStorageStatus}=await endpoint();const response=handleStorageStatus(new Request('http://localhost/api/storage/status'),{read:()=>{throw Error('PRIVATE_PATH SECRET_TOKEN');}});
 assert.equal(response.status,200);const body=await response.json();assert.equal(body.status,'blocked');assert.equal(body.reason,'unavailable');assert.equal(body.used,null);assert.equal(body.available,null);assert.doesNotMatch(JSON.stringify(body),/PRIVATE_PATH|SECRET_TOKEN/);
});

test('passive capacity inspection does not create the missing active namespace',async()=>{
 const {handleStorageStatus}=await endpoint();const root=resolve('tmp/storage-status-tests');mkdirSync(root,{recursive:true});const base=mkdtempSync(join(root,'passive-'));const before=readdirSync(base);
 const response=handleStorageStatus(new Request('http://localhost/api/storage/status'),{base});assert.equal(response.status,200);const body=await response.json();assert.equal(body.used,0);assert.equal(body.available,32);assert.deepEqual(readdirSync(base),before);assert.equal(existsSync(join(base,'session-store-v2')),false);
});

test('browser status loading bounds untrusted bytes and honours cancellation without retry',async()=>{
 const {readStorageCapacityStatus}=await contract();let reads=0;
 const fetcher:typeof fetch=async(url,init)=>{reads++;assert.equal(url,'/api/storage/status');assert.equal(init?.method,'GET');assert.equal(init?.cache,'no-store');return Response.json(ready);};
 assert.deepEqual(await readStorageCapacityStatus(fetcher),ready);assert.equal(reads,1);
 await assert.rejects(()=>readStorageCapacityStatus(async()=>Response.json({...ready,path:'PRIVATE_PATH'})));
 await assert.rejects(()=>readStorageCapacityStatus(async()=>new Response(' '.repeat(8193))),/STORAGE_STATUS_INVALID/);
 const abort=new AbortController();abort.abort();await assert.rejects(()=>readStorageCapacityStatus(fetcher,abort.signal),{name:'AbortError'});assert.equal(reads,2);
});
