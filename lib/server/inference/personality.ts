/** Server personality inference uses the explicitly selected transport and never retries. */
import {createHash} from 'node:crypto';
import {servingIdentityMatches} from '../../inference/model-identity.ts';
import {activeInferenceRoute} from './route.ts';
import {prepareAnthropicMessages} from '../ai/anthropic-messages.ts';
import {canonical} from '../../experiments/validation.ts';
import {PERSONALITY_LIMITS,buildPersonalityRequest,parsePersonalityWire,acceptProviderPersonalities,type PersonalityInitialization,type PersonalityRequest,type PersonalityRoster,type PersonalityWireRoster} from '../../citizen-grounding/personality.ts';
import {AiError} from '../ai/errors.ts';
import {createStructuredTransport,type DeepseekTransportOptions,type InferenceCallRecord} from './deepseek.ts';

const provenanceError=()=>new AiError('Personality generation did not return complete verified usage and serving provenance.','AI_PERSONALITY_PROVENANCE',502);
function validateRecord(record:Readonly<InferenceCallRecord>){
 const integer=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
 if(!servingIdentityMatches(record.requestedModel,record.requestedProvider,record.servingModel,record.servingProvider)||!['completion','generation-details'].includes(record.identityVerification)
  ||typeof record.generationId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(record.generationId)
  ||!integer(record.inputTokens,0,PERSONALITY_LIMITS.inputBytes)||!integer(record.outputTokens,1,PERSONALITY_LIMITS.outputTokens)
  ||!integer(record.totalTokens,1,PERSONALITY_LIMITS.inputBytes+PERSONALITY_LIMITS.outputTokens)||record.totalTokens!==(record.inputTokens! + record.outputTokens!)
  ||!(record.requestedProvider==='anthropic'&&record.costUsd===null||typeof record.costUsd==='number'&&Number.isFinite(record.costUsd)&&record.costUsd>=0)||record.termination?.reasoningTokens!==0)throw provenanceError();
}

function dispatchedBody(request:PersonalityRequest){
 const route=activeInferenceRoute();
 return route.provider==='anthropic'?prepareAnthropicMessages({model:route.model,system:request.body.messages[0].content,user:request.body.messages[1].content,schema:request.body.response_format.json_schema.schema,maxOutputTokens:PERSONALITY_LIMITS.outputTokens}).requestBody:request.body;
}

/** One complete compact batch fits both the 35-agent live size and the 70-agent offline bound. */
export async function personalityBatchEvidence(input:PersonalityInitialization){
 const request=await buildPersonalityRequest(input),maximum={profiles:request.capableIds.map((_,i)=>({slotId:'profile-'+(i+1),style:'exploratory',c:4,i:4,d:4,k:4,u:4}))};
 return Object.freeze({batchCount:1 as const,maximumBatches:3 as const,requestBodyBytes:Buffer.byteLength(canonical(dispatchedBody(request)),'utf8'),maximumInputBytes:PERSONALITY_LIMITS.inputBytes,maximumCompactOutputBytes:Buffer.byteLength(canonical(maximum),'utf8'),maximumOutputBytes:PERSONALITY_LIMITS.outputBytes,maximumOutputTokens:PERSONALITY_LIMITS.outputTokens});
}

/** Admission is supplied by the caller's transport options; no credentials or environment are read here. */
export async function initializeProviderPersonalities(input:PersonalityInitialization,options:DeepseekTransportOptions,signal?:AbortSignal):Promise<PersonalityRoster>{
 signal?.throwIfAborted();
 const request=await buildPersonalityRequest(input);signal?.throwIfAborted();
 const expectedBody=canonical(dispatchedBody(request)),expectedDigest=createHash('sha256').update(expectedBody).digest('hex');
 let wireRequestDigest:string|undefined;
 if(options.maxOutputTokens!==undefined&&options.maxOutputTokens!==PERSONALITY_LIMITS.outputTokens)throw new AiError('Personality initialization requires its fixed bounded output contract.','AI_CONFIG',503);
 const transport=createStructuredTransport<PersonalityRequest,PersonalityWireRoster>({...options,beforeDispatch:async info=>{
  if(info.requestBodySha256!==expectedDigest||canonical(info.requestBody)!==expectedBody||Buffer.byteLength(canonical(info.requestBody),'utf8')>PERSONALITY_LIMITS.inputBytes)throw new AiError('Personality request did not match its fixed admitted contract.','AI_PERSONALITY_REQUEST',502);
  if(activeInferenceRoute().provider==='anthropic')wireRequestDigest=info.requestBodySha256;
  await options.beforeDispatch?.(info);
 }},{
  name:request.body.response_format.json_schema.name,system:request.body.messages[0].content,
  schema:r=>r.body.response_format.json_schema.schema,encode:r=>r.body.messages[1].content,
  parse:(value,r)=>parsePersonalityWire(value,r.capableIds.length),
  outputLimit:PERSONALITY_LIMITS.outputTokens,defaultOutput:PERSONALITY_LIMITS.outputTokens,contentBytes:PERSONALITY_LIMITS.outputBytes,validateRecord,
 });
 const {value,record}=await transport.generate(request,signal);signal?.throwIfAborted();
 const roster=await acceptProviderPersonalities(request,value,{id:record.generationId!,inputTokens:record.inputTokens!,outputTokens:record.outputTokens!,costUsd:record.costUsd,requestedModel:record.requestedModel,servingModel:record.servingModel!,servingProvider:record.servingProvider!,...(wireRequestDigest?{wireRequestDigest}:{})});
 signal?.throwIfAborted();return roster;
}
