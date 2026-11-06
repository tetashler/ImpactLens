import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntityPlanner,createRelationshipPlanner,parseGeneratedDraft,parseRelationshipStage,relationshipStageSchema} from '../../server/inference/planner.ts';
import {registerDraft} from '../../dynamic-scenarios/registration.ts';
import {plannerFixture} from './helpers/planner-fixture.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';

function candidate(){
 const f=plannerFixture();
 f.request.question='  What if a new polyclinic were built at the marked point?\nKeep the proposed site fixed.  ';
 f.draft.description='A hypothetical new polyclinic at the marked point.';
 f.draft.trigger='The proposed clinic is discussed.';
 f.draft.assumptions=[{id:'approval',text:'The proposed clinic receives the necessary approval.'}];
 f.draft.ontology.relationships=[];
 const draft=registerDraft(parseGeneratedDraft(f.draft,f.request,f.grounding)).draft;
 return {...f,draft:{...draft,ontology:draft.ontology!}};
}
function provider(output:unknown,inspect?:(body:any)=>void){
 let calls=0;
 const fetcher:typeof fetch=async(_url,init)=>{
  calls++;inspect?.(JSON.parse(String(init?.body)));
  return Response.json({model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]});
 };
 return {fetcher,calls:()=>calls};
}

test('the relationship review sees the complete original question and candidate premises before accepting enrichment',async()=>{
 const f=candidate();let body:any;
 const upstream=provider({scenarioAlignment:'aligned',relationships:[{source:'entity-001',target:'agent-1',typeId:'relationship-type-001',statement:'A proposed discussion about the clinic.',support:null}]},value=>body=value);
 const planner=createRelationshipPlanner({key:'offline-only',fetcher:upstream.fetcher},f.draft,f.grounding);
 const result=await planner.generate(f.request),input=JSON.parse(body.messages[1].content),schema=body.response_format.json_schema;
 assert.equal(schema.name,'dynamic_relationships_v3');
 assert.deepEqual(schema.schema.required,['scenarioAlignment','relationships']);
 assert.deepEqual(schema.schema.properties.scenarioAlignment.enum,['aligned','mismatch','uncertain']);
 assert.equal(schema.schema.additionalProperties,false);
 assert.equal(input.question,f.request.question);assert.equal(input.description,f.draft.description);
 assert.equal(input.trigger,f.draft.trigger);assert.deepEqual(input.assumptions,f.draft.assumptions);
 assert.equal(result.value.ontology!.relationships[0].id,'world-relationship-1');
 assert.equal(result.value.ontology!.relationships[0].statement,'A proposed discussion about the clinic.');
 assert.deepEqual(result.value.assumptions,f.draft.assumptions);assert.ok(!Object.hasOwn(result.value,'scenarioAlignment'));
 assert.equal(result.record.status,'accepted');assert.equal(upstream.calls(),1);
});

for(const [name,verdict]of [['mismatch','mismatch'],['uncertain','uncertain'],['invalid value','yes'],['null',null],['missing',undefined]] as const)test(`relationship review rejects ${name} before inspecting proposed relationships and never retries`,async()=>{
 const f=structuredClone(candidate());f.draft.description='Professional services employers introduce a four-day workweek.';
 f.draft.assumptions=[{id:'pay',text:'Monthly pay remains unchanged.'}];
 const upstream=provider({...(verdict===undefined?{}:{scenarioAlignment:verdict}),relationships:[{support:{sourceId:'unrelated-source',passageId:'unrelated-passage'}}]});
 const planner=createRelationshipPlanner({key:'offline-only',fetcher:upstream.fetcher},f.draft,f.grounding);
 await assert.rejects(planner.generate(f.request),(error:any)=>{
  assert.equal(error.code,'AI_PLAN_INVALID');assert.equal(error.plannerValidation?.rule,'plan.scenario_alignment_failed');
  assert.equal(error.plannerValidation?.path,'draft.scenarioAlignment');return true;
 });
 assert.equal(upstream.calls(),1);assert.equal(planner.records.length,1);assert.equal(planner.records[0].status,'failed');
});

test('an aligned verdict cannot authorize extra response fields',async()=>{
 const f=candidate(),upstream=provider({scenarioAlignment:'aligned',relationships:[],replacementQuestion:'A different intervention'});
 await assert.rejects(createRelationshipPlanner({key:'offline-only',fetcher:upstream.fetcher},f.draft,f.grounding).generate(f.request),(error:any)=>error.code==='AI_PLAN_INVALID'&&error.plannerValidation?.rule==='plan.unexpected_property');
 assert.equal(upstream.calls(),1);
});

test('the legacy relationship-only parser remains available without a new verdict',()=>{
 const f=candidate();
 assert.deepEqual(relationshipStageSchema(f.draft).required,['relationships']);
 assert.equal(parseRelationshipStage({relationships:[]},f.draft,f.request,f.grounding).ontology!.relationships.length,0);
});

test('an unrelated pay example is absent from the actual clinic entity prompt',async()=>{
 const f=candidate();let system='';
 const upstream=mockDynamicProvider(f,body=>system=body.messages[0].content);
 await createEntityPlanner({key:'offline-only',fetcher:upstream.fetcher},f.grounding).generate(f.request);
 assert.doesNotMatch(system,/four-day workweek|unchanged monthly pay|full pay|wage guarantee/i);
});
