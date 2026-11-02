// Task-only real-provider admission. No fixtures, replacement outputs or automatic retries.
import {existsSync,mkdirSync,readFileSync,writeFileSync,openSync,closeSync,writeSync,fsyncSync,statSync,lstatSync,unlinkSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,join,sep} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {readHistoricalScopeManifest,verifyHistoricalScope} from './phase4e2-historical-scope.ts';
import {geometryKey,parseScenarioGeometry} from '../../lib/plots/geometry.ts';
import {buildRetrievalQuery} from '../../lib/server/evidence/retrieval-query.ts';
import {parseHybridExploreOptions} from '../../lib/interventions/explore-contract.ts';

const root=fileURLToPath(new URL('../../',import.meta.url));
export const TASK_ID='admission-timeout-smoke-live-20261102-01';
const directory=resolve(process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_LIVE_DIRECTORY??join(root,'tmp',TASK_ID));
const journal=join(directory,'ledger.jsonl'),projection=join(directory,'ledger.json'),headPath=join(directory,'ledger-head.json'),lockPath=join(directory,'ledger.lock');
export const LIMITS=Object.freeze({attempts:1,tavilySearches:1,tavilyCredits:2,entity:1,relationship:1,action:8,personality:3,interpretation:1,social:8,socialPerAttempt:8,completions:22,usd:0.15,concurrent:1,requestBytes:98304,contextBytes:24000,tokens:40000000,deadlineMs:2700000});
export const STAGES=Object.freeze({dynamic_entities_v3:{purpose:'entity',calls:1,outputTokens:6000,outputBytes:48000},dynamic_relationships_v2:{purpose:'relationship',calls:1,outputTokens:6000,outputBytes:48000},stakeholder_turn_v1:{purpose:'action',calls:8,outputTokens:800,outputBytes:8000},citizen_personalities_v1:{purpose:'personality',calls:3,outputTokens:6000,outputBytes:6000},hybrid_intervention_intent_v2:{purpose:'interpretation',calls:1,outputTokens:1500,outputBytes:6000},social_decision_v1:{purpose:'social',calls:8,outputTokens:600,outputBytes:6000}});
export const RESERVED_USD=0.02;
export const OPERATOR_POLICY=Object.freeze({version:1,socialHardCap:8,criticalIntegrityOrAccounting:'stop',minimumReturned:1,auditReserveMs:0,earlySuccess:false,automaticRetries:0});
const hash=value=>createHash('sha256').update(value).digest('hex');
const check=value=>{if(!value)throw Error('ADMISSION_TIMEOUT_SMOKE_TASK_GUARD');};
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const canonical=value=>JSON.stringify(value&&typeof value==='object'?Array.isArray(value)?value.map(v=>JSON.parse(canonical(v))):Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonical(value[k]))])):value);
const finite=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
const integer=value=>Number.isSafeInteger(value)&&value>=0?value:null;
const safeId=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9:._-]{0,239}$/i.test(value)?value:null;
const model='deepseek/deepseek-v4-flash-0731';
const ocean=value=>typeof value==='string'&&value.toLowerCase()==='digitalocean';
const actions=new Set(['read','post','comment','reply','like','upvote','downvote','follow','unfollow','share','group-create','group-invite','group-join','group-leave','message','group-reply','inactive']);
let verifiedCache;
const stamp=path=>{const s=statSync(path,{bigint:true});return `${s.dev}:${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}`;};
const networkPending=d=>d.requests.some(r=>r.state==='pending'||r.metadataState==='pending');
export const STAGE_TIMEOUTS=Object.freeze({entity:45000,relationship:45000,action:30000,personality:30000,interpretation:30000,social:30000,retrieval:10000,metadata:30000});
const callerSignal=(url,init)=>init.signal===undefined?(url instanceof Request?url.signal:undefined):init.signal??undefined;
/** One signal governs native dispatch and the complete cloned body read. Late results cannot reconcile. */
async function dispatchBounded(nativeFetch,url,init,deadline,stageTimeoutMs,boundary={}){
 const remaining=deadline-Date.now();check(Number.isSafeInteger(remaining)&&remaining>0);
 const signals=[AbortSignal.timeout(remaining),AbortSignal.timeout(stageTimeoutMs)],caller=callerSignal(url,init);if(caller)signals.push(caller);
 const signal=AbortSignal.any(signals);signal.throwIfAborted();let response,copy,reader,onAbort;
 const cancelled=new Promise((_resolve,reject)=>{onAbort=()=>{try{void reader?.cancel(signal.reason).catch(()=>{});}catch{}for(const body of [response?.body,...(!reader?[copy?.body]:[])])try{void body?.cancel().catch(()=>{});}catch{}reject(signal.reason);};signal.addEventListener('abort',onAbort,{once:true});});
 const operation=(async()=>{
  signal.throwIfAborted();boundary.beforeNative?.();signal.throwIfAborted();
  let pending,invocationError;boundary.invokingNative?.();try{pending=nativeFetch(url,{...init,redirect:'error',signal});}catch(error){invocationError=error;}
  try{boundary.afterNative?.();}catch(error){void Promise.resolve(pending).catch(()=>{});throw error;}
  if(invocationError)throw invocationError;response=await pending;
  if(signal.aborted){try{void response.body?.cancel().catch(()=>{});}catch{}signal.throwIfAborted();}
  copy=response.clone();let value,parseError=false;
  try{
   check(copy.body);reader=copy.body.getReader();const chunks=[];let bytes=0;
   for(;;){const item=await reader.read();signal.throwIfAborted();if(item.done)break;bytes+=item.value.byteLength;if(bytes>128*1024){void reader.cancel().catch(()=>{});void response.body?.cancel().catch(()=>{});throw Error('ADMISSION_TIMEOUT_SMOKE_TASK_GUARD');}chunks.push(item.value);}
   value=JSON.parse(Buffer.concat(chunks,bytes).toString('utf8'));
  }catch(error){signal.throwIfAborted();parseError=true;}
  finally{try{reader?.releaseLock();}catch{}}
  signal.throwIfAborted();return {response,value,parseError};
 })();
 try{return await Promise.race([operation,cancelled]);}
 finally{signal.removeEventListener('abort',onAbort);}
}

