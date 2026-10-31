import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startCoordinator,coordinatorStatus,controlCoordinator,stopCoordinators,type CoordinatorDriver,type CoordinatorProgress,coordinatorJobPath} from '../../server/society/coordinator.ts';

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check:()=>boolean){for(let i=0;i<200;i++){if(check())return;await sleep(5);}throw Error('COORDINATOR_TEST_TIMEOUT');}
function fixture(max=4){let count=0,checkpoints=0;const progress=():CoordinatorProgress=>({revision:count,tick:count,totalSteps:max,acceptedDecisions:count,participatingAgents:Math.min(count,3),capacity:350,admittedCalls:max,calls:count,completed:count>=max,budgetLimited:false});const driver:CoordinatorDriver={inspect:async()=>progress(),step:async signal=>{signal.throwIfAborted();await sleep(8);signal.throwIfAborted();count++;return progress();},checkpoint:async()=>{checkpoints++;},publish:async()=>{}};return {driver,count:()=>count,checkpoints:()=>checkpoints};}

test('managed coordinator owns progression independently of observers and duplicate starts',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'impactlens-deep-job-')),f=fixture(),runId='run-deep-coordinator';
 try{const a=await startCoordinator({runId,directory,driver:f.driver,deadlineMs:10_000}),b=await startCoordinator({runId,directory,driver:f.driver,deadlineMs:10_000});assert.equal(a.id,b.id);await until(()=>coordinatorStatus(runId,directory)?.status==='completed');assert.equal(f.count(),4);assert.ok(f.checkpoints()>=1);const safe=JSON.stringify(coordinatorStatus(runId,directory));assert.doesNotMatch(safe,/driver|world|memories|text|RAW_/);assert.equal(coordinatorStatus(runId,directory)?.acceptedDecisions,4);}finally{await stopCoordinators(directory);}
});

test('pause and explicit resume preserve accepted work; cancellation does not redispatch',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'impactlens-deep-job-')),f=fixture(12),runId='run-deep-controls';
 try{await startCoordinator({runId,directory,driver:f.driver,deadlineMs:10_000});await until(()=>f.count()>=1);await controlCoordinator(runId,directory,'pause',()=>f.driver);const before=f.count();await sleep(35);assert.equal(f.count(),before);assert.equal(coordinatorStatus(runId,directory)?.status,'paused');await controlCoordinator(runId,directory,'resume',()=>f.driver);await until(()=>f.count()>before);await controlCoordinator(runId,directory,'cancel',()=>f.driver);const cancelled=f.count();await sleep(35);assert.equal(f.count(),cancelled);assert.equal(coordinatorStatus(runId,directory)?.status,'cancelled');await assert.rejects(controlCoordinator(runId,directory,'resume',()=>f.driver),/JOB_TERMINAL/);}finally{await stopCoordinators(directory);}
});

test('budget-limited job stops without fabricating decisions and passive status never resumes it',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'impactlens-deep-job-')),f=fixture(2),runId='run-deep-budget';let steps=0;
 const driver={...f.driver,step:async(signal:AbortSignal)=>{steps++;const p=await f.driver.step(signal);return {...p,completed:false,budgetLimited:steps===2};}};
 try{await startCoordinator({runId,directory,driver,deadlineMs:10_000});await until(()=>coordinatorStatus(runId,directory)?.status==='budget-limited');for(let i=0;i<5;i++)assert.equal(coordinatorStatus(runId,directory)?.status,'budget-limited');assert.equal(steps,2);assert.equal(coordinatorStatus(runId,directory)?.remainingCalls,0);}finally{await stopCoordinators(directory);}
});

test('unfinished durable jobs from an absent process project paused and require explicit resume',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'impactlens-deep-job-')),f=fixture(1),runId='run-deep-restart';
 try{await startCoordinator({runId,directory,driver:f.driver,deadlineMs:10_000});await controlCoordinator(runId,directory,'pause',()=>f.driver);const path=coordinatorJobPath(runId,directory),saved=JSON.parse(readFileSync(path,'utf8'));saved.status='running';saved.ownerPid=2_147_483_000;writeFileSync(path,JSON.stringify(saved));assert.equal(coordinatorStatus(runId,directory)?.status,'paused');assert.equal(coordinatorStatus(runId,directory)?.reason,'APPLICATION_RESTART');await sleep(25);assert.equal(f.count(),0);await controlCoordinator(runId,directory,'resume',()=>f.driver);await until(()=>coordinatorStatus(runId,directory)?.status==='completed');assert.equal(f.count(),1);}finally{await stopCoordinators(directory);}
});

test('an owner in another live process cannot be bypassed by a second coordinator start',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'impactlens-deep-job-')),f=fixture(),runId='run-deep-owner';
 const lease=coordinatorJobPath(runId,directory)+'.lease';writeFileSync(lease,JSON.stringify({version:1,ownerPid:process.pid,ownerNonce:'another-owner'}));
 await assert.rejects(startCoordinator({runId,directory,driver:f.driver}),/JOB_OWNER/);assert.equal(f.count(),0);assert.equal(JSON.parse(readFileSync(lease,'utf8')).ownerNonce,'another-owner');
});

test('a persistence failure stops owned work with a safe reason and retains accepted progress',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'impactlens-deep-job-')),f=fixture(4),runId='run-deep-failed';let steps=0;
 const driver={...f.driver,step:async(signal:AbortSignal)=>{if(steps++>0)throw Error('SOCIAL_JOURNAL_RAW_PRIVATE_SENTINEL');return f.driver.step(signal);}};
 try{await startCoordinator({runId,directory,driver});await until(()=>coordinatorStatus(runId,directory)?.status==='failed');const status=coordinatorStatus(runId,directory);assert.equal(status?.reason,'STORAGE');assert.equal(status?.acceptedDecisions,1);await sleep(30);assert.equal(steps,2);assert.doesNotMatch(JSON.stringify(status),/RAW_|PRIVATE_SENTINEL/);}finally{await stopCoordinators(directory);}
});
for(const checkpointFailure of [false,true])test(`fatal progress includes a committed failed opportunity with checkpoint failure ${checkpointFailure}`,async()=>{
 const directory=mkdtempSync(join(tmpdir(),'impactlens-deep-fatal-')),runId='run-deep-fatal-commit';let committed=false,steps=0;
 const progress=():CoordinatorProgress=>({revision:committed?1:0,tick:committed?2:0,totalSteps:80,acceptedDecisions:0,participatingAgents:0,capacity:350,admittedCalls:70,calls:committed?1:0,completed:false,budgetLimited:false});
 const driver:CoordinatorDriver={inspect:async()=>progress(),step:async()=>{steps++;committed=true;throw Error('SOCIAL_PROVIDER_IDENTITY');},checkpoint:async()=>{if(checkpointFailure)throw Error('SOCIAL_CHECKPOINT');},publish:async()=>{}};
 try{await startCoordinator({runId,directory,driver});await until(()=>coordinatorStatus(runId,directory)?.status==='failed');const status=coordinatorStatus(runId,directory);assert.equal(status?.reason,checkpointFailure?'STORAGE':'PROVIDER_IDENTITY');assert.equal(status?.revision,1);assert.equal(status?.tick,2);assert.equal(status?.remainingCalls,69);assert.equal(status?.acceptedDecisions,0);assert.equal(steps,1);}finally{await stopCoordinators(directory);}
});
