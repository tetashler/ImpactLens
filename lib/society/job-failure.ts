/** Finite public reasons only. Raw provider errors and private dialogue never enter these messages. */
export const PROVIDER_JOB_REASONS=['PROVIDER_RATE_LIMIT','PROVIDER_TIMEOUT','PROVIDER_CREDITS','PROVIDER_UNAVAILABLE','PROVIDER_CANCELLED','PROVIDER_UNCERTAIN'] as const;
export type ProviderJobReason=typeof PROVIDER_JOB_REASONS[number];
const reasons:Record<string,ProviderJobReason>={AI_RATE_LIMIT:'PROVIDER_RATE_LIMIT',AI_TIMEOUT:'PROVIDER_TIMEOUT',AI_CREDITS:'PROVIDER_CREDITS',AI_UPSTREAM:'PROVIDER_UNAVAILABLE',AI_CANCELLED:'PROVIDER_CANCELLED',SOCIAL_UNCERTAIN:'PROVIDER_UNCERTAIN'};
export function providerJobReason(error:unknown):ProviderJobReason|undefined{
 const code=error!==null&&typeof error==='object'&&(error as {code?:unknown}).code;
 const candidate=typeof code==='string'?code:error instanceof Error?error.message:'';
 return Object.hasOwn(reasons,candidate)?reasons[candidate]:undefined;
}
export function jobFailureMessage(reason:unknown):string|undefined{
 switch(reason){
  case 'PROVIDER_RATE_LIMIT':return 'The AI service rate-limited a request. Accepted activity is retained; no automatic retry was made.';
  case 'PROVIDER_TIMEOUT':return 'An AI request timed out. Accepted activity is retained; the interrupted request was not retried.';
  case 'PROVIDER_CREDITS':return 'The AI service reported insufficient credits. Accepted activity is retained.';
  case 'PROVIDER_UNAVAILABLE':return 'The AI service could not complete a request. Accepted activity is retained; no automatic retry was made.';
  case 'PROVIDER_CANCELLED':return 'An AI request was interrupted. Accepted activity is retained; no automatic retry was made.';
  case 'PROVIDER_UNCERTAIN':return 'A previous request has an uncertain outcome. Accepted activity and usage reservations are preserved; no automatic retry was made.';
  default:return undefined;
 }
}
