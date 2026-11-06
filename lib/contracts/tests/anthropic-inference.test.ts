import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createStructuredTransport,type StructuredSpec} from '../../server/inference/deepseek.ts';
import {INFERENCE_ADMISSION_V1,INFERENCE_NO_DISPATCH_V1,type InferenceAdmissionFetcher} from '../../server/inference/admission.ts';

const schema={type:'object',additionalProperties:false,required:['answer'],properties:{answer:{type:'string',minLength:1,maxLength:8}}};
const spec:StructuredSpec<null,{answer:string}>={name:'test_answer',system:'Return the answer.',schema:()=>schema,encode:()=>'{"question":"test"}',parse:value=>{assert.deepEqual(value,{answer:'valid'});return value as {answer:string};},outputLimit:100,defaultOutput:80,contentBytes:100};
const response=(change:Record<string,unknown>={})=>({id:'msg_fixture',type:'message',role:'assistant',model:'claude-haiku-5-5',content:[{type:'text',text:'{"answer":"valid"}'}],stop_reason:'end_turn',stop_sequence:null,usage:{input_tokens:25,output_tokens:8,cache_creation_input_tokens:0,cache_read_input_tokens:0},...change});
const fake=(run:(url:string,init:RequestInit)=>unknown|Promise<unknown>):typeof fetch=>(async(url,init)=>{const result=await run(String(url),init??{});return result instanceof Response?result:Response.json(result);}) as typeof fetch;
async function anthropic(run:()=>Promise<void>){const previous=process.env.AI_PROVIDER;process.env.AI_PROVIDER='anthropic';try{await run();}finally{if(previous===undefined)delete process.env.AI_PROVIDER;else process.env.AI_PROVIDER=previous;}}

test('Anthropic route dispatches directly and records the actual response model without a fabricated cost',()=>anthropic(async()=>{
 let calls=0,body:any;
 const transport=createStructuredTransport({key:'offline-fixture',fetcher:fake((url,init)=>{calls++;assert.equal(url,'https://api.anthropic.com/v1/messages');const headers=new Headers(init.headers);assert.equal(headers.get('x-api-key'),'offline-fixture');assert.equal(headers.get('anthropic-version'),'2023-06-01');assert.equal(headers.has('authorization'),false);body=JSON.parse(String(init.body));return response();})},spec);
 const result=await transport.generate(null);
 assert.equal(calls,1);assert.deepEqual(result.value,{answer:'valid'});
 assert.equal(body.model,'claude-haiku-5-5');assert.equal(body.max_tokens,80);assert.deepEqual(body.thinking,{type:'disabled'});assert.equal(body.output_config.effort,'low');assert.equal(body.output_config.format.type,'json_schema');assert.equal(body.provider,undefined);
 assert.equal(result.record.requestedModel,'claude-haiku-5-5');assert.equal(result.record.requestedProvider,'anthropic');assert.equal(result.record.servingModel,'claude-haiku-5-5');assert.equal(result.record.servingProvider,'Anthropic');assert.equal(result.record.identityVerification,'completion');assert.equal(result.record.inputTokens,25);assert.equal(result.record.outputTokens,8);assert.equal(result.record.totalTokens,33);assert.equal(result.record.costUsd,null);assert.equal(result.record.termination?.reasoningTokens,0);
}));

test('Anthropic schema removes unsupported constraints while retaining them as model guidance',()=>anthropic(async()=>{
 let body:any;
 await createStructuredTransport({key:'offline-fixture',fetcher:fake((_url,init)=>{body=JSON.parse(String(init.body));return response();})},spec).generate(null);
 const field=body.output_config.format.schema.properties.answer;
 assert.equal(field.minLength,undefined);assert.equal(field.maxLength,undefined);assert.match(field.description,/minLength.*1/);assert.match(field.description,/maxLength.*8/);assert.equal(schema.properties.answer.maxLength,8);
}));

