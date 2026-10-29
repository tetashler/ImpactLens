import {type InferenceTerminationV1,INFERENCE_REJECTION_MESSAGES} from './inference-errors.ts';
/** Browser-safe live inference records. Provider configuration stays on the server. */
import {assertJsonData,ensure,object,freezeSnapshot,canonical} from '../experiments/validation.ts';
import {parseStakeholderInput,parseStakeholderRun,type StakeholderSimulationInputV1,type StakeholderSimulationRunV1} from './contract.ts';
import {inputFingerprints,verifyStakeholderRun} from './identities.ts';

export const INFERENCE_MODEL='deepseek/deepseek-v4-flash-0731' as const;
export const INFERENCE_PROVIDER='digitalocean' as const;
export const INFERENCE_LIMITS=Object.freeze({agents:4,rounds:2,calls:8,outputTokens:800,reservedTokens:214400,runTimeoutMs:120000,costUsd:0.05} as const);
export const INFERENCE_RESPONSE_BYTES=524288;
const RESERVATION_BASIS='Conservative UTF-8 bytes plus bounded output; not billed usage.' as const;
const CALL_ERRORS=new Set([...Object.keys(INFERENCE_REJECTION_MESSAGES),'AI_TIMEOUT','AI_CANCELLED','AI_REQUEST_TOO_LARGE','AI_INVALID_REQUEST','AI_INVALID_RESPONSE','AI_PROVIDER_IDENTITY','AI_CREDITS','AI_RATE_LIMIT','AI_UPSTREAM','AI_CONFIG','AI_UNSUPPORTED_MODEL']);
type Limits=Omit<typeof INFERENCE_LIMITS,'reservedTokens'>&{reservedTokens:120000|214400};
export interface InferenceCallRecordV1 {
 requestedModel:typeof INFERENCE_MODEL;requestedProvider:typeof INFERENCE_PROVIDER;
 servingModel:typeof INFERENCE_MODEL|null;servingProvider:'DigitalOcean'|null;
 identityVerification:'completion'|'generation-details'|'unverified';generationId:string|null;
 inputTokens:number|null;outputTokens:number|null;totalTokens:number|null;costUsd:number|null;
 status:'accepted'|'failed';errorCode:string|null;durationMs:number;termination?:InferenceTerminationV1;
}
export interface InferenceDiagnosticsV1 {
 version:1;requestedModel:typeof INFERENCE_MODEL;requestedProvider:typeof INFERENCE_PROVIDER;allowFallbacks:false;
 successfulCalls:number;failedCalls:number;retries:0;inputTokens:number|null;outputTokens:number|null;totalTokens:number|null;costUsd:number|null;
 reservedTokens:number;reservationBasis:typeof RESERVATION_BASIS;durationMs:number;roundsCompleted:number;activeAgents:number;
 records:InferenceCallRecordV1[];limits:Limits;
}
export interface InferenceResponseV2 {version:2;attemptId:string;run:StakeholderSimulationRunV1;inference:InferenceDiagnosticsV1}
export interface InferenceStatusV1 {
 version:1;model:typeof INFERENCE_MODEL;gateway:'OpenRouter';provider:typeof INFERENCE_PROVIDER;fallback:false;
 connection:'configured'|'not-configured';enabled:boolean;servingIdentityVerified:false;limits:Limits;
}

function bounded(value:unknown,maxBytes=INFERENCE_RESPONSE_BYTES){assertJsonData(value);ensure(new TextEncoder().encode(JSON.stringify(value)).byteLength<=maxBytes,'Live inference data exceeds the supported size.');}
function integer(value:unknown,maximum:number){ensure(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=maximum,'Invalid inference count.');}
function amount(value:unknown,maximum=Number.MAX_SAFE_INTEGER){ensure(typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=maximum,'Invalid inference measurement.');}
function limits(value:unknown,legacy=false){const parsed=object(value,Object.keys(INFERENCE_LIMITS));for(const key of Object.keys(INFERENCE_LIMITS) as (keyof Limits)[])ensure(parsed[key]===INFERENCE_LIMITS[key]||(legacy&&key==='reservedTokens'&&parsed[key]===120000),'Unexpected inference limits.');}
function liveInput(value:unknown){const input=parseStakeholderInput(value);ensure(input.simulationOptions.mode==='llm-assisted'&&input.stakeholderRoles.length<=INFERENCE_LIMITS.agents&&input.simulationOptions.rounds<=INFERENCE_LIMITS.rounds,'Expected bounded live input.');return input;}

