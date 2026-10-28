import test from 'node:test';
import assert from 'node:assert/strict';
import {handleStakeholderRequest,STAKEHOLDER_API_LIMITS} from '../../server/stakeholder-simulation/service.ts';
import {createDemoInput} from '../../stakeholder-simulation/roles.ts';
import {verifyStakeholderRun} from '../../stakeholder-simulation/identities.ts';
import {deterministicTurn,type TurnContext} from '../../stakeholder-simulation/engine.ts';
import {createStakeholderTurnGenerator} from '../../server/stakeholder-simulation/llm.ts';
import {AiError} from '../../server/ai/errors.ts';
import type {AiConfig} from '../../server/ai/config.ts';
import type {createAiProvider,StructuredRequest} from '../../server/ai/provider.ts';

const request=(body:string,headers:Record<string,string>={'content-type':'application/json'})=>new Request('http://localhost/api/stakeholder-simulate',{method:'POST',headers,body});
test('stakeholder HTTP rejects unsafe origin, query, unsupported media and malformed JSON without leaking internals',async()=>{
  for(const [r,status]of [
    [request('{}',{'content-type':'application/json',origin:'https://untrusted.example'}),403],
    [new Request('http://localhost/api/stakeholder-simulate?file=private',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}),400],
    [request('{}',{'content-type':'text/plain'}),415],
    [request('{'),400],
    [request('{}'),400],
  ] as const){const response=await handleStakeholderRequest(r);assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'no-store');assert.doesNotMatch(await response.text(),/stack|C:\\|apiKey|node_modules/i);}
});
test('stakeholder HTTP bounds actual and declared request bytes',async()=>{
  for(const r of [request(' '.repeat(STAKEHOLDER_API_LIMITS.requestBytes+1)),request('{}',{'content-type':'application/json','content-length':String(STAKEHOLDER_API_LIMITS.requestBytes+1)})])assert.equal((await handleStakeholderRequest(r)).status,413);
});
test('cancelling an unfinished JSON body releases its reader and returns a controlled cancellation',async()=>{
  const controller=new AbortController();let cancelled=false;
  const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode('{'));},cancel(){cancelled=true;}});
  const incoming=new Request('http://localhost/api/stakeholder-simulate',{method:'POST',headers:{'content-type':'application/json'},body:stream,signal:controller.signal,duplex:'half'} as RequestInit);
  const pending=handleStakeholderRequest(incoming);await new Promise(r=>setTimeout(r,2));controller.abort();
  const response=await Promise.race([pending,new Promise<Response>((_,reject)=>setTimeout(()=>reject(new Error('Body reader did not release after abort')),100))]);
  assert.equal(response.status,499);assert.equal(cancelled,true);
});
const config:AiConfig={provider:'gemini',model:'gemini-test',apiKey:'mock-only-not-a-credential',timeoutMs:1000,maxOutputTokens:4096};
const payload=(attemptId:string,mode:'deterministic-demo'|'llm-assisted'='deterministic-demo')=>{const input=createDemoInput();input.simulationOptions.mode=mode;input.simulationOptions.rounds=2;return {version:1,attemptId,input};};
const provider=(generate:(request:StructuredRequest)=>Promise<unknown>):typeof createAiProvider=>(()=>({generate:async request=>({value:await generate(request),provider:'gemini',model:'gemini-test',usage:{inputTokens:null,outputTokens:null,totalTokens:null}})})) as typeof createAiProvider;

test('same-origin uses the actual Host header when Next normalises the request URL hostname',async()=>{
  const incoming=(origin:string)=>new Request('http://localhost:3134/api/stakeholder-simulate',{method:'POST',headers:{'content-type':'application/json',host:'127.0.0.1:3134',origin},body:JSON.stringify(payload('normalised-host'))});
  assert.equal((await handleStakeholderRequest(incoming('http://127.0.0.1:3134'))).status,200);
  assert.equal((await handleStakeholderRequest(incoming('https://untrusted.example'))).status,403);
});

