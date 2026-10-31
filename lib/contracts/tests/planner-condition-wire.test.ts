import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntityPlanner,createDynamicPlanner,parseRelationshipStage} from '../../server/inference/planner.ts';
import {plannerFixture} from './helpers/planner-fixture.ts';
import {entityReferenceFixture} from '../../../scripts/testing/entity-declaration-fixture.ts';
import {createGroundingBundle} from '../../grounding/contract.ts';

const question='What if a new government-supported eldercare centre in Sengkang begins a three-day pilot of neighbourhood volunteer visits and caregiver-support sessions? How might nearby residents, caregivers, volunteers and service providers coordinate schedules, raise concerns, exchange updates and revisit unresolved practical issues over the following days?';
function fixture(){const f=plannerFixture();f.request.question=question;f.draft.description='A fictional neighbourhood pilot';f.draft.trigger='The hypothetical pilot begins';f.draft.ontology.relationships=[];f.draft.entities=[];f.draft.agents.forEach(a=>a.entityIds=[]);f.draft.ontology.entities.forEach(e=>{if(e.support){const {sourceId,passageId}=e.support;e.support={sourceId,passageId} as typeof e.support;}});const wire=entityReferenceFixture(f.draft);return {...f,wire:{...wire,userConditionIds:['question-1']}};}
const completion=(value:unknown)=>Response.json({id:'offline-condition-wire',model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200,cost:0.001}});

test('entity generation uses a required finite reference and resolves the complete question',async()=>{
 const f=fixture();let body:any;const planner=createEntityPlanner({key:'offline-only',fetcher:async(_u,i)=>{body=JSON.parse(String(i?.body));return completion(f.wire);}},f.grounding);let value:any,error:unknown;try{value=(await planner.generate(f.request)).value;}catch(e){error=e;}
 assert.equal(body.response_format.json_schema.name,'dynamic_entities_v3');assert.equal(error,undefined);assert.deepEqual(value.userConditions,[question]);assert.deepEqual(value.userConditionProvenance,{version:1,policy:'complete-question-v1',sourceId:'question-1'});
 const schema=body.response_format.json_schema.schema;assert.equal(schema.properties.userConditions,undefined);assert.deepEqual(schema.properties.userConditionIds.items.enum,['question-1']);assert.equal(schema.properties.userConditionIds.minItems,1);assert.equal(schema.properties.userConditionIds.maxItems,1);
 for(const branch of [schema,...(schema.anyOf??[])]){assert.ok(branch.required.includes('userConditionIds'));assert.ok(!branch.required.includes('userConditions'));assert.equal(branch.properties.userConditions,undefined);}
 const context=JSON.parse(body.messages[1].content);assert.equal(context.question,question);assert.deepEqual(context.userConditionSource,{version:1,policy:'complete-question-v1',candidates:[{id:'question-1',text:question}]});assert.equal(body.max_tokens,6000);assert.deepEqual(body.provider,{only:['digitalocean'],allow_fallbacks:false,require_parameters:true});assert.deepEqual(body.reasoning,{effort:'none',exclude:true});
});

test('the legacy direct provider cannot forge application-owned source provenance',async()=>{
 const f=plannerFixture();f.request.question=question;const value={...f.draft,userConditions:[question],userConditionProvenance:{version:1,policy:'complete-question-v1',sourceId:'question-1'}};
 const planner=createDynamicPlanner({key:'offline-only',fetcher:async()=>completion(value)},f.grounding);
 await assert.rejects(planner.generate(f.request),(e:any)=>e.plannerValidation?.rule==='plan.unexpected_property');
});

for(const source of ['x'.repeat(1972)+' FINAL CONDITION MUST REMAIN','  What if Sengkang uses https://example.org/guide?q=1?\nKeep “caregiver’s” wording 👵.  ','界'.repeat(2000)])test('the real entity boundary retains the complete bounded user source: '+source.length,async()=>{
 const f=fixture();f.request.question=source;const planner=createEntityPlanner({key:'offline-only',fetcher:async()=>completion(f.wire)},f.grounding);const value=(await planner.generate(f.request)).value;assert.equal(value.userConditions[0],source);
 assert.throws(()=>parseRelationshipStage({relationships:[],userConditionProvenance:{version:1,policy:'complete-question-v1',sourceId:'question-1'}},value,f.request,f.grounding),(e:any)=>e.diagnostic?.rule==='plan.unexpected_property');
});

test('oversized source-plus-retrieval context fails before provider dispatch without truncation',async()=>{
 const f=fixture();f.request.question='界'.repeat(2000);const at='2026-10-31T00:00:00.000Z',grounding=createGroundingBundle({status:'retrieved',query:'Offline context boundary',retrievedAt:at,sources:Array.from({length:5},(_,i)=>({id:'source-'+i,title:'Offline source',url:'https://example.org/'+i,publisher:'example.org',publishedAt:null,retrievedAt:at,passages:[{id:'passage-'+i,text:'界'.repeat(800)}]})),limitations:['Offline source fixture, not verified facts.'],usage:{searches:1,credits:1}});let calls=0;
 const planner=createEntityPlanner({key:'offline-only',fetcher:async()=>{calls++;return completion(f.wire);}},grounding);await assert.rejects(planner.generate(f.request),(e:any)=>e.code==='AI_REQUEST_TOO_LARGE');assert.equal(calls,0);assert.equal(planner.records.length,1);assert.equal(planner.records[0].status,'failed');assert.equal(f.request.question,'界'.repeat(2000));
});

test('omitting condition references cannot fall back to legacy empty quotations',async()=>{
 const f=fixture(),{userConditionIds,...wire}=f.wire;const planner=createEntityPlanner({key:'offline-only',fetcher:async()=>completion(wire)},f.grounding);await assert.rejects(planner.generate(f.request),(e:any)=>e.plannerValidation?.rule==='plan.user_condition_reference_invalid');
});

for(const ids of [[],['invented'],['question-1','question-1'],[0],null])test('invalid condition reference fails without a second dispatch: '+JSON.stringify(ids),async()=>{
 const f=fixture();let calls=0;const planner=createEntityPlanner({key:'offline-only',fetcher:async()=>{calls++;return completion({...f.wire,userConditionIds:ids});}},f.grounding);await assert.rejects(planner.generate(f.request),(e:any)=>e.plannerValidation?.rule==='plan.user_condition_reference_invalid');assert.equal(calls,1);assert.equal(planner.records.length,1);assert.equal(planner.records[0].status,'failed');
});

for(const injected of [{userConditions:['MODEL_PARAPHRASE_MUST_STAY_PRIVATE']},{userConditionProvenance:{version:1,policy:'complete-question-v1',sourceId:'question-1'}},{sourceOffsets:{start:0,end:10}}])test('provider cannot forge resolved source text or provenance: '+Object.keys(injected)[0],async()=>{
 const f=fixture(),planner=createEntityPlanner({key:'offline-only',fetcher:async()=>completion({...f.wire,...injected})},f.grounding);await assert.rejects(planner.generate(f.request));assert.equal(planner.records[0].status,'failed');assert.ok(!JSON.stringify(planner.records).includes('MODEL_PARAPHRASE_MUST_STAY_PRIVATE'));
});
