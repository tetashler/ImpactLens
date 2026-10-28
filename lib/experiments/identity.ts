import { parseScenarioGeometry, type ScenarioGeometry } from '../plots/geometry.ts';
import { parseConfiguration, type ExperimentConfigurationV1 } from './configuration.ts';
import { assertJsonData, canonical, digest, ensure, freezeSnapshot, hash, object, text } from './validation.ts';

export interface ExperimentGeometryContextV1 {
  identity: string; revision: number; summary: string; canonicalContent: string;
}
export const EXPERIMENT_GEOMETRY_MAX_CHARACTERS = 150_000;

function parseGeometrySnapshot(value: unknown): ScenarioGeometry {
  assertJsonData(value);
  const geometry = parseScenarioGeometry(value);
  ensure(canonical(geometry).length <= EXPERIMENT_GEOMETRY_MAX_CHARACTERS, 'Geometry snapshot exceeds the experiment size limit');
  return geometry;
}

function summary(geometry: ScenarioGeometry): string {
  const points = geometry.features.filter(feature => feature.kind === 'point').length;
  return `${geometry.features.length} drawn features: ${points} points, ${geometry.features.length - points} lines. User-drawn context; not validated engine inputs.`;
}

export function parseGeometryContext(value: unknown): ExperimentGeometryContextV1 {
  const context = object(value, ['identity', 'revision', 'summary', 'canonicalContent']);
  hash(context.identity, 'geometry-');
  ensure(typeof context.revision === 'number' && Number.isSafeInteger(context.revision) && context.revision >= 0 && context.revision <= 1_000_000_000, 'Invalid geometry revision');
  const content = text(context.canonicalContent, EXPERIMENT_GEOMETRY_MAX_CHARACTERS);
  const geometry = parseGeometrySnapshot(JSON.parse(content));
  ensure(content === canonical(geometry) && context.summary === summary(geometry), 'Geometry snapshot must contain canonical actual plot context');
  return freezeSnapshot(context) as unknown as ExperimentGeometryContextV1;
}

export async function validateGeometryContext(value: unknown): Promise<ExperimentGeometryContextV1> {
  const context = parseGeometryContext(value);
  ensure(context.identity === await digest('geometry-', JSON.parse(context.canonicalContent)), 'Geometry snapshot identity mismatch');
  return context;
}

export async function createGeometryContext(value: ScenarioGeometry, revision: number): Promise<ExperimentGeometryContextV1> {
  const geometry = parseGeometrySnapshot(value);
  return parseGeometryContext({ identity: await digest('geometry-', geometry), revision, summary: summary(geometry), canonicalContent: canonical(geometry) });
}

export async function configurationIdentity(value: ExperimentConfigurationV1 | unknown): Promise<string> {
  return digest('config-', parseConfiguration(value));
}

/** Scenario identity deliberately excludes configuration, research attempts and record time. */
export async function scenarioIdentityFor(question: string, geometryContext?: ExperimentGeometryContextV1 | null): Promise<string> {
  text(question, 2000);
  const geometry = geometryContext ? await validateGeometryContext(geometryContext) : null;
  return digest('scenario-', { version: 1, question, geometryIdentity: geometry?.identity ?? null });
}
