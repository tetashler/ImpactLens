/** Read-only historical replay. Diagnostics persist only safe metadata and differing key paths. */
import './offline-network.mjs';
import {readFileSync,writeFileSync,mkdirSync,existsSync,appendFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {readSwarmJournal} from '../../lib/server/society/swarm-journal.ts';
import {replayHybrid,replayHybridFrom,prepareHybridStep,finishDecision} from '../../lib/society/hybrid.ts';
import {readMaterialCheckpoint} from '../../lib/server/society/checkpoint.ts';
import {createSociety,saveSociety,restoreSociety} from '../../lib/society/engine.ts';
import {deepLimits} from '../../lib/society/deep-policy.ts';
import {publicSociety} from '../../lib/server/society/summary.ts';
import {canonical,ensure} from '../../lib/experiments/validation.ts';
import {currentFingerprint} from './phase4e2-live-guard.mjs';
import {validateSwarm} from '../../lib/society/swarm.ts';
import {verifyHistoricalScope} from './phase4e2-historical-scope.ts';
import {historicalAcceptanceResult,type HistoricalReplayObservation,type HistoricalAcceptanceFailure,type HistoricalClassifiedObservation} from './phase4e2-historical-results.ts';
import {auditHistoricalNamespaces,legacyProtectedArchives} from './historical-namespace-inventory.ts';

const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const output='tmp/phase4e2',progressPath=join(output,'historical-replay-progress.json'),diagnosticsPath=join(output,'historical-replay-diagnostics.jsonl');
mkdirSync(output,{recursive:true});
let networkAttempts=0;globalThis.fetch=async()=>{networkAttempts++;throw Error('HISTORICAL_NETWORK_DISABLED');};
const args=process.argv.slice(2),firstOnly=args.includes('--first-contexts'),resume=args.includes('--resume');
const selector=args.find(a=>a.startsWith('--file='))?.slice(7)??args.find(a=>a.startsWith('--diagnose='))?.slice(11),diagnose=args.some(a=>a.startsWith('--diagnose='));
ensure(args.every(a=>['--first-contexts','--resume'].includes(a)||/^--(?:file|diagnose)=[a-f0-9]{64}\.json$/.test(a)),'HISTORICAL_ARGUMENTS');
const resultPath=join(output,'historical-replay.json');
// A fresh failed/incomplete audit must not leave an older PASS report admissible.
if(!firstOnly&&!selector)writeFileSync(resultPath,JSON.stringify({version:3,status:'INCOMPLETE',mandatory:{status:'FAIL'},reason:'AUDIT_IN_PROGRESS'}));
const scope=verifyHistoricalScope();
const snapshotRaw=readFileSync(join(output,'hashes-before.json'),'utf8').replace(/^\uFEFF/,''),before=JSON.parse(snapshotRaw) as {path:string;sha256:string}[];
for(const row of before)ensure(hash(readFileSync(row.path))===row.sha256,'PHASE4E_HISTORICAL_HASH');
const codeFingerprint=currentFingerprint(),snapshotHash=hash(snapshotRaw);
type SafeRow={label?:string;file?:string;scheduling?:string;agents?:number;decisions?:number;events?:number;replayExact?:boolean;archiveUnchanged?:boolean;journalUnchanged?:boolean;firstContextExact?:boolean;recordIndex?:number;tick?:number;stage?:string;paths?:string[];code?:string;[key:string]:unknown};
interface Progress {version:3;scopeManifestHash:string;codeFingerprint:string;snapshotHash:string;historical:(SafeRow&HistoricalReplayObservation)[];interim:(SafeRow&HistoricalReplayObservation)[];firstContexts:SafeRow[];classified:HistoricalClassifiedObservation[];failures:(SafeRow&HistoricalAcceptanceFailure)[];priorFilesUnchanged:number;providerCalls:number;networkAttempts:number}
const prior=resume&&existsSync(progressPath)?JSON.parse(readFileSync(progressPath,'utf8')) as Progress:null;
const progress:Progress=prior?.version===3&&prior.scopeManifestHash===scope.manifestHash&&prior.codeFingerprint===codeFingerprint&&prior.snapshotHash===snapshotHash?prior:{version:3,scopeManifestHash:scope.manifestHash,codeFingerprint,snapshotHash,historical:[],interim:[],firstContexts:[],classified:[],failures:[],priorFilesUnchanged:before.length,providerCalls:0,networkAttempts:0};
const persist=()=>{progress.networkAttempts=networkAttempts;writeFileSync(progressPath,JSON.stringify(progress,null,2));};
const report=(row:SafeRow)=>{console.log(JSON.stringify({historicalProgress:true,...row}));persist();};
const safeCode=(e:unknown)=>e instanceof Error&&/^[A-Z][A-Z0-9_]{1,60}$/.test(e.message)?e.message:'HISTORICAL_REPLAY_FAILURE';
function differentPaths(a:unknown,b:unknown,path='$',depth=0):string[]{
 if(canonical(a)===canonical(b))return [];
 if(depth>=24||a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return [path];
 const left=a as Record<string,unknown>,right=b as Record<string,unknown>,keys=[...new Set([...Object.keys(left),...Object.keys(right)])].sort();
 return keys.flatMap(key=>differentPaths(left[key],right[key],path+(Array.isArray(a)?'['+key+']':'.'+(/^[A-Za-z0-9_]+$/.test(key)?key:'[key]')),depth+1)).slice(0,50);
}
function diagnoseSaved(saved:ReturnType<typeof readSwarmJournal>,file:string,firstContext=false):SafeRow{
 let world=createSociety(saved.input),index=0;
 const metadata={file,scheduling:saved.input.swarm.scheduling,multiDay:!!saved.input.swarm.multiDay,triggerWitness:!!saved.input.swarm.deep?.triggerWitness,decisions:saved.hybrid.records.length};
 for(let iteration=0;iteration<deepLimits(saved.input).replayIterations;iteration++){
  if(world.tick===saved.tick&&index===saved.hybrid.records.length&&canonical(world.hybrid?.pending??null)===canonical(saved.hybrid.pending))return {...metadata,stage:'complete',replayExact:true};
  if(world.tick>saved.tick)return {...metadata,stage:'clock',recordIndex:index,tick:world.tick,paths:['$.tick']};
  world=prepareHybridStep(world);
  if(!world.hybrid?.pending)continue;
  const record=saved.hybrid.records[index];
  if(!record)return canonical(world.hybrid.pending)===canonical(saved.hybrid.pending)?{...metadata,stage:'pending',replayExact:true}:{...metadata,stage:'pending',recordIndex:index,tick:world.tick,paths:differentPaths(saved.hybrid.pending,world.hybrid.pending)};
  const paths=differentPaths(record.context,world.hybrid.pending);
  if(paths.length)return {...metadata,stage:'context',recordIndex:index,tick:world.tick,paths};
  if(firstContext)return {...metadata,stage:'first-context',recordIndex:index,tick:world.tick,firstContextExact:true};
  world=finishDecision(world,{decision:record.decision,usage:record.usage,error:record.error});
  const recordPaths=differentPaths(record,world.hybrid!.records.at(-1));
  if(recordPaths.length)return {...metadata,stage:'record',recordIndex:index,tick:world.tick,paths:recordPaths};
  index++;
 }
 return {...metadata,stage:'iterations',recordIndex:index,tick:world.tick,paths:['$.replayIterations']};
}
const historyBase=join('data','derived','agents'),namespaceInventory=auditHistoricalNamespaces(historyBase,before);
const files=legacyProtectedArchives(historyBase,before).map(row=>row.file);
ensure(selector===undefined||files.includes(selector),'HISTORICAL_FILE_UNKNOWN');
const historicalReferences=[['tmp/phase4c-autonomous',14,'Phase4C-eldercare'],['tmp/phase4c-autonomous',15,'Phase4C-workweek'],['tmp/phase4d-live',1,'Phase4D-workweek'],['tmp/phase4d-live',2,'Phase4D-eldercare']] as const;
const referenceFiles=historicalReferences.map(([directory,attempt])=>hash(JSON.parse(readFileSync(join(directory,'attempt-'+attempt+'-audit.json'),'utf8')).runId)+'.json');
const archiveRoot=join('data','derived','agents','accepted-private');
const originals=files.map(file=>({file,stored:JSON.parse(readFileSync(join(archiveRoot,file),'utf8'))}));
const swarmFiles=originals.filter(({stored})=>stored.publicRun?.society?.swarm&&stored.sessionId).map(({file})=>file);
const expectedMandatory=[...new Set([...referenceFiles,...swarmFiles])].filter(file=>file!==scope.artifact.archiveFile);
ensure(files.includes(scope.artifact.archiveFile)&&referenceFiles.every(file=>files.includes(file)),'HISTORICAL_SCOPE_COVERAGE');
// Do not silently inherit preservation-only treatment for a newly discovered old-policy archive.
const currentPolicyInventory:SafeRow[]=[];
for(const file of readdirSync(archiveRoot).filter(name=>/^[a-f0-9]{64}\.json$/.test(name)&&!files.includes(name))){
 const stored=JSON.parse(readFileSync(join(archiveRoot,file),'utf8'));
 ensure(stored.publicRun?.society?.swarm?.executionPolicy==='multi-day-swarm-v1','HISTORICAL_UNEXPECTED_ARCHIVE');
 ensure(typeof stored.sessionId==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(stored.sessionId),'HISTORICAL_UNEXPECTED_ARCHIVE');
 const header=JSON.parse(readFileSync(join('data/derived/agents/social-sessions',stored.sessionId+'.jsonl'),'utf8').split('\n')[0]);
 ensure(header.format===2&&header.id===stored.sessionId&&header.runId===stored.publicRun.runId&&header.input?.runId===header.runId&&header.input.swarm?.multiDay?.policy==='multi-day-swarm-v1'&&hash(header.runId)+'.json'===file,'HISTORICAL_UNEXPECTED_ARCHIVE');
 validateSwarm(header.input.swarm);
 currentPolicyInventory.push({namespace:'legacy',file,coverage:'legacy-current-policy-preservation-only',policy:'multi-day-swarm-v1',replay:'NOT_RUN',archiveSha256:namespaceInventory.legacy.find(row=>row.file===file)?.archiveSha256});
}
for(const row of namespaceInventory.current)currentPolicyInventory.push({...row,coverage:row.fullReplayExact?'namespace-strict-pure-replay':'accepted-prefix-without-society',replay:row.fullReplayExact?'PASS':'NO_SOCIETY_TO_REPLAY'});
let failed=false;
if(!firstOnly&&!selector)for(const [directory,attempt,label]of historicalReferences){
 if(progress.historical.some(r=>r.label===label))continue;
 report({label,stage:'starting'});
 try{
  const audit=JSON.parse(readFileSync(join(directory,'attempt-'+attempt+'-audit.json'),'utf8')),archive=join('data/derived/agents/accepted-private',hash(audit.runId)+'.json'),original=readFileSync(archive,'utf8'),stored=JSON.parse(original),journal=join('data/derived/agents/social-sessions',stored.sessionId+'.jsonl'),raw=readFileSync(journal,'utf8'),last=JSON.parse(raw.trimEnd().split('\n').at(-1)!);
  const world=replayHybrid(last.input,last.tick,last.hybrid.records,last.hybrid.pending);ensure(canonical(restoreSociety(saveSociety(world)))===canonical(world),'MEMORY_HISTORICAL_REPLAY');
  const summary=publicSociety(world);for(const key of ['agents','counts','links'] as const)ensure(canonical(summary[key])===canonical(stored.publicRun.society[key]),'MEMORY_HISTORICAL_STATE');
  ensure(hash(raw)===hash(readFileSync(journal,'utf8'))&&hash(original)===hash(readFileSync(archive,'utf8')),'MEMORY_HISTORICAL_MUTATION');
  const row={label,file:hash(audit.runId)+'.json',replayExact:true,roundTripExact:true,checkpointTailExact:null,archiveUnchanged:true,journalUnchanged:true,events:world.events.length,decisions:world.hybrid!.records.length};progress.historical.push(row);report(row);
 }catch(error){const row={label,stage:'failed',code:safeCode(error)};progress.failures.push(row);report(row);failed=true;}
}
for(const file of files){
 if(selector&&selector!==file)continue;
 if(!firstOnly&&!diagnose&&progress.interim.some(r=>r.file===file))continue;
 const path=join('data/derived/agents/accepted-private',file),raw=readFileSync(path,'utf8'),stored=JSON.parse(raw);
 if(!stored.publicRun?.society?.swarm||!stored.sessionId)continue;
 const journal=join('data/derived/agents/social-sessions',stored.sessionId+'.jsonl'),bytes=readFileSync(journal,'utf8'),saved=readSwarmJournal(journal);
 report({file,scheduling:saved.input.swarm.scheduling,decisions:saved.hybrid.records.length,stage:'starting'});
 try{
  if(firstOnly||diagnose){
   const row=diagnoseSaved(saved,file,firstOnly);appendFileSync(diagnosticsPath,JSON.stringify(row)+'\n');
   if(row.firstContextExact||row.replayExact)progress.firstContexts.push(row);else{progress.failures.push({...row,code:'HISTORICAL_DIAGNOSTIC_MISMATCH'});failed=true;}
   report(row);continue;
  }
  // Classification never makes this replay succeed. Its exact expected strict
  // failure is inspected below and remains an explicit inventory outcome.
  const world=replayHybrid(saved.input,saved.tick,saved.hybrid.records,saved.hybrid.pending);ensure(canonical(restoreSociety(saveSociety(world)))===canonical(world),'PHASE4E_INTERIM_REPLAY');
  ensure(file!==scope.artifact.archiveFile,'HISTORICAL_CLASSIFICATION_STATUS');
  const base=readMaterialCheckpoint('data/derived/agents/social-sessions',saved);
  if(base)ensure(canonical(replayHybridFrom(base,saved.tick,saved.hybrid.records,saved.hybrid.pending))===canonical(world),'PHASE4E_CHECKPOINT_TAIL');
  ensure(hash(raw)===hash(readFileSync(path,'utf8'))&&hash(bytes)===hash(readFileSync(journal,'utf8')),'PHASE4E_INTERIM_HASH');
  const row={file,scheduling:saved.input.swarm.scheduling,agents:world.agents.length,decisions:world.hybrid!.records.length,replayExact:true,roundTripExact:true,checkpointTailExact:base?true:null,archiveUnchanged:true,journalUnchanged:true};progress.interim.push(row);report(row);
 }catch(error){
  const row={file,stage:'failed',code:safeCode(error)};progress.failures.push(row);report(row);
  let classified=false;
  if(!firstOnly&&!diagnose)try{
   const diagnostic=diagnoseSaved(saved,file);appendFileSync(diagnosticsPath,JSON.stringify(diagnostic)+'\n');report(diagnostic);
   if(file===scope.artifact.archiveFile&&row.code==='SOCIAL_STALE'&&diagnostic.stage==='context'&&diagnostic.recordIndex===0&&diagnostic.tick===1&&diagnostic.paths?.includes('$.platform')){
    const artifact:HistoricalClassifiedObservation={file,classification:scope.artifact.classification,qualification:scope.artifact.qualification,replayStatus:scope.artifact.replayStatus,hashesVerified:true,sourcePolicyRecoverable:false,recordIndex:0,tick:1};
    progress.classified=[artifact];report({...artifact,stage:'classified-unresolved'});classified=true;
   }
  }catch(diagnosticError){report({file,stage:'diagnostic-failed',code:safeCode(diagnosticError)});}
  if(!classified)failed=true;
 }
}
// Validate approval identities/hashes again after the full audit, not only at entry.
ensure(verifyHistoricalScope().manifestHash===scope.manifestHash,'HISTORICAL_SCOPE_CHANGED');
for(const row of before)ensure(hash(readFileSync(row.path))===row.sha256,'PHASE4E_HISTORICAL_HASH');
persist();
if(!firstOnly&&!diagnose&&!selector){
 const outcome=historicalAcceptanceResult({expectedMandatory,qualifying:[...progress.historical,...progress.interim],failures:progress.failures,classified:progress.classified,approvedFile:scope.artifact.archiveFile});
 const entries=originals.map(({file})=>({file,coverage:file===scope.artifact.archiveFile?'classified-unresolved':expectedMandatory.includes(file)?'mandatory-strict-replay':'unchanged-preexisting-preservation-only-coverage'}));
 const result={version:3,codeFingerprint,snapshotHash,scope:{version:scope.version,manifestHash:scope.manifestHash},mandatory:{...outcome.mandatory,historical:progress.historical,swarm:progress.interim},inventory:{...outcome.inventory,entries,currentPolicy:currentPolicyInventory,namespaces:{version:1,legacyArchives:namespaceInventory.legacy.length,currentArchives:namespaceInventory.current.filter(row=>row.archivePresent).length,currentJournalWorlds:namespaceInventory.current.filter(row=>row.fullReplayExact).length,claims:namespaceInventory.claims}},priorFilesUnchanged:before.length,providerCalls:0,networkAttempts};
 writeFileSync(resultPath,JSON.stringify(result,null,2));console.log(JSON.stringify({mandatory:outcome.mandatory,inventory:outcome.inventory,priorFilesUnchanged:before.length,providerCalls:0,networkAttempts}));
 if(outcome.mandatory.status!=='PASS'||outcome.inventory.status!=='COMPLETE_WITH_CLASSIFIED_UNRESOLVED')failed=true;
}
if(failed)process.exitCode=1;
