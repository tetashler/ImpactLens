import {checkPlan,planObject} from '../../dynamic-scenarios/diagnostics.ts';
/** New wire declarations omit IDs which no other generated record can reference.
 * Identity is assigned by declaration order, then frozen/hash-bound in the normal plan.
 * This is not a repair path for archived records or duplicate model identifiers. */
export function assignPlannerRecordIds(value:unknown,stage:'entities'|'relationships'):unknown {
 const d=value as Record<string,unknown>;if(!d||typeof d!=='object'||Array.isArray(d))return value;
 const assign=(field:string,fields:string[],prefix:string,max:number,path:string)=>{
  const rows=d[field];checkPlan(Array.isArray(rows),'plan.invalid_field_type',path,rows);checkPlan(rows.length<=max,'plan.collection_limit',path,rows);
  return rows.map((v,i)=>({id:prefix+(i+1),...planObject(v,fields,`${path}[${i}]`)}));
 };
 if(stage==='entities'){checkPlan(!Object.hasOwn(d,'unsupportedQuantities'),'plan.unexpected_property','draft.unsupportedQuantities',d.unsupportedQuantities);return {...d,unsupportedQuantities:['Quantitative impacts require separately validated numerical models and confirmed inputs.'],relationships:assign('relationships',['sourceAgentId','targetAgentId','opportunity'],'opportunity-',8,'draft.relationships'),assumptions:assign('assumptions',['text'],'assumption-',6,'draft.assumptions')};}
 return {...d,relationships:assign('relationships',['source','target','typeId','statement','support'],'world-relationship-',24,'draft.ontology.relationships')};
}