export const LEDGER_POLICY='phased-provider-admission-v1';
export const INFERENCE_NO_DISPATCH_V1=Symbol.for('impactlens.inference-no-dispatch-v1');
export const INFERENCE_ADMISSION_V1=Symbol.for('impactlens.inference-admission-v1');
let prewarmState;
function cancelBounded(operation,signal){
 signal.throwIfAborted();let onAbort;const cancelled=new Promise((_resolve,reject)=>{onAbort=()=>reject(signal.reason);signal.addEventListener('abort',onAbort,{once:true});});
 return Promise.race([operation,cancelled]).finally(()=>signal.removeEventListener('abort',onAbort));
}
function proofFileStamp(value){
 const path=temporaryPath(value);let at=path;
 while(at!==resolve(root)){check(!lstatSync(at).isSymbolicLink());const parent=resolve(at,'..');check(parent!==at);at=parent;}
 const file=lstatSync(path,{bigint:true});check(file.isFile()&&file.size>0&&file.size<=32n*1024n*1024n);return `${file.dev}:${file.ino}:${file.size}:${file.mtimeNs}:${file.ctimeNs}`;
}
function regularFileIdentity(value){
 const path=resolve(value);check(path.startsWith(resolve(root)+sep));let at=path;
 while(at!==resolve(root)){check(!lstatSync(at).isSymbolicLink());const parent=resolve(at,'..');check(parent!==at);at=parent;}
 const file=lstatSync(path,{bigint:true});check(file.isFile());return `${file.dev}:${file.ino}:${file.size}:${file.mtimeNs}:${file.ctimeNs}`;
}
/** Metadata-only recheck of the exact files whose bytes were verified during admission. */
function nativeBindingSnapshot(task){
 check(prewarmState);const identity=task.identity,identityPath=temporaryPath(process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_IDENTITY??join(directory,'identity.json'));
 const paths=[...new Set([identityPath,temporaryPath(identity.selectionProofPath),...identity.datasetFiles.map(row=>resolve(root,row.path)),...identity.protectedFiles.map(row=>resolve(root,row.path))])];
 return {bindingKey:prewarmState.bindingKey,identityHash:task.identityHash,productionBuild:currentBuildId(),files:paths.map(path=>[path,regularFileIdentity(path)])};
}
function prewarmBinding(task){
 const attempt=readState().state.attempts.at(-1),identity=task.identity;check(attempt?.status==='armed'&&attempt.identityHash===task.identityHash&&Date.now()<attempt.deadline);
 return {task:TASK_ID,identityHash:task.identityHash,codeFingerprint:attempt.codeFingerprint,productionBuild:attempt.productionBuild,datasetPinsHash:boundFiles(identity.datasetFiles),protectedHashDigest:boundFiles(identity.protectedFiles),proofSha256:identity.selectionProofSha256,proofPath:resolve(identity.selectionProofPath),proofStamp:proofFileStamp(identity.selectionProofPath),scenarioSha256:attempt.selectionScenarioSha256,summarySha256:attempt.selectionSummarySha256};
}
function assertPrewarmBinding(task){check(prewarmState&&prewarmState.bindingKey===hash(canonical(prewarmBinding(task)))&&currentBuildId()===prewarmState.productionBuild);}
/** Await in the actual server process before accepting traffic. No provider or financial reservation. */
export async function prewarmAdmission(signal){
 signal?.throwIfAborted();const start=Date.now(),task=taskIdentity(),binding=prewarmBinding(task),bindingKey=hash(canonical(binding));
 const remaining=readState().state.attempts.at(-1).deadline-Date.now();check(remaining>0);signal=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(Math.max(1,Math.min(60000,remaining)))]);
 check(binding.codeFingerprint===currentFingerprint()&&binding.productionBuild===currentBuildId());
 if(prewarmState){check(prewarmState.bindingKey===bindingKey);signal?.throwIfAborted();return Object.freeze({...prewarmState.receipt,cache:'warm',durationMs:Math.max(0,Date.now()-start)});}
 const {preloadGeographicSelectionProof}=await import('./geographic-selection-admission.mjs');signal?.throwIfAborted();
 const proof=await cancelBounded(preloadGeographicSelectionProof({projectRoot:root,proofPath:binding.proofPath,proofSha256:binding.proofSha256}),signal);signal.throwIfAborted();check(Date.now()-start<60000);
 check(proof?.policy==='geographic-selection-admission-v1'&&proof.proofSha256===binding.proofSha256&&proof.representedAgents===10000&&proof.improved===4&&proof.scenarioSha256===binding.scenarioSha256&&proof.summarySha256===binding.summarySha256&&hash(canonical(prewarmBinding(taskIdentity())))===bindingKey);
 const receipt=Object.freeze({version:1,policy:LEDGER_POLICY,taskId:TASK_ID,bindingKey,proofSha256:binding.proofSha256,sourceSha256:binding.codeFingerprint,identitySha256:binding.identityHash,buildSha256:hash(binding.productionBuild),datasetPinsSha256:binding.datasetPinsHash,scenarioSha256:binding.scenarioSha256,summarySha256:binding.summarySha256,cache:'cold',durationMs:Math.max(0,Date.now()-start)});prewarmState={bindingKey,receipt,productionBuild:binding.productionBuild};return receipt;
}
function recordAdmissionEvent(event){try{mutate(d=>{const attempt=d.attempts.at(-1);check(attempt?.status==='armed');(attempt.admissionEvents??=[]).push({...event,policy:LEDGER_POLICY});check(attempt.admissionEvents.length<=64);});}catch{/* Admission errors never compensate by dispatching. */}}

