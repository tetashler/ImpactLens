import test from 'node:test';
import assert from 'node:assert/strict';
import { parseKnowledgeGraph } from '../../knowledge-graph/contract.ts';
import { buildKnowledgeGraph } from '../../knowledge-graph/adapters.ts';
import { createScenarioPlan } from '../../scenarios/contract.ts';
import { createDefaultConfiguration } from '../../experiments/configuration.ts';
import { getNetworkCatalog, runMapSimulation } from '../../server/mrt-service.ts';
import { createDefaultEldercareRequest } from '../../eldercare/api-contract.ts';
import { calculateEldercare, getEldercareFacilities } from '../../server/eldercare-service.ts';
import { createExperiment, createGeometryContext, scenarioIdentityFor } from '../../experiments/index.ts';
import { createReplayEvidence } from '../../evidence/replay.ts';
import { computeEvidenceSnapshotIdentity } from '../../evidence/index.ts';
import { spawnSync } from 'node:child_process';

// The initial red run reports the missing adapter as an assertion, not a loader error.
const api = await import('../../experiments/graph.ts').catch(() => null);
const geometry = { version: 1 as const, scenarioId: 'graph-experiment', features: [] };
const question = 'What if Singapore leaves ASEAN?';
const configuration = createDefaultConfiguration(question);

test('a research graph declares explicit user assumptions without creating results', () => {
  assert.ok(api, 'experiment graph projection API is required');
  const context = { scenarioIdentity: 'current-canonical-identity', question, configuration, evidence: null, experiment: null };
  const before = JSON.stringify(context);
  const graph = api.appendExperimentGraph(null, context);
  assert.equal(graph.scenarioIdentity, 'current-canonical-identity');
  assert.ok(graph.nodes.some(node => node.category === 'scenario' && node.description === question));
  const assumptions = graph.nodes.filter(node => node.category === 'assumption');
  assert.ok(assumptions.length >= 5);
  assert.ok(assumptions.every(node => node.provenance.kind === 'user-authored'));
  assert.ok(assumptions.some(node => node.properties.withdrawalTiming === 'immediate'));
  assert.ok(assumptions.some(node => node.properties.tradeArrangements === 'unresolved'));
  assert.ok(graph.nodes.every(node => node.category !== 'result' && node.provenance.kind !== 'calculated'));
  assert.ok(graph.edges.every(edge => ['declares', 'uses', 'supported-by', 'limited-by', 'contains'].includes(edge.relationship)));
  assert.deepEqual(parseKnowledgeGraph(graph), graph);
  assert.equal(JSON.stringify(context), before);
});

test('polyclinic and generic research retain unconfirmed inputs and user hypotheses', () => {
  assert.ok(api, 'experiment graph projection API is required');
  const clinic = api.appendExperimentGraph(null, { scenarioIdentity: 'clinic', question: 'A new polyclinic',
    configuration: createDefaultConfiguration('A new polyclinic'), evidence: null, experiment: null });
  assert.ok(clinic.nodes.some(node => node.category === 'assumption' && node.properties.location === null));
  assert.ok(clinic.nodes.some(node => node.category === 'assumption' && node.properties.serviceScope === 'scope-unconfirmed'));
  const generic = api.appendExperimentGraph(null, { scenarioIdentity: 'school', question: 'A school policy',
    configuration: { kind: 'generic', horizonYears: 5, notes: 'Check local context', researchFocus: 'School attendance',
      hypotheses: ['Attendance might change'], namedAssumptions: [{ id: 'no-budget', name: 'Budget unchanged', statement: 'The school budget remains unchanged.' }] }, evidence: null, experiment: null });
  const hypothesis = generic.nodes.find(node => node.description === 'Attendance might change');
  assert.equal(hypothesis?.category, 'assumption');
  assert.equal(hypothesis?.provenance.kind, 'user-authored');
  assert.ok(generic.nodes.some(node => node.label === 'Budget unchanged' && node.provenance.kind === 'user-authored'));
});

