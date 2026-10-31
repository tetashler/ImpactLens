import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {dynamicFixtures} from '../../dynamic-scenarios/fixtures.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {createDynamicPlan,parseDynamicDraft,parseDynamicPlan,validateDynamicPlan} from '../../dynamic-scenarios/plan.ts';
import {createDynamicInput} from '../../dynamic-scenarios/execution.ts';
import {parsePlannerDiagnostic,PlannerValidationError} from '../../dynamic-scenarios/diagnostics.ts';
import * as source from '../../dynamic-scenarios/user-condition-source.ts';

const provenance={version:1 as const,policy:'complete-question-v1' as const,sourceId:'question-1' as const};
function marked(question:string){const f=worldFixtures()[0];return {...f,request:{...f.request,question},draft:{...f.draft,userConditions:[question],userConditionProvenance:{...provenance}}};}
function referenceError(error:unknown){assert.ok(error instanceof PlannerValidationError);assert.equal(error.diagnostic.rule,'plan.user_condition_reference_invalid');assert.deepEqual(parsePlannerDiagnostic(error.diagnostic),error.diagnostic);return true;}

test('the source catalog and resolution preserve the entire question without interpreting conditions',()=>{
 const api=source,question='  What if a shorter week preserves monthly pay?\r\nKeep monthly pay, including overtime.  ';
 assert.deepEqual(api.completeQuestionSource(question),{version:1,policy:'complete-question-v1',candidates:[{id:'question-1',text:question}]});
 assert.deepEqual(api.resolveUserConditionIds(['question-1'],question),{userConditions:[question],userConditionProvenance:provenance});
 assert.doesNotThrow(()=>api.validateUserConditionSource([question],provenance,question));
});

test('source references reject missing, empty, invented, duplicate and offset selections safely',()=>{
 const api=source,question='Private question marker: retain monthly pay.';
 for(const ids of [undefined,null,[],[''],['private-invented-reference'],['QUESTION-1'],['question-1','question-1'],['question-1','other'],[1],[{id:'question-1'}],{start:0,end:question.length},'question-1']){
  assert.throws(()=>api.resolveUserConditionIds(ids,question),(error:unknown)=>{
   referenceError(error);const e=error as PlannerValidationError;assert.match(e.diagnostic.path,/^draft\.userConditionIds(?:\[0\])?$/);
   for(const secret of [question,'private-invented-reference'])assert.ok(!JSON.stringify(e).includes(secret));return true;
  });
 }
});

test('source validation never normalizes Unicode, whitespace, repeated phrases or source punctuation',()=>{
 const api=source,question='  Café e\u0301 👩🏽‍💻 维持月薪\r\nretain pay; retain pay — “unchanged”.  ';
 const resolved=api.resolveUserConditionIds(['question-1'],question);assert.equal(resolved.userConditions[0],question);
 for(const text of [question.trim(),question.normalize('NFC'),question.replace('\r\n','\n'),question.replace('retain pay; ',''),question.replace('—','-')])assert.throws(()=>api.validateUserConditionSource([text],provenance,question));
 for(const conditions of [[],[question,question],[question.slice(0,30)],question,[1]])assert.throws(()=>api.validateUserConditionSource(conditions,provenance,question));
});

test('complete-question source metadata rejects forged policies, fields and identities',()=>{
 const api=source,question='What if monthly pay is retained?';
 for(const metadata of [undefined,null,{},[],{...provenance,version:2},{...provenance,policy:'selected-spans-v1'},{...provenance,sourceId:'question-2'},{...provenance,quote:question},{...provenance,start:0,end:question.length}])assert.throws(()=>api.validateUserConditionSource([question],metadata,question));
});

test('the source contract enforces the original 2000 UTF-16-unit nonempty question bound',()=>{
 const api=source,question='😀'.repeat(990)+'Keep monthly pay.   ';assert.equal(question.length,2000);
 assert.equal(api.resolveUserConditionIds(['question-1'],question).userConditions[0],question);
 for(const invalid of ['', ' \t\r\n ',question+'!', 'x\u0000y']){
  assert.throws(()=>api.completeQuestionSource(invalid));assert.throws(()=>api.resolveUserConditionIds(['question-1'],invalid));assert.throws(()=>api.validateUserConditionSource([invalid],provenance,invalid));
 }
});

test('source-reference validation rejects accessors and extra array properties without reading them',()=>{
 const api=source;let reads=0;
 const accessor=Object.defineProperty(['question-1'],'0',{get(){reads++;return 'question-1';},enumerable:true}),extra=Object.assign(['question-1'],{quote:'private-array-marker'});
 for(const ids of [accessor,extra,new Array(1)])assert.throws(()=>api.resolveUserConditionIds(ids,'Retain monthly pay.'));
 assert.equal(reads,0);
});

