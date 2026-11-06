import {inspectStorageAdmission} from './storage-admission.ts';
import {INFERENCE_ADMISSION_V1,inferenceAdmissionFor} from '../inference/admission.ts';

/** Recheck lifecycle immediately before dispatch while preserving trusted social admission. */
export function storageFetcher(base:string,fetcher?:typeof fetch):typeof fetch {
 const underlying=fetcher??fetch;
 const wrapped:typeof fetch=(input,init)=>{inspectStorageAdmission(base);return underlying(input,init);};
 // Explicit adapters must never acquire process-default admission authority.
 const admission=inferenceAdmissionFor(underlying,'social_decision_v1',fetcher===undefined);
 if(admission)Object.defineProperty(wrapped,INFERENCE_ADMISSION_V1,{value:{...admission,prepare:(info:Parameters<typeof admission.prepare>[0],signal:AbortSignal)=>{
  signal.throwIfAborted();inspectStorageAdmission(base);signal.throwIfAborted();
  return admission.prepare(info,signal);
 }}});
 return wrapped;
}
