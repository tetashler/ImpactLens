/** Task-only read-only selection admission. No provider, recovery, replay or storage writes. */
import {readFileSync,readdirSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,join,sep,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {canonical,freezeSnapshot} from '../../lib/experiments/validation.ts';
import {readSwarmJournal} from '../../lib/server/society/swarm-journal.ts';
import {createSociety} from '../../lib/society/engine.ts';
import {controlledIds} from '../../lib/society/hybrid.ts';
import {encodeMenuContext} from '../../lib/society/decision-menu.ts';
import {selectCitizenCohort} from '../../lib/citizen-grounding/selection.ts';
import {populationForCitizenSelection} from '../../lib/server/society/population.ts';
import {validateHybridBinding} from '../../lib/interventions/binding.ts';
import {validateCitizenCommuteRun} from '../../lib/citizen-grounding/commute.ts';
import {loadCitizenDataset} from '../../lib/server/citizen-grounding/data.ts';
import {validateCitizenGroundingAsync} from '../../lib/citizen-grounding/social.ts';

export const GEOGRAPHIC_SELECTION_ADMISSION_POLICY='geographic-selection-admission-v1';
const hash=value=>createHash('sha256').update(value).digest('hex');
const check=(value,code='SOURCE')=>{if(!value)throw Error('GEOGRAPHIC_SELECTION_'+code);};
const same=(a,b,code)=>check(isDeepStrictEqual(a,b),code);
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const inside=(path,base)=>path.startsWith(base+sep);
const prepared=new Map();
const stamp=path=>{const s=lstatSync(path,{bigint:true});return `${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}`;};
function safePath(projectRoot,value,bases,code){
 check(typeof value==='string'&&value.length>0&&value.length<=2048&&!/^[a-z]+:\/\//i.test(value)&&!value.split(/[\\/]/).includes('..'),code);
 const path=resolve(projectRoot,value);check(bases.some(base=>inside(path,base)),code);
 // A symbolic-link ancestor cannot redirect an apparently safe private path.
 const real=realpathSync(path);check(bases.some(base=>inside(real,realpathSync(base))),code);
 let current=path;while(current!==resolve(projectRoot)){check(!lstatSync(current).isSymbolicLink(),code);const next=resolve(current,'..');check(next!==current,code);current=next;}
 return path;
}
function readBounded(path,max,code){const s=lstatSync(path);check(s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<=max,code);return readFileSync(path);}
function physical(binding){
 return {question:binding.question,geometry:binding.geometry,revision:binding.revision,anchors:binding.anchors,
  intent:{type:binding.intent.type,routeId:binding.intent.routeId,stationPointIds:binding.intent.stationPointIds,sitePointIds:binding.intent.sitePointIds},
  intervention:binding.intervention,catalogue:binding.catalogue,scenarioFingerprint:binding.scenarioFingerprint};
}
function expectedManifest(dataset,profiles){
 return {baseSourceHash:dataset.baseSourceHash,generatorVersion:dataset.manifest.generatorVersion,
  sourceIds:[...new Set([dataset.manifest.baseSourceHash,...dataset.manifest.sources.map(s=>s.id),...profiles.flatMap(p=>[...Object.values(p.citizen.fieldProvenance).flatMap(f=>f.sourceIds),...p.commute.sourceIds])])].sort(),
  assumptionIds:[...new Set([...dataset.manifest.assumptions.map(a=>a.id),...profiles.flatMap(p=>[...Object.values(p.citizen.fieldProvenance).flatMap(f=>f.assumptionIds),...p.commute.assumptions])])].sort()};
}

/** Pure roster inspection. The IO admission below supplies a separately SHA-validated full proof. */
export function inspectFrozenGeographicSelection(input,{dataset,run,binding}){
 try{
  check(input?.citizenSelection?.policy==='citizen-selection-v2'&&input?.citizenGrounding?.version===2,'POLICY');
  check(input.intelligence?.context==='conversation-menu-v7'&&input.intelligence?.behaviour==='citizen-menu-v4','POLICY');
  check(input.config?.agents===50&&dataset.records.length===10000&&run.facts.length===10000,'CAPACITY');
  const grounding=input.citizenGrounding,accepted=grounding.hybridBinding;
  same(physical(accepted),physical(binding),'BINDING');
  check(input.question===accepted.question&&grounding.scenarioFingerprint===run.scenarioFingerprint&&grounding.datasetId===dataset.id&&grounding.populationId===dataset.populationId,'BINDING');
  // Pure selection with the *actual stored seed*, never a supplied or rewritten roster.
  const selection=selectCitizenCohort(dataset,run,accepted,50,input.seed);
  same(input.citizenSelection,selection,'SELECTION');
  same(input.population,populationForCitizenSelection(selection),'POPULATION');
  const citizens=new Map(dataset.records.map(c=>[c.id,c])),facts=new Map(run.facts.map(f=>[f.citizenId,f]));
  check(grounding.profiles.length===50,'PROFILES');
  for(const [i,p]of grounding.profiles.entries()){
   check(p.citizen.id===selection.members[i].id,'PROFILES');
   same(p.citizen,citizens.get(p.citizen.id),'CITIZEN');same(p.commute,facts.get(p.citizen.id),'FACT');
  }
  same(grounding.sourceManifest,expectedManifest(dataset,grounding.profiles),'MANIFEST');
  const world=createSociety(input),capable=new Set(controlledIds(world));
  check(world.agents.length===50&&capable.size===35&&grounding.personalities.runId===input.runId,'CAPACITY');
  const improved=run.facts.filter(f=>f.status==='improved');
  check(improved.length===4&&improved.every(f=>selection.members.some(m=>m.id===f.citizenId)&&capable.has(f.citizenId)),'BENEFICIARIES');
  const byBucket=Object.fromEntries(['impact','geography','comparison','fallback'].map(b=>[b,selection.members.filter(m=>m.bucket===b).length]));
  same(byBucket,{impact:4,geography:12,comparison:34,fallback:0},'COHORT');
  const comparisonAreas=new Set(selection.members.filter(m=>m.bucket==='comparison').map(m=>citizens.get(m.id).planningArea)).size;
  check(comparisonAreas>=25,'COMPARISON');
  return Object.freeze({policy:GEOGRAPHIC_SELECTION_ADMISSION_POLICY,active:50,capable:35,ruleDriven:15,byBucket,comparisonAreas,improvedSelected:4,improvedCapable:4,
   selectionSha256:hash(canonical(selection)),bindingSha256:accepted.fingerprint,scenarioSha256:run.scenarioFingerprint,populationSha256:hash(canonical(input.population))});
 }catch(error){if(error?.message?.startsWith('GEOGRAPHIC_SELECTION_'))throw error;throw Error('GEOGRAPHIC_SELECTION_SOURCE');}
}

async function loadProof(options){
 const {projectRoot,proofPath,proofSha256}=options,root=realpathSync(resolve(projectRoot));check(digest(proofSha256),'PROOF_SHA');
 const path=safePath(root,proofPath,[join(root,'tmp')],'PROOF_PATH'),raw=readBounded(path,32*1024*1024,'PROOF_BOUND');
 check(hash(raw)===proofSha256,'PROOF_SHA');
 const key=root+'\0'+path+'\0'+proofSha256,cached=prepared.get(key);
 if(cached){check(stamp(cached.datasetPath)===cached.datasetStamp,'DATASET_CHANGED');return cached;}
 const proof=JSON.parse(raw.toString('utf8'));
 check(proof?.version===1&&proof.policy===GEOGRAPHIC_SELECTION_ADMISSION_POLICY&&typeof proof.createdAt==='string'&&Number.isFinite(Date.parse(proof.createdAt)),'PROOF');
 check(/^citizens-[a-f0-9]{64}$/.test(proof.dataset?.id)&&digest(proof.dataset?.sha256),'DATASET');
 check(proof.dataset.path==='data/synthetic/'+proof.dataset.id+'.json','DATASET_PATH');
 const datasetPath=safePath(root,proof.dataset.path,[join(root,'data/synthetic')],'DATASET_PATH');
 check(hash(readBounded(datasetPath,64*1024*1024,'DATASET_BOUND'))===proof.dataset.sha256,'DATASET_SHA');
 check(resolve(process.cwd())===resolve(root),'PROJECT_ROOT');
 const dataset=loadCitizenDataset(proof.dataset.id,join(root,'data/synthetic'));
 const binding=await validateHybridBinding(proof.binding),run=proof.run;
 validateCitizenCommuteRun(run,dataset);
 check(dataset.records.length===10000&&run.summary.representedAgents===10000&&run.scenarioFingerprint===binding.scenarioFingerprint&&run.serviceDate===binding.catalogue.serviceDate,'PROOF');
 check(run.facts.filter(f=>f.status==='improved').length===4,'BENEFICIARIES');
 const value={dataset,run:freezeSnapshot(run),binding,proofSha256,datasetPath,datasetStamp:stamp(datasetPath),createdAt:proof.createdAt};
 prepared.set(key,value);return value;
}

/** Call before arming: expensive dataset/full-fact validation occurs outside provider deadlines. */
export async function preloadGeographicSelectionProof(options){
 try{const p=await loadProof(options);return Object.freeze({policy:GEOGRAPHIC_SELECTION_ADMISSION_POLICY,proofSha256:p.proofSha256,representedAgents:10000,improved:4,summarySha256:hash(canonical(p.run.summary)),scenarioSha256:p.run.scenarioFingerprint,createdAt:p.createdAt});}
 catch(error){if(error?.message?.startsWith('GEOGRAPHIC_SELECTION_'))throw error;throw Error('GEOGRAPHIC_SELECTION_PROOF');}
}

/** Match the live request to an already persisted reservation, without recovery or writes. */
export async function verifyGeographicSelectionAdmission(options){
 try{
  const {projectRoot,storageRoot,contextId,actor,expectedRunId,context}=options,root=realpathSync(resolve(projectRoot));
  check(typeof contextId==='string'&&contextId.length>0&&contextId.length<=512&&typeof actor==='string'&&actor.length>0&&actor.length<=160,'CONTEXT');
  const base=safePath(root,storageRoot,[join(root,'tmp'),join(root,'data/derived')],'CONTEXT_PATH');
  const folder=safePath(root,join(base,'session-store-v2/social-sessions'),[base],'CONTEXT_PATH');
  const files=readdirSync(folder).filter(name=>name.endsWith('.jsonl'));check(files.length>0&&files.length<=16,'CONTEXT');let matched;
  for(const name of files){
   check(/^[a-f0-9-]{36}\.jsonl$/.test(name),'CONTEXT');const path=safePath(root,join(folder,name),[folder],'CONTEXT_PATH');
   readBounded(path,64*1024*1024,'CONTEXT_BOUND');const state=readSwarmJournal(path),reservation=state.reservation;
   if(reservation?.id!==contextId||reservation.actor?.id!==actor)continue;
   check(!matched&&state.id+'.jsonl'===name&&state.runId===state.input.runId&&state.runId===reservation.runId&&(!expectedRunId||state.runId===expectedRunId),'CONTEXT');
   check(state.hybrid.pending?.id===contextId&&state.hybrid.pending?.actor?.id===actor&&state.hybrid.records.length===0,'CONTEXT');
   same(reservation,state.hybrid.pending,'CONTEXT');
   check(context&&context.id===contextId&&context.actor?.id===actor,'CONTEXT');
   same(context,JSON.parse(encodeMenuContext(reservation)),'CONTEXT');matched=state;
  }
  check(matched,'CONTEXT');
  const proof=await loadProof(options),receipt=inspectFrozenGeographicSelection(matched.input,proof);
  // Replay's synchronous shape checks do not verify SHA identities. Admission
  // separately checks the accepted binding and personality roster content SHAs.
  const input=matched.input,world=createSociety(input);
  await validateCitizenGroundingAsync(input.citizenGrounding,input.population,world.agents.map(a=>a.id),controlledIds(world));
  return Object.freeze({...receipt,proofSha256:proof.proofSha256,summarySha256:hash(canonical(proof.run.summary)),runSha256:hash(matched.runId),contextSha256:hash(contextId),actorSha256:hash(actor),journalHead:matched.journalHead,revision:matched.revision});
 }catch(error){if(error?.message?.startsWith('GEOGRAPHIC_SELECTION_'))throw error;throw Error('GEOGRAPHIC_SELECTION_CONTEXT');}
}
