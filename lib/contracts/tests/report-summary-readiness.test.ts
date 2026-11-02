import test from 'node:test';
import assert from 'node:assert/strict';
import {isReportRunUpdating} from '../../report-summary/readiness.ts';
import type {PublicExplore} from '../../society/public-contract.ts';

const run=(changes:object)=>({status:'completed',...changes} as PublicExplore);
test('initial stakeholder completion does not make a running society stable for report writing',()=>{
 assert.equal(isReportRunUpdating(run({job:{status:'running'},society:{phase:'simulating'}})),true);
 for(const phase of ['preparing','simulating','summarising'])assert.equal(isReportRunUpdating(run({society:{phase}})),true);
});
test('paused or terminal coordinator state takes precedence over old society phase',()=>{
 for(const status of ['paused','completed','cancelled','budget-limited','capacity-limited','failed'])assert.equal(isReportRunUpdating(run({job:{status},society:{phase:'simulating'}})),false,status);
 for(const phase of ['completed','partial','failed'])assert.equal(isReportRunUpdating(run({society:{phase}})),false);
 assert.equal(isReportRunUpdating(run({society:null})),false);
});
test('immutable historical runs do not wait on their old execution metadata',()=>{
 assert.equal(isReportRunUpdating(run({storage:{disposition:'historical-read-only'},job:{status:'running'},society:{phase:'simulating'}})),false);
});
