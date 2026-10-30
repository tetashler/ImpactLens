import {stakeholderProviderFixture} from '../../../../scripts/testing/stakeholder-decision-fixture.ts';
import {entityDeclarationFixture,entityDeclarationOrder} from '../../../../scripts/testing/entity-declaration-fixture.ts';
import assert from 'node:assert/strict';
import {worldFixtures as dynamicFixtures} from '../../../world-graph/fixtures.ts';
import {registerDraft} from '../../../dynamic-scenarios/registration.ts';
import {MODEL} from '../../../server/inference/deepseek.ts';
function mocked(f:ReturnType<typeof dynamicFixtures>[number],mutate?:(body:any,reply:any)=>void){let calls=0,plans=0;const fetcher:typeof fetch=async(url,init)=>{
 assert.equal(String(url),'https://openrouter.ai/api/v1/chat/completions');const b=JSON.parse(String(init?.body));calls++;
 assert.equal(b.model,MODEL);assert.deepEqual(b.provider,{only:['digitalocean'],allow_fallbacks:false,require_parameters:true});assert.deepEqual(b.reasoning,{effort:'none',exclude:true});
 const name=b.response_format.json_schema.name,planning=name.startsWith('dynamic_');if(planning)plans++;
 const c=JSON.parse(b.messages[1].content),other=[...(c.previousEvents??[])].reverse().find((e:any)=>e.roleId!==c.role?.id);
 const entityDraft=structuredClone(f.draft);entityDraft.ontology.relationships=[];entityDraft.entities=[];entityDraft.agents.forEach(a=>a.entityIds=[]);
 const registered=registerDraft(entityDeclarationOrder(entityDraft));const map=(id:string)=>registered.registration.registries.worldEntities.find(m=>m.original===id)?.canonical??id;
 let action:any=planning?(name==='dynamic_relationships_v2'?{relationships:f.draft.ontology.relationships.map(r=>({...r,source:map(r.source),target:map(r.target),typeId:registered.registration.registries.relationshipTypes.find(t=>t.original===r.typeId)!.canonical}))}:name==='dynamic_entities_v2'?entityDraft:f.draft):{type:other?'response':'argument',addressedRoleId:other?.roleId??null,statement:`A separately mocked action for ${c.role.title}; conditions remain unresolved.`,previousEventIds:other?[other.id]:[],evidenceFindingIds:[],assumptionIds:[],reasoningSummary:'This mock reacts to supplied recorded context, without forecasting.',uncertainties:['Real-world outcomes are unknown.'],position:c.memory.position??'information-seeking',topics:['policy-conditions']};
 if(planning&&name!=='dynamic_scenario_v2'){for(const e of (name==='dynamic_entities_v2'?(action as any).ontology.entities:(action as any).relationships))if(e.support){const {sourceId,passageId}=e.support;e.support={sourceId,passageId};}}
 if(name==='dynamic_entities_v2')action=entityDeclarationFixture(action);else if(name==='dynamic_relationships_v2')action.relationships=action.relationships.map(({id,...r}:any)=>r);
 if(!planning)action=stakeholderProviderFixture(c,action);
 const reply={id:`mock-${calls}`,model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(action)}}],usage:{prompt_tokens:planning?500:100,completion_tokens:planning?1000:50,total_tokens:planning?1500:150,cost:planning?0.001:0.0001}};mutate?.(b,reply);return Response.json(reply);
 };return {fetcher,counts:()=>({calls,plans})};}
export const mockDynamicProvider=mocked;