test('complex schemas use one JSON request with original schema guidance instead of exceeding native union limits',()=>anthropic(async()=>{
 let body:any;
 const complex={type:'object',additionalProperties:false,required:[],properties:Object.fromEntries(Array.from({length:17},(_,i)=>['field'+i,{anyOf:[{type:'string'},{type:'null'}]}]))};
 await createStructuredTransport({key:'offline-fixture',fetcher:fake((_url,init)=>{body=JSON.parse(String(init.body));return response();})},{...spec,schema:()=>complex}).generate(null);
 assert.equal(body.output_config.format,undefined);assert.match(body.system,/JSON/);assert.ok(body.system.includes('field16'));assert.ok(body.system.includes('anyOf'));
}));

test('Anthropic identity mismatch fails closed while retaining supplied usage',()=>anthropic(async()=>{
 for(const model of ['other-model',undefined]){let calls=0;const transport=createStructuredTransport({key:'offline-fixture',fetcher:fake(()=>{calls++;return response({model});})},spec);await assert.rejects(transport.generate(null),(error:any)=>error.code==='AI_PROVIDER_IDENTITY');assert.equal(calls,1);assert.equal(transport.records[0].servingModel,null);assert.equal(transport.records[0].inputTokens,25);assert.equal(transport.records[0].status,'failed');}
}));

test('Anthropic truncation, refusal and tool output never become accepted actions',()=>anthropic(async()=>{
 for(const change of [{stop_reason:'max_tokens'},{stop_reason:'refusal'},{content:[{type:'tool_use',id:'tool_fixture',name:'forbidden',input:{}}]}]){let calls=0;const transport=createStructuredTransport({key:'offline-fixture',fetcher:fake(()=>{calls++;return response(change);})},spec);await assert.rejects(transport.generate(null));assert.equal(calls,1);assert.equal(transport.records[0].status,'failed');assert.equal(transport.records[0].outputTokens,8);}
}));

test('Anthropic malformed output retains usage and is never repaired or retried',()=>anthropic(async()=>{
 let calls=0;const transport=createStructuredTransport({key:'offline-fixture',fetcher:fake(()=>{calls++;return response({content:[{type:'text',text:'{'}]});})},spec);
 await assert.rejects(transport.generate(null),(error:any)=>error.code==='AI_RESPONSE_JSON');assert.equal(calls,1);assert.equal(transport.records[0].totalTokens,33);assert.equal(transport.records[0].costUsd,null);
}));

test('Anthropic route is captured at transport construction',()=>anthropic(async()=>{
 const transport=createStructuredTransport({key:'offline-fixture',fetcher:fake(url=>{assert.equal(url,'https://api.anthropic.com/v1/messages');return response();})},spec);
 process.env.AI_PROVIDER='openrouter';assert.equal((await transport.generate(null)).record.requestedProvider,'anthropic');
}));

test('Anthropic admission sees the exact request and can stop dispatch with zero known charge',()=>anthropic(async()=>{
 let calls=0,prepared=0;
 const fetcher=fake(()=>{calls++;return response();}) as InferenceAdmissionFetcher;
 let inspected=false;
 fetcher[INFERENCE_ADMISSION_V1]={version:1,schema:'social_decision_v1',timeoutMs:1000,deadlineMs:Date.now()+3000,prepare:async info=>{prepared++;assert.equal(info.url,'https://api.anthropic.com/v1/messages');assert.equal(JSON.parse(info.requestBody).model,'claude-haiku-5-5');inspected=true;throw Object.assign(new Error('no dispatch'),{[INFERENCE_NO_DISPATCH_V1]:true});}};
 const transport=createStructuredTransport({key:'offline-fixture',fetcher},{...spec,name:'social_decision_v1'});
 await assert.rejects(transport.generate(null));assert.equal(inspected,true);assert.equal(prepared,1);assert.equal(calls,0);assert.equal(transport.records[0].totalTokens,0);assert.equal(transport.records[0].costUsd,0);
}));
