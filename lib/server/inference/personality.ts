/** Server personality inference uses the existing fixed OpenRouter transport and never retries. */
import {canonical} from '../../experiments/validation.ts';
import {PERSONALITY_LIMITS,PERSONALITY_MODEL,PERSONALITY_PROVIDER,buildPersonalityRequest,parsePersonalityWire,acceptProviderPersonalities,type PersonalityInitialization,type PersonalityRequest,type PersonalityRoster,type PersonalityWireRoster} from '../../citizen-grounding/personality.ts';
import {AiError} from '../ai/errors.ts';
import {createStructuredTransport,type DeepseekTransportOptions,type InferenceCallRecord} from './deepseek.ts';

const provenanceError=()=>new AiError('Personality generation did not return complete verified usage and serving provenance.','AI_PERSONALITY_PROVENANCE',502);
function validateRecord(record:Readonly<InferenceCallRecord>){
 const integer=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
 if(record.servingModel!==PERSONALITY_MODEL||record.servingProvider!==PERSONALITY_PROVIDER||!['completion','generation-details'].includes(record.identityVerification)
  ||typeof record.generationId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(record.generationId)
  ||!integer(record.inputTokens,0,PERSONALITY_LIMITS.inputBytes)||!integer(record.outputTokens,1,PERSONALITY_LIMITS.outputTokens)
  ||!integer(record.totalTokens,1,PERSONALITY_LIMITS.inputBytes+PERSONALITY_LIMITS.outputTokens)||record.totalTokens!==(record.inputTokens! + record.outputTokens!)
  ||typeof record.costUsd!=='number'||!Number.isFinite(record.costUsd)||record.costUsd<0||record.termination?.reasoningTokens!==0)throw provenanceError();
}

/** One complete compact batch fits both the 35-agent live size and the 70-agent offline bound. */
export async function personalityBatchEvidence(input:PersonalityInitialization){
 const request=await buildPersonalityRequest(input),maximum={profiles:request.capableIds.map((_,i)=>({slotId:'profile-'+(i+1),style:'exploratory',c:4,i:4,d:4,k:4,u:4}))};
 return Object.freeze({batchCount:1 as const,maximumBatches:3 as const,requestBodyBytes:Buffer.byteLength(canonical(request.body),'utf8'),maximumInputBytes:PERSONALITY_LIMITS.inputBytes,maximumCompactOutputBytes:Buffer.byteLength(canonical(maximum),'utf8'),maximumOutputBytes:PERSONALITY_LIMITS.outputBytes,maximumOutputTokens:PERSONALITY_LIMITS.outputTokens});
}

/** Admission is supplied by the caller's transport options; no credentials or environment are read here. */
export async function initializeProviderPersonalities(input:PersonalityInitialization,options:DeepseekTransportOptions,signal?:AbortSignal):Promise<PersonalityRoster>{
 signal?.throwIfAborted();
 const request=await buildPersonalityRequest(input);signal?.throwIfAborted();
 if(options.maxOutputTokens!==undefined&&options.maxOutputTokens!==PERSONALITY_LIMITS.outputTokens)throw new AiError('Personality initialization requires its fixed bounded output contract.','AI_CONFIG',503);
 const transport=createStructuredTransport<PersonalityRequest,PersonalityWireRoster>({...options,beforeDispatch:async info=>{
  if(info.requestBodySha256!==request.inputDigest||canonical(info.requestBody)!==canonical(request.body)||Buffer.byteLength(canonical(info.requestBody),'utf8')>PERSONALITY_LIMITS.inputBytes)throw new AiError('Personality request did not match its fixed admitted contract.','AI_PERSONALITY_REQUEST',502);
  await options.beforeDispatch?.(info);
 }},{
  name:request.body.response_format.json_schema.name,system:request.body.messages[0].content,
  schema:r=>r.body.response_format.json_schema.schema,encode:r=>r.body.messages[1].content,
  parse:(value,r)=>parsePersonalityWire(value,r.capableIds.length),
  outputLimit:PERSONALITY_LIMITS.outputTokens,defaultOutput:PERSONALITY_LIMITS.outputTokens,contentBytes:PERSONALITY_LIMITS.outputBytes,validateRecord,
 });
 const {value,record}=await transport.generate(request,signal);signal?.throwIfAborted();
 const roster=await acceptProviderPersonalities(request,value,{id:record.generationId!,inputTokens:record.inputTokens!,outputTokens:record.outputTokens!,costUsd:record.costUsd!});
 signal?.throwIfAborted();return roster;
}
