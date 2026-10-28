import test from 'node:test';
import assert from 'node:assert/strict';
import {createExperiment} from '../../experiments/contract.ts';
import {createDefaultConfiguration} from '../../experiments/configuration.ts';
import {appendExperimentGraph} from '../../experiments/graph.ts';

test('an integrated saved-input graph distinguishes an available executor from an unexecuted snapshot',async()=>{
  const question='What if Singapore left ASEAN?';
  const experiment=await createExperiment({question,configuration:createDefaultConfiguration(question),evidence:null});
  const before=JSON.stringify(experiment);
  const graph=appendExperimentGraph(null,{scenarioIdentity:experiment.scenarioIdentity,question,
    configuration:experiment.configuration,evidence:null,experiment,archived:true,executionAvailable:true});
  const pending=graph.nodes.find(node=>node.properties.executionStatus==='not-executed'&&!node.properties.experimentId)!;
  assert.ok(pending);
  assert.match(pending.label,/saved input|not executed/i);
  assert.match(pending.description,/separate|available/i);
  assert.ok(!graph.nodes.some(node=>/not yet available|executor is unavailable/i.test(node.label+' '+node.description)));
  assert.ok(!graph.edges.some(edge=>/execution is unavailable/i.test(edge.provenance.reference)));
  assert.ok(!graph.executionIdentity);
  assert.ok(graph.nodes.every(node=>node.provenance.kind!=='calculated'&&node.provenance.kind!=='synthetic-exploratory'));
  assert.equal(JSON.stringify(experiment),before);
  assert.equal(experiment.execution.status,'not-executed');
  assert.equal(experiment.execution.reason,'Stakeholder simulation not yet available.');
});

test('standalone default graph retains its original no-executor boundary',()=>{
  const question='What if Singapore left ASEAN?';
  const graph=appendExperimentGraph(null,{scenarioIdentity:'standalone-experiment',question,
    configuration:createDefaultConfiguration(question),evidence:null,experiment:null});
  assert.ok(graph.nodes.some(node=>node.label==='Stakeholder simulation not yet available'));
});

test('integrated graph availability is truthful before any evidence has been replayed',()=>{
  const question='What if Singapore left ASEAN?';
  const graph=appendExperimentGraph({version:1,scenarioIdentity:'current-draft',nodes:[],edges:[],
    limitations:['This explorer has no document-retrieval or stakeholder-simulation executor.']},
  {scenarioIdentity:'current-draft',question,configuration:createDefaultConfiguration(question),
    evidence:null,experiment:null,executionAvailable:true});
  assert.ok(!graph.limitations.some(item=>/has no.*executor/.test(item)));
  assert.ok(graph.limitations.some(item=>/separate validated execution/.test(item)));
});
