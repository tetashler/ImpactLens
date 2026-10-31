import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs,{mkdtempSync,rmSync,readFileSync,statSync} from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {socialOperation,readSocialSession,checkpointSocialSession,type SocialDependencies,type SocialState} from '../../server/society/service.ts';
import {deepSwarmPolicy,swarmPolicy,multiDaySwarmPolicy} from '../../society/swarm.ts';
import {startCoordinator,coordinatorStatus,stopCoordinators,type CoordinatorDriver,type CoordinatorProgress} from '../../server/society/coordinator.ts';
import {appendSwarmJournal} from '../../server/society/swarm-journal.ts';
import {phase4eSource,phase4eCommunication,phase4eFetcher,evictFixtureSession} from '../../../scripts/testing/phase4e-fixture.ts';

test('new ordinary sessions freeze trusted pacing before their first journal row while explicit old policies keep80 ticks',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-genesis-'));try{
  const source=await phase4eSource('new-multiday-'+crypto.randomUUID()),mock=phase4eFetcher();
  const d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),fetcher:mock.fetcher,admission:{maxCalls:70}};
  const state=await socialOperation({operation:'start',run:source},d);
  assert.equal(state.world.genesis.config.steps,320);assert.equal(state.world.genesis.input.swarm?.multiDay?.pacingTarget,70);assert.equal(state.admission.maxCalls,70);assert.equal(mock.calls.length,0);
  const header=JSON.parse(readFileSync(join(directory,state.sessionId+'.jsonl'),'utf8').split('\n')[0]);assert.equal(header.input.swarm.multiDay.pacingTarget,70);assert.equal(header.providerAdmission.maxCalls,70);
  evictFixtureSession(directory,state.sessionId);const again=await socialOperation({operation:'start',run:source},{...d,admission:{maxCalls:350}});assert.equal(again.world.genesis.input.swarm?.multiDay?.pacingTarget,70);assert.equal(again.admission.maxCalls,70);
  for(const policy of [swarmPolicy(50),deepSwarmPolicy(50)]){const old=await socialOperation({operation:'start',run:await phase4eSource('old-explicit-'+crypto.randomUUID())},{...d,swarm:policy,admission:{maxCalls:1}});assert.equal(old.world.genesis.config.steps,80);assert.equal(old.world.genesis.input.swarm?.multiDay,undefined);}
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('a zero trusted multiday grant cannot advance clock, create skipped attempts, or read environment authority on restore',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-zero-'));const original=process.env.SOCIAL_PROVIDER_MAX_CALLS;try{
  const source=await phase4eSource('zero-multiday-'+crypto.randomUUID()),mock=phase4eFetcher();
  const d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),fetcher:mock.fetcher,admission:{maxCalls:0}};
  const initial=await socialOperation({operation:'start',run:source},d),next=await socialOperation({operation:'step',sessionId:initial.sessionId,revision:initial.revision},d);
  assert.equal(next.admission.status,'budget-limited');assert.equal(next.world.tick,0);assert.equal(next.revision,0);assert.equal(next.world.hybrid!.records.length,0);assert.equal(next.world.hybrid!.pending,null);
  evictFixtureSession(directory,next.sessionId);process.env.SOCIAL_PROVIDER_MAX_CALLS='invalid-now';const restored=await readSocialSession(next.sessionId,{...d,admission:undefined});assert.deepEqual(restored.world,next.world);assert.equal(restored.admission.maxCalls,0);assert.equal(mock.calls.length,0);
 }finally{if(original===undefined)delete process.env.SOCIAL_PROVIDER_MAX_CALLS;else process.env.SOCIAL_PROVIDER_MAX_CALLS=original;rmSync(directory,{recursive:true,force:true});}
});

