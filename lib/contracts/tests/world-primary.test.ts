import test from 'node:test';import assert from 'node:assert/strict';
import {createDynamicPlan} from '../../dynamic-scenarios/plan.ts';import {createDynamicInput} from '../../dynamic-scenarios/execution.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';import {runStakeholderSimulation,deterministicTurn} from '../../stakeholder-simulation/engine.ts';
import {projectPrimaryWorldGraph} from '../../world-graph/projection.ts';
import {buildScenarioDemographicContext} from '../../server/demographics/scenario-context.ts';
import {encodeTurnContext} from '../../server/inference/deepseek.ts';
import {createGroundingBundle} from '../../grounding/contract.ts';
import {dynamicFixtures} from '../../dynamic-scenarios/fixtures.ts';
import {legacyWorldEntities,worldRunLabel} from '../../world-graph/projection.ts';
test('primary world projection excludes audit records and expresses accepted interactions as edges',async()=>{
 const f=worldFixtures()[0],plan=await createDynamicPlan(f.request,f.draft),input=await createDynamicInput(plan),run=await runStakeholderSimulation(input,{attemptId:'primary-world',provider:'openrouter',model:'deepseek/deepseek-v4-flash-0731',generateTurn:async c=>deterministicTurn(c)});
 const p=await projectPrimaryWorldGraph(run);assert.equal(p.version,1);assert.equal(p.graph.nodes.length,16);
 assert.ok(p.graph.nodes.every(n=>['world-entity','fictional-agent'].includes(String(n.properties.recordType))));
 assert.ok(Object.values(p.inspections).some(r=>r.interactions.length>0));
 assert.equal(p.graph.nodes.filter(n=>n.properties.recordType==='fictional-agent').length,4);
 assert.ok(p.graph.edges.some(e=>p.inspections[e.id]?.kind==='recorded-interaction'));
 assert.equal(run.events.length,8);
});
test('source quotations stay with world entities and relationships without introducing evidence nodes',async()=>{
 const f=worldFixtures()[0],at='2026-10-29T00:00:00.000Z',quote=f.draft.ontology.entities[0].name+' considers a proposal.';
 const bundle=createGroundingBundle({status:'retrieved',query:f.request.question,retrievedAt:at,sources:[{id:'s',title:'Mocked source',url:'https://www.mom.gov.sg/',publisher:'www.mom.gov.sg',publishedAt:null,retrievedAt:at,passages:[{id:'p',text:quote}]}],usage:{searches:1,credits:1},limitations:['Fixture only']});
 f.draft.ontology.entities[0].support={sourceId:'s',passageId:'p',quote};f.draft.ontology.relationships[0].support={sourceId:'s',passageId:'p',quote};
 const plan=await createDynamicPlan(f.request,f.draft,bundle),run=await runStakeholderSimulation(await createDynamicInput(plan),{attemptId:'primary-source',provider:'openrouter',model:'deepseek/deepseek-v4-flash-0731',generateTurn:async c=>deterministicTurn(c)});
 const p=await projectPrimaryWorldGraph(run);assert.equal(p.graph.nodes.length,16);const e=p.graph.nodes.find(n=>n.properties.entityId===f.draft.ontology.entities[0].id)!;
 assert.equal(p.inspections[e.id].sources[0].quote,quote);assert.equal(e.provenance.kind,'synthetic-exploratory');
 assert.ok(p.graph.edges.filter(e=>e.relationshipLabel==='CONSULTS_WITH').every(e=>e.provenance.kind!=='source-backed'));
 assert.equal(legacyWorldEntities({version:1,scenarioIdentity:'failed',nodes:[{id:'x',label:'Real company name',category:'scenario',description:'Technical record with plausible English label',provenance:{kind:'user-authored',reference:'test'},properties:{recordType:'run'},limitations:[]}],edges:[],limitations:[]}).nodes.length,0);
});
test('partial runs and legacy plans retain actual agents, while explicit user dates are not removed',async()=>{
 const f=dynamicFixtures()[0];f.request.question='What if Singapore bans petrol cars by 2040?';f.draft.description=f.request.question;
 const plan=await createDynamicPlan(f.request,f.draft);let count=0;const run=await runStakeholderSimulation(await createDynamicInput(plan),{attemptId:'legacy-primary',provider:'openrouter',model:'deepseek/deepseek-v4-flash-0731',generateTurn:async c=>{if(++count===3)throw Error('Controlled failure');return deterministicTurn(c);}});
 assert.equal(run.events.length,2);assert.match(worldRunLabel(run,run.runId),/^Partial/);assert.equal(worldRunLabel(run,'other-run'),'Recorded world snapshot');const world=await projectPrimaryWorldGraph(run);assert.equal(world.graph.nodes.filter(n=>n.properties.recordType==='fictional-agent').length,4);assert.ok(Object.values(world.inspections).some(r=>r.interactions.length));assert.match(plan.request.question,/2040/);
});
test('Singapore aggregate context survives plan identity and is withheld from foreign action prompts',async()=>{
 const f=worldFixtures()[1],context=buildScenarioDemographicContext(f.request.question),plan=await createDynamicPlan(f.request,f.draft,undefined,context),input=await createDynamicInput(plan);let checked=0;
 const run=await runStakeholderSimulation(input,{attemptId:'primary-demographic',provider:'openrouter',model:'deepseek/deepseek-v4-flash-0731',generateTurn:async c=>{const prompt=JSON.parse(encodeTurnContext(c));assert.equal(prompt.demographicContext.status,c.role.id==='agent-2'||c.role.id==='agent-4'?'unavailable':'aggregate-context');checked++;return deterministicTurn(c);}});
 assert.equal(run.events.length,8);assert.equal(checked,8);
 const p=await projectPrimaryWorldGraph(run);const agents=p.graph.nodes.filter(n=>n.properties.recordType==='fictional-agent');assert.equal(agents.length,4);
 for(const n of agents){const r=p.inspections[n.id];assert.equal(r.demographicContext?.status,r.affiliation==='Singapore'?'aggregate-context':'unavailable');}
});