export function parseInferenceStatus(value:unknown):InferenceStatusV1 {
 bounded(value,8192);const status=object(value,['version','model','gateway','provider','fallback','connection','enabled','servingIdentityVerified','limits']);
 ensure(status.version===1&&status.model===INFERENCE_MODEL&&status.gateway==='OpenRouter'&&status.provider===INFERENCE_PROVIDER&&status.fallback===false&&status.servingIdentityVerified===false,'Unexpected inference connection identity.');
 ensure(status.connection==='configured'||status.connection==='not-configured');ensure(typeof status.enabled==='boolean');limits(status.limits);
 return freezeSnapshot(value) as InferenceStatusV1;
}

export function parseInferenceCallRecord(value:unknown,outputLimit=1200):InferenceCallRecordV1 {
 bounded(value,8192);ensure(outputLimit>=1&&outputLimit<=6000);

  const required=['requestedModel','requestedProvider','servingModel','servingProvider','identityVerification','generationId','inputTokens','outputTokens','totalTokens','costUsd','status','errorCode','durationMs'];
  const record=object(value,[...required,'termination'],required);
  if(record.termination!==undefined){
   const info=object(record.termination,['httpStatus','finishReason','nativeFinishReason','reasoningTokens','requestedOutputTokens','jsonValid','actionValid']);
   if(info.httpStatus!==null){integer(info.httpStatus,599);ensure((info.httpStatus as number)>=100);}
   for(const field of ['finishReason','nativeFinishReason'])ensure(info[field]===null||['stop','length','content_filter','tool_calls','error','other'].includes(info[field] as string));
   if(info.reasoningTokens!==null)integer(info.reasoningTokens,1000000000);
   integer(info.requestedOutputTokens,outputLimit);ensure((info.requestedOutputTokens as number)>0);
   for(const field of ['jsonValid','actionValid'])ensure(info[field]===null||typeof info[field]==='boolean');
   if(record.status==='accepted')ensure(info.finishReason==='stop'&&info.jsonValid===true&&info.actionValid===true,'Accepted call requires complete validated output.');
  }
  ensure(record.requestedModel===INFERENCE_MODEL&&record.requestedProvider===INFERENCE_PROVIDER);ensure(record.servingModel===null||record.servingModel===INFERENCE_MODEL);ensure(record.servingProvider===null||record.servingProvider==='DigitalOcean');
  ensure(['completion','generation-details','unverified'].includes(record.identityVerification as string));
  ensure(record.generationId===null||typeof record.generationId==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(record.generationId));
  if(record.identityVerification!=='unverified')ensure(record.servingModel===INFERENCE_MODEL&&record.servingProvider==='DigitalOcean','Unverified serving identity.');
  if(record.identityVerification==='generation-details')ensure(record.generationId!==null);
  ensure(record.status==='accepted'||record.status==='failed');
  if(record.status==='accepted')ensure(record.identityVerification!=='unverified'&&record.errorCode===null,'Accepted call requires verified serving identity.');
  else ensure(typeof record.errorCode==='string'&&CALL_ERRORS.has(record.errorCode),'Unexpected inference error code.');
  for(const field of ['inputTokens','outputTokens','totalTokens'] as const)if(record[field]!==null)integer(record[field],field==='totalTokens'?2000000000:1000000000);
  if(record.costUsd!==null)amount(record.costUsd);integer(record.durationMs,130000);

 return freezeSnapshot(value) as InferenceCallRecordV1;
}

