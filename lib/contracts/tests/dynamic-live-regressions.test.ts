import test from 'node:test';
import assert from 'node:assert/strict';
import {createDynamicPlanner} from '../../server/inference/planner.ts';
import {dynamicFixtures} from '../../dynamic-scenarios/fixtures.ts';
import {MODEL} from '../../server/inference/deepseek.ts';
import {parseDynamicDraft} from '../../dynamic-scenarios/plan.ts';
test('planning instructions select directly affected stakeholders and question-grounded scope, not analyst substitutes',async()=>{
 const f=dynamicFixtures()[0];let captured:any;
 const planner=createDynamicPlanner({key:'mock-only',fetcher:async(_url,init)=>{captured=JSON.parse(String(init?.body));return Response.json({model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(f.draft)}}]});}});
 await planner.generate(f.request);
 const system=captured.messages[0].content;
 assert.match(system,/directly affected stakeholder/i);
 assert.match(system,/not generic analysts/i);
 assert.match(system,/do not expand a domestic question/i);
 assert.match(system,/entityIds.*entities\[\]\.id/);
 assert.match(system,/Do not introduce numerical targets/);
 assert.equal(JSON.parse(captured.messages[1].content).question,f.request.question);
 assert.deepEqual(captured.reasoning,{effort:'none',exclude:true});assert.equal(captured.max_tokens,3000);
});
test('undeclared planner entity references remain rejected rather than being repaired or treated as jurisdictions',()=>{
 const f=dynamicFixtures()[0],draft=structuredClone(f.draft);draft.agents[0].entityIds=['sg'];assert.throws(()=>parseDynamicDraft(draft,f.request),/Unknown generated entity/);
 draft.agents[0].entityIds=[];assert.doesNotThrow(()=>parseDynamicDraft(draft,f.request));
});

test('planner proposals cannot introduce unsupported numerical targets even as assumptions or goals',()=>{
 const f=dynamicFixtures()[0],d=structuredClone(f.draft);
 d.assumptions[0].text='Productivity increases by 20 percent';assert.throws(()=>parseDynamicDraft(d,f.request),/quantitative claims/);
 d.assumptions[0].text='Productivity changes are unknown';d.agents[0].goals=['Save $500'];assert.throws(()=>parseDynamicDraft(d,f.request),/quantitative claims/);
 d.agents[0].goals=['Maintain financial stability'];assert.doesNotThrow(()=>parseDynamicDraft(d,f.request));
});

test('new planning schema bounds agent and relationship references to the same four identity slots',async()=>{
 const f=dynamicFixtures()[0];let body:any;const planner=createDynamicPlanner({key:'mock',fetcher:async(_u,i)=>{body=JSON.parse(String(i?.body));return Response.json({model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(f.draft)}}]});}});
 await planner.generate(f.request);const p=body.response_format.json_schema.schema.properties;
 assert.deepEqual(p.agents.items.properties.id.enum,['agent-1','agent-2','agent-3','agent-4']);
 assert.deepEqual(p.relationships.items.properties.sourceAgentId.enum,p.agents.items.properties.id.enum);
 assert.deepEqual(p.relationships.items.properties.targetAgentId.enum,p.agents.items.properties.id.enum);
 const d=structuredClone(f.draft);d.relationships[0].targetAgentId=d.relationships[0].sourceAgentId;assert.throws(()=>parseDynamicDraft(d,f.request),/Invalid generated relationship/);
});

test('new bounded identity slots and prior valid generated IDs both retain strict runtime compatibility',()=>{
 const f=dynamicFixtures()[0];assert.doesNotThrow(()=>parseDynamicDraft(f.draft,f.request));
 const d=structuredClone(f.draft),ids=new Map(d.agents.map((a,i)=>[a.id,`agent-${i+1}`]));
 d.agents.forEach(a=>{a.id=ids.get(a.id)!;});d.relationships.forEach(r=>{r.sourceAgentId=ids.get(r.sourceAgentId)!;r.targetAgentId=ids.get(r.targetAgentId)!;});
 assert.doesNotThrow(()=>parseDynamicDraft(d,f.request));assert.deepEqual(d.agents.map(a=>a.id),['agent-1','agent-2','agent-3','agent-4']);
});

