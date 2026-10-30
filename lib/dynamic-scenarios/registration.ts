/** Application-owned identities. Original declarations are validated before exact remapping. */
import {checkPlan,planId,planList,planObject,planUnique} from './diagnostics.ts';
import type {DynamicDraft} from './plan.ts';
import {freezeSnapshot} from '../experiments/validation.ts';
export const REGISTRIES=['jurisdictions','entities','entityTypes','relationshipTypes','worldEntities'] as const;
export type RegistryName=typeof REGISTRIES[number];
export interface PlannerRegistration {version:1;mode:'registered-stages';supportPolicy?:'retrieved-passage-selection-v1';registries:Record<RegistryName,{original:string;canonical:string}[]>}
const prefixes:Record<RegistryName,string>={jurisdictions:'jurisdiction',entities:'context',entityTypes:'entity-type',relationshipTypes:'relationship-type',worldEntities:'entity'};
function declarations(d:DynamicDraft){return {jurisdictions:d.jurisdictions,entities:d.entities,entityTypes:d.ontology!.entityTypes,relationshipTypes:d.ontology!.relationshipTypes,worldEntities:d.ontology!.entities};}
export function registerDraft(draft:DynamicDraft,supportPolicy?:'retrieved-passage-selection-v1'):{draft:DynamicDraft;registration:PlannerRegistration}{
 checkPlan(draft.ontology&&draft.ontology.relationships.length===0,'plan.invalid_value','draft.ontology.relationships');
 const lists=declarations(draft),registries={} as PlannerRegistration['registries'];
 for(const key of REGISTRIES)registries[key]=lists[key].map((v,i)=>({original:v.id,canonical:`${prefixes[key]}-${String(i+1).padStart(3,'0')}`}));
 const remap=(key:RegistryName,id:string)=>{const found=registries[key].find(v=>v.original===id);checkPlan(found,'agent.cross_reference_invalid','draft');return found.canonical;};
 const jurisdiction=(id:string|null)=>id===null?null:remap('jurisdictions',id);
 const d=structuredClone(draft);
 d.jurisdictions=d.jurisdictions.map(j=>({...j,id:remap('jurisdictions',j.id)}));
 d.entities=d.entities.map(e=>({...e,id:remap('entities',e.id),jurisdictionId:jurisdiction(e.jurisdictionId)}));
 d.agents=d.agents.map(a=>({...a,jurisdictionId:jurisdiction(a.jurisdictionId),entityIds:a.entityIds.map(id=>remap('entities',id))}));
 d.ontology!.entityTypes=d.ontology!.entityTypes.map(t=>({...t,id:remap('entityTypes',t.id)}));
 d.ontology!.relationshipTypes=d.ontology!.relationshipTypes.map(t=>({...t,id:remap('relationshipTypes',t.id)}));
 d.ontology!.entities=d.ontology!.entities.map(e=>({...e,id:remap('worldEntities',e.id),typeId:remap('entityTypes',e.typeId),jurisdictionId:jurisdiction(e.jurisdictionId)}));
 return freezeSnapshot({draft:d,registration:{version:1,mode:'registered-stages',...(supportPolicy?{supportPolicy}:{}),registries}});
}
export function parseRegistration(value:unknown,draft:DynamicDraft):PlannerRegistration{
 const path='plan.registration',r=planObject(value,['version','mode','registries','supportPolicy'],path,['version','mode','registries']);checkPlan(r.version===1&&r.mode==='registered-stages'&&draft.ontology,'plan.invalid_value',path,value);
 if(r.supportPolicy!==undefined)checkPlan(r.supportPolicy==='retrieved-passage-selection-v1','plan.invalid_value',`${path}.supportPolicy`,r.supportPolicy);
 const registries=planObject(r.registries,REGISTRIES,`${path}.registries`),lists=declarations(draft);
 for(const key of REGISTRIES){const p=`${path}.registries.${key}`,list=planList(registries[key],24,p);checkPlan(list.length===lists[key].length,'plan.identity_mismatch',p);
  const originals:string[]=[];list.forEach((v,i)=>{const m=planObject(v,['original','canonical'],`${p}[${i}]`);originals.push(planId(m.original,`${p}[${i}].original`));checkPlan(m.canonical===`${prefixes[key]}-${String(i+1).padStart(3,'0')}`&&m.canonical===lists[key][i].id,'plan.identity_mismatch',`${p}[${i}].canonical`);});planUnique(originals,p);
 }
 return freezeSnapshot(value) as PlannerRegistration;
}
