import { GRAPH_LIMITS, parseKnowledgeGraph, type KnowledgeGraph, type KnowledgeNode, type KnowledgeProvenance,
  type KnowledgeRelationship, type NodeCategory } from '../knowledge-graph/contract.ts';
import { parseEvidenceBundle, type EvidenceBundleV1 } from '../evidence/index.ts';
import { parseConfiguration, type ExperimentConfigurationV1 } from './configuration.ts';
import { parseGeometryContext, type ExperimentGeometryContextV1 } from './identity.ts';
import { parseExperiment, type ScenarioExperimentV1 } from './contract.ts';
import { canonical, ensure, hash, text } from './validation.ts';

export interface ExperimentGraphContext {
  scenarioIdentity: string;
  question: string;
  configuration: ExperimentConfigurationV1;
  evidence: EvidenceBundleV1 | null;
  experiment: ScenarioExperimentV1 | null;
  archived?: boolean;
  /** UI execution availability only; never changes a saved record's historical status. */
  executionAvailable?: boolean;
  /** Exact accepted research binding, distinct from the existing engine graph identity. */
  evidenceScenarioIdentity?: string;
  geometryContext?: ExperimentGeometryContextV1 | null;
}

const user = (reference: string): KnowledgeProvenance => ({ kind: 'user-authored', reference });
const planning = (reference: string): KnowledgeProvenance => ({ kind: 'planning-only', reference });

