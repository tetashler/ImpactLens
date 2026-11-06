import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {inferenceStatus,executeLiveRun} from '../../server/inference/service.ts';
import {socialStatus} from '../../server/society/service.ts';
import {handleDynamicRequest} from '../../server/inference/dynamic-service.ts';
import {createLiveInput} from '../../stakeholder-simulation/inference-input.ts';
import {deterministicTurn,type TurnContext} from '../../stakeholder-simulation/engine.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';

function configure(t:TestContext,values:Record<string,string|undefined>){
 const original=Object.fromEntries(Object.keys(values).map(key=>[key,process.env[key]]));
 for(const [key,value]of Object.entries(values))if(value===undefined)delete process.env[key];else process.env[key]=value;
 t.after(()=>{for(const [key,value]of Object.entries(original))if(value===undefined)delete process.env[key];else process.env[key]=value;});
}
test('Claude status requires its own credential even when an OpenRouter credential exists',t=>{
 configure(t,{AI_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'',OPENROUTER_API_KEY:'unused-router-key'});
 const live=inferenceStatus(),social=socialStatus();
 assert.equal(live.connection,'not-configured');assert.equal(social.configured,false);
 assert.equal(live.model,'claude-haiku-5-5');assert.equal(live.provider,'anthropic');assert.equal(live.gateway,'Anthropic');
 assert.equal(social.model,'claude-haiku-5-5');assert.equal(social.provider,'anthropic');
});
test('configured Claude status and execution retain truthful model and provider attribution',async t=>{
 configure(t,{AI_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'dummy-only',OPENROUTER_API_KEY:''});
 assert.equal(inferenceStatus().connection,'configured');assert.equal(socialStatus().configured,true);
 const result=await executeLiveRun(createLiveInput('asean','What if Singapore leaves ASEAN?'),`claude-config-${crypto.randomUUID()}`,{enabled:true,transport:{records:[],async generate(context:TurnContext){return {value:deterministicTurn(context),record:{status:'accepted',inputTokens:null,outputTokens:null,totalTokens:null,costUsd:null}};}} as any});
 assert.equal(result.run.status,'completed');assert.equal(result.run.execution.provider,'anthropic');assert.equal(result.run.execution.model,'claude-haiku-5-5');
 assert.equal(result.inference.requestedModel,'claude-haiku-5-5');assert.equal(result.inference.requestedProvider,'anthropic');
});
test('explicit legacy keys remain usable and explicit empty keys override environment credentials',async t=>{
 configure(t,{AI_PROVIDER:'openrouter',ANTHROPIC_API_KEY:'',OPENROUTER_API_KEY:''});
 assert.equal(inferenceStatus().connection,'not-configured');assert.equal(socialStatus({key:'injected-key'}).configured,true);
 const input=createLiveInput('asean','What if Singapore leaves ASEAN?');
 const result=await executeLiveRun(input,`legacy-config-${crypto.randomUUID()}`,{enabled:true,key:'injected-key',transport:{records:[],async generate(context:TurnContext){return {value:deterministicTurn(context),record:{status:'accepted',inputTokens:null,outputTokens:null,totalTokens:null,costUsd:null}};}} as any});
 assert.equal(result.run.execution.provider,'openrouter');assert.equal(result.run.execution.model,'deepseek/deepseek-v4-flash-0731');
 process.env.OPENROUTER_API_KEY='dummy-only';
 await assert.rejects(executeLiveRun(input,`empty-key-${crypto.randomUUID()}`,{enabled:true,key:''}),{code:'AI_CONFIG'});
});
test('dynamic planning uses Claude credentials and never substitutes an OpenRouter credential',async t=>{
 configure(t,{AI_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'',OPENROUTER_API_KEY:'unused-router-key'});
 let calls=0;
 const request=()=>new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:`config-plan-${crypto.randomUUID()}`,request:worldFixtures()[0].request})});
 const deps={enabled:true,groundingKey:'',fetcher:async()=>{calls++;return Response.json({error:{message:'test-only failure'}},{status:502});}};
 const missing=await handleDynamicRequest(request(),deps);assert.equal(missing.status,503);assert.equal((await missing.json()).error.code,'AI_CONFIG');assert.equal(calls,0);
 process.env.ANTHROPIC_API_KEY='dummy-only';
 const configured=await handleDynamicRequest(request(),deps);assert.equal(configured.status,502);assert.equal((await configured.json()).error.code,'AI_UPSTREAM');assert.equal(calls,1);
});
