import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import * as scope from '../../../scripts/testing/phase4e2-historical-scope.ts';

type Observation={role:string;path:string;sha256:string;runIds:string[];sessionIds:string[]};
const archive='f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json';
const runId='run-865f5ae0d398512523eac82e-attempt-4-92873b81-e7e3-4208-acec-221f673b1579';
const sessionId='f8bcfcb0-0291-4238-b6b6-dcf5f9f78bc2';
const files=[
 {role:'archive',path:'data/derived/agents/accepted-private/'+archive,sha256:'f509b72702238ce52d3feb6653b28ca68f7151796f5e39d88834160902f503ca'},
 {role:'journal',path:'data/derived/agents/social-sessions/'+sessionId+'.jsonl',sha256:'066ef47d20ec06a953024d0929f0e199d37c16aff147dc4d6d099a3874d5f395'},
 {role:'checkpoint',path:'data/derived/agents/social-sessions/'+sessionId+'.checkpoint.json',sha256:'0c0003dcd4dfe13f6b0c058501b93c6a779da0201b01cb7b956f9ba966c13773'},
 {role:'materialized',path:'data/derived/agents/social-sessions/'+sessionId+'.materialized.json',sha256:'1b24f45c2607c8d095f38b326d322a622d5ca0bfc5bc5b1bd0fcb1df016fcfe0'},
 {role:'job',path:'data/derived/agents/accepted-private/jobs/'+archive.slice(0,-5)+'.job.json',sha256:'6204ddd88ce1967ce4fa5c6aad61e29f8e9c9d5ab320719023546fe6b61d2455'},
];
const evidenceFiles=[
 {path:'tmp/phase4e1/progress.md',sha256:'0bb06d8718a5d47d988dce4ec8b81d7c3220b79a70b46ad57ad0108d19b9330e'},
 {path:'tmp/phase4e2/historical-baseline-failure.json',sha256:'81b88b0cd08f4d57dea9a43b194d5a000b1266166021cc52bed5166594691e96'},
];
function manifest(){return {
 version:1,
 scopeId:'phase4e2-historical-scope-option-b-v1',
 approval:{id:'Phase4E.2OptionBuserapproval2026-10-31',date:'2026-10-31',evidenceRefs:[
  'docs/PHASE4E2_MULTIDAY_SWARM_IMPLEMENTATION_AND_LIVE_ACCEPTANCE.md',
  'tmp/phase4e1/progress.md',
  'tmp/phase4e2/historical-baseline-failure.json',
 ],evidenceFiles:structuredClone(evidenceFiles)},
 artifact:{archiveFile:archive,runId,sessionId,classification:'pre-final-mocked-development-artifact',qualification:'nonqualifying-for-mandatory-historical-replay',replayStatus:'unresolved-SOCIAL_STALE',sourcePolicyRecoverable:false,
  failure:{code:'SOCIAL_STALE',firstDivergentRecord:0,firstDivergentTick:1,baselineCommit:'ff46ab24ad93bb9260cc4a94ee0111f2e83cf21d'},
  files:structuredClone(files)},
};}
function observations():Observation[]{return files.map(file=>({...file,
 runIds:file.role==='checkpoint'?[]:file.role==='journal'||file.role==='materialized'?[runId,runId]:[runId],
 sessionIds:file.role==='job'?[]:[sessionId],
}));}
function validate(value:unknown=manifest(),observed:readonly Observation[]=observations(),evidence=structuredClone(evidenceFiles)){
 assert.equal(typeof scope.validateHistoricalScopeManifest,'function','read-only historical scope validation must exist');
 return scope.validateHistoricalScopeManifest(JSON.stringify(value),observed,evidence);
}
function rejected(value:unknown=manifest(),observed:readonly Observation[]=observations(),evidence=structuredClone(evidenceFiles)){
 assert.throws(()=>validate(value,observed,evidence),/^Error: HISTORICAL_SCOPE_/);
}

test('the approved artifact stays explicitly nonqualifying with its unresolved replay failure',()=>{
 const value=manifest(),raw=JSON.stringify(value),result=validate(value);
 assert.equal(result.version,1);
 assert.equal(result.manifestHash,createHash('sha256').update(raw).digest('hex'));
 assert.deepEqual(result.artifact,{archiveFile:archive,runId,sessionId,classification:'pre-final-mocked-development-artifact',qualification:'nonqualifying-for-mandatory-historical-replay',replayStatus:'unresolved-SOCIAL_STALE',sourcePolicyRecoverable:false,hashesVerified:true,files});
});

