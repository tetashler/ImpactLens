/** Read-only, single-artifact acceptance-scope decision. This never repairs or replays a world. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';

const archiveFile='f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json';
const runId='run-865f5ae0d398512523eac82e-attempt-4-92873b81-e7e3-4208-acec-221f673b1579';
const sessionId='f8bcfcb0-0291-4238-b6b6-dcf5f9f78bc2';
const manifestPath='scripts/testing/phase4e2-historical-scope.v1.json';

// The approval is pinned in code independently of the editable JSON. Exact structural
// equality rejects unknown keys, extra artifacts, substituted evidence and policy guesses.
const approved={
 version:1,
 scopeId:'phase4e2-historical-scope-option-b-v1',
 approval:{id:'Phase4E.2OptionBuserapproval2026-10-31',date:'2026-10-31',evidenceRefs:[
  'docs/PHASE4E2_MULTIDAY_SWARM_IMPLEMENTATION_AND_LIVE_ACCEPTANCE.md',
  'tmp/phase4e1/progress.md',
  'tmp/phase4e2/historical-baseline-failure.json',
 ],evidenceFiles:[
  {path:'tmp/phase4e1/progress.md',sha256:'0bb06d8718a5d47d988dce4ec8b81d7c3220b79a70b46ad57ad0108d19b9330e'},
  {path:'tmp/phase4e2/historical-baseline-failure.json',sha256:'81b88b0cd08f4d57dea9a43b194d5a000b1266166021cc52bed5166594691e96'},
 ]},
 artifact:{archiveFile,runId,sessionId,
  classification:'pre-final-mocked-development-artifact',
  qualification:'nonqualifying-for-mandatory-historical-replay',
  replayStatus:'unresolved-SOCIAL_STALE',sourcePolicyRecoverable:false,
  failure:{code:'SOCIAL_STALE',firstDivergentRecord:0,firstDivergentTick:1,baselineCommit:'ff46ab24ad93bb9260cc4a94ee0111f2e83cf21d'},
  files:[
   {role:'archive',path:'data/derived/agents/accepted-private/'+archiveFile,sha256:'f509b72702238ce52d3feb6653b28ca68f7151796f5e39d88834160902f503ca'},
   {role:'journal',path:'data/derived/agents/social-sessions/'+sessionId+'.jsonl',sha256:'066ef47d20ec06a953024d0929f0e199d37c16aff147dc4d6d099a3874d5f395'},
   {role:'checkpoint',path:'data/derived/agents/social-sessions/'+sessionId+'.checkpoint.json',sha256:'0c0003dcd4dfe13f6b0c058501b93c6a779da0201b01cb7b956f9ba966c13773'},
   {role:'materialized',path:'data/derived/agents/social-sessions/'+sessionId+'.materialized.json',sha256:'1b24f45c2607c8d095f38b326d322a622d5ca0bfc5bc5b1bd0fcb1df016fcfe0'},
   {role:'job',path:'data/derived/agents/accepted-private/jobs/'+archiveFile.slice(0,-5)+'.job.json',sha256:'6204ddd88ce1967ce4fa5c6aad61e29f8e9c9d5ab320719023546fe6b61d2455'},
  ],
 },
} as const;

export interface HistoricalScopeObservation {
 role:string;path:string;sha256:string;runIds:string[];sessionIds:string[];
}
export interface HistoricalScopeEvidenceObservation {path:string;sha256:string}
const hash=(bytes:string|Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
function requireScope(condition:unknown,code:string):asserts condition {
 if(!condition)throw Error('HISTORICAL_SCOPE_'+code);
}
function parseManifest(bytes:string|Uint8Array){
 let manifest:unknown;
 try{manifest=JSON.parse(typeof bytes==='string'?bytes:Buffer.from(bytes).toString('utf8'));}
 catch{throw Error('HISTORICAL_SCOPE_MANIFEST_JSON');}
 requireScope(isDeepStrictEqual(manifest,approved),'MANIFEST_CONTENT');
 return {version:1 as const,manifestHash:hash(bytes),manifest:structuredClone(approved)};
}

/** Validate only the pinned decision metadata; this reads no private artifact or evidence. */
export function readHistoricalScopeManifest(root=process.cwd()){
 let bytes:Buffer;
 try{bytes=readFileSync(join(root,manifestPath));}
 catch{throw Error('HISTORICAL_SCOPE_MANIFEST_READ');}
 return parseManifest(bytes);
}

