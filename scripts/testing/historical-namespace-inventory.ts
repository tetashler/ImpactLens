/** Read-only fixed-namespace inventory. Legacy mandatory replay scope is selected separately. */
import {existsSync,lstatSync,readdirSync,readFileSync} from 'node:fs';
import {join,resolve,relative,sep} from 'node:path';import {createHash} from 'node:crypto';
import {storageBundle,findStorageBinding,inspectStorageAdmission,type StorageClaim,type StorageBinding} from '../../lib/server/society/storage-admission.ts';
import {readSwarmJournal} from '../../lib/server/society/swarm-journal.ts';import {readMaterialCheckpoint,materialCheckpointPath} from '../../lib/server/society/checkpoint.ts';
import {replayHybrid,replayHybridFrom} from '../../lib/society/hybrid.ts';import {restoreSociety,restoreSocietyForInput,saveSociety} from '../../lib/society/engine.ts';
import {canonical,ensure} from '../../lib/experiments/validation.ts';
export interface ProtectedHistoricalFile {path:string;sha256:string}
export interface HistoricalArchiveLocation {namespace:'legacy'|'session-store-v2';file:string;path:string;sessionDirectory:string;protected:boolean;archiveSha256:string}
export interface HistoricalNamespaceReplay extends Omit<HistoricalArchiveLocation,'archiveSha256'> {archivePresent:boolean;archiveSha256:string|null;runId:string;sessionId:string|null;state:'accepted-prefix-no-society'|'verified-session'|'orphan-journal';journalSha256:string|null;fullReplayExact:boolean|null;checkpointTailReplayExact:boolean|null;tailRecords:number|null;reservationRetained:boolean;indexPresent:boolean}
const digest=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const key=(path:string)=>{const value=resolve(path).replaceAll('\\','/');return process.platform==='win32'?value.toLowerCase():value;};
const within=(base:string,path:string)=>{const value=relative(resolve(base),resolve(path));return value!==''&&!value.startsWith('..'+sep)&&value!=='..'&&!resolve(path).startsWith('\\\\')&& !value.includes(':');};
const fail=(condition:unknown,code='BINDING')=>ensure(condition,'HISTORICAL_NAMESPACE_'+code);
function read(path:string,limit:number){const stat=lstatSync(path);fail(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=limit,'FILE');return readFileSync(path);}
function protectedMap(base:string,files:readonly ProtectedHistoricalFile[]){
 const known=[storageBundle(base,true).archives,storageBundle(base).archives].map(key),result=new Map<string,string>();
 for(const row of files){const path=resolve(row.path),normalized=key(path);
  if(within(base,path)&&/[/\\]accepted-private[/\\][a-f0-9]{64}\.json$/.test(path)){fail(known.some(root=>key(join(root,path.split(/[/\\]/).at(-1)!))===normalized),'UNKNOWN');fail(existsSync(path),'PROTECTED');}
  fail(!result.has(normalized)||result.get(normalized)===row.sha256,'PROTECTED');result.set(normalized,row.sha256);
 }
 return result;
}
function locations(base:string,historical:boolean,protectedFiles:Map<string,string>):HistoricalArchiveLocation[]{
 const bundle=storageBundle(base,historical);if(!existsSync(bundle.archives))return [];
 const names=readdirSync(bundle.archives).filter(f=>f.endsWith('.json'));fail(names.length<=(historical?64:16),'CAPACITY');
 return names.sort().map(file=>{fail(/^[a-f0-9]{64}\.json$/.test(file),'FILE');const path=join(bundle.archives,file),bytes=read(path,3*1024*1024),archiveSha256=digest(bytes),pin=protectedFiles.get(key(path));fail(pin===undefined||pin===archiveSha256,'PROTECTED');return {namespace:historical?'legacy':'session-store-v2',file,path,sessionDirectory:bundle.sessions,protected:pin!==undefined,archiveSha256};});
}
/** Only exact legacy paths enter the frozen mandatory inventory; basenames never erase namespace. */
export function legacyProtectedArchives(base:string,files:readonly ProtectedHistoricalFile[]){return locations(base,true,protectedMap(base,files)).filter(row=>row.protected);}
function replay(path:string,sessionRoot:string,binding:StorageBinding,pins:Map<string,string>){
 const original=read(path,128*1024*1024),journalSha256=digest(original);fail(!pins.has(key(path))||pins.get(key(path))===journalSha256,'PROTECTED');
 let world:ReturnType<typeof replayHybrid>,checkpointTailReplayExact:boolean|null=null,tailRecords:number|null=null,reservationRetained=false;
 if(original.subarray(0,32).toString('utf8').startsWith('{"format":2,')){
  const saved=readSwarmJournal(path);fail(saved.id===binding.sessionId&&saved.runId===binding.runId&&saved.input.runId===binding.runId);
  world=replayHybrid(saved.input,saved.tick,saved.hybrid.records,saved.hybrid.pending);reservationRetained=!!saved.reservation;
  const checkpoint=readMaterialCheckpoint(sessionRoot,saved);if(existsSync(materialCheckpointPath(sessionRoot,binding.sessionId)))fail(checkpoint,'CHECKPOINT');
  if(checkpoint){fail(canonical(replayHybridFrom(checkpoint,saved.tick,saved.hybrid.records,saved.hybrid.pending))===canonical(world),'REPLAY');checkpointTailReplayExact=true;tailRecords=saved.hybrid.records.length-(checkpoint.hybrid?.records.length??0);}
 }else{
  fail(original.at(-1)===10,'REPLAY');const frame=JSON.parse(original.toString('utf8').trimEnd().split('\n').at(-1)!);fail(frame.id===binding.sessionId&&frame.runId===binding.runId&&frame.input?.runId===binding.runId);
  world=frame.input.hybrid?replayHybrid(frame.input,frame.tick,frame.hybrid.records,frame.hybrid.pending):restoreSocietyForInput(JSON.stringify(frame.world),frame.world.genesis);reservationRetained=!!frame.reservation;
 }
 fail(canonical(restoreSociety(saveSociety(world)))===canonical(world),'REPLAY');fail(readFileSync(path).equals(original),'MUTATION');
 return {journalSha256,fullReplayExact:true as const,checkpointTailReplayExact,tailRecords,reservationRetained};
}
export function auditHistoricalNamespaces(base:string,files:readonly ProtectedHistoricalFile[]){
 try{
  inspectStorageAdmission(base);
  const pins=protectedMap(base,files),legacy=locations(base,true,pins),archives=locations(base,false,pins),oldNames=new Set(legacy.map(r=>r.file));
  fail(!archives.some(row=>oldNames.has(row.file)),'AMBIGUOUS');
  // A read-only probe validates every immutable slot, including partial, duplicate and crossed claims.
  findStorageBinding('',base);const admission=join(resolve(base),'session-store-v2','admission'),bundle=storageBundle(base),claims:{slot:number;state:string;initializationIntent:boolean;runId?:string}[]=[],bound=new Map<string,{claim:StorageClaim;binding:StorageBinding}>();
  for(let slot=0;slot<16;slot++){
   const stem=join(admission,'slot-'+String(slot).padStart(2,'0')),path=stem+'.claim';if(!existsSync(path))continue;const claim=JSON.parse(read(path,2048).toString('utf8')) as StorageClaim;
   const initializationIntent=existsSync(stem+'.initialization');if(!existsSync(stem+'.binding')){claims.push({slot,state:'reserved-no-world',initializationIntent});continue;}
   const binding=JSON.parse(read(stem+'.binding',2048).toString('utf8')) as StorageBinding,verified=findStorageBinding(binding.runId,base);fail(verified&&verified.claim.slot===slot&&verified.binding?.sessionId===claim.sessionId);bound.set(claim.sessionId,{claim,binding});claims.push({slot,state:'bound-no-world',initializationIntent,runId:binding.runId});
  }
  const sessionNames=existsSync(bundle.sessions)?readdirSync(bundle.sessions):[];
  for(const name of sessionNames){
   if(name.endsWith('.jsonl'))fail(uuid.test(name.slice(0,-6))&&bound.has(name.slice(0,-6)));
   if(name.endsWith('.index')){fail(/^[a-f0-9]{64}\.index$/.test(name));const owner=[...bound.values()].find(v=>digest(v.binding.runId)+'.index'===name);fail(owner&&read(join(bundle.sessions,name),160).toString('utf8')===owner.claim.sessionId&&existsSync(join(bundle.sessions,owner.claim.sessionId+'.jsonl')));}
   if(name.endsWith('.materialized.json')||name.endsWith('.checkpoint.json')){const id=name.slice(0,name.indexOf('.'));fail(bound.has(id)&&existsSync(join(bundle.sessions,id+'.jsonl')));}
  }
  const seen=new Set<string>(),current:HistoricalNamespaceReplay[]=[];
  for(const archive of archives){
   const original=read(archive.path,3*1024*1024),stored=JSON.parse(original.toString('utf8')),runId=stored.publicRun?.runId;fail(typeof runId==='string'&&digest(runId)+'.json'===archive.file);
   const owner=[...bound.values()].find(v=>v.binding.runId===runId);fail(owner&&stored.execution?.attemptId&&digest(stored.execution.attemptId)===owner.claim.attemptHash&&stored.execution.run?.runId===runId);
   fail(stored.sessionId===null||stored.sessionId===owner!.claim.sessionId);if(stored.sessionId!==null)fail(stored.publicRun.session?.id===stored.sessionId);
   const sessionId=owner!.claim.sessionId,journal=join(bundle.sessions,sessionId+'.jsonl'),hasJournal=existsSync(journal);fail(stored.sessionId===null||hasJournal);seen.add(sessionId);
   const verified=hasJournal?replay(journal,bundle.sessions,owner!.binding,pins):{journalSha256:null,fullReplayExact:null,checkpointTailReplayExact:null,tailRecords:null,reservationRetained:false};
   fail(readFileSync(archive.path).equals(original),'MUTATION');const indexPresent=existsSync(join(bundle.sessions,digest(runId)+'.index')),state=hasJournal?(stored.sessionId===null||!indexPresent?'orphan-journal' as const:'verified-session' as const):'accepted-prefix-no-society' as const;claims.find(c=>c.slot===owner!.claim.slot)!.state=state;
   current.push({...archive,archivePresent:true,runId,sessionId:hasJournal?sessionId:null,state,...verified,indexPresent});
  }
  for(const [sessionId,owner]of bound)if(!seen.has(sessionId)&&existsSync(join(bundle.sessions,sessionId+'.jsonl'))){
   const verified=replay(join(bundle.sessions,sessionId+'.jsonl'),bundle.sessions,owner.binding,pins);claims.find(c=>c.slot===owner.claim.slot)!.state='orphan-journal';
   current.push({namespace:'session-store-v2',file:digest(owner.binding.runId)+'.json',path:join(bundle.archives,digest(owner.binding.runId)+'.json'),sessionDirectory:bundle.sessions,protected:false,archivePresent:false,archiveSha256:null,runId:owner.binding.runId,sessionId,state:'orphan-journal',...verified,indexPresent:existsSync(join(bundle.sessions,digest(owner.binding.runId)+'.index'))});
  }
  for(const [path]of pins)if(within(join(resolve(base),'session-store-v2'),path))fail(existsSync(path),'PROTECTED');
  return {version:1 as const,legacy,current,claims};
 }catch(error){if(error instanceof Error&&error.message.startsWith('HISTORICAL_NAMESPACE_'))throw error;throw Error('HISTORICAL_NAMESPACE_VERIFICATION');}
}
