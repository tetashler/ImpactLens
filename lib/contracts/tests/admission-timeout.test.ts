import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSocialTransport} from '../../server/inference/social.ts';
import {createStructuredTransport,MODEL,type StructuredSpec} from '../../server/inference/deepseek.ts';
import {citizenV5Context,citizenV5Wire} from './helpers/citizen-v5.ts';

// Intentionally use the public, versioned capability key independently of its implementation.
const admissionKey=Symbol.for('impactlens.inference-admission-v1');
const noDispatchKey=Symbol.for('impactlens.inference-no-dispatch-v1');
type Info={url:string;method:'POST';requestBody:string;requestBodySha256:string};
type Receipt={version:1;cancelBeforeDispatch:()=>void};
type Hook={version:number;schema:string;timeoutMs:number;deadlineMs:number;prepare:(info:Info,signal:AbortSignal)=>Promise<void|Receipt>};
const start=1_000_000;
function deferred<T=void>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>resolve=done);return {promise,resolve};}
async function flush(){for(let i=0;i<40;i++)await Promise.resolve();}
function track<T>(promise:Promise<T>){
 const state:{status:'pending'|'accepted'|'failed';value?:T;error?:unknown}={status:'pending'};
 const settled=promise.then(value=>{state.status='accepted';state.value=value;},error=>{state.status='failed';state.error=error;});
 return {state,settled};
}
function failure(p:ReturnType<typeof track>,code:string){assert.equal(p.state.status,'failed');assert.equal((p.state.error as {code:string})?.code,code);}
const context=()=>({...citizenV5Context(),policy:'conversation-menu-v7'});
const envelope=(content:unknown)=>({id:'synthetic-admission-timeout',model:MODEL,provider:'DigitalOcean',usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150,cost:0,completion_tokens_details:{reasoning_tokens:0}},choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}]});
const completion=(c=context())=>Response.json(envelope(citizenV5Wire(c)));
function attach(fetcher:typeof fetch,hook:Partial<Hook>={}){
 Object.defineProperty(fetcher,admissionKey,{value:{version:1,schema:'social_decision_v1',timeoutMs:60_000,deadlineMs:start+120_000,prepare:async()=>{},...hook}});
 return fetcher;
}
const tinySpec:StructuredSpec<string,{ok:true}>={name:'social_decision_v1',system:'Synthetic test schema.',schema:()=>({type:'object',required:['ok'],properties:{ok:{const:true}},additionalProperties:false}),encode:c=>c,parse:value=>{assert.deepEqual(value,{ok:true});return {ok:true};},outputLimit:100,defaultOutput:100,contentBytes:100};

test('social admission can take forty seconds and still retain a complete provider response allowance',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});
 const prepared=deferred(),provider=deferred<Response>(),c=context();let prepares=0,calls=0,captured:Info|undefined,providerBody:string|undefined;
 const fetcher=attach(async(_url,init)=>{calls++;providerBody=String(init?.body);return provider.promise;},{prepare:async info=>{prepares++;captured=info;await prepared.promise;}});
 const transport=createSocialTransport({key:'PRIVATE_KEY',fetcher}),pending=track(transport.generate(c));
 await flush();assert.equal(prepares,1);assert.equal(calls,0);
 t.mock.timers.tick(40_000);await flush();assert.equal(pending.state.status,'pending');assert.equal(calls,0);
 prepared.resolve();await flush();assert.equal(calls,1);assert.equal(captured!.requestBody,providerBody);
 assert.equal(captured!.url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(captured!.method,'POST');
 assert.equal(captured!.requestBodySha256,createHash('sha256').update(providerBody!).digest('hex'));
 t.mock.timers.tick(29_999);provider.resolve(completion(c));await flush();await pending.settled;
 assert.equal(pending.state.status,'accepted');assert.equal(transport.records.length,1);assert.equal(transport.records[0].durationMs,69_999);
 assert.equal(prepares,1);assert.equal(calls,1);assert.equal(transport.records[0].servingProvider,'DigitalOcean');
});