test('trusted process token, cost and deadline admission is frozen once and cannot be enlarged by later environment changes',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-process-grant-'));
 const keys=['SOCIAL_PROVIDER_MAX_CALLS','SOCIAL_PROVIDER_TOKEN_LIMIT','SOCIAL_PROVIDER_COST_USD','SOCIAL_PROVIDER_DEADLINE_MS'] as const,original=keys.map(key=>process.env[key]);
 try{
  const deadline=Date.now()+90*60_000;for(const [key,value]of Object.entries({SOCIAL_PROVIDER_MAX_CALLS:'70',SOCIAL_PROVIDER_TOKEN_LIMIT:'1234567',SOCIAL_PROVIDER_COST_USD:'0.7',SOCIAL_PROVIDER_DEADLINE_MS:String(deadline)}))process.env[key]=value;
  const source=await phase4eSource('environment-grant-'+crypto.randomUUID()),mock=phase4eFetcher(),d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),fetcher:mock.fetcher};
  const state=await socialOperation({operation:'start',run:source},d);assert.equal(state.admission.maxCalls,70);assert.equal(state.admission.reservedTokens,1234567);assert.equal(state.admission.costLimitUsd,0.7);assert.equal(state.admission.deadlineMs,deadline);
  const first=JSON.parse(readFileSync(join(directory,state.sessionId+'.jsonl'),'utf8').split('\n')[0]);assert.deepEqual(first.providerAdmission,{maxCalls:70,reservedTokens:1234567,costUsd:0.7,deadlineMs:deadline});
  evictFixtureSession(directory,state.sessionId);for(const key of keys)process.env[key]='invalid-after-start';const restored=await readSocialSession(state.sessionId,d);assert.deepEqual(restored.admission,state.admission);assert.equal(mock.calls.length,0);
 }finally{keys.forEach((key,i)=>{if(original[i]===undefined)delete process.env[key];else process.env[key]=original[i];});rmSync(directory,{recursive:true,force:true});}
});

test('historical quick journal restoration derives authority from its frozen world rather than the new live process grant',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-legacy-env-')),keys=['SOCIAL_PROVIDER_MAX_CALLS','SOCIAL_PROVIDER_TOKEN_LIMIT','SOCIAL_PROVIDER_COST_USD','SOCIAL_PROVIDER_DEADLINE_MS'] as const,original=keys.map(key=>process.env[key]);
 try{
  const source=await phase4eSource('quick-restore-'+crypto.randomUUID()),mock=phase4eFetcher(),d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),swarm:swarmPolicy(50),fetcher:mock.fetcher};
  const old=await socialOperation({operation:'start',run:source},d);assert.equal(old.world.genesis.config.steps,80);const historicalId=crypto.randomUUID();
  await appendSwarmJournal({id:historicalId,runId:source.runId,world:old.world,revision:0,reservation:null},directory);
  process.env.SOCIAL_PROVIDER_MAX_CALLS='350';process.env.SOCIAL_PROVIDER_TOKEN_LIMIT='16000000';process.env.SOCIAL_PROVIDER_COST_USD='1';process.env.SOCIAL_PROVIDER_DEADLINE_MS=String(Date.now()+90*60_000);
  const restored=await readSocialSession(historicalId,d);assert.deepEqual(restored.world,old.world);assert.equal(restored.admission.maxCalls,64);assert.equal(restored.admission.reservedTokens,2400000);assert.equal(restored.admission.costLimitUsd,1.5);assert.equal(restored.admission.deadlineMs,null);assert.equal(mock.calls.length,0);
 }finally{keys.forEach((key,i)=>{if(original[i]===undefined)delete process.env[key];else process.env[key]=original[i];});rmSync(directory,{recursive:true,force:true});}
});

test('a newly created explicit quick session preserves a zero process grant through its first header and cold restoration',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-quick-zero-')),keys=['SOCIAL_PROVIDER_MAX_CALLS','SOCIAL_PROVIDER_TOKEN_LIMIT','SOCIAL_PROVIDER_COST_USD','SOCIAL_PROVIDER_DEADLINE_MS'] as const,original=keys.map(key=>process.env[key]);
 try{
  const deadline=Date.now()+90*60_000;process.env.SOCIAL_PROVIDER_MAX_CALLS='0';process.env.SOCIAL_PROVIDER_TOKEN_LIMIT='100000';process.env.SOCIAL_PROVIDER_COST_USD='0.1';process.env.SOCIAL_PROVIDER_DEADLINE_MS=String(deadline);
  const source=await phase4eSource('quick-zero-'+crypto.randomUUID()),mock=phase4eFetcher(),d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),swarm:swarmPolicy(50),fetcher:mock.fetcher};
  const initial=await socialOperation({operation:'start',run:source},d);assert.equal(initial.admission.maxCalls,0);assert.equal(initial.admission.status,'budget-limited');
  const state=await socialOperation({operation:'step',sessionId:initial.sessionId,revision:initial.revision},d);assert.equal(state.admission.maxCalls,0);assert.equal(mock.calls.length,0);
  evictFixtureSession(directory,state.sessionId);process.env.SOCIAL_PROVIDER_MAX_CALLS='350';process.env.SOCIAL_PROVIDER_TOKEN_LIMIT='16000000';process.env.SOCIAL_PROVIDER_COST_USD='1';process.env.SOCIAL_PROVIDER_DEADLINE_MS=String(deadline+60_000);
  const restored=await readSocialSession(state.sessionId,d);assert.deepEqual(restored.world,state.world);assert.equal(restored.admission.maxCalls,0);assert.equal(restored.admission.reservedTokens,100000);assert.equal(restored.admission.costLimitUsd,0.1);assert.equal(restored.admission.deadlineMs,deadline);assert.equal(mock.calls.length,0);
  const header=JSON.parse(readFileSync(join(directory,state.sessionId+'.jsonl'),'utf8').split('\n')[0]);assert.equal(header.providerAdmission.maxCalls,0);
 }finally{keys.forEach((key,i)=>{if(original[i]===undefined)delete process.env[key];else process.env[key]=original[i];});rmSync(directory,{recursive:true,force:true});}
});

