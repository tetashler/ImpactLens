import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';
import {replacePrivateCheckpoint} from '../../server/society/storage.ts';

const evidence=resolve('tmp/citizen-menu-storage-20261101/storage');mkdirSync(evidence,{recursive:true});
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const fixture=()=>mkdtempSync(join(evidence,'fixture-'));
async function api(){const value=await import('../../server/society/storage-admission.ts').catch(()=>null);assert.ok(value?.reserveStorageAdmission,'durable bounded storage admission is required');return value;}

test('sixteen retained claims saturate admission without reusing an attempt or changing historical files',async()=>{
 const a=await api(),base=fixture(),old=join(base,'accepted-private');mkdirSync(old);const retained=JSON.stringify({execution:{attemptId:'retained-history'}});writeFileSync(join(old,'old.json'),retained);
 const claims=[];for(let i=0;i<16;i++)claims.push(a.reserveStorageAdmission('attempt-'+i,hash('request-'+i),base));
 assert.equal(new Set(claims.map(c=>c.sessionId)).size,16);assert.throws(()=>a.reserveStorageAdmission('overflow',hash('overflow'),base),/STORAGE_ADMISSION_CAPACITY/);
 assert.throws(()=>a.reserveStorageAdmission('attempt-0',hash('request-0'),base),/STORAGE_ADMISSION_DUPLICATE/);
 assert.equal(readFileSync(join(old,'old.json'),'utf8'),retained);assert.equal(readdirSync(old).length,1);
 assert.equal(readdirSync(join(base,'session-store-v2/admission')).filter(s=>s.endsWith('.claim')).length,16);
});

test('a corrupt claim anywhere fails closed before consuming another slot',async()=>{
 const a=await api(),base=fixture();a.reserveStorageAdmission('first',hash('first'),base);
 const root=join(base,'session-store-v2/admission');writeFileSync(join(root,'slot-15.claim'),'');
 assert.throws(()=>a.reserveStorageAdmission('second',hash('second'),base),/STORAGE_ADMISSION_CORRUPT/);assert.equal(readdirSync(root).filter(s=>s.endsWith('.claim')).length,2);
});

test('bindings are immutable, bounded and reject crossed attempts or namespaces',async()=>{
 const a=await api(),base=fixture(),claim=a.reserveStorageAdmission('bind-a',hash('bind-a'),base),run={runId:'run-binding-fixture',attemptId:'bind-a'};
 a.bindStorageAdmission(claim,run,base);assert.equal(a.findStorageBinding(run.runId,base)!.claim.sessionId,claim.sessionId);
 a.bindStorageAdmission(claim,run,base);assert.throws(()=>a.bindStorageAdmission(claim,{...run,runId:'run-crossed'},base),/STORAGE_ADMISSION_BINDING/);
 assert.throws(()=>a.bindStorageAdmission(claim,{...run,attemptId:'bind-b'},base),/STORAGE_ADMISSION_BINDING/);
 assert.throws(()=>a.bindStorageAdmission(claim,run,fixture()),/STORAGE_ADMISSION/);
 assert.ok(!readFileSync(join(base,'session-store-v2/admission/slot-00.claim'),'utf8').includes('bind-a'));
});

test('initialization intent survives restart and cannot authorize a second personality generation',async()=>{
 const a=await api(),base=fixture(),claim=a.reserveStorageAdmission('init-a',hash('init-a'),base),run={runId:'run-init-fixture',attemptId:'init-a'};a.bindStorageAdmission(claim,run,base);
 a.beginStorageInitialization(claim,run.runId,base);assert.throws(()=>a.beginStorageInitialization(claim,run.runId,base),/STORAGE_INITIALIZATION_UNCERTAIN/);
 assert.equal(readdirSync(join(base,'session-store-v2/admission')).filter(s=>s.endsWith('.initialization')).length,1);
});

async function workers(base:string,attempts:string[],mode?:string){
 const path=resolve('scripts/testing/storage-admission-worker.ts');
 const children=attempts.map(attempt=>spawn(process.execPath,['--import',pathToFileURL(resolve('scripts/testing/offline-network.mjs')).href,path,base,attempt,...(mode?[mode]:[])],{cwd:process.cwd(),stdio:['ignore','pipe','pipe','ipc'],windowsHide:true}));
 const ready=children.map(child=>new Promise<void>((yes,no)=>{child.once('error',no);child.once('message',()=>yes());child.once('exit',code=>{if(code)no(Error('WORKER_START_'+code));});}));
 await Promise.all(ready);const outcomes=children.map(child=>new Promise<any>((yes,no)=>{let out='',error='';child.stdout!.on('data',s=>out+=s);child.stderr!.on('data',s=>error+=s);child.once('error',no);child.once('exit',code=>code?no(Error('WORKER_'+code+' '+error)):yes(JSON.parse(out)));}));
 children.forEach(child=>child.send('claim'));return Promise.all(outcomes);
}
test('two processes competing for the final slot admit exactly one distinct attempt',async()=>{
 const a=await api(),base=fixture();for(let i=0;i<15;i++)a.reserveStorageAdmission('pre-'+i,hash('pre-'+i),base);
 const out=await workers(base,['race-a','race-b']);assert.equal(out.filter(v=>v.admitted).length,1);assert.equal(readdirSync(join(base,'session-store-v2/admission')).filter(s=>s.endsWith('.claim')).length,16);
});
test('two processes with the same attempt never obtain two durable claims',async()=>{
 await api();const base=fixture(),out=await workers(base,['same-attempt','same-attempt']);assert.equal(out.filter(v=>v.admitted).length,1);
 assert.equal(readdirSync(join(base,'session-store-v2/admission')).filter(s=>s.endsWith('.claim')).length,1);
});