test('the unchanged thirty-second provider timer starts only after successful local admission',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});
 const prepared=deferred();let calls=0,prepares=0,providerSignal:AbortSignal|undefined;
 const transport=createSocialTransport({key:'offline',fetcher:attach(async(_url,init)=>{calls++;providerSignal=init?.signal??undefined;return new Promise<Response>(()=>{});},{prepare:async()=>{prepares++;await prepared.promise;}})});
 const pending=track(transport.generate(context()));await flush();assert.equal(prepares,1);
 t.mock.timers.tick(40_000);await flush();assert.equal(calls,0);prepared.resolve();await flush();assert.equal(calls,1);
 t.mock.timers.tick(29_999);await flush();assert.equal(pending.state.status,'pending');
 t.mock.timers.tick(1);await flush();failure(pending,'AI_TIMEOUT');await pending.settled;
 assert.equal(providerSignal?.aborted,true);assert.equal(transport.records[0].durationMs,70_000);assert.equal(calls,1);
 assert.equal(transport.records[0].termination?.httpStatus,null);
 assert.equal(transport.records[0].costUsd,null);assert.equal(transport.records[0].inputTokens,null);
});

test('local admission timeout aborts prepare and never dispatches even when preparation resolves late',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});
 const prepared=deferred();let calls=0,prepares=0,localSignal:AbortSignal|undefined;
 const transport=createSocialTransport({key:'offline',fetcher:attach(async()=>{calls++;return completion();},{timeoutMs:20_000,prepare:async(_info,signal)=>{prepares++;localSignal=signal;await prepared.promise;}})});
 const pending=track(transport.generate(context()));await flush();assert.equal(prepares,1);
 t.mock.timers.tick(20_000);await flush();failure(pending,'AI_TIMEOUT');await pending.settled;assert.equal(localSignal?.aborted,true);assert.equal(calls,0);
 prepared.resolve();await flush();assert.equal(calls,0);assert.equal(transport.records.length,1);assert.equal(transport.records[0].durationMs,20_000);
 assert.equal(transport.records[0].costUsd,0);assert.equal(transport.records[0].inputTokens,0);assert.equal(transport.records[0].outputTokens,0);assert.equal(transport.records[0].totalTokens,0);
});

test('local body preparation is bounded before the admission hook can run',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});
 const body=deferred();let prepares=0,calls=0;
 const transport=createStructuredTransport({key:'offline',beforeDispatch:()=>body.promise,fetcher:attach(async()=>{calls++;return Response.json(envelope({ok:true}));},{timeoutMs:5000,prepare:async()=>{prepares++;}})},tinySpec);
 const pending=track(transport.generate('PRIVATE_CONTEXT'));await flush();t.mock.timers.tick(5000);await flush();failure(pending,'AI_TIMEOUT');await pending.settled;
 assert.equal(prepares,0);assert.equal(calls,0);body.resolve();await flush();assert.equal(prepares,0);assert.equal(calls,0);
});

test('caller cancellation during local admission prevents a late provider call',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});
 const caller=new AbortController(),prepared=deferred();let prepares=0,calls=0,localSignal:AbortSignal|undefined;
 const transport=createSocialTransport({key:'offline',fetcher:attach(async()=>{calls++;return completion();},{prepare:async(_info,signal)=>{prepares++;localSignal=signal;await prepared.promise;}})});
 const pending=track(transport.generate(context(),caller.signal));await flush();assert.equal(prepares,1);caller.abort();await flush();await pending.settled;
 failure(pending,'AI_CANCELLED');assert.equal(localSignal?.aborted,true);prepared.resolve();await flush();assert.equal(calls,0);assert.equal(transport.records.length,1);
});

test('caller cancellation during provider work aborts the provider and records one failure',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});
 const caller=new AbortController();let calls=0,prepares=0,providerSignal:AbortSignal|undefined;
 const transport=createSocialTransport({key:'offline',fetcher:attach(async(_url,init)=>{calls++;providerSignal=init?.signal??undefined;return new Promise<Response>(()=>{});},{prepare:async()=>{prepares++;}})});
 const pending=track(transport.generate(context(),caller.signal));await flush();assert.equal(prepares,1);assert.equal(calls,1);caller.abort();await flush();await pending.settled;
 failure(pending,'AI_CANCELLED');assert.equal(providerSignal?.aborted,true);assert.equal(transport.records.length,1);assert.equal(calls,1);
});

test('an already cancelled caller cannot encode, prepare or dispatch',async()=>{
 const caller=new AbortController();caller.abort();let encodes=0,prepares=0,calls=0;
 const transport=createStructuredTransport({key:'offline',fetcher:attach(async()=>{calls++;return completion();},{prepare:async()=>{prepares++;}})},{...tinySpec,encode:c=>{encodes++;return c;}});
 const pending=track(transport.generate('private',caller.signal));await pending.settled;failure(pending,'AI_CANCELLED');assert.equal(encodes,0);assert.equal(prepares,0);assert.equal(calls,0);
});