function fresh(){return {version:2,ledgerPolicy:LEDGER_POLICY,task:TASK_ID,limits:LIMITS,attempts:[],requests:[],blocked:[],halted:false};}
function readState(){
 if(!existsSync(journal)){check(!existsSync(projection)&&!existsSync(headPath));return {state:fresh(),head:'genesis',revision:0};}
 check(existsSync(headPath)&&statSync(headPath).size<=4096);const currentStamp=stamp(journal)+':'+stamp(headPath);if(verifiedCache?.stamp===currentStamp)return structuredClone(verifiedCache.value);
 check(statSync(journal).size<512*1024*1024);const content=readFileSync(journal,'utf8');check(content.endsWith('\n'));
 let head='genesis',revision=0,state;
 for(const line of content.trimEnd().split('\n')){const row=JSON.parse(line);check(row.version===1&&row.previousHash===head&&row.revision===revision+1&&hash(JSON.stringify(row.state))===row.stateHash&&hash(row.previousHash+':'+row.revision+':'+row.stateHash)===row.hash);head=row.hash;revision=row.revision;state=row.state;}
 const anchor=JSON.parse(readFileSync(headPath,'utf8'));check(anchor.version===1&&anchor.revision===revision&&anchor.hash===head);
 check(state?.version===2&&state.ledgerPolicy===LEDGER_POLICY&&state.task===TASK_ID&&JSON.stringify(state.limits)===JSON.stringify(LIMITS)&&Array.isArray(state.requests)&&Array.isArray(state.attempts));
 const value={state,head,revision};verifiedCache={stamp:currentStamp,value:structuredClone(value)};return value;
}
function append(state,prior){
 const stateHash=hash(JSON.stringify(state)),revision=prior.revision+1,row={version:1,revision,previousHash:prior.head,stateHash,hash:hash(prior.head+':'+revision+':'+stateHash),state};
 const bytes=Buffer.from(JSON.stringify(row)+'\n');check(bytes.length<1048576);const fd=openSync(journal,'a');try{check(writeSync(fd,bytes)===bytes.length);fsyncSync(fd);}finally{closeSync(fd);}
 // Both files are fsynced before dispatch. A torn head fails closed; the head
 // detects journal rollback. The local owner remains trusted not to delete or
 // rewrite the entire ledger and anchor together.
 const anchor=Buffer.from(JSON.stringify({version:1,revision,hash:row.hash})+'\n'),headFd=openSync(headPath,'w',0o600);try{check(writeSync(headFd,anchor)===anchor.length);fsyncSync(headFd);}finally{closeSync(headFd);}
 verifiedCache={stamp:stamp(journal)+':'+stamp(headPath),value:{state:structuredClone(state),head:row.hash,revision}};
 // Convenience projection only. The fsynced hash-chained journal is authoritative.
 try{writeFileSync(projection,JSON.stringify(state,null,2));}catch{/* Never substitute this file for the journal. */}
}
function mutate(operation){
 check(directory.startsWith(resolve(root,'tmp')+sep));mkdirSync(directory,{recursive:true});
 const identity=JSON.stringify({pid:process.pid,nonce:randomUUID()}),fd=openSync(lockPath,'wx');
 try{writeSync(fd,identity);const prior=readState(),result=operation(prior.state);append(prior.state,prior);return result;}
 finally{closeSync(fd);if(readFileSync(lockPath,'utf8')===identity)unlinkSync(lockPath);}
}
export function totals(d=readState().state){
 const o=d.requests.filter(r=>r.service==='openrouter'),t=d.requests.filter(r=>r.service==='tavily');
 const knownTokens=key=>o.every(r=>r[key]!==null)?o.reduce((n,r)=>n+r[key],0):null;
  return {attempts:d.attempts.length,...Object.fromEntries(Object.values(STAGES).map(stage=>[stage.purpose,o.filter(r=>r.purpose===stage.purpose).length])),planning:o.filter(r=>['entity','relationship'].includes(r.purpose)).length,completions:o.length,tavilySearches:t.length,reportedUsd:o.reduce((n,r)=>n+(r.costUsd??0),0),conservativeUsd:o.reduce((n,r)=>n+(r.costUsd??r.reservedUsd),0),unknownCharges:o.filter(r=>r.costUsd===null).length,outstandingUsd:o.filter(r=>r.costUsd===null).reduce((n,r)=>n+r.reservedUsd,0),reportedCredits:t.reduce((n,r)=>n+(r.credits??0),0),conservativeCredits:t.reduce((n,r)=>n+(r.credits??r.reservedCredits),0),inputTokens:knownTokens('inputTokens'),outputTokens:knownTokens('outputTokens'),accountedTokens:o.reduce((n,r)=>n+(r.inputTokens!==null&&r.outputTokens!==null?r.inputTokens+r.outputTokens:Math.max(r.reservedTokens,(r.inputTokens??0)+(r.outputTokens??0))),0),reservedTokens:o.filter(r=>r.inputTokens===null||r.outputTokens===null).reduce((n,r)=>n+r.reservedTokens,0),pending:d.requests.filter(r=>r.state==='pending'||r.metadataState==='pending').length,interrupted:d.requests.filter(r=>r.state==='interrupted'||r.state==='uncertain'||r.metadataState==='interrupted').length,halted:d.halted};
}
export function currentFingerprint(){
 const names=[...new Set([...execFileSync('git',['diff','HEAD','--name-only'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split('\n'),...execFileSync('git',['ls-files','--others','--exclude-standard'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split('\n')])].filter(p=>/^(app|components|lib|scripts)\//.test(p)&&!p.includes('..')).sort();
 const result=createHash('sha256');result.update(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}));
 // These files determine the build, dependency graph and server trace boundaries.
 // Hash their actual bytes even when Git considers them unchanged or ignored.
 for(const name of ['next.config.ts','package.json','package-lock.json','tsconfig.json','postcss.config.mjs'])result.update('root-config\0'+name+'\0').update(existsSync(join(root,name))?readFileSync(join(root,name)):'MISSING').update('\0');
 for(const name of names)result.update(name+'\0').update(existsSync(join(root,name))?readFileSync(join(root,name)):'DELETED');
 return result.digest('hex');
}
function currentBuildId(){
 const override=process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_TEST_BUILD_ID_PATH;
 if(override!==undefined){check(process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_LIVE_GUARD!=='true'&&process.env.NODE_ENV!=='production');const path=resolve(override);check(path.startsWith(resolve(root,'tmp')+sep));return readFileSync(path,'utf8').trim();}
 return readFileSync(join(root,'.next','BUILD_ID'),'utf8').trim();
}
function historicalProof(gate,codeFingerprint){
 const reportPath=gate.historicalReportPath;
 check(typeof reportPath==='string');const path=resolve(reportPath);check(path.startsWith(resolve(root,'tmp')+sep));
 const bytes=readFileSync(path),reportHash=hash(bytes);check(typeof gate.historicalReportHash==='string'&&/^[a-f0-9]{64}$/.test(gate.historicalReportHash)&&reportHash===gate.historicalReportHash);
 const report=JSON.parse(bytes.toString('utf8')),{manifestHash,manifest}=readHistoricalScopeManifest(root),artifact=manifest.artifact;
 check(report?.version===3&&report.codeFingerprint===codeFingerprint&&/^[a-f0-9]{64}$/.test(report.snapshotHash)&&report.scope?.version===1&&report.scope.manifestHash===manifestHash&&integer(report.priorFilesUnchanged)>0&&report.providerCalls===0&&report.networkAttempts===0);
 const mandatory=report.mandatory,inventory=report.inventory;
 check(mandatory?.status==='PASS'&&integer(mandatory.expected)>=20&&mandatory.passed===mandatory.expected&&Array.isArray(mandatory.failures)&&mandatory.failures.length===0&&Array.isArray(mandatory.historical)&&Array.isArray(mandatory.swarm));
 check(inventory?.status==='COMPLETE_WITH_CLASSIFIED_UNRESOLVED'&&inventory.qualifying===mandatory.expected&&inventory.unresolved===1&&Array.isArray(inventory.entries));
 check(isDeepStrictEqual(inventory.classified,[{file:artifact.archiveFile,classification:artifact.classification,qualification:artifact.qualification,replayStatus:artifact.replayStatus,hashesVerified:true,sourcePolicyRecoverable:false,recordIndex:artifact.failure.firstDivergentRecord,tick:artifact.failure.firstDivergentTick}]));
 const rows=[...mandatory.historical,...mandatory.swarm],files=new Set();
 check(rows.length===mandatory.expected);
 for(const row of rows){
  check(row&&typeof row.file==='string'&&/^[a-f0-9]{64}\.json$/.test(row.file)&&row.file!==artifact.archiveFile&&!files.has(row.file)&&row.replayExact===true&&row.roundTripExact===true&&row.archiveUnchanged===true&&row.journalUnchanged===true&&(row.checkpointTailExact===true||row.checkpointTailExact===null));
  files.add(row.file);
 }
 const entries=new Set();let classified=0,qualifying=0;
 for(const entry of inventory.entries){
  check(entry&&typeof entry.file==='string'&&/^[a-f0-9]{64}\.json$/.test(entry.file)&&!entries.has(entry.file));entries.add(entry.file);
  if(entry.file===artifact.archiveFile){check(entry.coverage==='classified-unresolved');classified++;}
  else if(files.has(entry.file)){check(entry.coverage==='mandatory-strict-replay');qualifying++;}
  else check(entry.coverage==='unchanged-preexisting-preservation-only-coverage');
 }
 check(classified===1&&qualifying===mandatory.expected);
 return {historicalReportHash:reportHash,historicalScopeManifestHash:manifestHash};
}
function temporaryPath(value){check(typeof value==='string');const path=resolve(value);check(path.startsWith(resolve(root,'tmp')+sep));return path;}
function boundFiles(value){
 check(Array.isArray(value)&&value.length>0&&value.length<=10000);const seen=new Set();
 for(const row of value){check(row&&typeof row.path==='string'&&!row.path.includes('\\')&&!row.path.split('/').includes('..')&&!seen.has(row.path)&&digest(row.sha256));seen.add(row.path);const path=resolve(root,row.path);check(path.startsWith(resolve(root)+sep)&&existsSync(path)&&hash(readFileSync(path))===row.sha256);}
 return hash(canonical(value));
}
function taskIdentity(){
 const path=temporaryPath(process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_IDENTITY??join(directory,'identity.json'));check(statSync(path).size<=1024*1024);const raw=readFileSync(path),identity=JSON.parse(raw.toString('utf8'));
 check(identity?.version===2&&identity.executionBundle==='hybrid-citizen-explore-v1'&&identity.taskId===TASK_ID&&typeof identity.question==='string'&&identity.question.trim().length>0&&identity.question.length<=12000&&typeof identity.expectedGeometryKey==='string'&&integer(identity.expectedGeometryRevision)!==null&&identity.anchors!==undefined);
 check(isDeepStrictEqual(identity.policies,{context:'conversation-menu-v7',behaviour:'citizen-menu-v4',prose:'citizen-prose-v1',issue:'issue-declaration-v1',selection:'citizen-selection-v2'}));
 check(isDeepStrictEqual(identity.operatorPolicy,OPERATOR_POLICY)&&typeof identity.selectionProofPath==='string'&&digest(identity.selectionProofSha256));
 const proofPath=temporaryPath(identity.selectionProofPath);proofFileStamp(proofPath);check(hash(readFileSync(proofPath))===identity.selectionProofSha256);
 check(typeof identity.diagnosticRoot==='string'&&resolve(identity.diagnosticRoot).startsWith(resolve(root,'tmp')+sep)&&!resolve(identity.diagnosticRoot).split(sep).some(p=>['session-store-v2','social-sessions','accepted-private'].includes(p.toLowerCase()))&&statSync(identity.diagnosticRoot).isDirectory());
 const geometry=parseScenarioGeometry(JSON.parse(identity.expectedGeometryKey));check(geometry.features.length>0&&geometryKey(geometry)===identity.expectedGeometryKey);
 const hybrid=parseHybridExploreOptions(identity.hybrid);check(hybrid.interpretationPolicy==='hybrid-map-v2'&&canonical(hybrid.anchors)===canonical(identity.anchors));
 check(typeof identity.interpretationRequired==='boolean');check(!identity.interpretationRequired||digest(identity.acceptedInterpretationBinding));check(identity.acceptedInterpretationBinding===undefined||digest(identity.acceptedInterpretationBinding));
 check(identity.retrievalPlanningArea===undefined||identity.retrievalPlanningArea===null||typeof identity.retrievalPlanningArea==='string'&&identity.retrievalPlanningArea.length<=80);
 return {identity,geometry,hybrid,hybridHash:hash(canonical(hybrid)),retrievalQuery:buildRetrievalQuery(identity.question,identity.retrievalPlanningArea,'balanced-question-v1'),identityHash:hash(raw),questionHash:hash(identity.question),geometryHash:hash(identity.expectedGeometryKey)};
}
function offlineProof(identity,codeFingerprint,buildId){
 const path=temporaryPath(process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_OFFLINE_GATE??join(directory,'offline-gate.json'));check(statSync(path).size<=1024*1024);const raw=readFileSync(path),gate=JSON.parse(raw.toString('utf8'));
 check(gate.version===3&&gate.taskId===TASK_ID&&gate.offlinePass===true&&integer(gate.nodeTests)>=2049&&gate.focusedPass===true&&integer(gate.focusedTests)>0&&gate.tsApp===true&&gate.tsStrict===true&&typeof gate.productionBuild==='string'&&gate.productionBuild.length>0&&gate.productionBuild===buildId&&gate.codeFingerprint===codeFingerprint&&gate.identityHash===identity.identityHash);
 for(const field of ['desktop50','desktop100','plotDesktop1440','plotDesktop1920','historical20','classifiedArtifact','privacy','fullAndTailReplay','protectedHash','datasetPins','proseDiagnosticSink'])check(gate[field]===true);
 check(gate.providerCalls===0&&gate.networkAttempts===0&&gate.datasetPinsHash===boundFiles(identity.identity.datasetFiles)&&gate.protectedHashDigest===boundFiles(identity.identity.protectedFiles));
 const readinessPath=temporaryPath(gate.readinessReportPath),readinessRaw=readFileSync(readinessPath);check(digest(gate.readinessReportHash)&&hash(readinessRaw)===gate.readinessReportHash);
 const readiness=JSON.parse(readinessRaw.toString('utf8'));check(readiness.version===2&&readiness.taskId===TASK_ID&&readiness.codeFingerprint===codeFingerprint&&readiness.identityHash===identity.identityHash&&readiness.status==='PASS'&&readiness.providerCalls===0&&readiness.networkAttempts===0);
 const assessment=gate.benchmarkAssessment;check(assessment?.version===1&&digest(assessment.sourceBaselineFingerprint));
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim();
 check(gate.benchmarks14===false&&gate.selection350===true&&gate.selectionFocused===true&&assessment.decision==='SOURCE_JUSTIFIED_HISTORICAL_REUSE'&&assessment.status==='PASS'&&assessment.codeFingerprint===codeFingerprint&&assessment.currentHead===head&&assessment.baselineCommit===head&&assessment.currentTree===tree&&assessment.baselineTree===tree&&assessment.applicationSourceUnchanged===false&&assessment.admissionTimeoutRepairCovered===true&&assessment.affectedIntegration===true&&assessment.benchmarkRows===14&&assessment.executedFresh===false&&Array.isArray(assessment.runtimeSourceFiles)&&assessment.runtimeSourceFiles.length>=11&&Array.isArray(assessment.unchangedSourceFiles)&&assessment.unchangedSourceFiles.length>=11);
 boundFiles(assessment.changedSourceFiles);check(assessment.changedSourceFiles.some(row=>row.path==='lib/server/inference/deepseek.ts'));boundFiles(assessment.runtimeSourceFiles);for(const row of assessment.unchangedSourceFiles){check(/^(app|components|lib)\//.test(row.path));const working=execFileSync('git',['hash-object','--',row.path],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(),committed=execFileSync('git',['rev-parse',`HEAD:${row.path}`],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();check(working===committed);}
 const benchmarkProof={benchmarkDisposition:assessment.decision,benchmarkAssessmentHash:hash(canonical(assessment)),benchmarkEvidenceHash:boundFiles(assessment.evidenceFiles),benchmarkRuntimePinsHash:boundFiles(assessment.runtimeSourceFiles),benchmarkSourcePinsHash:boundFiles(assessment.unchangedSourceFiles)};
 return {...benchmarkProof,offlineGateHash:hash(raw),readinessReportHash:gate.readinessReportHash,datasetPinsHash:gate.datasetPinsHash,protectedHashDigest:gate.protectedHashDigest,...historicalProof(gate,codeFingerprint)};
}
export async function armAttempt(id=1){
 const identity=taskIdentity(),codeFingerprint=currentFingerprint(),buildId=currentBuildId(),proof=offlineProof(identity,codeFingerprint,buildId);
 const {preloadGeographicSelectionProof}=await import('./geographic-selection-admission.mjs');
 const selectionProof=await preloadGeographicSelectionProof({projectRoot:root,proofPath:identity.identity.selectionProofPath,proofSha256:identity.identity.selectionProofSha256});
 check(selectionProof?.policy==='geographic-selection-admission-v1'&&selectionProof.proofSha256===identity.identity.selectionProofSha256&&selectionProof.representedAgents===10000&&selectionProof.improved===4&&digest(selectionProof.summarySha256)&&digest(selectionProof.scenarioSha256)&&Number.isFinite(Date.parse(selectionProof.createdAt))&&Date.parse(selectionProof.createdAt)<=Date.now());
 check(currentFingerprint()===codeFingerprint&&taskIdentity().identityHash===identity.identityHash&&currentBuildId()===buildId);
 return mutate(d=>{const s=totals(d);check(!d.halted&&id===1&&d.attempts.length===0&&d.requests.length===0&&!networkPending(d));check(s.conservativeUsd+RESERVED_USD<=LIMITS.usd);d.attempts.push({id,identityHash:identity.identityHash,questionHash:identity.questionHash,geometryHash:identity.geometryHash,geometryRevision:identity.identity.expectedGeometryRevision,anchorsHash:hash(canonical(identity.identity.anchors)),hybridHash:identity.hybridHash,codeFingerprint,productionBuild:buildId,...proof,selectionProofSha256:identity.identity.selectionProofSha256,selectionSummarySha256:selectionProof.summarySha256,selectionScenarioSha256:selectionProof.scenarioSha256,operatorPolicy:OPERATOR_POLICY,status:'armed',armedAt:new Date().toISOString(),deadline:Date.now()+LIMITS.deadlineMs,admission:{entity:1,relationship:1,action:8,personality:3,interpretation:1,social:8,completions:22,concurrency:1},armingCheckUsd:RESERVED_USD,ledgerPolicy:LEDGER_POLICY});return totals(d);});
}
/** Call only from the server after validating the actual Explore envelope. Never a browser grant. */
export function bindExploreInput(input){
 const identity=taskIdentity(),hybrid=parseHybridExploreOptions(input?.hybrid);check(input?.question===identity.identity.question&&input.geometryRevision===identity.identity.expectedGeometryRevision&&geometryKey(input.geometry)===identity.identity.expectedGeometryKey&&input.anchors!==undefined&&canonical(input.anchors)===canonical(identity.identity.anchors)&&canonical(hybrid.anchors)===canonical(input.anchors)&&canonical(hybrid)===canonical(identity.hybrid));
 return mutate(d=>{const attempt=d.attempts.at(-1);check(!d.halted&&attempt?.status==='armed'&&Date.now()<attempt.deadline&&attempt.identityHash===identity.identityHash&&attempt.hybridHash===identity.hybridHash&&!attempt.exploreBindingHash&&d.requests.length===0);attempt.exploreBindingHash=hash(canonical({question:input.question,geometryKey:geometryKey(input.geometry),geometryRevision:input.geometryRevision,anchors:input.anchors,hybrid}));return attempt.exploreBindingHash;});
}
export function finishAttempt(status){check(['failed','partial','passed','budget-limited','blocked'].includes(status));return mutate(d=>{check(d.attempts.at(-1)?.status==='armed'&&!networkPending(d));Object.assign(d.attempts.at(-1),{status,finishedAt:new Date().toISOString()});return totals(d);});}
/** Explicit operator acknowledgement only after verifying the original process is stopped. Never redispatches. */
export function acknowledgeInterrupted(id){return mutate(d=>{const record=d.requests.find(r=>r.id===id);check(record&&(record.state==='pending'||record.metadataState==='pending'));record.state='uncertain';if(record.metadataState==='pending')record.metadataState='interrupted';record.acknowledgedAt=new Date().toISOString();d.halted=true;return totals(d);});}

function contextShape(context,output){
 const choice=context.choices?.find(c=>c.id===output?.choiceId),target=context.items?.find(i=>i.id===choice?.target),peer=c=>['comment','reply','group-reply'].includes(c.action)&&context.items?.some(i=>i.id===c.target&&i.modelAuthored&&i.actorId!==context.actor?.id);
 const evidence=context.issueOptions?.find(option=>option.id===output?.issueEvidenceId),kind=evidence?.kind;
 return {actorHash:safeId(context.actor?.id)?hash(context.actor.id):null,tick:integer(context.tick),itemCount:Array.isArray(context.items)?context.items.length:null,memoryCount:Array.isArray(context.memories)?context.memories.length:null,episodicCount:context.memories?.filter(m=>m.origin==='episodic').length??0,offeredPeerReplies:context.choices?.filter(peer).length??0,selectedAction:actions.has(choice?.action)?choice.action:null,selectedPeerReply:!!choice&&peer(choice),targetKind:!choice?.target?'none':target?.groupId?'group-item':target?.parentId?'reply':target?'post':'other',optionalRecalls:Array.isArray(output?.recallIds)?output.recallIds.length:null,issueKind:['question','condition','disagreement','commitment','progress','resolve','withdraw'].includes(kind)?kind:null,evidenceSelected:typeof output?.issueEvidenceId==='string',selectedEvidenceOffered:typeof output?.issueEvidenceId==='string'?!!evidence:null,selectedFacts:Array.isArray(output?.factIds)?Math.min(3,output.factIds.length):null,allSelectedFactsOffered:Array.isArray(output?.factIds)?output.factIds.every(id=>context.proseRules?.allowedFactIds?.includes(id)):null};
}
function inspectResult(record,value,body,context){
 check(value!==null&&typeof value==='object'&&!Array.isArray(value));
 const usage=value?.usage??{};
 Object.assign(record,{inputTokens:integer(usage.prompt_tokens),outputTokens:integer(usage.completion_tokens),reasoningTokens:integer(usage.completion_tokens_details?.reasoning_tokens),costUsd:finite(usage.cost),credits:finite(usage.credits)});
 if(record.service==='tavily'){
  record.resultCount=Array.isArray(value.results)?value.results.length:null;
  record.sourceHashes=(Array.isArray(value.results)?value.results:[]).slice(0,5).flatMap(source=>{try{const u=new URL(source.url);return u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<=1000?[hash(u.href)]:[];}catch{return [];}});
  record.malformedOutput=!record.resultCount||record.resultCount>5||!record.sourceHashes.length;
  return;
 }
 Object.assign(record,{generationId:safeId(value.id),model:value.model===model?model:null,provider:ocean(value.provider)?'DigitalOcean':null,identityVerification:value.model===model&&ocean(value.provider)?'completion':'unverified',identityMismatch:value.model!==undefined&&value.model!==model||value.provider!==undefined&&!ocean(value.provider),finishReason:['stop','length','error','content_filter','tool_calls'].includes(value.choices?.[0]?.finish_reason)?value.choices[0].finish_reason:null});
 if(record.outputTokens!==null&&record.outputTokens>STAGES[record.schema].outputTokens)record.malformedOutput=true;
 if(record.httpStatus>=200&&record.httpStatus<300&&record.identityVerification==='unverified'&&!record.generationId)record.identityMismatch=true;
 if(value.error){const raw=JSON.stringify(value.error);record.upstreamCategory=/schema|anyof|\$defs|structured|regex|pattern|grammar/i.test(raw)?'structured-output':/rate.?limit|too many requests/i.test(raw)?'rate-limit':/timeout|timed out/i.test(raw)?'timeout':'upstream';record.upstreamDigest=hash(raw);}
 const content=value.choices?.[0]?.message?.content;record.outputHash=typeof content==='string'?hash(content):null;
 try{const output=JSON.parse(content);check(output&&typeof output==='object'&&!Array.isArray(output)&&record.finishReason==='stop'&&Buffer.byteLength(content)<=STAGES[record.schema].outputBytes);
  if(record.purpose==='personality'){
   const slots=new Set(context.slots.map(s=>s.slotId));check(Object.keys(output).length===1&&Array.isArray(output.profiles)&&output.profiles.length===35);
   for(const profile of output.profiles){check(profile&&Object.keys(profile).length===7&&slots.delete(profile.slotId)&&['direct','reflective','concise','exploratory','supportive'].includes(profile.style)&&['c','i','d','k','u'].every(k=>Number.isSafeInteger(profile[k])&&profile[k]>=0&&profile[k]<=4));}check(slots.size===0);
  }
 }catch{record.malformedOutput=true;}
 if(record.purpose==='social'){let output;try{output=JSON.parse(value.choices?.[0]?.message?.content);}catch{/* Structural metrics only; no output preservation. */}record.social=contextShape(context,output);}
 if(['entity','relationship'].includes(record.purpose)){try{const result=JSON.parse(value.choices?.[0]?.message?.content);const count=value=>{if(value===undefined)return null;if(!Array.isArray(value)||value.length>512){record.malformedOutput=true;return null;}return value.length;};record.planning={scope:['local','cross-border','international','undetermined'].includes(result.scope)?result.scope:null,jurisdictions:count(result.jurisdictions),agentCount:count(result.agents),entityCount:count(result.entities),relationshipCount:count(result.relationships)};}catch{/* Raw provider text is never retained. */}}
}
function blocked(){try{mutate(d=>{d.blocked.push({at:new Date().toISOString(),rule:'TASK_REQUEST_REJECTED'});if(d.blocked.length>512)d.blocked=d.blocked.slice(-512);});}catch{/* Fail closed; never dispatch to compensate for a ledger error. */}}

function inspectCompletionBody(body,raw){
 const schema=body.response_format?.json_schema?.name;let context,purpose,requestKey,stage;
    check(Object.keys(body).every(key=>['model','provider','reasoning','stream','max_tokens','response_format','messages','n'].includes(key)));
    check(Object.hasOwn(STAGES,schema));stage=STAGES[schema];purpose=stage.purpose;
    check(body.model===model&&isDeepStrictEqual(body.provider,{only:['digitalocean'],allow_fallbacks:false,require_parameters:true})&&isDeepStrictEqual(body.reasoning,{effort:'none',exclude:true})&&body.stream===false&&body.response_format?.type==='json_schema'&&body.response_format.json_schema.strict===true&&body.response_format.json_schema.schema&&typeof body.response_format.json_schema.schema==='object'&&!Array.isArray(body.response_format.json_schema.schema)&&(body.n===undefined||body.n===1)&&body.tools===undefined&&body.tool_choice===undefined);
    check(Number.isInteger(body.max_tokens)&&body.max_tokens>0&&body.max_tokens<=stage.outputTokens);
    check(Array.isArray(body.messages)&&body.messages.length>=1&&body.messages.length<=2&&body.messages.filter(m=>m.role==='user').length===1&&body.messages.every(m=>['system','user'].includes(m.role)&&typeof m.content==='string'));
    const user=body.messages.find(m=>m.role==='user').content;check(Buffer.byteLength(user)<=LIMITS.contextBytes);context=JSON.parse(user);check(context&&typeof context==='object'&&!Array.isArray(context));
    let identity=schema;
    if(purpose==='action'){identity=integer(context.turnIndex);check(identity!==null&&identity<8);}
    if(purpose==='social'){identity=safeId(context.id);check(identity&&context.policy==='conversation-menu-v7'&&context.proseRules?.policy==='citizen-prose-v1'&&context.issueRules?.policy==='issue-declaration-v1'&&context.issueRules.authoredProseIsEvidence===false&&Array.isArray(context.issueOptions)&&context.issueOptions.length<=24&&context.issueOptions.every(o=>o&&/^declaration-v1-[a-f0-9]{16}$/.test(o.id)&&['question','condition','commitment','disagreement','progress','resolve','withdraw'].includes(o.kind)&&typeof o.statement==='string'&&o.statement.length>0&&o.statement.length<=240&&o.statementOrigin==='model-selected-server-rendered')&&integer(context.tick)!==null&&context.tick<=320&&safeId(context.actor?.id)&&context.grounding?.citizenId===context.actor.id&&!Object.hasOwn(context.grounding,'profiles'));}
    if(purpose==='personality'){
     check(isDeepStrictEqual(Object.keys(context).sort(),['diversityToken','policy','slots','version'])&&context.version===1&&context.policy==='citizen-personality-v1'&&digest(context.diversityToken)&&Array.isArray(context.slots)&&context.slots.length===35&&context.slots.every((slot,i)=>isDeepStrictEqual(slot,{slotId:'profile-'+(i+1)})));
     identity=hash(canonical(context));
    }
    requestKey=hash(schema+':'+identity);

 return {schema,context,purpose,requestKey,stage};
}

export function createGuardedFetch(nativeFetch){
 let preparePending=false,deadline,selectionCache;const permits=new Map();
 const taskDeadline=()=>{if(deadline===undefined){deadline=readState().state.attempts.at(-1)?.deadline;check(Number.isSafeInteger(deadline));}return deadline;};
 const reserveRequest=({url,init,service,purpose,schema,raw,body,context,requestKey,stage,task,selectionAdmission,permit})=>mutate(d=>{
    callerSignal(url,init)?.throwIfAborted();const attempt=d.attempts.at(-1),s=totals(d);check(!d.halted&&attempt?.status==='armed'&&attempt.deadline-Date.now()>=STAGE_TIMEOUTS[purpose]&&!networkPending(d)&&attempt.identityHash===task.identityHash&&attempt.exploreBindingHash);
    const prior=d.requests.filter(r=>r.attempt===attempt.id);check(!requestKey||!prior.some(r=>r.requestKey===requestKey));
    const completed=purpose=>prior.filter(r=>r.purpose===purpose&&r.state==='returned'&&r.httpStatus>=200&&r.httpStatus<300&&!r.malformedOutput&&!r.identityMismatch&&['completion','generation-details'].includes(r.identityVerification)).length;
    if(service==='openrouter'){
     if(purpose!=='personality')check((purpose==='action'?context.input?.question:context.question)===task.identity.question);
     if(purpose==='entity'){
      const features=task.geometry.features.slice(0,24).map(f=>f.kind==='point'?f:{...f,coordinates:f.coordinates.slice(0,12)});
      check(context.spatial?.provenance==='user-drawn'&&isDeepStrictEqual(context.spatial.features,features));
     }
     if(purpose==='interpretation')check(task.identity.interpretationRequired===true&&digest(task.identity.acceptedInterpretationBinding)&&context.bindingKey===task.identity.acceptedInterpretationBinding);
     if(purpose!=='interpretation'){
      const retrieval=prior.filter(r=>r.service==='tavily');check(retrieval.length===1&&retrieval[0].state==='returned'&&retrieval[0].httpStatus>=200&&retrieval[0].httpStatus<300&&retrieval[0].resultCount>0&&retrieval[0].sourceHashes?.length>0);
     }
     check(!prior.some(r=>r.service==='openrouter'&&r.httpStatus>=200&&r.httpStatus<300&&!['completion','generation-details'].includes(r.identityVerification)));
     if(purpose==='relationship')check(completed('entity')===1);
     if(purpose==='action')check(completed('entity')===1&&completed('relationship')===1);
     if(purpose==='personality')check(completed('action')===8&&s.social===0);
     if(purpose==='social'){check(completed('action')===8&&completed('personality')>=1);if(!attempt.selectionAdmission){check(selectionAdmission&&selectionAdmission.summarySha256===attempt.selectionSummarySha256&&selectionAdmission.scenarioSha256===attempt.selectionScenarioSha256);attempt.selectionAdmission={verified:true,proofSha256:task.identity.selectionProofSha256,selectionSha256:selectionAdmission.selectionSha256,runSha256:selectionAdmission.runSha256,active:50,capable:35,improvedCapable:4};}}
     check(prior.filter(r=>r.schema===schema).length<stage.calls&&s[purpose]<LIMITS[purpose]&&s.completions<LIMITS.completions&&s.conservativeUsd+RESERVED_USD<=LIMITS.usd&&s.accountedTokens+Buffer.byteLength(raw)+2000+body.max_tokens<=LIMITS.tokens);
    }
    else check(Object.keys(body).every(key=>['query','search_depth','chunks_per_source','max_results','topic','include_answer','include_raw_content','include_images','include_image_descriptions','include_favicon','auto_parameters','include_published_date','include_usage'].includes(key))&&body.search_depth==='basic'&&Number.isInteger(body.max_results)&&body.max_results>=1&&body.max_results<=5&&body.auto_parameters===false&&(body.chunks_per_source===undefined||body.chunks_per_source===1)&&(body.topic===undefined||body.topic==='general')&&['include_answer','include_raw_content','include_images','include_image_descriptions'].every(k=>body[k]===undefined||body[k]===false)&&!prior.some(r=>r.service==='tavily')&&s.tavilySearches<LIMITS.tavilySearches&&s.conservativeCredits+2<=LIMITS.tavilyCredits&&body.query===task.retrievalQuery);
    const next={id:d.requests.length+1,ledgerPolicy:LEDGER_POLICY,nativeInvoked:false,nativeInvocationState:'not-invoked',chargeClassification:'reserved-before-native',admissionDurationMs:permit?.durationMs??0,admissionReceiptVerified:!!permit,nativeBindingHash:permit?.nativeBindingHash??null,phaseEvents:[],attempt:attempt.id,service,purpose,schema:schema??null,schemaHash:service==='openrouter'?hash(canonical(body.response_format.json_schema.schema)):null,requestKey,inputHash:hash(raw),exploreBindingHash:attempt.exploreBindingHash,deadline:attempt.deadline,stageTimeoutMs:STAGE_TIMEOUTS[purpose],startedAt:new Date().toISOString(),state:'pending',reservedUsd:service==='openrouter'?RESERVED_USD:0,reservedCredits:service==='tavily'?2:0,reservedTokens:service==='openrouter'?Buffer.byteLength(raw)+2000+body.max_tokens:0,costUsd:null,credits:null,inputTokens:null,outputTokens:null};d.requests.push(next);return structuredClone(next);
   });
 const guardedFetch=async function guardedFetch(url,init={}){
  const address=typeof url==='string'?url:url instanceof URL?url.href:url.url;
  const service=address==='https://api.tavily.com/search'?'tavily':address==='https://openrouter.ai/api/v1/chat/completions'?'openrouter':null;
  if(!service){
   if(/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//.test(address))return nativeFetch(url,init);
   if(address.startsWith('https://openrouter.ai/api/v1/generation?'))return generationDetails(nativeFetch,url,init,address);
   blocked();throw Error('ADMISSION_TIMEOUT_SMOKE_TASK_GUARD');
  }
  const earlyPermit=typeof init.body==='string'?permits.get(hash(init.body)):undefined;let record=earlyPermit?.record;
  try{
   callerSignal(url,init)?.throwIfAborted();
   check(init.body===undefined||typeof init.body==='string');
   const raw=typeof init.body==='string'?init.body:typeof url?.clone==='function'?await url.clone().text():null;
   check(typeof raw==='string'&&Buffer.byteLength(raw)<=LIMITS.requestBytes&&(init.method??url.method)==='POST');const body=JSON.parse(raw);let schema=body.response_format?.json_schema?.name;
   let context,purpose='retrieval',requestKey=null,stage;
   if(service==='openrouter'){
    ({schema,context,purpose,requestKey,stage}=inspectCompletionBody(body,raw));
   }
   let task,selectionAdmission,permit;
   if(purpose==='social'){
    permit=permits.get(hash(raw));check(permit);permits.delete(hash(raw));task=permit.task;
    check(permit.contextSha256===hash(context.id)&&permit.contextBodySha256===hash(canonical(context))&&permit.runSha256===hash(context.runId)&&permit.identityHash===task.identityHash&&permit.deadline===taskDeadline());
    check(prewarmState?.bindingKey===permit.prewarmBindingKey&&hash(canonical(nativeBindingSnapshot(task)))===permit.nativeBindingHash);selectionAdmission=permit.selectionAdmission;
   }else task=taskIdentity();
   callerSignal(url,init)?.throwIfAborted();check(Date.now()<taskDeadline());
   record=purpose==='social'?permit.record:reserveRequest({url,init,service,purpose,schema,raw,body,context,requestKey,stage,task,selectionAdmission,permit});
   if(permit)permit.consumed=true;
   const start=Date.now();if(permit)permit.dispatchStartedAt=start;let returnedResponse,nativeInvoked=false;
   const markNative=(event)=>{record.nativeInvocationState=event;record.phaseEvents.push({phase:event,elapsedMs:Math.max(0,Date.now()-start)});mutate(d=>{const index=d.requests.findIndex(r=>r.id===record.id);check(index>=0&&d.requests[index].state==='pending');d.requests[index]=structuredClone(record);});};
   try{const {response,value,parseError}=await dispatchBounded(nativeFetch,url,init,record.deadline,record.stageTimeoutMs,{beforeNative:()=>{check(!permit?.cancelled);callerSignal(url,init)?.throwIfAborted();check(Date.now()<record.deadline);markNative('native-dispatch-authorized');check(!permit?.cancelled);callerSignal(url,init)?.throwIfAborted();check(Date.now()<record.deadline);},invokingNative:()=>{nativeInvoked=true;record.nativeInvoked=true;if(permit)permit.nativeAttempted=true;},afterNative:()=>{nativeInvoked=true;record.nativeInvoked=true;record.chargeClassification='unknown-after-native-boundary';markNative('native-invoked');}});record.httpStatus=response.status;try{check(!parseError);inspectResult(record,value,body,context);}catch{record.malformedOutput=true;if(service==='openrouter'&&response.status>=200&&response.status<300)record.identityMismatch=true;/* Missing telemetry remains conservatively reserved. */}record.state='returned';record.chargeClassification=record.costUsd!==null?'reported':'unknown-after-native-boundary';record.phaseEvents.push({phase:'response-returned-verified',elapsedMs:Math.max(0,Date.now()-start)});returnedResponse=response;}
   catch(error){if(!nativeInvoked){record.state='cancelled-before-native';record.nativeInvoked=false;record.nativeInvocationState='authoritative-not-invoked';record.costUsd=0;record.credits=0;record.inputTokens=0;record.outputTokens=0;record.chargeClassification='authoritative-no-native-dispatch';record.phaseEvents.push({phase:'no-native-dispatch-confirmed',elapsedMs:Math.max(0,Date.now()-start)});if(error&&typeof error==='object')Object.defineProperty(error,INFERENCE_NO_DISPATCH_V1,{value:true});}else{record.state='interrupted';record.chargeClassification='unknown-after-native-boundary';}throw error;}
   finally{record.durationMs=Date.now()-start;mutate(d=>{const index=d.requests.findIndex(r=>r.id===record.id);check(index>=0);const existing=d.requests[index];if(existing.state==='cancelled-before-native'&&existing.nativeInvoked===false&&existing.costUsd===0&&existing.chargeClassification==='authoritative-no-native-dispatch'&&!nativeInvoked)return;check(existing.state==='pending');d.requests[index]=record;const s=totals(d);if(['interrupted','cancelled-before-native'].includes(record.state)||record.identityMismatch||record.malformedOutput||record.httpStatus<200||record.httpStatus>=300||s.conservativeUsd>LIMITS.usd||s.conservativeCredits>LIMITS.tavilyCredits||s.accountedTokens>LIMITS.tokens)d.halted=true;});}
   // Reconciliation is durable before the terminal exception reaches the existing fatal transport path.
   check(!readState().state.halted);return returnedResponse;
  }catch(error){if(earlyPermit&&!earlyPermit.consumed&&!earlyPermit.cancelled){cancelPreparedPermit(earlyPermit,hash(init.body));if(error&&typeof error==='object')Object.defineProperty(error,INFERENCE_NO_DISPATCH_V1,{value:true});}blocked();throw error;}
 };
 const noDispatchReceipt=Object.freeze({[INFERENCE_NO_DISPATCH_V1]:true});
 const cancelPreparedPermit=(permit,key)=>{
  // Consumption by the guarded fetch is distinct from actual native invocation.
  if(permit.nativeAttempted||permit.record.nativeInvoked)return;
  if(permit.noDispatchReconciled)return noDispatchReceipt;
  permit.cancelled=true;permits.delete(key);
  const reconciled=mutate(d=>{
   const record=d.requests.find(r=>r.id===permit.record.id);check(record&&record.nativeInvoked===false);
   if(record.state==='cancelled-before-native'){check(record.costUsd===0&&record.chargeClassification==='authoritative-no-native-dispatch');return structuredClone(record);}
   check(record.state==='pending'&&['not-invoked','native-dispatch-authorized'].includes(record.nativeInvocationState));
   Object.assign(record,{state:'cancelled-before-native',nativeInvocationState:'authoritative-not-invoked',costUsd:0,credits:0,inputTokens:0,outputTokens:0,chargeClassification:'authoritative-no-native-dispatch',durationMs:permit.dispatchStartedAt===undefined?0:Math.max(0,Date.now()-permit.dispatchStartedAt)});record.phaseEvents.push({phase:'no-native-dispatch-confirmed',elapsedMs:record.durationMs});d.halted=true;return structuredClone(record);
  });
  Object.assign(permit.record,reconciled);permit.noDispatchReconciled=true;
  return noDispatchReceipt;
 };
 const prepare=async(info,signal)=>{
  check(!preparePending);preparePending=true;const started=Date.now();let phase='prepare-entered',preparedPermit,preparedHash;
  try{
   signal?.throwIfAborted();check(Date.now()<taskDeadline());
   check(info?.url==='https://openrouter.ai/api/v1/chat/completions'&&info.method==='POST'&&typeof info.requestBody==='string'&&Buffer.byteLength(info.requestBody)<=LIMITS.requestBytes&&hash(info.requestBody)===info.requestBodySha256);
   const raw=info.requestBody,body=JSON.parse(raw),inspected=inspectCompletionBody(body,raw);check(inspected.schema==='social_decision_v1');const {context}=inspected;check(safeId(context.id)&&safeId(context.runId)&&safeId(context.actor?.id));
   const task=taskIdentity(),attempt=readState().state.attempts.at(-1);check(attempt?.status==='armed'&&!readState().state.halted&&attempt.deadline===taskDeadline()&&attempt.identityHash===task.identityHash&&attempt.exploreBindingHash);
   const composed=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(Math.max(1,Math.min(60000,taskDeadline()-Date.now())))]);
   const operation=async()=>{
    phase='prewarm';await prewarmAdmission(composed);assertPrewarmBinding(task);composed.throwIfAborted();
    let selectionAdmission=selectionCache?.receipt;
    if(!selectionAdmission){
     phase='stored-context-verification';const {verifyGeographicSelectionAdmission}=await import('./geographic-selection-admission.mjs');composed.throwIfAborted();
     selectionAdmission=await verifyGeographicSelectionAdmission({projectRoot:root,storageRoot:process.env.SOCIAL_STORAGE_ROOT??join(root,'data/derived/agents'),actor:context.actor.id,contextId:context.id,context,expectedRunId:context.runId,proofPath:task.identity.selectionProofPath,proofSha256:task.identity.selectionProofSha256});
     composed.throwIfAborted();check(selectionAdmission?.policy==='geographic-selection-admission-v1'&&selectionAdmission.proofSha256===task.identity.selectionProofSha256&&selectionAdmission.active===50&&selectionAdmission.capable===35&&selectionAdmission.ruleDriven===15&&selectionAdmission.improvedSelected===4&&selectionAdmission.improvedCapable===4&&selectionAdmission.comparisonAreas>=25&&isDeepStrictEqual(selectionAdmission.byBucket,{impact:4,geography:12,comparison:34,fallback:0})&&['selectionSha256','bindingSha256','scenarioSha256','populationSha256','summarySha256','runSha256','contextSha256','actorSha256'].every(k=>digest(selectionAdmission[k])));
     check(selectionAdmission.summarySha256===attempt.selectionSummarySha256&&selectionAdmission.scenarioSha256===attempt.selectionScenarioSha256&&selectionAdmission.contextSha256===hash(context.id)&&selectionAdmission.actorSha256===hash(context.actor.id));
    }
    check(selectionAdmission.runSha256===hash(context.runId));assertPrewarmBinding(task);composed.throwIfAborted();
    phase='current-context-verification';const {verifyPreparedStoredContext}=await import('./phased-provider-admission.mjs');composed.throwIfAborted();
    const stored=verifyPreparedStoredContext({projectRoot:root,storageRoot:process.env.SOCIAL_STORAGE_ROOT??join(root,'data/derived/agents'),context,expected:selectionCache?.stored});composed.throwIfAborted();check(stored.runSha256===selectionAdmission.runSha256&&stored.selectionSha256===selectionAdmission.selectionSha256);
    const binding=prewarmState.bindingKey;check(!selectionCache||selectionCache.bindingKey===binding);selectionCache={bindingKey:binding,receipt:selectionAdmission,stored};
    return {selectionAdmission,contextSha256:hash(context.id),contextBodySha256:hash(canonical(context)),runSha256:hash(context.runId),identityHash:task.identityHash,deadline:taskDeadline(),durationMs:Math.max(0,Date.now()-started)};
   };
   const permit=await cancelBounded(operation(),composed);composed.throwIfAborted();check(Date.now()<taskDeadline());
   phase='immutable-binding-verification';const before=nativeBindingSnapshot(task),currentTask=taskIdentity();check(currentTask.identityHash===task.identityHash);assertPrewarmBinding(currentTask);const after=nativeBindingSnapshot(currentTask);check(isDeepStrictEqual(before,after));permit.task=currentTask;permit.prewarmBindingKey=prewarmState.bindingKey;permit.nativeBindingHash=hash(canonical(after));permit.durationMs=Math.max(0,Date.now()-started);composed.throwIfAborted();
   phase='permit-identity-check';const requestKey=hash('social_decision_v1:'+context.id);check(!readState().state.requests.some(r=>r.requestKey===requestKey)&&permits.size===0);composed.throwIfAborted();
   phase='local-reservation';permit.record=reserveRequest({url:info.url,init:{signal:composed},service:'openrouter',...inspected,raw,body,task,selectionAdmission:permit.selectionAdmission,permit});
   permits.set(info.requestBodySha256,permit);preparedPermit=permit;preparedHash=info.requestBodySha256;
   if(composed.aborted){cancelPreparedPermit(permit,info.requestBodySha256);composed.throwIfAborted();}
   recordAdmissionEvent({phase:'permit-ready',durationMs:permit.durationMs,inputHash:info.requestBodySha256,contextSha256:permit.contextSha256,runSha256:permit.runSha256,bindingKey:prewarmState.bindingKey});
   composed.throwIfAborted();check(Date.now()-started<60000&&Date.now()<taskDeadline());
   return Object.freeze({version:1,cancelBeforeDispatch:()=>cancelPreparedPermit(permit,info.requestBodySha256)});
  }catch(error){if(preparedPermit&&!preparedPermit.consumed&&!preparedPermit.cancelled)cancelPreparedPermit(preparedPermit,preparedHash);const reason=signal?.aborted?signal.reason:error,timeout=reason?.code==='AI_TIMEOUT'||reason?.name==='TimeoutError'||deadline!==undefined&&Date.now()>=deadline,callerCancelled=signal?.aborted&&!timeout;if(timeout||!callerCancelled&&['prewarm','stored-context-verification','current-context-verification','immutable-binding-verification'].includes(phase))mutate(d=>{d.halted=true;});recordAdmissionEvent({phase:signal?.aborted?'cancelled-'+phase:'failed-'+phase,durationMs:Math.max(0,Date.now()-started),inputHash:digest(info?.requestBodySha256)?info.requestBodySha256:null});throw error;}
  finally{preparePending=false;}
 };
 Object.defineProperty(guardedFetch,INFERENCE_ADMISSION_V1,{value:Object.freeze({version:1,schema:'social_decision_v1',timeoutMs:60000,get deadlineMs(){return taskDeadline();},prepare}),writable:false,configurable:false});
 return guardedFetch;
}

async function generationDetails(nativeFetch,url,init,address){
 let requestId,deadline;
 try{
  callerSignal(url,init)?.throwIfAborted();
  const parsed=new URL(address),id=parsed.searchParams.get('id');check(parsed.origin==='https://openrouter.ai'&&parsed.pathname==='/api/v1/generation'&&!parsed.hash&&!parsed.username&&!parsed.password&&parsed.searchParams.size===1&&safeId(id)&&(init.method??url.method??'GET')==='GET'&&init.body===undefined&&!(url instanceof Request&&url.body));
  const reservation=mutate(d=>{const attempt=d.attempts.at(-1);check(!d.halted&&attempt?.status==='armed'&&attempt.deadline-Date.now()>=STAGE_TIMEOUTS.metadata&&!networkPending(d));const record=d.requests.findLast(r=>r.service==='openrouter'&&r.generationId===id&&r.identityVerification==='unverified');check(record&&!record.metadataChecked);record.metadataChecked=true;record.metadataState='pending';record.metadataDeadline=attempt.deadline;record.metadataTimeoutMs=STAGE_TIMEOUTS.metadata;return {id:record.id,deadline:attempt.deadline};});requestId=reservation.id;deadline=reservation.deadline;
  const {response,value}=await dispatchBounded(nativeFetch,url,init,deadline,STAGE_TIMEOUTS.metadata);const details=value?.data;
  mutate(d=>{const record=d.requests.find(r=>r.id===requestId);check(record?.metadataState==='pending');record.metadataState='returned';if(response.status<200||response.status>=300||details?.id!==id||details?.model!==model||!ocean(details?.provider_name)){record.identityMismatch=true;d.halted=true;return;}Object.assign(record,{model,provider:'DigitalOcean',identityVerification:'generation-details',inputTokens:record.inputTokens??integer(details.native_tokens_prompt),outputTokens:record.outputTokens??integer(details.native_tokens_completion),costUsd:record.costUsd??finite(details.total_cost)});const s=totals(d);if(s.conservativeUsd>LIMITS.usd||s.accountedTokens>LIMITS.tokens)d.halted=true;});
  check(!readState().state.halted);return response;
 }catch(error){if(requestId)try{mutate(d=>{const record=d.requests.find(r=>r.id===requestId);if(record?.metadataState==='pending')record.metadataState='interrupted';d.halted=true;});}catch{/* Durable reservation remains. */}blocked();throw error;}
}

export async function installLiveGuard(){
 check(process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_LIVE_GUARD==='true'&&process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_LIVE_DIRECTORY===undefined&&directory===resolve(root,'tmp',TASK_ID)&&process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_TEST_BUILD_ID_PATH===undefined&&!Object.entries(process.env).some(([key,value])=>/MOCK|PREFLIGHT/.test(key)&&value==='true')&&!/offline-network|provider-preload|phase4.+live-guard|swarm-live-guard|staged-live-guard/.test(process.env.NODE_OPTIONS??'')&&!globalThis.fetch.toString().includes('OFFLINE_EXTERNAL_FETCH_BLOCKED'));
 check(process.env.IMPACTLENS_GEOGRAPHIC_SELECTION_V7_LIVE_GUARD!=='true'&&!/geographic-selection-v7-live-guard\.mjs/.test(process.env.NODE_OPTIONS??''));
 check(process.env.IMPACTLENS_HYBRID_MAP_V2_LIVE_GUARD!=='true'&&process.env.IMPACTLENS_CITIZEN_HYBRID_LIVE_GUARD!=='true'&&!/citizen-hybrid-live-guard\.mjs/.test(process.env.NODE_OPTIONS??''));
 const scope=verifyHistoricalScope(root);
 const identity=taskIdentity(),state=readState().state,attempt=state.attempts.at(-1);check(process.env.IMPACTLENS_CONVERSATION_MENU_V7_SMALL_LIVE_GUARD!=='true'&&process.env.IMPACTLENS_CONVERSATION_MENU_V6_SMALL_LIVE_GUARD!=='true'&&process.env.IMPACTLENS_CONVERSATION_MENU_V5_LIVE_GUARD!=='true'&&process.env.SOCIAL_PROSE_OBSERVATION_ROOT===identity.identity.diagnosticRoot);check(attempt?.status==='armed'&&!state.halted&&attempt.identityHash===identity.identityHash&&attempt.codeFingerprint===currentFingerprint()&&attempt.productionBuild===currentBuildId()&&Date.now()<attempt.deadline);boundFiles(identity.identity.datasetFiles);boundFiles(identity.identity.protectedFiles);
 check(!globalThis.__citizenHybridLiveGuard||globalThis.__citizenHybridLiveGuard.taskId===TASK_ID);
 if(!globalThis.__citizenHybridLiveGuard){const admissionPrewarm=await prewarmAdmission();globalThis.fetch=createGuardedFetch(globalThis.fetch);check(globalThis[INFERENCE_ADMISSION_V1]===undefined);Object.defineProperty(globalThis,INFERENCE_ADMISSION_V1,{value:globalThis.fetch[INFERENCE_ADMISSION_V1],writable:false,configurable:false});globalThis.__citizenHybridLiveGuard={taskId:TASK_ID,historicalScopeManifestHash:scope.manifestHash,historicalEvidenceVerified:true,bindExploreInput,admissionPrewarm};}
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){const command=process.argv[2];console.log(JSON.stringify(command==='arm'?await armAttempt(Number(process.argv[3]??1)):command==='finish'?finishAttempt(process.argv[3]):command==='interrupt'?acknowledgeInterrupted(Number(process.argv[3])):totals(),null,2));}
else if(process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_LIVE_GUARD==='true')await installLiveGuard();