test('later actions receive explicit other-participant IDs and cannot pass by citing only themselves',async()=>{
 const {createDeepseekTransport}=await import('../../server/inference/deepseek.ts');
 const {runStakeholderSimulation,deterministicTurn}=await import('../../stakeholder-simulation/engine.ts');
 const {createLiveInput}=await import('../../stakeholder-simulation/inference-input.ts');
 const {parseStakeholderTurnOutput}=await import('../../stakeholder-simulation/contract.ts');
 const input=createLiveInput('asean','What if Singapore leaves ASEAN?');let checks=0;
 const transport=createDeepseekTransport({key:'mock',fetcher:async(_u,i)=>{const body=JSON.parse(String(i?.body)),c=JSON.parse(body.messages[1].content);
  if(c.round>1){checks++;assert.equal(c.interactionRequirements.mustReferenceOtherParticipant,true);assert.deepEqual(c.interactionRequirements.availableOtherEventIds,c.previousEvents.filter((e:any)=>e.roleId!==c.role.id).map((e:any)=>e.id));assert.equal(body.response_format.json_schema.schema.properties.previousEventIds.minItems,1);
   const bad={...deterministicTurn(c),previousEventIds:c.previousEvents.filter((e:any)=>e.roleId===c.role.id).map((e:any)=>e.id)};assert.throws(()=>parseStakeholderTurnOutput(bad,c),/another recorded participant/);}
  return Response.json({model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(deterministicTurn(c))}}]});
 }});
 const run=await runStakeholderSimulation(input,{attemptId:'explicit-other-reference',provider:'openrouter',model:MODEL,generateTurn:async(c,s)=>(await transport.generate(c,s)).value});
 assert.equal(run.status,'completed');assert.equal(checks,4);
});

test('new planner rejects local scope with multiple relevant jurisdictions while archived contracts remain readable',async()=>{
 const f=dynamicFixtures()[1],d=structuredClone(f.draft);d.scope='local';
 assert.doesNotThrow(()=>parseDynamicDraft(d,f.request));
 const planner=createDynamicPlanner({key:'mock',fetcher:async()=>Response.json({model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(d)}}]})});
 await assert.rejects(planner.generate(f.request));assert.equal(planner.records[0].status,'failed');
});

test('archive inspection preserves a completed active dynamic run and returning restores its exact identity',async()=>{
 const {createQuestionSimulation}=await import('../../question-simulation/client.ts');const {handleDynamicRequest}=await import('../../server/inference/dynamic-service.ts');const {mockDynamicProvider}=await import('./helpers/dynamic-provider.ts');
 const f=dynamicFixtures()[0],m=mockDynamicProvider(f);let calls=0;const c=createQuestionSimulation({execution:'dynamic',fetcher:async(url,init)=>{calls++;return handleDynamicRequest(new Request('http://localhost'+url,init),{enabled:true,key:'mock',fetcher:m.fetcher});}});
 c.invalidate({question:f.request.question,geometry:f.request.geometry,geometryRevision:0});await c.start();const accepted=c.getSnapshot().dynamic!;assert.equal(c.getSnapshot().phase,'completed');
 c.inspectArchive(accepted.run.runId);c.inspectArchive(null);assert.equal(c.getSnapshot().phase,'completed');assert.deepEqual(c.getSnapshot().dynamic,accepted);assert.equal(c.getSnapshot().run?.runId,accepted.run.runId);assert.equal(calls,1);
 c.invalidate({question:f.request.question,geometry:f.request.geometry,geometryRevision:1});assert.equal(c.getSnapshot().dynamic,null);c.dispose();
});

test('archive selection during pending work cancels it and cannot restore a late dynamic response',async()=>{
 const {createQuestionSimulation}=await import('../../question-simulation/client.ts');const {handleDynamicRequest}=await import('../../server/inference/dynamic-service.ts');const {mockDynamicProvider}=await import('./helpers/dynamic-provider.ts');
 const f=dynamicFixtures()[0],m=mockDynamicProvider(f);let held=false,release!:(r:Response)=>void;const pending=new Promise<Response>(r=>release=r);
 const c=createQuestionSimulation({execution:'dynamic',fetcher:async(url,init)=>held?pending:handleDynamicRequest(new Request('http://localhost'+url,init),{enabled:true,key:'mock',fetcher:m.fetcher})});
 c.invalidate({question:f.request.question,geometry:f.request.geometry,geometryRevision:0});await c.start();const archive=c.getSnapshot().history[0].id;held=true;const running=c.start();c.inspectArchive(archive);c.inspectArchive(null);release(Response.json({invalid:'late'}));await running;await new Promise(r=>setTimeout(r,5));
 assert.equal(c.getSnapshot().phase,'cancelled');assert.equal(c.getSnapshot().run,null);assert.equal(c.getSnapshot().dynamic,null);assert.equal(c.getSnapshot().history[0].id,archive);c.dispose();
});
