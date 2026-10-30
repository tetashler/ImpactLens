/** Model-proposed ontology. Type names confer neither execution permission nor verification. */
import {assertJsonData,freezeSnapshot} from '../experiments/validation.ts';
import {parseGroundingSupport,type GroundingBundle,type GroundingSupport} from '../grounding/contract.ts';
import {checkPlan,planGuard,planObject,planText,planId,planList,planUnique} from '../dynamic-scenarios/diagnostics.ts';
export interface WorldType {id:string;name:string;description:string}
export interface WorldOntologyV1 {
 version:1;entityTypes:WorldType[];relationshipTypes:WorldType[];
 /** support is a proposed literal association, not proof; consumers must assess attribution. */
 entities:{id:string;name:string;typeId:string;jurisdictionId:string|null;support:GroundingSupport|null;communication?:{version:1;style:'public-discussion'|'public-feed'|'private-group'}|null}[];
 relationships:{id:string;source:string;target:string;typeId:string;statement:string;support:GroundingSupport|null}[];
}
export const WORLD_LIMITS={entityTypes:16,relationshipTypes:16,entities:24,relationships:48,bytes:24000} as const;
export function parseWorldOntology(value:unknown,context:{jurisdictions:{id:string}[];agents:{id:string}[]},grounding?:GroundingBundle):WorldOntologyV1 {
 const root='draft.ontology';planGuard(root,()=>assertJsonData(value));checkPlan(new TextEncoder().encode(JSON.stringify(value)).byteLength<=WORLD_LIMITS.bytes,'plan.output_size_exceeded',root,value);
 const o=planObject(value,['version','entityTypes','relationshipTypes','entities','relationships'],root);checkPlan(o.version===1,'ontology.unsupported_version',`${root}.version`,o.version);
 const prose=(v:unknown,max:number,path:string)=>{const s=planText(v,max,path);checkPlan(!/[<>]|https?:\/\/|www\./i.test(s),'plan.unsafe_text',path,v);checkPlan(!/\d[\d.,]*\s*(?:%|percent\b)|[$£€]\s*\d|\d[\d,]*\s+(?:jobs|workers|households|residents|people)\b/i.test(s),'plan.unsupported_numeric_claim',path,v);return s;};
 const types=(field:'entityTypes'|'relationshipTypes')=>{
  const path=`${root}.${field}`,values=planList(o[field],16,path,'ontology.type_count_exceeded'),rule=field==='entityTypes'?'ontology.entity_type_duplicate':'ontology.relationship_type_duplicate';checkPlan(values.length>0,'plan.invalid_value',path,values);
  const parsed=values.map((v,i)=>{const p=`${path}[${i}]`,t=planObject(v,['id','name','description'],p);return {id:planId(t.id,`${p}.id`),name:prose(t.name,80,`${p}.name`),description:prose(t.description,180,`${p}.description`)};});
  const ids=planUnique(parsed.map(t=>t.id),path,rule,'id');planUnique(parsed.map(t=>t.name.toLocaleLowerCase('en-SG')),path,rule,'name');return ids;
 };
 const entityTypes=types('entityTypes'),relationshipTypes=types('relationshipTypes');
 const jurisdictions=new Set(context.jurisdictions.map(j=>j.id)),agents=new Set(context.agents.map(a=>a.id));
 const entities=planList(o.entities,WORLD_LIMITS.entities,`${root}.entities`,'ontology.entity_count_exceeded').map((v,i)=>planObject(v,['id','name','typeId','jurisdictionId','support','communication'],`${root}.entities[${i}]`,['id','name','typeId','jurisdictionId','support']));
 const entityIds=planUnique(entities.map((e,i)=>planId(e.id,`${root}.entities[${i}].id`)),`${root}.entities`,'ontology.entity_id_duplicate','id');
 entities.forEach((e,i)=>{const p=`${root}.entities[${i}]`;prose(e.name,120,`${p}.name`);checkPlan(entityTypes.has(e.typeId as string),'ontology.entity_type_unknown',`${p}.typeId`,e.typeId);checkPlan(e.jurisdictionId===null||jurisdictions.has(e.jurisdictionId as string),'ontology.jurisdiction_unknown',`${p}.jurisdictionId`,e.jurisdictionId);checkPlan(!agents.has(e.id as string),'ontology.entity_agent_id_collision',`${p}.id`,e.id);
  if(e.communication!==undefined&&e.communication!==null){const cap=planObject(e.communication,['version','style'],`${p}.communication`);checkPlan(cap.version===1,'plan.invalid_value',`${p}.communication.version`,cap.version);checkPlan(['public-discussion','public-feed','private-group'].includes(cap.style as string),'plan.invalid_value',`${p}.communication.style`,cap.style);}
  if(e.support!==null){checkPlan(grounding,'ontology.source_registry_invalid',`${p}.support`);parseGroundingSupport(e.support,grounding,`${p}.support`);}
 });
 // Composite identity is computed only after every participating primitive is validated.
 planUnique(entities.map(e=>`${(e.name as string).trim().toLocaleLowerCase('en-SG')}|${e.typeId as string}|${e.jurisdictionId as string|null}`),`${root}.entities`,'ontology.entity_duplicate');
 const endpoints=new Set([...agents,...entityIds]),relationships=planList(o.relationships,WORLD_LIMITS.relationships,`${root}.relationships`,'ontology.relationship_count_exceeded').map((v,i)=>planObject(v,['id','source','target','typeId','statement','support'],`${root}.relationships[${i}]`));
 planUnique(relationships.map((r,i)=>planId(r.id,`${root}.relationships[${i}].id`)),`${root}.relationships`,'ontology.relationship_id_duplicate','id');
 relationships.forEach((r,i)=>{const p=`${root}.relationships[${i}]`;for(const field of ['source','target'])checkPlan(endpoints.has(r[field] as string),'ontology.relationship_endpoint_unknown',`${p}.${field}`,r[field]);checkPlan(relationshipTypes.has(r.typeId as string),'ontology.relationship_type_unknown',`${p}.typeId`,r.typeId);prose(r.statement,240,`${p}.statement`);if(r.support!==null){checkPlan(grounding,'ontology.source_registry_invalid',`${p}.support`);parseGroundingSupport(r.support,grounding,`${p}.support`);}});
 return freezeSnapshot(value) as WorldOntologyV1;
}
