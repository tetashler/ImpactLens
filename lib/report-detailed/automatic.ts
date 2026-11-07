import type {PublicExplore} from '../society/public-contract.ts';
import {parseReportSummary} from '../report-summary/contract.ts';
import {projectReportEvidence, reportSnapshotPayload} from '../report-summary/evidence.ts';
import {detailedReportSnapshotPayload, legacyDetailedReportSnapshotPayload, parseDetailedReport} from './contract.ts';

export type AutomaticReportKind = 'summary' | 'detailed';
export type AutomaticReportStatus = 'pending' | 'available' | 'attempted' | 'failed' | 'skipped';
export type AutomaticReportStage = 'idle' | 'checking-summary' | 'writing-summary' | 'checking-detailed' | 'writing-detailed' | 'complete' | 'cancelled';
export interface AutomaticReportsState {
  runId: string;
  stage: AutomaticReportStage;
  summary: AutomaticReportStatus;
  detailed: AutomaticReportStatus;
  errors: Partial<Record<AutomaticReportKind, string>>;
}
export interface AutomaticReportsDependencies {
  fetcher?: typeof fetch;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  signal?: AbortSignal;
  onChange?: (state: AutomaticReportsState, kind?: AutomaticReportKind) => void;
}

export function isAutomaticReportRunFinished(run: PublicExplore): boolean {
  if (run.storage?.disposition === 'historical-read-only') return false;
  return run.job ? run.job.status === 'completed' : run.society?.phase === 'completed';
}

export function automaticReportsIdle(runId = ''): AutomaticReportsState {
  return {runId, stage: 'idle', summary: 'pending', detailed: 'pending', errors: {}};
}

const copy = (state: AutomaticReportsState): AutomaticReportsState => ({...state, errors: {...state.errors}});
const attempted = new Set<string>();
const deferred = new Set<string>();
type Observer = {signal?: AbortSignal; onChange?: AutomaticReportsDependencies['onChange']; finish: (state: AutomaticReportsState) => void};
type Task = {id: string; state: AutomaticReportsState; observers: Set<Observer>; controller: AbortController; posting: boolean};
const inFlight = new Map<string, Task>();

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function browserStorage(): AutomaticReportsDependencies['storage'] {
  try {return typeof window === 'undefined' ? null : window.sessionStorage;} catch {return null;}
}

function notify(task: Task, kind?: AutomaticReportKind) {
  for (const observer of task.observers) {
    if (!observer.signal?.aborted) {
      // A consumer's view update must not turn a completed request into a retry.
      try {observer.onChange?.(copy(task.state), kind);} catch { /* Observer only. */ }
    }
  }
}

function observe(task: Task, deps: AutomaticReportsDependencies): Promise<AutomaticReportsState> {
  return new Promise(resolve => {
    const observer: Observer = {signal: deps.signal, onChange: deps.onChange, finish};
    function finish(state: AutomaticReportsState) {
      deps.signal?.removeEventListener('abort', abort);
      task.observers.delete(observer);
      resolve(copy(state));
    }
    function abort() {
      finish({...task.state, stage: 'cancelled'});
      if (!task.observers.size && !task.posting) {
        task.controller.abort();
        if (inFlight.get(task.id) === task) inFlight.delete(task.id);
      }
    }
    task.observers.add(observer);
    deps.signal?.addEventListener('abort', abort, {once: true});
    if (deps.signal?.aborted) abort();
    else {
      try {deps.onChange?.(copy(task.state));} catch { /* Observer only. */ }
    }
  });
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('The saved report response is invalid.');
  return value as Record<string, unknown>;
}

