import '../../../scripts/testing/offline-network.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readAiConfig,readAiAvailability} from '../../server/ai/config.ts';
import {createAiProvider} from '../../server/ai/provider.ts';

const env={AI_PROVIDER:'anthropic',ANTHROPIC_MODEL:'claude-haiku-5-5',ANTHROPIC_API_KEY:'offline-claude-key',AI_TIMEOUT_MS:'1000',AI_MAX_OUTPUT_TOKENS:'200'};
test('explicit Anthropic configuration selects only its private credential and model',()=>{
 const config=readAiConfig({...env,OPENROUTER_API_KEY:'must-not-be-used'});
 assert.equal(config.provider,'anthropic');assert.equal(config.model,'claude-haiku-5-5');assert.equal(config.apiKey,'offline-claude-key');
 assert.equal(readAiAvailability({...env,ANTHROPIC_API_KEY:'',OPENROUTER_API_KEY:'available'}).available,false);
 for(const model of ['../escape','https://example.com/model','claude\nunsafe'])assert.throws(()=>readAiConfig({...env,ANTHROPIC_MODEL:model}));
});

test('generic AI uses direct Claude Messages and reports actual usage without a catalogue or fallback call',async()=>{
 let calls=0;
 const provider=createAiProvider(readAiConfig(env),async(url,init)=>{
  calls++;assert.equal(String(url),'https://api.anthropic.com/v1/messages');
  const headers=new Headers(init?.headers);assert.equal(headers.get('x-api-key'),'offline-claude-key');assert.equal(headers.get('authorization'),null);
  const body=JSON.parse(String(init?.body));assert.equal(body.model,'claude-haiku-5-5');assert.equal(body.max_tokens,200);
  assert.match(body.system,/^Trusted system\./);assert.match(body.messages[0].content,/untrusted question/);
  return Response.json({id:'msg_offline',type:'message',role:'assistant',model:'claude-haiku-5-5',content:[{type:'text',text:'{"accepted":true}'}],stop_reason:'end_turn',usage:{input_tokens:12,output_tokens:8}});
 });
 const result=await provider.generate({name:'offline_test',schema:{type:'object',properties:{accepted:{type:'boolean'}},required:['accepted'],additionalProperties:false},system:'Trusted system.',context:{safe:true},user:'untrusted question'});
 assert.equal(calls,1);assert.deepEqual(result.value,{accepted:true});assert.equal(result.provider,'anthropic');assert.equal(result.model,'claude-haiku-5-5');assert.deepEqual(result.usage,{inputTokens:12,outputTokens:8,totalTokens:20});
});

test('Claude generic accounting includes reported cache tokens and leaves invalid usage unknown',async()=>{
 for(const [cacheRead,input,total] of [[7,22,30],[-1,null,null]] as const){
  const provider=createAiProvider(readAiConfig(env),async()=>Response.json({id:'msg_cache',type:'message',role:'assistant',model:'claude-haiku-5-5',content:[{type:'text',text:'{"accepted":true}'}],stop_reason:'end_turn',usage:{input_tokens:12,output_tokens:8,cache_creation_input_tokens:3,cache_read_input_tokens:cacheRead}}));
  const result=await provider.generate({name:'cache_test',schema:{type:'object',properties:{accepted:{type:'boolean'}},required:['accepted'],additionalProperties:false},system:'Trusted.',context:{},user:'Question.'});
  assert.equal(result.usage.inputTokens,input);assert.equal(result.usage.totalTokens,total);
 }
});

test('Claude generic responses reject mismatched identities, refusals and truncation without retries',async()=>{
 const base={id:'msg_bad',type:'message',role:'assistant',model:'claude-haiku-5-5',content:[{type:'text',text:'{"accepted":true}'}],stop_reason:'end_turn',usage:{input_tokens:12,output_tokens:8}};
 for(const change of [{model:'different-model'},{stop_reason:'refusal'},{stop_reason:'max_tokens'},{content:[{type:'tool_use',name:'unsafe',input:{}}]}]){
  let calls=0;const provider=createAiProvider(readAiConfig(env),async()=>{calls++;return Response.json({...base,...change});});
  await assert.rejects(provider.generate({name:'bad_response',schema:{type:'object',properties:{accepted:{type:'boolean'}},required:['accepted'],additionalProperties:false},system:'Trusted.',context:{},user:'Question.'}),{code:'AI_INVALID_RESPONSE'});
  assert.equal(calls,1);
 }
});