test('existing calculated MRT graph nodes, edges and execution identity survive the projection unchanged', async () => {
  assert.ok(api, 'experiment graph projection API is required');
  const question = 'Build a new MRT line';
  const plan = await createScenarioPlan({ version: 1, clientRequestId: 'graph-mrt', question },
    { version: 1, intent: 'mrt-line', capabilityId: 'mrt-accessibility-v1' });
  const intervention = { schemaVersion: 1, id: 'EXPERIMENTGRAPH', name: 'Explicit graph fixture service', direction: 'bidirectional',
    stations: [{ kind: 'existing', stationId: 'NS4', transferWalkSeconds: 180 }, { kind: 'existing', stationId: 'NE16', transferWalkSeconds: 180 }],
    segments: [{ from: 'NS4', to: 'NE16', runSeconds: 300, dwellSeconds: 30 }],
    assumptions: { timingBasis: 'explicit-seconds', opening: 'assumed-open-on-service-date', construction: 'not-modelled', rationale: 'Explicit illustrative test timing.' } };
  const result = runMapSimulation({ serviceDate: '2026-10-27', intervention,
    journeys: [{ origin: 'NS4', destination: 'NE16' }] });
  const base = buildKnowledgeGraph({ scenarioIdentity: 'current-mrt', question, geometry, plan, catalog: getNetworkCatalog('2026-10-27'),
    mrt: { scenarioIdentity: 'current-mrt', executionIdentity: 'mrt-execution-1', result } });
  const before = JSON.stringify(base);
  const graph = api.appendExperimentGraph(base, { scenarioIdentity: base.scenarioIdentity, question,
    configuration: createDefaultConfiguration(question, 'mrt-line'), evidence: null, experiment: null });
  assert.deepEqual(graph.nodes.slice(0, base.nodes.length), base.nodes);
  assert.deepEqual(graph.edges.slice(0, base.edges.length), base.edges);
  assert.equal(graph.executionIdentity, 'mrt-execution-1');
  assert.equal(JSON.stringify(base), before);
});

test('existing calculated AAC graph nodes, edges and source provenance survive the projection unchanged', async () => {
  assert.ok(api, 'experiment graph projection API is required');
  const question = 'What if a new AAC opened in Bukit Merah?';
  const plan = await createScenarioPlan({ version: 1, clientRequestId: 'graph-aac', question },
    { version: 1, intent: 'aac', capabilityId: 'aac-accessibility-v1' });
  const result = await calculateEldercare(createDefaultEldercareRequest('graph-aac'));
  const base = buildKnowledgeGraph({ scenarioIdentity: 'current-aac', question, geometry, plan, catalog: null,
    facilities: getEldercareFacilities(), aac: { scenarioIdentity: 'current-aac', executionIdentity: 'aac-execution-1', result } });
  const graph = api.appendExperimentGraph(base, { scenarioIdentity: base.scenarioIdentity, question,
    configuration: createDefaultConfiguration(question, 'aac'), evidence: null, experiment: null });
  assert.deepEqual(graph.nodes.slice(0, base.nodes.length), base.nodes);
  assert.deepEqual(graph.edges.slice(0, base.edges.length), base.edges);
  assert.equal(graph.executionIdentity, 'aac-execution-1');
});

test('projection rejects a base from another scenario and avoids node or edge identifier collisions', () => {
  assert.ok(api, 'experiment graph projection API is required');
  const base = buildKnowledgeGraph({ scenarioIdentity: 'current', question, geometry, plan: null, catalog: null });
  assert.throws(() => api.appendExperimentGraph(base, { scenarioIdentity: 'other', question, configuration, evidence: null, experiment: null }), /identity|scenario/i);
  const first = api.appendExperimentGraph(base, { scenarioIdentity: 'current', question, configuration, evidence: null, experiment: null });
  const second = api.appendExperimentGraph(first, { scenarioIdentity: 'current', question, configuration, evidence: null, experiment: null });
  const identities = [...second.nodes, ...second.edges].map(item => item.id);
  assert.equal(new Set(identities).size, identities.length);
  assert.deepEqual(second.nodes.slice(0, first.nodes.length), first.nodes);
  assert.deepEqual(second.edges.slice(0, first.edges.length), first.edges);
  assert.deepEqual(parseKnowledgeGraph(second), second);
});

async function evidenceFixture() {
  const evidenceScenarioIdentity = await scenarioIdentityFor(question);
  const evidence = await createReplayEvidence({ scenarioIdentity: evidenceScenarioIdentity, question, topic: 'asean', researchAttemptId: 'graph-evidence-1' });
  return { scenarioIdentity: 'canonical-current-graph-identity', question, configuration, evidence, evidenceScenarioIdentity, experiment: null };
}

