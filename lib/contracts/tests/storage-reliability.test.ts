import test from 'node:test';import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync,readdirSync,rmSync,renameSync,unlinkSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {handlePublicExplore,handlePublicSocial} from '../../server/society/public-service.ts';
import {privateStoreDirectory,replacePrivateCheckpoint} from '../../server/society/storage.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';import {worldFixtures} from '../../world-graph/fixtures.ts';
import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';

for(const blocked of ['accepted','sessions'] as const)test(`an unusable ${blocked} store stops Explore before any inference and withholds filesystem details`,async()=>{
 const base=resolve('tmp');mkdirSync(base,{recursive:true});const dir=mkdtempSync(join(base,'storage-reliability-'));
 try{const path=join(dir,'RAW_PRIVATE_PATH_SENTINEL');writeFileSync(path,'owned-blocker');const f=worldFixtures()[0],m=mockDynamicProvider(f);
  const r=await handlePublicExplore(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:'offline-storage-'+crypto.randomUUID(),request:f.request})}),{enabled:true,key:'offline',groundingKey:'',fetcher:m.fetcher},{enabled:false,directory:blocked==='sessions'?path:join(dir,'sessions'),storeDirectory:blocked==='accepted'?path:join(dir,'accepted')});
  assert.equal(r.status,503);assert.equal(m.counts().calls,0);const body=await r.text();assert.match(body,/PRIVATE_STORAGE_UNAVAILABLE/);assert.doesNotMatch(body,/RAW_PRIVATE_PATH_SENTINEL|Error:|stack|\\Users\\/);assert.equal(readFileSync(path,'utf8'),'owned-blocker');
 }finally{assert.ok(resolve(dir).startsWith(base+sep));rmSync(dir,{recursive:true,force:true});}
});

test('default and trusted-root stores keep accepted records and journals under the same authoritative root',()=>{
 const before=process.env.SOCIAL_STORAGE_ROOT;try{delete process.env.SOCIAL_STORAGE_ROOT;assert.equal(privateStoreDirectory('accepted-private'),resolve('data/derived/agents/accepted-private'));assert.equal(privateStoreDirectory('social-sessions'),resolve('data/derived/agents/social-sessions'));
 process.env.SOCIAL_STORAGE_ROOT=resolve('tmp/storage-config-fixture');assert.equal(privateStoreDirectory('accepted-private'),resolve('tmp/storage-config-fixture/accepted-private'));assert.equal(privateStoreDirectory('social-sessions'),resolve('tmp/storage-config-fixture/social-sessions'));
 }finally{if(before===undefined)delete process.env.SOCIAL_STORAGE_ROOT;else process.env.SOCIAL_STORAGE_ROOT=before;}
});

test('failed atomic replacement removes its own pending file and leaves the previous accepted checkpoint intact',async()=>{
 const base=resolve('tmp');mkdirSync(base,{recursive:true});const dir=mkdtempSync(join(base,'storage-replace-'));
 try{const target=join(dir,'checkpoint.json');writeFileSync(target,'old-fixture');let calls=0;await assert.rejects(replacePrivateCheckpoint(target,'new-fixture',()=>{calls++;throw Object.assign(Error('private replacement fixture'),{code:'EBUSY'});}));assert.equal(calls,5);assert.equal(readFileSync(target,'utf8'),'old-fixture');assert.deepEqual(readdirSync(dir),['checkpoint.json']);
 await replacePrivateCheckpoint(target,'accepted-fixture',renameSync);assert.equal(readFileSync(target,'utf8'),'accepted-fixture');assert.deepEqual(readdirSync(dir),['checkpoint.json']);
 }finally{assert.ok(resolve(dir).startsWith(base+sep));rmSync(dir,{recursive:true,force:true});}
});

