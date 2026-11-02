import test from 'node:test';
import assert from 'node:assert/strict';
import {reportPreparationState} from '../../report-detailed/preparation.ts';
import {automaticReportsIdle} from '../../report-detailed/automatic.ts';
import type {PublicExplore} from '../../society/public-contract.ts';
const run={runId:'run-ui',job:{status:'completed'}} as PublicExplore;
test('completion is preparing immediately, before automatic effects start or while either writer is pending',()=>{
 const initial=automaticReportsIdle(run.runId);
 assert.equal(reportPreparationState(run,initial,'summary').preparing,true);
 assert.equal(reportPreparationState(run,initial,'detailed').preparing,true);
 const writing={...initial,stage:'writing-summary' as const};
 assert.match(reportPreparationState(run,writing,'summary').message,/writing/i);
 assert.match(reportPreparationState(run,writing,'detailed').message,/quick summary/i);
 assert.equal(reportPreparationState(run,{...writing,stage:'complete',summary:'available'},'summary').preparing,true,'keep loading until the saved artifact reaches the reader');
});
test('failed or attempted generation enables an explicit retry; paused and unrelated runs stay manual',()=>{
 const state={...automaticReportsIdle(run.runId),stage:'complete' as const,summary:'failed' as const,errors:{summary:'Writing failed'}};
 assert.deepEqual(reportPreparationState(run,state,'summary'),{preparing:false,message:'',error:'Writing failed'});
 assert.equal(reportPreparationState({...run,job:{status:'paused'} as any},state,'detailed').preparing,false);
 assert.equal(reportPreparationState(run,{...state,runId:'other'},'detailed').preparing,false);
 assert.equal(reportPreparationState(run,{...state,summary:'attempted'},'summary').preparing,false);
 assert.equal(reportPreparationState(run,undefined,'summary').preparing,false);
});
