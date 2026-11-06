import type {PublicExplore} from '../society/public-contract.ts';
import {isReportRunUpdating} from '../report-summary/readiness.ts';
import {GRAPH_SUMMARY_BATCH_SIZE, graphSummarySnapshotPayload, parseGraphNodeSummaries, type GraphNodeSummaries} from './contract.ts';
import {savedArtifactSnapshotKey} from '../report-summary/saved.ts';

export interface AutomaticGraphSummariesState {
  runId: string;
  snapshotKey: string | null;
  artifact: GraphNodeSummaries | null;
  phase: 'idle' | 'checking' | 'generating' | 'complete' | 'error';
  error: string;
}
export interface AutomaticGraphSummariesDependencies {
  fetcher?: typeof fetch;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  signal?: AbortSignal;
  onChange?: (state: AutomaticGraphSummariesState) => void;
  /** A user action authorizes one previously attempted batch, then ordinary sequencing resumes. */
  retry?: boolean;
}

export function automaticGraphSummariesIdle(runId = ''): AutomaticGraphSummariesState {
  return {runId, snapshotKey: null, artifact: null, phase: 'idle', error: ''};
}

export function isAutomaticGraphSummaryRunFinished(run: PublicExplore): boolean {
  if (run.storage?.disposition === 'historical-read-only') return false;
  return run.job ? run.job.status === 'completed' : run.society?.phase === 'completed';
}

const attempted = new Set<string>();
type Observer = {signal?: AbortSignal; onChange?: AutomaticGraphSummariesDependencies['onChange']; finish: (state: AutomaticGraphSummariesState) => void};
type Task = {id: string; state: AutomaticGraphSummariesState; observers: Set<Observer>; controller: AbortController; posting: boolean};
const inFlight = new Map<string, Task>();
const copy = (state: AutomaticGraphSummariesState): AutomaticGraphSummariesState => structuredClone(state);

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
function browserStorage(): AutomaticGraphSummariesDependencies['storage'] {
  try {return typeof window === 'undefined' ? null : window.sessionStorage;} catch {return null;}
}
function notify(task: Task) {
  for (const observer of task.observers) {
    if (!observer.signal?.aborted) {
      try {observer.onChange?.(copy(task.state));} catch { /* A view cannot change request outcomes. */ }
    }
  }
}
function observe(task: Task, deps: AutomaticGraphSummariesDependencies): Promise<AutomaticGraphSummariesState> {
  return new Promise(resolve => {
    const observer: Observer = {signal: deps.signal, onChange: deps.onChange, finish};
    function finish(state: AutomaticGraphSummariesState) {
      deps.signal?.removeEventListener('abort', abort);
      task.observers.delete(observer);
      resolve(copy(state));
    }
    function abort() {
      finish({...task.state, phase: 'idle'});
      if (!task.observers.size && !task.posting) {
        task.controller.abort();
        if (inFlight.get(task.id) === task) inFlight.delete(task.id);
      }
    }
    task.observers.add(observer);
    deps.signal?.addEventListener('abort', abort, {once: true});
    if (deps.signal?.aborted) abort();
    else {try {deps.onChange?.(copy(task.state));} catch { /* Observer only. */ }}
  });
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('The graph summary response is invalid.');
  return value as Record<string, unknown>;
}
function validateEnvelope(value: unknown, run: PublicExplore, snapshotKey: string, previous: GraphNodeSummaries | null, posted: boolean) {
  const body = record(value), allowed = new Set(run.graph.nodes.map(node => node.id));
  if (Object.keys(body).sort().join(',') !== 'artifact,complete,snapshotKey,totalNodes' || body.snapshotKey !== snapshotKey ||
    body.totalNodes !== allowed.size || typeof body.complete !== 'boolean') throw Error('The graph summaries do not match this run snapshot.');
  const artifact = body.artifact === null ? null : parseGraphNodeSummaries(body.artifact, allowed);
  if (artifact && (artifact.runId !== run.runId || artifact.snapshotKey !== snapshotKey || artifact.totalNodes !== allowed.size)) {
    throw Error('The saved graph summaries do not match this run.');
  }
  const count = artifact?.summaries.length ?? 0;
  if (body.complete !== (count === allowed.size)) throw Error('The graph summary coverage is invalid.');
  if (posted) {
    const old = new Map(previous?.summaries.map(item => [item.nodeId, item.summary]) ?? []);
    const next = new Map(artifact?.summaries.map(item => [item.nodeId, item.summary]) ?? []);
    const expected = run.graph.nodes.filter(node => !old.has(node.id)).slice(0, GRAPH_SUMMARY_BATCH_SIZE);
    if (count !== old.size + expected.length || expected.some(node => !next.has(node.id)) ||
      [...old].some(([id, summary]) => next.get(id) !== summary)) throw Error('The graph summary batch did not preserve and advance its saved progress.');
  }
  return {artifact, complete: body.complete};
}

