import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

test('operator CLI requires explicit rotation and verifies retained fixture bytes',{timeout:60000},()=>{
 const fixtures=resolve('tmp/storage-lifecycle-20261106');mkdirSync(fixtures,{recursive:true});
 const base=mkdtempSync(join(fixtures,'cli-')),namespace=join(base,'session-store-v2');
 mkdirSync(namespace);writeFileSync(join(namespace,'evidence.json'),'immutable fixture evidence');
 const cli=(...args:string[])=>spawnSync(process.execPath,['--import',pathToFileURL(resolve('scripts/testing/offline-network.mjs')).href,resolve('scripts/storage.ts'),...args,'--root',base],{encoding:'utf8',windowsHide:true,timeout:20000});
 const initial=cli('status');assert.equal(initial.status,0,initial.stderr);assert.equal(JSON.parse(initial.stdout).available,32);
 const rejected=cli('rotate');assert.equal(rejected.status,1);assert.match(rejected.stderr,/\{"error":"STORAGE_LIFECYCLE_CONFIRM"\}/);
 assert.equal(readFileSync(join(namespace,'evidence.json'),'utf8'),'immutable fixture evidence');
 const rotated=cli('rotate','--confirm');assert.equal(rotated.status,0,rotated.stderr);const archive=JSON.parse(rotated.stdout);assert.match(archive.id,/^[a-f0-9-]{36}$/);
 const verified=cli('verify',archive.id);assert.equal(verified.status,0,verified.stderr);assert.equal(JSON.parse(verified.stdout).verified,true);
 const retained=join(base,'.storage-lifecycle','periods',archive.id,'namespace','evidence.json');
 assert.equal(readFileSync(retained,'utf8'),'immutable fixture evidence');
 writeFileSync(retained,'corrupt immutable evidence');
 const corrupt=cli('verify',archive.id);assert.equal(corrupt.status,1);assert.match(corrupt.stderr,/STORAGE_ARCHIVE_VERIFY/);
 const completed=cli('rotate','--confirm','--complete');assert.equal(completed.status,1);assert.match(completed.stderr,/STORAGE_LIFECYCLE_NO_TRANSACTION/);
});