test('verified replay appends source-backed findings, supporting excerpts and explicit evidence gaps', async () => {
  assert.ok(api, 'experiment graph projection API is required');
  const context = await evidenceFixture();
  const base = buildKnowledgeGraph({ scenarioIdentity: context.scenarioIdentity, question, geometry, plan: null, catalog: null });
  const before = JSON.stringify({ base, context });
  const graph = api.appendExperimentGraph(base, context);
  assert.deepEqual(graph.nodes.slice(0, base.nodes.length), base.nodes);
  assert.deepEqual(graph.edges.slice(0, base.edges.length), base.edges);
  for (const source of context.evidence.sources) {
    const projected = graph.nodes.find(node => node.category === 'source' && node.properties.sourceId === source.id);
    assert.ok(projected);
    assert.equal(projected.provenance.kind, 'source-backed');
    assert.equal(projected.provenance.url, source.url);
    assert.equal(projected.properties.verifiedAt, source.verifiedAt);
    assert.equal(projected.properties.publishedAt, source.publishedAt);
    assert.ok(projected.details?.includes(source.excerpt));
    assert.equal(projected.properties.retrievalMode, 'verified-replay');
  }
  for (const finding of context.evidence.findings) {
    const projected = graph.nodes.find(node => node.properties.findingId === finding.id);
    assert.ok(projected);
    assert.equal(projected.category, 'planning');
    assert.equal(projected.description, finding.statement);
    assert.equal(projected.provenance.kind, 'source-backed');
    assert.ok(projected.details?.includes(finding.excerpt));
    const sourceNode = graph.nodes.find(node => node.properties.sourceId === finding.sourceId && node.category === 'source')!;
    assert.ok(graph.edges.some(edge => edge.source === projected.id && edge.target === sourceNode.id && edge.relationship === 'supported-by'));
  }
  for (const gap of context.evidence.unknowns) assert.ok(graph.nodes.some(node => node.category === 'limitation' && node.description === gap));
  assert.ok(!graph.limitations.some(item => item.includes('no document-retrieval')));
  assert.ok(graph.limitations.some(item => item.includes('no stakeholder-simulation')));
  assert.ok(graph.nodes.every(node => node.category !== 'result'));
  assert.deepEqual(parseKnowledgeGraph(graph), graph);
  assert.equal(JSON.stringify({ base, context }), before);
});

test('inference, hypothetical assumptions and unresolved questions retain their distinct provenance', async () => {
  assert.ok(api, 'experiment graph projection API is required');
  const context = await evidenceFixture();
  const first = context.evidence.findings[0];
  const evidence = structuredClone(context.evidence);
  evidence.findings.push(
    { ...first, id: 'inference', statement: 'A topic for further institutional analysis.', classification: 'inference' },
    { ...first, id: 'user-hypothesis', statement: 'Assume institutional arrangements can be negotiated.', classification: 'hypothetical-assumption' },
    { ...first, id: 'unresolved', statement: 'What negotiations would be needed?', classification: 'unresolved-question' },
  );
  evidence.snapshotIdentity = await computeEvidenceSnapshotIdentity(evidence);
  evidence.bundleId = `evidence-${evidence.snapshotIdentity.slice(7)}`;
  const graph = api.appendExperimentGraph(null, { ...context, evidence });
  for (const [findingId, category, provenance] of [
    ['inference', 'planning', 'planning-only'], ['user-hypothesis', 'assumption', 'user-authored'], ['unresolved', 'limitation', 'planning-only'],
  ]) {
    const projected = graph.nodes.find(node => node.properties.findingId === findingId);
    assert.equal(projected?.category, category);
    assert.equal(projected?.provenance.kind, provenance);
    assert.ok(!graph.edges.some(edge => edge.source === projected?.id && edge.relationship === 'supported-by'));
    assert.ok(graph.edges.some(edge => edge.source === projected?.id && edge.relationship === 'uses'));
  }
});

test('evidence binding cannot confuse canonical graph identity with hashed research identity', async () => {
  assert.ok(api, 'experiment graph projection API is required');
  const context = await evidenceFixture();
  const { evidenceScenarioIdentity: _binding, ...unbound } = context;
  assert.throws(() => api.appendExperimentGraph(null, unbound), /identity|binding/i);
  assert.throws(() => api.appendExperimentGraph(null, { ...context, evidenceScenarioIdentity: `scenario-${'0'.repeat(64)}` }), /identity|evidence/i);
  assert.throws(() => api.appendExperimentGraph(null, { ...context, question: 'A completely different question' }), /question|evidence/i);
  const duplicate = structuredClone(context.evidence);
  duplicate.sources.push(duplicate.sources[0]);
  assert.throws(() => api.appendExperimentGraph(null, { ...context, evidence: duplicate }), /evidence/i);
  const unsupported = structuredClone(context.evidence);
  unsupported.findings[0].sourceId = 'invented-source';
  assert.throws(() => api.appendExperimentGraph(null, { ...context, evidence: unsupported }), /evidence/i);
});

