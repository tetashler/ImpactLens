import {entityDeclarationFixture} from '../../../scripts/testing/entity-declaration-fixture.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGeneratedDraft,createDynamicPlanner} from '../../server/inference/planner.ts';
import {createDynamicPlan,parseDynamicPlan} from '../../dynamic-scenarios/plan.ts';
import {plannerFixture} from './helpers/planner-fixture.ts';
import {handleDynamicRequest} from '../../server/inference/dynamic-service.ts';
import {validateDynamicResponse} from '../../dynamic-scenarios/response.ts';
import {MODEL} from '../../server/inference/deepseek.ts';
import {worldDraftSchema} from '../../dynamic-scenarios/schema.ts';
import {parsePlannerDiagnostic,plannerDiagnostic} from '../../dynamic-scenarios/diagnostics.ts';

const cases:[string,(d:any)=>void,string,string][]=[
 ['missing field',d=>delete d.description,'plan.required_field','draft.description'],
 ['wrong type',d=>d.agents='private-marker','plan.invalid_field_type','draft.agents'],
 ['non-coercible entity name',d=>d.ontology.entities[0].name={toString:'private-marker'},'plan.invalid_field_type','draft.ontology.entities[0].name'],
 ['entity type reference',d=>d.ontology.entities[0].typeId='private-marker','ontology.entity_type_unknown','draft.ontology.entities[0].typeId'],
 ['relationship type reference',d=>d.ontology.relationships[0].typeId='private-marker','ontology.relationship_type_unknown','draft.ontology.relationships[0].typeId'],
 ['duplicate entity',d=>d.ontology.entities.push(d.ontology.entities[0]),'ontology.entity_id_duplicate','draft.ontology.entities[1].id'],
 ['duplicate type',d=>d.ontology.entityTypes.push(d.ontology.entityTypes[0]),'ontology.entity_type_duplicate','draft.ontology.entityTypes[1].id'],
 ['duplicate type name case',d=>d.ontology.entityTypes.push({...d.ontology.entityTypes[0],id:'another-type',name:d.ontology.entityTypes[0].name.toUpperCase()}),'ontology.entity_type_duplicate','draft.ontology.entityTypes[1].name'],
 ['duplicate relationship type',d=>d.ontology.relationshipTypes.push(d.ontology.relationshipTypes[0]),'ontology.relationship_type_duplicate','draft.ontology.relationshipTypes[1].id'],
 ['unknown endpoint',d=>d.ontology.relationships[0].target='private-marker','ontology.relationship_endpoint_unknown','draft.ontology.relationships[0].target'],
 ['wrong slot',d=>d.agents[0].id='private-marker','agent.role_slot_invalid','draft.agents[0].id'],
 ['missing slot',d=>d.agents.pop(),'agent.role_slot_missing','draft.agents'],
 ['duplicate slot',d=>d.agents[3].id=d.agents[0].id,'agent.role_slot_duplicate','draft.agents[3].id'],
 ['invalid cross reference',d=>d.agents[0].entityIds=['private-marker'],'agent.cross_reference_invalid','draft.agents[0].entityIds[0]'],
 ['invalid source',d=>d.ontology.entities[0].support.sourceId='private-marker','ontology.source_reference_unknown','draft.ontology.entities[0].support.sourceId'],
 ['invalid passage',d=>d.ontology.entities[0].support.passageId='private-marker','ontology.source_passage_unknown','draft.ontology.entities[0].support.passageId'],
 ['quote missing',d=>d.ontology.entities[0].support.quote='private-marker','ontology.source_quote_not_found','draft.ontology.entities[0].support.quote'],
 ['entity bound',d=>d.ontology.entities=Array.from({length:25},()=>d.ontology.entities[0]),'ontology.entity_count_exceeded','draft.ontology.entities'],
 ['relationship bound',d=>d.ontology.relationships=Array.from({length:49},()=>d.ontology.relationships[0]),'ontology.relationship_count_exceeded','draft.ontology.relationships'],
 ['unexpected verification',d=>d.ontology.entities[0].verified=true,'plan.unexpected_property','draft.ontology.entities[0]'],
 ['ontology version',d=>d.ontology.version=2,'ontology.unsupported_version','draft.ontology.version'],
 ['null context array',d=>d.agents=null,'plan.invalid_field_type','draft.agents'],
 ['duplicate phrases',d=>d.domains=['Employment','Employment'],'plan.duplicate_value','draft.domains[1]'],
 ['numeric claim',d=>d.ontology.relationships[0].statement='GDP rises 20%','plan.unsupported_numeric_claim','draft.ontology.relationships[0].statement'],
 ['disconnected participants',d=>{d.relationships=d.relationships.map((r:any,i:number)=>({...r,sourceAgentId:i%2?'agent-3':'agent-1',targetAgentId:i%2?'agent-4':'agent-2'}));},'agent.interaction_structure_invalid','draft.relationships'],
];
for(const [name,mutate,rule,path]of cases)test(`planner diagnostic: ${name}`,()=>{
 const f=plannerFixture(),draft=structuredClone(f.draft);mutate(draft);
 assert.throws(()=>parseGeneratedDraft(draft,f.request,f.grounding),(e:any)=>{assert.equal(e.diagnostic?.rule,rule);assert.equal(e.diagnostic?.path,path);assert.ok(!JSON.stringify(e.diagnostic).includes('private-marker'));return true;});
});
test('minimal grounded v2 fixture preserves provenance and archive validation',async()=>{
 const f=plannerFixture();parseGeneratedDraft(f.draft,f.request,f.grounding);const p=await createDynamicPlan(f.request,f.draft,f.grounding);assert.equal(p.version,2);assert.equal(parseDynamicPlan(p).planId,p.planId);assert.equal(p.draft.entities[0].status,'unverified-model-suggestion');
 assert.throws(()=>parseDynamicPlan({...p,version:3}),(e:any)=>e.diagnostic?.rule==='plan.unsupported_version'&&e.diagnostic.path==='plan.version');
});
const entityWire=entityDeclarationFixture;
const completion=(content:string)=>Response.json({model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content}}],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20,cost:0.001}});
test('planner failure envelope retains safe validation and retrieval diagnostics through the real route',async()=>{
 const f=plannerFixture(),d=structuredClone(f.draft);d.ontology!.entities[0].typeId='private-marker';d.ontology!.entities[0].support=null;
 const wire={version:1 as const,attemptId:`diagnostic-${crypto.randomUUID()}`,request:f.request};let calls=0;
 const response=await handleDynamicRequest(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(wire)}),{enabled:true,key:'mock-only',groundingKey:'mock-only',groundingFetcher:async()=>Response.json({results:[{title:'Private excerpt title',url:'https://www.mom.gov.sg/',content:'private-source-content'}]}),fetcher:async()=>{calls++;return completion(JSON.stringify(entityWire(d)));}});
 const body:any=await validateDynamicResponse(await response.json(),wire);assert.equal(calls,1);assert.equal(body.error.code,'AI_PLAN_INVALID');assert.equal(body.error.validation.rule,'plan.unexpected_property');assert.equal(body.error.validation.path,'draft.ontology.entityTypes[0].entities[0]');assert.deepEqual(body.error.validation,body.planning.record.plannerValidation);
 assert.equal(body.retrieval.status,'retrieved');assert.equal(body.retrieval.sourceCount,1);assert.equal(body.retrieval.credits,null);assert.equal(body.retrieval.searches,1);assert.match(body.retrieval.bundleId,/^g1_/);assert.ok(body.retrieval.durationMs>=0);
 for(const secret of ['private-marker','private-source-content','Private excerpt title','mock-only',f.request.question])assert.ok(!JSON.stringify(body).includes(secret));
});
test('malformed JSON has a planner JSON diagnostic instead of a schema diagnostic',async()=>{
 const f=plannerFixture(),p=createDynamicPlanner({key:'mock-only',fetcher:async()=>completion('{private-marker')},f.grounding);
 await assert.rejects(p.generate(f.request));assert.equal((p.records[0] as any).plannerValidation?.rule,'plan.invalid_json');
});

