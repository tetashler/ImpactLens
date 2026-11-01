import '../../../scripts/testing/offline-network.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {handlePublicExplore} from '../../server/society/public-service.ts';
for(const kind of ['archives','sessions'])test('a full '+kind+' namespace rejects new Explore before provider expenditure',async()=>{
 mkdirSync('tmp/citizen-hybrid-storage-tests',{recursive:true});const directory=mkdtempSync(join(process.cwd(),'tmp/citizen-hybrid-storage-tests/capacity-')),storeDirectory=join(directory,'accepted'),sessions=join(directory,'sessions');mkdirSync(storeDirectory);mkdirSync(sessions);
 for(let i=0;i<64;i++)writeFileSync(join(kind==='archives'?storeDirectory:sessions,'fixture-'+i+(kind==='archives'?'.json':'.index')),'CAPACITY_FIXTURE_ONLY');
 let requests=0;const fetcher:typeof fetch=async()=>{requests++;throw Error('No fixture provider should dispatch');};
 const request=new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:'storage-fixture',request:{version:1,question:'What if a station is added?',geometry:{version:1,scenarioId:'capacity',features:[]},geometryRevision:1}})});
 const response=await handlePublicExplore(request,{enabled:true,key:'offline-only',fetcher,groundingFetcher:fetcher},{directory:sessions,storeDirectory});assert.equal(response.status,503);assert.equal((await response.json()).error,'PRIVATE_STORAGE_CAPACITY');assert.equal(requests,0);
});
