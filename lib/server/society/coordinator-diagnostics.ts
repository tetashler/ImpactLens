/** Private bounded diagnostics: no raw error messages, stack traces, paths or provider content. */
export const JOB_STAGES=['step','progress','inspect','checkpoint','publish','save','lease'] as const;
export type JobStage=typeof JOB_STAGES[number];
const CODES=['AI_RATE_LIMIT','AI_TIMEOUT','AI_CREDITS','AI_UPSTREAM','AI_CANCELLED','SOCIAL_UNCERTAIN','AI_PROVIDER_IDENTITY','SOCIAL_TRANSITION','SOCIAL_SHAPE','SOCIAL_STALE','SOCIAL_FATAL','SOCIAL_PROVIDER_IDENTITY','SOCIAL_JOURNAL_HASH','SOCIAL_CHECKPOINT_WRITE','SOCIAL_STORAGE_LIMIT','SOCIAL_CHECKPOINT_LIMIT','JOB_PROGRESS','JOB_NO_PROGRESS','JOB_OWNER','GRAPH_VALIDATION','INVALID_DATA','ENOSPC','EACCES','EPERM','EIO','ENOENT','CONTROL','OPERATION'] as const;
const TYPES=['Error','TypeError','RangeError','SyntaxError','Unknown'] as const;
export interface JobFailureDiagnostic {stage:JobStage;code:string;errorType:typeof TYPES[number]}
export function jobFailureDiagnostic(error:unknown,stage:JobStage):JobFailureDiagnostic{
 const code=error!==null&&typeof error==='object'&&(error as {code?:unknown}).code;
 const message=error instanceof Error?error.message:'';
 const known=(v:unknown):v is string=>typeof v==='string'&&(CODES as readonly string[]).includes(v);
 const type=error instanceof Error?error.name:'Unknown';
 return {stage,code:known(code)?code:known(message)?message:['Invalid knowledge graph','Invalid graph display type'].includes(message)?'GRAPH_VALIDATION':message==='Unknown field or accessor in data object'?'INVALID_DATA':'OPERATION',errorType:(TYPES as readonly string[]).includes(type)?type as JobFailureDiagnostic['errorType']:'Unknown'};
}
export function validJobFailure(value:unknown):value is JobFailureDiagnostic{
 if(!value||typeof value!=='object')return false;const r=value as Record<string,unknown>;
 return Object.keys(r).sort().join(',')==='code,errorType,stage'&&(JOB_STAGES as readonly unknown[]).includes(r.stage)&&(CODES as readonly unknown[]).includes(r.code)&&(TYPES as readonly unknown[]).includes(r.errorType);
}