function post(f=plannerFixture()){
 const wire={version:1 as const,attemptId:`planner-audit-${crypto.randomUUID()}`,request:f.request};
 return {wire,request:new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(wire)})};
}
function research(f=plannerFixture()):typeof fetch{return async()=>Response.json({results:f.grounding.sources.map(s=>({title:s.title,url:s.url,content:s.passages[0].text}))});}

for(const [name,mutate,rule,path]of cases)test(`full failure propagation: ${name}`,async()=>{
 const f=plannerFixture(),d=structuredClone(f.draft);mutate(d);for(const entity of d.ontology!.entities){if(entity.support&&name!=='quote missing'){const {sourceId,passageId}=entity.support;entity.support={sourceId,passageId} as any;}}const {request,wire}=post(f);let calls=0;
 const response=await handleDynamicRequest(request,{enabled:true,key:'mock-only',groundingKey:'mock-only',groundingFetcher:research(f),fetcher:async()=>{calls++;return completion(JSON.stringify(entityWire(d)));}});
 assert.equal(response.status,502);const b=await validateDynamicResponse(await response.json(),wire);assert.equal(b.kind,'planning-failed');if(b.kind!=='planning-failed')assert.fail('Invalid draft must not execute');
 assert.equal(calls,1);assert.equal(b.accounting.actionCalls,0);const changed:Record<string,[string,string]>={'unexpected verification':['plan.unexpected_property','draft.ontology.entityTypes[0].entities[0]'],'entity type reference':['plan.unexpected_property','draft.ontology.entityTypes[0].entities[0]'],'duplicate entity':['ontology.entity_duplicate','draft.ontology.entities[1]'],'duplicate type':['ontology.entity_type_duplicate','draft.ontology.entityTypes[1].name'],'duplicate relationship type':['ontology.relationship_type_duplicate','draft.ontology.relationshipTypes[1].name'],'entity bound':['ontology.entity_count_exceeded','draft.ontology.entityTypes[0].entities']};const expected=changed[name]??[name==='quote missing'?'plan.unexpected_property':rule,name==='quote missing'?'draft.ontology.entities[0].support':path];assert.equal(b.error.validation?.rule,expected[0]);assert.equal(b.error.validation?.path,expected[1]);assert.equal(b.planning.record?.errorCode,'AI_PLAN_INVALID');assert.deepEqual(b.planning.record?.plannerValidation,b.error.validation);
 for(const secret of ['private-marker',f.grounding.sources[0].passages[0].text,f.request.question,'mock-only'])assert.ok(!JSON.stringify(b).includes(secret));
});

