import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {startCoordinator,coordinatorStatus,coordinatorJobPath,stopCoordinators,type CoordinatorProgress} from '../../server/society/coordinator.ts';
import {SocialFatalError} from '../../server/society/service.ts';
import {jobFailureMessage} from '../../society/job-failure.ts';
import {parseSocietyJob} from '../../question-simulation/public-session.ts';

async function terminal(runId:string,dir:string){for(let i=0;i<200;i++){const job=coordinatorStatus(runId,dir);if(job?.status==='failed')return job;await new Promise(r=>setTimeout(r,5));}throw Error('JOB_TEST_TIMEOUT');}
for(const [code,reason]of [['AI_RATE_LIMIT','PROVIDER_RATE_LIMIT'],['AI_TIMEOUT','PROVIDER_TIMEOUT'],['AI_CREDITS','PROVIDER_CREDITS'],['AI_UPSTREAM','PROVIDER_UNAVAILABLE'],['AI_CANCELLED','PROVIDER_CANCELLED'],['SOCIAL_UNCERTAIN','PROVIDER_UNCERTAIN'],['AI_PROVIDER_IDENTITY','PROVIDER_IDENTITY']] as const)test(`persisted ${code} retains its cause and never retries or claims completion`,async()=>{
 const dir=mkdtempSync(join(process.cwd(),'tmp/handoff-repair-20261103/job-')),runId='failure-'+crypto.randomUUID();let calls=0;
 const progress=():CoordinatorProgress=>({profileId:'multi-day-50-320-v1',opportunities:calls,revision:calls,tick:calls?1:0,totalSteps:320,acceptedDecisions:1,participatingAgents:1,capacity:350,admittedCalls:30,calls,completed:false,budgetLimited:false});
 try{await startCoordinator({runId,directory:dir,driver:{inspect:async()=>progress(),step:async()=>{calls=2;throw new SocialFatalError(code);},checkpoint:async()=>{},publish:async()=>{}}});
  const job=await terminal(runId,dir);assert.equal(job!.reason,reason);assert.equal(job!.tick,1);assert.equal(job!.remainingCalls,28);assert.equal(calls,2);parseSocietyJob(job);
  const stored=JSON.parse(readFileSync(coordinatorJobPath(runId,dir),'utf8'));assert.equal(stored.failure.code,code);assert.equal(stored.failure.stage,'step');
  assert.equal(Object.hasOwn(job!,'failure'),false);if(reason!=='PROVIDER_IDENTITY')assert.match(jobFailureMessage(reason)!,/retained|preserved/);assert.doesNotMatch(JSON.stringify(stored),/stack|token|raw provider|private prompt/);
  await new Promise(r=>setTimeout(r,20));assert.equal(calls,2);
 }finally{await stopCoordinators(dir);}
});
test('unknown projection exceptions retain a safe stage and error kind without raw messages or stack',async()=>{
 const dir=mkdtempSync(join(process.cwd(),'tmp/handoff-repair-20261103/projection-')),runId='projection-'+crypto.randomUUID();let calls=0;
 const progress=():CoordinatorProgress=>({revision:calls,tick:calls,totalSteps:1,acceptedDecisions:calls,participatingAgents:calls,capacity:350,admittedCalls:30,calls,completed:calls===1,budgetLimited:false});
 const warn=console.warn;const logs:string[]=[];console.warn=(...parts:unknown[])=>logs.push(parts.join(' '));
 try{await startCoordinator({runId,directory:dir,driver:{inspect:async()=>progress(),step:async()=>{calls++;return progress();},checkpoint:async()=>{},publish:async()=>{throw TypeError('SECRET provider token and private prompt <raw>');}}});
  await terminal(runId,dir);const stored=JSON.parse(readFileSync(coordinatorJobPath(runId,dir),'utf8'));assert.equal(stored.failure.stage,'publish');assert.equal(stored.failure.errorType,'TypeError');assert.equal(stored.failure.code,'OPERATION');assert.equal(calls,1);
  assert.doesNotMatch(JSON.stringify(stored)+logs.join(' '),/SECRET|private prompt|<raw>|stack/);
 }finally{console.warn=warn;await stopCoordinators(dir);}
});
