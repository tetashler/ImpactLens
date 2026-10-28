import { parseEvidenceBundle, validateEvidenceBundle, type EvidenceBundleV1 } from '../evidence/index.ts';
import { parseConfiguration, type ExperimentConfigurationV1, type HorizonYears, type StakeholderFocus } from './configuration.ts';
import { EXPERIMENT_EXECUTION, validateExperiment, type ScenarioExperimentV1 } from './contract.ts';
import { configurationIdentity, parseGeometryContext, scenarioIdentityFor, type ExperimentGeometryContextV1 } from './identity.ts';
import { canonical, digest, ensure, freezeSnapshot, hash, identifier, object, strings, text } from './validation.ts';
import { checkGeometryReferences } from './geometry-references.ts';

type Immutable<T> = T extends readonly (infer U)[] ? readonly Immutable<U>[] : T extends object ? { readonly [K in keyof T]: Immutable<T[K]> } : T;
interface ScenarioExperimentInputDataV1 {
  version: 1; sourceExperimentId: string; scenarioIdentity: string; question: string;
  configuration: ExperimentConfigurationV1; configurationIdentity: string; geometryContext: ExperimentGeometryContextV1 | null;
  evidence: EvidenceBundleV1 | null; evidenceSnapshotIdentity: string | null; limitations: string[];
  horizonYears: HorizonYears; stakeholderFocus: StakeholderFocus[]; researchFocus: string;
  execution: typeof EXPERIMENT_EXECUTION; executionInputIdentity: string;
}
export type ScenarioExperimentInputV1 = Immutable<ScenarioExperimentInputDataV1>;

function inputLimitations(configuration: ExperimentConfigurationV1, evidence: EvidenceBundleV1 | null): string[] {
  return [...new Set([
    'Research and configuration only. No stakeholder simulation has been executed.',
    'Future synthetic stakeholder outputs would be hypothetical and would not represent public opinion.',
    ...(evidence ? ['The embedded evidence is a verified replay snapshot, not a live or exhaustive evidence review.'] : ['No evidence snapshot attached. Research is still required.']),
    ...(configuration.kind === 'mrt' || configuration.kind === 'aac' ? ['MRT/AAC fields retain plot and plan references only. Timing, anchors and complete engine inputs are not included; use the existing calculators for validated engine results.'] : []),
    ...(configuration.kind === 'polyclinic' ? ['No registered quantitative polyclinic model or validated site/service capacity is provided.'] : []),
    ...(configuration.kind === 'asean' ? ['Withdrawal mechanisms, transition periods and trade arrangements are scenario assumptions, not established legal or economic outcomes.'] : []),
    ...(evidence?.limitations ?? []),
  ])];
}

function identityContent(input: ScenarioExperimentInputDataV1): unknown {
  return { version: input.version, scenarioIdentity: input.scenarioIdentity, question: input.question,
    configurationIdentity: input.configurationIdentity, geometryIdentity: input.geometryContext?.identity ?? null,
    evidenceSnapshotIdentity: input.evidenceSnapshotIdentity, limitations: input.limitations,
    horizonYears: input.horizonYears, stakeholderFocus: input.stakeholderFocus, researchFocus: input.researchFocus, execution: input.execution };
}

/** Frozen serialisable input for a future consumer. This function never invokes agents. */
export async function createScenarioExperimentInput(value: ScenarioExperimentV1): Promise<ScenarioExperimentInputV1> {
  const record = await validateExperiment(value);
  const input: ScenarioExperimentInputDataV1 = {
    version: 1, sourceExperimentId: record.experimentId, scenarioIdentity: record.scenarioIdentity, question: record.question,
    configuration: record.configuration, configurationIdentity: record.configurationIdentity, geometryContext: record.geometryContext,
    evidence: record.evidence, evidenceSnapshotIdentity: record.evidence?.snapshotIdentity ?? null,
    limitations: inputLimitations(record.configuration, record.evidence), horizonYears: record.configuration.horizonYears,
    stakeholderFocus: record.configuration.kind === 'asean' ? [...record.configuration.stakeholderFocus] : [],
    researchFocus: record.configuration.kind === 'generic' ? record.configuration.researchFocus : '',
    execution: EXPERIMENT_EXECUTION, executionInputIdentity: `input-${'0'.repeat(64)}`,
  };
  input.executionInputIdentity = await digest('input-', identityContent(input));
  return validateScenarioExperimentInput(input);
}

/** Validates hashes and duplicated semantic fields, not merely a plausible input shape. */
export async function validateScenarioExperimentInput(value: unknown): Promise<ScenarioExperimentInputV1> {
  const r = object(value, ['version', 'sourceExperimentId', 'scenarioIdentity', 'question', 'configuration', 'configurationIdentity', 'geometryContext', 'evidence', 'evidenceSnapshotIdentity', 'limitations', 'horizonYears', 'stakeholderFocus', 'researchFocus', 'execution', 'executionInputIdentity']);
  ensure(r.version === 1, 'Unsupported future experiment input version');
  identifier(r.sourceExperimentId); hash(r.scenarioIdentity, 'scenario-'); text(r.question, 2000);
  const configuration = parseConfiguration(r.configuration);
  hash(r.configurationIdentity, 'config-');
  const geometryContext = r.geometryContext === null ? null : parseGeometryContext(r.geometryContext);
  checkGeometryReferences(configuration, geometryContext);
  const evidence = r.evidence === null ? null : parseEvidenceBundle(r.evidence, { scenarioIdentity: r.scenarioIdentity as string });
  if (r.evidenceSnapshotIdentity !== null) hash(r.evidenceSnapshotIdentity, 'sha256-');
  hash(r.executionInputIdentity, 'input-');
  const limitations = strings(r.limitations, 40, 2000), focus = strings(r.stakeholderFocus, 3, 40);
  text(r.researchFocus, 1000, true);
  ensure(canonical(limitations) === canonical(inputLimitations(configuration, evidence)), 'Future input limitations cannot be removed or rewritten');
  ensure(r.horizonYears === configuration.horizonYears && canonical(focus) === canonical(configuration.kind === 'asean' ? configuration.stakeholderFocus : [])
    && r.researchFocus === (configuration.kind === 'generic' ? configuration.researchFocus : ''), 'Future input focus and horizon must match the configuration');
  const execution = object(r.execution, ['status', 'reason']);
  ensure(canonical(execution) === canonical(EXPERIMENT_EXECUTION), 'Future input cannot claim executed agents');
  const parsed = { ...r, configuration, geometryContext, evidence, limitations } as unknown as ScenarioExperimentInputDataV1;
  ensure(parsed.configurationIdentity === await configurationIdentity(configuration), 'Future input configuration identity mismatch');
  ensure(parsed.scenarioIdentity === await scenarioIdentityFor(parsed.question, geometryContext), 'Future input scenario identity mismatch');
  if (evidence) await validateEvidenceBundle(evidence, { scenarioIdentity: parsed.scenarioIdentity });
  ensure(parsed.evidenceSnapshotIdentity === (evidence?.snapshotIdentity ?? null), 'Future input evidence identity mismatch');
  ensure(parsed.executionInputIdentity === await digest('input-', identityContent(parsed)), 'Future execution input identity mismatch');
  return freezeSnapshot(parsed);
}
