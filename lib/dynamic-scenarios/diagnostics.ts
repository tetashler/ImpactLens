/** Safe browser-serialisable planner errors. Never retain offending values or exception prose. */
import {assertJsonData} from '../experiments/validation.ts';
const shape=['plan.required_field','plan.invalid_field_type','plan.unexpected_property','plan.invalid_data','plan.invalid_text','plan.invalid_identifier','plan.invalid_value','plan.unsafe_text','plan.ontology_required'] as const;
const limits=['plan.collection_limit','plan.output_size_exceeded','ontology.entity_count_exceeded','ontology.relationship_count_exceeded','ontology.type_count_exceeded'] as const;
const references=['ontology.entity_type_unknown','ontology.relationship_type_unknown','ontology.jurisdiction_unknown','ontology.relationship_endpoint_unknown','ontology.source_reference_unknown','ontology.source_passage_unknown','ontology.source_registry_invalid','agent.cross_reference_invalid'] as const;
const semantics=['plan.duplicate_value','plan.unsupported_numeric_claim','plan.user_condition_not_verbatim','plan.local_scope_invalid','plan.legacy_research_invalid','ontology.entity_type_duplicate','ontology.relationship_type_duplicate','ontology.entity_id_duplicate','ontology.entity_duplicate','ontology.relationship_id_duplicate','ontology.entity_agent_id_collision','ontology.source_quote_not_found','ontology.source_quote_entity_mismatch','agent.role_slot_invalid','agent.role_slot_missing','agent.role_slot_duplicate','agent.role_id_duplicate','agent.interaction_structure_invalid'] as const;
export const PLANNER_RULES=[...shape,...limits,...references,...semantics,'plan.unsupported_version','ontology.unsupported_version','plan.identity_mismatch','plan.invalid_json','plan.incomplete_output','plan.response_envelope','plan.internal_validation'] as const;
export type PlannerRule=typeof PLANNER_RULES[number];
const kinds=['missing','null','array','object','string','number','boolean','non-json'] as const;
const categories=['shape','limit','reference','semantic','version','identity','json','completion','internal'] as const;
export interface PlannerDiagnostic {stage:'draft'|'ontology'|'plan'|'completion';category:typeof categories[number];rule:PlannerRule;path:string;expected:'contract-shape'|'bounded-value'|'declared-reference'|'semantic-constraint'|'supported-version'|'matching-identity'|'valid-json'|'normal-completion'|'known-validation-rule';actualKind:typeof kinds[number]}
const tokens=new Set(('draft plan request description trigger scope jurisdictions id label domains userConditions entities name kind jurisdictionId status agents category entityIds context goals incentives concerns initialPosition knowledgeLimits relationships sourceAgentId targetAgentId opportunity assumptions text uncertainties evidenceFindingIds spatialRequirement unsupportedQuantities horizonYears progression ontology version entityTypes relationshipTypes typeId support sourceId passageId quote source target statement kind planId requestIdentity grounding demographics attributionPolicy mode registration registries worldEntities original canonical supportPolicy communication style').split(' '));
function validPath(path:unknown):path is string {
 if(typeof path!=='string'||path.length>240||!/^(draft|plan|request)(?:\.[A-Za-z]+|\[\d{1,4}\])*$/.test(path))return false;
 return path.match(/[A-Za-z]+|\d+/g)!.every(t=>/^\d+$/.test(t)?Number(t)<=2000:tokens.has(t));
}
const actualKind=(v:unknown):PlannerDiagnostic['actualKind']=>v===undefined?'missing':v===null?'null':Array.isArray(v)?'array':['object','string','number','boolean'].includes(typeof v)?typeof v as PlannerDiagnostic['actualKind']:'non-json';
export function plannerDiagnostic(rule:PlannerRule,path:string,value?:unknown):PlannerDiagnostic {
 const category:PlannerDiagnostic['category']=shape.includes(rule as any)?'shape':limits.includes(rule as any)?'limit':references.includes(rule as any)?'reference':semantics.includes(rule as any)?'semantic':rule.endsWith('unsupported_version')?'version':rule==='plan.identity_mismatch'?'identity':rule==='plan.invalid_json'?'json':rule==='plan.internal_validation'?'internal':'completion';
 const expected:PlannerDiagnostic['expected']=({shape:'contract-shape',limit:'bounded-value',reference:'declared-reference',semantic:'semantic-constraint',version:'supported-version',identity:'matching-identity',json:'valid-json',completion:'normal-completion',internal:'known-validation-rule'} as const)[category];
 const diagnostic={stage:rule.startsWith('ontology.')||path.startsWith('draft.ontology')?'ontology':category==='completion'||category==='json'?'completion':path.startsWith('plan')?'plan':'draft',category,rule,path,expected,actualKind:actualKind(value)} as PlannerDiagnostic;
 if(!validPath(path))throw new Error('Invalid internal planner diagnostic path.');return diagnostic;
}
export function parsePlannerDiagnostic(value:unknown):PlannerDiagnostic {
 assertJsonData(value);const v=value as PlannerDiagnostic;
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!=='actualKind,category,expected,path,rule,stage'||!PLANNER_RULES.includes(v.rule)||!validPath(v.path)||!kinds.includes(v.actualKind))throw new Error('Invalid planner diagnostic.');
 const expected=plannerDiagnostic(v.rule,v.path);
 if(v.category!==expected.category||v.stage!==expected.stage||v.expected!==expected.expected)throw new Error('Invalid planner diagnostic.');return {...v};
}
export class PlannerValidationError extends Error {
 readonly diagnostic:PlannerDiagnostic;
 constructor(rule:PlannerRule,path:string,value?:unknown){super(`Planner validation: ${rule}`);this.name='PlannerValidationError';this.diagnostic=plannerDiagnostic(rule,path,value);}
}
export function checkPlan(condition:unknown,rule:PlannerRule,path:string,value?:unknown):asserts condition {if(!condition)throw new PlannerValidationError(rule,path,value);}
export function planGuard<T>(path:string,read:()=>T):T {try{return read();}catch(error){if(error instanceof PlannerValidationError)throw error;throw new PlannerValidationError('plan.invalid_data',path);}}
export function planObject(value:unknown,fields:readonly string[],path:string,required:readonly string[]=fields):Record<string,unknown>{
 checkPlan(value!==null&&typeof value==='object'&&!Array.isArray(value),'plan.invalid_field_type',path,value);
 checkPlan([Object.prototype,null].includes(Object.getPrototypeOf(value)),'plan.invalid_data',path,value);
 const descriptors=Object.getOwnPropertyDescriptors(value);
 checkPlan(Reflect.ownKeys(value).every(k=>typeof k==='string'&&fields.includes(k)&&Object.hasOwn(descriptors[k],'value')&&descriptors[k].enumerable),'plan.unexpected_property',path,value);
 for(const key of required)checkPlan(Object.hasOwn(value,key),'plan.required_field',`${path}.${key}`);
 return value as Record<string,unknown>;
}
export function planText(value:unknown,max:number,path:string):string {checkPlan(typeof value==='string','plan.invalid_field_type',path,value);checkPlan(value.length<=max&&value.trim().length>0&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),'plan.invalid_text',path,value);return value;}
export function planId(value:unknown,path:string,max=70):string {const v=planText(value,max,path);checkPlan(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(v),'plan.invalid_identifier',path,value);return v;}
export function planList(value:unknown,max:number,path:string,rule:PlannerRule='plan.collection_limit'):unknown[]{checkPlan(Array.isArray(value),'plan.invalid_field_type',path,value);checkPlan(value.length<=max,rule,path,value);return value;}
export function planUnique(values:string[],path:string,rule:PlannerRule='plan.duplicate_value',field?:string):Set<string>{const seen=new Set<string>();values.forEach((v,i)=>{checkPlan(!seen.has(v),rule,`${path}[${i}]${field?'.'+field:''}`,v);seen.add(v);});return seen;}
export function planStrings(value:unknown,max:number,len:number,path:string):string[]{const list=planList(value,max,path).map((v,i)=>planText(v,len,`${path}[${i}]`));planUnique(list,path);return list;}
