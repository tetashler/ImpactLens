import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {handlePublicExplore,handlePublicSocial} from '../../server/society/public-service.ts';
import {INFERENCE_ADMISSION_V1,INFERENCE_NO_DISPATCH_V1,type InferenceAdmissionV1} from '../../server/inference/admission.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';
import {socialProviderFixture} from '../../../scripts/testing/social-decision-fixture.ts';
import {reserveStorageAdmission,bindStorageAdmission} from '../../server/society/storage-admission.ts';

const output=resolve('tmp/storage-handoff-repair-20261102/fixtures');mkdirSync(output,{recursive:true});
const post=(url:string,body:unknown)=>new Request('http://localhost/api/'+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');

test('sixteen retained v1 claims allow sixteen more attempts without rewriting previous evidence',()=>{
 const base=mkdtempSync(join(output,'extended-capacity-')),directory=join(base,'session-store-v2','admission');mkdirSync(directory,{recursive:true});
 const retained=new Map<string,string>();
 for(let slot=0;slot<16;slot++){
  const claim={version:1,policy:'storage-admission-v1',slot,nonce:randomUUID(),attemptHash:hash('retained-'+slot),requestHash:hash('retained-request-'+slot),sessionId:randomUUID()};
  const path=join(directory,'slot-'+String(slot).padStart(2,'0')+'.claim'),bytes=JSON.stringify(claim);writeFileSync(path,bytes);retained.set(path,bytes);
  if(slot<7){const bindingPath=path.replace(/\.claim$/,'.binding'),bindingBytes=JSON.stringify({version:1,policy:claim.policy,slot,nonce:claim.nonce,runId:'retained-run-'+slot,sessionId:claim.sessionId});writeFileSync(bindingPath,bindingBytes);retained.set(bindingPath,bindingBytes);}
 }
 assert.throws(()=>reserveStorageAdmission('retained-0',hash('different-request'),base),/STORAGE_ADMISSION_DUPLICATE/);
 for(let offset=0;offset<16;offset++){
  const attemptId='additional-'+offset,claim=reserveStorageAdmission(attemptId,hash(attemptId),base);assert.equal(claim.slot,16+offset);assert.equal(claim.policy,'storage-admission-v1');
  if(offset===0){bindStorageAdmission(claim,{runId:'additional-run',attemptId},base);assert.throws(()=>bindStorageAdmission(claim,{runId:'crossed-run',attemptId},base),/STORAGE_ADMISSION_BINDING/);}
 }
 assert.throws(()=>reserveStorageAdmission('additional-0',hash('different-request'),base),/STORAGE_ADMISSION_DUPLICATE/);
 assert.throws(()=>reserveStorageAdmission('overflow',hash('overflow'),base),/STORAGE_ADMISSION_CAPACITY/);
 assert.equal(readdirSync(directory).filter(name=>name.endsWith('.claim')).length,32);
 for(const [path,bytes]of retained)assert.equal(readFileSync(path,'utf8'),bytes);
});

test('thirty-two retained attempts stop Explore before provider dispatch',async()=>{
 const base=mkdtempSync(join(output,'full-capacity-'));for(let i=0;i<32;i++)reserveStorageAdmission('full-'+i,hash('full-'+i),base);
 let calls=0;const never:typeof fetch=async()=>{calls++;throw Error('NO_PROVIDER');};
 const response=await handlePublicExplore(post('scenario-simulate',{version:1,attemptId:'capacity-overflow',request:worldFixtures()[0].request}),{enabled:true,key:'offline-synthetic',fetcher:never,groundingFetcher:never},{storageBase:base,swarm:false,enabled:false});
 assert.equal(response.status,503);assert.equal((await response.json()).error,'PRIVATE_STORAGE_CAPACITY');assert.equal(calls,0);
 assert.equal(readdirSync(join(base,'session-store-v2','admission')).filter(name=>name.endsWith('.claim')).length,32);
});

async function exercise(mode:'explicit-hook'|'default-process-hook'|'unrelated-explicit',invalidate:false|'before'|'after'=false){
 const base=mkdtempSync(join(output,'ordinary-')),fixture=worldFixtures()[0],dynamic=mockDynamicProvider(fixture);
 const oldFetch=globalThis.fetch,oldHook=Object.getOwnPropertyDescriptor(globalThis,INFERENCE_ADMISSION_V1);
 let prepared=0,native=0,permit=false,cleanups=0;
 const hook:InferenceAdmissionV1={version:1,schema:'social_decision_v1',timeoutMs:60000,deadlineMs:Date.now()+120000,prepare:async(info,signal)=>{
  signal.throwIfAborted();assert.equal(info.method,'POST');assert.equal(JSON.parse(info.requestBody).response_format.json_schema.name,'social_decision_v1');prepared++;permit=true;
  if(invalidate==='after')writeFileSync(join(base,'session-store-v2','fixture.incomplete-owned.private'),'UNCERTAIN_OFFLINE_FIXTURE');
  return {version:1,cancelBeforeDispatch(){cleanups++;const notDispatched=permit;permit=false;if(notDispatched)return {[INFERENCE_NO_DISPATCH_V1]:true as const};}};
 }};
 const fetcher:typeof fetch=async(url,init)=>{
  const body=JSON.parse(String(init?.body));
  if(body.response_format.json_schema.name!=='social_decision_v1')return dynamic.fetcher(url,init);
  if(mode!=='unrelated-explicit')assert.equal(permit,true,'ordinary storage adapter must prepare before native social dispatch');
  permit=false;native++;const context=JSON.parse(body.messages[1].content);
  return Response.json({id:'synthetic-storage-social-'+native,model:body.model,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(socialProviderFixture(context))}}],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20,cost:0,completion_tokens_details:{reasoning_tokens:0}}});
 };
 if(mode==='explicit-hook')Object.defineProperty(fetcher,INFERENCE_ADMISSION_V1,{value:hook});
 if(mode!=='explicit-hook')Object.defineProperty(globalThis,INFERENCE_ADMISSION_V1,{value:hook,configurable:true});
 if(mode==='default-process-hook')globalThis.fetch=fetcher;
 const social={storageBase:base,swarm:false as const,enabled:true,key:'offline-synthetic',...(mode==='default-process-hook'?{}:{fetcher})};
 try{
  const response=await handlePublicExplore(post('scenario-simulate',{version:1,attemptId:'storage-hook-'+randomUUID(),request:fixture.request}),{enabled:true,key:'offline-synthetic',groundingKey:'',fetcher:dynamic.fetcher},social);
  assert.equal(response.status,200,await response.clone().text());let current=await response.json();assert.ok(current.session);assert.equal(current.storage.disposition,'active');
  if(invalidate==='before')writeFileSync(join(base,'session-store-v2','fixture.incomplete-owned.private'),'UNCERTAIN_OFFLINE_FIXTURE');
  for(let i=0;i<5&&native===0&&current.society.usage.failed===0;i++){
   const result=await handlePublicSocial(post('social-simulate',{operation:'continue',runId:current.runId,token:current.session.token,revision:current.session.revision}),social);
   if(invalidate==='before'){assert.equal(result.status,503);assert.equal((await result.json()).error,'PRIVATE_STORAGE_UNAVAILABLE');return {prepared,native,cleanups};}
   if(invalidate==='after'){
    // The storage wrapper must stop native dispatch after prepare and let the
    // original receipt reconcile the transport before an outer persistence error.
    assert.equal(prepared,1);assert.equal(native,0);assert.equal(cleanups,1);
    const {readSocialSession}=await import('../../server/society/service.ts');
    const {storageBundle}=await import('../../server/society/storage-admission.ts');
    const state=await readSocialSession(current.session.id,{directory:storageBundle(base).sessions});
    assert.equal(state.world.hybrid?.records[0].usage?.costUsd,0);
    assert.equal(state.world.hybrid?.records[0].usage?.inputTokens,0);
    return {prepared,native,cleanups};
   }
   assert.equal(result.status,200,await result.clone().text());current=await result.json();
  }
  assert.ok(native>0,'ordinary Explore continuation must reach synthetic social native dispatch');assert.ok(current.society.usage.accepted>0);assert.equal(current.society.usage.failed,0);
  assert.equal(prepared,mode==='unrelated-explicit'?0:native);
  const before=native;const restored=await handlePublicSocial(new Request('http://localhost/api/social-simulate?runId='+encodeURIComponent(current.runId)+'&token='+current.session.token),social);
  assert.equal(restored.status,200);assert.equal(native,before,'GET restoration must not redispatch');assert.doesNotMatch(await restored.text(),/RAW_SOCIAL_DECISION|RAW_MEMORY_EXCERPT/);
  return {prepared,native,cleanups};
 }finally{
  globalThis.fetch=oldFetch;if(oldHook)Object.defineProperty(globalThis,INFERENCE_ADMISSION_V1,oldHook);else Reflect.deleteProperty(globalThis,INFERENCE_ADMISSION_V1);
 }
}

test('ordinary Explore storage adapter forwards an explicit social admission capability',async()=>{const r=await exercise('explicit-hook');assert.equal(r.prepared,r.native);});
test('ordinary Explore storage adapter forwards a process capability only for default fetch',async()=>{const r=await exercise('default-process-hook');assert.equal(r.prepared,r.native);});
test('ordinary Explore unrelated explicit adapters remain isolated from the process capability',async()=>{const r=await exercise('unrelated-explicit');assert.equal(r.prepared,0);});
test('invalidated storage stops ordinary continuation before preparation or native dispatch',async()=>{assert.deepEqual(await exercise('explicit-hook','before'),{prepared:0,native:0,cleanups:0});});
test('storage invalidated after preparation blocks native dispatch and retains receipt cleanup',async()=>{assert.deepEqual(await exercise('explicit-hook','after'),{prepared:1,native:0,cleanups:1});});
