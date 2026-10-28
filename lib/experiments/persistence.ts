import { EXPERIMENT_LIMITS, validateExperiment, type ScenarioExperimentV1 } from './contract.ts';
import { assertJsonData, canonical, ensure, freezeSnapshot, object } from './validation.ts';

export const EXPERIMENT_STORAGE_KEY = 'impactlens.experiments.v1';
export interface ExperimentStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }

async function validateRecords(value: unknown): Promise<ScenarioExperimentV1[]> {
  ensure(Array.isArray(value) && value.length <= EXPERIMENT_LIMITS.records, `Keep at most ${EXPERIMENT_LIMITS.records} saved experiments`);
  assertJsonData(value);
  const records: ScenarioExperimentV1[] = [], ids = new Set<string>();
  for (const item of Array.from(value)) {
    const record = await validateExperiment(item);
    ensure(!ids.has(record.experimentId), 'Duplicate experiment record ID');
    ids.add(record.experimentId); records.push(record);
  }
  return records;
}

export async function exportExperiments(input: readonly ScenarioExperimentV1[]): Promise<string> {
  const records = await validateRecords(input);
  const json = JSON.stringify({ version: 1, experiments: records }, null, 2);
  ensure(new TextEncoder().encode(json).byteLength <= EXPERIMENT_LIMITS.registryBytes, 'Experiment export exceeds the storage size limit');
  return json;
}

/** Merge is atomic: every record is validated before returning, and IDs are never overwritten. */
export async function importExperiments(json: string, existing: readonly ScenarioExperimentV1[] = []): Promise<ScenarioExperimentV1[]> {
  ensure(typeof json === 'string' && new TextEncoder().encode(json).byteLength <= EXPERIMENT_LIMITS.registryBytes, 'Experiment import exceeds the storage size limit');
  const envelope = object(JSON.parse(json), ['version', 'experiments']);
  ensure(envelope.version === 1, 'Unsupported experiment export version');
  const incoming = await validateRecords(envelope.experiments), current = await validateRecords(existing);
  const byId = new Map(current.map(record => [record.experimentId, record]));
  for (const record of incoming) {
    const prior = byId.get(record.experimentId);
    ensure(!prior || canonical(prior) === canonical(record), `Experiment ID conflict: ${record.experimentId}; existing records cannot be overwritten`);
    if (!prior) byId.set(record.experimentId, record);
  }
  const merged = [...byId.values()];
  await exportExperiments(merged); // Enforce the aggregate bound, not only each input file.
  return freezeSnapshot(merged);
}

function storageOrThrow(provided?: ExperimentStorage): ExperimentStorage {
  try {
    const result = provided ?? globalThis.localStorage;
    ensure(result && typeof result.getItem === 'function' && typeof result.setItem === 'function', 'Local experiment storage is unavailable');
    return result;
  } catch { throw new Error('Local experiment storage is unavailable'); }
}

export async function loadExperiments(storage?: ExperimentStorage): Promise<ScenarioExperimentV1[]> {
  const store = storageOrThrow(storage);
  let json: string | null;
  try { json = store.getItem(EXPERIMENT_STORAGE_KEY); } catch { throw new Error('Local experiment storage could not be read'); }
  return json === null ? freezeSnapshot([]) : importExperiments(json);
}

export async function saveExperiment(value: ScenarioExperimentV1, storage?: ExperimentStorage): Promise<ScenarioExperimentV1[]> {
  const store = storageOrThrow(storage), record = await validateExperiment(value);
  const existing = await loadExperiments(store);
  const merged = await importExperiments(await exportExperiments([record]), existing);
  const json = await exportExperiments(merged);
  try { store.setItem(EXPERIMENT_STORAGE_KEY, json); } catch { throw new Error('Local experiment storage could not be written; storage may be full or unavailable'); }
  return merged;
}