test('a failed continuation checkpoint returns partial safely and recovers the journal without repeating inference',async()=>{
 const base=resolve('tmp');mkdirSync(base,{recursive:true});const dir=mkdtempSync(join(base,'storage-continuation-')),accepted=join(dir,'accepted'),backup=join(dir,'accepted-backup');let blocked=false,calls=0;
 try{const f=worldFixtures()[0],mock=mockDynamicProvider(f);const fetcher:typeof fetch=async(url,init)=>{const b=JSON.parse(String(init?.body));if(b.response_format.json_schema.name!=='social_decision_v1')return mock.fetcher(url,init);calls++;if(!blocked){renameSync(accepted,backup);writeFileSync(accepted,'owned-storage-blocker');blocked=true;}return Response.json({id:'mock-storage-failure',model:b.model,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify({choiceId:JSON.parse(b.messages[1].content).choices.find((m:any)=>m.action==='inactive').id,text:null,motivation:'Offline storage fixture inactivity.',recallIds:[],stanceId:'keep',discussion:{topicIds:[],argument:'unspecified'},issueUpdate:null})}}],usage:{prompt_tokens:400,completion_tokens:150,total_tokens:550,cost:0.0001,completion_tokens_details:{reasoning_tokens:0}}});};
 const d={swarm:false as const,enabled:true,key:'offline',fetcher,storeDirectory:accepted,directory:join(dir,'sessions')};let r=await handlePublicExplore(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:'offline-continuation-'+crypto.randomUUID(),request:f.request})}),{...d,groundingKey:''},d);assert.equal(r.status,200);const initial=await r.json();const request=(p:any)=>new Request('http://localhost/api/social-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'continue',runId:p.runId,token:p.session.token,revision:p.session.revision})});
 r=await handlePublicSocial(request(initial),d);assert.equal(r.status,200);const partial=await r.json();assert.equal(partial.society.phase,'partial');assert.equal(calls,1);assert.doesNotMatch(JSON.stringify(partial),/RAW_|owned-storage-blocker|accepted-backup/);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(readFileSync(accepted,'utf8'),'owned-storage-blocker');unlinkSync(accepted);renameSync(backup,accepted);blocked=false;
 const latest=await(await handlePublicSocial(new Request(`http://localhost/api/social-simulate?runId=${initial.runId}&token=${initial.session.token}`),d)).json();r=await handlePublicSocial(request(latest),d);assert.equal(r.status,200);const restored=await r.json();const checkpoint=JSON.parse(readFileSync(join(d.directory,readdirSync(d.directory).find(f=>f.endsWith('.jsonl'))!),'utf8').trim().split('\n').at(-1)!);assert.equal(restored.society.usage.accepted,1,JSON.stringify(checkpoint.hybrid.records.map((r:any)=>({status:r.status,error:r.error}))));assert.equal(calls,1);assert.equal(restored.session.id,initial.session.id);
 }finally{if(blocked){assert.equal(readFileSync(accepted,'utf8'),'owned-storage-blocker');unlinkSync(accepted);renameSync(backup,accepted);}assert.ok(resolve(dir).startsWith(base+sep));rmSync(dir,{recursive:true,force:true});}
});

test('a replacement fsync failure preserves the accepted checkpoint and removes its own partial pending file',async t=>{
 const base=resolve('tmp');mkdirSync(base,{recursive:true});const dir=mkdtempSync(join(base,'storage-fsync-')),target=join(dir,'checkpoint.json');writeFileSync(target,'previous-fixture');
 const sync=t.mock.method(fs,'fsyncSync',()=>{throw Object.assign(Error('owned-fsync-fixture'),{code:'EIO'});});syncBuiltinESMExports();
 try{await assert.rejects(replacePrivateCheckpoint(target,'next-fixture'),{code:'EIO'});assert.equal(readFileSync(target,'utf8'),'previous-fixture');assert.deepEqual(readdirSync(dir),['checkpoint.json']);}
 finally{sync.mock.restore();syncBuiltinESMExports();assert.ok(resolve(dir).startsWith(base+sep));rmSync(dir,{recursive:true,force:true});}
});
