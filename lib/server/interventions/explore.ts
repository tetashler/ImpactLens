import {selectCitizenCohort,selectionDisclosure,type CitizenSelectionV2} from '../../citizen-grounding/selection.ts';
/** Trusted question/plot orchestration. Browser data cannot supply facts, rosters or provider grants. */
import {canonical,digest,ensure,freezeSnapshot} from '../../experiments/validation.ts';
import {parseHybridExploreWire,parseHybridReview,type HybridReview} from '../../interventions/explore-contract.ts';
import {buildHybridContext,deterministicHybridIntent,acceptHybridIntent,buildHybridMrt,encodeHybridContext,HYBRID_INTENT_SCHEMA,HYBRID_INTENT_SCHEMA_NAME,HYBRID_INTENT_SYSTEM,type HybridContext,type HybridIntent} from '../../interventions/hybrid.ts';
import {createHybridBinding,createHandoffBinding} from '../../interventions/binding.ts';
import {buildHandoffContext,deterministicHandoff,acceptHandoff,encodeHandoff,handoffIntervention,HANDOFF_SCHEMA,HANDOFF_SCHEMA_NAME,HANDOFF_SYSTEM,type HandoffContext,type HandoffResult} from '../../interventions/handoff.ts';
import type {AcceptedHandoff} from '../../interventions/handoff-contract.ts';
import {draftToIntervention} from '../../editor.ts';
import type {NetworkCatalog} from '../../map-contract.ts';
import {getNetworkCatalog} from '../mrt-service.ts';
import {calculateCitizenImpact,type PrivateCitizenImpact} from '../citizen-grounding/api.ts';
import {assertCitizenImpactBinding,type CitizenImpactRequest,type CitizenImpactPublic} from '../../citizen-grounding/public-contract.ts';
import {createCitizenGrounding,withHybridBinding,type CitizenGroundedInput} from '../../citizen-grounding/social.ts';
import {initializeProviderPersonalities} from '../inference/personality.ts';
import {createStructuredTransport,type InferenceCallRecord} from '../inference/deepseek.ts';
import type {SocietyWorld,SocietyInput} from '../../society/contract.ts';
import {controlledIds} from '../../society/hybrid.ts';
import {locatePlottedSites} from './location.ts';
import {AiError} from '../ai/errors.ts';
import {INFERENCE_REJECTION_MESSAGES} from '../../stakeholder-simulation/inference-errors.ts';

