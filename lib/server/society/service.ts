import {activeInferenceRoute,configuredInferenceKey} from '../inference/route.ts';
import type {SafeSocialDiagnosticV2} from '../../society/social-diagnostics-v2.ts';
import {createResearchBriefing} from '../../grounding/briefing.ts';
import {configuredProseObserver} from './rejection-observations-v2.ts';
/** Authoritative local sessions. Client worlds, paths and provider grants are never executable inputs. */
import {swarmPolicy,multiDaySwarmPolicy,swarmHybrid,SWARM_INTELLIGENCE,type SwarmPolicy} from '../../society/swarm.ts';
import {getExecutionProfile} from '../../society/execution-profile.ts';
import type {SocietyCapacityReason} from '../../society/public-contract.ts';
import {isDeep,deepLimits} from '../../society/deep-policy.ts';
import {appendSwarmJournal,readSwarmJournal,recoverIncompleteSwarmTail,assertSwarmJournalAdmission,type ProviderAdmission} from './swarm-journal.ts';
import {writeMaterialCheckpoint,readMaterialCheckpoint} from './checkpoint.ts';
import {withSocialOwner} from './session-lock.ts';
import {privateStoreDirectory} from './storage.ts';
import {assertStorageAdmission,beginStorageInitialization,storageBundle,storageBase,inspectStorageAdmission,type StorageAdmission} from './storage-admission.ts';
import {TOPIC_POLICY,QUALITY_POLICY,CITIZEN_POLICY,CITIZEN_MENU_POLICY,CITIZEN_PROSE_POLICY,CITIZEN_DECLARATION_POLICY} from '../../society/intelligence.ts';
import {createRejectionObserver} from './rejection-observations.ts';
import {validateCitizenGroundingAsync,type CitizenGroundedInput} from '../../citizen-grounding/social.ts';
import {validatePersonalityRoster} from '../../citizen-grounding/personality.ts';
import {existsSync,mkdirSync,readFileSync,openSync,closeSync,readSync,writeSync,writeFileSync,fsyncSync,statSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {verifyStakeholderRun} from '../../stakeholder-simulation/identities.ts';
import type {StakeholderSimulationRunV1} from '../../stakeholder-simulation/contract.ts';
import {createSociety,stepSociety,multiDayComplete,restoreSocietyForInput,type SocietyWorld,type SocietyInput} from '../../society/engine.ts';
import {prepareHybridStep,finishDecision,hybridBudget,replayHybrid,replayHybridFrom,decisionReservation,controlledIds} from '../../society/hybrid.ts';
import {HYBRID_DEFAULTS,DECISION_LIMITS,decisionTokenCharge,type DecisionContext} from '../../society/decision-contract.ts';
import {populationForActive,populationForCitizenSelection} from './population.ts';
import {buildSocietyGeography} from '../population/geography.ts';
import {createSocialTransport} from '../inference/social.ts';
import {acquireAiSlot} from '../ai/gate.ts';
import {canonical,ensure,object} from '../../experiments/validation.ts';

export interface SocialDependencies {
 /** Trusted filesystem policy only; never accepted from a browser request. */
 storageBase?:string;storageAdmission?:StorageAdmission;
 /** Trusted initialization only. Never parsed from browser JSON; no provider dispatch is supplied here. */
 citizenSelection?:(input:SocietyInput)=>import('../../citizen-grounding/selection.ts').CitizenSelectionV2;
 citizenGrounding?:(preview:SocietyWorld)=>Promise<CitizenGroundedInput>;
 /** Trusted current initialization selector; never parsed from browser JSON. Legacy callers retain v4. */
 citizenMenuPolicy?:'conversation-menu-v4'|'conversation-menu-v5'|'conversation-menu-v6'|'conversation-menu-v7';
 /** Trusted opt-in task observer. v6 never writes optional observations into admission storage. */
 proseRejectionObserver?:{version:2;observe:(contextId:string,value:SafeSocialDiagnosticV2)=>void};
 swarm?:SwarmPolicy|false;ruleOnly?:boolean;communication?:import('../../society/communication.ts').CommunicationConfig;
 enabled?:boolean;key?:string;fetcher?:typeof fetch;directory?:string;
 /** Trusted server configuration only. Frozen on first deep journal header. Epoch deadline, not a duration. */
 admission?:Partial<ProviderAdmission>;
}
export interface SocialAdmissionStatus {
 status:'available'|'budget-limited';reason:'completion-limit'|'token-limit'|'cost-limit'|'deadline'|null;
 deadlineMs:number|null;calls:number;maxCalls:number;tokens:number;reservedTokens:number;costUsd:number;costLimitUsd:number;
}
export interface SocialState {capacityReason?:SocietyCapacityReason;version:1;sessionId:string;revision:number;world:SocietyWorld;budget:ReturnType<typeof hybridBudget>;admission:SocialAdmissionStatus}
interface Session {
 checkpointRevision?:number;journalRecords?:number;journalHead?:string;journalBytes?:number;checkpointRecords?:number;providerAdmission?:ProviderAdmission;
 id:string;runId:string;world:SocietyWorld;revision:number;busy:boolean;reservation:DecisionContext|null;
}
const globalState=globalThis as typeof globalThis&{__socialSessions?:Map<string,Session>};
const sessions=globalState.__socialSessions??=new Map<string,Session>();
const enabled=(d:SocialDependencies)=>d.enabled??(process.env.SOCIAL_LLM_ENABLED==='true'&&process.env.STAKEHOLDER_LIVE_ENABLED==='true');
const directory=(d:SocialDependencies)=>privateStoreDirectory('social-sessions',d.directory);
const historicalDirectory=(d:SocialDependencies)=>resolve(directory(d))===storageBundle(storageBase(d.storageBase),true).sessions;
const response=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
const cacheKey=(root:string,id:string)=>root+'/'+id;
export function socialStatus(d:SocialDependencies={}){
 return {version:1,enabled:enabled(d),configured:!!(d.key??configuredInferenceKey()).trim(),limits:HYBRID_DEFAULTS,model:activeInferenceRoute().model,provider:activeInferenceRoute().provider,fallback:false};
}
function initialAdmission(c:ReturnType<typeof swarmHybrid>,baseline:ReturnType<typeof swarmHybrid>,d:SocialDependencies):ProviderAdmission {
 const source=d.admission??{},deadline=source.deadlineMs??(process.env.SOCIAL_PROVIDER_DEADLINE_MS===undefined?undefined:Number(process.env.SOCIAL_PROVIDER_DEADLINE_MS));
 const grant:ProviderAdmission={maxCalls:source.maxCalls??Number(process.env.SOCIAL_PROVIDER_MAX_CALLS??baseline.maxCalls),reservedTokens:source.reservedTokens??Number(process.env.SOCIAL_PROVIDER_TOKEN_LIMIT??baseline.reservedTokens),costUsd:source.costUsd??Number(process.env.SOCIAL_PROVIDER_COST_USD??baseline.costUsd),...(deadline===undefined?{}:{deadlineMs:deadline})};
 ensure(Number.isSafeInteger(grant.maxCalls)&&grant.maxCalls>=0&&grant.maxCalls<=c.maxCalls,'SOCIAL_ADMISSION');
 ensure(Number.isSafeInteger(grant.reservedTokens)&&grant.reservedTokens>=0&&grant.reservedTokens<=c.reservedTokens,'SOCIAL_ADMISSION');
 ensure(Number.isFinite(grant.costUsd)&&grant.costUsd>=0&&grant.costUsd<=c.costUsd,'SOCIAL_ADMISSION');
 ensure(grant.deadlineMs===undefined||Number.isSafeInteger(grant.deadlineMs)&&grant.deadlineMs>0,'SOCIAL_ADMISSION');
 return grant;
}
function configuredAdmission(world:SocietyWorld,d:SocialDependencies):ProviderAdmission {const c=world.genesis.input.hybrid??HYBRID_DEFAULTS;return initialAdmission(c,isDeep(world)?swarmHybrid(swarmPolicy(world.genesis.config.agents as 50|100)):c,d);}
function frozenAdmission(world:SocietyWorld):ProviderAdmission {const c=world.genesis.input.hybrid??HYBRID_DEFAULTS,baseline=isDeep(world)?swarmHybrid(swarmPolicy(world.genesis.config.agents as 50|100)):c;return {maxCalls:Math.min(c.maxCalls,baseline.maxCalls),reservedTokens:Math.min(c.reservedTokens,baseline.reservedTokens),costUsd:Math.min(c.costUsd,baseline.costUsd)};}
function admission(s:Session,d:SocialDependencies,next=false):SocialAdmissionStatus {
 const grant=s.providerAdmission??frozenAdmission(s.world);
 // A supplied grant may tighten a restored run but cannot enlarge its frozen authority.
 const cap={maxCalls:Math.min(grant.maxCalls,d.admission?.maxCalls??grant.maxCalls),reservedTokens:Math.min(grant.reservedTokens,d.admission?.reservedTokens??grant.reservedTokens),costUsd:Math.min(grant.costUsd,d.admission?.costUsd??grant.costUsd),deadlineMs:Math.min(grant.deadlineMs??Infinity,d.admission?.deadlineMs??Infinity)};
 const records=(s.world.hybrid?.records??[]).filter(r=>r.status!=='skipped');
 const calls=records.length+(s.reservation?1:0);
 const tokens=records.reduce((n,r)=>n+(decisionTokenCharge(r,!!s.world.genesis.input.swarm?.multiDay)),0)+(s.reservation?decisionReservation(s.reservation):0);
 const costUsd=records.reduce((n,r)=>n+(r.usage?.costUsd??r.reservedCostUsd),0)+(s.reservation?DECISION_LIMITS.unknownCostUsd:0);
 const future=next&&!s.reservation?1:0,reserved=next&&!s.reservation&&s.world.hybrid?.pending?decisionReservation(s.world.hybrid.pending):0;
 const reason=Date.now()>=cap.deadlineMs?'deadline':calls+future>cap.maxCalls||!next&&calls>=cap.maxCalls?'completion-limit':tokens+reserved>cap.reservedTokens?'token-limit':costUsd+(future?DECISION_LIMITS.unknownCostUsd:0)>cap.costUsd?'cost-limit':null;
 return {status:reason?'budget-limited':'available',reason,deadlineMs:Number.isFinite(cap.deadlineMs)?cap.deadlineMs:null,calls,maxCalls:cap.maxCalls,tokens,reservedTokens:cap.reservedTokens,costUsd,costLimitUsd:cap.costUsd};
}
const FATAL_TRANSPORT=['AI_UPSTREAM','AI_TIMEOUT','AI_CREDITS','AI_CANCELLED','AI_RATE_LIMIT','SOCIAL_UNCERTAIN'];
const fatalMultiDayCode=(world:SocietyWorld)=>world.genesis.input.swarm?.multiDay?[...(world.hybrid?.records??[])].reverse().find(r=>FATAL_TRANSPORT.includes(r.error??''))?.error:undefined;
/** Retains the safe persisted cause while keeping the existing SOCIAL_FATAL message contract. */
export class SocialFatalError extends Error {readonly code:string;constructor(code:string){super('SOCIAL_FATAL');this.name='Error';this.code=[...FATAL_TRANSPORT,'AI_PROVIDER_IDENTITY','SOCIAL_TRANSITION'].includes(code)?code:'SOCIAL_FATAL';}}
function capacityReason(world:SocietyWorld):SocietyCapacityReason|undefined{return world.status==='event-limit'?'EVENT_CAPACITY':world.status==='item-limit'?'ITEM_CAPACITY':undefined;}
function project(s:Session,d:SocialDependencies):SocialState{return {...(capacityReason(s.world)?{capacityReason:capacityReason(s.world)}:{}),version:1,sessionId:s.id,revision:s.revision,world:s.world,budget:hybridBudget(s.world),admission:admission(s,d)};}
function cache(s:Session,root:string){
 if(sessions.size>=4&&!sessions.has(cacheKey(root,s.id))){const first=[...sessions.entries()].find(([,v])=>!v.busy);ensure(first,'SOCIAL_BUSY');sessions.delete(first[0]);}
 sessions.set(cacheKey(root,s.id),s);
}
async function persist(s:Session,root:string){
 mkdirSync(root,{recursive:true});
 if(s.world.genesis.input.swarm){await appendSwarmJournal(s,root);s.journalBytes=statSync(join(root,s.id+'.jsonl')).size;return;}
 const path=join(root,s.id+'.jsonl'),size=existsSync(path)?statSync(path).size:0;
 const line=JSON.stringify({id:s.id,runId:s.runId,revision:s.revision,input:s.world.genesis.input,tick:s.world.tick,hybrid:s.world.hybrid,...(!s.world.hybrid?{world:s.world}:{}),reservation:s.reservation})+'\n';
 const bytes=Buffer.byteLength(line);ensure(bytes<2*1024*1024&&size+bytes<=64*1024*1024,'SOCIAL_STORAGE_LIMIT');
 const fd=openSync(path,'a',0o600);try{ensure(writeSync(fd,line)===bytes,'SOCIAL_JOURNAL_WRITE');fsyncSync(fd);}finally{closeSync(fd);}s.journalBytes=size+bytes;
}
async function checkpoint(s:Session,root:string,force=false){
 if(!isDeep(s.world)||s.checkpointRevision===s.revision)return;
 const count=s.world.hybrid!.records.filter(r=>r.status==='accepted').length;
 if(!force&&count-(s.checkpointRecords??0)<50&&!(s.world.genesis.input.swarm?.multiDay?multiDayComplete(s.world):s.world.tick>=s.world.genesis.config.steps))return;
 try{await writeMaterialCheckpoint(s,root);s.checkpointRecords=count;s.checkpointRevision=s.revision;}
 catch(error){if(s.world.genesis.input.swarm?.multiDay&&(error instanceof Error&&error.message==='SOCIAL_CHECKPOINT_LIMIT'||(error as NodeJS.ErrnoException)?.code==='ENOSPC'))throw error;if(force)throw Error('SOCIAL_CHECKPOINT_WRITE');console.warn('SOCIAL_CHECKPOINT_SAFE',JSON.stringify({code:'RECOVER_FROM_JOURNAL'}));}
}
async function load(id:string,root:string,readOnly=false):Promise<Session>{
 ensure(/^[a-f0-9-]{36}$/.test(id),'SOCIAL_SESSION');
 let cached=readOnly?undefined:sessions.get(cacheKey(root,id));
 // Another verified process may have advanced the journal between operations.
 // Never append from an older in-memory head merely because the lease is free.
 if(cached&&cached.journalBytes!==statSync(join(root,id+'.jsonl')).size){sessions.delete(cacheKey(root,id));cached=undefined;}
 if(cached){
  ensure(cached.id===id&&cached.world.genesis.input.runId===cached.runId,'SOCIAL_RUN_IDENTITY');
  if(cached.reservation&&!cached.busy){cached.world=finishDecision(cached.world,{decision:null,usage:null,error:'SOCIAL_UNCERTAIN'});cached.reservation=null;cached.revision++;await persist(cached,root);}
  return cached;
 }
 const path=join(root,id+'.jsonl');ensure(statSync(path).size<=128*1024*1024,'SOCIAL_STORAGE_LIMIT');
 const fd=openSync(path,'r'),prefix=Buffer.alloc(32);let count=0;
 try{count=readSync(fd,prefix,0,prefix.length,0);}finally{closeSync(fd);}
 const format2=prefix.subarray(0,count).toString('utf8').startsWith('{"format":2,');
 let s:Session;
 if(format2){
  // Full hash audit is mandatory even when a materialised checkpoint is available.
  let v:ReturnType<typeof readSwarmJournal>;
  try{v=readSwarmJournal(path);}catch(error){if(readOnly||!(error instanceof Error)||error.message!=='SOCIAL_STORAGE_INCOMPLETE')throw error;v=await recoverIncompleteSwarmTail(path);}
  ensure(v.id===id&&v.input.runId===v.runId,'SOCIAL_RUN_IDENTITY');
  const base=readMaterialCheckpoint(root,v);
  let world=base?replayHybridFrom(base,v.tick,v.hybrid.records,v.hybrid.pending):replayHybrid(v.input,v.tick,v.hybrid.records,v.hybrid.pending);
  s={id,runId:v.runId,world,revision:v.revision,busy:false,reservation:v.reservation,journalHead:v.journalHead,journalRecords:v.journalRecords,providerAdmission:v.providerAdmission,checkpointRecords:base?.hybrid?.records.filter(r=>r.status==='accepted').length??0};
 }else{
  const raw=readFileSync(path,'utf8');
  ensure(raw.endsWith('\n'),'SOCIAL_STORAGE_INCOMPLETE');const v=JSON.parse(raw.trimEnd().split('\n').at(-1)!);
  ensure(v.id===id&&v.input.runId===v.runId,'SOCIAL_RUN_IDENTITY');
  const world=v.input.hybrid?replayHybrid(v.input,v.tick,v.hybrid.records,v.hybrid.pending):restoreSocietyForInput(JSON.stringify(v.world),v.world.genesis);
  s={id,runId:v.runId,world,revision:v.revision,busy:false,reservation:v.reservation};
 }
 if(s.reservation&&!readOnly){ensure(canonical(s.world.hybrid?.pending)===canonical(s.reservation),'SOCIAL_JOURNAL_ORDER');s.world=finishDecision(s.world,{decision:null,usage:null,error:'SOCIAL_UNCERTAIN'});s.reservation=null;s.revision++;await persist(s,root);}
 s.journalBytes=statSync(path).size;if(!readOnly)cache(s,root);return s;
}
function validateIdentity(id:unknown):asserts id is string {ensure(typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id),'SOCIAL_SESSION');}
/** Passive load/recovery. Never invokes the model or advances the simulation clock. */
export async function readSocialSession(sessionId:string,d:SocialDependencies={}):Promise<SocialState>{
 validateIdentity(sessionId);const root=directory(d);if(historicalDirectory(d))return project(await load(sessionId,root,true),d);mkdirSync(root,{recursive:true});
 if(d.storageAdmission)try{inspectStorageAdmission(d.storageAdmission.base);}catch{return project(await load(sessionId,root,true),d);}
 return withSocialOwner(root,sessionId,async()=>project(await load(sessionId,root),d));
}
/** Strict passive read: no directories, locks, recovery, checkpoints, cache changes or journal writes. */
export async function readSocialSessionReadonly(sessionId:string,d:SocialDependencies={}):Promise<SocialState>{
 validateIdentity(sessionId);return project(await load(sessionId,directory(d),true),d);
}
export async function checkpointSocialSession(sessionId:string,d:SocialDependencies={}){
 validateIdentity(sessionId);ensure(!historicalDirectory(d),'SOCIAL_ARCHIVED_READ_ONLY');const root=directory(d);
 if(d.storageAdmission)inspectStorageAdmission(d.storageAdmission.base);
 return withSocialOwner(root,sessionId,async()=>{const s=await load(sessionId,root);await checkpoint(s,root,true);return project(s,d);});
}
/** Typed internal API avoids serialising private worlds through an HTTP Response. */
export async function socialOperation(body:unknown,d:SocialDependencies={},signal:AbortSignal=new AbortController().signal):Promise<SocialState>{
 ensure(enabled(d),'SOCIAL_DISABLED');signal.throwIfAborted();
 ensure(!historicalDirectory(d),'SOCIAL_ARCHIVED_READ_ONLY');
 const b=body as Record<string,any>,root=directory(d);mkdirSync(root,{recursive:true});
 if(b.operation==='start'){
  object(b,['operation','run']);await verifyStakeholderRun(b.run as StakeholderSimulationRunV1);
  const run=b.run as StakeholderSimulationRunV1;ensure(run.inputSnapshot.version===2,'SOCIAL_RUN');const plan=run.inputSnapshot.scenarioPlan;
  const claimed=d.storageAdmission?assertStorageAdmission(d.storageAdmission,run.runId):null;
  if(claimed)ensure(resolve(root)===storageBundle(d.storageAdmission!.base).sessions,'STORAGE_ADMISSION_BINDING');
  const name=createHash('sha256').update(run.runId).digest('hex'),index=join(root,name+'.index');
  return withSocialOwner(root,'start:'+name,async()=>{
   if(existsSync(index)){const id=readFileSync(index,'utf8');ensure(!claimed||id===claimed.sessionId,'STORAGE_ADMISSION_BINDING');return withSocialOwner(root,id,async()=>{const s=await load(id,root);ensure(s.runId===run.runId,'SOCIAL_RUN_IDENTITY');return project(s,d);});}
   if(claimed&&existsSync(join(root,claimed.sessionId+'.jsonl')))return withSocialOwner(root,claimed.sessionId,async()=>{
    const s=await load(claimed.sessionId,root);ensure(s.runId===run.runId,'SOCIAL_RUN_IDENTITY');
    const fd=openSync(index,'wx',0o600);try{writeFileSync(fd,s.id);fsyncSync(fd);}finally{closeSync(fd);}return project(s,d);
   });
   ensure(readdirSync(root).filter(s=>s.endsWith('.index')).length<64,'SOCIAL_SESSION_LIMIT');
   if(claimed)beginStorageInitialization(d.storageAdmission!.claim,run.runId,d.storageAdmission!.base);
   const requested=d.swarm===false?24:d.swarm?.activeAgents??Number(process.env.SOCIAL_SWARM_SIZE??process.env.SOCIAL_ACTIVE_AGENTS??50);
   let swarm=d.communication&&requested!==24?(d.swarm||multiDaySwarmPolicy(requested as 50|100)):null;
   const hybrid=swarm?swarmHybrid(swarm):null;
   const grant=swarm?.deep?initialAdmission(hybrid!,swarmHybrid(swarmPolicy(requested as 50|100)),d):undefined;
   if(swarm?.multiDay)swarm=multiDaySwarmPolicy(requested as 50|100,grant!.maxCalls,getExecutionProfile({swarm} as SocietyInput)!.steps as 160|320|672);
   const input:SocietyInput={runId:run.runId,question:plan.request.question,seed:plan.requestIdentity.slice(-32),population:populationForActive(swarm?.activeAgents??Number(process.env.SOCIAL_ACTIVE_AGENTS??24)),geography:buildSocietyGeography(),sharePolicy:'source-position-v1',socialPolicy:'memory-aware-v1',...(d.communication?{communication:d.communication,intelligence:swarm?.multiDay?QUALITY_POLICY:swarm?SWARM_INTELLIGENCE:TOPIC_POLICY}:{}),...(swarm?{swarm,hybrid:hybrid!}:!d.ruleOnly?{hybrid:{...HYBRID_DEFAULTS,maxCalls:Number(process.env.SOCIAL_MAX_DECISIONS??HYBRID_DEFAULTS.maxCalls),selectedAgents:Number(process.env.SOCIAL_CONTROLLED_AGENTS??HYBRID_DEFAULTS.selectedAgents)}}:{}),config:{agents:swarm?.activeAgents??Number(process.env.SOCIAL_ACTIVE_AGENTS??24),...(swarm?.multiDay?{steps:getExecutionProfile({swarm} as SocietyInput)!.steps}:{})},briefing:{...(plan.assumptionReview?{assumptionReview:plan.assumptionReview}:{}),...(plan.grounding?.research?{research:createResearchBriefing(plan.grounding)}:{}),assumptions:plan.draft.assumptions.slice(0,4).map(a=>a.text.slice(0,300)),sources:(plan.grounding?.research?[]:(plan.grounding?.sources??[]).slice(0,2)).map(s=>({id:s.id,title:s.title,url:s.url,retrievedAt:s.retrievedAt,publishedAt:s.publishedAt,passage:s.passages[0].text.slice(0,600)}))},roles:plan.draft.agents,jurisdictions:plan.draft.jurisdictions,acceptedActions:run.events.map(e=>({id:e.id,roleId:e.roleId,statement:e.statement,position:e.position}))};
   if(d.citizenSelection){ensure(d.citizenGrounding&&swarm?.multiDay,'CITIZEN_SELECTION_POLICY');input.citizenSelection=d.citizenSelection(input);input.population=populationForCitizenSelection(input.citizenSelection);}
   let world=createSociety(input);
   if(d.citizenGrounding){
    ensure(swarm?.multiDay&&d.communication,'CITIZEN_GROUNDING_POLICY');
    const grounding=await d.citizenGrounding(world),activeIds=world.agents.map(a=>a.id),capableIds=controlledIds(world);
    ensure(grounding.personalities.runId===run.runId,'CITIZEN_GROUNDING_RUN');
    await validatePersonalityRoster(grounding.personalities,capableIds,activeIds.filter(id=>!capableIds.includes(id)));
    await validateCitizenGroundingAsync(grounding,input.population,activeIds,capableIds);
    world=createSociety({...input,intelligence:d.citizenMenuPolicy==='conversation-menu-v7'?CITIZEN_DECLARATION_POLICY:d.citizenMenuPolicy==='conversation-menu-v6'?CITIZEN_PROSE_POLICY:d.citizenMenuPolicy==='conversation-menu-v5'?CITIZEN_MENU_POLICY:CITIZEN_POLICY,citizenGrounding:grounding});
   }
   const s:Session={id:claimed?.sessionId??randomUUID(),runId:run.runId,world,revision:0,busy:false,reservation:null};
   s.providerAdmission=grant??configuredAdmission(s.world,d);
   await persist(s,root);
   const fd=openSync(index,'wx',0o600);try{writeFileSync(fd,s.id);fsyncSync(fd);}finally{closeSync(fd);}
   cache(s,root);return project(s,d);
  });
 }
 object(b,['operation','sessionId','revision']);ensure(b.operation==='step'&&Number.isSafeInteger(b.revision),'SOCIAL_REQUEST');validateIdentity(b.sessionId);
 if(d.storageAdmission)inspectStorageAdmission(d.storageAdmission.base);
 // A warm duplicate must fail immediately rather than waiting behind a provider
 // call whose client may be waiting for this very duplicate response.
 ensure(!sessions.get(cacheKey(root,b.sessionId))?.busy,'SOCIAL_STALE');
 return withSocialOwner(root,b.sessionId,async()=>{
  const s=await load(b.sessionId,root);ensure(!s.busy&&s.revision===b.revision,'SOCIAL_STALE');s.busy=true;
  try{
   if(d.storageAdmission){const bound=assertStorageAdmission(d.storageAdmission,s.runId);ensure(bound.sessionId===s.id&&resolve(root)===storageBundle(d.storageAdmission.base).sessions,'STORAGE_ADMISSION_BINDING');}
   signal.throwIfAborted();
   const fatalCode=s.world.hybrid?.records.find(r=>['AI_PROVIDER_IDENTITY','SOCIAL_TRANSITION'].includes(r.error??''))?.error??fatalMultiDayCode(s.world);if(fatalCode)throw new SocialFatalError(fatalCode);
   if(capacityReason(s.world)||s.world.genesis.input.swarm?.multiDay&&admission(s,d).status==='budget-limited')return project(s,d);
   const previous=s.world;let world=s.world.hybrid?prepareHybridStep(s.world):stepSociety(s.world);
   if(world.hybrid?.pending&&!hybridBudget(world).exhausted){
    if(d.ruleOnly){world=finishDecision(world,{decision:null,usage:null,error:'SOCIAL_DISABLED'});}
    else{
     s.world=world;
     const available=admission(s,d,true);
     if(available.status==='budget-limited'){
      // Persist the valid offered context without fabricating a failed/skipped model action.
      if(previous!==world)s.revision++;
      if(!world.genesis.input.swarm?.multiDay||previous!==world)await persist(s,root);return {...project(s,d),admission:available};
     }
     if(s.world.genesis.input.swarm)assertSwarmJournalAdmission(s,root);
     const release=acquireAiSlot('social:'+s.id);
     try{
      const transport=createSocialTransport({key:d.key??configuredInferenceKey(),fetcher:d.fetcher,...(['conversation-menu-v6','conversation-menu-v7'].includes(world.genesis.input.intelligence?.context??'')?{rejectionObserver:configuredProseObserver(s.id,d.proseRejectionObserver)}:world.genesis.input.intelligence?.context==='conversation-menu-v5'?{rejectionObserver:{version:1 as const,observe:createRejectionObserver(root,s.id)}}:{})});
      s.reservation=world.hybrid.pending;await persist(s,root);
      let decision:unknown|null=null,error:string|null=null;
      try{if(d.storageAdmission)inspectStorageAdmission(d.storageAdmission.base);decision=(await transport.generate(world.hybrid.pending,signal)).value;if(signal.aborted){decision=null;error='AI_CANCELLED';}}
      catch(e){error=typeof (e as {code?:unknown})?.code==='string'?(e as {code:string}).code:'SOCIAL_FAILURE';}
      try{world=finishDecision(world,{decision,usage:transport.records.at(-1)??null,error:transport.records.at(-1)?.socialValidationRule??error});}
      catch{world=finishDecision(world,{decision:null,usage:transport.records.at(-1)??null,error:'SOCIAL_TRANSITION'});}
      s.reservation=null;
     }finally{release();}
    }
   }
   if(world===previous)return project(s,d);
   s.world=world;s.revision++;await persist(s,root);await checkpoint(s,root);
   if(world.hybrid?.records.at(-1)?.error==='AI_PROVIDER_IDENTITY')throw Error('SOCIAL_PROVIDER_IDENTITY');
   const committedFatalCode=world.hybrid?.records.at(-1)?.error==='SOCIAL_TRANSITION'?'SOCIAL_TRANSITION':fatalMultiDayCode(world);if(committedFatalCode)throw new SocialFatalError(committedFatalCode);
   return project(s,d);
  }catch(e){
   // A failed persistence can leave an uncertain durable reservation. Never dispatch from the uncommitted cache.
   sessions.delete(cacheKey(root,s.id));throw e;
  }finally{s.busy=false;}
 });
}
async function requestBody(request:Request){
 const reader=request.body?.getReader();ensure(reader,'SOCIAL_REQUEST');const chunks:Uint8Array[]=[];let size=0;
 try{while(true){request.signal.throwIfAborted();const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>524288){await reader.cancel();throw Error('SOCIAL_REQUEST_SIZE');}chunks.push(r.value);}}finally{reader.releaseLock();}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function handleSocialRequest(request:Request,d:SocialDependencies={}){
 if(request.method==='GET')return response(socialStatus(d));
 try{
  const url=new URL(request.url),localOrigin=new URL(`${url.protocol}//${request.headers.get('host')??url.host}`).origin;
  ensure(!url.search&&(!request.headers.get('origin')||request.headers.get('origin')===localOrigin),'SOCIAL_ORIGIN');
  ensure(request.headers.get('content-type')?.split(';')[0]==='application/json','SOCIAL_REQUEST');
  return response(await socialOperation(await requestBody(request),d,request.signal));
 }catch(e){
  const reason=e instanceof Error&&/^SOCIAL_[A-Z_]+$/.test(e.message)?e.message:'SOCIAL_UNAVAILABLE';
  return response({version:1,error:reason,message:'The bounded social operation could not complete. Accepted events remain available.'},reason==='SOCIAL_DISABLED'?503:409);
 }
}
