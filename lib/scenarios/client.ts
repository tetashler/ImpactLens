import {
  parseScenarioRequest, parseScenarioResponse, SCENARIO_LIMITS,
  type ScenarioCategory, type ScenarioRequest, type ScenarioResponse, type UserMapPoint,
} from './contract.ts';

export interface ScenarioExample { id: string; label: string; question: string; category?: ScenarioCategory }
/** Selecting an example fills the composer only. It never sends a request. */
export const SCENARIO_EXAMPLES: readonly ScenarioExample[] = Object.freeze([
  { id: 'mrt', label: 'New MRT stations', question: 'What if Singapore built three new MRT stations between Choa Chu Kang and Sengkang?', category: 'mrt' },
  { id: 'aac', label: 'Active Ageing Centre', question: 'What if a new Active Ageing Centre opened in Bukit Merah?', category: 'aac' },
  { id: 'polyclinic', label: 'New polyclinic', question: 'What if a new polyclinic were built in Sengkang?', category: 'evidence-analysis' },
  { id: 'asean', label: 'Singapore and ASEAN', question: 'What if Singapore left ASEAN? How might different stakeholders respond?', category: 'exploratory-agents' },
]);

const errors = {
  invalidRequest: 'Check the question (1–2,000 characters), category and Singapore map points before planning.',
  tooLarge: 'The planning request is too large. Shorten the question or remove map points.',
  invalidResponse: 'The planning response could not be validated. Try planning again.',
  failed: 'The planning request could not complete. Please try again.',
  forbidden: 'The planning request was blocked. Reload the page and try again.',
  duplicate: 'An identical planning request is already running. Wait briefly and try again.',
  rateLimit: 'Planning is busy. Wait briefly and try again.',
} as const;

class ScenarioClientError extends Error {}
export interface ScenarioClientOptions { fetcher?: typeof fetch }
export interface ScenarioRequestOptions extends ScenarioClientOptions { signal?: AbortSignal }

async function readBoundedJson(response: Response): Promise<unknown> {
  if (response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new Error();
  const length = response.headers.get('Content-Length');
  if (length !== null && Number(length) > SCENARIO_LIMITS.responseBytes) throw new Error();
  if (!response.body) throw new Error();
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > SCENARIO_LIMITS.responseBytes) {
        await reader.cancel();
        throw new Error();
      }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
}

/** Only validated envelopes leave this boundary; upstream messages are never shown. */
export async function requestScenarioPlan(input: ScenarioRequest, options: ScenarioRequestOptions = {}): Promise<ScenarioResponse> {
  let submitted: ScenarioRequest;
  try { submitted = parseScenarioRequest(input); }
  catch { throw new ScenarioClientError(errors.invalidRequest); }
  const body = JSON.stringify(submitted);
  if (new TextEncoder().encode(body).byteLength > SCENARIO_LIMITS.bodyBytes) throw new ScenarioClientError(errors.tooLarge);
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)('/api/scenarios/plan', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body, signal: options.signal, cache: 'no-store', credentials: 'same-origin',
    });
  } catch { throw new ScenarioClientError(errors.failed); }
  if (!response.ok) {
    const message = response.status === 400 || response.status === 415 ? errors.invalidRequest
      : response.status === 403 ? errors.forbidden : response.status === 409 ? errors.duplicate
      : response.status === 413 ? errors.tooLarge : response.status === 429 ? errors.rateLimit : errors.failed;
    throw new ScenarioClientError(message);
  }
  try {
    const json = await readBoundedJson(response);
    return await parseScenarioResponse(json, submitted);
  } catch { throw new ScenarioClientError(errors.invalidResponse); }
}

export interface ScenarioPlannerInputs {
  question: string;
  category: ScenarioCategory | undefined;
  mapPoints: UserMapPoint[] | undefined;
}
export interface ScenarioPlannerSnapshot extends ScenarioPlannerInputs {
  response: ScenarioResponse | null;
  busy: boolean;
  error: string | null;
  submittedQuestion: string | null;
}

/** Property insertion order does not change input identity; point order does. */
function inputIdentity(input: ScenarioPlannerInputs): string {
  return JSON.stringify({
    question: input.question, category: input.category,
    mapPoints: input.mapPoints?.map(point => ({ id: point.id, lat: point.lat, lon: point.lon, provenance: point.provenance })),
  });
}
function emptySnapshot(): ScenarioPlannerSnapshot {
  return { question: '', category: undefined, mapPoints: undefined, response: null, busy: false, error: null, submittedQuestion: null };
}

/** Browser-only lifecycle authority, shared by the hook and focused race tests. */
export function createScenarioPlanner(options: ScenarioClientOptions = {}) {
  let snapshot = emptySnapshot();
  let revision = 0, attempt = 0;
  let controller: AbortController | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: ScenarioPlannerSnapshot) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };
  const abort = () => { controller?.abort(); controller = null; };
  const edit = (patch: Partial<ScenarioPlannerInputs>) => {
    const next = { ...snapshot, ...patch };
    if (inputIdentity(next) === inputIdentity(snapshot)) return;
    revision++;
    abort();
    publish({ ...next, response: null, busy: false, error: null, submittedQuestion: null });
  };
  const invalidate = () => {
    revision++;
    abort();
    publish({ ...snapshot, response: null, busy: false, error: null, submittedQuestion: null });
  };
  async function submit(): Promise<void> {
    const atRevision = revision, atAttempt = ++attempt, atIdentity = inputIdentity(snapshot);
    const submittedQuestion = snapshot.question;
    abort();
    const currentController = new AbortController();
    controller = currentController;
    const isCurrent = () => revision === atRevision && attempt === atAttempt
      && inputIdentity(snapshot) === atIdentity && controller === currentController && !currentController.signal.aborted;
    publish({ ...snapshot, submittedQuestion, response: null, busy: true, error: null });
    try {
      const submitted = parseScenarioRequest({
        version: 1, clientRequestId: crypto.randomUUID(), question: submittedQuestion,
        ...(snapshot.category === undefined ? {} : { selectedCategory: snapshot.category }),
        ...(snapshot.mapPoints === undefined ? {} : { mapPoints: snapshot.mapPoints }),
      });
      const response = await requestScenarioPlan(submitted, { fetcher: options.fetcher, signal: currentController.signal });
      // Both checks run after asynchronous semantic/hash validation has completed.
      if (isCurrent()) publish({ ...snapshot, response, busy: false, error: null });
    } catch (error) {
      if (isCurrent()) publish({
        ...snapshot, response: null, busy: false,
        error: error instanceof ScenarioClientError ? error.message : errors.invalidRequest,
      });
    } finally {
      if (controller === currentController) controller = null;
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setQuestion: (question: string) => edit({ question }),
    setCategory: (category: ScenarioCategory | undefined) => edit({ category }),
    setMapPoints: (mapPoints: UserMapPoint[] | undefined) => edit({ mapPoints: mapPoints === undefined ? undefined : structuredClone(mapPoints) }),
    submit,
    reset: () => { revision++; abort(); publish(emptySnapshot()); },
    invalidate,
  };
}

export type ScenarioPlanner = ReturnType<typeof createScenarioPlanner>;