test('deterministic endpoint invokes real turn engine and returns validated immutable run with no model access',async()=>{
  const body=payload('http-demo'),before=structuredClone(body);
  const response=await handleStakeholderRequest(request(JSON.stringify(body)),{llm:{getConfig(){throw new Error('Model configuration must not be read');}}});
  assert.equal(response.status,200);const result=await response.json();const run=await verifyStakeholderRun(result.run);
  assert.equal(result.attemptId,body.attemptId);assert.equal(run.status,'completed');assert.equal(run.events.length,12);assert.ok(run.events.slice(1).some(e=>e.previousEventIds.length>0));assert.deepEqual(body,before);
  assert.equal(run.execution.provider,null);assert.equal(run.execution.mode,'deterministic-demo');
});
test('HTTP refuses unauthorised LLM mode without reading provider configuration or replacing it with scripts',async()=>{
  let called=false;const response=await handleStakeholderRequest(request(JSON.stringify(payload('no-live','llm-assisted'))),{llm:{getConfig(){called=true;return config;}}});
  assert.equal(response.status,503);assert.equal(called,false);assert.equal((await response.json()).code,'STAKEHOLDER_LLM_UNAVAILABLE');
});
test('public execution permits selected catalogue roles, not user-authored real-official impersonation',async()=>{
  const body=payload('invalid-official');body.input.stakeholderRoles[0].title='Actual Singapore minister speaking officially';
  const response=await handleStakeholderRequest(request(JSON.stringify(body)));assert.equal(response.status,400);
});
test('mocked authorised LLM path generates one independent sequential call per turn with preceding context',async()=>{
  const contexts:TurnContext[]=[];let active=0,maximum=0;
  const makeProvider=provider(async request=>{active++;maximum=Math.max(maximum,active);const context=request.context as TurnContext;contexts.push(structuredClone(context));await Promise.resolve();active--;return deterministicTurn(context);});
  const response=await handleStakeholderRequest(request(JSON.stringify(payload('mock-turns','llm-assisted'))),{allowLlm:true,llm:{getConfig:()=>config,makeProvider}});
  assert.equal(response.status,200);const {run}=await response.json();assert.equal(run.status,'completed');assert.equal(contexts.length,12);assert.equal(maximum,1);assert.equal(contexts[0].previousEvents.length,0);assert.ok(contexts[6].previousEvents.length>0);assert.equal(run.execution.mode,'llm-assisted');assert.equal(run.execution.model,'gemini-test');
});
test('fabricated citations and malformed model output produce labelled partial execution, never fake completion',async()=>{
  let calls=0;const makeProvider=provider(async request=>{const valid=deterministicTurn(request.context as TurnContext);if(++calls===2)return {...valid,evidenceFindingIds:['invented-source']};return valid;});
  const response=await handleStakeholderRequest(request(JSON.stringify(payload('bad-turn','llm-assisted'))),{allowLlm:true,llm:{getConfig:()=>config,makeProvider}});
  assert.equal(response.status,200);const {run}=await response.json();assert.equal(run.status,'partial');assert.equal(run.events.length,1);assert.equal(run.error.code,'AI_INVALID_RESPONSE');assert.doesNotMatch(JSON.stringify(run),/invented-source/);
});
test('provider timeout, missing config and unsafe provider exceptions remain controlled without transcript fabrication',async()=>{
  const missing=await handleStakeholderRequest(request(JSON.stringify(payload('config-missing','llm-assisted'))),{allowLlm:true,llm:{getConfig(){throw new AiError('private-key C:\\private.env','AI_CONFIG',503);}}});
  assert.equal(missing.status,503);assert.doesNotMatch(await missing.text(),/private-key|private\.env/);
  const timeout=await handleStakeholderRequest(request(JSON.stringify(payload('timeout','llm-assisted'))),{allowLlm:true,llm:{getConfig:()=>({...config,timeoutMs:5}),makeProvider:provider(()=>new Promise(()=>{}))}});
  assert.equal(timeout.status,200);const {run}=await timeout.json();assert.equal(run.status,'failed');assert.equal(run.events.length,0);assert.equal(run.error.code,'AI_TIMEOUT');assert.doesNotMatch(JSON.stringify(run),/apiKey|private-key/);
});
test('per-turn output size and provider identity are checked; call budget is bounded independently',async()=>{
  const input=payload('adapter-budget','llm-assisted').input,role=input.stakeholderRoles[0];
  const context:TurnContext={input,role,turnIndex:0,round:1,checkpointYear:0,previousEvents:[],memory:{roleId:role.id,eventIds:[],position:null,citedFindingIds:[],concerns:[],uncertainties:[]}};
  const oversized=createStakeholderTurnGenerator({getConfig:()=>config,makeProvider:provider(async()=>({statement:'x'.repeat(9000)}))});
  await assert.rejects(()=>oversized.generateTurn(context),/output budget/);
  const wrongProvider=createStakeholderTurnGenerator({getConfig:()=>config,makeProvider:(()=>({generate:async()=>({provider:'openrouter',model:'not-the-configured-model',value:deterministicTurn(context),usage:{inputTokens:null,outputTokens:null,totalTokens:null}})})) as typeof createAiProvider});
  await assert.rejects(()=>wrongProvider.generateTurn(context),/identity mismatch/);
  const valid=createStakeholderTurnGenerator({getConfig:()=>config,makeProvider:provider(async request=>deterministicTurn(request.context as TurnContext))});
  for(let i=0;i<24;i++)await valid.generateTurn(context);
  await assert.rejects(()=>valid.generateTurn(context),/budget exhausted/);
});
test('execution slots reject duplicate and excessive attempts, then release on completion',async()=>{
  let release:()=>void=()=>{},started=0;const hold=new Promise<void>(resolve=>{release=resolve;});
  const makeProvider=provider(async request=>{started++;await hold;return deterministicTurn(request.context as TurnContext);});
  const deps={allowLlm:true,llm:{getConfig:()=>config,makeProvider}};
  const first=handleStakeholderRequest(request(JSON.stringify(payload('held-first','llm-assisted'))),deps);
  while(started===0)await new Promise(r=>setTimeout(r,1));
  assert.equal((await handleStakeholderRequest(request(JSON.stringify(payload('held-first','llm-assisted'))),deps)).status,409);
  const second=handleStakeholderRequest(request(JSON.stringify(payload('held-second','llm-assisted'))),deps);
  while(started<2)await new Promise(r=>setTimeout(r,1));
  assert.equal((await handleStakeholderRequest(request(JSON.stringify(payload('held-third','llm-assisted'))),deps)).status,429);
  release();assert.equal((await first).status,200);assert.equal((await second).status,200);
  assert.equal((await handleStakeholderRequest(request(JSON.stringify(payload('after-release'))))).status,200);
});