async function execute(task: Task, run: PublicExplore, keys: Record<AutomaticReportKind, string | null>, deps: AutomaticReportsDependencies) {
  const fetcher = deps.fetcher ?? fetch;
  const storage = deps.storage === undefined ? browserStorage() : deps.storage;
  const active = () => task.observers.size > 0 && !task.controller.signal.aborted;
  const headers = {Authorization: `Bearer ${run.session!.token}`};
  const detailedDeferral = keys.detailed ? `impactlens:auto-report-deferred:v1:detailed:${run.runId}:${keys.detailed}` : null;
  const failure = (kind: AutomaticReportKind, response: Response, body: Record<string, unknown>, fallback: string) => {
    if (kind === 'summary' && response.status === 429 && body.error === 'AI_RATE_LIMIT' && detailedDeferral) {
      // A provider limit applies to the next writer too. Persist the deferral even
      // if this view detached while the paid summary request was completing.
      deferred.add(detailedDeferral);
      try {storage?.setItem(detailedDeferral, 'skipped');} catch { /* Memory fallback. */ }
    }
    return Error(typeof body.message === 'string' ? body.message : fallback);
  };
  try {
    for (const kind of ['summary', 'detailed'] as const) {
      if (!active()) break;
      task.state.stage = `checking-${kind}`;
      notify(task);
      if (!active()) break;
      const snapshotKey = keys[kind];
      if (!snapshotKey) {
        task.state[kind] = 'failed';
        task.state.errors[kind] = 'This report snapshot could not be prepared.';
        notify(task, kind);
        continue;
      }
      try {
        const endpoint = `/api/reports/${kind}`;
        const response = await fetcher(`${endpoint}?runId=${encodeURIComponent(run.runId)}`, {headers, cache: 'no-store', signal: task.controller.signal});
        const body = record(await response.json());
        if (!active()) break;
        if (!response.ok) throw failure(kind, response, body, 'The saved report could not be loaded.');
        if (body.snapshotKey !== snapshotKey) throw Error('The run changed. Refresh the report to use its current snapshot.');
        const field = kind === 'summary' ? 'summary' : 'report';
        const parse = kind === 'summary' ? parseReportSummary : parseDetailedReport;
        const matching = (value: unknown) => {
          const report = parse(value);
          if (report.runId !== run.runId || report.snapshotKey !== snapshotKey) throw Error('The saved report does not match this run.');
          if(kind==='detailed'&&(report.version!==2||!('question' in report)||report.question!==run.question))throw Error('The saved detailed report does not match this report version.');
          return report;
        };
        if (body[field] !== null) {
          matching(body[field]);
          task.state[kind] = 'available';
          notify(task, kind);
          continue;
        }

        // A retained V1 report remains useful and readable. Upgrading it is an
        // explicit user action; loading a finished run must not incur that cost.
        if(kind==='detailed'&&Object.hasOwn(body,'legacyReport')){
          const legacy=parseDetailedReport(body.legacyReport),legacyKey=await sha256(legacyDetailedReportSnapshotPayload(run));
          if(legacy.version!==1||legacy.runId!==run.runId||legacy.question!==run.question||legacy.snapshotKey!==legacyKey)throw Error('The saved legacy report does not match this run.');
          task.state.detailed='available';
          notify(task,kind);
          continue;
        }

        // Saved artifacts are always readable. Only an automatic paid dispatch
        // is deferred; explicit generation remains the user's retry path.
        if (kind === 'detailed' && detailedDeferral) {
          let skipped = deferred.has(detailedDeferral);
          try {skipped ||= storage?.getItem(detailedDeferral) === 'skipped';} catch { /* Memory fallback. */ }
          if (skipped) {
            task.state.detailed = 'skipped';
            task.state.errors.detailed = 'The provider rate limit stopped automatic report preparation. Retry this report explicitly after the provider recovers.';
            notify(task, kind);
            continue;
          }
        }

        // Mark before dispatch. A failed or cancelled paid request stays attempted
        // through remounts/reloads; explicit manual generation owns any retry.
        const marker = `impactlens:auto-report:v1:${kind}:${run.runId}:${snapshotKey}`;
        let seen = attempted.has(marker);
        try {seen ||= storage?.getItem(marker) === 'attempted';} catch { /* Memory fallback. */ }
        if (seen) {
          task.state[kind] = 'attempted';
          notify(task, kind);
          continue;
        }
        task.state.stage = `writing-${kind}`;
        notify(task);
        if (!active()) break;
        attempted.add(marker);
        try {storage?.setItem(marker, 'attempted');} catch { /* Memory still prevents tab retries. */ }
        task.posting = true;
        try {
          // Keep a dispatched request alive when one view unmounts. Its outcome
          // can still be observed by another view, and it must never be reissued.
          const generated = await fetcher(endpoint, {method: 'POST', headers: {...headers, 'Content-Type': 'application/json'},
            body: JSON.stringify({runId: run.runId, snapshotKey})});
          const generatedBody = record(await generated.json());
          if (!generated.ok) throw failure(kind, generated, generatedBody, 'Report generation failed.');
          matching(generatedBody[field]);
          task.state[kind] = 'available';
        } finally {task.posting = false;}
      } catch (error) {
        if (!active()) break;
        task.state[kind] = 'failed';
        task.state.errors[kind] = error instanceof Error ? error.message : 'Report preparation failed.';
      }
      if (active()) notify(task, kind);
    }
    task.state.stage = active() ? 'complete' : 'cancelled';
    notify(task);
  } finally {
    if (inFlight.get(task.id) === task) inFlight.delete(task.id);
    for (const observer of [...task.observers]) observer.finish(task.state);
  }
}

/** Browser-safe, authenticated preparation; never starts or controls a simulation. */
export async function prepareAutomaticReports(run: PublicExplore, deps: AutomaticReportsDependencies = {}): Promise<AutomaticReportsState> {
  const initial = automaticReportsIdle(run.runId);
  if (deps.signal?.aborted) return {...initial, stage: 'cancelled'};
  if (!isAutomaticReportRunFinished(run)) return initial;
  if (!run.session?.token) return {...initial, stage: 'complete', summary: 'failed', detailed: 'failed',
    errors: {summary: 'This run has no report access token.', detailed: 'This run has no report access token.'}};
  let keys: Record<AutomaticReportKind, string | null>, credential: string;
  try {
    const snapshot = async (payload: () => string) => {
      try {return await sha256(payload());} catch {return null;}
    };
    const [summary, detailed, tokenHash] = await Promise.all([
      snapshot(() => reportSnapshotPayload(projectReportEvidence(run))), snapshot(() => detailedReportSnapshotPayload(run)), sha256(run.session.token),
    ]);
    keys = {summary, detailed}; credential = tokenHash;
  } catch {
    return {...initial, stage: 'complete', summary: 'failed', detailed: 'failed',
      errors: {summary: 'This report snapshot could not be prepared.', detailed: 'This report snapshot could not be prepared.'}};
  }
  if (deps.signal?.aborted) return {...initial, stage: 'cancelled'};
  // Credentials affect in-memory request sharing only; never artifact identity
  // or session storage. A changed token always performs a fresh authenticated GET.
  const id = `${run.runId}:${keys.summary}:${keys.detailed}:${credential}`;
  const existing = inFlight.get(id);
  if (existing) return observe(existing, deps);
  const task: Task = {id, state: initial, observers: new Set(), controller: new AbortController(), posting: false};
  inFlight.set(id, task);
  const observation = observe(task, deps);
  void execute(task, run, keys, deps);
  return observation;
}
