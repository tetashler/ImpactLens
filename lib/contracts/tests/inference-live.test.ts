import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveInput} from '../../stakeholder-simulation/inference-input.ts';
import {executeLiveRun} from '../../server/inference/service.ts';
import {deterministicTurn,type TurnContext} from '../../stakeholder-simulation/engine.ts';
import {parseStakeholderInput} from '../../stakeholder-simulation/contract.ts';
test('domain role selection includes foreign suppliers only for cross-border trade',()=>{
 const tax=createLiveInput('import-tax','What happens if Singapore increases tax on imported goods?');
 assert.ok(tax.stakeholderRoles.some(r=>r.id==='foreign-supplier'));
 assert.ok(tax.assumptions.some(a=>a.value.includes('unknown')));
 assert.ok(!createLiveInput('mrt','How beneficial is a new MRT line?').stakeholderRoles.some(r=>r.id==='foreign-supplier'));
 assert.equal(parseStakeholderInput(tax).simulationOptions.mode,'llm-assisted');
});
test('live execution records separate genuine turn requests and bounded accounting',async()=>{
 const input=createLiveInput('asean','What if Singapore leaves ASEAN?');let calls=0;
 const result=await executeLiveRun(input,'live-test',{enabled:true,key:'test-only',transport:{records:[],async generate(context:TurnContext){calls++;const value=deterministicTurn(context);assert.equal(context.turnIndex,calls-1);if(calls>1)assert.ok(context.previousEvents.length);return {value,record:{status:'accepted',inputTokens:100,outputTokens:40,totalTokens:140,costUsd:0.0001}};}} as any});
 assert.equal(calls,8);assert.equal(result.run.events.length,8);assert.equal(result.run.execution.mode,'llm-assisted');assert.equal(result.inference.successfulCalls,8);assert.equal(result.inference.totalTokens,1120);
});
test('live execution refuses absent configuration and never substitutes scripts',async()=>{
 await assert.rejects(executeLiveRun(createLiveInput('asean','What if Singapore leaves ASEAN?'),'disabled',{enabled:false,key:''}),/configured|enabled/i);
});

test('live budget exhaustion preserves a partial run and stops extra activations',async()=>{
 const input=createLiveInput('asean','What if Singapore leaves ASEAN?');let calls=0;
 const result=await executeLiveRun(input,'budget',{enabled:true,key:'test-only',reservedTokens:16000,transport:{records:[],async generate(c:TurnContext){calls++;return {value:deterministicTurn(c),record:{status:'accepted',inputTokens:null,outputTokens:null,totalTokens:null,costUsd:null}};}} as any});
 assert.ok(calls<8);assert.notEqual(result.run.status,'completed');assert.equal(result.inference.totalTokens,null);
});
test('version 2 API retains origin checks and exact attempt/run identity',async()=>{
 const {handleStakeholderRequest}=await import('../../server/stakeholder-simulation/service.ts');
 const input=createLiveInput('mrt','How beneficial would a new MRT line be?');
 const request=new Request('http://localhost/api/stakeholder-simulate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({version:2,attemptId:'http-live',input})});
 const response=await handleStakeholderRequest(request,{live:{enabled:true,key:'test-only',transport:{records:[],async generate(c:TurnContext){return {value:deterministicTurn(c),record:{status:'accepted',inputTokens:2,outputTokens:3,totalTokens:5,costUsd:null}};}} as any}});
 assert.equal(response.status,200);const body=await response.json();assert.equal(body.version,2);assert.equal(body.attemptId,'http-live');assert.equal(body.run.attemptId,'http-live');assert.equal(body.run.events.length,8);assert.equal(response.headers.get('cache-control'),'no-store');
});

test('cancellation during a participant promise is cancelled rather than successful or failed',async()=>{
 const abort=new AbortController();
 const result=await executeLiveRun(createLiveInput('asean','What if Singapore leaves ASEAN?'),'abort-turn',{enabled:true,key:'test-only',transport:{records:[],async generate(){abort.abort();throw new Error('cancelled');}} as any},abort.signal);
 assert.equal(result.run.status,'cancelled');assert.equal(result.run.error?.code,'CANCELLED');
});

test('all domain presets execute sequentially through actual DeepSeek transport with mock HTTP completions',async()=>{
 const {createDeepseekTransport,MODEL}=await import('../../server/inference/deepseek.ts');
 for(const domain of ['asean','import-tax','mrt'] as const){
  const input=createLiveInput(domain,domain==='import-tax'?'What happens if Singapore increases tax on imported goods?':domain==='mrt'?'How beneficial is a new MRT line?':'What if Singapore leaves ASEAN?');
  let calls=0;
  const transport=createDeepseekTransport({key:'mock-only',fetcher:async(_url,init)=>{
    const request=JSON.parse(String(init?.body));assert.deepEqual(request.provider.only,['digitalocean']);
    const c=JSON.parse(request.messages[1].content) as TurnContext;calls++;
    const own=[...c.previousEvents].reverse().find(e=>e.roleId===c.role.id),other=[...c.previousEvents].reverse().find(e=>e.roleId!==c.role.id);
    const action={type:other?'response':'argument',addressedRoleId:other?.roleId??null,statement:`Mock HTTP action for fictional role ${c.role.id}; details remain unresolved.`,previousEventIds:other?[other.id]:[],evidenceFindingIds:[],assumptionIds:c.input.assumptions.map(a=>a.id),reasoningSummary:'Test-only structured provider response; not live inference.',uncertainties:['Actual outcomes are unknown.'],position:own?.position??'information-seeking',topics:[domain]};
    return Response.json({id:`mock-${calls}`,model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(action)}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150,cost:0.0001}});
  }});
  const result=await executeLiveRun(input,`transport-${domain}`,{enabled:true,key:'mock-only',transport});
  assert.equal(result.run.status,'completed');assert.equal(calls,8);assert.equal(result.inference.records.length,8);assert.equal(result.inference.successfulCalls,8);
  assert.ok(result.run.events[4].previousEventIds.length);assert.equal(result.inference.totalTokens,1200);
  const {projectStakeholderRun}=await import('../../stakeholder-simulation/graph-adapter.ts');const graph=await projectStakeholderRun(result.run);assert.equal(graph.executionIdentity,result.run.runId);
 }
});

test('a completed live attempt cannot be reused to rewrite nondeterministic history',async()=>{
 const input=createLiveInput('asean','What if Singapore leaves ASEAN?');let calls=0;
 const dependencies={enabled:true,key:'test-only',transport:{records:[],async generate(c:TurnContext){calls++;return {value:deterministicTurn(c),record:{status:'accepted',inputTokens:null,outputTokens:null,totalTokens:null,costUsd:null}};}} as any};
 await executeLiveRun(input,'sequential-duplicate',dependencies);await assert.rejects(executeLiveRun(input,'sequential-duplicate',dependencies),(e:unknown)=>(e as {status:number}).status===409);assert.equal(calls,8);
});

test('reservation ceiling can cover every bounded turn in the advertised eight-call run',async()=>{
 const {LIVE_LIMITS}=await import('../../server/inference/service.ts');
 const {INPUT_BYTE_LIMIT}=await import('../../server/ai/http.ts');
 assert.equal(LIVE_LIMITS.reservedTokens,LIVE_LIMITS.calls*(INPUT_BYTE_LIMIT+LIVE_LIMITS.outputTokens+2000));
});
