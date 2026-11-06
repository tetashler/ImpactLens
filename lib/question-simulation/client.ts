import {parseAssumptionDecisions,type AssumptionReviewDraft,type AssumptionDecision} from '../assumption-review/contract.ts';
import {parseHybridExploreOptions,type HybridExploreOptions,type HybridReview} from '../interventions/explore-contract.ts';
import {PublicScenarioSession,ScenarioRateLimitError,parsePublicExplore} from './public-session.ts';
import type {PublicExplore} from '../society/public-contract.ts';
import {DynamicSession} from '../dynamic-scenarios/client.ts';
import {dynamicFailureMessage,type DynamicResponse,type DynamicFailure} from '../dynamic-scenarios/response.ts';
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

export type QuestionSimulationPhase = 'idle' | 'reviewing-assumptions' | 'interpreting' | 'preparing' | 'executing' | 'completed' | 'partial' | 'failed' | 'unsupported' | 'needs-map-review' | 'cancelled' | 'error';
export type QuestionExecutionChoice='live'|'scripted'|'dynamic';
export interface QuestionSimulationContext { question: string; geometry: ScenarioGeometry; geometryRevision: number;hybrid?:HybridExploreOptions }
interface QuestionResult {
  assumptionReview?:AssumptionReviewDraft|null;
  hybridReview?:HybridReview|null;
  publicRun?:PublicExplore|null;
  question: string;
  scope: QuestionContextV1 | null;
  plan: ScenarioPlan | null;
  record: ScenarioExperimentV1 | null;
  run: StakeholderSimulationRunV1 | null;
  linked: LinkedStakeholderRunV1 | null;
  live?:QuestionLiveExecutionV1|null;
  executionMode?:QuestionExecutionChoice|null;
  dynamic?:DynamicResponse|null;dynamicFailure?:DynamicFailure|null;
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
export interface QuestionSimulationOptions { fetcher?: typeof fetch; timeoutMs?: number; execution?:QuestionExecutionChoice;publicOnly?:boolean;onPublicRunAccepted?:(value:PublicExplore)=>void }
interface Attempt { id: string; revision: number; mode:QuestionExecutionChoice; geographicConfirmed:boolean; deadline:number; promise: Promise<void>; resolve: () => void; timer: ReturnType<typeof setTimeout> | null }
class Superseded extends Error {}
const SAFE_LIVE_ERRORS=new Set([
  'Live AI simulation is not configured. The configured model provider is unavailable for this run.',
  'Live inference is not configured or enabled on the server. Check Settings.',
  'Live inference is busy. Wait before starting a new attempt.',
  'Live inference request timed out. Start a new attempt.',
  'Live inference could not complete. Start a new attempt.',
  'Live inference returned an invalid response.',
  'The required serving model and provider could not be verified.',
  'This attempt was already used. Start a new attempt.',
]);

function emptyResult(question = ''): QuestionResult { return { question,assumptionReview:null,hybridReview:null, scope: null, plan: null, record: null, run: null, linked: null,publicRun:null,live:null,dynamic:null,dynamicFailure:null,executionMode:null }; }
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
  let locallyAcceptedRunIds:string[]=[];
  const session = new StakeholderRequestSession();
  const liveSession=new LiveInferenceSession();
  const dynamicSession=new DynamicSession(),publicSession=new PublicScenarioSession();
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
    liveSession.cancel();dynamicSession.cancel();publicSession.discard(options.fetcher??fetch);statusEpoch++;statusController?.abort();statusController=null;
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
      const supplied = object(value, ['question', 'geometry', 'geometryRevision','hybrid'],['question','geometry','geometryRevision']);
      text(supplied.question, 2000, true);
      if (typeof supplied.geometryRevision !== 'number' || !Number.isSafeInteger(supplied.geometryRevision) || supplied.geometryRevision < 0 || supplied.geometryRevision > 1_000_000_000) throw new Error();
      const next: QuestionSimulationContext = { question: supplied.question as string, geometry: parseScenarioGeometry(supplied.geometry), geometryRevision: supplied.geometryRevision,...(supplied.hybrid?{hybrid:parseHybridExploreOptions(supplied.hybrid)}:{}) };
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
      ...result, id: result.publicRun?.runId??result.run?.runId ?? result.record?.experimentId ?? `review-${attempt.id}`,
      attemptId: attempt.id, revision: attempt.revision, phase, createdAt: new Date().toISOString(),
    };
    let error=result.run?questionRunErrorMessage(result.run):null;
    // Persist the initial accepted run before consumers begin passive background refresh.
    if(result.publicRun){
      locallyAcceptedRunIds=[result.publicRun.runId,...locallyAcceptedRunIds.filter(id=>id!==result.publicRun!.runId)].slice(0,4);
      try{options.onPublicRunAccepted?.(result.publicRun);}catch{error='Browser summary persistence is unavailable; server records remain retained.';}
    }
    publish({ ...result, phase, error, history: [archive, ...state.history.filter(item=>item.id!==archive.id)].slice(0, 4), selectedArchiveId: null });
  }
  async function prepare(attempt: Attempt, context: QuestionSimulationContext) {
    try {
      if(attempt.mode==='dynamic'&&options.publicOnly){publish({phase:'preparing'});const response=await checked(attempt,publicSession.execute({version:1,question:context.question,geometry:context.geometry,geometryRevision:context.geometryRevision},`${attempt.id}:${attempt.revision}`,options.fetcher??fetch,Math.max(1,Math.min(context.hybrid?235000:125000,attempt.deadline-Date.now())),context.hybrid));if(!response)return;if(response.kind==='assumption-review'){publish({...emptyResult(context.question),executionMode:'dynamic',phase:'reviewing-assumptions',assumptionReview:response});return;}if(response.kind==='hybrid-map-review'){publish({...emptyResult(context.question),executionMode:'dynamic',phase:'needs-map-review',hybridReview:response,error:response.message});return;}if(response.kind==='planning-failed'){publish({...emptyResult(context.question),executionMode:'dynamic',phase:'error',dynamicFailure:response,error:dynamicFailureMessage(response)});return;}finish(attempt,{...emptyResult(context.question),executionMode:'dynamic',publicRun:response},response.status==='completed'?'completed':response.initialActions.length?'partial':'failed');return;}
      if(attempt.mode==='dynamic'){
        publish({phase:'preparing'});
        const response=await checked(attempt,dynamicSession.execute({version:1,question:context.question,geometry:context.geometry,geometryRevision:context.geometryRevision},`${attempt.id}:${attempt.revision}`,options.fetcher??fetch,Math.max(1,Math.min(125000,attempt.deadline-Date.now()))));
        if(!response){if(owns(attempt))publish({phase:'cancelled'});return;}
        if(response.kind==='planning-failed'){publish({...emptyResult(context.question),executionMode:'dynamic',phase:'error',dynamicFailure:response,error:dynamicFailureMessage(response)});return;}
        const result:QuestionResult={...emptyResult(context.question),executionMode:'dynamic',dynamic:response,run:response.run};
        finish(attempt,result,response.run.status);return;
      }
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
        if(!status||status.connection!=='configured'||!status.enabled)throw new Error('Live AI simulation is not configured. The configured model provider is unavailable for this run.');
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
      if (owns(attempt) && !(error instanceof Superseded)) publish({ phase: 'error', run: null, linked: null,publicRun:null,live:null,dynamic:null,dynamicFailure:null, error: error instanceof ScenarioRateLimitError?error.message:attempt.mode!=='scripted'&&error instanceof Error&&SAFE_LIVE_ERRORS.has(error.message)?error.message:'This question could not be prepared or executed safely. Try again.' });
    } finally {
      if (active === attempt) { if (attempt.timer !== null) clearTimeout(attempt.timer); active = null; }
      attempt.resolve();
    }
  }
  function start(mode:QuestionExecutionChoice=options.execution??'scripted',geographicConfirmed=false): Promise<void> {
    if(mode!=='live'&&mode!=='scripted'&&mode!=='dynamic')return Promise.resolve();
    if (active&&active.mode===mode&&active.geographicConfirmed===geographicConfirmed) return active.promise;
    if(active){stop();revision++;}
    if (!input || !input.question.trim()) {
      publish({ phase: 'error', error: 'Enter a question before starting the simulation.', run: null, linked: null });
      return Promise.resolve();
    }
    let resolve = () => {};
    const promise = new Promise<void>(done => { resolve = done; });
    const timeoutMs=options.timeoutMs??(mode==='dynamic'&&options.publicOnly&&input?.hybrid?240000:mode!=='scripted'?130000:15000);
    const attempt: Attempt = { id: `question-attempt-${crypto.randomUUID()}`, revision,mode,geographicConfirmed,deadline:Date.now()+timeoutMs, promise, resolve, timer: null };
    active = attempt;
    publish({ ...emptyResult(input.question),revision,executionMode:mode, phase: 'interpreting', attemptId: attempt.id, error: null, selectedArchiveId: null });
    attempt.timer = setTimeout(() => {
      if (!owns(attempt)) return;
      stop();
      publish({ phase: 'error', run: null, linked: null,publicRun:null,live:null,dynamic:null,dynamicFailure:null, error: mode!=='scripted'?'Live inference attempt timed out. Start a new attempt.':'Simulation preparation timed out. Try again.' });
    }, timeoutMs);
    void prepare(attempt, input);
    return promise;
  }
  function startReviewed(decisions:AssumptionDecision[]):Promise<void>{
    if(active?.mode==='dynamic')return active.promise;
    const draft=state.assumptionReview;if(!input||!draft||state.phase!=='reviewing-assumptions')return Promise.resolve();
    try{parseAssumptionDecisions(decisions,draft.assumptions);}catch{publish({error:'Choose Allow or Do not allow for every assumption.'});return Promise.resolve();}
    if(Date.now()>=Date.parse(draft.expiresAt)){stop();publish({phase:'error',assumptionReview:null,error:'This review expired. Prepare a new review.'});return Promise.resolve();}
    let resolve=()=>{};const promise=new Promise<void>(done=>resolve=done),id=state.attemptId!;
    const attempt:Attempt={id,revision,mode:'dynamic',geographicConfirmed:false,deadline:Date.now()+240000,promise,resolve,timer:null};active=attempt;
    publish({phase:'executing',assumptionReview:null,error:null});
    attempt.timer=setTimeout(()=>{if(!owns(attempt))return;stop();publish({phase:'error',error:'Reviewed execution timed out. No automatic retry was made.'});},240000);
    void(async()=>{try{
      const response=await checked(attempt,publicSession.startReviewed(decisions,`${id}:${revision}`,options.fetcher??fetch,240000));if(!response)return;
      finish(attempt,{...emptyResult(response.question),executionMode:'dynamic',publicRun:response},response.status==='completed'?'completed':response.initialActions.length?'partial':'failed');
    }catch{if(owns(attempt))publish({phase:'error',error:'The reviewed simulation could not complete safely. No automatic retry was made.'});}
    finally{if(active===attempt){if(attempt.timer!==null)clearTimeout(attempt.timer);active=null;}attempt.resolve();}})();return promise;
  }
  function reviseReview(){stop();publish({...emptyResult(input?.question??state.question),phase:'idle',attemptId:null,error:null,selectedArchiveId:null});}
  function cancel() { stop(); publish({ assumptionReview:null, phase: 'cancelled', run: null, linked: null,publicRun:null,live:null,dynamic:null,dynamicFailure:null, error: null }); }
  function inspectArchive(id: string | null) {
    if (id !== null && !state.history.some(archive => archive.id === id)) return;
    if (id !== null) {
      const pending=active!==null||!!state.assumptionReview;stop();
      // Inspecting history must not erase a completed current run. Pending work is still cancelled.
      publish(pending?{ assumptionReview:null, phase: 'cancelled', run: null, linked: null,publicRun:null,live:null,dynamic:null,dynamicFailure:null, error: null, selectedArchiveId: id }:{selectedArchiveId:id});
    }
    else publish({ selectedArchiveId: null });
  }
  return {restorePublicHistory:(values:PublicExplore[])=>{
      const history=new Map(state.history.map(item=>[item.id,item]));
      for(const value of values.slice(0,4)){
        const p=parsePublicExplore(value),previous=history.get(p.runId)?.publicRun;
        if(previous&&Math.max(previous.session?.revision??0,previous.job?.revision??0)>=Math.max(p.session?.revision??0,p.job?.revision??0))continue;
        const archive:QuestionSimulationArchive={...emptyResult(p.question),publicRun:p,id:p.runId,attemptId:p.attemptId,revision:0,phase:p.status==='completed'?'completed':'partial',createdAt:new Date().toISOString()};
        history.set(p.runId,archive);
      }
      // Keep an active report and inspected archive visible, then honour restored recency.
      const ids=[...new Set([state.publicRun?.runId,state.selectedArchiveId,...locallyAcceptedRunIds,...values.slice(0,4).map(value=>value.runId),...state.history.map(item=>item.id)])];
      publish({history:ids.flatMap(id=>id&&history.has(id)?[history.get(id)!]:[]).slice(0,4)});
    },
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate, start, startReviewed, reviseReview, cancel, inspectArchive,refreshInferenceStatus,
    dispose: () => { stop(); revision++; input = null; inputKey = ''; state = initial(state.history, revision); listeners.clear(); },
  };
}
export type QuestionSimulationController = ReturnType<typeof createQuestionSimulation>;