/** Read-only lineage projection. Never retrieves evidence or executes a model. */
export function appendExperimentGraph(base: KnowledgeGraph | null, context: ExperimentGraphContext): KnowledgeGraph {
  text(context.scenarioIdentity, GRAPH_LIMITS.identity);
  text(context.question, 2000);
  ensure(context.archived === undefined || typeof context.archived === 'boolean', 'Invalid archive flag');
  ensure(context.executionAvailable === undefined || typeof context.executionAvailable === 'boolean', 'Invalid execution availability flag');
  ensure(!context.archived || (base === null && context.experiment !== null), 'Archived experiments require a standalone saved-snapshot graph');
  const configuration = parseConfiguration(context.configuration);
  const geometry = context.geometryContext ? parseGeometryContext(context.geometryContext) : null;
  if (context.evidenceScenarioIdentity !== undefined) hash(context.evidenceScenarioIdentity, 'scenario-');
  const graph: KnowledgeGraph = base ? parseKnowledgeGraph(base) : {
    version: 1, scenarioIdentity: context.scenarioIdentity, nodes: [], edges: [], limitations: [],
  };
  if (context.executionAvailable) graph.limitations = graph.limitations.map(item =>
    item === 'This explorer has no document-retrieval or stakeholder-simulation executor.' || item === 'This explorer has no stakeholder-simulation executor.'
      ? 'This graph does not retrieve documents or execute stakeholder turns; separate validated execution is required.' : item);
  ensure(graph.scenarioIdentity === context.scenarioIdentity, 'Knowledge graph scenario identity mismatch');
  const experiment = context.experiment ? parseExperiment(context.experiment) : null;
  if (experiment) {
    ensure(experiment.question === context.question, 'Experiment snapshot question mismatch');
    ensure(canonical(experiment.configuration) === canonical(configuration), 'Experiment snapshot configuration mismatch');
    if (!context.archived || context.geometryContext !== undefined)
      ensure(canonical(experiment.geometryContext) === canonical(geometry), 'Experiment snapshot geometry mismatch');
    if (context.evidenceScenarioIdentity !== undefined)
      ensure(experiment.scenarioIdentity === context.evidenceScenarioIdentity, 'Experiment snapshot scenario identity mismatch');
  }
  const rawEvidence = context.evidence ?? experiment?.evidence ?? null;
  const expectedEvidenceIdentity = context.evidenceScenarioIdentity ?? experiment?.scenarioIdentity;
  ensure(!rawEvidence || expectedEvidenceIdentity, 'Evidence requires an exact accepted research identity binding');
  const evidence = rawEvidence ? parseEvidenceBundle(rawEvidence, { scenarioIdentity: expectedEvidenceIdentity }) : null;
  if (evidence) {
    ensure(evidence.queries.includes(context.question), 'Evidence question does not match the research scenario');
    if (experiment) ensure(canonical(evidence) === canonical(experiment.evidence), 'Experiment snapshot evidence mismatch');
  }

  // Use a fresh namespace, including edges in the collision check: Cytoscape shares it.
  const occupied = new Set([...graph.nodes, ...graph.edges].map(item => item.id));
  let namespace = 0;
  while ([...occupied].some(id => id.startsWith(`experiment-lab:${namespace}:`))) namespace++;
  const prefix = `experiment-lab:${namespace}:`;
  function node(key: string, label: string, category: NodeCategory, description: string, provenance: KnowledgeProvenance,
    properties: KnowledgeNode['properties'] = {}, limitations: string[] = [], details?: string): string {
    ensure(graph.nodes.length < GRAPH_LIMITS.nodes, 'Experiment graph entity budget exceeded');
    const id = `${prefix}${key}`;
    ensure(!occupied.has(id), 'Duplicate experiment graph identity'); occupied.add(id);
    graph.nodes.push({ id, label, category, description, provenance, properties, limitations, ...(details ? { details } : {}) });
    return id;
  }
  function edge(source: string, target: string, relationship: KnowledgeRelationship, description: string, provenance: KnowledgeProvenance): void {
    ensure(graph.edges.length < GRAPH_LIMITS.edges, 'Experiment graph relationship budget exceeded');
    const id = `${prefix}edge:${graph.edges.length}`;
    ensure(!occupied.has(id), 'Duplicate experiment graph identity'); occupied.add(id);
    graph.edges.push({ id, source, target, relationship, description, provenance, directed: true });
  }
  const scenario = node('scenario', context.archived ? 'Archived research scenario' : 'Research scenario', 'scenario', context.question,
    user(context.archived ? 'Archived experiment question' : 'Current experiment question'), { configurationKind: configuration.kind, archived: !!context.archived });
  const originalScenario = base?.nodes.find(item => item.category === 'scenario');
  if (originalScenario) edge(originalScenario.id, scenario, 'declares', 'The current scenario declares these research assumptions; no execution is implied.', user('Current experiment inputs'));

  let assumptionIndex = 0;
  function assumption(label: string, description: string, properties: KnowledgeNode['properties'] = {}): void {
    const id = node(`assumption:${assumptionIndex++}`, label, 'assumption', description,
      user('Explicit experiment configuration; user hypothesis, not observed evidence'), properties);
    edge(scenario, id, 'uses', 'This research scenario uses an explicitly configured user assumption.', user('Experiment configuration'));
  }
  assumption('Research horizon', `The user selected a ${configuration.horizonYears} year research horizon; this does not forecast an outcome.`, { horizonYears: configuration.horizonYears });
  if (configuration.notes) assumption('User notes', configuration.notes, { configurationField: 'notes' });
  if (configuration.kind === 'asean') {
    assumption('Withdrawal timing', `Hypothetical withdrawal timing: ${configuration.withdrawalTiming}. No legal withdrawal procedure is established by this choice.`, { withdrawalTiming: configuration.withdrawalTiming });
    assumption('Transition period', configuration.transitionMonths === null ? 'The transition period remains unconfirmed.' : `Hypothetical transition period: ${configuration.transitionMonths} months.`, { transitionMonths: configuration.transitionMonths });
    assumption('Trade arrangements', `User scenario assumption: ${configuration.tradeArrangements}. Future treaty continuity or replacement is unverified.`, { tradeArrangements: configuration.tradeArrangements });
    for (const focus of configuration.stakeholderFocus) assumption('Stakeholder research focus', `Research focus: ${focus}. This records a category to investigate, not the views or predicted behaviour of its members.`, { stakeholderFocus: focus });
  } else if (configuration.kind === 'polyclinic') {
    assumption('Proposed polyclinic site', configuration.location ? 'User-selected hypothetical polyclinic location. Site and service feasibility are unconfirmed.' : 'No polyclinic location has been selected.',
      configuration.location ? { latitude: configuration.location.lat, longitude: configuration.location.lon } : { location: null });
    assumption('Polyclinic service scope', `User configuration: ${configuration.serviceScope}. Staffing, capacity and demand have not been established.`, { serviceScope: configuration.serviceScope });
  } else if (configuration.kind === 'generic') {
    if (configuration.researchFocus) assumption('Research focus', configuration.researchFocus, { configurationField: 'researchFocus' });
    for (const hypothesis of configuration.hypotheses) assumption('User hypothesis', hypothesis, { classification: 'hypothetical-assumption' });
    for (const named of configuration.namedAssumptions) assumption(named.name, named.statement, { assumptionId: named.id });
  } else {
    const references: KnowledgeNode['properties'] = { planId: configuration.planId, executionStatus: configuration.executionStatus };
    if (configuration.kind === 'mrt') { references.routeId = configuration.routeId; references.stationPointCount = configuration.stationPointIds.length; }
    else references.sitePointId = configuration.sitePointId;
    assumption(configuration.kind === 'mrt' ? 'MRT input references' : 'AAC input references', 'These are research snapshot input references. Existing engine execution and calculated outputs remain separate.', references);
  }
  const pending = node('execution', context.executionAvailable ? 'Saved input not executed' : 'Stakeholder simulation not yet available', 'limitation',
    context.executionAvailable
      ? 'This saved input does not contain an execution. An available separate stakeholder executor can consume a supported validated snapshot; this graph alone neither executes it nor claims a run exists.'
      : 'This research configuration has not executed stakeholder agents. No new effects or outcome metrics are calculated by this graph.', planning('Experiment execution boundary'), { executionStatus: 'not-executed' });
  edge(scenario, pending, 'limited-by', 'Saving a research experiment does not execute a stakeholder simulation.',
    planning(context.executionAvailable ? 'Saved input and separately validated run records have distinct ownership' : 'Phase 7D execution is unavailable'));

  let evidenceNode: string | null = null;
  if (evidence) {
    evidenceNode = node('evidence', 'Verified-source replay', 'planning',
      'A bounded historical source snapshot. This research attempt replayed previously checked excerpts; it did not retrieve or newly verify documents.',
      planning('Validated evidence bundle; historical replay, not live retrieval'), {
        bundleId: evidence.bundleId, snapshotIdentity: evidence.snapshotIdentity, researchAttemptId: evidence.researchAttemptId,
        createdAt: evidence.createdAt, mode: evidence.mode, status: evidence.status,
      });
    edge(scenario, evidenceNode, 'uses', 'The research scenario uses this historical evidence snapshot as context.', planning('Accepted research evidence binding'));
    const sourceNodes = new Map<string, string>();
    for (const [index, source] of evidence.sources.entries()) {
      const provenance: KnowledgeProvenance = { kind: 'source-backed', reference: `${source.publisher}; checked historical excerpt ${source.id}`, url: source.url };
      const id = node(`source:${index}`, source.title.slice(0, GRAPH_LIMITS.label), 'source',
        'Official source metadata and a short checked excerpt. The verification date belongs to this historical snapshot, not the current research attempt.',
        provenance, { sourceId: source.id, publisher: source.publisher, title: source.title, publishedAt: source.publishedAt,
          verifiedAt: source.verifiedAt, retrievalMode: source.retrievalMode, documentType: source.documentType, fetchStatus: source.fetchStatus },
        ['Only the recorded excerpt is supplied; this replay does not fetch the full document.'], `Checked excerpt: ${source.excerpt}`);
      sourceNodes.set(source.id, id);
      edge(evidenceNode, id, 'contains', 'The evidence snapshot contains this checked source reference.', provenance);
    }
    for (const [index, finding] of evidence.findings.entries()) {
      const sourceNode = sourceNodes.get(finding.sourceId);
      ensure(sourceNode, 'Evidence finding has no source node');
      const source = evidence.sources.find(item => item.id === finding.sourceId)!;
      const direct = finding.classification === 'directly-supported' || finding.classification === 'source-reported-estimate';
      const hypothetical = finding.classification === 'hypothetical-assumption';
      const unresolved = finding.classification === 'unresolved-question';
      const provenance: KnowledgeProvenance = direct
        ? { kind: 'source-backed', reference: `${finding.classification}; checked excerpt ${source.id}`, url: source.url }
        : hypothetical ? user('Explicit hypothetical assumption; the linked source does not establish it')
          : planning(unresolved ? 'Unresolved research question; linked source is context only' : 'Analyst inference; linked source is context, not direct support');
      const id = node(`finding:${index}`, hypothetical ? `Hypothetical assumption ${index + 1}` : unresolved ? `Unresolved question ${index + 1}` : `Evidence finding ${index + 1}`,
        hypothetical ? 'assumption' : unresolved ? 'limitation' : 'planning', finding.statement, provenance,
        { findingId: finding.id, sourceId: finding.sourceId, classification: finding.classification }, finding.limitations,
        `Classification: ${finding.classification}\n${direct ? 'Supporting' : 'Contextual'} excerpt: ${finding.excerpt}`);
      edge(evidenceNode, id, 'contains', 'The evidence snapshot records this explicitly classified statement.', provenance);
      edge(id, sourceNode, direct ? 'supported-by' : 'uses', direct ? 'The checked excerpt directly supports this recorded source statement.'
        : 'The statement uses this source as context only; the excerpt does not establish the inference, hypothesis or answer.', provenance);
      if (unresolved) edge(scenario, id, 'limited-by', 'This research question remains unresolved.', planning('Unresolved evidence question'));
    }
    for (const [index, gap] of evidence.unknowns.entries()) {
      const id = node(`gap:${index}`, `Evidence gap ${index + 1}`, 'limitation', gap, planning('Unknown in the accepted evidence snapshot'));
      edge(evidenceNode, id, 'limited-by', 'The source snapshot does not establish this information.', planning('Explicit evidence gap'));
    }
    for (const [index, limitation] of evidence.limitations.entries()) {
      const id = node(`evidence-limitation:${index}`, `Evidence limitation ${index + 1}`, 'limitation', limitation, planning('Accepted evidence snapshot limitations'));
      edge(evidenceNode, id, 'limited-by', 'The historical evidence snapshot preserves this limitation.', planning('Evidence scope and verification boundary'));
    }
    // The former combined warning predates the replay layer. Keep its simulation boundary.
    graph.limitations = graph.limitations.map(item => item === 'This explorer has no document-retrieval or stakeholder-simulation executor.'
      ? 'This explorer has no stakeholder-simulation executor.' : item);
    graph.limitations.push('Historical evidence is replayed from checked excerpts; this graph performs no live document retrieval or new source verification.');
  } else {
    const gap = node('missing-evidence', 'No evidence snapshot attached', 'limitation',
      'This configuration has no accepted evidence snapshot. Research is still required; missing evidence does not establish an outcome.',
      planning('Explicit missing evidence boundary'), { evidenceStatus: 'not-researched' });
    edge(scenario, gap, 'limited-by', 'The research scenario has no attached source review.', planning('Evidence has not been established'));
  }
  if (experiment) {
    const saved = node('snapshot', context.archived ? 'Archived experiment snapshot' : 'Saved experiment snapshot', 'planning',
      'Immutable saved configuration and evidence record. Saving preserves research assumptions; it does not execute stakeholder agents or produce new outcome metrics.',
      planning('Validated saved experiment record'), { experimentId: experiment.experimentId, configurationIdentity: experiment.configurationIdentity,
        scenarioIdentity: experiment.scenarioIdentity, createdAt: experiment.createdAt, executionStatus: experiment.execution.status, archived: !!context.archived });
    edge(saved, scenario, 'contains', 'The saved record contains this question and its explicit assumptions.', planning('Immutable snapshot lineage'));
    if (evidenceNode) edge(saved, evidenceNode, 'contains', 'The saved record contains this exact evidence snapshot.', planning('Immutable evidence snapshot lineage'));
  }
  if (context.archived) graph.limitations.push('Archived experiment: this standalone graph describes a saved research snapshot and does not represent current map state or current calculated results.');
  graph.limitations = [...new Set([...graph.limitations, 'Relationships describe declared assumptions and evidence lineage; graph connectivity does not establish causation.'])];
  return parseKnowledgeGraph(graph);
}
