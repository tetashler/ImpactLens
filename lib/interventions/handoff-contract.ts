/** Browser-safe frozen v2 interpretation proofs. No dataset, provider or filesystem access. */
import {verifiedModelIdentity,type InferenceModel,type InferenceServingProvider} from '../inference/model-identity.ts';
import {assertJsonData,canonical,digest,ensure,freezeSnapshot,hash,object,text} from '../experiments/validation.ts';
import type {HybridBindingV1} from './binding.ts';
import type {HybridIntentWire} from './hybrid.ts';

export const HANDOFF_POLICY='hybrid-map-v2' as const;
export const MRT_CAPABILITIES=freezeSnapshot({version:1,policy:'illustrative-mrt-capabilities-v1',scope:'illustrative-synthetic',
 supported:['hypothetical-mrt-network','deterministic-station-routing','static-travel-time-comparison','synthetic-citizen-commute','assumption-labelled-aggregate-results'],
 qualitative:['fictional-stakeholder-discussion'],
 unsupported:['construction-feasibility','engineering-feasibility','guaranteed-service-connections','real-future-timetables','actual-individual-journeys','real-behaviour-forecast','causal-social-impact','guaranteed-improvement'],
 conditions:['served-catalogue-anchors','validated-ordered-drawn-dots','acknowledged-illustrative-seconds','synthetic-workplace-and-access-assumptions']});
export interface ConfirmedMrtSelection {serverValidated:true;routeId:string;orderedStationPointIds:string[];anchors:Record<string,string>;timings:{runSeconds:number;dwellSeconds:number;waitingTimeSeconds:number;transferWalkSeconds:number;geometryConfirmed:true;assumptionsConfirmed:true}}
export interface HandoffSnapshot {version:typeof HANDOFF_POLICY;bindingKey:string;baseContextBindingKey:string;geometryRevision:number;scenarioId:string;catalogueIdentity:{serviceDate:string;fingerprint:string};capabilities:typeof MRT_CAPABILITIES;confirmedSelection:ConfirmedMrtSelection|null}
export interface HandoffIntentWire extends Omit<HybridIntentWire,'version'> {version:typeof HANDOFF_POLICY}
export interface AcceptedHandoff {legacyFingerprint:string;context:HandoffSnapshot;result:HandoffIntentWire;source:'deterministic'|'model';generation:null|{requestedModel:InferenceModel;servingModel:InferenceModel;servingProvider:InferenceServingProvider;identityVerification:'completion'|'generation-details';generationId:string|null;requestCanonicalHash:string;outputCanonicalHash:string}}

export function parseAcceptedHandoff(value:unknown,legacy:HybridBindingV1):AcceptedHandoff {
 assertJsonData(value);ensure(new TextEncoder().encode(canonical(value)).length<=12000,'HYBRID_HANDOFF_PROOF_BOUND');
 const r=object(value,['legacyFingerprint','context','result','source','generation']);hash(r.legacyFingerprint,'');
 const c=object(r.context,['version','bindingKey','baseContextBindingKey','geometryRevision','scenarioId','catalogueIdentity','capabilities','confirmedSelection']);
 ensure(c.version===HANDOFF_POLICY&&c.baseContextBindingKey===legacy.contextBindingKey&&c.geometryRevision===legacy.revision&&c.scenarioId===legacy.geometry.scenarioId,'HYBRID_HANDOFF_ORIGIN');hash(c.bindingKey,'');
 const catalogue=object(c.catalogueIdentity,['serviceDate','fingerprint']);ensure(catalogue.serviceDate===legacy.catalogue.serviceDate&&catalogue.fingerprint===legacy.catalogue.fingerprint,'HYBRID_HANDOFF_CATALOGUE');
 ensure(canonical(c.capabilities)===canonical(MRT_CAPABILITIES),'HYBRID_HANDOFF_CAPABILITIES');
 const s=object(c.confirmedSelection,['serverValidated','routeId','orderedStationPointIds','anchors','timings']);
 ensure(s.serverValidated===true&&legacy.intent.type==='new_mrt_line'&&s.routeId===legacy.intent.routeId&&canonical(s.orderedStationPointIds)===canonical(legacy.intent.stationPointIds),'HYBRID_HANDOFF_SELECTION');
 const expectedAnchors=Object.fromEntries(Object.entries(legacy.anchors).filter(([id])=>legacy.intent.stationPointIds.includes(id)));ensure(canonical(s.anchors)===canonical(expectedAnchors),'HYBRID_HANDOFF_ANCHORS');
 const t=object(s.timings,['runSeconds','dwellSeconds','waitingTimeSeconds','transferWalkSeconds','geometryConfirmed','assumptionsConfirmed']);
 ensure(t.geometryConfirmed===true&&t.assumptionsConfirmed===true,'HYBRID_HANDOFF_ACKNOWLEDGEMENTS');
 for(const key of ['runSeconds','dwellSeconds','waitingTimeSeconds','transferWalkSeconds'])ensure(typeof t[key]==='number'&&Number.isFinite(t[key])&&(t[key] as number)>=0&&(t[key] as number)<=3600&&(key!=='runSeconds'||(t[key] as number)>0),'HYBRID_HANDOFF_SECONDS');
 const intervention=legacy.intervention;ensure(intervention!==null&&intervention.waitingTimeSeconds===t.waitingTimeSeconds&&intervention.segments.every(x=>x.runSeconds===t.runSeconds&&x.dwellSeconds===t.dwellSeconds)&&intervention.stations.filter(x=>x.kind==='existing').every(x=>x.transferWalkSeconds===t.transferWalkSeconds),'HYBRID_HANDOFF_ADAPTER_TIMINGS');
 const w=object(r.result,['version','bindingKey','type','routeId','stationPointIds','sitePointIds','clarification']);
 ensure(w.version===HANDOFF_POLICY&&w.bindingKey===c.bindingKey&&canonical({...w,version:'hybrid-map-v1',bindingKey:legacy.contextBindingKey})===canonical(legacy.intent),'HYBRID_HANDOFF_ORIGINAL_RESULT');
 ensure(['deterministic','model'].includes(r.source as string)&&legacy.provenance.classificationSource===(r.source==='model'?'model-inference':'explicit-question'),'HYBRID_HANDOFF_SOURCE');
 if(r.source==='deterministic')ensure(r.generation===null,'HYBRID_HANDOFF_GENERATION');
 else {const g=object(r.generation,['requestedModel','servingModel','servingProvider','identityVerification','generationId','requestCanonicalHash','outputCanonicalHash']);ensure(verifiedModelIdentity(g.requestedModel,g.servingModel,g.servingProvider)!==null&&['completion','generation-details'].includes(g.identityVerification as string),'HYBRID_HANDOFF_PROVIDER');if(g.generationId!==null)text(g.generationId,200);hash(g.requestCanonicalHash,'');hash(g.outputCanonicalHash,'');}
 return freezeSnapshot(value as AcceptedHandoff);
}
export async function validateAcceptedHandoff(value:AcceptedHandoff):Promise<void>{
 const {bindingKey,...body}=value.context;ensure(bindingKey===await digest('',body),'HYBRID_HANDOFF_CONTEXT_DIGEST');
 if(value.generation)ensure(value.generation.outputCanonicalHash===await digest('',value.result),'HYBRID_HANDOFF_OUTPUT_DIGEST');
}
