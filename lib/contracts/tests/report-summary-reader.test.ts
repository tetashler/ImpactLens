import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {handlePublicExplore,readPublicReportSnapshot} from '../../server/society/public-service.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';

function files(directory:string):Record<string,string> {
 const result:Record<string,string>={};
 for(const entry of readdirSync(directory,{withFileTypes:true})) {
  const path=join(directory,entry.name);
  if(entry.isDirectory())for(const [child,value]of Object.entries(files(path)))result[join(entry.name,child)]=value;
  else result[entry.name]=readFileSync(path).toString('base64');
 }
 return result;
}

test('authenticated report snapshot reader returns detached public records without writes, clock changes or inference',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'report-summary-reader-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const fixture=worldFixtures()[0],provider=mockDynamicProvider(fixture),deps={directory:join(directory,'sessions'),storeDirectory:join(directory,'accepted'),swarm:false as const,enabled:false};
 const created=await handlePublicExplore(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:'report-reader-'+crypto.randomUUID(),request:fixture.request})}),{enabled:true,key:'offline',groundingKey:'',fetcher:provider.fetcher},deps);
 assert.equal(created.status,200);const initial=await created.json();assert.ok(initial.session?.token);
 const before=files(directory),calls=provider.counts(),first=await readPublicReportSnapshot(initial.runId,initial.session.token,deps);
 assert.equal(first.runId,initial.runId);assert.equal(first.society?.tick,initial.society?.tick);first.question='CLIENT_MUTATION';if(first.society)first.society.tick=99999;
 const second=await readPublicReportSnapshot(initial.runId,initial.session.token,deps);assert.notEqual(second.question,'CLIENT_MUTATION');assert.notEqual(second.society?.tick,99999);
 await assert.rejects(()=>readPublicReportSnapshot(initial.runId,'0'.repeat(64),deps),/PUBLIC_ACCESS/);
 assert.deepEqual(files(directory),before,'reopening and rejected authentication leave all stored bytes unchanged');assert.deepEqual(provider.counts(),calls,'reader must not dispatch provider calls');
});
