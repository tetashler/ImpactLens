import { parseEvidenceBundle, validateEvidenceBundle, type EvidenceBundleV1 } from '../evidence/index.ts';
import { parseConfiguration, type ExperimentConfigurationV1 } from './configuration.ts';
import { configurationIdentity, parseGeometryContext, scenarioIdentityFor, validateGeometryContext, type ExperimentGeometryContextV1 } from './identity.ts';
import { canonical, ensure, freezeSnapshot, hash, identifier, object, text, timestamp } from './validation.ts';
import { checkGeometryReferences } from './geometry-references.ts';

export const EXPERIMENT_VERSION = 1;
export const EXPERIMENT_LIMITS = Object.freeze({ records: 24, recordBytes: 220_000, registryBytes: 2_000_000 });
export const EXPERIMENT_EXECUTION = Object.freeze({ status: 'not-executed' as const, reason: 'Stakeholder simulation not yet available.' as const });
export interface ScenarioExperimentV1 {
  version: 1; experimentId: string; scenarioIdentity: string; question: string; createdAt: string;
  configuration: ExperimentConfigurationV1; configurationIdentity: string;
  geometryContext: ExperimentGeometryContextV1 | null; evidence: EvidenceBundleV1 | null;
  execution: typeof EXPERIMENT_EXECUTION;
}
export interface CreateExperimentOptions {
  question: string; configuration: ExperimentConfigurationV1; evidence: EvidenceBundleV1 | null;
  geometryContext?: ExperimentGeometryContextV1 | null; experimentId?: string; createdAt?: string;
}

/** Structural parser only. Use validateExperiment at every asynchronous trust boundary. */
export function parseExperiment(value: unknown): ScenarioExperimentV1 {
  const record = object(value, ['version', 'experimentId', 'scenarioIdentity', 'question', 'createdAt', 'configuration', 'configurationIdentity', 'geometryContext', 'evidence', 'execution']);
  ensure(record.version === 1, 'Unsupported experiment version');
  identifier(record.experimentId); hash(record.scenarioIdentity, 'scenario-'); text(record.question, 2000); timestamp(record.createdAt);
  const configuration = parseConfiguration(record.configuration);
  hash(record.configurationIdentity, 'config-');
  const geometryContext = record.geometryContext === null ? null : parseGeometryContext(record.geometryContext);
  const evidence = record.evidence === null ? null : parseEvidenceBundle(record.evidence, { scenarioIdentity: record.scenarioIdentity as string });
  const execution = object(record.execution, ['status', 'reason']);
  ensure(execution.status === EXPERIMENT_EXECUTION.status && execution.reason === EXPERIMENT_EXECUTION.reason, 'Experiments cannot claim stakeholder execution');
  checkGeometryReferences(configuration, geometryContext);
  const parsed = { ...record, configuration, geometryContext, evidence } as unknown as ScenarioExperimentV1;
  ensure(new TextEncoder().encode(canonical(parsed)).byteLength <= EXPERIMENT_LIMITS.recordBytes, 'Experiment record exceeds the size limit');
  return freezeSnapshot(parsed);
}

export async function validateExperiment(value: unknown): Promise<ScenarioExperimentV1> {
  const record = parseExperiment(value);
  ensure(record.configurationIdentity === await configurationIdentity(record.configuration), 'Configuration identity mismatch');
  ensure(record.scenarioIdentity === await scenarioIdentityFor(record.question, record.geometryContext), 'Scenario identity mismatch');
  if (record.geometryContext) await validateGeometryContext(record.geometryContext);
  if (record.evidence) await validateEvidenceBundle(record.evidence, { scenarioIdentity: record.scenarioIdentity });
  return record;
}

export async function createExperiment(options: CreateExperimentOptions): Promise<ScenarioExperimentV1> {
  const input = object(options, ['question', 'configuration', 'evidence', 'geometryContext', 'experimentId', 'createdAt'], ['question', 'configuration', 'evidence']);
  const question = text(input.question, 2000);
  const configuration = parseConfiguration(input.configuration);
  const geometryContext = input.geometryContext === undefined || input.geometryContext === null ? null : await validateGeometryContext(input.geometryContext);
  const scenarioIdentity = await scenarioIdentityFor(question, geometryContext);
  const evidence = input.evidence === null ? null : await validateEvidenceBundle(input.evidence, { scenarioIdentity });
  return validateExperiment({ version: 1, experimentId: input.experimentId ?? `experiment-${globalThis.crypto.randomUUID()}`,
    scenarioIdentity, question, createdAt: input.createdAt ?? new Date().toISOString(), configuration,
    configurationIdentity: await configurationIdentity(configuration), geometryContext, evidence, execution: EXPERIMENT_EXECUTION });
}
