import '../../../scripts/testing/offline-network.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AiError} from '../../server/ai/errors.ts';
import {handlePublicExplore} from '../../server/society/public-service.ts';
import {PublicScenarioSession} from '../../question-simulation/public-session.ts';
import {createQuestionSimulation} from '../../question-simulation/client.ts';

const input={version:1 as const,question:'What if a polyclinic is added here?',geometry:{version:1 as const,scenarioId:'cooldown-map',features:[]},geometryRevision:1};
const hybrid={version:1 as const,policy:'hybrid-citizen-explore-v1' as const,serviceDate:'2026-10-27',anchors:{},timings:{runSeconds:120,dwellSeconds:30,waitingTimeSeconds:150,transferWalkSeconds:120,geometryConfirmed:true,assumptionsConfirmed:true}};

async function failedHybrid(error:Error){
 const directory=mkdtempSync(join(tmpdir(),'hybrid-provider-cooldown-'));
 let catalogCalls=0,providerCalls=0;
 const response=await handlePublicExplore(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:2,attemptId:'hybrid-limit-'+crypto.randomUUID(),request:input,hybrid})}),
  {enabled:true,key:'offline-only',fetcher:async()=>{providerCalls++;throw Error('Unexpected provider request.');}},
  {storeDirectory:join(directory,'accepted'),directory:join(directory,'sessions'),hybrid:{key:'offline-only',catalog:()=>{catalogCalls++;throw error;}}});
 assert.equal(catalogCalls,1,'Exercise the real hybrid preparation catch.');
 assert.equal(providerCalls,0,'A preparation failure cannot make a provider request or retry.');
 return response;
}

test('hybrid provider rate limit retains HTTP 429 and bounded retry guidance',async()=>{
 const response=await failedHybrid(new AiError('The provider rate limit was reached.','AI_RATE_LIMIT',429,undefined,45));
 assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'45');
 const body=await response.json();
 assert.equal(body.code,'AI_RATE_LIMIT');assert.equal(body.message,'The provider rate limit was reached.');assert.equal(body.retryAfterSeconds,45);
 assert.equal(body.kind,undefined,'Hybrid preparation cannot invent a dynamic planning failure or its accounting.');
});

test('hybrid rate limits without a valid wait omit retry metadata',async()=>{
 const response=await failedHybrid(new AiError('The provider rate limit was reached.','AI_RATE_LIMIT',429,undefined,Infinity));
 assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),null);
 assert.equal((await response.json()).retryAfterSeconds,undefined);
});

test('other hybrid failures retain HTTP 409 and never forward arbitrary error prose',async()=>{
 for(const error of [new AiError('PRIVATE_UPSTREAM_SENTINEL','AI_UPSTREAM',502),Object.assign(Error('PRIVATE_UPSTREAM_SENTINEL'),{code:'AI_RATE_LIMIT',status:429,retryAfterSeconds:45})]){
  const response=await failedHybrid(error);assert.equal(response.status,409);assert.equal(response.headers.get('Retry-After'),null);
  assert.doesNotMatch(JSON.stringify(await response.json()),/PRIVATE_UPSTREAM_SENTINEL/);
 }
});

test('the public browser session explains a hybrid 429 using fixed safe text and bounded seconds',async()=>{
 for(const retryAfterSeconds of [45,undefined,0,-1,1.5,86401,Infinity,'45']){
  const session=new PublicScenarioSession();let calls=0;
  await assert.rejects(session.execute(input,'hybrid-limit',async()=>{calls++;return Response.json({error:'HYBRID_EXPLORE_STOPPED',code:'AI_RATE_LIMIT',message:'UNTRUSTED_SERVER_PROSE',retryAfterSeconds},{status:429});},1000,hybrid),error=>{
   assert.ok(error instanceof Error);assert.equal(error.name,'ScenarioRateLimitError');
   assert.match(error.message,/provider.*rate limit/i);assert.match(error.message,/no automatic retry/i);assert.doesNotMatch(error.message,/UNTRUSTED_SERVER_PROSE/);
   if(retryAfterSeconds===45)assert.match(error.message,/45 seconds/);else assert.doesNotMatch(error.message,/seconds/);
   return true;
  });
  assert.equal(calls,1);
 }
});

test('a stale hybrid 429 is ignored after the browser request was cancelled',async()=>{
 const session=new PublicScenarioSession();let release!:(response:Response)=>void,dispatched!:()=>void;
 const sent=new Promise<void>(resolve=>{dispatched=resolve;});
 const work=session.execute(input,'stale-hybrid',async()=>{dispatched();return new Promise<Response>(resolve=>{release=resolve;});},1000,hybrid);
 await sent;session.cancel();release(Response.json({code:'AI_RATE_LIMIT',message:'UNTRUSTED_SERVER_PROSE',retryAfterSeconds:45},{status:429}));
 assert.equal(await work,null);
});

test('the workspace controller retains safe provider retry guidance rather than replacing it with a generic failure',async()=>{
 let calls=0;const controller=createQuestionSimulation({execution:'dynamic',publicOnly:true,fetcher:async()=>{calls++;return Response.json({code:'AI_RATE_LIMIT',message:'UNTRUSTED_SERVER_PROSE',retryAfterSeconds:45},{status:429});}});
 try{
  const {question,geometry,geometryRevision}=input;controller.invalidate({question,geometry,geometryRevision,hybrid});await controller.start('dynamic');
  const state=controller.getSnapshot();assert.equal(state.phase,'error');assert.equal(state.assumptionReview,null);assert.equal(state.publicRun,null);
  assert.match(state.error??'',/45 seconds/);assert.doesNotMatch(state.error??'',/UNTRUSTED_SERVER_PROSE|could not be prepared or executed/);assert.equal(calls,1);
 }finally{controller.dispose();}
});