async function execute(task: Task, run: PublicExplore, deps: AutomaticGraphSummariesDependencies) {
  const fetcher = deps.fetcher ?? fetch, storage = deps.storage === undefined ? browserStorage() : deps.storage;
  const active = () => task.observers.size > 0 && !task.controller.signal.aborted;
  const headers = {Authorization: `Bearer ${run.session!.token}`}, endpoint = '/api/knowledge-graph/summaries';
  let snapshotKey = task.state.snapshotKey!;
  let explicitRetry = deps.retry === true;
  try {
    task.state.phase = 'checking'; notify(task);
    if (!active()) return;
    const saved = await fetcher(`${endpoint}?runId=${encodeURIComponent(run.runId)}`, {headers, cache: 'no-store', signal: task.controller.signal});
    const savedBody = record(await saved.json());
    if (!active()) return;
    if (!saved.ok) throw Error(typeof savedBody.message === 'string' ? savedBody.message : 'The saved graph summaries could not be loaded.');
    snapshotKey=savedArtifactSnapshotKey(run.storage?.disposition==='historical-read-only',snapshotKey,savedBody.snapshotKey);
    const initial = validateEnvelope(savedBody, run, snapshotKey, null, false);
    task.state.snapshotKey=snapshotKey;
    task.state.artifact = initial.artifact;
    if (initial.complete) {task.state.phase = 'complete'; notify(task); return;}
    task.state.phase = 'idle'; notify(task);
    if (!isAutomaticGraphSummaryRunFinished(run)) return;

    while (active()) {
      // Public snapshot and covered IDs only. Neither credentials nor summary text persist here.
      const covered = task.state.artifact?.summaries.map(item => item.nodeId).sort() ?? [];
      const marker = `impactlens:auto-graph-summary:v1:${run.runId}:${snapshotKey}:${await sha256(JSON.stringify(covered))}`;
      if (!active()) return;
      let seen = attempted.has(marker);
      try {seen ||= storage?.getItem(marker) === 'attempted';} catch { /* In-memory fallback. */ }
      if (seen && !explicitRetry) throw Error('A graph summary batch was already attempted. Retry explicitly to continue.');
      explicitRetry = false;
      task.state.phase = 'generating'; notify(task);
      if (!active()) return;
      attempted.add(marker);
      try {storage?.setItem(marker, 'attempted');} catch { /* Memory still prevents repeated dispatch. */ }
      task.posting = true;
      try {
        // Unmounting stops observers and future batches, but a paid request already
        // sent must finish so another view can observe its outcome without resending it.
        const generated = await fetcher(endpoint, {method: 'POST', headers: {...headers, 'Content-Type': 'application/json'},
          body: JSON.stringify({runId: run.runId, snapshotKey})});
        const body = record(await generated.json());
        if (!generated.ok) throw Error(typeof body.message === 'string' ? body.message : 'Graph summary generation failed.');
        const next = validateEnvelope(body, run, snapshotKey, task.state.artifact, true);
        task.state.artifact = next.artifact;
        task.state.phase = next.complete ? 'complete' : 'generating';
        notify(task);
        if (next.complete) return;
      } finally {task.posting = false;}
    }
  } catch (error) {
    task.state.phase = 'error';
    task.state.error = error instanceof Error ? error.message : 'Graph summary preparation failed.';
    notify(task);
  } finally {
    if (inFlight.get(task.id) === task) inFlight.delete(task.id);
    for (const observer of [...task.observers]) observer.finish(task.state);
  }
}

/** Authenticated cached reads and sequential generation, independent of graph selection. */
export async function prepareAutomaticGraphSummaries(run: PublicExplore, deps: AutomaticGraphSummariesDependencies = {}): Promise<AutomaticGraphSummariesState> {
  const initial = automaticGraphSummariesIdle(run.runId);
  if (deps.signal?.aborted || isReportRunUpdating(run)) return initial;
  if (!run.session?.token) return {...initial, phase: 'error', error: 'This run has no graph summary access token.'};
  let snapshotKey: string, credential: string;
  try {
    [snapshotKey, credential] = await Promise.all([sha256(graphSummarySnapshotPayload(run)), sha256(run.session.token)]);
  } catch {return {...initial, phase: 'error', error: 'This graph summary snapshot could not be prepared.'};}
  if (deps.signal?.aborted) return initial;
  // Credentials isolate memory sharing and never enter storage or artifact identity.
  const id = `${run.runId}:${snapshotKey}:${credential}:${isAutomaticGraphSummaryRunFinished(run)}`;
  const existing = inFlight.get(id);
  if (existing) return observe(existing, deps);
  const task: Task = {id, state: {...initial, snapshotKey}, observers: new Set(), controller: new AbortController(), posting: false};
  inFlight.set(id, task);
  const observation = observe(task, deps);
  void execute(task, run, deps);
  return observation;
}
