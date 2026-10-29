/** Model-proposed ontology. Type names confer neither execution permission nor verification. */
import {assertJsonData,ensure,freezeSnapshot,identifier,object,text} from '../experiments/validation.ts';
import {parseGroundingSupport,type GroundingBundle,type GroundingSupport} from '../grounding/contract.ts';
export interface WorldType {id:string;name:string;description:string}
export interface WorldOntologyV1 {
 version:1;entityTypes:WorldType[];relationshipTypes:WorldType[];
 entities:{id:string;name:string;typeId:string;jurisdictionId:string|null;support:GroundingSupport|null}[];
 relationships:{id:string;source:string;target:string;typeId:string;statement:string;support:GroundingSupport|null}[];
}
export const WORLD_LIMITS={entityTypes:16,relationshipTypes:16,entities:24,relationships:48,bytes:24000} as const;
const id=(v:unknown)=>{const s=identifier(v);ensure(s.length<=70);return s;};
const prose=(v:unknown,max:number)=>{const s=text(v,max);ensure(!/[<>]|https?:\/\/|www\./i.test(s),'Ontology text must be plain data without citations.');ensure(!/\d[\d.,]*\s*(?:%|percent\b)|[$£€]\s*\d|\d[\d,]*\s+(?:jobs|workers|households|residents|people)\b/i.test(s),'Unsupported quantitative ontology claim.');return s;};
const list=(v:unknown,max:number)=>{ensure(Array.isArray(v)&&v.length<=max);return v;};
const unique=(v:string[])=>{ensure(new Set(v).size===v.length,'Duplicate ontology identity or name.');return new Set(v);};
export function parseWorldOntology(value:unknown,context:{jurisdictions:{id:string}[];agents:{id:string}[]},grounding?:GroundingBundle):WorldOntologyV1 {
 assertJsonData(value);ensure(new TextEncoder().encode(JSON.stringify(value)).byteLength<=WORLD_LIMITS.bytes);
 const o=object(value,['version','entityTypes','relationshipTypes','entities','relationships']);ensure(o.version===1,'Unsupported world ontology version.');
 const types=(v:unknown,max:number)=>{const values=list(v,max);ensure(values.length>0);for(const v of values){const t=object(v,['id','name','description']);id(t.id);prose(t.name,80);prose(t.description,180);}unique(values.map(t=>(t as WorldType).name.toLocaleLowerCase('en-SG')));return unique(values.map(t=>id((t as WorldType).id)));};
 const entityTypes=types(o.entityTypes,WORLD_LIMITS.entityTypes),relationshipTypes=types(o.relationshipTypes,WORLD_LIMITS.relationshipTypes),jurisdictions=new Set(context.jurisdictions.map(j=>j.id));
 const entities=list(o.entities,WORLD_LIMITS.entities);const entityIds=unique(entities.map(v=>id(object(v,['id','name','typeId','jurisdictionId','support']).id)));
 unique(entities.map(v=>{const e=v as WorldOntologyV1['entities'][number];return `${String(e.name).trim().toLocaleLowerCase('en-SG')}|${e.typeId}|${e.jurisdictionId}`;}));
 for(const v of entities){const e=v as WorldOntologyV1['entities'][number];prose(e.name,120);ensure(entityTypes.has(e.typeId));ensure(e.jurisdictionId===null||jurisdictions.has(e.jurisdictionId));if(e.support!==null){ensure(grounding,'No source registry supplied.');const s=parseGroundingSupport(e.support,grounding);ensure(s.quote.toLocaleLowerCase('en-SG').includes(e.name.toLocaleLowerCase('en-SG')),'An entity support passage must actually mention its name.');}}
 const agents=new Set(context.agents.map(a=>a.id));ensure([...entityIds].every(e=>!agents.has(e)),'World entity and agent IDs must be distinct.');const endpoints=new Set([...agents,...entityIds]);
 const relationships=list(o.relationships,WORLD_LIMITS.relationships);unique(relationships.map(v=>id(object(v,['id','source','target','typeId','statement','support']).id)));
 for(const v of relationships){const r=v as WorldOntologyV1['relationships'][number];ensure(endpoints.has(r.source)&&endpoints.has(r.target),'Unknown ontology relationship endpoint.');ensure(relationshipTypes.has(r.typeId));prose(r.statement,240);if(r.support!==null){ensure(grounding,'No source registry supplied.');parseGroundingSupport(r.support,grounding);}}
 return freezeSnapshot(value) as WorldOntologyV1;
}
