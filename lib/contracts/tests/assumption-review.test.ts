import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {createDynamicPlan,validateDynamicPlan,assumptionsForPlan} from '../../dynamic-scenarios/plan.ts';
import {reviewableAssumptions,applyAssumptionDecisions,parseAssumptionDecisions,reviewContext,ASSUMPTION_REVIEW_INSTRUCTION} from '../../assumption-review/contract.ts';
import {handleDynamicRequest} from '../../server/inference/dynamic-service.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';

test('review decisions are explicit and complete; rejection stays unknown and original plan is immutable',async()=>{
 const f=worldFixtures()[0];f.draft.assumptions=[{id:'pay',text:'Monthly pay remains unchanged.'},{id:'hours',text:'Daily work hours stay unchanged.'}];
 const source=await createDynamicPlan(f.request,f.draft);const contextKey='a'.repeat(64);
 assert.equal(reviewableAssumptions(source).length,2);
 assert.throws(()=>parseAssumptionDecisions([{assumptionId:'pay',decision:'allow'}],reviewableAssumptions(source)));
 assert.throws(()=>parseAssumptionDecisions([{assumptionId:'pay',decision:'allow'},{assumptionId:'pay',decision:'do-not-allow'}],reviewableAssumptions(source)));
 assert.throws(()=>parseAssumptionDecisions([{assumptionId:'pay',decision:'allow',text:'forged'},{assumptionId:'hours',decision:'allow'}],reviewableAssumptions(source)));
 const effective=await applyAssumptionDecisions(source,[{assumptionId:'pay',decision:'do-not-allow'},{assumptionId:'hours',decision:'allow'}],contextKey);
 assert.notEqual(effective.planId,source.planId);assert.equal(source.draft.assumptions.length,2);
 assert.deepEqual(effective.draft.assumptions.map(a=>a.id),['hours']);
 assert.ok(!assumptionsForPlan(effective).some(a=>a.id==='proposal-pay'));
 assert.equal(effective.assumptionReview?.items[0].decision,'do-not-allow');
 assert.equal((await validateDynamicPlan(effective)).planId,effective.planId);
 assert.match(JSON.stringify(reviewContext(effective.assumptionReview)),/unknown/);
 assert.match(ASSUMPTION_REVIEW_INSTRUCTION,/conditional/i);
 const forged=structuredClone(effective);forged.draft.assumptions.push(source.draft.assumptions[0]);await assert.rejects(validateDynamicPlan(forged));
});
test('reject all and explicit empty review are valid; verbatim user conditions are not offered',async()=>{
 const f=worldFixtures()[0];f.draft.assumptions=[{id:'explicit',text:f.request.question},{id:'extra',text:'Monthly pay remains unchanged.'}];
 // The full question can exceed the assumption text limit; use a short explicit user question.
 f.request.question='What if a four-day workweek kept monthly pay unchanged?';f.draft.userConditions=[];f.draft.assumptions[0].text=f.request.question;
 const source=await createDynamicPlan(f.request,f.draft);assert.deepEqual(reviewableAssumptions(source).map(a=>a.id),['extra']);
 const effective=await applyAssumptionDecisions(source,[{assumptionId:'extra',decision:'do-not-allow'}],'b'.repeat(64));
 assert.deepEqual(effective.draft.assumptions.map(a=>a.id),['explicit']);await validateDynamicPlan(effective);
 f.draft.assumptions=[];const empty=await createDynamicPlan(f.request,f.draft);const reviewed=await applyAssumptionDecisions(empty,[],'b'.repeat(64));assert.equal(reviewed.assumptionReview?.items.length,0);await validateDynamicPlan(reviewed);
});
test('planning preparation stops before any stakeholder action and execution reuses the plan',async()=>{
 const f=worldFixtures()[0],mock=mockDynamicProvider(f);let prepared:any;
 const request=new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:'review-test-'+crypto.randomUUID(),request:f.request})});
 const response=await handleDynamicRequest(request,{enabled:true,key:'mock',groundingKey:'',fetcher:mock.fetcher,onPrepared:async value=>{prepared=value;return Response.json({kind:'held'});}});
 assert.equal(response.status,200);assert.equal((await response.json()).kind,'held');assert.deepEqual(mock.counts(),{calls:2,plans:2});assert.ok(prepared.plan.planId);
});
