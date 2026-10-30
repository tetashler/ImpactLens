import test from 'node:test';
import assert from 'node:assert/strict';
import {handleDynamicRequest} from '../../server/inference/dynamic-service.ts';
import {createDynamicPlanner} from '../../server/inference/planner.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {createGroundingBundle} from '../../grounding/contract.ts';
import {MODEL} from '../../server/inference/deepseek.ts';
import {DynamicSession} from '../../dynamic-scenarios/client.ts';
import {createDeepseekTransport} from '../../server/inference/deepseek.ts';

test('the expanded planner alone accepts a bounded longer deadline while actions retain their thirty-second cap',()=>{
 assert.doesNotThrow(()=>createDynamicPlanner({key:'mock',timeoutMs:45000}));
 assert.throws(()=>createDynamicPlanner({key:'mock',timeoutMs:45001}));
 assert.throws(()=>createDeepseekTransport({key:'mock',timeoutMs:30001}));
});
import {validateDynamicResponse} from '../../dynamic-scenarios/response.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';

const nativeSetTimeout=setTimeout,nativeClearTimeout=clearTimeout;
async function within<T>(pending:Promise<T>):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([pending,new Promise<never>((_,reject)=>{timer=nativeSetTimeout(()=>reject(Error('The bounded request did not settle.')),2000);})]);}
 finally{nativeClearTimeout(timer);}
}
function request(signal?:AbortSignal){return new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({version:1,attemptId:`planning-timeout-${crypto.randomUUID()}`,request:worldFixtures()[0].request})});}
function stalled(){
 let start!:()=>void,signal:AbortSignal|undefined;const ready=new Promise<void>(resolve=>start=resolve);
 const fetcher:typeof fetch=async(_url,init)=>{signal=init?.signal??undefined;start();return new Promise<Response>(()=>{});};
 return {ready,fetcher,get signal(){return signal;}};
}
const configured={enabled:true,key:'mock-only',groundingKey:''};
const completion=(content:string)=>Response.json({model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content}}],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20,cost:0.001}});

test('the overall deadline during retrieval reports timeout rather than user cancellation',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const held=stalled();let inferenceCalls=0;
 const pending=handleDynamicRequest(request(),{...configured,groundingKey:'mock-only',groundingFetcher:held.fetcher,fetcher:async()=>{inferenceCalls++;throw Error('No inference after overall expiry');}});
 await held.ready;t.mock.timers.tick(120000);
 const response=await within(pending),body=await response.json();
 assert.equal(response.status,504);assert.equal(body.error.code,'AI_TIMEOUT');
 assert.equal(body.error.diagnostic.stage,'retrieval');assert.equal(body.error.diagnostic.reason,'deadline');
 assert.equal(held.signal?.aborted,true);assert.equal(body.accounting.totalCalls,0);assert.equal(inferenceCalls,0);
});

test('the planner deadline stops an uncooperative fetch once and exposes only bounded diagnostics',async()=>{
 const held=stalled(),response=await within(handleDynamicRequest(request(),{...configured,fetcher:held.fetcher,plannerTimeoutMs:5}));
 const body=await response.json();assert.equal(response.status,504);assert.equal(body.error.code,'AI_TIMEOUT');
 assert.equal(body.error.diagnostic.stage,'planning');assert.equal(body.error.diagnostic.reason,'deadline');
 assert.equal(held.signal?.aborted,true);assert.equal(body.accounting.totalCalls,1);
 assert.deepEqual(Object.keys(body.error.diagnostic).sort(),['elapsedMs','reason','stage']);
 assert.ok(Number.isSafeInteger(body.error.diagnostic.elapsedMs)&&body.error.diagnostic.elapsedMs>=0&&body.error.diagnostic.elapsedMs<=120000);
 assert.equal(body.planning.record.termination.httpStatus,null);
});

test('an overall deadline during planning is distinct from an explicit caller cancellation',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const held=stalled();
 const pendingTimeout=handleDynamicRequest(request(),{...configured,fetcher:held.fetcher,totalTimeoutMs:5,plannerTimeoutMs:100});await held.ready;t.mock.timers.tick(5);
 const response=await within(pendingTimeout);
 const body=await response.json();assert.equal(response.status,504);assert.equal(body.error.code,'AI_TIMEOUT');assert.equal(body.error.diagnostic.reason,'deadline');
 assert.equal(body.error.diagnostic.stage,'planning');assert.equal(body.accounting.totalCalls,1);
 const cancel=new AbortController(),heldAgain=stalled();const pending=handleDynamicRequest(request(cancel.signal),{...configured,fetcher:heldAgain.fetcher});await heldAgain.ready;cancel.abort();
 const cancelled=await within(pending),cancelledBody=await cancelled.json();assert.equal(cancelled.status,499);assert.equal(cancelledBody.error.code,'AI_CANCELLED');
 assert.equal(cancelledBody.error.diagnostic.reason,'cancelled');assert.equal(cancelledBody.error.diagnostic.stage,'planning');
});

test('provider HTTP timeouts are distinguishable from local deadlines without leaking provider bodies',async()=>{
 for(const status of [408,504]){
  let calls=0;const response=await handleDynamicRequest(request(),{...configured,fetcher:async()=>{calls++;return new Response('private-provider-body mock-only',{status});}}),body=await response.json();
  assert.equal(body.error.code,'AI_UPSTREAM');assert.equal(body.error.diagnostic.reason,'upstream-timeout');assert.equal(body.error.diagnostic.stage,'planning');
  assert.equal(body.planning.record.termination.httpStatus,status);assert.equal(calls,1);assert.ok(!JSON.stringify(body).includes('private-provider-body'));assert.ok(!JSON.stringify(body).includes('mock-only'));
 }
});