test('provider schema and prompt express the runtime uniqueness and registry requirements',async()=>{
 assert.equal((worldDraftSchema.properties.domains as any).uniqueItems,true);
 assert.equal((worldDraftSchema.properties.agents as any).items.properties.goals.uniqueItems,true);
 const f=plannerFixture();let instruction='';const p=createDynamicPlanner({key:'mock-only',fetcher:async(_u,i)=>{instruction=JSON.parse(String(i?.body)).messages[0].content;return completion(JSON.stringify(f.draft));}},f.grounding);await p.generate(f.request);
 for(const constraint of ['unique ignoring case','one connected network','top-level entities[].id','ontology.entities[].id','support:null','exact case-sensitive substring'])assert.ok(instruction.includes(constraint));
});

test('provider mismatch and planning timeout never masquerade as validation failures',async()=>{
 for(const kind of ['identity','timeout'] as const){
  const f=plannerFixture(),{request,wire}=post(f);
  const response=await handleDynamicRequest(request,{enabled:true,key:'mock-only',groundingKey:'',plannerTimeoutMs:5,fetcher:async()=>kind==='timeout'?new Promise<Response>(()=>{}):Response.json({model:MODEL,provider:'Other',choices:[],usage:{}})});
  const b=await validateDynamicResponse(await response.json(),wire);assert.equal(b.kind,'planning-failed');if(b.kind!=='planning-failed')assert.fail('Expected failure');
  assert.equal(b.error.code,kind==='identity'?'AI_PROVIDER_IDENTITY':'AI_TIMEOUT');assert.equal(b.error.validation,undefined);assert.equal(b.planning.record?.plannerValidation,undefined);assert.equal(b.retrieval?.status,'not-configured');
 }
});

