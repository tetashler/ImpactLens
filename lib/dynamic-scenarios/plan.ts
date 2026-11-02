import {parseAssumptionReview,assertReviewedAssumptions,type AssumptionReview} from '../assumption-review/contract.ts';
/** Browser-safe generated proposals. None of this contract establishes verified world facts. */
import {assertJsonData,canonical,digest,ensure,freezeSnapshot,object,text} from '../experiments/validation.ts';
import {parseScenarioDemographicContext,type ScenarioDemographicContext} from '../demographics/scenario-context.ts';
import {parseWorldOntology,type WorldOntologyV1} from '../world-graph/ontology.ts';
import {parseGroundingBundle,type GroundingBundle} from '../grounding/contract.ts';
import {parseScenarioGeometry,type ScenarioGeometry} from '../plots/geometry.ts';
import {checkPlan,planGuard,planObject,planText,planId,planList,planUnique,planStrings} from './diagnostics.ts';
import {parseRegistration,type PlannerRegistration} from './registration.ts';
import {assessEntityAttribution} from '../world-graph/attribution.ts';
import {validateUserConditionSource,type UserConditionProvenance} from './user-condition-source.ts';
export const DYNAMIC_LIMITS=Object.freeze({planningCalls:2,planningOutputTokens:6000,agents:4,rounds:2,actionCalls:8,totalCalls:10,timeoutMs:120000,costUsd:0.05});
export interface DynamicRequest {version:1;question:string;geometry:ScenarioGeometry;geometryRevision:number}
export type DynamicScope='local'|'cross-border'|'international'|'undetermined';
export interface DynamicAgent {id:string;label:string;category:string;jurisdictionId:string|null;entityIds:string[];context:string;goals:string[];incentives:string[];concerns:string[];initialPosition:'concerned'|'conditional'|'information-seeking';knowledgeLimits:string[]}
export interface DynamicDraft {
 ontology?:WorldOntologyV1;
 description:string;trigger:string;scope:DynamicScope;jurisdictions:{id:string;label:string}[];domains:string[];
 userConditions:string[];
 userConditionProvenance?:UserConditionProvenance;
 entities:{id:string;name:string;kind:'government'|'business'|'institution'|'infrastructure'|'community'|'industry'|'country';jurisdictionId:string|null;status:'unverified-model-suggestion'}[];
 agents:DynamicAgent[];relationships:{id:string;sourceAgentId:string;targetAgentId:string;opportunity:string}[];
 assumptions:{id:string;text:string}[];uncertainties:string[];evidenceFindingIds:string[];
 spatialRequirement:'none'|'geometry-for-quantitative-model'|'no-supported-quantitative-model';
 unsupportedQuantities:string[];horizonYears:number;progression:string;
}
export interface DynamicScenarioPlan {assumptionReview?:AssumptionReview;version:1|2;registration?:PlannerRegistration;grounding?:GroundingBundle;demographics?:ScenarioDemographicContext;attributionPolicy?:{version:1;mode:'retain-unverified-candidates'};kind:'model-generated-scenario-plan';planId:string;requestIdentity:string;request:DynamicRequest;draft:DynamicDraft}
const bounded=(v:unknown,max:number)=>{assertJsonData(v);ensure(new TextEncoder().encode(JSON.stringify(v)).byteLength<=max,'Dynamic scenario exceeds size limit.');};
export function parseDynamicRequest(value:unknown):DynamicRequest {
 bounded(value,98304);const r=object(value,['version','question','geometry','geometryRevision']);ensure(r.version===1);text(r.question,2000);
 ensure(Number.isSafeInteger(r.geometryRevision)&&(r.geometryRevision as number)>=0&&(r.geometryRevision as number)<=1e9);
 return freezeSnapshot({version:1,question:r.question as string,geometry:parseScenarioGeometry(r.geometry),geometryRevision:r.geometryRevision as number});
}
export function parseDynamicDraft(value:unknown,requestValue:DynamicRequest,grounding?:GroundingBundle,generatedSlots=false):DynamicDraft {
 const request=parseDynamicRequest(requestValue);planGuard('draft',()=>assertJsonData(value));checkPlan(new TextEncoder().encode(JSON.stringify(value)).byteLength<=48000,'plan.output_size_exceeded','draft',value);
 const fields=['description','trigger','scope','jurisdictions','domains','userConditions','entities','agents','relationships','assumptions','uncertainties','evidenceFindingIds','spatialRequirement','unsupportedQuantities','horizonYears','progression'];
 const d=planObject(value,[...fields,'ontology','userConditionProvenance'],'draft',fields);
 planText(d.description,400,'draft.description');planText(d.trigger,300,'draft.trigger');checkPlan(['local','cross-border','international','undetermined'].includes(d.scope as string),'plan.invalid_value','draft.scope',d.scope);
 const objects=(field:string,max:number,keys:string[])=>planList(d[field],max,`draft.${field}`).map((v,i)=>planObject(v,keys,`draft.${field}[${i}]`));
 const ids=(values:Record<string,unknown>[],field:string)=>planUnique(values.map((v,i)=>planId(v.id,`draft.${field}[${i}].id`)),`draft.${field}`,'plan.duplicate_value','id');
 const js=objects('jurisdictions',8,['id','label']);js.forEach((j,i)=>planText(j.label,100,`draft.jurisdictions[${i}].label`));const jurisdictions=ids(js,'jurisdictions');
 planStrings(d.domains,6,100,'draft.domains');const completeSource=Object.hasOwn(d,'userConditionProvenance');
 if(completeSource)validateUserConditionSource(d.userConditions,d.userConditionProvenance,request.question);
 else planStrings(d.userConditions,4,300,'draft.userConditions').forEach((q,i)=>checkPlan(request.question.includes(q),'plan.user_condition_not_verbatim',`draft.userConditions[${i}]`,q));
 const es=objects('entities',8,['id','name','kind','jurisdictionId','status']);es.forEach((e,i)=>{const p=`draft.entities[${i}]`;planText(e.name,120,`${p}.name`);checkPlan(['government','business','institution','infrastructure','community','industry','country'].includes(e.kind as string),'plan.invalid_value',`${p}.kind`,e.kind);checkPlan(e.jurisdictionId===null||jurisdictions.has(e.jurisdictionId as string),'agent.cross_reference_invalid',`${p}.jurisdictionId`,e.jurisdictionId);checkPlan(e.status==='unverified-model-suggestion','plan.invalid_value',`${p}.status`,e.status);});const entities=ids(es,'entities');
 // Validate context shapes before ontology reference resolution; never dereference an unchecked array.
 const rawAgents=planList(d.agents,4,'draft.agents');checkPlan(rawAgents.length===4,'agent.role_slot_missing','draft.agents',d.agents);
 const as=rawAgents.map((v,i)=>planObject(v,['id','label','category','jurisdictionId','entityIds','context','goals','incentives','concerns','initialPosition','knowledgeLimits'],`draft.agents[${i}]`));
 const agentIds=as.map((a,i)=>planId(a.id,`draft.agents[${i}].id`)),agents=planUnique(agentIds,'draft.agents',generatedSlots?'agent.role_slot_duplicate':'agent.role_id_duplicate','id');
 if(generatedSlots)agentIds.forEach((id,i)=>checkPlan(['agent-1','agent-2','agent-3','agent-4'].includes(id),'agent.role_slot_invalid',`draft.agents[${i}].id`,id));
 as.forEach((a,i)=>{const p=`draft.agents[${i}]`;planText(a.label,100,`${p}.label`);planText(a.category,100,`${p}.category`);planText(a.context,220,`${p}.context`);checkPlan(a.jurisdictionId===null||jurisdictions.has(a.jurisdictionId as string),'agent.cross_reference_invalid',`${p}.jurisdictionId`,a.jurisdictionId);planStrings(a.entityIds,3,160,`${p}.entityIds`).forEach((id,j)=>checkPlan(entities.has(id),'agent.cross_reference_invalid',`${p}.entityIds[${j}]`,id));for(const field of ['goals','incentives','concerns','knowledgeLimits'])checkPlan(planStrings(a[field],2,160,`${p}.${field}`).length>0,'plan.invalid_value',`${p}.${field}`,a[field]);checkPlan(['concerned','conditional','information-seeking'].includes(a.initialPosition as string),'plan.invalid_value',`${p}.initialPosition`,a.initialPosition);});
 const rs=objects('relationships',8,['id','sourceAgentId','targetAgentId','opportunity']);checkPlan(rs.length>=3,'agent.interaction_structure_invalid','draft.relationships',rs);ids(rs,'relationships');
 const involved=new Set<string>();rs.forEach((r,i)=>{const p=`draft.relationships[${i}]`;for(const field of ['sourceAgentId','targetAgentId'])checkPlan(agents.has(r[field] as string),'agent.cross_reference_invalid',`${p}.${field}`,r[field]);checkPlan(r.sourceAgentId!==r.targetAgentId,'agent.interaction_structure_invalid',`${p}.targetAgentId`,r.targetAgentId);planText(r.opportunity,220,`${p}.opportunity`);involved.add(r.sourceAgentId as string);involved.add(r.targetAgentId as string);});
 checkPlan(involved.size===4,'agent.interaction_structure_invalid','draft.relationships',rs);const connected=new Set([agentIds[0]]);for(let pass=0;pass<4;pass++)for(const r of rs)if(connected.has(r.sourceAgentId as string)||connected.has(r.targetAgentId as string)){connected.add(r.sourceAgentId as string);connected.add(r.targetAgentId as string);}checkPlan(connected.size===4,'agent.interaction_structure_invalid','draft.relationships',rs);
 const assumptions=objects('assumptions',6,['id','text']);ids(assumptions,'assumptions');assumptions.forEach((a,i)=>planText(a.text,300,`draft.assumptions[${i}].text`));
 for(const [field,max,len]of [['uncertainties',8,240],['unsupportedQuantities',6,160]] as const)checkPlan(planStrings(d[field],max,len,`draft.${field}`).length>0,'plan.invalid_value',`draft.${field}`,d[field]);
 planStrings(d.evidenceFindingIds,0,160,'draft.evidenceFindingIds');checkPlan(['none','geometry-for-quantitative-model','no-supported-quantitative-model'].includes(d.spatialRequirement as string),'plan.invalid_value','draft.spatialRequirement',d.spatialRequirement);checkPlan(Number.isInteger(d.horizonYears)&&(d.horizonYears as number)>=1&&(d.horizonYears as number)<=10,'plan.invalid_value','draft.horizonYears',d.horizonYears);planText(d.progression,240,'draft.progression');
 if(d.ontology!==undefined)parseWorldOntology(d.ontology,d as unknown as DynamicDraft,grounding);
 const inspect=(v:unknown,path:string)=>{if(typeof v==='string'){checkPlan(!/https?:\/\/|www\./i.test(v),'plan.unsafe_text',path,v);checkPlan(!/\d[\d.,]*\s*(?:%|percent\b)|[$\u00a3\u20ac]\s*\d|\d[\d,]*\s+(?:jobs|workers|households|residents|people)\b/i.test(v)||request.question.includes(v),'plan.unsupported_numeric_claim',path,v);}else if(Array.isArray(v))v.forEach((item,i)=>inspect(item,`${path}[${i}]`));else if(v&&typeof v==='object')for(const [key,item]of Object.entries(v))inspect(item,`${path}.${key}`);};
 // Only the validated complete user source is exempt from generated-prose checks.
 for(const field of fields)if(field!=='userConditions'||!completeSource)inspect(d[field],`draft.${field}`);
 return freezeSnapshot(value) as DynamicDraft;
}
export async function createDynamicPlan(requestValue:DynamicRequest,value:unknown,groundingValue?:GroundingBundle,demographicsValue?:ScenarioDemographicContext,registrationValue?:PlannerRegistration,reviewValue?:AssumptionReview):Promise<DynamicScenarioPlan>{
 const grounding=groundingValue?planGuard('plan.grounding',()=>parseGroundingBundle(groundingValue)):undefined,request=planGuard('plan.request',()=>parseDynamicRequest(requestValue)),draft=parseDynamicDraft(value,request,grounding),requestIdentity=await digest('dynamic-request-',request);
 const demographics=demographicsValue?planGuard('plan.demographics',()=>parseScenarioDemographicContext(demographicsValue)):undefined;const version=draft.ontology?2:1;checkPlan(version===2||(!grounding&&!demographics),'plan.legacy_research_invalid','plan',value);
 const attributionPolicy=draft.ontology?.entities.some(e=>assessEntityAttribution(e,grounding).attribution.status==='unverified-candidate')?{version:1 as const,mode:'retain-unverified-candidates' as const}:undefined;
 const registration=registrationValue?parseRegistration(registrationValue,draft):undefined;
 const assumptionReview=reviewValue?parseAssumptionReview(reviewValue):undefined;assertReviewedAssumptions({request,draft,assumptionReview});
 const content={request,draft,...(assumptionReview?{assumptionReview}:{}),...(registration?{registration}:{}),...(grounding?{grounding}:{} ),...(demographics?{demographics}:{}),...(attributionPolicy?{attributionPolicy}:{})};return freezeSnapshot({version,kind:'model-generated-scenario-plan',planId:await digest('dynamic-plan-',content),requestIdentity,...content});
}
export function parseDynamicPlan(value:unknown):DynamicScenarioPlan {
 planGuard('plan',()=>bounded(value,130000));const p=planObject(value,['version','kind','planId','requestIdentity','request','draft','grounding','demographics','attributionPolicy','registration','assumptionReview'],'plan',['version','kind','planId','requestIdentity','request','draft']);checkPlan(p.version===1||p.version===2,'plan.unsupported_version','plan.version',p.version);checkPlan(p.kind==='model-generated-scenario-plan','plan.invalid_value','plan.kind',p.kind);
 checkPlan(typeof p.planId==='string'&&/^dynamic-plan-[a-f0-9]{64}$/.test(p.planId),'plan.invalid_identifier','plan.planId',p.planId);checkPlan(typeof p.requestIdentity==='string'&&/^dynamic-request-[a-f0-9]{64}$/.test(p.requestIdentity),'plan.invalid_identifier','plan.requestIdentity',p.requestIdentity);
 const request=planGuard('plan.request',()=>parseDynamicRequest(p.request)),grounding=p.grounding===undefined?undefined:planGuard('plan.grounding',()=>parseGroundingBundle(p.grounding)),draft=parseDynamicDraft(p.draft,request,grounding);checkPlan((p.version===2)===!!draft.ontology,'plan.unsupported_version','plan.version',p.version);checkPlan(p.version===2||(p.grounding===undefined&&p.demographics===undefined),'plan.legacy_research_invalid','plan',p);if(p.demographics!==undefined)planGuard('plan.demographics',()=>parseScenarioDemographicContext(p.demographics));
 const hasCandidate=!!draft.ontology?.entities.some(e=>assessEntityAttribution(e,grounding).attribution.status==='unverified-candidate');
 if(p.attributionPolicy!==undefined){const policy=planObject(p.attributionPolicy,['version','mode'],'plan.attributionPolicy');checkPlan(p.version===2&&hasCandidate&&policy.version===1&&policy.mode==='retain-unverified-candidates','plan.invalid_value','plan.attributionPolicy',p.attributionPolicy);}else checkPlan(!hasCandidate,'plan.required_field','plan.attributionPolicy');
 if(p.registration!==undefined)parseRegistration(p.registration,draft);
 if(p.assumptionReview!==undefined)assertReviewedAssumptions({request,draft,assumptionReview:parseAssumptionReview(p.assumptionReview)});
 return freezeSnapshot(value) as DynamicScenarioPlan;
}
export async function validateDynamicPlan(value:unknown):Promise<DynamicScenarioPlan>{
 const p=parseDynamicPlan(value);
 const expected=await createDynamicPlan(p.request as DynamicRequest,p.draft,p.grounding,p.demographics,p.registration,p.assumptionReview);checkPlan(canonical(expected)===canonical(value),'plan.identity_mismatch','plan.planId',p.planId);return expected;
}
export function rolesForPlan(plan:DynamicScenarioPlan){return plan.draft.agents.map(a=>({id:a.id,title:`Fictional ${a.label}`,description:`${a.context} Proposed starting position: ${a.initialPosition}. Synthetic analytical role, never an authorised representative.`,interests:[...a.goals,...a.incentives],constraints:a.concerns,expertise:[a.category,...(a.jurisdictionId?[`Model-proposed affiliation: ${plan.draft.jurisdictions.find(j=>j.id===a.jurisdictionId)!.label}`]:[])],uncertainties:a.knowledgeLimits,classification:'fictional-role' as const}));}
export function assumptionsForPlan(plan:DynamicScenarioPlan){return [{id:'user-condition',label:'User hypothetical question',value:plan.request.question.trim().slice(0,500),provenance:'user-authored' as const},...plan.draft.assumptions.map(a=>({id:`proposal-${a.id}`,label:'Model-proposed assumption',value:a.text,provenance:'model-proposed' as const}))];}
/** Explicitly partial geographic context; never a replacement for the original calculator geometry. */
export function spatialPrompt(request:DynamicRequest){return {provenance:'user-drawn',features:request.geometry.features.slice(0,24).map(f=>f.kind==='point'?f:{...f,coordinates:f.coordinates.slice(0,12)}),warning:'Coordinates are user proposals within the Singapore plotting bounds. Long plots may be shortened here; original geometry is retained. No calculated journey, nearby-facility or health metric is supplied. Existing MRT/AAC tools require separate confirmed inputs.'};}