test('a different archive, run, or session cannot inherit this approval',()=>{
 for(const key of ['archiveFile','runId','sessionId'] as const){const value=manifest();value.artifact[key]='another-artifact';rejected(value);}
});

test('editing classification, qualification, failure, or recoverability cannot turn the exception into a pass',()=>{
 for(const [key,value]of [['classification','accepted-live-artifact'],['qualification','qualifying'],['replayStatus','passed'],['sourcePolicyRecoverable',true]] as const){
  const candidate=manifest();Object.assign(candidate.artifact,{[key]:value});rejected(candidate);
 }
 for(const patch of [{code:'OTHER'},{firstDivergentRecord:1},{firstDivergentTick:2},{baselineCommit:'0'.repeat(40)}]){
  const candidate=manifest();Object.assign(candidate.artifact.failure,patch);rejected(candidate);
 }
});

test('approval version, date, identity, and scope are pinned independently of JSON contents',()=>{
 for(const patch of [{version:2},{scopeId:'all-historical-artifacts'}]){const value=manifest();Object.assign(value,patch);rejected(value);}
 for(const patch of [{id:'self-approved'},{date:'2026-11-01'}]){const value=manifest();Object.assign(value.approval,patch);rejected(value);}
});

test('evidence references must be the exact nonempty approved list',()=>{
 for(const evidenceRefs of [[],[''],['tmp/other.json'],[...manifest().approval.evidenceRefs,'tmp/extra.json']]){
  const value=manifest();value.approval.evidenceRefs=evidenceRefs;rejected(value);
 }
 for(const evidence of [[],[evidenceFiles[0]],[...evidenceFiles,evidenceFiles[0]]])rejected(manifest(),observations(),evidence);
 const evidence=structuredClone(evidenceFiles);evidence[1].sha256='0'.repeat(64);rejected(manifest(),observations(),evidence);
 const value=manifest();value.approval.evidenceFiles[0].sha256='0'.repeat(64);rejected(value);
});

test('unknown keys fail closed at every manifest object boundary',()=>{
 for(const target of ['root','approval','artifact','failure','file','evidence']){
  const value=manifest(),record=target==='root'?value:target==='approval'?value.approval:target==='artifact'?value.artifact:target==='failure'?value.artifact.failure:target==='evidence'?value.approval.evidenceFiles[0]:value.artifact.files[0];
  Object.assign(record,{allowOtherArtifacts:true});rejected(value);
 }
});

test('missing, duplicate, additional, or malformed file entries cannot broaden the five-file scope',()=>{
 for(const transform of [
  (rows:any[])=>rows.slice(1),
  (rows:any[])=>[...rows,rows[0]],
  (rows:any[])=>[...rows,{role:'other',path:'elsewhere',sha256:'0'.repeat(64)}],
  (rows:any[])=>[null,...rows.slice(1)],
 ]){const value=manifest();value.artifact.files=transform(value.artifact.files);rejected(value);}
});

test('manifest path traversal, role substitution, and hash replacement are rejected',()=>{
 for(const patch of [{path:'../accepted-private/'+archive},{role:'checkpoint'},{sha256:'0'.repeat(64)},{sha256:'NOT-A-HASH'}]){
  const value=manifest();Object.assign(value.artifact.files[0],patch);rejected(value);
 }
});

test('each observed file must match its approved SHA-256 rather than trusting identity metadata',()=>{
 for(let index=0;index<5;index++){const observed=observations();observed[index].sha256='0'.repeat(64);rejected(manifest(),observed);}
});

test('missing, duplicate, or extra observations cannot report hashes verified',()=>{
 const observed=observations();
 rejected(manifest(),observed.slice(1));
 rejected(manifest(),[...observed,observed[0]]);
 rejected(manifest(),[observed[0],observed[0],...observed.slice(2)]);
});

