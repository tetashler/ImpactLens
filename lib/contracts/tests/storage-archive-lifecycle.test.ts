import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const parent=resolve('tmp/storage-archive-lifecycle');mkdirSync(parent,{recursive:true});
const fixture=()=>mkdtempSync(join(parent,'fixture-'));
function child(base:string,body:string){const out=spawnSync(process.execPath,['--input-type=module','-e',`const base=${JSON.stringify(base)};${body}`],{cwd:process.cwd(),encoding:'utf8',windowsHide:true});assert.equal(out.status,0,out.stderr);return out.stdout;}
test('verified offline rotation frees thirty-two slots but permanently rejects old attempts and retains report identities',async()=>{
 const a=await import('../../server/society/storage-admission.ts'),l=await import('../../server/society/storage-lifecycle.ts'),base=fixture();
 child(base,`const a=await import('./lib/server/society/storage-admission.ts');for(let i=0;i<32;i++)a.reserveStorageAdmission('old-'+i,'a'.repeat(64),base);`);
 const reports=join(base,'accepted-private/report-summaries');mkdirSync(reports,{recursive:true});writeFileSync(join(reports,'retained.json'),'retained report');
 assert.equal(a.getStorageCapacity(base).available,0);const archived=l.rotateStorage(base,{confirm:true});assert.equal(a.getStorageCapacity(base).available,32);
 assert.equal(l.archivedStorageBundles(base).length,1);assert.equal(l.verifyStorageArchive(archived.id,base).id,archived.id);
 assert.throws(()=>a.reserveStorageAdmission('old-0','b'.repeat(64),base),/DUPLICATE/);assert.equal(a.reserveStorageAdmission('new-attempt','b'.repeat(64),base).slot,0);
 assert.equal(readFileSync(join(base,'.storage-lifecycle/periods',archived.id,'artifacts/report-summaries/retained.json'),'utf8'),'retained report');
 assert.throws(()=>l.rotateStorage(base,{confirm:true}),/BUSY/);
});
test('interruption after archive move blocks runtime until explicit completion; tampered archive blocks admission',async()=>{
 const a=await import('../../server/society/storage-admission.ts'),l=await import('../../server/society/storage-lifecycle.ts'),base=fixture();
 child(base,`const a=await import('./lib/server/society/storage-admission.ts');a.reserveStorageAdmission('interrupted','a'.repeat(64),base);`);
 assert.throws(()=>l.rotateStorage(base,{confirm:true,onBoundary:stage=>{if(stage==='namespace-moved')throw Error('FIXTURE_BOUNDARY');}}),/FIXTURE_BOUNDARY/);
 assert.equal(a.getStorageCapacity(base).status,'blocked');assert.throws(()=>l.registerStorageRuntime(base),/TRANSACTION/);
 const archived=l.rotateStorage(base,{confirm:true,complete:true});assert.equal(a.getStorageCapacity(base).available,32);assert.ok(existsSync(join(base,'session-store-v2')));
 const claim=join(base,'.storage-lifecycle/periods',archived.id,'namespace/admission/slot-00.claim');writeFileSync(claim,readFileSync(claim,'utf8').replace('interrupted','corrupt'));
 writeFileSync(claim,'corrupt');assert.throws(()=>a.reserveStorageAdmission('new-after-corrupt','b'.repeat(64),base),/ARCHIVE/);
});
test('every persisted maintenance boundary can finish explicitly without duplicate archival or simulation recovery',async()=>{
 const a=await import('../../server/society/storage-admission.ts'),l=await import('../../server/society/storage-lifecycle.ts');
 for(const boundary of ['transaction-written','namespace-moved','artifact-moved:report-summaries','archive-verified','registry-written','active-created']){
  const base=fixture();child(base,`const a=await import('./lib/server/society/storage-admission.ts');a.reserveStorageAdmission('boundary-attempt','a'.repeat(64),base);`);
  const reports=join(base,'accepted-private/report-summaries');mkdirSync(reports,{recursive:true});writeFileSync(join(reports,'old.json'),'evidence');
  assert.throws(()=>l.rotateStorage(base,{confirm:true,onBoundary:stage=>{if(stage===boundary)throw Error('FIXTURE_BOUNDARY');}}),/FIXTURE_BOUNDARY/);
  assert.equal(a.getStorageCapacity(base).status,'blocked');const result=l.rotateStorage(base,{confirm:true,complete:true});
  assert.equal(l.verifyStorageArchive(result.id,base).claims.length,1);assert.equal(l.archivedStorageBundles(base).length,1);assert.equal(a.getStorageCapacity(base).available,32);
  assert.throws(()=>l.rotateStorage(base,{confirm:true,complete:true}),/NO_TRANSACTION/);assert.equal(l.archivedStorageBundles(base).length,1);
 }
});
test('abrupt process death releases the OS mutex but requires explicit completion of the retained transaction',async()=>{
 const a=await import('../../server/society/storage-admission.ts'),l=await import('../../server/society/storage-lifecycle.ts');
 for(const boundary of ['namespace-moved','registry-written']){
  const base=fixture();child(base,`const a=await import('./lib/server/society/storage-admission.ts');a.reserveStorageAdmission('killed-attempt','a'.repeat(64),base);`);
  const out=spawnSync(process.execPath,['--input-type=module','-e',`const l=await import('./lib/server/society/storage-lifecycle.ts');l.rotateStorage(${JSON.stringify(base)},{confirm:true,onBoundary:stage=>{if(stage===${JSON.stringify(boundary)})process.exit(79);}});`],{cwd:process.cwd(),encoding:'utf8',windowsHide:true});
  assert.equal(out.status,79,out.stderr);assert.equal(a.getStorageCapacity(base).status,'blocked');assert.throws(()=>l.registerStorageRuntime(base),/MAINTENANCE|TRANSACTION/);
  const result=l.rotateStorage(base,{confirm:true,complete:true});assert.equal(l.verifyStorageArchive(result.id,base).claims.length,1);assert.equal(a.getStorageCapacity(base).available,32);
 }
});
test('unknown active claim filenames and untracked archive files fail closed',async()=>{
 const a=await import('../../server/society/storage-admission.ts'),l=await import('../../server/society/storage-lifecycle.ts'),base=fixture();
 const admission=join(base,'session-store-v2/admission');mkdirSync(admission,{recursive:true});writeFileSync(join(admission,'slot-32.claim'),'uncertain evidence');
 assert.equal(a.getStorageCapacity(base).status,'blocked');assert.throws(()=>a.reserveStorageAdmission('unknown-file-attempt','a'.repeat(64),base),/STORAGE_ADMISSION_CORRUPT/);
 const other=fixture();child(other,`const a=await import('./lib/server/society/storage-admission.ts');a.reserveStorageAdmission('tracked','a'.repeat(64),base);`);const archive=l.rotateStorage(other,{confirm:true});writeFileSync(join(other,'.storage-lifecycle/periods',archive.id,'unexpected.txt'),'untracked bytes');
 assert.equal(a.getStorageCapacity(other).status,'blocked');assert.throws(()=>a.reserveStorageAdmission('untracked-file-attempt','a'.repeat(64),other),/STORAGE_/);
});