test('invalid planner JSON and invalid schema are classified as output failures rather than timeouts',async()=>{
 for(const content of ['private-invalid-json',JSON.stringify({...worldFixtures()[0].draft,extra:'private-invalid-field'})]){
  const response=await handleDynamicRequest(request(),{...configured,fetcher:async()=>completion(content)}),body=await response.json();
  assert.equal(body.error.code,'AI_PLAN_INVALID');assert.equal(body.error.diagnostic.reason,'invalid-output');assert.equal(body.error.diagnostic.stage,'planning');
  assert.equal(body.accounting.totalCalls,1);assert.ok(!JSON.stringify(body).includes('private-invalid'));
 }
});

test('optional retrieval expiry continues to the planner without retrying retrieval or inference',async()=>{
 let searches=0,calls=0;const response=await within(handleDynamicRequest(request(),{...configured,groundingKey:'mock-only',groundingTimeoutMs:5,groundingFetcher:async()=>{searches++;return new Promise<Response>(()=>{});},fetcher:async()=>{calls++;return new Response('',{status:503});}}));
 const body=await response.json();assert.equal(searches,1);assert.equal(calls,1);assert.equal(body.error.diagnostic.stage,'planning');assert.equal(body.error.diagnostic.reason,'upstream-error');
});

test('timeout overrides cannot expand production budgets or dispatch invalid configuration',async()=>{
 let calls=0;for(const overrides of [{totalTimeoutMs:0},{totalTimeoutMs:120001},{totalTimeoutMs:1.5},{plannerTimeoutMs:45001},{plannerTimeoutMs:NaN},{groundingTimeoutMs:10001}]){
  const response=await handleDynamicRequest(request(),{...configured,...overrides,fetcher:async()=>{calls++;throw Error('Invalid configuration must not dispatch');}}),body=await response.json();
  assert.equal(response.status,503);assert.equal(body.error.code,'AI_CONFIG');
 }
 assert.equal(calls,0);
});

test('planner input keeps exact source and passage references without duplicate grounding metadata',async()=>{
 const at='2026-10-29T00:00:00.000Z',grounding=createGroundingBundle({status:'retrieved',query:'Repeated user question',retrievedAt:at,sources:[{id:'source-a',title:'An institutional excerpt',url:'https://www.moh.gov.sg/',publisher:'www.moh.gov.sg',publishedAt:null,retrievedAt:at,passages:[{id:'passage-a',text:'Literal source wording for an optional quoted support link.'}]}],limitations:['Unverified source excerpts.'],usage:{searches:1,credits:1}});
 let prompt:any;const f=worldFixtures()[0],planner=createDynamicPlanner({key:'mock-only',fetcher:async(_url,init)=>{prompt=JSON.parse(JSON.parse(String(init?.body)).messages[1].content);return completion(JSON.stringify(f.draft));}},grounding);
 await planner.generate(f.request);const candidate=prompt.retrievalCandidates;
 assert.equal(candidate.sources[0].id,'source-a');assert.deepEqual(candidate.sources[0].passages,[{id:'passage-a',text:'Literal source wording for an optional quoted support link.'}]);
 for(const key of ['bundleId','query','retrievedAt','limitations','usage'])assert.equal(Object.hasOwn(candidate,key),false);
 assert.equal(Object.hasOwn(candidate.sources[0],'retrievedAt'),false);
});

test('the browser deadline and malformed server JSON remain separate from a server timeout envelope',async()=>{
 const session=new DynamicSession();await assert.rejects(within(session.execute(worldFixtures()[0].request,'timeout',async()=>new Promise<Response>(()=>{}),5)),/request timed out/i);
 await assert.rejects(session.execute(worldFixtures()[0].request,'bad-json',async()=>new Response('invalid JSON')),/invalid response/i);
});

test('overall expiry during actions keeps the accepted plan and earlier turn inspectable',async()=>{
 let actions=0;let secondStarted!:()=>void;const ready=new Promise<void>(resolve=>secondStarted=resolve);
 const provider=mockDynamicProvider(worldFixtures()[0]),r=request(),wire=await r.clone().json();
 const pending=handleDynamicRequest(r,{...configured,totalTimeoutMs:1000,fetcher:async(url,init)=>{
  const body=JSON.parse(String(init?.body));if(!body.response_format.json_schema.name.startsWith('dynamic_')&&++actions===2){secondStarted();return new Promise<Response>(()=>{});}
  return provider.fetcher(url,init);
 }});
 await within(ready).catch(error=>{throw Error(`Second action never started (actions=${actions}): ${error.message}`);});
 const response=await within(pending).catch(error=>{throw Error(`Deadline did not finish actions=${actions}: ${error.message}`);}),body=await validateDynamicResponse(await response.json(),wire);
 assert.equal(response.status,200);assert.equal(body.kind,'dynamic-execution');if(body.kind!=='dynamic-execution')assert.fail('Accepted turns must retain execution identity');
 assert.equal(body.planning.record.status,'accepted');assert.equal(body.run.status,'cancelled');assert.equal(body.run.events.length,1);assert.equal(body.run.error?.code,'CANCELLED');assert.equal(body.accounting.totalCalls,4);
});
