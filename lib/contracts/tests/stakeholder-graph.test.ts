import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoInput} from '../../stakeholder-simulation/roles.ts';
import {runStakeholderSimulation} from '../../stakeholder-simulation/engine.ts';
import {projectStakeholderRun,mergeStakeholderGraph} from '../../stakeholder-simulation/graph-adapter.ts';
import {parseKnowledgeGraph} from '../../knowledge-graph/contract.ts';

test('real stateful run projects synthetic participants/events and exact run/experiment lineage',async()=>{
  const run=await runStakeholderSimulation(createDemoInput(),{attemptId:'graph-test'});
  const graph=await projectStakeholderRun(run);
  assert.equal(parseKnowledgeGraph(graph).scenarioIdentity,run.inputSnapshot.scenarioIdentity);
  assert.equal(graph.executionIdentity,run.runId);
  assert.equal(graph.nodes.filter(n=>n.properties.recordType==='event').length,run.events.length);
  assert.ok(graph.nodes.filter(n=>n.properties.recordType==='event').every(n=>n.provenance.kind==='synthetic-exploratory'));
  assert.ok(graph.edges.some(e=>e.description.includes('responds to')));
  assert.ok(!graph.edges.some(e=>e.relationship as string==='causes'));
  assert.ok(graph.nodes.some(n=>n.description.includes('not representative surveys')));
});

test('maximum configuration identity remains fully available without overflowing graph provenance references',async()=>{
  const input=createDemoInput();input.configurationIdentity='c'.repeat(2000);input.experimentId='e'.repeat(128);
  const run=await runStakeholderSimulation(input,{attemptId:'long-configuration'}),graph=await projectStakeholderRun(run);
  assert.equal(graph.nodes.find(n=>n.properties.recordType==='run')?.properties.configurationIdentity,input.configurationIdentity);
  assert.ok(graph.nodes.filter(n=>n.provenance.kind==='user-authored').every(n=>n.provenance.reference.includes(run.inputFingerprint)));
});
test('projection validates imported fingerprints and merging preserves existing graph only under matching identity',async()=>{
  const run=await runStakeholderSimulation(createDemoInput(),{attemptId:'merge-test'});
  const base={version:1 as const,scenarioIdentity:run.inputSnapshot.scenarioIdentity,nodes:[{id:'existing-result',label:'Existing MRT result',category:'result' as const,description:'An independent current calculated result.',provenance:{kind:'calculated' as const,reference:'Existing run'},properties:{minutes:5},limitations:[]}],edges:[],limitations:[]};
  const merged=await mergeStakeholderGraph(base,run);assert.deepEqual(merged.nodes[0],base.nodes[0]);assert.equal(base.nodes.length,1);
  await assert.rejects(()=>mergeStakeholderGraph({...base,scenarioIdentity:'different-scenario'},run));
  await assert.rejects(()=>projectStakeholderRun({...run,inputFingerprint:'0'.repeat(64)}));
});
test('supplied evidence is linked without pretending retrieval or making stakeholder views factual',async()=>{
  const input=createDemoInput();input.evidence={version:1,id:'supplied-test',sources:[{id:'source-1',title:'Supplied source',url:'https://example.org/source',referenceDate:'Test-only fixture'}],findings:[{id:'finding-1',sourceIds:['source-1'],statement:'Synthetic evidence fixture; no factual government claim.'}],gaps:['Agreement-specific legal evidence is missing.']};
  const run=await runStakeholderSimulation(input,{attemptId:'evidence-graph'}),graph=await projectStakeholderRun(run);
  const events=graph.nodes.filter(n=>n.properties.recordType==='event');assert.ok(events.every(n=>n.provenance.kind==='synthetic-exploratory'));
  assert.ok(graph.nodes.some(n=>n.properties.recordType==='source'&&n.description.includes('not independent verification')));
  assert.ok(graph.nodes.some(n=>n.properties.recordType==='finding'&&n.provenance.kind==='planning-only'));
  assert.ok(graph.edges.some(e=>e.description.includes('citation does not make')));
  assert.equal(graph.nodes.filter(n=>n.properties.recordType==='event').length,run.events.length);
});