test('the absolute whole-operation deadline can end local preparation before its own budget',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});
 const prepared=deferred();let calls=0,prepares=0,localSignal:AbortSignal|undefined;
 const transport=createSocialTransport({key:'offline',fetcher:attach(async()=>{calls++;return completion();},{deadlineMs:start+25_000,prepare:async(_info,signal)=>{prepares++;localSignal=signal;await prepared.promise;}})});
 const pending=track(transport.generate(context()));await flush();assert.equal(prepares,1);t.mock.timers.tick(25_000);await flush();await pending.settled;
 failure(pending,'AI_TIMEOUT');assert.equal(localSignal?.aborted,true);prepared.resolve();await flush();assert.equal(calls,0);assert.equal(transport.records[0].durationMs,25_000);
});

test('the absolute deadline also caps provider work after local preparation completes',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});
 const prepared=deferred();let calls=0,prepares=0,providerSignal:AbortSignal|undefined;
 const transport=createSocialTransport({key:'offline',fetcher:attach(async(_url,init)=>{calls++;providerSignal=init?.signal??undefined;return new Promise<Response>(()=>{});},{deadlineMs:start+35_000,prepare:async()=>{prepares++;await prepared.promise;}})});
 const pending=track(transport.generate(context()));await flush();assert.equal(prepares,1);t.mock.timers.tick(20_000);prepared.resolve();await flush();assert.equal(calls,1);
 t.mock.timers.tick(14_999);await flush();assert.equal(pending.state.status,'pending');t.mock.timers.tick(1);await flush();await pending.settled;
 failure(pending,'AI_TIMEOUT');assert.equal(providerSignal?.aborted,true);assert.equal(transport.records[0].durationMs,35_000);assert.equal(calls,1);
});

test('an expired absolute deadline prevents context work and provider admission',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});let encodes=0,prepares=0,calls=0;
 const transport=createStructuredTransport({key:'offline',fetcher:attach(async()=>{calls++;return completion();},{deadlineMs:start,prepare:async()=>{prepares++;}})},{...tinySpec,encode:c=>{encodes++;return c;}});
 const pending=track(transport.generate('private'));await pending.settled;failure(pending,'AI_TIMEOUT');assert.equal(encodes,0);assert.equal(prepares,0);assert.equal(calls,0);
});

test('recognized social admission capabilities reject invalid versions and unbounded local configuration',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});let calls=0,prepares=0;
 for(const invalid of [{version:2},{timeoutMs:0},{timeoutMs:60_001},{timeoutMs:1.5},{deadlineMs:NaN},{deadlineMs:Infinity}]){
  const transport=createSocialTransport({key:'offline',fetcher:attach(async()=>{calls++;return completion();},{...invalid,prepare:async()=>{prepares++;}})});
  const pending=track(transport.generate(context()));await pending.settled;failure(pending,'AI_CONFIG');assert.equal(transport.records.length,1);
 }
 assert.equal(calls,0);assert.equal(prepares,0);
});

test('no-hook transport retains its original deadline around local work',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});const body=deferred();let calls=0;
 const transport=createStructuredTransport({key:'offline',beforeDispatch:()=>body.promise,fetcher:async()=>{calls++;return Response.json(envelope({ok:true}));}},tinySpec);
 const pending=track(transport.generate('private'));await flush();t.mock.timers.tick(30_000);await flush();await pending.settled;
 failure(pending,'AI_TIMEOUT');body.resolve();await flush();assert.equal(calls,0);assert.equal(transport.records[0].durationMs,30_000);
 assert.equal(transport.records[0].costUsd,null,'legacy unknown-cost interpretation is unchanged');
});

test('non-social schemas and unmatched hook schemas keep the legacy path without consuming admission',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});let calls=0,prepares=0;
 for(const [name,schema]of [['stakeholder_turn_v1','social_decision_v1'],['social_decision_v1','unrelated_schema']]){
  const transport=createStructuredTransport({key:'offline',fetcher:attach(async()=>{calls++;return Response.json(envelope({ok:true}));},{schema,version:99,timeoutMs:Infinity,prepare:async()=>{prepares++;throw Error('must not run');}})},{...tinySpec,name});
  assert.deepEqual((await transport.generate('private')).value,{ok:true});
 }
 assert.equal(calls,2);assert.equal(prepares,0);
});