test('valid bounded attempt identifiers keep their existing punctuation contract',async()=>{
 const a=await api(),base=fixture(),claim=a.reserveStorageAdmission('attempt.valid:revision-1',hash('valid'),base);assert.equal(claim.slot,0);
});

test('a failed claim fsync consumes the attempt and can never authorize dispatch on retry',async t=>{
 const a=await api(),base=fixture(),original=fs.fsyncSync;const fault=t.mock.method(fs,'fsyncSync',()=>{throw Object.assign(Error('FIXTURE_FSYNC'),{code:'EIO'});});syncBuiltinESMExports();
 try{assert.throws(()=>a.reserveStorageAdmission('failed-sync',hash('failed-sync'),base),{code:'EIO'});}finally{fault.mock.restore();syncBuiltinESMExports();}
 assert.equal(fs.fsyncSync,original);assert.throws(()=>a.reserveStorageAdmission('failed-sync',hash('failed-sync'),base),/STORAGE_ADMISSION_DUPLICATE/);
 const next=a.reserveStorageAdmission('next-independent',hash('next-independent'),base);assert.equal(next.slot,1);
});

test('a retained legacy v1 attempt blocks a new claim without rewriting its archive',async()=>{
 const a=await api(),base=fixture(),old=join(base,'accepted-private');mkdirSync(old);const bytes=JSON.stringify({execution:{attemptId:'paid-v1-attempt'}});writeFileSync(join(old,'retained.json'),bytes);
 assert.throws(()=>a.reserveStorageAdmission('paid-v1-attempt',hash('new-request'),base),/STORAGE_ADMISSION_DUPLICATE/);assert.equal(readFileSync(join(old,'retained.json'),'utf8'),bytes);
});
test('retained uncertain journal evidence blocks further admission without deletion',async()=>{
 for(const name of ['fixture.jsonl.incomplete-owned.private']){
  const a=await api(),base=fixture();a.reserveStorageAdmission('first',hash('first'),base);const artifact=join(base,'session-store-v2',name);writeFileSync(artifact,'RETAINED_UNCERTAIN_EVIDENCE');
  assert.throws(()=>a.reserveStorageAdmission('second',hash('second'),base),/STORAGE_ADMISSION_ARTIFACT/);assert.equal(readFileSync(artifact,'utf8'),'RETAINED_UNCERTAIN_EVIDENCE');
 }
});
test('a normal atomic checkpoint pending during retry cannot stop concurrent admission',async()=>{
 const a=await api(),base=fixture();a.reserveStorageAdmission('first',hash('first'),base);const root=join(base,'session-store-v2'),path=join(root,'fixture.checkpoint');writeFileSync(path,'prior');let release=false;
 const pending=replacePrivateCheckpoint(path,'next',(from,to)=>{if(!release)throw Object.assign(Error('NORMAL_RETRY'),{code:'EBUSY'});fs.renameSync(from,to);});
 try{
  assert.equal(readdirSync(root).filter(f=>f.endsWith('.pending')).length,1);assert.equal(readFileSync(path,'utf8'),'prior');
  assert.doesNotThrow(()=>a.inspectStorageAdmission(base));const second=a.reserveStorageAdmission('second',hash('second'),base);assert.equal(second.slot,1);
 }finally{release=true;await pending;}
 assert.equal(readFileSync(path,'utf8'),'next');assert.equal(readdirSync(root).filter(f=>f.endsWith('.pending')).length,0);
});
test('unexpected ancillary file accumulation stops admission at the bounded inspection limit',async()=>{
 const a=await api(),base=fixture();a.reserveStorageAdmission('first',hash('first'),base);const root=join(base,'session-store-v2');for(let i=0;i<256;i++)writeFileSync(join(root,'ancillary-'+i),'x');
 assert.throws(()=>a.reserveStorageAdmission('second',hash('second'),base),/STORAGE_ADMISSION_FILES/);
});
test('aggregate apparent bytes stop admission without allocating a huge disk fixture',async t=>{
 const a=await api(),base=fixture();a.reserveStorageAdmission('first',hash('first'),base);const path=join(base,'session-store-v2','oversized.fixture');writeFileSync(path,'x');const original=fs.lstatSync;
 const fault=t.mock.method(fs,'lstatSync',((...args:Parameters<typeof fs.lstatSync>)=>{const value=(original as any)(...args);return String(args[0])===path?Object.assign(value,{size:3*1024*1024*1024+1}):value;}) as typeof fs.lstatSync);syncBuiltinESMExports();
 try{assert.throws(()=>a.reserveStorageAdmission('second',hash('second'),base),/STORAGE_ADMISSION_BYTES/);}finally{fault.mock.restore();syncBuiltinESMExports();}
});
test('a new process reconnects a journal interrupted before index creation without initialization',async()=>{
 const a=await api(),base=fixture(),{phase4eSource}=await import('../../../scripts/testing/phase4e-fixture.ts'),run=await phase4eSource('process-recovery-fixture'),claim=a.reserveStorageAdmission(run.attemptId,hash('process-recovery'),base);
 a.bindStorageAdmission(claim,run,base);writeFileSync(join(base,'accepted-run.fixture'),JSON.stringify(run));
 assert.deepEqual(await workers(base,['ignored'],'journal-boundary'),[{interrupted:true}]);
 assert.deepEqual(await workers(base,['ignored'],'recover'),[{restored:true,sessionId:claim.sessionId,regenerations:0,journalUnchanged:true}]);
});
