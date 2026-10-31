import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {socialOperation,readSocialSession,checkpointSocialSession,type SocialDependencies} from '../../server/society/service.ts';
import {deepSwarmPolicy} from '../../society/swarm.ts';
import {replayHybrid,prepareHybridStep} from '../../society/hybrid.ts';
import {appendSwarmJournal,readSwarmJournal} from '../../server/society/swarm-journal.ts';
import {phase4eSource,phase4eCommunication,phase4eFetcher,phase4eProviderFixture,evictFixtureSession} from '../../../scripts/testing/phase4e-fixture.ts';
import {materialCheckpointPath} from '../../server/society/checkpoint.ts';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';

test('trusted provider grant remains separate from deep capacity and cannot be enlarged on restore',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'deep-grant-'));try{
  const source=await phase4eSource('deep-grant-'+crypto.randomUUID()),mock=phase4eFetcher();
  const d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),swarm:deepSwarmPolicy(50),fetcher:mock.fetcher,admission:{maxCalls:2}};
  let s=await socialOperation({operation:'start',run:source},d);
  assert.equal(s.world.genesis.input.hybrid!.maxCalls,350);assert.equal(s.admission.maxCalls,2);
  for(let i=0;i<100&&s.admission.status==='available';i++)s=await socialOperation({operation:'step',sessionId:s.sessionId,revision:s.revision},d);
  assert.equal(mock.calls.length,2);assert.equal(s.admission.status,'budget-limited');assert.equal(s.world.hybrid!.records.length,2);
  const again=await socialOperation({operation:'step',sessionId:s.sessionId,revision:s.revision},d);
  assert.equal(mock.calls.length,2);assert.ok(again.world.hybrid!.pending);assert.equal(again.world.hybrid!.records.length,2);
  await checkpointSocialSession(s.sessionId,d);evictFixtureSession(directory,s.sessionId);
  const restored=await readSocialSession(s.sessionId,{...d,admission:{maxCalls:350}});
  assert.equal(restored.admission.maxCalls,2);assert.equal(restored.admission.calls,2);assert.equal(mock.calls.length,2);
  assert.deepEqual(restored.world,again.world);
  assert.deepEqual(replayHybrid(restored.world.genesis.input,restored.world.tick,restored.world.hybrid!.records,restored.world.hybrid!.pending),restored.world);
  // A corrupt optimisation cannot bypass the complete hash-audited genesis replay.
  writeFileSync(materialCheckpointPath(directory,s.sessionId),'{"corrupt":true}');evictFixtureSession(directory,s.sessionId);
  assert.deepEqual((await readSocialSession(s.sessionId,d)).world,restored.world);
  unlinkSync(materialCheckpointPath(directory,s.sessionId));evictFixtureSession(directory,s.sessionId);
  assert.deepEqual((await readSocialSession(s.sessionId,d)).world,restored.world);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('a warm session detects another owner append before executing a stale revision',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'deep-stale-cache-'));try{
  const source=await phase4eSource('deep-stale-cache-'+crypto.randomUUID()),mock=phase4eFetcher();
  const d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),swarm:deepSwarmPolicy(50),fetcher:mock.fetcher};
  const s=await socialOperation({operation:'start',run:source},d);let pending=s.world;
  for(let i=0;i<80&&!pending.hybrid!.pending;i++)pending=prepareHybridStep(pending);
  const saved=readSwarmJournal(join(directory,s.sessionId+'.jsonl'));
  await appendSwarmJournal({id:s.sessionId,runId:source.runId,world:pending,revision:1,reservation:pending.hybrid!.pending,journalHead:saved.journalHead,journalRecords:saved.journalRecords,providerAdmission:saved.providerAdmission},directory);
  // Do not evict: simulates a second legitimate process that appended between leases.
  await assert.rejects(()=>socialOperation({operation:'step',sessionId:s.sessionId,revision:0},d),/SOCIAL_STALE/);
  const recovered=await readSocialSession(s.sessionId,d);assert.equal(recovered.revision,2);assert.equal(recovered.world.hybrid!.records[0].error,'SOCIAL_UNCERTAIN');assert.equal(mock.calls.length,0);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('seventy-call live-style grant stops a350-capable world and checkpoint-tail replay matches genesis',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'deep-seventy-'));try{
  const source=await phase4eSource('deep-seventy-'+crypto.randomUUID());
  const mock=phase4eFetcher(c=>phase4eProviderFixture(c,c.choices.find(x=>x.action==='post')??c.choices.find(x=>x.action==='message')));
  const d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),swarm:deepSwarmPolicy(50),fetcher:mock.fetcher,admission:{maxCalls:70}};
  let s=await socialOperation({operation:'start',run:source},d);
  for(let i=0;i<500&&s.admission.status==='available'&&s.world.tick<80;i++)s=await socialOperation({operation:'step',sessionId:s.sessionId,revision:s.revision},d);
  assert.equal(s.admission.maxCalls,70);assert.equal(s.world.genesis.input.hybrid!.maxCalls,350);assert.equal(mock.calls.length,70);assert.equal(s.admission.status,'budget-limited');
  assert.ok(existsSync(materialCheckpointPath(directory,s.sessionId)),'automatic checkpoint after50 accepted decisions');
  const checkpoint=JSON.parse(readFileSync(materialCheckpointPath(directory,s.sessionId),'utf8'));assert.equal(checkpoint.recordCount,50);
  evictFixtureSession(directory,s.sessionId);const restored=await readSocialSession(s.sessionId,d);
  assert.deepEqual(restored.world,s.world);assert.equal(mock.calls.length,70);
  assert.deepEqual(replayHybrid(s.world.genesis.input,s.world.tick,s.world.hybrid!.records,s.world.hybrid!.pending),s.world);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('simultaneous cold restore reconciles an interrupted reservation once without dispatch',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'deep-cold-'));try{
  const source=await phase4eSource('deep-cold-'+crypto.randomUUID()),mock=phase4eFetcher();
  const d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),swarm:deepSwarmPolicy(50),fetcher:mock.fetcher};
  const s=await socialOperation({operation:'start',run:source},d);let pending=s.world;
  for(let i=0;i<80&&!pending.hybrid!.pending;i++)pending=prepareHybridStep(pending);
  assert.ok(pending.hybrid!.pending);const saved=readSwarmJournal(join(directory,s.sessionId+'.jsonl'));
  await appendSwarmJournal({id:s.sessionId,runId:source.runId,world:pending,revision:1,reservation:pending.hybrid!.pending,journalHead:saved.journalHead,journalRecords:saved.journalRecords,providerAdmission:saved.providerAdmission},directory);
  evictFixtureSession(directory,s.sessionId);
  const states=await Promise.all(Array.from({length:5},()=>readSocialSession(s.sessionId,d)));
  assert.ok(states.every(x=>x.revision===2));assert.equal(mock.calls.length,0);assert.ok(states.every(x=>x.sessionId===s.sessionId));
  assert.ok(states.every(x=>x.world.hybrid!.records.length===1&&x.world.hybrid!.records[0].error==='SOCIAL_UNCERTAIN'));
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('an isolated invalid model decision consumes its attempt and later valid decisions remain possible',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'deep-rejected-'));try{
  const source=await phase4eSource('deep-rejected-'+crypto.randomUUID()),mock=phase4eFetcher();let dispatched=0;
  const fetcher:typeof fetch=async(url,init)=>{const r=await mock.fetcher(url,init);if(++dispatched!==1)return r;const body=await r.json();const content=JSON.parse(body.choices[0].message.content);content.choiceId='invalid-choice';body.choices[0].message.content=JSON.stringify(content);return Response.json(body);};
  const d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),swarm:deepSwarmPolicy(50),fetcher,admission:{maxCalls:2}};
  let s=await socialOperation({operation:'start',run:source},d);
  for(let i=0;i<100&&s.admission.status==='available';i++)s=await socialOperation({operation:'step',sessionId:s.sessionId,revision:s.revision},d);
  assert.equal(dispatched,2);assert.equal(s.world.hybrid!.records[0].status,'failed');assert.equal(s.world.hybrid!.records[1].status,'accepted');assert.notEqual(s.world.hybrid!.records[0].id,s.world.hybrid!.records[1].id);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('provider identity failure is durable and prevents any later dispatch from that session',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'deep-provider-'));try{
  const source=await phase4eSource('deep-provider-'+crypto.randomUUID()),mock=phase4eFetcher();
  const fetcher:typeof fetch=async(url,init)=>{const r=await mock.fetcher(url,init),body=await r.json();body.provider='UnapprovedProvider';return Response.json(body);};
  const d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),swarm:deepSwarmPolicy(50),fetcher};
  let s=await socialOperation({operation:'start',run:source},d),failed=false;
  for(let i=0;i<100&&!failed;i++){try{s=await socialOperation({operation:'step',sessionId:s.sessionId,revision:s.revision},d);}catch(error){assert.match(String(error),/SOCIAL_PROVIDER_IDENTITY/);failed=true;}}
  assert.equal(failed,true);assert.equal(mock.calls.length,1);s=await readSocialSession(s.sessionId,d);assert.equal(s.world.hybrid!.records[0].error,'AI_PROVIDER_IDENTITY');
  await assert.rejects(()=>socialOperation({operation:'step',sessionId:s.sessionId,revision:s.revision},d),/SOCIAL_FATAL/);assert.equal(mock.calls.length,1);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('completion persistence failure retains the uncertain reservation and never redispatches it',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'deep-completion-fault-'));let injected:ReturnType<typeof t.mock.method>|undefined;
 try{
  const source=await phase4eSource('deep-completion-fault-'+crypto.randomUUID()),mock=phase4eFetcher();
  const d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),swarm:deepSwarmPolicy(50),fetcher:mock.fetcher};
  let s=await socialOperation({operation:'start',run:source},d);const original=fs.writeSync;
  injected=t.mock.method(fs,'writeSync',((...args:Parameters<typeof fs.writeSync>)=>{const payload=args[1];if(typeof payload==='string'&&payload.startsWith('{"format":2,')&&JSON.parse(payload).records.length)throw Object.assign(Error('owned-completion-fault'),{code:'EIO'});return (original as any)(...args);}) as typeof fs.writeSync);syncBuiltinESMExports();
  let failed=false;for(let i=0;i<100&&!failed;i++){try{s=await socialOperation({operation:'step',sessionId:s.sessionId,revision:s.revision},d);}catch(error){assert.equal((error as NodeJS.ErrnoException).code,'EIO');failed=true;}}
  assert.equal(failed,true);assert.equal(mock.calls.length,1);injected.mock.restore();injected=undefined;syncBuiltinESMExports();
  const restored=await readSocialSession(s.sessionId,d);assert.equal(restored.world.hybrid!.records[0].error,'SOCIAL_UNCERTAIN');assert.equal(restored.world.hybrid!.records[0].status,'failed');assert.equal(restored.world.hybrid!.pending,null);assert.equal(mock.calls.length,1);assert.equal(restored.admission.calls,1);assert.ok(restored.admission.costUsd>0);
 }finally{injected?.mock.restore();syncBuiltinESMExports();rmSync(directory,{recursive:true,force:true});}
});

