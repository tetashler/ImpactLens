/** One planner + at most eight actions. No client-authored generated-role manifest is executable here. */
import {parseDynamicWire,dynamicAccounting,DYNAMIC_ERRORS} from '../../dynamic-scenarios/response.ts';
import {createDynamicPlan,DYNAMIC_LIMITS} from '../../dynamic-scenarios/plan.ts';
import {createDynamicInput} from '../../dynamic-scenarios/execution.ts';
import {digest} from '../../experiments/validation.ts';
import {readBody} from '../stakeholder-simulation/service.ts';
import {createDynamicPlanner} from './planner.ts';
import {createDeepseekTransport,type InferenceCallRecord} from './deepseek.ts';
import {executeLiveRun} from './service.ts';
import {acquireAiSlot} from '../ai/gate.ts';
import {AiError} from '../ai/errors.ts';
export interface DynamicDependencies {enabled?:boolean;key?:string;fetcher?:typeof fetch}
const state=globalThis as typeof globalThis&{__dynamicAttempts?:Map<string,number>};const attempts=state.__dynamicAttempts??=new Map<string,number>();
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function handleDynamicRequest(request:Request,dependencies:DynamicDependencies={}){
 let wire,planningRecord:InferenceCallRecord|null=null,requestIdentity='';const abort=new AbortController();const cancel=()=>abort.abort();request.signal.addEventListener('abort',cancel,{once:true});if(request.signal.aborted)cancel();const timer=setTimeout(cancel,DYNAMIC_LIMITS.timeoutMs);
 try{
  const url=new URL(request.url),origin=request.headers.get('origin');if(url.search||origin&&origin!==new URL(`${url.protocol}//${request.headers.get('host')??url.host}`).origin)return json({error:'Use the application origin without query parameters.'},403);
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return json({error:'Use application/json.'},415);
  try{wire=parseDynamicWire(await readBody(request,abort.signal));}catch{return json({error:'Invalid bounded scenario request.'},400);}
  requestIdentity=await digest('dynamic-request-',wire.request);
  if(!(dependencies.enabled??process.env.STAKEHOLDER_LIVE_ENABLED==='true'))throw new AiError('','AI_CONFIG',503);
  const key=dependencies.key??process.env.OPENROUTER_API_KEY??'';if(!key.trim())throw new AiError('','AI_CONFIG',503);
  for(const [id,time]of attempts)if(Date.now()-time>86400000)attempts.delete(id);
  if(attempts.has(wire.attemptId))throw new AiError('','AI_DUPLICATE',409);if(attempts.size>=2048)throw new AiError('','AI_BUSY',429);
  const release=acquireAiSlot(`dynamic-plan:${wire.attemptId}`);attempts.set(wire.attemptId,Date.now());let draft;
  try{const planner=createDynamicPlanner({key,fetcher:dependencies.fetcher,onRecord:r=>{planningRecord=r;}});draft=(await planner.generate(wire.request,abort.signal)).value;}finally{release();}
  const plan=await createDynamicPlan(wire.request,draft);if(abort.signal.aborted)throw new AiError('','AI_CANCELLED',499);
  const input=await createDynamicInput(plan),transport=createDeepseekTransport({key,fetcher:dependencies.fetcher,maxOutputTokens:800});
  const result=await executeLiveRun(input,wire.attemptId,{enabled:true,key,transport,initialCostUsd:(planningRecord as InferenceCallRecord|null)?.costUsd??null},abort.signal);
  const body={version:1,kind:'dynamic-execution',attemptId:wire.attemptId,requestIdentity,plan,planning:{record:planningRecord},...result,accounting:dynamicAccounting(planningRecord,result.inference.records)};
  return json(body);
 }catch(error){
  if(!wire)return json({error:'Scenario planning could not start.'},400);
  const original=error instanceof AiError?error.code:'AI_PLAN_INVALID',code=Object.hasOwn(DYNAMIC_ERRORS,original)?original:'AI_PLAN_INVALID';
  return json({version:1,kind:'planning-failed',attemptId:wire.attemptId,requestIdentity,planning:{record:planningRecord},error:{code,message:DYNAMIC_ERRORS[code]},accounting:dynamicAccounting(planningRecord,[])},error instanceof AiError?error.status:502);
 }finally{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);}
}
