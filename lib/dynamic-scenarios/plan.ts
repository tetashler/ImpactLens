/** Browser-safe generated proposals. None of this contract establishes verified world facts. */
import {assertJsonData,canonical,digest,ensure,freezeSnapshot,identifier,object,strings,text} from '../experiments/validation.ts';
import {parseWorldOntology,type WorldOntologyV1} from '../world-graph/ontology.ts';
import {parseGroundingBundle,type GroundingBundle} from '../grounding/contract.ts';
import {parseScenarioGeometry,type ScenarioGeometry} from '../plots/geometry.ts';
export const DYNAMIC_LIMITS=Object.freeze({planningCalls:1,planningOutputTokens:6000,agents:4,rounds:2,actionCalls:8,totalCalls:9,timeoutMs:120000,costUsd:0.05});
export interface DynamicRequest {version:1;question:string;geometry:ScenarioGeometry;geometryRevision:number}
export type DynamicScope='local'|'cross-border'|'international'|'undetermined';
export interface DynamicAgent {id:string;label:string;category:string;jurisdictionId:string|null;entityIds:string[];context:string;goals:string[];incentives:string[];concerns:string[];initialPosition:'concerned'|'conditional'|'information-seeking';knowledgeLimits:string[]}
export interface DynamicDraft {
 ontology?:WorldOntologyV1;
 description:string;trigger:string;scope:DynamicScope;jurisdictions:{id:string;label:string}[];domains:string[];
 userConditions:string[];
 entities:{id:string;name:string;kind:'government'|'business'|'institution'|'infrastructure'|'community'|'industry'|'country';jurisdictionId:string|null;status:'unverified-model-suggestion'}[];
 agents:DynamicAgent[];relationships:{id:string;sourceAgentId:string;targetAgentId:string;opportunity:string}[];
 assumptions:{id:string;text:string}[];uncertainties:string[];evidenceFindingIds:string[];
 spatialRequirement:'none'|'geometry-for-quantitative-model'|'no-supported-quantitative-model';
 unsupportedQuantities:string[];horizonYears:number;progression:string;
}
export interface DynamicScenarioPlan {version:1|2;grounding?:GroundingBundle;kind:'model-generated-scenario-plan';planId:string;requestIdentity:string;request:DynamicRequest;draft:DynamicDraft}
const bounded=(v:unknown,max:number)=>{assertJsonData(v);ensure(new TextEncoder().encode(JSON.stringify(v)).byteLength<=max,'Dynamic scenario exceeds size limit.');};
export function parseDynamicRequest(value:unknown):DynamicRequest {
 bounded(value,98304);const r=object(value,['version','question','geometry','geometryRevision']);ensure(r.version===1);text(r.question,2000);
 ensure(Number.isSafeInteger(r.geometryRevision)&&(r.geometryRevision as number)>=0&&(r.geometryRevision as number)<=1e9);
 return freezeSnapshot({version:1,question:r.question as string,geometry:parseScenarioGeometry(r.geometry),geometryRevision:r.geometryRevision as number});
}
const list=(v:unknown,n:number,len=160)=>strings(v,n,len);
function uniqueIds(values:unknown[]){const ids=values.map(v=>{const id=identifier((v as {id:unknown}).id);ensure(id.length<=70,'Generated ID exceeds graph-safe bound.');return id;});ensure(new Set(ids).size===ids.length,'Duplicate generated ID.');return new Set(ids);}
export function parseDynamicDraft(value:unknown,requestValue:DynamicRequest,grounding?:GroundingBundle):DynamicDraft {
 const request=parseDynamicRequest(requestValue);bounded(value,48000);
 const fields=['description','trigger','scope','jurisdictions','domains','userConditions','entities','agents','relationships','assumptions','uncertainties','evidenceFindingIds','spatialRequirement','unsupportedQuantities','horizonYears','progression'];const d=object(value,[...fields,'ontology'],fields);if(d.ontology!==undefined)parseWorldOntology(d.ontology,d as unknown as DynamicDraft,grounding);
 text(d.description,400);text(d.trigger,300);ensure(['local','cross-border','international','undetermined'].includes(d.scope as string));
 ensure(Array.isArray(d.jurisdictions)&&d.jurisdictions.length<=8);for(const v of d.jurisdictions){const j=object(v,['id','label']);identifier(j.id);text(j.label,100);}
 const jurisdictions=uniqueIds(d.jurisdictions);list(d.domains,6,100);const conditions=list(d.userConditions,4,300);ensure(conditions.every(q=>request.question.includes(q)),'User conditions must quote the actual question.');
 ensure(Array.isArray(d.entities)&&d.entities.length<=8);for(const v of d.entities){const e=object(v,['id','name','kind','jurisdictionId','status']);identifier(e.id);text(e.name,120);ensure(['government','business','institution','infrastructure','community','industry','country'].includes(e.kind as string));ensure(e.jurisdictionId===null||jurisdictions.has(e.jurisdictionId as string));ensure(e.status==='unverified-model-suggestion','Generated entities cannot claim verification.');}
 const entities=uniqueIds(d.entities);ensure(Array.isArray(d.agents)&&d.agents.length===4,'Generate exactly four fictional roles.');
 for(const v of d.agents){const a=object(v,['id','label','category','jurisdictionId','entityIds','context','goals','incentives','concerns','initialPosition','knowledgeLimits']);identifier(a.id);ensure((a.id as string).length<=80);text(a.label,100);text(a.category,100);text(a.context,220);ensure(a.jurisdictionId===null||jurisdictions.has(a.jurisdictionId as string));ensure(list(a.entityIds,3,160).every(id=>entities.has(id)),'Unknown generated entity.');for(const field of ['goals','incentives','concerns','knowledgeLimits'])ensure(list(a[field],2).length>0);ensure(['concerned','conditional','information-seeking'].includes(a.initialPosition as string));}
 const agents=uniqueIds(d.agents);ensure(Array.isArray(d.relationships)&&d.relationships.length>=3&&d.relationships.length<=8);
 uniqueIds(d.relationships);const involved=new Set<string>();for(const v of d.relationships){const r=object(v,['id','sourceAgentId','targetAgentId','opportunity']);identifier(r.id);ensure(agents.has(r.sourceAgentId as string)&&agents.has(r.targetAgentId as string)&&r.sourceAgentId!==r.targetAgentId,'Invalid generated relationship.');text(r.opportunity,220);involved.add(r.sourceAgentId as string);involved.add(r.targetAgentId as string);}ensure(involved.size===4,'Each agent needs an interaction opportunity.');const connected=new Set([Array.from(agents)[0]]);for(let pass=0;pass<4;pass++)for(const v of d.relationships){const r=v as {sourceAgentId:string;targetAgentId:string};if(connected.has(r.sourceAgentId)||connected.has(r.targetAgentId)){connected.add(r.sourceAgentId);connected.add(r.targetAgentId);}}ensure(connected.size===4,'Interaction opportunities must connect all agents.');
 ensure(Array.isArray(d.assumptions)&&d.assumptions.length<=6);uniqueIds(d.assumptions);for(const v of d.assumptions){const a=object(v,['id','text']);identifier(a.id);ensure((a.id as string).length<=70);text(a.text,300);}
 ensure(list(d.uncertainties,8,240).length>0);ensure(list(d.unsupportedQuantities,6,160).length>0);
 // No external source acquisition in this version: proposed citations cannot become evidence.
 ensure(list(d.evidenceFindingIds,0).length===0,'No verified finding registry supplied.');
 ensure(['none','geometry-for-quantitative-model','no-supported-quantitative-model'].includes(d.spatialRequirement as string));ensure(Number.isInteger(d.horizonYears)&&(d.horizonYears as number)>=1&&(d.horizonYears as number)<=10);text(d.progression,240);
 // Every generated string is untrusted, including names and relationship prose.
 const inspect=(value:unknown)=>{if(typeof value==='string'){
  ensure(!/https?:\/\/|www\./i.test(value),'Planner citations require a verified source registry.');
  ensure(!/\d[\d.,]*\s*(?:%|percent\b)|[$\u00a3\u20ac]\s*\d|\d[\d,]*\s+(?:jobs|workers|households|residents|people)\b/i.test(value)||request.question.includes(value),'Generated quantitative claims are unsupported.');
 }else if(Array.isArray(value))value.forEach(inspect);else if(value&&typeof value==='object')Object.values(value).forEach(inspect);};
 const {ontology,...generated}=d;inspect(generated);
 return freezeSnapshot(value) as DynamicDraft;
}
export async function createDynamicPlan(requestValue:DynamicRequest,value:unknown,groundingValue?:GroundingBundle):Promise<DynamicScenarioPlan>{
 const grounding=groundingValue?parseGroundingBundle(groundingValue):undefined,request=parseDynamicRequest(requestValue),draft=parseDynamicDraft(value,request,grounding),requestIdentity=await digest('dynamic-request-',request);
 const version=draft.ontology?2:1;ensure(version===2||!grounding,'Legacy plans cannot attach new research.');const content={request,draft,...(grounding?{grounding}:{} )};return freezeSnapshot({version,kind:'model-generated-scenario-plan',planId:await digest('dynamic-plan-',content),requestIdentity,...content});
}
export function parseDynamicPlan(value:unknown):DynamicScenarioPlan {
 bounded(value,130000);const p=object(value,['version','kind','planId','requestIdentity','request','draft','grounding'],['version','kind','planId','requestIdentity','request','draft']);ensure((p.version===1||p.version===2)&&p.kind==='model-generated-scenario-plan');
 ensure(typeof p.planId==='string'&&/^dynamic-plan-[a-f0-9]{64}$/.test(p.planId));ensure(typeof p.requestIdentity==='string'&&/^dynamic-request-[a-f0-9]{64}$/.test(p.requestIdentity));
 const request=parseDynamicRequest(p.request);parseDynamicDraft(p.draft,request,p.grounding===undefined?undefined:parseGroundingBundle(p.grounding));ensure((p.version===2)===!!(p.draft as DynamicDraft).ontology,'Ontology requires explicit new plan version.');ensure(p.version===2||p.grounding===undefined);return freezeSnapshot(value) as DynamicScenarioPlan;
}
export async function validateDynamicPlan(value:unknown):Promise<DynamicScenarioPlan>{
 const p=parseDynamicPlan(value);
 const expected=await createDynamicPlan(p.request as DynamicRequest,p.draft,p.grounding);ensure(canonical(expected)===canonical(value),'Generated plan identity mismatch.');return expected;
}
export function rolesForPlan(plan:DynamicScenarioPlan){return plan.draft.agents.map(a=>({id:a.id,title:`Fictional ${a.label}`,description:`${a.context} Proposed starting position: ${a.initialPosition}. Synthetic analytical role, never an authorised representative.`,interests:[...a.goals,...a.incentives],constraints:a.concerns,expertise:[a.category,...(a.jurisdictionId?[`Model-proposed affiliation: ${plan.draft.jurisdictions.find(j=>j.id===a.jurisdictionId)!.label}`]:[])],uncertainties:a.knowledgeLimits,classification:'fictional-role' as const}));}
export function assumptionsForPlan(plan:DynamicScenarioPlan){return [{id:'user-condition',label:'User hypothetical question',value:plan.request.question.trim().slice(0,500),provenance:'user-authored' as const},...plan.draft.assumptions.map(a=>({id:`proposal-${a.id}`,label:'Model-proposed assumption',value:a.text,provenance:'model-proposed' as const}))];}
/** Explicitly partial geographic context; never a replacement for the original calculator geometry. */
export function spatialPrompt(request:DynamicRequest){return {provenance:'user-drawn',features:request.geometry.features.slice(0,24).map(f=>f.kind==='point'?f:{...f,coordinates:f.coordinates.slice(0,12)}),warning:'Coordinates are user proposals within the Singapore plotting bounds. Long plots may be shortened here; original geometry is retained. No calculated journey, nearby-facility or health metric is supplied. Existing MRT/AAC tools require separate confirmed inputs.'};}
