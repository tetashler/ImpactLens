import {checkPlan,planObject,planList} from '../../dynamic-scenarios/diagnostics.ts';
/** Only the new stage-one wire format. Instance ownership replaces model-written type references. */
export function nestEntitySchema(base:unknown):any {
 const schema=structuredClone(base) as any,o=schema.properties.ontology,entity=structuredClone(o.properties.entities.items);delete schema.properties.unsupportedQuantities;schema.required=schema.required.filter((k:string)=>k!=='unsupportedQuantities');
 delete entity.properties.id;delete entity.properties.typeId;entity.required=entity.required.filter((k:string)=>!['id','typeId'].includes(k));
 const type=o.properties.entityTypes.items;delete type.properties.id;type.properties.entities={type:'array',minItems:0,maxItems:24,items:entity};type.required=['name','description','entities'];
 const relationshipType=o.properties.relationshipTypes.items;delete relationshipType.properties.id;relationshipType.required=['name','description'];
 o.properties.entityTypes.maxItems=4;type.properties.entities.maxItems=4;o.properties.relationshipTypes.maxItems=6;for(const t of [type,relationshipType])t.properties.description.maxLength=120;schema.properties.relationships.maxItems=4;schema.properties.assumptions.maxItems=3;schema.properties.uncertainties.maxItems=4;schema.properties.domains.maxItems=4;schema.properties.description.maxLength=300;schema.properties.trigger.maxLength=220;schema.properties.progression.maxLength=160;const role=schema.properties.agents.items.properties;role.context.maxLength=160;for(const key of ['goals','incentives','concerns','knowledgeLimits']){role[key].maxItems=1;role[key].items.maxLength=120;}delete o.properties.entities;o.required=o.required.filter((k:string)=>k!=='entities');
 return schema;
}
export function expandEntityDeclarations(value:unknown):unknown {
 const d=value as Record<string,unknown>;if(!d||typeof d!=='object'||Array.isArray(d))return value;
 const o=planObject(d.ontology,['version','entityTypes','relationshipTypes','relationships'],'draft.ontology');
 const entities:Record<string,unknown>[]=[],types=planList(o.entityTypes,16,'draft.ontology.entityTypes','ontology.type_count_exceeded').map((v,i)=>{
  const path=`draft.ontology.entityTypes[${i}]`,t=planObject(v,['name','description','entities'],path),id='declared-type-'+(i+1);
  for(const [j,entry]of planList(t.entities,24,path+'.entities','ontology.entity_count_exceeded').entries()){
   const e=planObject(entry,['name','jurisdictionId','support','communication'],`${path}.entities[${j}]`,['name','jurisdictionId','support','communication']);
   entities.push({id:'declared-entity-'+(entities.length+1),typeId:id,...e});
  }
  return {id,name:t.name,description:t.description};
 });
 checkPlan(entities.length<=24,'ontology.entity_count_exceeded','draft.ontology.entities',entities);
 const relationshipTypes=planList(o.relationshipTypes,16,'draft.ontology.relationshipTypes','ontology.type_count_exceeded').map((v,i)=>({id:'declared-relationship-type-'+(i+1),...planObject(v,['name','description'],`draft.ontology.relationshipTypes[${i}]`)}));
 return {...d,ontology:{version:o.version,entityTypes:types,relationshipTypes,entities,relationships:o.relationships}};
}
