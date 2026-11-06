import {configuredInferenceKey} from './route.ts';
import {aiRateLimitHeaders} from '../ai/rate-limit.ts';
/** Two registered planning stages + at most eight actions. No client-authored generated-role manifest is executable here. */
import {retrieveScenarioResearch} from '../evidence/scenario-research.ts';
import {researchLocality} from '../evidence/research-locality.ts';
import {parseDynamicWire,dynamicAccounting,DYNAMIC_ERRORS,type DynamicResponse} from '../../dynamic-scenarios/response.ts';
import {createDynamicPlan,validateDynamicPlan,DYNAMIC_LIMITS,type DynamicScenarioPlan} from '../../dynamic-scenarios/plan.ts';
import {createDynamicInput} from '../../dynamic-scenarios/execution.ts';
import {digest} from '../../experiments/validation.ts';
import {readBody} from '../stakeholder-simulation/service.ts';
import {registerDraft} from '../../dynamic-scenarios/registration.ts';
import {createEntityPlanner,createRelationshipPlanner} from './planner.ts';
import {createDeepseekTransport,type InferenceCallRecord} from './deepseek.ts';
import {executeLiveRun} from './service.ts';
import {acquireAiSlot} from '../ai/gate.ts';
import {AiError} from '../ai/errors.ts';
import {buildScenarioDemographicContext} from '../demographics/scenario-context.ts';
import {PlannerValidationError} from '../../dynamic-scenarios/diagnostics.ts';
import {summariseRetrieval,type RetrievalDiagnostic} from '../../grounding/diagnostics.ts';
export interface PreparedDynamic {plan:DynamicScenarioPlan;attemptId:string;requestIdentity:string;planningRecords:InferenceCallRecord[]}
export interface DynamicDependencies {enabled?:boolean;key?:string;fetcher?:typeof fetch;groundingKey?:string;groundingFetcher?:typeof fetch;totalTimeoutMs?:number;plannerTimeoutMs?:number;groundingTimeoutMs?:number;/** Server callback only; never parsed from HTTP. */onPrepared?:(value:PreparedDynamic)=>Promise<Response>}
const state=globalThis as typeof globalThis&{__dynamicAttempts?:Map<string,number>};const attempts=state.__dynamicAttempts??=new Map<string,number>();
const json=(body:unknown,status=200,extraHeaders:Record<string,string>={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...extraHeaders}});
function boundedTimeout(value:number|undefined,maximum:number):number{if(value===undefined)return maximum;if(!Number.isSafeInteger(value)||value<1||value>maximum)throw new AiError('','AI_CONFIG',503);return value;}
/** Executes an already validated server plan without repeating research or planning. */
export async function executePreparedDynamic(prepared:PreparedDynamic,dependencies:DynamicDependencies={},signal?:AbortSignal):Promise<DynamicResponse>{
 signal?.throwIfAborted();const plan=await validateDynamicPlan(prepared.plan);
 if(!(dependencies.enabled??process.env.STAKEHOLDER_LIVE_ENABLED==='true'))throw new AiError('','AI_CONFIG',503);
 const key=dependencies.key??configuredInferenceKey();if(!key.trim())throw new AiError('','AI_CONFIG',503);
 const records=prepared.planningRecords,input=await createDynamicInput(plan),transport=createDeepseekTransport({key,fetcher:dependencies.fetcher,maxOutputTokens:800});
 const result=await executeLiveRun(input,prepared.attemptId,{enabled:true,key,transport,initialCostUsd:dynamicAccounting(records,[]).costUsd},signal);
 return {version:2,kind:'dynamic-execution',attemptId:prepared.attemptId,requestIdentity:prepared.requestIdentity,plan,planning:{record:records.at(-1)!,records},...result,accounting:dynamicAccounting(records,result.inference.records)};
}
export async function handleDynamicRequest(request:Request,dependencies:DynamicDependencies={}){
 const planningRecords:InferenceCallRecord[]=[];let registration;
 let wire,planningRecord:InferenceCallRecord|null=null,requestIdentity='',retrieval:RetrievalDiagnostic|undefined;
 let stage:'retrieval'|'planning'|'execution'='planning',stageStarted=Date.now(),deadlineExpired=false,upstreamStatus:number|null=null;
 const abort=new AbortController(),cancel=()=>abort.abort();request.signal.addEventListener('abort',cancel,{once:true});if(request.signal.aborted)cancel();
 // A server deadline is separate from a caller cancelling the request. Invalid overrides
 // use the production bound until their configuration can be returned with wire identity.
 const requestedTotal=dependencies.totalTimeoutMs,totalTimeoutMs=typeof requestedTotal==='number'&&Number.isSafeInteger(requestedTotal)&&requestedTotal>=1&&requestedTotal<=DYNAMIC_LIMITS.timeoutMs?requestedTotal:DYNAMIC_LIMITS.timeoutMs;
 const timer=setTimeout(()=>{if(!abort.signal.aborted){deadlineExpired=true;abort.abort();}},totalTimeoutMs);
 try{
  const url=new URL(request.url),origin=request.headers.get('origin');if(url.search||origin&&origin!==new URL(`${url.protocol}//${request.headers.get('host')??url.host}`).origin)return json({error:'Use the application origin without query parameters.'},403);
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return json({error:'Use application/json.'},415);
  try{wire=parseDynamicWire(await readBody(request,abort.signal));}catch{return json({error:'Invalid bounded scenario request.'},400);}
  requestIdentity=await digest('dynamic-request-',wire.request);
  boundedTimeout(dependencies.totalTimeoutMs,DYNAMIC_LIMITS.timeoutMs);const plannerTimeoutMs=boundedTimeout(dependencies.plannerTimeoutMs,45000),groundingTimeoutMs=boundedTimeout(dependencies.groundingTimeoutMs,10000);
  if(!(dependencies.enabled??process.env.STAKEHOLDER_LIVE_ENABLED==='true'))throw new AiError('','AI_CONFIG',503);
  const key=dependencies.key??configuredInferenceKey();if(!key.trim())throw new AiError('','AI_CONFIG',503);
  for(const [id,time]of attempts)if(Date.now()-time>86400000)attempts.delete(id);
  if(attempts.has(wire.attemptId))throw new AiError('','AI_DUPLICATE',409);if(attempts.size>=2048)throw new AiError('','AI_BUSY',429);
  const demographics=buildScenarioDemographicContext(wire.request.question,wire.request.geometry);
  const locality=researchLocality(wire.request.geometry,demographics.planningArea?.name);
  const release=acquireAiSlot(`dynamic-plan:${wire.attemptId}`);attempts.set(wire.attemptId,Date.now());let draft;let grounding;
  try{
   stage='retrieval';stageStarted=Date.now();grounding=await retrieveScenarioResearch(wire.request.question,locality,abort.signal,{key:dependencies.groundingKey,fetcher:dependencies.groundingFetcher,timeoutMs:groundingTimeoutMs,passagePolicy:'locality-window-v1',locality});
   retrieval=summariseRetrieval(grounding,Date.now()-stageStarted);
   stage='planning';stageStarted=Date.now();
   const fetcher:typeof fetch=async(url,init)=>{const response=await (dependencies.fetcher??fetch)(url,init);upstreamStatus=response.status;return response;};
   const options={key,fetcher,timeoutMs:plannerTimeoutMs,onRecord:(r:InferenceCallRecord)=>{planningRecord=r;planningRecords.push(r);}};
   const entityPlanner=createEntityPlanner(options,grounding,demographics),registered=registerDraft((await entityPlanner.generate(wire.request,abort.signal)).value,'retrieved-passage-selection-v1');registration=registered.registration;
   if(abort.signal.aborted)throw new AiError('','AI_CANCELLED',499);
   if((dynamicAccounting(planningRecords,[]).costUsd??0)>=DYNAMIC_LIMITS.costUsd)throw new AiError('','AI_PLAN_BUDGET',429);
   stageStarted=Date.now();draft=(await createRelationshipPlanner(options,registered.draft,grounding).generate(wire.request,abort.signal)).value;
  }finally{release();}
  const plan=await createDynamicPlan(wire.request,draft,grounding,demographics,registration);if(abort.signal.aborted)throw new AiError('','AI_CANCELLED',499);
  const prepared={plan,attemptId:wire.attemptId,requestIdentity,planningRecords};
  if(dependencies.onPrepared)return await dependencies.onPrepared(prepared);
  stage='execution';stageStarted=Date.now();const body=await executePreparedDynamic(prepared,dependencies,abort.signal);
  return json(body);
 }catch(caught){
  const error=abort.signal.aborted?new AiError('',deadlineExpired?'AI_TIMEOUT':'AI_CANCELLED',deadlineExpired?504:499):caught;
  if(!wire)return json({error:'Scenario planning could not start.'},400);
  const validation=error instanceof PlannerValidationError?error.diagnostic:error instanceof AiError?error.plannerValidation:undefined;
  const original=validation?.rule==='plan.scenario_alignment_failed'?'AI_PLAN_SCENARIO_MISMATCH':error instanceof AiError?error.code:'AI_PLAN_INVALID',code=Object.hasOwn(DYNAMIC_ERRORS,original)?original:'AI_PLAN_INVALID';
  const reason=code==='AI_TIMEOUT'?'deadline':code==='AI_CANCELLED'?'cancelled':code==='AI_UPSTREAM'&&[408,504].includes(upstreamStatus??0)?'upstream-timeout':(code==='AI_PLAN_INVALID'||code==='AI_PLAN_SCENARIO_MISMATCH')?'invalid-output':code==='AI_UPSTREAM'?'upstream-error':'unavailable';
  const diagnostic={stage,reason,elapsedMs:Math.min(DYNAMIC_LIMITS.timeoutMs,Math.max(0,Date.now()-stageStarted))};
  return json({version:2,kind:'planning-failed',attemptId:wire.attemptId,requestIdentity,planning:{record:planningRecord,records:planningRecords},error:{code,message:DYNAMIC_ERRORS[code],diagnostic,...(error instanceof AiError&&error.retryAfterSeconds?{retryAfterSeconds:error.retryAfterSeconds}:{}),...(validation?{validation}:{})},...(retrieval?{retrieval}:{}),accounting:dynamicAccounting(planningRecords,[])},error instanceof AiError?error.status:502,aiRateLimitHeaders(error));
 }finally{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);}
}
