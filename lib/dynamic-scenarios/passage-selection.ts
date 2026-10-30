/** Generation selects registered passages; the application, never model prose, supplies literal text. */
import {checkPlan,planObject} from './diagnostics.ts';
import type {GroundingBundle} from '../grounding/contract.ts';
import {parseGroundingSupport} from '../grounding/contract.ts';
export function passageSelectionSchema(grounding?:GroundingBundle){return {anyOf:[{type:'null'},...(grounding?.sources.flatMap(s=>s.passages.map(p=>({type:'object',additionalProperties:false,required:['sourceId','passageId'],properties:{sourceId:{type:'string',enum:[s.id]},passageId:{type:'string',enum:[p.id]}}})))??[])]};}
export function resolvePassageSelection(value:unknown,grounding:GroundingBundle|undefined,path:string){
 if(value===null)return null;
 const support=planObject(value,['sourceId','passageId'],path),source=grounding?.sources.find(s=>s.id===support.sourceId);
 checkPlan(source&&grounding,'ontology.source_reference_unknown',`${path}.sourceId`,support.sourceId);
 const passage=source.passages.find(p=>p.id===support.passageId);checkPlan(passage,'ontology.source_passage_unknown',`${path}.passageId`,support.passageId);
 return parseGroundingSupport({sourceId:source.id,passageId:passage.id,quote:passage.text},grounding,path);
}
export function expandEntitySelections(value:unknown,grounding?:GroundingBundle):unknown{
 // Only traverse known arrays. Authoritative draft validation still owns all other shapes.
 const d=value as any;if(!d||typeof d!=='object'||!d.ontology||!Array.isArray(d.ontology.entities))return value;
 return {...d,ontology:{...d.ontology,entities:d.ontology.entities.map((e:any,i:number)=>e&&typeof e==='object'?{...e,support:resolvePassageSelection(e.support,grounding,`draft.ontology.entities[${i}].support`)}:e)}};
}
export function expandRelationshipSelections(value:unknown,grounding?:GroundingBundle):unknown{
 const d=value as any;if(!d||typeof d!=='object'||!Array.isArray(d.relationships))return value;
 return {...d,relationships:d.relationships.map((e:any,i:number)=>e&&typeof e==='object'?{...e,support:resolvePassageSelection(e.support,grounding,`draft.ontology.relationships[${i}].support`)}:e)};
}