test('saved snapshot projection verifies question, configuration and actual geometry correlation', async () => {
  assert.ok(api, 'experiment graph projection API is required');
  const context = await evidenceFixture();
  const experiment = await createExperiment({ question, configuration, evidence: context.evidence, experimentId: 'graph-record-1' });
  const graph = api.appendExperimentGraph(null, { ...context, evidence: null, experiment });
  const saved = graph.nodes.find(node => node.category === 'planning' && node.properties.experimentId === 'graph-record-1');
  assert.ok(saved);
  assert.equal(saved.properties.executionStatus, 'not-executed');
  assert.equal(saved.properties.archived, false);
  assert.ok(graph.edges.some(edge => edge.source === saved.id && edge.relationship === 'contains'));
  assert.throws(() => api.appendExperimentGraph(null, { ...context, experiment, question: 'Another question' }), /question|snapshot/i);
  assert.throws(() => api.appendExperimentGraph(null, { ...context, experiment, configuration: { ...configuration, horizonYears: 10 } }), /configuration|snapshot/i);
  const geometryContext = await createGeometryContext(geometry, 1);
  assert.throws(() => api.appendExperimentGraph(null, { ...context, experiment, geometryContext }), /geometry|snapshot/i);
  const copiedEvidence = structuredClone(context.evidence);
  copiedEvidence.researchAttemptId = 'different-attempt';
  assert.throws(() => api.appendExperimentGraph(null, { ...context, experiment, evidence: copiedEvidence }), /evidence|snapshot/i);
});

test('archived experiments form an explicitly labelled standalone graph with no current calculated outputs', async () => {
  assert.ok(api, 'experiment graph projection API is required');
  const context = await evidenceFixture();
  const experiment = await createExperiment({ question, configuration, evidence: context.evidence, experimentId: 'archived-record' });
  const graph = api.appendExperimentGraph(null, { ...context, experiment, archived: true });
  assert.ok(graph.nodes.some(node => node.category === 'scenario' && node.properties.archived === true && /archived/i.test(node.label)));
  assert.ok(graph.nodes.some(node => node.category === 'planning' && node.properties.experimentId === 'archived-record' && node.properties.archived === true));
  assert.ok(graph.limitations.some(item => /archived/i.test(item)));
  assert.equal(graph.executionIdentity, undefined);
  assert.ok(graph.nodes.every(node => node.category !== 'result'));
  const base = buildKnowledgeGraph({ scenarioIdentity: context.scenarioIdentity, question, geometry, plan: null, catalog: null });
  assert.throws(() => api.appendExperimentGraph(base, { ...context, experiment, archived: true }), /standalone|archived/i);
  assert.throws(() => api.appendExperimentGraph(null, { ...context, archived: true }), /snapshot|archived/i);
});

test('a saved configuration with no evidence retains an explicit research gap', async () => {
  assert.ok(api, 'experiment graph projection API is required');
  const experiment = await createExperiment({ question, configuration, evidence: null, experimentId: 'unresearched-record' });
  const graph = api.appendExperimentGraph(null, { scenarioIdentity: experiment.scenarioIdentity, question, configuration, experiment, evidence: null, archived: true });
  const gap = graph.nodes.find(node => node.category === 'limitation' && node.properties.evidenceStatus === 'not-researched');
  assert.ok(gap, 'a missing evidence snapshot must remain an explicit research gap');
  assert.equal(gap.provenance.kind, 'planning-only');
  assert.ok(graph.edges.some(edge => edge.target === gap.id && edge.relationship === 'limited-by'));
  assert.ok(graph.nodes.every(node => node.category !== 'source' && !node.properties.findingId));
});

test('projection refuses an exceeded graph budget without changing the existing graph', () => {
  assert.ok(api, 'experiment graph projection API is required');
  const base = buildKnowledgeGraph({ scenarioIdentity: 'full', question, geometry, plan: null, catalog: null });
  const original = base.nodes[0];
  base.nodes = Array.from({ length: 1500 }, (_, index) => ({ ...structuredClone(original), id: `existing:${index}` }));
  const before = JSON.stringify(base);
  assert.throws(() => api.appendExperimentGraph(base, { scenarioIdentity: 'full', question, configuration, evidence: null, experiment: null }), /budget/i);
  assert.equal(JSON.stringify(base), before);
});

test('experiment graph imports in a browser-only boundary without server modules or simulation engines', () => {
  const url = new URL('../../experiments/graph.ts', import.meta.url).href;
  const script = `import {registerHooks,builtinModules} from 'node:module';registerHooks({resolve(specifier,context,next){if(specifier.startsWith('node:')||builtinModules.includes(specifier)||/[\\\\/]server[\\\\/]|prototype[\\\\/].*(?:simulation|engine)/.test(specifier))throw new Error('Server or engine import crossed experiment graph boundary');return next(specifier,context);}});await import(${JSON.stringify(url)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
