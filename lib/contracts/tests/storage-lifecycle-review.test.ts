import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';import {join,resolve} from 'node:path';import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {rotateStorage} from '../../server/society/storage-lifecycle.ts';
import {reserveStorageAdmission,getStorageCapacity} from '../../server/society/storage-admission.ts';
const parent=resolve('tmp/storage-lifecycle-review');mkdirSync(parent,{recursive:true});
const fixture=()=>mkdtempSync(join(parent,'fixture-'));
function reserveInChild(base:string,attempt:string){const body=`const a=await import('./lib/server/society/storage-admission.ts');a.reserveStorageAdmission(${JSON.stringify(attempt)},'a'.repeat(64),${JSON.stringify(base)});`;
 const child=spawnSync(process.execPath,['--input-type=module','--eval',body],{encoding:'utf8',windowsHide:true});assert.equal(child.status,0,child.stderr);return child.pid;}

test('explicit completion can recover a reclaim marker left by a dead completion process',()=>{
 const base=fixture(),deadPid=reserveInChild(base,'reclaim-review');
 assert.throws(()=>rotateStorage(base,{confirm:true,onBoundary:stage=>{if(stage==='transaction-written')throw Error('REVIEW_INTERRUPTION');}}),/REVIEW_INTERRUPTION/);
 const owner=JSON.stringify({version:1,pid:deadPid,nonce:randomUUID()});
 writeFileSync(join(base,'.storage-lifecycle','maintenance.lock'),owner);writeFileSync(join(base,'.storage-lifecycle','maintenance-reclaim.lock'),owner);
 const archive=rotateStorage(base,{confirm:true,complete:true});assert.ok(archive.id);assert.equal(getStorageCapacity(base).available,32);
});

test('an orphaned archived period cannot disappear from duplicate-attempt protection after a registry rollback',()=>{
 const base=fixture();reserveInChild(base,'first-period-attempt');rotateStorage(base,{confirm:true});reserveInChild(base,'second-period-attempt');const second=rotateStorage(base,{confirm:true});
 const path=join(base,'.storage-lifecycle','registry.json'),registry=JSON.parse(readFileSync(path,'utf8'));
 const manifest=JSON.parse(readFileSync(join(base,'.storage-lifecycle','periods',second.id,'manifest.json'),'utf8'));
 registry.archives.pop();registry.generation=manifest.generation;writeFileSync(path,JSON.stringify(registry));
 assert.throws(()=>reserveStorageAdmission('second-period-attempt','b'.repeat(64),base),/STORAGE_/);
 assert.equal(getStorageCapacity(base).status,'blocked');
});

for(const corruption of ['duplicate-nonce','unknown-field'])test(`rotation rejects ${corruption} corruption already rejected by active admission`,()=>{
 const base=fixture();reserveInChild(base,'claim-validation-first');reserveInChild(base,'claim-validation-second');
 const first=JSON.parse(readFileSync(join(base,'session-store-v2/admission/slot-00.claim'),'utf8')),path=join(base,'session-store-v2/admission/slot-01.claim'),second=JSON.parse(readFileSync(path,'utf8'));
 if(corruption==='duplicate-nonce')second.nonce=first.nonce;else second.unexpected='UNKNOWN_FIELD';writeFileSync(path,JSON.stringify(second));
 assert.equal(getStorageCapacity(base).status,'blocked');assert.throws(()=>rotateStorage(base,{confirm:true}),/STORAGE_/);
});
