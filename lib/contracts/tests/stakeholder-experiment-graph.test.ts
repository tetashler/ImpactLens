import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createExperiment} from '../../experiments/contract.ts';
import {parseConfiguration} from '../../experiments/configuration.ts';
import {createScenarioExperimentInput,validateScenarioExperimentInput} from '../../experiments/handoff.ts';
import {computeEvidenceSnapshotIdentity,parseEvidenceBundle} from '../../evidence/contract.ts';
import {parseKnowledgeGraph} from '../../knowledge-graph/contract.ts';
import {runStakeholderSimulation} from '../../stakeholder-simulation/engine.ts';
import * as api from '../../stakeholder-simulation/experiment-graph.ts';
import * as bridge from '../../stakeholder-simulation/experiment-bridge.ts';

const options={stakeholderRoleIds:['small-business','policy-analyst'],simulationOptions:{mode:'deterministic-demo' as const,rounds:2,seed:'linked-graph-test',memoryEvents:6}};

async function fixture(evidenceAttached=true,longId=false,includeInference=false){
  assert.ok(bridge,'the experiment bridge is required');
  const sourceFixture=await validateScenarioExperimentInput(JSON.parse(await readFile(new URL('../../experiments/fixtures/asean-phase7d-input.json',import.meta.url),'utf8')));
  const evidence=evidenceAttached?parseEvidenceBundle(sourceFixture.evidence):null;
  if(includeInference&&evidence){
    evidence.findings.push({...evidence.findings[0],id:'analyst-inference',classification:'inference',statement:'Further agreement-specific analysis may be needed.',limitations:[]});
    evidence.snapshotIdentity=await computeEvidenceSnapshotIdentity(evidence);
    evidence.bundleId=`evidence-${evidence.snapshotIdentity.slice(7)}`;
  }
  const experiment=await createExperiment({question:sourceFixture.question,configuration:parseConfiguration(sourceFixture.configuration),evidence,experimentId:longId?'e'.repeat(128):'experiment-linked-graph'});
  const source=await createScenarioExperimentInput(experiment);
  const {input}=await bridge.convertScenarioExperimentInput(source,options);
  const run=await runStakeholderSimulation(input,{attemptId:'linked-graph-attempt'});
  return bridge.linkStakeholderRun(source,run,experiment);
}

test('saved experiment and actual run compose one archived graph with full immutable lineage',async()=>{
  assert.ok(api,'linked experiment graph projection is required');
  const linked=await fixture(),before=JSON.stringify(linked);
  const graph=await api.projectLinkedExperimentGraph(linked);
  assert.deepEqual(parseKnowledgeGraph(graph),graph);
  assert.equal(graph.scenarioIdentity,linked.source.scenarioIdentity);
  assert.equal(graph.executionIdentity,linked.run.runId);
  const saved=graph.nodes.find(n=>n.properties.experimentId===linked.source.sourceExperimentId&&n.properties.archived===true)!;
  const run=graph.nodes.find(n=>n.properties.recordType==='run')!;
  assert.ok(saved&&run);
  for(const node of [saved,run]){
    assert.equal(node.properties.configurationIdentity,linked.source.configurationIdentity);
    assert.equal(node.properties.evidenceSnapshotIdentity,linked.source.evidenceSnapshotIdentity);
    assert.equal(node.properties.executionInputIdentity,linked.source.executionInputIdentity);
    assert.equal(node.properties.runId,linked.run.runId);
  }
  assert.ok(graph.edges.some(e=>e.source===saved.id&&e.target===run.id&&e.relationship==='produces'));
  assert.ok(graph.edges.some(e=>e.source===run.id&&e.target===saved.id&&e.relationship==='uses'));
  assert.ok(graph.nodes.some(n=>n.category==='scenario'&&n.properties.archived===true));
  assert.ok(graph.limitations.some(s=>/archived/i.test(s)));
  assert.ok(graph.nodes.every(n=>n.category!=='result'&&n.provenance.kind!=='calculated'));
  assert.ok(graph.nodes.every(n=>!/not yet available|no stakeholder-simulation executor/i.test(n.label+' '+n.description+' '+n.provenance.reference)));
  assert.ok(graph.edges.every(e=>!/unavailable/i.test(e.provenance.reference)));
  assert.ok(!graph.limitations.some(s=>/no stakeholder-simulation executor/i.test(s)));
  assert.equal(saved.properties.executionStatus,'not-executed');
  assert.equal(linked.experiment!.execution.status,'not-executed');
  assert.equal(JSON.stringify(linked),before);
});

