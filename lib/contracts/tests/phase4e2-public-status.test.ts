import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs,{mkdtempSync,rmSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {handlePublicExplore,handlePublicSocial} from '../../server/society/public-service.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';
import {phase4eFetcher} from '../../../scripts/testing/phase4e-fixture.ts';
import {stopCoordinators} from '../../server/society/coordinator.ts';
import {parsePublicExplore} from '../../question-simulation/public-session.ts';

test('warm compact status authorises without parsing the private execution envelope and invalidates changed capability files',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-status-auth-')),f=worldFixtures()[0],provider=mockDynamicProvider(f),d={directory:join(directory,'sessions'),storeDirectory:join(directory,'accepted'),swarm:false as const,enabled:false};
 let injected:ReturnType<typeof t.mock.method>|undefined;
 try{
  const r=await handlePublicExplore(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:'status-cache-'+crypto.randomUUID(),request:f.request})}),{enabled:true,key:'offline',groundingKey:'',fetcher:provider.fetcher},d);
  assert.equal(r.status,200);const value=await r.json(),path=join(d.storeDirectory,readdirSync(d.storeDirectory).find(x=>x.endsWith('.json'))!),query='operation=status&runId='+encodeURIComponent(value.runId)+'&token=';
  let reads=0;const original=fs.readFileSync;
  injected=t.mock.method(fs,'readFileSync',((...args:Parameters<typeof fs.readFileSync>)=>{if(String(args[0])===path)reads++;return (original as any)(...args);}) as typeof fs.readFileSync);syncBuiltinESMExports();
  for(let i=0;i<4;i++){const status=await handlePublicSocial(new Request('http://localhost/api/social-simulate?'+query+value.session.token),d);assert.equal(status.status,200);assert.deepEqual(Object.keys(await status.json()).sort(),['job','kind','runId','version']);}
  assert.equal(reads,0,'repeated status reads use a stamp-validated capability cache');
  const stored=JSON.parse(original(path,'utf8')),newToken='1'.repeat(64);stored.token=newToken;writeFileSync(path,JSON.stringify(stored));
  assert.equal((await handlePublicSocial(new Request('http://localhost/api/social-simulate?'+query+value.session.token),d)).status,409);
  assert.equal((await handlePublicSocial(new Request('http://localhost/api/social-simulate?'+query+newToken),d)).status,200);assert.equal(reads,1);
 }finally{injected?.mock.restore();syncBuiltinESMExports();rmSync(directory,{recursive:true,force:true});}
});

test('ordinary managed execution preserves the initial pacing grant and stops a tightened grant before any hidden clock tail',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-public-budget-')),f=worldFixtures()[0],planner=mockDynamicProvider(f),social=phase4eFetcher();
 const fetcher:typeof fetch=(u,i)=>JSON.parse(String(i?.body)).response_format.json_schema.name==='social_decision_v1'?social.fetcher(u,i):planner.fetcher(u,i);
 const d={directory:join(directory,'sessions'),storeDirectory:join(directory,'accepted'),enabled:true,key:'offline',fetcher,admission:{maxCalls:70}};
 try{
  const r=await handlePublicExplore(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:'multiday-public-'+crypto.randomUUID(),request:f.request})}),{enabled:true,key:'offline',groundingKey:'',fetcher},d);
  assert.equal(r.status,200);const initial=await r.json();assert.equal(initial.job.totalSteps,320);assert.equal(initial.job.profileId,'multi-day-50-320-v1');assert.equal(initial.job.admittedCalls,70);
  d.admission.maxCalls=1;const query='runId='+encodeURIComponent(initial.runId)+'&token='+initial.session.token;let status:any;
  for(let i=0;i<1200;i++){status=await(await handlePublicSocial(new Request('http://localhost/api/social-simulate?operation=status&'+query),d)).json();if(status.job.status!=='running')break;await new Promise(resolve=>setTimeout(resolve,5));}
  assert.equal(status.job.status,'budget-limited');assert.equal(status.job.acceptedDecisions,1);assert.ok(status.job.tick<320);assert.equal(social.calls.length,1);
  const final=parsePublicExplore(await(await handlePublicSocial(new Request('http://localhost/api/social-simulate?'+query),d)).json());assert.equal(final.society?.phase,'partial');assert.equal(final.society?.tick,status.job.tick);assert.equal(final.society?.clock?.profileId,'multi-day-50-320-v1');
  for(let i=0;i<3;i++)await handlePublicSocial(new Request('http://localhost/api/social-simulate?'+query),d);assert.equal(social.calls.length,1);
 }finally{await stopCoordinators(join(d.storeDirectory,'jobs'));rmSync(directory,{recursive:true,force:true});}
});

test('a managed new-policy job stops after an uncertain upstream failure and keeps its accepted prefix as a technical partial result',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-public-upstream-')),f=worldFixtures()[0],planner=mockDynamicProvider(f),social=phase4eFetcher();let calls=0;
 const fetcher:typeof fetch=(u,i)=>{if(JSON.parse(String(i?.body)).response_format.json_schema.name!=='social_decision_v1')return planner.fetcher(u,i);if(++calls===1)return social.fetcher(u,i);throw TypeError('RAW_UNCERTAIN_PRIVATE');};
 const d={directory:join(directory,'sessions'),storeDirectory:join(directory,'accepted'),enabled:true,key:'offline',fetcher,admission:{maxCalls:70}};
 try{
  const r=await handlePublicExplore(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:'multiday-upstream-'+crypto.randomUUID(),request:f.request})}),{enabled:true,key:'offline',groundingKey:'',fetcher},d);
  assert.equal(r.status,200);const initial=await r.json(),query='runId='+encodeURIComponent(initial.runId)+'&token='+initial.session.token;let status:any;
  for(let i=0;i<400;i++){status=await(await handlePublicSocial(new Request('http://localhost/api/social-simulate?operation=status&'+query),d)).json();if(status.job.status!=='running')break;await new Promise(resolve=>setTimeout(resolve,5));}
  assert.equal(status.job.status,'failed');assert.equal(status.job.reason,'OPERATION');assert.equal(status.job.acceptedDecisions,1);assert.equal(calls,2);
  const final=parsePublicExplore(await(await handlePublicSocial(new Request('http://localhost/api/social-simulate?'+query),d)).json());assert.equal(final.society?.phase,'partial');assert.equal(final.society?.usage.accepted,1);assert.equal(final.society?.usage.failed,1);assert.equal(final.society?.usage.calls,2);assert.doesNotMatch(JSON.stringify(final),/RAW_UNCERTAIN_PRIVATE/);
  for(let i=0;i<3;i++)await handlePublicSocial(new Request('http://localhost/api/social-simulate?'+query),d);assert.equal(calls,2);
 }finally{await stopCoordinators(join(d.storeDirectory,'jobs'));rmSync(directory,{recursive:true,force:true});}
});