test('marked plans retain a final explicit condition in a 2000-unit question through hashing and execution input',async()=>{
 const question='界'.repeat(1963)+'\nWithout reducing monthly pay at all.';assert.equal(question.length,2000);
 const f=marked(question),plan=await createDynamicPlan(f.request,f.draft);assert.equal(plan.version,2);
 assert.deepEqual(plan.draft.userConditionProvenance,provenance);assert.deepEqual(plan.draft.userConditions,[question]);assert.deepEqual(await validateDynamicPlan(JSON.parse(JSON.stringify(plan))),plan);
 const input=await createDynamicInput(plan);assert.equal(input.question,question);assert.equal(input.version===2&&input.scenarioPlan.draft.userConditions[0],question);
 const changed=structuredClone(plan);changed.draft.userConditionProvenance!.sourceId='question-2' as 'question-1';assert.throws(()=>parseDynamicPlan(changed));
 const short=marked('What if monthly pay is retained?'),shortPlan=await createDynamicPlan(short.request,short.draft),removed=structuredClone(shortPlan);delete removed.draft.userConditionProvenance;
 assert.doesNotThrow(()=>parseDynamicPlan(removed));await assert.rejects(()=>validateDynamicPlan(removed),(error:unknown)=>error instanceof PlannerValidationError&&error.diagnostic.rule==='plan.identity_mismatch');
});

test('only a validated complete source can contain URLs and markup; generated prose keeps its guards',()=>{
 const question='What if the policy at https://example.invalid/?pay=100%25 preserves <monthly pay> and $100?';
 const f=marked(question);assert.equal(parseDynamicDraft(f.draft,f.request).userConditions[0],question);
 for(const change of [(d:typeof f.draft)=>d.description='Read https://example.invalid/fabricated.',(d:typeof f.draft)=>d.assumptions[0].text='Official 99% growth is established.',(d:typeof f.draft)=>d.agents[0].goals=['Read www.example.invalid.']]){
  const d=structuredClone(f.draft);change(d);assert.throws(()=>parseDynamicDraft(d,f.request));
 }
 const forged=structuredClone(f.draft);forged.userConditions=['https://example.invalid/forged'];assert.throws(()=>parseDynamicDraft(forged,f.request));
});

test('marked archive drafts reject partial, omitted, duplicate and forged source values',()=>{
 const f=marked('Keep monthly pay. Keep overtime protection.');
 for(const conditions of [[],['Keep monthly pay.'],[f.request.question,f.request.question],['Keep monthly pay. Keep overtime protection!']])assert.throws(()=>parseDynamicDraft({...f.draft,userConditions:conditions},f.request));
 for(const metadata of [null,{...provenance,sourceId:'question-2'},{...provenance,version:2},{...provenance,extra:'private-marker'}])assert.throws(()=>parseDynamicDraft({...f.draft,userConditionProvenance:metadata},f.request));
});

test('legacy optional quotations retain their original bounds and literal-substring validation',()=>{
 const f=dynamicFixtures()[0],request={...f.request,question:'a'.repeat(301)+' Preserve monthly pay.'};
 assert.deepEqual(parseDynamicDraft(f.draft,request).userConditions,[]);
 assert.deepEqual(parseDynamicDraft({...f.draft,userConditions:['Preserve monthly pay.']},request).userConditions,['Preserve monthly pay.']);
 for(const conditions of [['a'.repeat(301)],['a','aa','aaa','aaaa','aaaaa'],['Preserve monthly pay!'],['Preserve monthly pay.','Preserve monthly pay.']])assert.throws(()=>parseDynamicDraft({...f.draft,userConditions:conditions},request));
 const urlRequest={...f.request,question:'Read https://example.invalid/.'};assert.throws(()=>parseDynamicDraft({...f.draft,userConditions:[urlRequest.question]},urlRequest));
});

test('legacy plan serialization and hash identities are unchanged when provenance is absent',async()=>{
 const f=dynamicFixtures()[0],plan=await createDynamicPlan(f.request,f.draft);
 assert.equal(plan.planId,'dynamic-plan-3d7bf0b6255c6c6d72e7e40c295a421cad4f3a32a8df6e7be84dd742d5bc47a9');
 assert.equal(plan.requestIdentity,'dynamic-request-04362bd10b636da7379eda7b3c39260c0528b861ad413223bcbcae1b3f8b1043');
 assert.ok(!Object.hasOwn(plan.draft,'userConditionProvenance'));assert.deepEqual(JSON.parse(JSON.stringify(plan.draft)),f.draft);assert.deepEqual(await validateDynamicPlan(plan),plan);
});
