import type {DynamicDraft} from '../../dynamic-scenarios/plan.ts';
import {checkPlan} from '../../dynamic-scenarios/diagnostics.ts';

const services=[['WhatsApp','private-group'],['Telegram','private-group'],['Instagram','public-feed'],['Reddit','public-discussion']] as const;
export const NAMED_COMMUNICATION_PROMPT=' When declaring a communication service, select a relevant supported service by its exact name: WhatsApp or Telegram for private group messaging, Instagram for a public feed, or Reddit for public discussion. Never use vague service names such as Messaging app, Social media platform or Local transport forum. These are hypothetical scenario choices, not evidence of actual service use or accounts. Use support:null unless supplied source evidence explicitly supports the named association. Omit services when irrelevant; do not include all services merely to fill the graph.';

/** New generation only: supported service names are choices, not observed platform activity. */
export function namedCommunicationSchema(schema:any):any {
 const item=schema.properties.ontology.properties.entityTypes.items.properties.entities.items;
 const communication=item.properties.communication.anyOf.find((branch:any)=>branch.type==='object');
 const ordinary=structuredClone(item);ordinary.properties.communication={type:'null'};
 item.anyOf=[ordinary,...services.map(([name,style])=>{
  const branch=structuredClone(ordinary);branch.properties.name={...branch.properties.name,enum:[name]};
  branch.properties.communication=structuredClone(communication);branch.properties.communication.properties.style.enum=[style];return branch;
 })];
 if(schema.anyOf)for(const branch of schema.anyOf)namedCommunicationSchema(branch);
 return schema;
}

/** Reject placeholder service names on new entity output; archived drafts remain untouched. */
export function requireNamedCommunicationServices(draft:DynamicDraft):void {
 for(const [index,entity] of (draft.ontology?.entities??[]).entries()){
  if(!entity.communication)continue;
  const generic=/^(?:messaging\s*(?:app|application|platform|service)|social\s*media(?:\s*(?:app|platform|service))?|communication\s*(?:app|platform|service|environment)|(?:local\s*transport|discussion|online)\s*forum)$/i;
  checkPlan(!generic.test(entity.name.trim()),'plan.invalid_value',`draft.ontology.entities[${index}].name`);
 }
}
