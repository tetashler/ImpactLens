import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,readdirSync,copyFileSync} from 'node:fs';import {join,resolve} from 'node:path';import {createHash,randomUUID} from 'node:crypto';
import {reserveStorageAdmission,bindStorageAdmission,storageBundle} from '../../server/society/storage-admission.ts';
import {socialOperation,checkpointSocialSession} from '../../server/society/service.ts';import {deepSwarmPolicy} from '../../society/swarm.ts';
import {phase4eSource,phase4eCommunication} from '../../../scripts/testing/phase4e-fixture.ts';
const root=resolve('tmp/citizen-menu-storage-20261101/storage/historical-helper');mkdirSync(root,{recursive:true});
const isolated=()=>mkdtempSync(join(root,'fixture-')),hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
async function api(){const module=await import('../../../scripts/testing/historical-namespace-inventory.ts').catch(()=>null);assert.ok(module?.auditHistoricalNamespaces,'fixed namespace historical inventory is required');return module;}
async function current(){
 const base=isolated(),source=await phase4eSource('history-'+randomUUID()),claim=reserveStorageAdmission(source.attemptId,hash('fixture'),base);bindStorageAdmission(claim,source,base);const bundle=storageBundle(base);
 const deps={directory:bundle.sessions,storageAdmission:{base,claim},enabled:true,ruleOnly:true,swarm:deepSwarmPolicy(50),communication:phase4eCommunication(),admission:{maxCalls:0}};
 let state=await socialOperation({operation:'start',run:source},deps);await checkpointSocialSession(state.sessionId,deps);
 for(let i=0;i<12&&!state.world.hybrid!.records.length;i++)state=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},deps);
 assert.equal(state.world.hybrid!.records.length,1);mkdirSync(bundle.archives,{recursive:true});const archive=join(bundle.archives,hash(source.runId)+'.json'),journal=join(bundle.sessions,state.sessionId+'.jsonl');
 writeFileSync(archive,JSON.stringify({version:1,execution:{attemptId:source.attemptId,run:{runId:source.runId}},publicRun:{runId:source.runId,session:{id:state.sessionId}},sessionId:state.sessionId}));
 return {base,source,claim,bundle,archive,journal};
}
test('complete fixed-namespace inventory replays new journals and positive checkpoint tails without changing mandatory legacy selection',async()=>{
 const a=await api(),f=await current(),legacy=storageBundle(f.base,true);mkdirSync(legacy.archives,{recursive:true});const old=join(legacy.archives,hash('legacy-run')+'.json');writeFileSync(old,'{"publicRun":{"runId":"legacy-run"}}');
 const protectedFiles=[old,f.archive,f.journal].map(path=>({path,sha256:hash(readFileSync(path))})),before=protectedFiles.map(r=>[r.path,r.sha256]);
 const inventory=a.auditHistoricalNamespaces(f.base,protectedFiles);assert.equal(inventory.legacy.length,1);assert.equal(inventory.current.length,1);
 const row=inventory.current[0];assert.equal(row.namespace,'session-store-v2');assert.equal(row.fullReplayExact,true);assert.equal(row.checkpointTailReplayExact,true);assert.equal(row.tailRecords,1);assert.equal(row.archiveSha256,hash(readFileSync(f.archive)));assert.equal(row.journalSha256,hash(readFileSync(f.journal)));assert.equal(row.protected,true);
 assert.deepEqual(a.legacyProtectedArchives(f.base,protectedFiles).map((r:any)=>r.path),[old]);assert.deepEqual(protectedFiles.map(r=>[r.path,hash(readFileSync(r.path))]),before);
});
test('same basename in legacy and current namespace is an explicit collision rather than a deduplicated entry',async()=>{
 const a=await api(),f=await current(),legacy=storageBundle(f.base,true);mkdirSync(legacy.archives,{recursive:true});copyFileSync(f.archive,join(legacy.archives,hash(f.source.runId)+'.json'));
 assert.throws(()=>a.auditHistoricalNamespaces(f.base,[]),/HISTORICAL_NAMESPACE_AMBIGUOUS/);
});
test('corrupt new journal makes namespace verification fail even when legacy mandatory coverage is separate',async()=>{
 const a=await api(),f=await current();writeFileSync(f.journal,readFileSync(f.journal,'utf8')+'{"format":2,"hash":"bad"}\n');
 assert.throws(()=>a.auditHistoricalNamespaces(f.base,[]),/HISTORICAL_NAMESPACE/);
});
test('empty and bound orphan claims are inventoried without inventing accepted worlds',async()=>{
 const a=await api(),base=isolated(),first=reserveStorageAdmission('empty-claim',hash('empty'),base),second=reserveStorageAdmission('bound-claim',hash('bound'),base);bindStorageAdmission(second,{runId:'run-bound-no-world',attemptId:'bound-claim'},base);
 const result=a.auditHistoricalNamespaces(base,[]);assert.deepEqual(result.current,[]);assert.deepEqual(result.claims.map((r:any)=>({slot:r.slot,state:r.state})),[{slot:first.slot,state:'reserved-no-world'},{slot:second.slot,state:'bound-no-world'}]);
});
test('unknown journals and crossed run indexes cannot disappear from a complete inventory',async()=>{
 const a=await api(),f=await current(),index=join(f.bundle.sessions,hash(f.source.runId)+'.index');writeFileSync(index,randomUUID());assert.throws(()=>a.auditHistoricalNamespaces(f.base,[]),/HISTORICAL_NAMESPACE_BINDING/);
 writeFileSync(index,f.claim.sessionId);writeFileSync(join(f.bundle.sessions,randomUUID()+'.jsonl'),'{}\n');assert.throws(()=>a.auditHistoricalNamespaces(f.base,[]),/HISTORICAL_NAMESPACE_BINDING/);
});
test('protected archive paths never lose their namespace or silently accept an unknown namespace',async()=>{
 const a=await api(),base=isolated(),unknown=join(base,'session-store-v3','accepted-private',hash('unknown')+'.json');mkdirSync(join(base,'session-store-v3','accepted-private'),{recursive:true});writeFileSync(unknown,'{}');
 assert.throws(()=>a.auditHistoricalNamespaces(base,[{path:unknown,sha256:hash('{}')}]),/HISTORICAL_NAMESPACE_UNKNOWN/);
});
test('a 148-row protection snapshot retains its exact paths while mandatory selection uses only legacy archive paths',async()=>{
 const a=await api(),base=isolated(),legacy=storageBundle(base,true),current=storageBundle(base);mkdirSync(legacy.archives,{recursive:true});mkdirSync(current.archives,{recursive:true});
 const old=join(legacy.archives,hash('legacy-frozen')+'.json'),fresh=join(current.archives,hash('new-protected')+'.json');writeFileSync(old,'{}');writeFileSync(fresh,'{}');
 const pins=[old,fresh].map(path=>({path,sha256:hash('{}')}));for(let i=0;i<146;i++){const path=join(base,'preserved-source-'+i+'.private');writeFileSync(path,'pin');pins.push({path,sha256:hash('pin')});}
 const before=JSON.stringify(pins),selected=a.legacyProtectedArchives(base,pins);assert.equal(pins.length,148);assert.deepEqual(selected.map((row:any)=>row.path),[old]);assert.equal(JSON.stringify(pins),before);
});
test('retained forensic evidence outside ordinary journal names prevents a complete namespace audit',async()=>{
 const a=await api(),base=isolated();reserveStorageAdmission('forensic-claim',hash('forensic'),base);const path=join(base,'session-store-v2','orphan.jsonl.incomplete-owned.private');writeFileSync(path,'UNCERTAIN_EVIDENCE');
 assert.throws(()=>a.auditHistoricalNamespaces(base,[]),/HISTORICAL_NAMESPACE/);assert.equal(readFileSync(path,'utf8'),'UNCERTAIN_EVIDENCE');
});
