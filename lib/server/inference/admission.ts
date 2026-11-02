import {AiError} from '../ai/errors.ts';

/** Server-process capabilities only. Never accept these hooks or proofs from request data. */
export const INFERENCE_ADMISSION_V1=Symbol.for('impactlens.inference-admission-v1');
export const INFERENCE_NO_DISPATCH_V1=Symbol.for('impactlens.inference-no-dispatch-v1');

export interface InferenceAdmissionInfoV1 {
 url:string;
 method:'POST';
 /** Exact serialized provider request bytes; the digest is of this string, not canonical JSON. */
 requestBody:string;
 requestBodySha256:string;
}

export interface InferenceAdmissionReceiptV1 {
 version:1;
 /** Synchronous, idempotent local reconciliation; a consumed/native-dispatched permit is a no-op. */
 cancelBeforeDispatch:()=>void|Readonly<{[INFERENCE_NO_DISPATCH_V1]:true}>;
}

export interface InferenceAdmissionV1 {
 version:1;
 schema:'social_decision_v1';
 timeoutMs:number;
 deadlineMs:number;
 /** Local verification/reservation only; must honor cancellation and never invoke the provider. */
 prepare:(info:InferenceAdmissionInfoV1,signal:AbortSignal)=>Promise<void|InferenceAdmissionReceiptV1>;
}

export type InferenceAdmissionFetcher=typeof fetch&{[INFERENCE_ADMISSION_V1]?:InferenceAdmissionV1};

export function inferenceAdmissionFor(fetcher:typeof fetch,schema:string,allowProcessRegistration=false):InferenceAdmissionV1|undefined {
 if(schema!=='social_decision_v1')return;
 // Next may wrap default fetch without copying symbol properties. Explicit adapters stay isolated.
 const hook=(fetcher as InferenceAdmissionFetcher)[INFERENCE_ADMISSION_V1]??(allowProcessRegistration?(globalThis as typeof globalThis&{[INFERENCE_ADMISSION_V1]?:InferenceAdmissionV1})[INFERENCE_ADMISSION_V1]:undefined);
 if(!hook||hook.schema!=='social_decision_v1')return;
 if(hook.version!==1||!Number.isSafeInteger(hook.timeoutMs)||hook.timeoutMs<1||hook.timeoutMs>60_000||!Number.isSafeInteger(hook.deadlineMs)||hook.deadlineMs<1||typeof hook.prepare!=='function')throw new AiError('Invalid bounded inference admission configuration.','AI_CONFIG',503);
 return {version:1,schema:'social_decision_v1',timeoutMs:hook.timeoutMs,deadlineMs:hook.deadlineMs,prepare:hook.prepare.bind(hook)};
}

/** A server guard may supply this proof only after durable no-dispatch reconciliation succeeds. */
export function isInferenceNoDispatchV1(error:unknown):boolean {
 return error!==null&&typeof error==='object'&&(error as {[INFERENCE_NO_DISPATCH_V1]?:unknown})[INFERENCE_NO_DISPATCH_V1]===true;
}
