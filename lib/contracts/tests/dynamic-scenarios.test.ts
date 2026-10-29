import test from 'node:test';
import assert from 'node:assert/strict';
import {createDynamicPlan,parseDynamicDraft,validateDynamicPlan,rolesForPlan} from '../../dynamic-scenarios/plan.ts';
import {dynamicFixtures} from '../../dynamic-scenarios/fixtures.ts';
import {parseStakeholderInput} from '../../stakeholder-simulation/contract.ts';
import {createDynamicInput} from '../../dynamic-scenarios/execution.ts';
import {runStakeholderSimulation,deterministicTurn} from '../../stakeholder-simulation/engine.ts';
import {projectDynamicGraph,projectDynamicReport} from '../../dynamic-scenarios/projection.ts';

for(const fixture of dynamicFixtures())test(`dynamic manifest and engine: ${fixture.request.question}`,async()=>{
 const plan=await createDynamicPlan(fixture.request,fixture.draft);
 assert.equal((await validateDynamicPlan(plan)).planId,plan.planId);
 const input=await createDynamicInput(plan);
 assert.equal(input.version,2);assert.equal(input.stakeholderRoles.length,4);
 assert.deepEqual(input.stakeholderRoles,rolesForPlan(plan));
 const run=await runStakeholderSimulation(input,{attemptId:'dynamic-test',provider:'openrouter',model:'deepseek/deepseek-v4-flash-0731',generateTurn:async c=>deterministicTurn(c)});
 assert.equal(run.status,'completed');assert.equal(run.events.length,8);assert.ok(run.events[4].previousEventIds.length);
 const graph=await projectDynamicGraph(run);assert.ok(graph.nodes.some(n=>n.properties.recordType==='generated-agent'));
 const report=await projectDynamicReport(run);assert.equal(report.events.length,8);assert.equal(report.verifiedFindings.length,0);
 assert.ok(report.limitations.includes('Synthetic dialogue is not a quantitative forecast.'));
 const corrupt=structuredClone(input);corrupt.stakeholderRoles[0].interests=['Silently changed'];assert.throws(()=>parseStakeholderInput(corrupt));
});
test('generated plan rejects invented verification, broken relationships, IDs and fabricated sources',async()=>{
 const f=dynamicFixtures()[0];
 for(const change of [(d:any)=>d.entities.push({id:'fake',name:'An institution',kind:'institution',jurisdictionId:null,status:'verified'}),(d:any)=>d.relationships[0].targetAgentId='missing',(d:any)=>d.agents[1].id=d.agents[0].id,(d:any)=>d.evidenceFindingIds.push('made-up'),(d:any)=>d.extra='no']){
  const d=structuredClone(f.draft);change(d);assert.throws(()=>parseDynamicDraft(d,f.request));
 }
 const plan=structuredClone(await createDynamicPlan(f.request,f.draft));plan.draft.description='Changed';await assert.rejects(validateDynamicPlan(plan));
});
test('graph-safe IDs, connected opportunities and unsupported numerical claims are rejected at the plan boundary',()=>{
 const f=dynamicFixtures()[0];
 for(const mutate of [(d:any)=>d.entities[0].id='x'.repeat(150),(d:any)=>d.relationships=[{id:'r1',sourceAgentId:'agent-0',targetAgentId:'agent-1',opportunity:'A'},{id:'r2',sourceAgentId:'agent-1',targetAgentId:'agent-0',opportunity:'B'},{id:'r3',sourceAgentId:'agent-2',targetAgentId:'agent-3',opportunity:'C'}],(d:any)=>d.description='GDP will increase by 15%.']){const d=structuredClone(f.draft);mutate(d);assert.throws(()=>parseDynamicDraft(d,f.request));}
});
test('all generated prose rejects unsupported figures and citation URLs; quoted user conditions retain their provenance',async()=>{
 const f=dynamicFixtures()[0];for(const mutate of [(d:any)=>d.relationships[0].opportunity='Measured GDP increase of 15% is established.',(d:any)=>d.description='Verified by https://example.invalid/fake-report: official approval.',(d:any)=>d.entities[0].name='Verified 20% growth agency']){const draft=structuredClone(f.draft);mutate(draft);assert.throws(()=>parseDynamicDraft(draft,f.request));}
 const request={...f.request,question:' '.repeat(501)+f.request.question};const plan=await createDynamicPlan(request,f.draft);assert.equal((await createDynamicInput(plan)).assumptions[0].value,f.request.question);
});
test('currency checks cover pounds and euros without treating question marks as currency',()=>{
 const f=dynamicFixtures()[0];for(const currency of ['\u00a3','\u20ac']){const d=structuredClone(f.draft);d.description=`A new economic benefit of ${currency}100 is established.`;assert.throws(()=>parseDynamicDraft(d,f.request));}
 const d=structuredClone(f.draft);d.description='What remains unknown? 2 narrative rounds are proposed.';assert.doesNotThrow(()=>parseDynamicDraft(d,f.request));
});