test('provider response body reads remain inside the post-admission provider deadline',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});let calls=0,prepares=0,cancels=0;
 const prepared=deferred();
 const transport=createSocialTransport({key:'offline',fetcher:attach(async()=>{calls++;return new Response(new ReadableStream({cancel(){cancels++;}}),{headers:{'Content-Type':'application/json'}});},{prepare:async()=>{prepares++;await prepared.promise;}})});
 const pending=track(transport.generate(context()));await flush();assert.equal(prepares,1);t.mock.timers.tick(40_000);prepared.resolve();await flush();assert.equal(calls,1);
 t.mock.timers.tick(30_000);await flush();failure(pending,'AI_TIMEOUT');await pending.settled;assert.equal(cancels,1);assert.equal(calls,1);assert.equal(transport.records[0].termination?.httpStatus,200);
});

test('admission failure is safe, consumes no provider call, and adds no request data to inference records',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});let calls=0,prepares=0;const c=context();c.question='PRIVATE_CONTEXT_MARKER';
 const records:unknown[]=[];
 const transport=createSocialTransport({key:'PRIVATE_CREDENTIAL_MARKER',onRecord:record=>records.push(record),fetcher:attach(async()=>{calls++;return completion(c);},{prepare:async info=>{prepares++;assert.ok(info.requestBody.includes('PRIVATE_CONTEXT_MARKER'));throw Error('PRIVATE_PREPARE_ERROR');}})});
 const pending=track(transport.generate(c));await pending.settled;failure(pending,'AI_UPSTREAM');assert.equal(prepares,1);assert.equal(calls,0);assert.equal(records.length,1);
 assert.deepEqual(Object.keys(transport.records[0]).sort(),['costUsd','durationMs','errorCode','generationId','identityVerification','inputTokens','outputTokens','requestedModel','requestedProvider','servingModel','servingProvider','status','termination','totalTokens']);
 assert.ok(!JSON.stringify(records).includes('PRIVATE_'));assert.ok(!String(pending.state.error).includes('PRIVATE_'));assert.equal(transport.records[0].termination?.httpStatus,null);
 assert.equal(transport.records[0].costUsd,0);
});

test('a new-hook guard proof zeros undispatched usage while an ordinary fetch failure retains unknown usage',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});
 for(const proof of [true,false]){
  let calls=0;const fetcher=attach(async()=>{calls++;const error=new Error('PRIVATE_GUARD_FAILURE');if(proof)Object.defineProperty(error,noDispatchKey,{value:true});throw error;});
  const transport=createSocialTransport({key:'offline',fetcher}),pending=track(transport.generate(context()));await pending.settled;
  failure(pending,'AI_UPSTREAM');assert.equal(calls,1);assert.equal(transport.records[0].costUsd,proof?0:null);assert.equal(transport.records[0].inputTokens,proof?0:null);assert.equal(transport.records[0].outputTokens,proof?0:null);assert.equal(transport.records[0].totalTokens,proof?0:null);
  assert.ok(!String(pending.state.error).includes('PRIVATE_'));assert.equal(transport.records.length,1);
 }
});

test('the no-dispatch marker cannot change legacy record accounting without the v1 capability',async()=>{
 const transport=createStructuredTransport({key:'offline',fetcher:async()=>{const error=new Error('PRIVATE_LEGACY_ERROR');Object.defineProperty(error,noDispatchKey,{value:true});throw error;}},tinySpec);
 const pending=track(transport.generate('private'));await pending.settled;failure(pending,'AI_UPSTREAM');assert.equal(transport.records[0].costUsd,null);
});

test('elapsed synchronous context work cannot escape the local deadline before timers run',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});let prepares=0,calls=0;
 const transport=createStructuredTransport({key:'offline',fetcher:attach(async()=>{calls++;return Response.json(envelope({ok:true}));},{timeoutMs:5000,prepare:async()=>{prepares++;}})},{...tinySpec,encode:c=>{t.mock.timers.setTime(start+5000);return c;}});
 const pending=track(transport.generate('private'));await pending.settled;failure(pending,'AI_TIMEOUT');assert.equal(prepares,0);assert.equal(calls,0);assert.equal(transport.records[0].costUsd,0);
});

test('cancellation at the admission handoff releases the returned reservation receipt before accounting',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});const caller=new AbortController();let calls=0,cancels=0;
 const transport=createSocialTransport({key:'offline',fetcher:attach(async()=>{calls++;return completion();},{prepare:async()=>{caller.abort();return {version:1,cancelBeforeDispatch:()=>{cancels++;}};}})});
 const pending=track(transport.generate(context(),caller.signal));await pending.settled;failure(pending,'AI_CANCELLED');
 assert.equal(calls,0);assert.equal(cancels,1);assert.equal(transport.records[0].costUsd,0);
});

