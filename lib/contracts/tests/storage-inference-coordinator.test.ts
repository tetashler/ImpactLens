import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {handlePublicExplore,handlePublicSocial} from '../../server/society/public-service.ts';
import {storageBundle} from '../../server/society/storage-admission.ts';
import {stopCoordinators} from '../../server/society/coordinator.ts';
import {deepSwarmPolicy} from '../../society/swarm.ts';
import {INFERENCE_ADMISSION_V1,type InferenceAdmissionV1} from '../../server/inference/admission.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';
import {phase4eFetcher} from '../../../scripts/testing/phase4e-fixture.ts';

test('ordinary storage-admitted Explore managed 50/35 job prepares and dispatches through the default fetch wrapper',async()=>{
 const output=resolve('tmp/storage-handoff-repair-20261102/fixtures');mkdirSync(output,{recursive:true});const base=mkdtempSync(join(output,'coordinator-'));
 const fixture=worldFixtures()[0],planner=mockDynamicProvider(fixture),social=phase4eFetcher();
 const oldFetch=globalThis.fetch,oldHook=Object.getOwnPropertyDescriptor(globalThis,INFERENCE_ADMISSION_V1),permits=new Set<string>(),contextIds:string[]=[];let prepared=0,native=0;
 const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
 const hook:InferenceAdmissionV1={version:1,schema:'social_decision_v1',timeoutMs:60000,deadlineMs:Date.now()+90000,prepare:async(info,signal)=>{
  signal.throwIfAborted();assert.equal(info.requestBodySha256,digest(info.requestBody));assert.ok(!permits.has(info.requestBodySha256));permits.add(info.requestBodySha256);contextIds.push(JSON.parse(JSON.parse(info.requestBody).messages[1].content).id);prepared++;
  return {version:1,cancelBeforeDispatch(){permits.delete(info.requestBodySha256);}};
 }};
 globalThis.fetch=async(url,init)=>{assert.ok(permits.delete(digest(String(init?.body))),'managed job must prepare its exact request before native dispatch');native++;return social.fetcher(url,init);};
 Object.defineProperty(globalThis,INFERENCE_ADMISSION_V1,{value:hook,configurable:true});
 const deps={storageBase:base,swarm:deepSwarmPolicy(50),admission:{maxCalls:2,reservedTokens:200000,costUsd:.2,deadlineMs:Date.now()+60000},enabled:true,key:'offline-synthetic'};
 try{
  const response=await handlePublicExplore(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:'storage-managed-'+randomUUID(),request:fixture.request})}),{enabled:true,key:'offline-synthetic',groundingKey:'',fetcher:planner.fetcher},deps);
  assert.equal(response.status,200,await response.clone().text());const initial=await response.json();assert.equal(initial.storage.disposition,'active');assert.equal(initial.job.status,'running');
  const query='runId='+encodeURIComponent(initial.runId)+'&token='+initial.session.token;let job=initial.job;const end=Date.now()+20000;
  while(job.status==='running'&&Date.now()<end){job=(await(await handlePublicSocial(new Request('http://localhost/api/social-simulate?operation=status&'+query),deps)).json()).job;if(job.status==='running')await new Promise(done=>setTimeout(done,10));}
  assert.equal(job.status,'budget-limited');assert.equal(job.acceptedDecisions,2);assert.equal(prepared,2);assert.equal(native,2);assert.equal(social.calls.length,2);assert.equal(new Set(contextIds).size,2);assert.equal(permits.size,0);
  const restored=await(await handlePublicSocial(new Request('http://localhost/api/social-simulate?'+query),deps)).json();assert.equal(restored.society.swarm.activeAgents,50);assert.equal(restored.society.swarm.llmCapableAgents,35);assert.equal(native,2);assert.doesNotMatch(JSON.stringify(restored),/RAW_PHASE4E_|RAW_MEMORY/);
 }finally{await stopCoordinators(storageBundle(base).jobs);globalThis.fetch=oldFetch;if(oldHook)Object.defineProperty(globalThis,INFERENCE_ADMISSION_V1,oldHook);else Reflect.deleteProperty(globalThis,INFERENCE_ADMISSION_V1);}
});
