import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {handleAssumptionRequest} from '../../server/assumption-review/service.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';
import {rotateStorage,STORAGE_ARCHIVE_LIMIT,STORAGE_ARCHIVE_BYTE_LIMIT} from '../../server/society/storage-lifecycle.ts';
import {getStorageCapacity} from '../../server/society/storage-admission.ts';
const fixtures=resolve('tmp/storage-lifecycle-20261106');mkdirSync(fixtures,{recursive:true});
const fixture=()=>mkdtempSync(join(fixtures,'guard-'));

test('pending-review planning rechecks lifecycle before each provider dispatch',async()=>{
 const base=fixture(),provider=mockDynamicProvider(worldFixtures()[0],()=>{
  writeFileSync(join(base,'.storage-lifecycle','maintenance.lock'),JSON.stringify({version:1,pid:process.pid}));
 });
 const response=await handleAssumptionRequest(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({version:3,operation:'prepare',attemptId:'review-dispatch-guard',request:worldFixtures()[0].request})}),{enabled:true,key:'offline-only',groundingKey:'',fetcher:provider.fetcher},{storageBase:base,skipSocialInitialization:true});
 assert.notEqual(response.status,200);assert.equal(provider.counts().calls,1,'No second planning dispatch is allowed after maintenance appears.');
 assert.equal(getStorageCapacity(base).status,'blocked');
});

test('sixteen archived periods remain readable and the next rotation refuses without altering registry',()=>{
 const base=fixture();mkdirSync(join(base,'session-store-v2'));
 const ids:string[]=[];for(let i=0;i<STORAGE_ARCHIVE_LIMIT;i++)ids.push(rotateStorage(base,{confirm:true}).id);
 const path=join(base,'.storage-lifecycle','registry.json'),before=readFileSync(path,'utf8');
 assert.equal(getStorageCapacity(base).archivedPeriods,16);assert.equal(getStorageCapacity(base).available,32);
 assert.throws(()=>rotateStorage(base,{confirm:true}),/STORAGE_ARCHIVE_LIMIT/);
 assert.equal(readFileSync(path,'utf8'),before);assert.equal(new Set(ids).size,16);
});

test('aggregate archived bytes beyond the retained limit block admission inspection',()=>{
 const base=fixture();mkdirSync(join(base,'session-store-v2'));rotateStorage(base,{confirm:true});
 const path=join(base,'.storage-lifecycle','registry.json'),registry=JSON.parse(readFileSync(path,'utf8'));
 registry.archives[0].bytes=STORAGE_ARCHIVE_BYTE_LIMIT+1;writeFileSync(path,JSON.stringify(registry));
 assert.equal(getStorageCapacity(base).status,'blocked');assert.equal(getStorageCapacity(base).reason,'history-limit');
 assert.throws(()=>rotateStorage(base,{confirm:true}),/STORAGE_ARCHIVE_LIMIT/);
});
