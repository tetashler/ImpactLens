/** Browser-safe question -> local plan -> immutable research -> bounded execution. */
import { classifyQuestionContext, type QuestionContextV1 } from './context.ts';
import { createScenarioPlan, parseScenarioRequest, type ScenarioPlan } from '../scenarios/contract.ts';
import { fallbackSelection } from '../scenarios/fallback.ts';
import { parseScenarioGeometry, type ScenarioGeometry } from '../plots/geometry.ts';
import { createReplayEvidence } from '../evidence/replay.ts';
import { createDefaultConfiguration, parseConfiguration } from '../experiments/configuration.ts';
import { createGeometryContext, scenarioIdentityFor } from '../experiments/identity.ts';
import { createExperiment, type ScenarioExperimentV1 } from '../experiments/contract.ts';
import { createScenarioExperimentInput } from '../experiments/handoff.ts';
import { assertJsonData, canonical, freezeSnapshot, object, text } from '../experiments/validation.ts';
import { StakeholderRequestSession } from '../stakeholder-simulation/client.ts';
import { convertScenarioExperimentInput, linkStakeholderRun, stakeholderRoleIdsForFocus, type LinkedStakeholderRunV1 } from '../stakeholder-simulation/experiment-bridge.ts';
import type { StakeholderSimulationRunV1 } from '../stakeholder-simulation/contract.ts';
import {LiveInferenceSession} from '../stakeholder-simulation/inference-client.ts';
import {parseInferenceStatus,type InferenceStatusV1} from '../stakeholder-simulation/inference-contract.ts';
import {selectQuestionLiveDomain,prepareQuestionLiveInput,createQuestionLiveExecution,type QuestionLiveExecutionV1} from './live.ts';
import {questionRunErrorMessage} from './errors.ts';

export type QuestionSimulationPhase = 'idle' | 'interpreting' | 'preparing' | 'executing' | 'completed' | 'partial' | 'failed' | 'unsupported' | 'needs-map-review' | 'cancelled' | 'error';
export type QuestionExecutionChoice='live'|'scripted';
export interface QuestionSimulationContext { question: string; geometry: ScenarioGeometry; geometryRevision: number }
interface QuestionResult {
  question: string;
  scope: QuestionContextV1 | null;
  plan: ScenarioPlan | null;
  record: ScenarioExperimentV1 | null;
  run: StakeholderSimulationRunV1 | null;
  linked: LinkedStakeholderRunV1 | null;
  live?:QuestionLiveExecutionV1|null;
  executionMode?:QuestionExecutionChoice|null;
}
export interface QuestionSimulationArchive extends QuestionResult {
  id: string;
  attemptId: string;
  revision: number;
  phase: 'completed' | 'partial' | 'failed' | 'cancelled' | 'unsupported' | 'needs-map-review';
  createdAt: string;
}
export interface QuestionSimulationSnapshot extends QuestionResult {
  phase: QuestionSimulationPhase;
  revision: number;
  attemptId: string | null;
  error: string | null;
  history: QuestionSimulationArchive[];
  selectedArchiveId: string | null;
  inferenceStatus?:InferenceStatusV1|null;
}
export interface QuestionSimulationOptions { fetcher?: typeof fetch; timeoutMs?: number; execution?:QuestionExecutionChoice }
interface Attempt { id: string; revision: number; mode:QuestionExecutionChoice; geographicConfirmed:boolean; deadline:number; promise: Promise<void>; resolve: () => void; timer: ReturnType<typeof setTimeout> | null }
class Superseded extends Error {}
const SAFE_LIVE_ERRORS=new Set([
  'Live AI simulation is not configured. DeepSeek via DigitalOcean is unavailable for this run.',
  'Live inference is not configured or enabled on the server. Check Settings.',
  'Live inference is busy. Wait before starting a new attempt.',
  'Live inference request timed out. Start a new attempt.',
  'Live inference could not complete. Start a new attempt.',
  'Live inference returned an invalid response.',
  'The required serving model and provider could not be verified.',
  'This attempt was already used. Start a new attempt.',
]);

