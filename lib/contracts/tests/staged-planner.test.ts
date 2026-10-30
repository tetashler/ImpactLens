import {entityDeclarationFixture} from '../../../scripts/testing/entity-declaration-fixture.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {plannerFixture} from './helpers/planner-fixture.ts';
import {createEntityPlanner,parseGeneratedDraft,parseRelationshipStage,relationshipStageSchema} from '../../server/inference/planner.ts';
import {registerDraft} from '../../dynamic-scenarios/registration.ts';
import {createDynamicPlan,validateDynamicPlan} from '../../dynamic-scenarios/plan.ts';
import {handleDynamicRequest} from '../../server/inference/dynamic-service.ts';
import {validateDynamicResponse} from '../../dynamic-scenarios/response.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';
function registered(){const f=plannerFixture();f.draft.ontology.relationships=[];return {...f,...registerDraft(parseGeneratedDraft(f.draft,f.request,f.grounding))};}
test('new entity generation eliminates the ambiguous legacy entity-reference registry; archives retain it',async()=>{
 const f=plannerFixture();f.draft.ontology.relationships=[];f.draft.entities=[];f.draft.agents.forEach(a=>a.entityIds=[]);let schema:any;
 const planner=createEntityPlanner({key:'mock',fetcher:async(_u,i)=>{schema=JSON.parse(String(i?.body)).response_format.json_schema.schema;return Response.json({model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(entityDeclarationFixture({...f.draft,relationships:f.draft.relationships.map(({id,...r})=>r),assumptions:f.draft.assumptions.map(({id,...a})=>a),ontology:{...f.draft.ontology,entities:f.draft.ontology.entities.map(e=>({...e,support:e.support?{sourceId:e.support.sourceId,passageId:e.support.passageId}:null}))}}))}}]});}},f.grounding);
 await planner.generate(f.request);assert.equal(schema.properties.entities.maxItems,0);assert.equal(schema.properties.agents.items.properties.entityIds.maxItems,0);assert.equal(schema.properties.ontology.properties.entityTypes.items.properties.entities.maxItems,4);
 f.draft.agents[2].entityIds=['institution-a'];assert.throws(()=>parseGeneratedDraft(f.draft,f.request,f.grounding),(e:any)=>e.diagnostic.rule==='agent.cross_reference_invalid'&&e.diagnostic.path==='draft.agents[2].entityIds[0]');
});
test('staged registration deterministically maps namespaces and keeps source references exact',async()=>{
 const f=registered();assert.equal(f.draft.ontology!.entities[0].id,'entity-001');assert.equal(f.draft.ontology!.entities[0].typeId,'entity-type-001');assert.deepEqual(f.draft.ontology!.entities[0].support,plannerFixture().draft.ontology.entities[0].support);
 const p=await createDynamicPlan(f.request,f.draft,f.grounding,undefined,f.registration);assert.deepEqual(await validateDynamicPlan(p),p);assert.equal(p.registration?.registries.worldEntities[0].original,'institution-a');
 const changed=structuredClone(p);changed.registration!.registries.worldEntities[0].original='another-declaration';await assert.rejects(()=>validateDynamicPlan(changed));
});
test('relationship schema enumerates only registered instances and types, never other namespaces',()=>{
 const f=registered(),s=relationshipStageSchema(f.draft);assert.deepEqual(s.properties.relationships.items.properties.source.enum,['entity-001','agent-1','agent-2','agent-3','agent-4']);assert.deepEqual(s.properties.relationships.items.properties.typeId.enum,['relationship-type-001']);
});
for(const endpoint of ['missing-entity','agent-5','Public institution','entity-type-001','relationship-type-001','jurisdiction-001','s-not-an-entity'])test(`stage two rejects undeclared endpoint namespace: ${endpoint}`,()=>{
 const f=registered();assert.throws(()=>parseRelationshipStage({relationships:[{id:'r',source:endpoint,target:'agent-1',typeId:'relationship-type-001',statement:'A proposed discussion.',support:null}]},f.draft,f.request,f.grounding),(e:any)=>e.diagnostic?.rule==='ontology.relationship_endpoint_unknown'&&e.diagnostic.path==='draft.ontology.relationships[0].source');
});
test('registered stage accepts declared cross-entity relationships and optional empty enrichment',()=>{
 const f=registered(),d=parseRelationshipStage({relationships:[{id:'r',source:'entity-001',target:'agent-1',typeId:'relationship-type-001',statement:'A proposed discussion.',support:null}]},f.draft,f.request,f.grounding);assert.equal(d.ontology!.relationships.length,1);assert.equal(parseRelationshipStage({relationships:[]},f.draft,f.request,f.grounding).ontology!.relationships.length,0);
});
test('registration never repairs duplicate declarations or invalid required agent opportunities',()=>{
 const f=plannerFixture();f.draft.ontology.entities.push(structuredClone(f.draft.ontology.entities[0]));assert.throws(()=>parseGeneratedDraft(f.draft,f.request,f.grounding),(e:any)=>e.diagnostic?.rule==='ontology.entity_id_duplicate');
 const g=plannerFixture();g.draft.relationships=[];assert.throws(()=>parseGeneratedDraft(g.draft,g.request,g.grounding),(e:any)=>e.diagnostic?.rule==='agent.interaction_structure_invalid');
});
for(const kind of ['endpoint','source','identity','cancel'] as const)test(`stage two ${kind} failure preserves two real call records and starts no actions`,async()=>{
 const f=plannerFixture(),mock=mockDynamicProvider(f,(b,r)=>{if(b.response_format.json_schema.name==='dynamic_relationships_v2'){
  if(kind==='identity')r.provider='other-provider';
  else if(kind==='endpoint'){const d=JSON.parse(r.choices[0].message.content);d.relationships[0].source='source-not-instance';r.choices[0].message.content=JSON.stringify(d);}
  else if(kind==='source'){const d=JSON.parse(r.choices[0].message.content);d.relationships[0].support={sourceId:'unknown-source',passageId:'unknown-passage'};r.choices[0].message.content=JSON.stringify(d);}
 }}),wire={version:1 as const,attemptId:`staged-${crypto.randomUUID()}`,request:f.request},abort=new AbortController();
 const response=await handleDynamicRequest(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(wire),signal:abort.signal}),{enabled:true,key:'mock',groundingKey:'mock',groundingFetcher:async()=>Response.json({results:f.grounding.sources.map(s=>({title:s.title,url:s.url,content:s.passages[0].text}))}),fetcher:async(u,i)=>{if(kind==='cancel'&&JSON.parse(String(i?.body)).response_format.json_schema.name==='dynamic_relationships_v2'){abort.abort();throw new DOMException('Cancelled','AbortError');}return mock.fetcher(u,i);}});
 const result=await validateDynamicResponse(await response.json(),wire);assert.equal(result.kind,'planning-failed');if(result.kind!=='planning-failed')assert.fail();assert.equal(result.accounting.planningCalls,2);assert.equal(result.accounting.actionCalls,0);assert.equal(result.planning.records![0].status,'accepted');assert.equal(result.planning.records![1].status,'failed');
 assert.equal(result.error.code,kind==='identity'?'AI_PROVIDER_IDENTITY':kind==='cancel'?'AI_CANCELLED':'AI_PLAN_INVALID');
 if(kind==='endpoint')assert.equal(result.error.validation!.rule,'ontology.relationship_endpoint_unknown');
 if(kind==='source')assert.equal(result.error.validation!.rule,'ontology.source_reference_unknown');
 if(kind==='cancel')assert.equal(result.accounting.costUsd,null);
});