function expectedIdentities(role:string){
 return {
  runIds:role==='checkpoint'?[]:role==='journal'||role==='materialized'?[runId,runId]:[runId],
  sessionIds:role==='job'?[]:[sessionId],
 };
}

/** Pure validation of hash-bound observations. Call verifyHistoricalScope for filesystem proof. */
export function validateHistoricalScopeManifest(
 bytes:string|Uint8Array,
 observations:readonly HistoricalScopeObservation[],
 evidence:readonly HistoricalScopeEvidenceObservation[],
){
 const metadata=parseManifest(bytes);
 requireScope(isDeepStrictEqual(evidence,approved.approval.evidenceFiles),'EVIDENCE');
 requireScope(Array.isArray(observations)&&observations.length===approved.artifact.files.length,'OBSERVATIONS');
 for(const [index,file]of approved.artifact.files.entries()){
  requireScope(isDeepStrictEqual(observations[index],{...file,...expectedIdentities(file.role)}),'OBSERVATION');
 }
 const {failure,...artifact}=structuredClone(approved.artifact);
 void failure;
 return {version:1 as const,manifestHash:metadata.manifestHash,artifact:{...artifact,hashesVerified:true as const}};
}

function readBoundFile(root:string,file:{path:string;sha256:string},kind:'FILE'|'EVIDENCE'){
 let bytes:Buffer;
 try{bytes=readFileSync(join(root,file.path));}
 catch{throw Error('HISTORICAL_SCOPE_'+kind+'_READ');}
 requireScope(hash(bytes)===file.sha256,kind+'_HASH');
 return bytes;
}
function nested(value:unknown,...keys:string[]):unknown {
 let current=value;
 for(const key of keys){
  requireScope(current!==null&&typeof current==='object'&&!Array.isArray(current),'FILE_FORMAT');
  current=(current as Record<string,unknown>)[key];
 }
 return current;
}
function observeFile(root:string,file:typeof approved.artifact.files[number]):HistoricalScopeObservation{
 const bytes=readBoundFile(root,file,'FILE');
 let value:unknown;
 try{
  const text=bytes.toString('utf8');
  value=JSON.parse(file.role==='journal'?text.slice(0,text.indexOf('\n')<0?text.length:text.indexOf('\n')):text);
 }catch{throw Error('HISTORICAL_SCOPE_FILE_FORMAT');}
 const actualRunIds:unknown[]=file.role==='checkpoint'?[]:file.role==='archive'?[nested(value,'publicRun','runId')]:file.role==='journal'?[nested(value,'runId'),nested(value,'input','runId')]:file.role==='materialized'?[nested(value,'runId'),nested(value,'world','genesis','input','runId')]:[nested(value,'runId')];
 const actualSessionIds:unknown[]=file.role==='job'?[]:[nested(value,file.role==='archive'?'sessionId':'id')];
 requireScope(actualRunIds.every(id=>typeof id==='string')&&actualSessionIds.every(id=>typeof id==='string'),'FILE_IDENTITY');
 return {...file,runIds:actualRunIds as string[],sessionIds:actualSessionIds as string[]};
}

/** Hash all seven required files from disk; never write, restore, infer a policy, or replay. */
export function verifyHistoricalScope(root=process.cwd()){
 const metadata=readHistoricalScopeManifest(root);
 const evidence=approved.approval.evidenceFiles.map(file=>{
  readBoundFile(root,file,'EVIDENCE');
  return {...file};
 });
 const observations=approved.artifact.files.map(file=>observeFile(root,file));
 // Hash the exact manifest bytes returned by the reader, preserving its file digest.
 const result=validateHistoricalScopeManifest(JSON.stringify(metadata.manifest),observations,evidence);
 return {...result,manifestHash:metadata.manifestHash};
}