test('a late receipt is released after a bounded local failure and cannot cause delayed dispatch',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});const receipt=deferred<Receipt>();let calls=0,prepares=0,cancels=0;
 const transport=createSocialTransport({key:'offline',fetcher:attach(async()=>{calls++;return completion();},{timeoutMs:5000,prepare:async()=>{prepares++;return receipt.promise;}})});
 const pending=track(transport.generate(context()));await flush();assert.equal(prepares,1);t.mock.timers.tick(5000);await flush();failure(pending,'AI_TIMEOUT');await pending.settled;
 receipt.resolve({version:1,cancelBeforeDispatch:()=>{cancels++;}});await flush();assert.equal(cancels,1);assert.equal(calls,0);assert.equal(transport.records.length,1);
});

test('reservation receipt cleanup runs after an accepted provider call without changing its usage',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});let calls=0,cancels=0;
 const transport=createSocialTransport({key:'offline',fetcher:attach(async()=>{calls++;return completion();},{prepare:async()=>({version:1,cancelBeforeDispatch:()=>{cancels++;}})})});
 await transport.generate(context());assert.equal(cancels,1);assert.equal(calls,1);assert.equal(transport.records[0].inputTokens,100);assert.equal(transport.records[0].outputTokens,50);
});

test('a metadata no-dispatch proof cannot erase usage from an already returned completion',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});let calls=0;
 const fetcher=attach(async()=>{
  if(++calls===1){const value:Record<string,unknown>=envelope({ok:true});delete value.provider;value.usage={prompt_tokens:100,completion_tokens:50,total_tokens:150,cost:0.004};return Response.json(value);}
  const error=new Error('PRIVATE_METADATA_ERROR');Object.defineProperty(error,noDispatchKey,{value:true});throw error;
 });
 const transport=createStructuredTransport({key:'offline',fetcher},tinySpec),pending=track(transport.generate('private'));await pending.settled;
 failure(pending,'AI_UPSTREAM');assert.equal(calls,2);assert.equal(transport.records[0].costUsd,0.004);assert.equal(transport.records[0].inputTokens,100);assert.equal(transport.records[0].outputTokens,50);
});

test('synchronous provider validation still obeys the post-admission provider deadline',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});let calls=0;
 const transport=createStructuredTransport({key:'offline',fetcher:attach(async()=>{calls++;return Response.json(envelope({ok:true}));})},{...tinySpec,parse:()=>{t.mock.timers.setTime(start+30_000);return {ok:true};}});
 const pending=track(transport.generate('private'));await pending.settled;failure(pending,'AI_TIMEOUT');assert.equal(calls,1);assert.equal(transport.records[0].durationMs,30_000);
});

test('default fetch can consume a process admission registration through a framework wrapper',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});let prepares=0,calls=0;const globals=globalThis as typeof globalThis&{[admissionKey]?:Hook};
 const previous=Object.getOwnPropertyDescriptor(globalThis,admissionKey);
 Object.defineProperty(globals,admissionKey,{configurable:true,value:{version:1,schema:'social_decision_v1',timeoutMs:60_000,deadlineMs:start+120_000,prepare:async()=>{prepares++;}}});
 t.mock.method(globalThis,'fetch',async()=>{calls++;return completion();});
 try{await createSocialTransport({key:'offline'}).generate(context());assert.equal(prepares,1);assert.equal(calls,1);}
 finally{if(previous)Object.defineProperty(globalThis,admissionKey,previous);else delete globals[admissionKey];}
});

test('an explicit injected fetcher never inherits the process admission registration',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:start});let prepares=0,calls=0;const globals=globalThis as typeof globalThis&{[admissionKey]?:Hook};
 const previous=Object.getOwnPropertyDescriptor(globalThis,admissionKey);
 Object.defineProperty(globals,admissionKey,{configurable:true,value:{version:1,schema:'social_decision_v1',timeoutMs:60_000,deadlineMs:start+120_000,prepare:async()=>{prepares++;throw Error('must not inherit');}}});
 try{await createSocialTransport({key:'offline',fetcher:async()=>{calls++;return completion();}}).generate(context());assert.equal(prepares,0);assert.equal(calls,1);}
 finally{if(previous)Object.defineProperty(globalThis,admissionKey,previous);else delete globals[admissionKey];}
});