export interface HybridExploreDependencies {
 key:string;enabled?:boolean;fetcher?:typeof fetch;executionSignal?:()=>AbortSignal|undefined;
 catalog?:(serviceDate:string)=>NetworkCatalog|Promise<NetworkCatalog>;
 impact?:(request:CitizenImpactRequest)=>Promise<PrivateCitizenImpact>;
 personality?:typeof initializeProviderPersonalities;
}
interface CallSummary {calls:number;inputTokens:number|null;outputTokens:number|null;costUsd:number|null}
export interface HybridGroundingPublic {
 version:1;policy:'hybrid-citizen-explore-v1';interpretationPolicy?:'hybrid-map-v2';bindingKey:string;type:string;classificationSource:string;geometryRevision:number;
 impact:CitizenImpactPublic;
 personalities:CallSummary&{capable:number;background:number;modelGenerated:number};
 interpretation:CallSummary;limitations:string[];
}
export interface PreparedHybridExplore {
 kind:'ready';citizenSelection:(input:SocietyInput)=>CitizenSelectionV2;citizenGrounding:(preview:SocietyWorld)=>Promise<CitizenGroundedInput>;
 publicGrounding:()=>HybridGroundingPublic;interpretationRecords:InferenceCallRecord[];
}
function usage(records:readonly InferenceCallRecord[]):CallSummary {
 const sum=(key:'inputTokens'|'outputTokens'|'costUsd')=>records.every(r=>r[key]!==null)?records.reduce((n,r)=>n+r[key]!,0):null;
 return {calls:records.length,inputTokens:sum('inputTokens'),outputTokens:sum('outputTokens'),costUsd:sum('costUsd')};
}
const diagnosticCodes=new Set([...Object.keys(INFERENCE_REJECTION_MESSAGES),'AI_CONFIG','AI_UPSTREAM','AI_TIMEOUT','AI_CREDITS','AI_CANCELLED','AI_RATE_LIMIT','AI_INVALID_REQUEST','AI_REQUEST_TOO_LARGE','AI_PLAN_INVALID','AI_INVALID_RESPONSE','AI_PROVIDER_IDENTITY','AI_PERSONALITY_PROVENANCE','AI_PERSONALITY_REQUEST','PERSONALITY_DIGEST','PERSONALITY_DIVERSITY','PERSONALITY_ENVELOPE','PERSONALITY_INCOMPLETE','PERSONALITY_INPUT','PERSONALITY_INPUT_LIMIT','PERSONALITY_JSON','PERSONALITY_OUTPUT_LIMIT','PERSONALITY_PROVENANCE','PERSONALITY_PROVIDER_IDENTITY','PERSONALITY_ROSTER','PERSONALITY_TRAITS','HYBRID_PROVIDER_DISABLED','HYBRID_PERSONALITY_KEY','HYBRID_INITIAL_RUN_INCOMPLETE','HYBRID_CITIZEN_ROSTER','HYBRID_PERSONALITY_PROVENANCE']);
function safeFailure(label:'HYBRID_INITIALIZATION_SAFE'|'HYBRID_INTERPRETATION_SAFE',error:unknown,records:readonly InferenceCallRecord[]){
 const fallback=label==='HYBRID_INITIALIZATION_SAFE'?'HYBRID_INITIALIZATION_FAILED':'HYBRID_INTERPRETATION_FAILED';
 const candidate=error instanceof AiError?error.code:error instanceof Error?error.message:'';
 const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
 const reason=(v:unknown)=>['stop','length','error','content_filter','tool_calls','other'].includes(v as string)?v:null;
 // Build a fresh allowlist. An injected error, record or model response cannot contribute arbitrary strings.
 const metadata=records.slice(0,3).map(r=>({requestedModel:r.requestedModel==='deepseek/deepseek-v4-flash-0731'?r.requestedModel:null,requestedProvider:r.requestedProvider==='digitalocean'?r.requestedProvider:null,servingModel:r.servingModel==='deepseek/deepseek-v4-flash-0731'?r.servingModel:null,servingProvider:r.servingProvider==='DigitalOcean'?r.servingProvider:null,status:r.status==='accepted'?'accepted':'failed',errorCode:diagnosticCodes.has(r.errorCode??'')?r.errorCode:null,inputTokens:number(r.inputTokens),outputTokens:number(r.outputTokens),costUsd:number(r.costUsd),termination:r.termination?{httpStatus:number(r.termination.httpStatus),finishReason:reason(r.termination.finishReason),nativeFinishReason:reason(r.termination.nativeFinishReason),reasoningTokens:number(r.termination.reasoningTokens),requestedOutputTokens:number(r.termination.requestedOutputTokens),jsonValid:typeof r.termination.jsonValid==='boolean'?r.termination.jsonValid:null,actionValid:typeof r.termination.actionValid==='boolean'?r.termination.actionValid:null}:null}));
 console.warn(label,JSON.stringify({code:diagnosticCodes.has(candidate)?candidate:fallback,records:metadata}));
}
function review(context:HybridContext,intent:HybridIntent,message?:string,clarification=false):HybridReview {
 const selected=new Set(intent.sitePointIds),sites={...context.geometry,features:context.geometry.features.filter(f=>f.kind==='point'&&(!selected.size||selected.has(f.id)))};
 return parseHybridReview({version:1,kind:'hybrid-map-review',bindingKey:context.bindingKey,question:context.question,
  geometryRevision:context.revision,interventionType:intent.type,analysisMode:clarification||intent.analysisMode==='clarification'?'clarification':'location-context',
  message:message??intent.clarification??(intent.unresolvedConnection?'Connection unresolved. Confirm an exact existing station anchor before calculating an MRT line.':'The plotted sites provide location context. This intervention has no supported quantitative model.'),
  limitations:[...intent.limitations,...(sites.features.length>32?['Location context is limited to the first thirty-two selected plotted points.']:[])].slice(0,12),locations:locatePlottedSites(sites),railContext:intent.markerContext.slice(0,8).map(marker=>({...marker,nearbyStations:marker.nearbyStations.slice(0,3),nearbyServiceSegments:marker.nearbyServiceSegments.slice(0,3)}))});
}

