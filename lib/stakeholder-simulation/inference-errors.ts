/** Finite diagnostic categories only: never interpolate provider text or validator input. */
export const INFERENCE_REJECTION_MESSAGES={
 AI_RESPONSE_ENVELOPE:'The provider returned an invalid completion envelope or exceeded the response-size limit.',
 AI_RESPONSE_INCOMPLETE:'The provider did not finish the structured action normally (non-stop finish reason).',
 AI_RESPONSE_JSON:'The provider action was not valid JSON.',
 AI_ACTION_SCHEMA:'The provider action did not match the required field, type or size schema.',
 AI_ACTION_REFERENCE:'The provider action contained an invalid role, event, evidence or assumption reference.',
 AI_ACTION_SEMANTICS:'The provider action violated interaction, position-change or qualitative-content rules.',
} as const;
export type InferenceRejectionCode=keyof typeof INFERENCE_REJECTION_MESSAGES;
/** Only finite labels and counts cross the server boundary; never provider prose. */
export type FinishReason='stop'|'length'|'content_filter'|'tool_calls'|'error'|'other'|null;
export interface InferenceTerminationV1 {
 httpStatus:number|null;finishReason:FinishReason;nativeFinishReason:FinishReason;
 reasoningTokens:number|null;requestedOutputTokens:number;jsonValid:boolean|null;actionValid:boolean|null;
}
export function safeFinishReason(value:unknown):FinishReason {
 return value==null?null:['stop','length','content_filter','tool_calls','error'].includes(String(value))?value as FinishReason:'other';
}
/** Messages originate in our local validator, not upstream responses. Unknown errors stay opaque. */
export function turnRejectionCode(error:unknown):InferenceRejectionCode{
 const message=error instanceof Error?error.message:'';
 if(['Unknown addressed role','Unknown or unavailable previous event','Unknown evidence finding','Unknown scenario assumption'].includes(message))return 'AI_ACTION_REFERENCE';
 if(['Cite evidence IDs instead of source URLs','Quantitative societal claims are unsupported in stakeholder dialogue','Later turns must reference another recorded participant','A revision must reference the participant previous event','A changed position requires a recorded revision','Interaction requires a prior event'].includes(message))return 'AI_ACTION_SEMANTICS';
 return 'AI_ACTION_SCHEMA';
}
