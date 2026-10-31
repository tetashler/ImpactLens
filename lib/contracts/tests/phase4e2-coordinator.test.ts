import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startCoordinator,coordinatorStatus,stopCoordinators,type CoordinatorDriver,type CoordinatorProgress} from '../../server/society/coordinator.ts';

const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function terminal(runId:string,directory:string){for(let i=0;i<300;i++){const value=coordinatorStatus(runId,directory);if(value?.status!=='running')return value;await pause(5);}throw Error('TEST_JOB_TIMEOUT');}
function fixture(){let tick=0,steps=0,checkpoints=0;const progress=():CoordinatorProgress=>({profileId:'multi-day-50-320-v1',opportunities:steps,revision:steps,tick,totalSteps:320,acceptedDecisions:steps,participatingAgents:1,capacity:350,admittedCalls:350,calls:steps,completed:false,budgetLimited:false});const driver:CoordinatorDriver={inspect:async()=>progress(),step:async()=>{steps++;tick++;return progress();},checkpoint:async()=>{checkpoints++;},publish:async()=>{}};return {driver,progress,steps:()=>steps,checkpoints:()=>checkpoints};}

test('capacity termination settles once with typed reason instead of advancing an unchanged world forever',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-capacity-')),runId='capacity-stop',f=fixture();
 const driver={...f.driver,step:async()=>({...f.progress(),capacityReason:'EVENT_CAPACITY' as const})};
 try{await startCoordinator({runId,directory,driver});const value=await terminal(runId,directory);assert.equal(value?.status,'capacity-limited');assert.equal(value?.reason,'EVENT_CAPACITY');assert.equal(value?.revision,0);}finally{await stopCoordinators(directory);rmSync(directory,{recursive:true,force:true});}
});

test('service owns periodic material checkpoints and coordinator only forces the completion checkpoint',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-checkpoint-owner-')),runId='checkpoint-owner',f=fixture();
 const driver={...f.driver,step:async(signal:AbortSignal)=>{const p=await f.driver.step(signal);return {...p,completed:p.acceptedDecisions===51};}};
 try{await startCoordinator({runId,directory,driver});assert.equal((await terminal(runId,directory))?.status,'completed');assert.equal(f.checkpoints(),1);}finally{await stopCoordinators(directory);rmSync(directory,{recursive:true,force:true});}
});

test('a quiet clock tick is valid progress while an entirely unchanged step stops safely',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-progress-')),runId='quiet-progress',f=fixture();let calls=0;
 const driver={...f.driver,step:async()=>{calls++;if(calls===1){const p=await f.driver.step(new AbortController().signal);return {...p,opportunities:0,acceptedDecisions:0,calls:0};}return {...f.progress(),opportunities:0,acceptedDecisions:0,calls:0};}};
 try{await startCoordinator({runId,directory,driver});const value=await terminal(runId,directory);assert.equal(value?.status,'failed');assert.equal(value?.reason,'OPERATION');assert.equal(calls,2);assert.equal(value?.tick,1);}finally{await stopCoordinators(directory);rmSync(directory,{recursive:true,force:true});}
});

test('a new profile cannot keep running by increasing only its revision while clock and opportunities remain unchanged',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-revision-only-')),runId='revision-only',f=fixture();let p={...f.progress(),opportunities:0},calls=0;
 const driver={...f.driver,inspect:async()=>p,step:async()=>{if(++calls>1)throw Error('UNEXPECTED_EXTRA_STEP');p={...p,revision:p.revision+1};return p;}};
 try{await startCoordinator({runId,directory,driver});const value=await terminal(runId,directory);assert.equal(value?.status,'failed');assert.equal(value?.reason,'OPERATION');assert.equal(calls,1);assert.equal(value?.tick,0);}finally{await stopCoordinators(directory);rmSync(directory,{recursive:true,force:true});}
});

test('skipped and failed opportunities advance a new job without requiring an accepted decision or another clock tick',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-record-progress-')),runId='record-progress',f=fixture();let p={...f.progress(),tick:10,opportunities:0,acceptedDecisions:0,calls:0,admittedCalls:1},steps=0;
 const driver={...f.driver,inspect:async()=>p,step:async()=>{steps++;p={...p,revision:steps,opportunities:steps,calls:steps===2?1:0,budgetLimited:steps===2};return p;}};
 try{await startCoordinator({runId,directory,driver});const value=await terminal(runId,directory);assert.equal(value?.status,'budget-limited');assert.equal(steps,2);assert.equal(value?.tick,10);assert.equal(value?.acceptedDecisions,0);}finally{await stopCoordinators(directory);rmSync(directory,{recursive:true,force:true});}
});

for(const [error,reason]of [['SOCIAL_STORAGE_LIMIT','JOURNAL_CAPACITY'],['SOCIAL_CHECKPOINT_LIMIT','STORAGE_CAPACITY']] as const)test(`new profile projects ${reason} explicitly without disclosing the private failure`,async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-storage-capacity-')),runId='typed-'+reason,f=fixture();
 const driver={...f.driver,step:async()=>{throw Error(error);}};
 try{await startCoordinator({runId,directory,driver});const value=await terminal(runId,directory);assert.equal(value?.status,'capacity-limited');assert.equal(value?.reason,reason);assert.equal(f.steps(),0);assert.equal(f.checkpoints(),0);}finally{await stopCoordinators(directory);rmSync(directory,{recursive:true,force:true});}
});