/** Preparation makes at most one semantic call. Personalities wait for a complete initial run. */
export async function prepareHybridExplore(value:unknown,dependencies:HybridExploreDependencies,signal?:AbortSignal):Promise<PreparedHybridExplore|HybridReview> {
 signal?.throwIfAborted();const wire=parseHybridExploreWire(value);
 const catalog=await (dependencies.catalog??getNetworkCatalog)(wire.hybrid.serviceDate);signal?.throwIfAborted();
 ensure(catalog.serviceDate===wire.hybrid.serviceDate,'HYBRID_CATALOG_DATE');
 const context=buildHybridContext(wire.request.question,wire.request.geometry,wire.request.geometryRevision,wire.hybrid.anchors,catalog);
 const interpretationRecords:InferenceCallRecord[]=[];
 const handoff=wire.hybrid.interpretationPolicy==='hybrid-map-v2'?await buildHandoffContext(context,wire.hybrid):null;
 let interpreted:HandoffResult|null=handoff?deterministicHandoff(handoff):null;
 let requestCanonicalHash:string|undefined;
 let intent=handoff?interpreted?.intent??null:deterministicHybridIntent(context);
 if(!intent&&handoff){
  try{
   ensure(dependencies.enabled===true,'HYBRID_PROVIDER_DISABLED');
   const transport=createStructuredTransport<HandoffContext,HandoffResult>({key:dependencies.key,fetcher:dependencies.fetcher,maxOutputTokens:1500,onRecord:r=>interpretationRecords.push(structuredClone(r)),beforeDispatch:r=>{requestCanonicalHash=r.requestBodySha256;}},{
    name:HANDOFF_SCHEMA_NAME,system:HANDOFF_SYSTEM,schema:()=>HANDOFF_SCHEMA,encode:encodeHandoff,parse:acceptHandoff,outputLimit:1500,defaultOutput:1500,contentBytes:6000,
   });
   interpreted=(await transport.generate(handoff,signal)).value;intent=interpreted.intent;
  }catch(error){safeFailure('HYBRID_INTERPRETATION_SAFE',error,interpretationRecords);throw error;}
 } else if(!intent){
  try{
  ensure(dependencies.enabled===true,'HYBRID_PROVIDER_DISABLED');
  const transport=createStructuredTransport<HybridContext,HybridIntent>({key:dependencies.key,fetcher:dependencies.fetcher,maxOutputTokens:1500,onRecord:r=>interpretationRecords.push(structuredClone(r))},{
   name:HYBRID_INTENT_SCHEMA_NAME,system:HYBRID_INTENT_SYSTEM,schema:()=>HYBRID_INTENT_SCHEMA,encode:encodeHybridContext,
   parse:acceptHybridIntent,outputLimit:1500,defaultOutput:1500,contentBytes:6000,
  });
  intent=(await transport.generate(context,signal)).value;
  }catch(error){safeFailure('HYBRID_INTERPRETATION_SAFE',error,interpretationRecords);throw error;}
 }
 signal?.throwIfAborted();
 if(intent.analysisMode!=='mrt-candidate'||intent.type!=='new_mrt_line'){
  const result=review(context,intent);return handoff?parseHybridReview({...result,bindingKey:handoff.snapshot.bindingKey}):result;
 }
 if(!wire.hybrid.selection||wire.hybrid.selection.routeId!==intent.routeId||canonical(wire.hybrid.selection.pointIds)!==canonical(intent.stationPointIds))return review(context,intent,'Confirm the complete attached station selection in the shown route order before calculating the MRT proposal.',true);
 const intervention=handoff&&interpreted?handoffIntervention(handoff,interpreted):draftToIntervention(buildHybridMrt(intent,context,wire.hybrid.timings));
 const impactRequest={serviceDate:wire.hybrid.serviceDate,intervention},impact=await (dependencies.impact??calculateCitizenImpact)(impactRequest);signal?.throwIfAborted();
 const publicImpact=await assertCitizenImpactBinding(impact.publicResult,impactRequest);
 ensure(impact.dataset.id===publicImpact.datasetId&&impact.dataset.populationId===publicImpact.populationId&&impact.run.id===publicImpact.runId&&impact.run.scenarioFingerprint===publicImpact.scenarioFingerprint&&impact.run.citizenDatasetId===impact.dataset.id,'HYBRID_IMPACT_BINDING');
 const legacyBinding=await createHybridBinding(context,intent,intervention,impact.run.scenarioFingerprint);
 let generation:AcceptedHandoff['generation']=null;
 if(handoff&&interpretationRecords.length){
  const record=interpretationRecords[0];ensure(record.status==='accepted'&&record.servingModel&&record.servingProvider&&record.identityVerification!=='unverified'&&requestCanonicalHash&&interpreted,'HYBRID_HANDOFF_PROVIDER_PROVENANCE');
  generation={requestedModel:record.requestedModel,servingModel:record.servingModel,servingProvider:record.servingProvider,identityVerification:record.identityVerification,generationId:record.generationId,requestCanonicalHash,outputCanonicalHash:await digest('',interpreted.wire)};
 }
 const binding=handoff&&interpreted?await createHandoffBinding(legacyBinding,{context:handoff.snapshot,result:interpreted.wire,source:generation?'model':'deterministic',generation}):legacyBinding;signal?.throwIfAborted();
 let personalities:HybridGroundingPublic['personalities']={capable:0,background:0,modelGenerated:0,calls:0,inputTokens:0,outputTokens:0,costUsd:0};
 let selected:CitizenSelectionV2|undefined;
 const citizenSelection=(input:SocietyInput)=>{const result=selectCitizenCohort(impact.dataset,impact.run,binding,input.config?.agents??50,input.seed);if(selected)ensure(canonical(result)===canonical(selected),'CITIZEN_SELECTION_REBIND');selected=result;return result;};
 let initialization:Promise<CitizenGroundedInput>|undefined,initializationIdentity:string|undefined;
 const personalityRecords:InferenceCallRecord[]=[];
 const citizenGrounding=(preview:SocietyWorld):Promise<CitizenGroundedInput>=>{
  // The callback is server-only and receives the engine's actual preview after all eight accepted turns.
  const input=preview.genesis.input,active=preview.agents.map(a=>a.id),capable=controlledIds(preview);
  if(selected)ensure(canonical(input.citizenSelection)===canonical(selected),'CITIZEN_SELECTION_REBIND');
  const requestedIdentity=canonical({runId:input.runId,question:input.question,active,capable,acceptedActions:input.acceptedActions,selection:input.citizenSelection??null});
  if(initialization){ensure(requestedIdentity===initializationIdentity,'HYBRID_INITIALIZATION_IDENTITY');return initialization;}
  initializationIdentity=requestedIdentity;
  initialization=(async()=>{
   (dependencies.executionSignal?.()??signal)?.throwIfAborted();ensure(dependencies.enabled===true,'HYBRID_PROVIDER_DISABLED');ensure(typeof dependencies.key==='string'&&dependencies.key.trim().length>0,'HYBRID_PERSONALITY_KEY');
   ensure(preview.tick===0&&!preview.hybrid?.records.length&&!preview.hybrid?.pending&&!input.citizenGrounding&&input.question===context.question&&input.acceptedActions.length===8&&new Set(input.acceptedActions.map(a=>a.id)).size===8&&input.roles.length===4&&input.roles.every(r=>input.acceptedActions.filter(a=>a.roleId===r.id).length===2),'HYBRID_INITIAL_RUN_INCOMPLETE');
   ensure(input.population.id===impact.dataset.populationId&&active.length>=1&&capable.length>=1&&capable.every(id=>active.includes(id))&&active.every(id=>impact.dataset.records.some(c=>c.id===id)),'HYBRID_CITIZEN_ROSTER');
   const background=active.filter(id=>!capable.includes(id));
   const roster=await (dependencies.personality??initializeProviderPersonalities)({runId:input.runId,capableIds:capable,backgroundIds:background,seed:'hybrid-citizen:'+binding.fingerprint},{key:dependencies.key,fetcher:dependencies.fetcher,onRecord:r=>personalityRecords.push(structuredClone(r))},dependencies.executionSignal?.()??signal);
   (dependencies.executionSignal?.()??signal)?.throwIfAborted();ensure(roster.generation.mode==='real-provider'&&roster.generation.status==='accepted'&&roster.generation.fallback===false&&roster.generation.uncertain===false&&roster.profiles.filter(p=>p.origin==='model-generated').length===capable.length,'HYBRID_PERSONALITY_PROVENANCE');
   const grounded=await withHybridBinding(await createCitizenGrounding(impact.dataset,impact.run,roster,active,capable),binding);(dependencies.executionSignal?.()??signal)?.throwIfAborted();
   personalities=freezeSnapshot({capable:capable.length,background:background.length,modelGenerated:capable.length,calls:1,inputTokens:roster.generation.inputTokens,outputTokens:roster.generation.outputTokens,costUsd:roster.generation.costUsd});
   return grounded;
  })().catch(error=>{safeFailure('HYBRID_INITIALIZATION_SAFE',error,personalityRecords);throw error;});
  // A rejected initialization remains rejected. Reload/retry must never generate a replacement roster.
  return initialization;
 };
 const acceptedIntent=intent;
 const publicGrounding=():HybridGroundingPublic=>freezeSnapshot({version:1,policy:'hybrid-citizen-explore-v1',...(handoff?{interpretationPolicy:'hybrid-map-v2' as const}:{}),bindingKey:handoff?.snapshot.bindingKey??context.bindingKey,type:acceptedIntent.type,classificationSource:acceptedIntent.classificationSource,geometryRevision:context.revision,impact:publicImpact,personalities,interpretation:usage(interpretationRecords),limitations:[...acceptedIntent.limitations,'Static calculated commute differences are scenario inputs, not observed journeys or validated behaviour.','Citizen employment and schedules are synthetic assumptions; personality styles are model-generated fictional traits.',...(selected?[selectionDisclosure(selected)]:[])]});
 return {kind:'ready',citizenSelection,citizenGrounding,publicGrounding,interpretationRecords};
}