test('observed archive, journal, materialized, and job run identities must all bind to the approved run',()=>{
 for(const index of [0,1,3,4]){
  const observed=observations();observed[index].runIds[0]='another-run';rejected(manifest(),observed);
 }
 for(const index of [1,3]){
  const observed=observations();observed[index].runIds[1]='another-input-run';rejected(manifest(),observed);
 }
});

test('every session-bearing observation and its identity cardinality are mandatory',()=>{
 for(const index of [0,1,2,3]){
  const observed=observations();observed[index].sessionIds[0]='another-session';rejected(manifest(),observed);
 }
 for(let index=0;index<5;index++){
  const observed=observations();observed[index].runIds.push(runId);rejected(manifest(),observed);
 }
 const observed=observations();observed[4].sessionIds=[sessionId];rejected(manifest(),observed);
});

test('invalid JSON, primitives, missing metadata, and unknown observation keys fail closed',()=>{
 assert.equal(typeof scope.validateHistoricalScopeManifest,'function');
 for(const raw of ['not-json','null','[]','0','{}'])assert.throws(()=>scope.validateHistoricalScopeManifest(raw,observations(),evidenceFiles),/^Error: HISTORICAL_SCOPE_/);
 const value=manifest();delete (value.approval as any).date;rejected(value);
 const observed=observations();Object.assign(observed[0],{hashesVerified:true});rejected(manifest(),observed);
});

function withSyntheticRoot(action:(root:string)=>void,includeEvidence=true){
 const directory=mkdtempSync(join(tmpdir(),'impactlens-historical-scope-'));
 try{
  mkdirSync(join(directory,'scripts/testing'),{recursive:true});writeFileSync(join(directory,'scripts/testing/phase4e2-historical-scope.v1.json'),JSON.stringify(manifest()));
  if(includeEvidence)for(const file of evidenceFiles){mkdirSync(join(directory,file.path,'..'),{recursive:true});writeFileSync(join(directory,file.path),readFileSync(file.path));}
  action(directory);
 }
 finally{assert.ok(resolve(directory).startsWith(resolve(tmpdir())+'\\impactlens-historical-scope-'));rmSync(directory,{recursive:true,force:true});}
}

test('the filesystem verifier refuses missing historical files without creating them',()=>{
 assert.equal(typeof scope.verifyHistoricalScope,'function','filesystem hashing verifier must exist');
 withSyntheticRoot(root=>assert.throws(()=>scope.verifyHistoricalScope(root),/^Error: HISTORICAL_SCOPE_FILE_READ$/));
});

test('metadata-only reading validates approval without reading or requiring private artifacts',()=>{
 assert.equal(typeof scope.readHistoricalScopeManifest,'function');
 withSyntheticRoot(root=>{
  const result=scope.readHistoricalScopeManifest(root);
  assert.equal(result.version,1);assert.equal(result.manifest.artifact.archiveFile,archive);
  assert.equal(result.manifestHash,createHash('sha256').update(JSON.stringify(manifest())).digest('hex'));
  assert.equal('hashesVerified' in result.manifest.artifact,false);
 },false);
});

test('missing or changed safe provenance evidence prevents filesystem classification',()=>{
 assert.equal(typeof scope.verifyHistoricalScope,'function');
 withSyntheticRoot(root=>assert.throws(()=>scope.verifyHistoricalScope(root),/^Error: HISTORICAL_SCOPE_EVIDENCE_READ$/),false);
 withSyntheticRoot(root=>{
  writeFileSync(join(root,evidenceFiles[0].path),'unapproved evidence');
  assert.throws(()=>scope.verifyHistoricalScope(root),/^Error: HISTORICAL_SCOPE_EVIDENCE_HASH$/);
 });
});

test('the filesystem verifier hashes actual bytes before accepting synthetic matching identities',()=>{
 assert.equal(typeof scope.verifyHistoricalScope,'function');
 withSyntheticRoot(root=>{
  const path=join(root,files[0].path);mkdirSync(join(root,'data/derived/agents/accepted-private'),{recursive:true});
  const bytes=JSON.stringify({version:1,sessionId,publicRun:{runId}});writeFileSync(path,bytes);
  assert.throws(()=>scope.verifyHistoricalScope(root),/^Error: HISTORICAL_SCOPE_FILE_HASH$/);
  assert.equal(readFileSync(path,'utf8'),bytes);
 });
});