test('an accepted-run index cannot restore a different parent run and journal identities cannot be relabelled',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'deep-run-identity-'));try{
  const sourceA=await phase4eSource('deep-identity-a-'+randomUUID()),sourceB=await phase4eSource('deep-identity-b-'+randomUUID()),mock=phase4eFetcher();
  const d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),swarm:deepSwarmPolicy(50),fetcher:mock.fetcher};
  const a=await socialOperation({operation:'start',run:sourceA},d),b=await socialOperation({operation:'start',run:sourceB},d);
  assert.notEqual(sourceA.runId,sourceB.runId);
  const index=join(directory,createHash('sha256').update(sourceA.runId).digest('hex')+'.index');writeFileSync(index,b.sessionId);
  await assert.rejects(()=>socialOperation({operation:'start',run:sourceA},d),/SOCIAL_RUN_IDENTITY/);
  const copied=randomUUID();writeFileSync(join(directory,copied+'.jsonl'),readFileSync(join(directory,a.sessionId+'.jsonl')));
  await assert.rejects(()=>readSocialSession(copied,d),/SOCIAL_RUN_IDENTITY/);
  const mismatched=randomUUID(),world={...a.world,genesis:{...a.world.genesis,input:{...a.world.genesis.input,runId:'different-parent'}}};
  await appendSwarmJournal({id:mismatched,runId:sourceA.runId,world,revision:0,reservation:null},directory);
  await assert.rejects(()=>readSocialSession(mismatched,d),/SOCIAL_RUN_IDENTITY/);assert.equal(mock.calls.length,0);
  assert.equal((await readSocialSession(a.sessionId,d)).world.genesis.input.runId,sourceA.runId);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