test('repeating a pending multiday reservation that cannot fit trusted tokens does not append duplicate journal rows',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-pending-budget-'));try{
  const source=await phase4eSource('pending-token-budget-'+crypto.randomUUID()),mock=phase4eFetcher(),d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),fetcher:mock.fetcher,admission:{maxCalls:70,reservedTokens:1}};
  let state=await socialOperation({operation:'start',run:source},d);for(let i=0;i<100&&!state.world.hybrid!.pending;i++)state=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},d);
  assert.ok(state.world.hybrid!.pending);assert.equal(state.admission.status,'budget-limited');const bytes=statSync(join(directory,state.sessionId+'.jsonl')).size,revision=state.revision;
  for(let i=0;i<3;i++)state=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},d);
  assert.equal(statSync(join(directory,state.sessionId+'.jsonl')).size,bytes);assert.equal(state.revision,revision);assert.equal(mock.calls.length,0);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('a real periodic multiday material checkpoint capacity failure stops managed dispatch and preserves its accepted journal',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-real-checkpoint-full-')),jobs=join(directory,'jobs');let injected:ReturnType<typeof t.mock.method>|undefined;
 try{
  const source=await phase4eSource('real-checkpoint-capacity-'+crypto.randomUUID()),mock=phase4eFetcher(),d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),fetcher:mock.fetcher,swarm:multiDaySwarmPolicy(50,70,160),admission:{maxCalls:70}};
  let state=await socialOperation({operation:'start',run:source},d);const snapshot=(s:SocialState):CoordinatorProgress=>({profileId:s.world.genesis.input.swarm!.multiDay!.profileId,opportunities:s.world.hybrid!.records.length,revision:s.revision,tick:s.world.tick,totalSteps:s.world.genesis.config.steps,acceptedDecisions:s.world.hybrid!.records.filter(r=>r.status==='accepted').length,participatingAgents:new Set(s.world.hybrid!.records.filter(r=>r.status==='accepted').map(r=>r.context.actor.id)).size,capacity:350,admittedCalls:70,calls:s.admission.calls,completed:false,budgetLimited:s.admission.status==='budget-limited'});
  const original=fs.openSync;injected=t.mock.method(fs,'openSync',((...args:Parameters<typeof fs.openSync>)=>{if(String(args[0]).includes('.materialized.json.'))throw Object.assign(Error('PRIVATE_DISK_SENTINEL'),{code:'ENOSPC'});return (original as any)(...args);}) as typeof fs.openSync);syncBuiltinESMExports();
  const driver:CoordinatorDriver={inspect:async()=>{state=await readSocialSession(state.sessionId,d);return snapshot(state);},step:async signal=>{state=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},d,signal);return snapshot(state);},checkpoint:async()=>{await checkpointSocialSession(state.sessionId,d);},publish:async()=>{}};
  await startCoordinator({runId:source.runId,directory:jobs,driver});let status=coordinatorStatus(source.runId,jobs);const deadline=Date.now()+60_000;
  while(status?.status==='running'&&Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,10));status=coordinatorStatus(source.runId,jobs);}
  assert.equal(status?.status,'capacity-limited');assert.equal(status?.reason,'STORAGE_CAPACITY');assert.equal(status?.acceptedDecisions,50);assert.equal(mock.calls.length,50);assert.doesNotMatch(JSON.stringify(status),/PRIVATE_DISK_SENTINEL/);
  await assert.rejects(()=>checkpointSocialSession(state.sessionId,d),(error:NodeJS.ErrnoException)=>error.code==='ENOSPC');
  const restored=await readSocialSession(state.sessionId,d);assert.equal(restored.world.hybrid!.records.filter(r=>r.status==='accepted').length,50);await new Promise(resolve=>setTimeout(resolve,30));assert.equal(mock.calls.length,50);
 }finally{injected?.mock.restore();syncBuiltinESMExports();await stopCoordinators(jobs);rmSync(directory,{recursive:true,force:true});}
});