test('Tavily expiry metadata survives invalid planning with unknown credit usage',async()=>{
 const {request,wire}=post();const response=await handleDynamicRequest(request,{enabled:true,key:'mock-only',groundingKey:'mock-only',groundingTimeoutMs:5,groundingFetcher:async()=>new Promise<Response>(()=>{}),fetcher:async()=>completion('not JSON')});
 const b=await validateDynamicResponse(await response.json(),wire);assert.equal(b.kind,'planning-failed');if(b.kind!=='planning-failed')assert.fail('Expected failure');
 assert.equal(b.retrieval?.status,'failed');assert.equal(b.retrieval?.limitation,'timeout');assert.equal(b.retrieval?.sourceCount,0);assert.equal(b.retrieval?.credits,null);assert.equal(b.error.validation?.rule,'plan.invalid_json');
});

test('unsafe objects and forged diagnostic strings are rejected without invoking accessors',()=>{
 const f=plannerFixture(),d=structuredClone(f.draft);let invoked=false;Object.defineProperty(d,'description',{get(){invoked=true;return 'private-marker';},enumerable:true});
 assert.throws(()=>parseGeneratedDraft(d,f.request,f.grounding),(e:any)=>e.diagnostic.rule==='plan.invalid_data');assert.equal(invoked,false);
 const valid=plannerDiagnostic('ontology.entity_type_unknown','draft.ontology.entities[0].typeId');assert.deepEqual(parsePlannerDiagnostic(valid),valid);
 for(const bad of [{...valid,rule:'private-marker'},{...valid,path:'draft.privateMarker'},{...valid,expected:'private-marker'},{...valid,extra:'private-marker'}])assert.throws(()=>parsePlannerDiagnostic(bad));
});

test('legacy plans keep their identity and unrecognised provider verification fields stay rejected',async()=>{
 const {dynamicFixtures}=await import('../../dynamic-scenarios/fixtures.ts');const f=dynamicFixtures()[0],p=await createDynamicPlan(f.request,f.draft);assert.equal(p.version,1);assert.equal(parseDynamicPlan(p).planId,p.planId);
 const modern=plannerFixture(),d=structuredClone(modern.draft) as any;d.verified=true;assert.throws(()=>parseGeneratedDraft(d,modern.request,modern.grounding),(e:any)=>e.diagnostic.rule==='plan.unexpected_property'&&e.diagnostic.path==='draft');
});

test('invalid completion envelopes retain a safe planner completion diagnostic',async()=>{
 for(const fetcher of [async()=>Response.json({model:MODEL,provider:'DigitalOcean',usage:{},choices:[]}),async()=>new Response('private-provider-body')]){
  const f=plannerFixture(),p=createDynamicPlanner({key:'mock-only',fetcher},f.grounding);
  await assert.rejects(p.generate(f.request),(e:any)=>e.plannerValidation?.rule==='plan.response_envelope');
  assert.equal(p.records[0].plannerValidation?.stage,'completion');assert.ok(!JSON.stringify(p.records).includes('private-provider-body'));
 }
});
test('shape/semantic errors inside the ontology identify the ontology stage',()=>{
 const d=plannerDiagnostic('plan.unsupported_numeric_claim','draft.ontology.relationships[0].statement');assert.equal(d.stage,'ontology');
});
