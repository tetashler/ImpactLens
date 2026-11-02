import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
// Pure admission checks use synthetic ledger metadata and never arm an authority.
const g=await import('../../../scripts/testing/storage-handoff-success-live-guard.mjs');
const row=(purpose:string,schema:string,costUsd:number|null=.001)=>({attempt:1,service:'openrouter',purpose,schema,costUsd,reservedUsd:.02,reservedTokens:2000,inputTokens:10,outputTokens:10,state:'returned'});
const state=(requests:unknown[]=[])=>({attempts:[{id:1}],requests,halted:false});
test('fresh success task has exact hard caps and twenty minute arm window',()=>{
 assert.equal(g.TASK_ID,'storage-handoff-success-live-20261102-01');assert.equal(g.LIMITS.attempts,1);assert.equal(g.LIMITS.social,2);assert.equal(g.LIMITS.personality,1);assert.equal(g.LIMITS.interpretation,0);assert.equal(g.LIMITS.completions,13);assert.equal(g.LIMITS.usd,.05);assert.equal(g.LIMITS.tavilySearches,1);assert.equal(g.LIMITS.tavilyCredits,2);assert.equal(g.LIMITS.concurrent,1);assert.equal(g.LIMITS.deadlineMs,1200000);assert.equal(g.RESERVED_USD,.02);
});
test('two distinct social admissions exhaust the hard cap even below total and cost caps',()=>{
 const input={schema:'social_decision_v1',rawBytes:100,maxOutputTokens:600};const d=state();assert.equal(g.nextOpenrouterAdmissionAllowed(d,input),true);d.requests.push(row('social','social_decision_v1'));assert.equal(g.nextOpenrouterAdmissionAllowed(d,input),true);d.requests.push(row('social','social_decision_v1'));assert.equal(g.nextOpenrouterAdmissionAllowed(d,input),false);assert.equal(g.totals(d).completions,2);
});
test('reported plus outstanding plus only the next conservative reservation governs admission',()=>{
 const input={schema:'dynamic_entities_v3',rawBytes:100,maxOutputTokens:6000};assert.equal(g.nextOpenrouterAdmissionAllowed(state(),input),true);assert.equal(g.nextOpenrouterAdmissionAllowed(state([row('action','stakeholder_turn_v1',null)]),input),true);assert.equal(g.nextOpenrouterAdmissionAllowed(state([row('action','stakeholder_turn_v1',null),row('action','stakeholder_turn_v1',null)]),input),false);assert.equal(g.nextOpenrouterAdmissionAllowed(state([row('action','stakeholder_turn_v1',.031)]),input),false);
});
test('personality has no second admission and interpretation has no grant',()=>{
 assert.equal(g.nextOpenrouterAdmissionAllowed(state([row('personality','citizen_personalities_v1')]),{schema:'citizen_personalities_v1',rawBytes:100,maxOutputTokens:6000}),false);assert.equal(g.nextOpenrouterAdmissionAllowed(state(),{schema:'hybrid_intervention_intent_v2',rawBytes:100,maxOutputTokens:1500}),false);
});
