import {parseDynamicRequest,validateDynamicPlan,type DynamicRequest,type DynamicScenarioPlan} from './plan.ts';
import {createDynamicInput} from './execution.ts';
import {parseInferenceCallRecord,validateInferenceResponse,type InferenceCallRecordV1,type InferenceDiagnosticsV1} from '../stakeholder-simulation/inference-contract.ts';
import type {StakeholderSimulationRunV1} from '../stakeholder-simulation/contract.ts';
import {assertJsonData,canonical,digest,ensure,freezeSnapshot,identifier,object} from '../experiments/validation.ts';
export interface DynamicWire {version:1;attemptId:string;request:DynamicRequest}
export interface DynamicAccounting {planningCalls:number;actionCalls:number;totalCalls:number;inputTokens:number|null;outputTokens:number|null;totalTokens:number|null;costUsd:number|null}
export interface DynamicResponse {version:1;kind:'dynamic-execution';attemptId:string;requestIdentity:string;plan:DynamicScenarioPlan;planning:{record:InferenceCallRecordV1};run:StakeholderSimulationRunV1;inference:InferenceDiagnosticsV1;accounting:DynamicAccounting}
export interface DynamicFailure {version:1;kind:'planning-failed';attemptId:string;requestIdentity:string;planning:{record:InferenceCallRecordV1|null};error:{code:string;message:string};accounting:DynamicAccounting}
export const DYNAMIC_ERRORS:Record<string,string>={AI_CONFIG:'Live scenario planning is not configured or enabled.',AI_PLAN_INVALID:'The AI scenario plan was invalid. Retry with a new attempt.',AI_PROVIDER_IDENTITY:'The required serving model/provider could not be verified.',AI_TIMEOUT:'Scenario planning timed out. Retry with a new attempt.',AI_CANCELLED:'Scenario planning was cancelled.',AI_BUSY:'Inference is busy. Retry after the current request.',AI_DUPLICATE:'This attempt has already been used. Start a new attempt.',AI_RATE_LIMIT:'The provider rate limit was reached. Retry later.',AI_CREDITS:'The provider reports insufficient credits.',AI_UPSTREAM:'The provider could not complete scenario planning.',AI_REQUEST_TOO_LARGE:'The scenario context exceeded the supported input size.'};
export function parseDynamicWire(value:unknown):DynamicWire{assertJsonData(value);const w=object(value,['version','attemptId','request']);ensure(w.version===1);identifier(w.attemptId);ensure((w.attemptId as string).length<=64);return freezeSnapshot({version:1,attemptId:w.attemptId as string,request:parseDynamicRequest(w.request)});}
export function dynamicAccounting(planning:InferenceCallRecordV1|null,actions:InferenceCallRecordV1[]):DynamicAccounting{const records=[...(planning?[planning]:[]),...actions];const sum=(key:'inputTokens'|'outputTokens'|'totalTokens'|'costUsd')=>records.every(r=>r[key]!==null)?records.reduce((n,r)=>n+(r[key]??0),0):null;return {planningCalls:planning?1:0,actionCalls:actions.length,totalCalls:records.length,inputTokens:sum('inputTokens'),outputTokens:sum('outputTokens'),totalTokens:sum('totalTokens'),costUsd:sum('costUsd')};}
export async function validateDynamicResponse(value:unknown,wireValue:DynamicWire):Promise<DynamicResponse|DynamicFailure>{
 assertJsonData(value);ensure(new TextEncoder().encode(JSON.stringify(value)).byteLength<=1048576);const wire=parseDynamicWire(wireValue);
 const keys=['version','kind','attemptId','requestIdentity','planning','accounting'];const v=value as Record<string,unknown>;
 object(value,[...keys,...(v.kind==='planning-failed'?['error']:['plan','run','inference'])]);ensure(v.version===1&&v.attemptId===wire.attemptId&&v.requestIdentity===await digest('dynamic-request-',wire.request),'Scenario response identity mismatch.');
 const p=object(v.planning,['record']);const record=p.record===null?null:parseInferenceCallRecord(p.record,6000);
 if(v.kind==='planning-failed'){
  const e=object(v.error,['code','message']);ensure(typeof e.code==='string'&&Object.hasOwn(DYNAMIC_ERRORS,e.code)&&e.message===DYNAMIC_ERRORS[e.code]);
  ensure(canonical(v.accounting)===canonical(dynamicAccounting(record,[])));return freezeSnapshot(value) as DynamicFailure;
 }
 ensure(v.kind==='dynamic-execution'&&record?.status==='accepted'&&[3000,6000].includes(record.termination?.requestedOutputTokens??0),'A dynamic execution needs accepted planning.');
 const plan=await validateDynamicPlan(v.plan);ensure(record.termination?.requestedOutputTokens===(plan.version===2?6000:3000),'Planning cap differs from the versioned contract.');ensure(canonical(plan.request)===canonical(wire.request));
 const input=await createDynamicInput(plan);const {run,inference}=await validateInferenceResponse({version:2,attemptId:wire.attemptId,run:v.run,inference:v.inference},{attemptId:wire.attemptId,input});
 ensure(canonical(v.accounting)===canonical(dynamicAccounting(record,inference.records)),'Planning and action usage mismatch.');
 return freezeSnapshot({...v,plan,run,inference}) as unknown as DynamicResponse;
}
