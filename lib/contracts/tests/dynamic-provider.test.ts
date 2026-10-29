import test from 'node:test';
import assert from 'node:assert/strict';
import {worldFixtures as dynamicFixtures} from '../../world-graph/fixtures.ts';
import {handleDynamicRequest} from '../../server/inference/dynamic-service.ts';
import {validateDynamicResponse} from '../../dynamic-scenarios/response.ts';
import {MODEL} from '../../server/inference/deepseek.ts';
import {projectDynamicGraph} from '../../dynamic-scenarios/projection.ts';
import {mockDynamicProvider as mocked} from './helpers/dynamic-provider.ts';
const req=(request:unknown)=>new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:`dynamic-${crypto.randomUUID()}`,request})});
for(const f of dynamicFixtures())test(`one planner + real action boundary + graph: ${f.request.question}`,async()=>{
 const r=req(f.request),wire=await r.clone().json(),mock=mocked(f);
 const response=await handleDynamicRequest(r,{enabled:true,groundingKey:'',key:'mock-only',fetcher:mock.fetcher});assert.equal(response.status,200);
 const accepted=await validateDynamicResponse(await response.json(),wire);assert.equal(accepted.kind,'dynamic-execution');if(accepted.kind!=='dynamic-execution')throw Error('Expected execution');assert.equal(accepted.run.status,'completed');assert.equal(accepted.run.events.length,8);assert.deepEqual(mock.counts(),{calls:9,plans:1});
 assert.equal(accepted.accounting.totalCalls,9);assert.equal(accepted.accounting.inputTokens,1300);assert.equal(accepted.accounting.outputTokens,1400);assert.equal(accepted.planning.record.outputTokens,1000);
 assert.ok(Math.abs(accepted.accounting.costUsd!-0.0018)<1e-10);assert.equal((await projectDynamicGraph(accepted.run)).executionIdentity,accepted.run.runId);
});
test('planner mismatch and invalid output stop before action requests',async()=>{
 const f=dynamicFixtures()[0];for(const kind of ['identity','schema','references']){
  const m=mocked(f,(b,r)=>{if(b.response_format.json_schema.name==='dynamic_scenario_v2'){if(kind==='identity')r.provider='Other';else{const d=structuredClone(f.draft) as any;if(kind==='schema')d.unknown=true;else d.relationships[0].targetAgentId='unknown';r.choices[0].message.content=JSON.stringify(d);}}});
  const r=await handleDynamicRequest(req(f.request),{enabled:true,groundingKey:'',key:'mock',fetcher:m.fetcher});assert.equal(r.status,502);assert.equal(m.counts().calls,1);assert.ok(!JSON.stringify(await r.json()).includes('Other'));
 }
});
test('a failed action preserves planning charge and accepted turns',async()=>{
 const f=dynamicFixtures()[0];let n=0;const m=mocked(f,(b,r)=>{if(b.response_format.json_schema.name!=='dynamic_scenario_v2'&&++n===2)r.choices[0].message.content='invalid JSON';});
 const r=req(f.request),wire=await r.clone().json(),response=await handleDynamicRequest(r,{enabled:true,groundingKey:'',key:'mock',fetcher:m.fetcher});const body=await validateDynamicResponse(await response.json(),wire);
 assert.equal(body.kind,'dynamic-execution');if(body.kind!=='dynamic-execution')throw Error('Expected execution');assert.equal(body.run.status,'partial');assert.equal(body.run.events.length,1);assert.equal(body.planning.record.status,'accepted');assert.equal(body.accounting.totalCalls,3);
});
test('planning cost is not free: reaching the soft cap prevents action requests',async()=>{
 const f=dynamicFixtures()[0],m=mocked(f,(b,r)=>{if(b.response_format.json_schema.name==='dynamic_scenario_v2')r.usage.cost=0.05;});
 const r=req(f.request),wire=await r.clone().json(),response=await handleDynamicRequest(r,{enabled:true,groundingKey:'',key:'mock',fetcher:m.fetcher}),body=await validateDynamicResponse(await response.json(),wire);
 assert.equal(body.kind,'dynamic-execution');if(body.kind!=='dynamic-execution')throw Error('Expected recorded failure');assert.equal(body.run.status,'failed');assert.equal(body.run.events.length,0);assert.equal(body.accounting.costUsd,0.05);assert.equal(m.counts().calls,1);
});
test('framework Request adapters are read structurally without constructing a new global Request',async()=>{
 const f=dynamicFixtures()[0],r=req(f.request),m=mocked(f);const adapter={url:r.url,headers:r.headers,body:r.body,signal:r.signal} as Request;
 const response=await handleDynamicRequest(adapter,{enabled:true,groundingKey:'',key:'mock',fetcher:m.fetcher});assert.equal(response.status,200);
});
test('request correlation, accounting and legacy boundaries reject forged dynamic records',async()=>{
 const f=dynamicFixtures()[0],r=req(f.request),wire=await r.clone().json(),m=mocked(f);const response=await handleDynamicRequest(r,{enabled:true,groundingKey:'',key:'mock',fetcher:m.fetcher}),body=await response.json();
 await assert.rejects(validateDynamicResponse(body,{...wire,request:{...wire.request,geometryRevision:wire.request.geometryRevision+1}}));
 await assert.rejects(validateDynamicResponse({...body,accounting:{...body.accounting,costUsd:0}},wire));
 const {handleStakeholderRequest}=await import('../../server/stakeholder-simulation/service.ts');
 const legacy=new Request('http://localhost/api/stakeholder-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:2,attemptId:`legacy-${crypto.randomUUID()}`,input:body.run.inputSnapshot})});
 assert.equal((await handleStakeholderRequest(legacy,{live:{enabled:true,key:'mock'}})).status,400);
 assert.equal(m.counts().calls,9);
});
test('unknown planning cost remains unknown in combined accounting',async()=>{
 const f=dynamicFixtures()[0],m=mocked(f,(b,r)=>{if(b.response_format.json_schema.name==='dynamic_scenario_v2')delete r.usage.cost;});
 const r=req(f.request),wire=await r.clone().json(),response=await handleDynamicRequest(r,{enabled:true,groundingKey:'',key:'mock',fetcher:m.fetcher}),body=await validateDynamicResponse(await response.json(),wire);assert.equal(body.accounting.costUsd,null);
});
test('no-key or disabled planning returns a recoverable no-call state and no fictitious run',async()=>{
 const f=dynamicFixtures()[0];let calls=0;const r=req(f.request),wire=await r.clone().json();const response=await handleDynamicRequest(r,{enabled:false,key:'',fetcher:async()=>{calls++;throw Error('Forbidden');}});
 assert.equal(response.status,503);const body=await validateDynamicResponse(await response.json(),wire);assert.equal(body.kind,'planning-failed');assert.equal(body.accounting.totalCalls,0);assert.equal(calls,0);assert.ok(!Object.hasOwn(body,'run'));
});
