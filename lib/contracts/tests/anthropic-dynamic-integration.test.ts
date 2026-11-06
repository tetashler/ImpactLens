import '../../../scripts/testing/offline-network.mjs';
import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {handleDynamicRequest} from '../../server/inference/dynamic-service.ts';
import {validateDynamicResponse} from '../../dynamic-scenarios/response.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';

function selectClaude(t:TestContext){
 const previous=process.env.AI_PROVIDER;process.env.AI_PROVIDER='anthropic';
 t.after(()=>{if(previous===undefined)delete process.env.AI_PROVIDER;else process.env.AI_PROVIDER=previous;});
}
function request(){return new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:`claude-dynamic-${crypto.randomUUID()}`,request:worldFixtures()[4].request})});}

test('Claude dynamic planning and all eight turns use native Messages and retain verified identities',async t=>{
 selectClaude(t);const fixture=worldFixtures()[4],provider=mockDynamicProvider(fixture);let calls=0;
 const fetcher:typeof fetch=async(url,init)=>{
  calls++;assert.equal(String(url),'https://api.anthropic.com/v1/messages');
  const headers=new Headers(init?.headers);assert.equal(headers.get('x-api-key'),'dummy-claude-key');assert.equal(headers.get('anthropic-version'),'2023-06-01');assert.equal(headers.get('authorization'),null);
  const body=JSON.parse(String(init?.body));assert.equal(body.model,'claude-haiku-5-5');assert.equal(body.stream,false);assert.equal(body.messages.length,1);assert.equal(body.messages[0].role,'user');assert.equal(typeof body.system,'string');assert.equal(body.provider,undefined);
  assert.equal(body.max_tokens,calls<=2?6000:800);
  // Reuse valid application outputs from the offline fixture. This adapter exists
  // only in the test; the production request above remains native Anthropic.
  const name=calls===1?'dynamic_entities_v3':calls===2?'dynamic_relationships_v3':'stakeholder_turn_v1';
  const fixtureResponse=await provider.fetcher('https://openrouter.ai/api/v1/chat/completions',{method:'POST',body:JSON.stringify({model:'deepseek/deepseek-v4-flash-0731',provider:{only:['digitalocean'],allow_fallbacks:false,require_parameters:true},reasoning:{effort:'none',exclude:true},response_format:{json_schema:{name}},messages:[{role:'system',content:body.system},{role:'user',content:body.messages[0].content}]})});
  const reply=await fixtureResponse.json();
  return Response.json({id:`msg-dynamic-${calls}`,type:'message',role:'assistant',model:'claude-haiku-5-5',content:[{type:'text',text:reply.choices[0].message.content}],stop_reason:'end_turn',stop_sequence:null,usage:{input_tokens:reply.usage.prompt_tokens,output_tokens:reply.usage.completion_tokens}});
 };
 const req=request(),wire=await req.clone().json(),response=await handleDynamicRequest(req,{enabled:true,key:'dummy-claude-key',groundingKey:'',fetcher});assert.equal(response.status,200);
 const accepted=await validateDynamicResponse(await response.json(),wire);assert.equal(accepted.kind,'dynamic-execution');if(accepted.kind!=='dynamic-execution')throw Error('Expected complete dynamic execution');
 assert.equal(calls,10);assert.deepEqual(provider.counts(),{calls:10,plans:2});assert.equal(accepted.run.status,'completed');assert.equal(accepted.run.events.length,8);assert.equal(accepted.run.execution.provider,'anthropic');assert.equal(accepted.run.execution.model,'claude-haiku-5-5');
 assert.ok(accepted.planning.records);assert.equal(accepted.planning.records.length,2);assert.equal(accepted.inference.records.length,8);assert.equal(accepted.accounting.totalCalls,10);assert.equal(accepted.accounting.inputTokens,1800);assert.equal(accepted.accounting.outputTokens,2400);assert.equal(accepted.accounting.costUsd,null);
 for(const record of [...accepted.planning.records,...accepted.inference.records]){assert.equal(record.status,'accepted');assert.equal(record.requestedModel,'claude-haiku-5-5');assert.equal(record.requestedProvider,'anthropic');assert.equal(record.servingModel,'claude-haiku-5-5');assert.equal(record.servingProvider,'Anthropic');assert.equal(record.identityVerification,'completion');assert.equal(record.costUsd,null);}
});

test('Claude dynamic first-call rate limit preserves retry guidance and stops before further planning or actions',async t=>{
 selectClaude(t);let calls=0;const req=request(),wire=await req.clone().json();
 const response=await handleDynamicRequest(req,{enabled:true,key:'dummy-claude-key',groundingKey:'',fetcher:async(url,init)=>{calls++;assert.equal(String(url),'https://api.anthropic.com/v1/messages');assert.equal(new Headers(init?.headers).get('x-api-key'),'dummy-claude-key');return Response.json({type:'error',error:{type:'rate_limit_error',message:'PRIVATE_PROVIDER_MESSAGE'}},{status:429,headers:{'Retry-After':'17'}});}});
 assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'17');assert.equal(calls,1);
 const raw=await response.json();assert.doesNotMatch(JSON.stringify(raw),/PRIVATE_PROVIDER_MESSAGE/);const accepted=await validateDynamicResponse(raw,wire);assert.equal(accepted.kind,'planning-failed');if(accepted.kind!=='planning-failed')throw Error('Expected bounded planning failure');
 assert.equal(accepted.error.code,'AI_RATE_LIMIT');assert.equal(accepted.error.retryAfterSeconds,17);assert.ok(accepted.planning.records);assert.equal(accepted.planning.records.length,1);assert.equal(accepted.planning.records[0].requestedProvider,'anthropic');assert.equal(accepted.accounting.totalCalls,1);assert.equal(Object.hasOwn(accepted,'run'),false);
});
