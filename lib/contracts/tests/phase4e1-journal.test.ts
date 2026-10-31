import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,appendFileSync,readFileSync,writeFileSync,statSync,truncateSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {appendSwarmJournal,readSwarmJournal,recoverIncompleteSwarmTail,swarmStorageLimits,assertSwarmJournalAdmission} from '../../server/society/swarm-journal.ts';
import {writeMaterialCheckpoint,readMaterialCheckpoint,materialCheckpointPath} from '../../server/society/checkpoint.ts';
import {withSocialOwner} from '../../server/society/session-lock.ts';

const input=(deep:boolean)=>({swarm:{activeAgents:50,...(deep?{deep:{policy:'deep-swarm-v1',maxDecisions:350}}:{})},hybrid:{maxCalls:deep?350:64}} as any);
const state=(deep:boolean)=>({id:'10000000-0000-0000-0000-000000000001',runId:'private-fixture',revision:0,world:{version:1,genesis:{input:input(deep)},tick:0,hybrid:{records:[],pending:null}} as any,reservation:null});

test('deep format2 admits its frozen capacity while legacy record bounds remain unchanged',async()=>{
 const root=mkdtempSync(join(tmpdir(),'deep-journal-'));try{
  const s=state(true);await appendSwarmJournal(s,root);s.world.hybrid.records=Array.from({length:350},(_,i)=>({id:'fixture-'+i}));s.revision++;
  await appendSwarmJournal(s,root);const saved=readSwarmJournal(join(root,s.id+'.jsonl'));assert.equal(saved.hybrid.records.length,350);assert.equal(swarmStorageLimits(input(false)).decisions,128);assert.equal(swarmStorageLimits(input(true)).decisions,350);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('complete bad-hash final JSON cannot masquerade as an incomplete append',async()=>{
 const root=mkdtempSync(join(tmpdir(),'deep-badhash-'));try{
  const s=state(true);await appendSwarmJournal(s,root);const path=join(root,s.id+'.jsonl'),raw=readFileSync(path,'utf8');
  appendFileSync(path,JSON.stringify({format:2,previous:'wrong',hash:'wrong',records:[]}));
  await assert.rejects(()=>recoverIncompleteSwarmTail(path),/SOCIAL_JOURNAL_HASH/);assert.equal(readFileSync(path,'utf8').startsWith(raw),true);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('oversized rows and projected journal growth fail before a provider reservation is written',async()=>{
 const root=mkdtempSync(join(tmpdir(),'deep-size-'));try{
  const s=state(true);await appendSwarmJournal(s,root);const path=join(root,s.id+'.jsonl'),before=statSync(path).size;
  s.world.hybrid.pending={privateFixture:'x'.repeat(4*1024*1024)};assert.throws(()=>assertSwarmJournalAdmission(s,root),/SOCIAL_STORAGE_LIMIT/);assert.equal(statSync(path).size,before);
  s.world.hybrid.pending=null;truncateSync(path,swarmStorageLimits(input(true)).journalBytes-1024);assert.throws(()=>assertSwarmJournalAdmission(s,root),/SOCIAL_STORAGE_LIMIT/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('oversized material checkpoints preserve the previous valid optimisation',async()=>{
 const root=mkdtempSync(join(tmpdir(),'deep-cpsize-'));try{
  const s=state(true);await appendSwarmJournal(s,root);await writeMaterialCheckpoint(s,root);const path=materialCheckpointPath(root,s.id),before=readFileSync(path);
  s.world.privateFixture='x'.repeat(swarmStorageLimits(input(true)).checkpointBytes);await assert.rejects(()=>writeMaterialCheckpoint(s,root),/SOCIAL_CHECKPOINT_LIMIT/);assert.equal(readFileSync(path).equals(before),true);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('materialised deep state is bound to a verified journal frame and corruption falls back',async()=>{
 const root=mkdtempSync(join(tmpdir(),'deep-material-'));try{
  const s=state(true);await appendSwarmJournal(s,root);await writeMaterialCheckpoint(s,root);const j=readSwarmJournal(join(root,s.id+'.jsonl'));
  assert.deepEqual(readMaterialCheckpoint(root,j),s.world);const path=materialCheckpointPath(root,s.id),saved=readFileSync(path,'utf8');
  writeFileSync(path,saved.replace('deep-checkpoint-v1','invalid-checkpoint'));assert.equal(readMaterialCheckpoint(root,j),null);
  writeFileSync(path,saved.replace('"revision":0','"revision":99'));assert.equal(readMaterialCheckpoint(root,j),null);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('concurrent cold owners are serialised and lease cleanup is scoped to the owned marker',async()=>{
 const root=mkdtempSync(join(tmpdir(),'deep-owner-'));try{
  let active=0,peak=0;const order:number[]=[];
  await Promise.all(Array.from({length:6},(_,i)=>withSocialOwner(root,'same-session',async()=>{peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,3));order.push(i);active--;})));
  assert.equal(peak,1);assert.deepEqual(order,[0,1,2,3,4,5]);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('only a verified incomplete final deep append is recovered and its private evidence is retained',async()=>{
 const root=mkdtempSync(join(tmpdir(),'deep-tail-'));try{
  const s=state(true);await appendSwarmJournal(s,root);const path=join(root,s.id+'.jsonl'),original=readFileSync(path);appendFileSync(path,'{"format":2,"privateFixture":"PRIVATE_TAIL_SENTINEL');
  assert.throws(()=>readSwarmJournal(path),/SOCIAL_STORAGE_INCOMPLETE/);
  const recovered=await recoverIncompleteSwarmTail(path);assert.ok(recovered.evidencePath);assert.equal(readFileSync(path).equals(original),true);assert.ok(statSync(recovered.evidencePath!).size>0);assert.equal(readSwarmJournal(path).revision,0);
  const bad=readFileSync(path,'utf8').replace('private-fixture','changed-fixture');writeFileSync(path,bad);appendFileSync(path,'{"unfinished":');await assert.rejects(()=>recoverIncompleteSwarmTail(path),/SOCIAL_JOURNAL_HASH/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('legacy incomplete journals remain fail-closed and projected rows cannot exceed capacity',async()=>{
 const root=mkdtempSync(join(tmpdir(),'legacy-tail-'));try{
  const s=state(false);await appendSwarmJournal(s,root);const path=join(root,s.id+'.jsonl');appendFileSync(path,'{"unfinished":');await assert.rejects(()=>recoverIncompleteSwarmTail(path),/SOCIAL_STORAGE_INCOMPLETE/);
  const d=state(true);d.id='20000000-0000-0000-0000-000000000001';await appendSwarmJournal(d,root);d.world.hybrid.records=Array.from({length:351},(_,i)=>({id:'x'+i}));await assert.rejects(()=>appendSwarmJournal(d,root),/SOCIAL_JOURNAL_ORDER/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