test('synthetic mentions resolve to original classified E findings and checked source excerpts',async()=>{
  assert.ok(api);
  const linked=await fixture(),graph=await api.projectLinkedExperimentGraph(linked);
  for(const source of linked.source.evidence!.sources){
    const nodes=graph.nodes.filter(n=>n.properties.sourceId===source.id&&!n.properties.findingId);
    assert.equal(nodes.length,1);
    assert.ok(nodes[0].details?.includes(source.excerpt));
    assert.equal(nodes[0].properties.verifiedAt,source.verifiedAt);
    assert.equal(nodes[0].provenance.url,source.url);
  }
  for(const finding of linked.source.evidence!.findings){
    const nodes=graph.nodes.filter(n=>n.properties.findingId===finding.id);
    assert.equal(nodes.length,1);
    assert.equal(nodes[0].properties.classification,finding.classification);
    assert.ok(nodes[0].details?.includes(finding.excerpt));
  }
  for(const event of linked.run.events){
    const node=graph.nodes.find(n=>n.properties.eventId===event.id)!;
    assert.equal(node.provenance.kind,'synthetic-exploratory');
    for(const findingId of event.evidenceFindingIds){
      const finding=graph.nodes.find(n=>n.properties.findingId===findingId)!;
      assert.ok(graph.edges.some(e=>e.source===node.id&&e.target===finding.id&&e.relationship==='uses'&&e.provenance.kind==='synthetic-exploratory'));
    }
    for(const sourceId of event.sourceIds){
      const source=graph.nodes.find(n=>n.properties.sourceId===sourceId&&!n.properties.findingId)!;
      assert.ok(graph.edges.some(e=>e.source===node.id&&e.target===source.id&&e.relationship==='uses'));
    }
    assert.ok(!graph.edges.some(e=>e.source===node.id&&e.relationship==='supported-by'));
  }
  assert.ok(graph.edges.filter(e=>e.relationship==='supported-by').every(e=>graph.nodes.find(n=>n.id===e.source)?.properties.classification==='directly-supported'));
});

test('no-evidence graphs retain gaps and importing JSON revalidates source, run and actual record',async()=>{
  assert.ok(api);
  const linked=await fixture(false,true),graph=await api.projectLinkedExperimentGraph(JSON.parse(JSON.stringify(linked)));
  assert.ok(graph.nodes.some(n=>n.properties.evidenceStatus==='not-researched'));
  assert.ok(!graph.nodes.some(n=>n.properties.findingId||n.category==='source'));
  assert.equal(graph.nodes.find(n=>n.properties.recordType==='run')!.properties.experimentId,'e'.repeat(128));
  assert.ok(graph.nodes.every(n=>n.id.length<=180));
  const noRecord={version:1,source:linked.source,run:linked.run};
  await assert.rejects(()=>api.projectLinkedExperimentGraph(noRecord),/record|experiment|snapshot/i);
  const wrongRun=structuredClone(linked);wrongRun.run.inputFingerprint='0'.repeat(64);
  await assert.rejects(()=>api.projectLinkedExperimentGraph(wrongRun));
  const wrongRecord=structuredClone(linked);wrongRecord.experiment!.question='Another question';
  await assert.rejects(()=>api.projectLinkedExperimentGraph(wrongRecord));
  const extraBase={...JSON.parse(JSON.stringify(linked)),base:{scenarioIdentity:linked.source.scenarioIdentity,nodes:[{id:'unrelated-mrt',category:'result'}]}};
  await assert.rejects(()=>api.projectLinkedExperimentGraph(extraBase));
});

test('an inferred finding stays planning context after run-source composition',async()=>{
  const linked=await fixture(true,false,true),graph=await api.projectLinkedExperimentGraph(linked);
  const inference=graph.nodes.find(node=>node.properties.findingId==='analyst-inference')!;
  assert.equal(inference.properties.classification,'inference');
  assert.equal(inference.provenance.kind,'planning-only');
  assert.ok(graph.edges.some(edge=>edge.source===inference.id&&edge.relationship==='uses'));
  assert.ok(!graph.edges.some(edge=>edge.source===inference.id&&edge.relationship==='supported-by'));
  assert.deepEqual(parseKnowledgeGraph(graph),graph);
});
