import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync,readdirSync,unlinkSync,existsSync,renameSync} from 'node:fs';import {join,resolve} from 'node:path';import {createHash,randomUUID} from 'node:crypto';
import {replacePrivateCheckpoint} from '../../server/society/storage.ts';
import {handlePublicExplore,handlePublicSocial,registerAcceptedExecution} from '../../server/society/public-service.ts';
import {socialOperation} from '../../server/society/service.ts';
import {reserveStorageAdmission,bindStorageAdmission,beginStorageInitialization,storageBundle} from '../../server/society/storage-admission.ts';
import {parsePublicExplore} from '../../question-simulation/public-session.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';import {worldFixtures} from '../../world-graph/fixtures.ts';import {phase4eSource,evictFixtureSession} from '../../../scripts/testing/phase4e-fixture.ts';

const output=resolve('tmp/citizen-menu-storage-20261101/storage');mkdirSync(output,{recursive:true});
const fixture=()=>mkdtempSync(join(output,'integration-')),hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const request=(attemptId:string)=>new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId,request:worldFixtures()[0].request})});
const get=(p:any)=>new Request('http://localhost/api/social-simulate?runId='+encodeURIComponent(p.runId)+'&token='+p.session.token);
const control=(p:any,operation='resume')=>new Request('http://localhost/api/social-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,runId:p.runId,token:p.session.token,revision:p.session.revision})});
async function explore(base:string,legacy=false,onProvider?:()=>void){
 const mock=mockDynamicProvider(worldFixtures()[0],()=>onProvider?.()),roots=storageBundle(base,legacy),deps:any={storeDirectory:roots.archives,directory:roots.sessions,swarm:false,enabled:false,...(!legacy?{storageBase:base}:{})};
 const response=await handlePublicExplore(request('storage-'+randomUUID()),{enabled:true,key:'offline',groundingKey:'',fetcher:mock.fetcher},deps);assert.equal(response.status,200,await response.clone().text());return {publicRun:await response.json(),deps,mock};
}

test('new ordinary Explore uses one reserved identity while a full historical namespace stays unchanged',async()=>{
 const base=fixture(),old=storageBundle(base,true);mkdirSync(old.archives,{recursive:true});mkdirSync(old.sessions,{recursive:true});
 for(let i=0;i<64;i++){writeFileSync(join(old.archives,i+'.json'),JSON.stringify({execution:{attemptId:'historical-'+i}}));writeFileSync(join(old.sessions,i+'.index'),'HISTORICAL_INDEX');}
 const {publicRun:p}=await explore(base),current=storageBundle(base),claim=JSON.parse(readFileSync(join(base,'session-store-v2/admission/slot-00.claim'),'utf8'));
 assert.equal(p.session.id,claim.sessionId);assert.equal(p.storage.disposition,'active');parsePublicExplore(p);
 assert.equal(readdirSync(old.archives).length,64);assert.equal(readdirSync(old.sessions).length,64);assert.ok(readdirSync(old.archives).every(f=>JSON.parse(readFileSync(join(old.archives,f),'utf8')).execution.attemptId==='historical-'+f.slice(0,-5)));
 assert.equal(readdirSync(current.archives).filter(f=>f.endsWith('.json')).length,1);assert.ok(existsSync(join(current.sessions,p.session.id+'.jsonl')));
});

test('saturated current admission rejects before any provider adapter and retains all claims',async()=>{
 const base=fixture();for(let i=0;i<16;i++)reserveStorageAdmission('full-'+i,hash('full-'+i),base);let calls=0;const never:typeof fetch=async()=>{calls++;throw Error('NO_PROVIDER');};
 const roots=storageBundle(base);const response=await handlePublicExplore(request('one-too-many'),{enabled:true,key:'offline',fetcher:never,groundingFetcher:never},{storageBase:base,storeDirectory:roots.archives,directory:roots.sessions} as any);
 assert.equal(response.status,503);assert.equal((await response.json()).error,'PRIVATE_STORAGE_CAPACITY');assert.equal(calls,0);assert.equal(readdirSync(join(base,'session-store-v2/admission')).filter(f=>f.endsWith('.claim')).length,16);
});

test('historical GET and refused controls never recover a journal or change original bytes',async()=>{
 const base=fixture(),{publicRun:p}=await explore(base,true),old=storageBundle(base,true),journal=join(old.sessions,p.session.id+'.jsonl');writeFileSync(journal,'INCOMPLETE_PRIVATE_FIXTURE');
 const snapshot=()=>[old.archives,old.sessions].flatMap(dir=>readdirSync(dir).map(f=>[join(dir,f),hash(readFileSync(join(dir,f),'utf8'))]));const before=snapshot();let calls=0;
 const deps:any={storageBase:base,enabled:true,key:'offline',fetcher:async()=>{calls++;throw Error('NO_HISTORICAL_DISPATCH');}},r=await handlePublicSocial(get(p),deps);
 assert.equal(r.status,200);const body=await r.json();assert.equal(body.storage.disposition,'historical-read-only');assert.equal(body.society.phase,'partial');parsePublicExplore(body);
 for(const operation of ['continue','resume','pause','cancel']){const response=await handlePublicSocial(control(p,operation),deps);assert.equal(response.status,409);assert.equal((await response.json()).error,'PUBLIC_ARCHIVED_READ_ONLY');}
 assert.deepEqual(snapshot(),before);assert.equal(calls,0);assert.ok(!existsSync(join(base,'session-store-v2')));
});

test('duplicate old and new archive locations fail closed before reading or dispatch',async()=>{
 const base=fixture(),{publicRun:p}=await explore(base),current=storageBundle(base),old=storageBundle(base,true),name=hash(p.runId)+'.json';mkdirSync(old.archives,{recursive:true});writeFileSync(join(old.archives,name),readFileSync(join(current.archives,name)));
 const response=await handlePublicSocial(get(p),{storageBase:base} as any);assert.equal(response.status,409);assert.equal((await response.json()).error,'PUBLIC_OPERATION');
});

test('a reserved session recovers its journal after an index crash without calling initialization',async()=>{
 const base=fixture(),attemptId='recover-'+randomUUID(),run=await phase4eSource(attemptId),claim=reserveStorageAdmission(attemptId,hash('recover'),base);bindStorageAdmission(claim,run,base);const roots=storageBundle(base),d:any={directory:roots.sessions,swarm:false,enabled:true,ruleOnly:true,storageAdmission:{base,claim}};
 const initial=await socialOperation({operation:'start',run},d);assert.equal(initial.sessionId,claim.sessionId);unlinkSync(join(roots.sessions,hash(run.runId)+'.index'));evictFixtureSession(roots.sessions,initial.sessionId);let regenerated=0;
 const restored=await socialOperation({operation:'start',run},{...d,citizenGrounding:async()=>{regenerated++;throw Error('REGENERATION');}});
 assert.equal(restored.sessionId,initial.sessionId);assert.deepEqual(restored.world,initial.world);assert.equal(regenerated,0);assert.equal(readFileSync(join(roots.sessions,hash(run.runId)+'.index'),'utf8'),claim.sessionId);
});

test('an initialization intent without a valid journal is terminal and cannot regenerate personalities',async()=>{
 const base=fixture(),attemptId='uncertain-'+randomUUID(),run=await phase4eSource(attemptId),claim=reserveStorageAdmission(attemptId,hash('uncertain'),base);bindStorageAdmission(claim,run,base);beginStorageInitialization(claim,run.runId,base);let calls=0;
 await assert.rejects(()=>socialOperation({operation:'start',run},{directory:storageBundle(base).sessions,swarm:false,enabled:true,storageAdmission:{base,claim},citizenGrounding:async()=>{calls++;throw Error('REGENERATION');}} as any),/STORAGE_INITIALIZATION_UNCERTAIN/);assert.equal(calls,0);
});

test('a public archive interrupted before session projection reconnects only the reserved journal',async()=>{
 const base=fixture(),{publicRun:p}=await explore(base),roots=storageBundle(base),path=join(roots.archives,hash(p.runId)+'.json'),stored=JSON.parse(readFileSync(path,'utf8'));
 stored.sessionId=null;stored.publicRun.session=null;stored.publicRun.society=null;stored.revision=0;writeFileSync(path,JSON.stringify(stored));unlinkSync(join(roots.sessions,hash(p.runId)+'.index'));evictFixtureSession(roots.sessions,p.session.id);
 const response=await handlePublicSocial(get(p),{storageBase:base} as any);assert.equal(response.status,200);const restored=await response.json();assert.equal(restored.session.id,p.session.id);assert.deepEqual(restored.society.counts,p.society.counts);
});

test('an uncertain artifact created after planning starts stops the next provider stage',async()=>{
 const base=fixture(),roots=storageBundle(base);let marked=false;
 const provider=mockDynamicProvider(worldFixtures()[0],()=>{if(!marked){marked=true;writeFileSync(join(base,'session-store-v2','fixture.incomplete-owned.private'),'UNCERTAIN_STAGE_ARTIFACT');}});
 const response=await handlePublicExplore(request('stage-stop-'+randomUUID()),{enabled:true,key:'offline',groundingKey:'',fetcher:provider.fetcher},{storageBase:base,storeDirectory:roots.archives,directory:roots.sessions,swarm:false,enabled:false} as any);
 assert.notEqual(response.status,200);assert.equal(provider.counts().calls,1);assert.equal(readFileSync(join(base,'session-store-v2','fixture.incomplete-owned.private'),'utf8'),'UNCERTAIN_STAGE_ARTIFACT');
});
test('new-namespace artifacts block continuation but permit a passive stored summary',async()=>{
 const base=fixture(),{publicRun:p}=await explore(base),roots=storageBundle(base),journal=join(roots.sessions,p.session.id+'.jsonl'),before=hash(readFileSync(journal,'utf8'));writeFileSync(join(base,'session-store-v2','fixture.incomplete-owned.private'),'UNCERTAIN_RETAINED');let calls=0;
 const deps:any={storageBase:base,enabled:true,key:'offline',fetcher:async()=>{calls++;throw Error('NO_ARTIFACT_DISPATCH');}};
 const blocked=await handlePublicSocial(control(p,'continue'),deps);assert.equal(blocked.status,503);assert.equal((await blocked.json()).error,'PRIVATE_STORAGE_UNAVAILABLE');
 const passive=await handlePublicSocial(get(p),deps);assert.equal(passive.status,200);assert.equal((await passive.json()).session.id,p.session.id);assert.equal(calls,0);assert.equal(hash(readFileSync(journal,'utf8')),before);
});
test('public observation and another Explore proceed during a normal checkpoint rename retry',async()=>{
 const base=fixture(),{publicRun:p}=await explore(base),roots=storageBundle(base),path=join(roots.archives,hash(p.runId)+'.json'),content=readFileSync(path,'utf8');let release=false;
 const pending=replacePrivateCheckpoint(path,content,(from,to)=>{if(!release)throw Object.assign(Error('NORMAL_OBSERVER_RETRY'),{code:'EBUSY'});renameSync(from,to);});
 try{
  const observed=await handlePublicSocial(get(p),{storageBase:base} as any);assert.equal(observed.status,200);assert.equal((await observed.json()).session.id,p.session.id);
  const next=await explore(base,false,()=>{release=true;});assert.notEqual(next.publicRun.runId,p.runId);assert.equal(next.mock.counts().calls,10);
 }finally{release=true;await pending;}
 assert.equal(readFileSync(path,'utf8'),content);
});