function emptyResult(question = ''): QuestionResult { return { question, scope: null, plan: null, record: null, run: null, linked: null,live:null,executionMode:null }; }
function initial(history: QuestionSimulationArchive[] = [], revision = 0): QuestionSimulationSnapshot {
  return freezeSnapshot({ ...emptyResult(), phase: 'idle', revision, attemptId: null, error: null, history, selectedArchiveId: null,inferenceStatus:null });
}

/** Default compatibility path remains scripted; the primary application explicitly selects live. */
export function createQuestionSimulation(options: QuestionSimulationOptions = {}) {
  if (options.timeoutMs!==undefined&&(!Number.isSafeInteger(options.timeoutMs)||options.timeoutMs<1||options.timeoutMs>130000))throw new Error('Question simulation timeout must be from 1 to 130000 milliseconds.');
  let state = initial();
  let input: QuestionSimulationContext | null = null;
  let inputKey = '';
  let revision = 0;
  let active: Attempt | null = null;
  const session = new StakeholderRequestSession();
  const liveSession=new LiveInferenceSession();
  let statusController:AbortController|null=null,statusEpoch=0;
  let statusPromise:Promise<InferenceStatusV1|null>|null=null;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<QuestionSimulationSnapshot>) => {
    state = freezeSnapshot({ ...state, ...patch });
    for (const listener of listeners) listener();
  };
  const owns = (attempt: Attempt) => active === attempt && revision === attempt.revision;
  function stop() {
    const previous = active;
    active = null;
    session.cancel();
    liveSession.cancel();statusEpoch++;statusController?.abort();statusController=null;
    if (previous) { if (previous.timer !== null) clearTimeout(previous.timer); previous.resolve(); }
  }
  async function checked<T>(attempt: Attempt, work: Promise<T>): Promise<T> {
    const result = await work;
    if (!owns(attempt)) throw new Superseded();
    return result;
  }
  function refreshInferenceStatus():Promise<InferenceStatusV1|null>{
    if(statusPromise&&statusController&&!statusController.signal.aborted)return statusPromise;
    const pending=loadInferenceStatus();statusPromise=pending;void pending.finally(()=>{if(statusPromise===pending)statusPromise=null;});return pending;
  }
  async function loadInferenceStatus():Promise<InferenceStatusV1|null>{
    statusController?.abort();const abort=new AbortController(),epoch=++statusEpoch;statusController=abort;
    let rejectDeadline!:(error:unknown)=>void;const interrupted=new Promise<never>((_,reject)=>rejectDeadline=reject);
    const cancel=()=>rejectDeadline(new Error('Status request cancelled.'));abort.signal.addEventListener('abort',cancel,{once:true});const timer=setTimeout(()=>abort.abort(),8000);
    const load=async()=>{const response=await(options.fetcher??fetch)('/api/inference/status',{signal:abort.signal,cache:'no-store'});if(!response.ok)throw new Error('Status unavailable');const reader=response.body?.getReader();if(!reader)throw new Error('Status unavailable');const chunks:Uint8Array[]=[];let size=0;const stopReader=()=>void reader.cancel().catch(()=>{});abort.signal.addEventListener('abort',stopReader,{once:true});if(abort.signal.aborted)stopReader();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){stopReader();throw new Error('Status exceeds bounds');}chunks.push(value);}}finally{abort.signal.removeEventListener('abort',stopReader);reader.releaseLock();}const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}return parseInferenceStatus(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));};
    try{const value=await Promise.race([load(),interrupted]);if(epoch===statusEpoch&&!abort.signal.aborted)publish({inferenceStatus:value});return epoch===statusEpoch&&!abort.signal.aborted?value:null;}catch{if(epoch===statusEpoch)publish({inferenceStatus:null});return null;}finally{clearTimeout(timer);abort.signal.removeEventListener('abort',cancel);if(statusController===abort)statusController=null;}
  }
  function invalidate(value: QuestionSimulationContext) {
    try {
      assertJsonData(value);
      const supplied = object(value, ['question', 'geometry', 'geometryRevision']);
      text(supplied.question, 2000, true);
      if (typeof supplied.geometryRevision !== 'number' || !Number.isSafeInteger(supplied.geometryRevision) || supplied.geometryRevision < 0 || supplied.geometryRevision > 1_000_000_000) throw new Error();
      const next: QuestionSimulationContext = { question: supplied.question as string, geometry: parseScenarioGeometry(supplied.geometry), geometryRevision: supplied.geometryRevision };
      const key = canonical(next);
      if (key === inputKey) return;
      stop(); revision++; inputKey = key; input = freezeSnapshot(next);
      publish({ ...emptyResult(next.question), phase: 'idle', revision, attemptId: null, error: null, selectedArchiveId: null });
    } catch {
      stop(); revision++; inputKey = ''; input = null;
      publish({ ...emptyResult(), phase: 'error', revision, attemptId: null, error: 'The question or drawing is invalid. Review it before trying again.', selectedArchiveId: null });
    }
  }
  function finish(attempt: Attempt, result: QuestionResult, phase: QuestionSimulationArchive['phase']) {
    if (!owns(attempt)) return;
    const archive: QuestionSimulationArchive = {
      ...result, id: result.run?.runId ?? result.record?.experimentId ?? `review-${attempt.id}`,
      attemptId: attempt.id, revision: attempt.revision, phase, createdAt: new Date().toISOString(),
    };
    publish({ ...result, phase, error: result.run?questionRunErrorMessage(result.run):null, history: [archive, ...state.history].slice(0, 4), selectedArchiveId: null });
  }
  async function prepare(attempt: Attempt, context: QuestionSimulationContext) {
    try {
      const scope = classifyQuestionContext(context.question);
      if (!owns(attempt)) return;
      publish({ scope });
      const request = parseScenarioRequest({ version: 1, clientRequestId: attempt.id, question: context.question,
        ...(scope.intent === 'asean-withdrawal' ? { selectedCategory: 'exploratory-agents' } : {}) });
      const selection = fallbackSelection(request);
      const plan = await checked(attempt, createScenarioPlan(request, selection));
      publish({ plan, phase: 'preparing' });
      const result: QuestionResult = { ...emptyResult(context.question),scope,plan,executionMode:attempt.mode };
      if ((scope.intent === 'mrt' && selection.capabilityId === 'mrt-accessibility-v1'&&(attempt.mode!=='live'||!attempt.geographicConfirmed)) || (scope.intent === 'aac' && selection.capabilityId === 'aac-accessibility-v1')) {
        finish(attempt, result, 'needs-map-review');
        return;
      }
      const executable = scope.intent === 'asean-withdrawal' && selection.intent === 'international-policy' && selection.capabilityId === 'stakeholder-exploration-v1';
      const defaultConfiguration = createDefaultConfiguration(context.question, selection.intent);
      // A mere ASEAN mention must never inject withdrawal assumptions into another question.
      const configuration = !executable && defaultConfiguration.kind === 'asean'
        ? parseConfiguration({ kind: 'generic', horizonYears: 5, notes: '', researchFocus: '', hypotheses: [], namedAssumptions: [] })
        : defaultConfiguration;
      const geometryContext = await checked(attempt, createGeometryContext(context.geometry, context.geometryRevision));
      const scenarioIdentity = await checked(attempt, scenarioIdentityFor(context.question, geometryContext));
      const evidence = await checked(attempt, createReplayEvidence({ scenarioIdentity, researchAttemptId: attempt.id, question: context.question,
        topic: executable ? 'asean' : configuration.kind === 'polyclinic' ? 'polyclinic' : 'generic' }));
      const record = await checked(attempt, createExperiment({ question: context.question, configuration, evidence, geometryContext }));
      result.record = record;
      publish({ record });
      if(attempt.mode==='live'){
        if(!selectQuestionLiveDomain(scope)){finish(attempt,result,'unsupported');return;}
        const status=await checked(attempt,refreshInferenceStatus());
        if(!status||status.connection!=='configured'||!status.enabled)throw new Error('Live AI simulation is not configured. DeepSeek via DigitalOcean is unavailable for this run.');
        const prepared=await checked(attempt,prepareQuestionLiveInput(record,scope));
        publish({phase:'executing'});
        const response=await checked(attempt,liveSession.execute(prepared.input,`${attempt.id}:${attempt.revision}`,options.fetcher??fetch,Math.max(1,Math.min(125000,attempt.deadline-Date.now()))));
        if(!response){if(owns(attempt))publish({phase:'cancelled',run:null,linked:null,live:null});return;}
        const live=await checked(attempt,createQuestionLiveExecution(record,scope,response));
        result.live=live;result.run=live.response.run;
        finish(attempt,result,result.run.status);return;
      }
      if (!executable) { finish(attempt, result, 'unsupported'); return; }
      const source = await checked(attempt, createScenarioExperimentInput(record));
      const converted = await checked(attempt, convertScenarioExperimentInput(source, {
        stakeholderRoleIds: stakeholderRoleIdsForFocus(source.stakeholderFocus),
        simulationOptions: { mode: 'deterministic-demo', rounds: 3, seed: 'phase7d-demo', memoryEvents: 6 },
      }));
      publish({ phase: 'executing' });
      const run = await checked(attempt, session.execute(converted.input, `${attempt.id}:${attempt.revision}`, options.fetcher ?? fetch, Math.max(1,Math.min(120000,attempt.deadline-Date.now()))));
      if (!run) { if (owns(attempt)) publish({ phase: 'cancelled', run: null, linked: null }); return; }
      if (run.status !== 'completed') {
        publish({ phase: run.status === 'cancelled' ? 'cancelled' : 'error', run: null, linked: null,
          error: run.status === 'cancelled' ? null : 'The bounded stakeholder run did not complete. Try again.' });
        return;
      }
      const linked = await checked(attempt, linkStakeholderRun(converted.source, run, record));
      result.run = run; result.linked = linked;
      finish(attempt, result, 'completed');
    } catch (error) {
      if (owns(attempt) && !(error instanceof Superseded)) publish({ phase: 'error', run: null, linked: null,live:null, error: attempt.mode==='live'&&error instanceof Error&&SAFE_LIVE_ERRORS.has(error.message)?error.message:'This question could not be prepared or executed safely. Try again.' });
    } finally {
      if (active === attempt) { if (attempt.timer !== null) clearTimeout(attempt.timer); active = null; }
      attempt.resolve();
    }
  }
  function start(mode:QuestionExecutionChoice=options.execution??'scripted',geographicConfirmed=false): Promise<void> {
    if(mode!=='live'&&mode!=='scripted')return Promise.resolve();
    if (active&&active.mode===mode&&active.geographicConfirmed===geographicConfirmed) return active.promise;
    if(active){stop();revision++;}
    if (!input || !input.question.trim()) {
      publish({ phase: 'error', error: 'Enter a question before starting the simulation.', run: null, linked: null });
      return Promise.resolve();
    }
    let resolve = () => {};
    const promise = new Promise<void>(done => { resolve = done; });
    const timeoutMs=options.timeoutMs??(mode==='live'?130000:15000);
    const attempt: Attempt = { id: `question-attempt-${crypto.randomUUID()}`, revision,mode,geographicConfirmed,deadline:Date.now()+timeoutMs, promise, resolve, timer: null };
    active = attempt;
    publish({ ...emptyResult(input.question),revision,executionMode:mode, phase: 'interpreting', attemptId: attempt.id, error: null, selectedArchiveId: null });
    attempt.timer = setTimeout(() => {
      if (!owns(attempt)) return;
      stop();
      publish({ phase: 'error', run: null, linked: null,live:null, error: mode==='live'?'Live inference attempt timed out. Start a new attempt.':'Simulation preparation timed out. Try again.' });
    }, timeoutMs);
    void prepare(attempt, input);
    return promise;
  }
  function cancel() { stop(); publish({ phase: 'cancelled', run: null, linked: null,live:null, error: null }); }
  function inspectArchive(id: string | null) {
    if (id !== null && !state.history.some(archive => archive.id === id)) return;
    if (id !== null) { stop(); publish({ phase: 'cancelled', run: null, linked: null,live:null, error: null, selectedArchiveId: id }); }
    else publish({ selectedArchiveId: null });
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate, start, cancel, inspectArchive,refreshInferenceStatus,
    dispose: () => { stop(); revision++; input = null; inputKey = ''; state = initial(state.history, revision); listeners.clear(); },
  };
}
export type QuestionSimulationController = ReturnType<typeof createQuestionSimulation>;