export function parseInferenceDiagnostics(value:unknown,runValue:StakeholderSimulationRunV1):InferenceDiagnosticsV1 {
 bounded(value);assertJsonData(runValue);const run=parseStakeholderRun(runValue),input=liveInput(run.inputSnapshot);
 ensure(run.execution.provider==='openrouter'&&run.execution.model===INFERENCE_MODEL,'Unexpected live execution identity.');
 const diagnostics=object(value,['version','requestedModel','requestedProvider','allowFallbacks','successfulCalls','failedCalls','retries','inputTokens','outputTokens','totalTokens','costUsd','reservedTokens','reservationBasis','durationMs','roundsCompleted','activeAgents','records','limits']);
 ensure(diagnostics.version===1&&diagnostics.requestedModel===INFERENCE_MODEL&&diagnostics.requestedProvider===INFERENCE_PROVIDER&&diagnostics.allowFallbacks===false&&diagnostics.retries===0,'Unexpected inference routing.');limits(diagnostics.limits,true);
 integer(diagnostics.successfulCalls,8);integer(diagnostics.failedCalls,1);integer(diagnostics.reservedTokens,(diagnostics.limits as Limits).reservedTokens);integer(diagnostics.durationMs,130000);integer(diagnostics.roundsCompleted,2);integer(diagnostics.activeAgents,4);
 ensure(diagnostics.activeAgents===input.stakeholderRoles.length&&diagnostics.roundsCompleted===Math.floor(run.events.length/input.stakeholderRoles.length),'Inference progress does not match recorded events.');
 ensure(diagnostics.reservationBasis===RESERVATION_BASIS);ensure(Array.isArray(diagnostics.records)&&diagnostics.records.length<=input.stakeholderRoles.length*input.simulationOptions.rounds,'Too many inference calls.');
 const records=diagnostics.records as unknown[];
 for(const value of records)parseInferenceCallRecord(value);
 const typedRecords=records as InferenceCallRecordV1[];
 const accepted=typedRecords.filter(record=>record.status==='accepted').length,failed=typedRecords.length-accepted;
 ensure(diagnostics.successfulCalls===accepted&&diagnostics.failedCalls===failed,'Inference counts do not match call records.');
 ensure(typedRecords.every((record,index)=>record.status==='accepted'||index===typedRecords.length-1),'A failed inference call must be the final call.');
 ensure(accepted>=run.events.length&&accepted-run.events.length<=(run.status==='cancelled'?1:0),'Inference calls do not match accepted events.');
 if(run.status==='completed')ensure(failed===0,'Completed run contains a failed call.');
 for(const field of ['inputTokens','outputTokens','totalTokens','costUsd'] as const){
  const expected=typedRecords.length>0&&typedRecords.every(record=>record[field]!==null)?typedRecords.reduce((total,record)=>total+(record[field]??0),0):null;
  if(diagnostics[field]!==null)amount(diagnostics[field]);
  ensure(expected===diagnostics[field],'Inference usage does not match call records.');
 }
 return freezeSnapshot(value) as InferenceDiagnosticsV1;
}

export async function validateInferenceResponse(value:unknown,expected:{attemptId:string;input:StakeholderSimulationInputV1}):Promise<InferenceResponseV2>{
 bounded(value);const response=object(value,['version','attemptId','run','inference']);
 ensure(response.version===2&&response.attemptId===expected.attemptId&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(expected.attemptId),'Live inference response identity mismatch.');
 assertJsonData(expected.input);const input=liveInput(expected.input),run=await verifyStakeholderRun(response.run),fingerprints=await inputFingerprints(input);
 ensure(run.attemptId===expected.attemptId&&run.inputFingerprint===fingerprints.inputFingerprint&&run.evidenceFingerprint===fingerprints.evidenceFingerprint&&canonical(run.inputSnapshot)===canonical(input),'Live inference response does not match the submitted input.');
 const inference=parseInferenceDiagnostics(response.inference,run);
 return freezeSnapshot({version:2,attemptId:expected.attemptId,run,inference});
}
