/** Immutable private selected-citizen inputs and actor-only context. No file, network or provider imports. */
import {assertJsonData,canonical,ensure,freezeSnapshot,identifier,object,text} from '../experiments/validation.ts';
import type {PopulationView,Resident} from '../population/contract.ts';
import type {CitizenDataset,CitizenRecord,CitizenCommuteFact,CitizenCommuteRun} from './contract.ts';
import {validateCitizenCommuteFact} from './commute-contract.ts';
import {parsePersonalityRoster,validatePersonalityRoster,type PersonalityRoster,type PersonalityTraits,type CitizenPersonality} from './personality.ts';
import type {GroundedIssueSubject} from './issues.ts';
import {parseHybridBinding,validateHybridBinding,type HybridBinding} from '../interventions/binding.ts';

interface CitizenGroundedFields {policy:'citizen-grounded-v1';populationId:string;datasetId:string;scenarioFingerprint:string;profiles:{citizen:CitizenRecord;commute:CitizenCommuteFact|null}[];personalities:PersonalityRoster;sourceManifest:{baseSourceHash:string;generatorVersion:string;sourceIds:string[];assumptionIds:string[]}}
export interface CitizenGroundedInputV1 extends CitizenGroundedFields {version:1}
export interface CitizenGroundedInputV2 extends CitizenGroundedFields {version:2;executionBundle:'hybrid-citizen-explore-v1';hybridBinding:HybridBinding}
export type CitizenGroundedInput=CitizenGroundedInputV1|CitizenGroundedInputV2;
export interface GroundedFact {id:string;label:string;value:string|number|null;unit:string|null;basis:'source-constrained'|'synthetic-assumption'|'calculated';sourceIds:string[]}
export interface GroundedActorContext {
 version:1;policy:'citizen-grounded-v1';citizenId:string;populationId:string;datasetId:string;scenarioFingerprint:string;
 demographic:{ageGroup:string;exactAge:number|null;sex:'male'|'female';planningArea:string;subzone:string};
 employment:{status:CitizenRecord['labourForceStatus'];relationship:CitizenRecord['employmentRelationship'];nature:CitizenRecord['nature'];occupationCode:string|null;jobTitle:string|null;workplaceArea:string|null};
 schedule:string|null;personality:{origin:CitizenPersonality['origin'];traits:PersonalityTraits};
 commute:{factId:string;status:CitizenCommuteFact['status'];baselineMinutes:number|null;interventionMinutes:number|null;minutesSaved:number|null;baselineTransfers:number|null;interventionTransfers:number|null;reason:string|null}|null;
 facts:GroundedFact[];subjects:GroundedIssueSubject[];limitations:string[];
}
export const CITIZEN_GROUNDING_LIMITS=Object.freeze({inputBytes:500000,actorContextBytes:4096,active:100,capable:70});
const bytes=(v:unknown)=>new TextEncoder().encode(canonical(v)).length;
function check(v:unknown,code:string):asserts v{ensure(v,code);}
const guard=<T>(code:string,fn:()=>T):T=>{try{return fn();}catch{throw Error(code);}};
const idList=(v:unknown,max:number)=>guard('CITIZEN_GROUNDING_ROSTER',()=>{assertJsonData(v);check(Array.isArray(v)&&v.length<=max,'CITIZEN_GROUNDING_ROSTER');const values=v.map(x=>identifier(x));check(new Set(values).size===values.length,'CITIZEN_GROUNDING_ROSTER');return values;});
function rosterIds(active:readonly string[],capable:readonly string[]){const a=idList(active,CITIZEN_GROUNDING_LIMITS.active),c=idList(capable,CITIZEN_GROUNDING_LIMITS.capable);check(a.length>0&&c.length>0&&c.every(id=>a.includes(id)),'CITIZEN_GROUNDING_ROSTER');return {active:a,capable:c,background:a.filter(id=>!c.includes(id))};}
const recordFields=['id','weight','ageGroup','sex','planningArea','planningAreaName','subzone','subzoneName','exactAge','labourForceStatus','employmentRelationship','nature','occupationCode','jobTitle','workplaceArea','workplaceAreaName','homeProxy','workplaceProxy','schedule','travelMode','eligibleAccessStationIds','preferredAccessStationId','circumstances','fieldProvenance'];
const provenanceFields=['demographics','exactAge','labourForceStatus','employmentRelationship','nature','occupationCode','jobTitle','workplaceArea','homeProxy','workplaceProxy','schedule','travelMode','accessStations'];
function validateRecord(r:CitizenRecord,base?:Resident){guard('CITIZEN_GROUNDING_RECORD',()=>{
 assertJsonData(r);object(r,recordFields);identifier(r.id);check(Number.isFinite(r.weight)&&r.weight>0,'CITIZEN_GROUNDING_RECORD');
 for(const k of ['ageGroup','planningArea','planningAreaName','subzone','subzoneName'] as const)text(r[k],100);
 check(['male','female'].includes(r.sex)&&['employed','unemployed','outside-labour-force','unknown'].includes(r.labourForceStatus)&&['rail','rail-bus','bus','car-taxi','other','no-work-trip','unknown'].includes(r.travelMode),'CITIZEN_GROUNDING_RECORD');
 if(r.ageGroup==='90andOver')check(r.exactAge===null,'CITIZEN_GROUNDING_RECORD');else{const match=/^(\d+)_(\d+)$/.exec(r.ageGroup);check(match&&Number.isSafeInteger(r.exactAge)&&r.exactAge!>=Number(match[1])&&r.exactAge!<=Number(match[2]),'CITIZEN_GROUNDING_RECORD');}
 for(const k of ['occupationCode','jobTitle','workplaceArea','workplaceAreaName'] as const)if(r[k]!==null)text(r[k],160);
 check((r.workplaceArea===null)===(r.workplaceAreaName===null),'CITIZEN_GROUNDING_RECORD');
 if(r.labourForceStatus!=='employed'){check([r.employmentRelationship,r.nature,r.occupationCode,r.jobTitle,r.workplaceArea,r.workplaceAreaName,r.workplaceProxy,r.schedule].every(v=>v===null)&&r.travelMode===(r.labourForceStatus==='unknown'?'unknown':'no-work-trip'),'CITIZEN_GROUNDING_RECORD');}
 else check(parseInt(r.ageGroup,10)>=15&&['employee','own-account','employer','contributing-family'].includes(r.employmentRelationship??'')&&['full-time','part-time'].includes(r.nature??''),'CITIZEN_GROUNDING_RECORD');
 for(const p of [r.homeProxy,r.workplaceProxy])if(p){object(p,['lat','lon','basis','sourceId']);check(Number.isFinite(p.lat)&&p.lat>=1&&p.lat<=1.6&&Number.isFinite(p.lon)&&p.lon>=103.5&&p.lon<=104.6,'CITIZEN_GROUNDING_RECORD');text(p.basis,300);text(p.sourceId,160);}
 if(r.workplaceProxy)check(r.workplaceArea!==null,'CITIZEN_GROUNDING_RECORD');
 if(r.schedule){const s=r.schedule;object(s,['timeZone','arrangement','days','startMinute','endMinute','breakMinutes','overnight','weeklyMinutes','templateId','assumptionIds']);check(s.timeZone==='Asia/Singapore'&&['on-site','hybrid','remote'].includes(s.arrangement)&&Array.isArray(s.days)&&s.days.length>=1&&s.days.length<=7&&new Set(s.days).size===s.days.length&&s.days.every(d=>Number.isSafeInteger(d)&&d>=0&&d<=6),'CITIZEN_GROUNDING_RECORD');check([s.startMinute,s.endMinute,s.breakMinutes,s.weeklyMinutes].every(n=>Number.isSafeInteger(n)&&n>=0)&&s.startMinute<1440&&s.endMinute<1440&&s.overnight===(s.endMinute<s.startMinute),'CITIZEN_GROUNDING_RECORD');const duration=(s.endMinute-s.startMinute+1440)%1440;check(duration>0&&duration<=960&&s.breakMinutes<duration&&s.weeklyMinutes===(duration-s.breakMinutes)*s.days.length&&(r.nature==='full-time'?s.weeklyMinutes>=2100:s.weeklyMinutes<2100),'CITIZEN_GROUNDING_RECORD');text(s.templateId,120);idList(s.assumptionIds,16);}
 check(Array.isArray(r.eligibleAccessStationIds)&&r.eligibleAccessStationIds.length<=3&&new Set(r.eligibleAccessStationIds).size===r.eligibleAccessStationIds.length,'CITIZEN_GROUNDING_RECORD');r.eligibleAccessStationIds.forEach(id=>text(id,160));check(r.preferredAccessStationId===null||r.eligibleAccessStationIds.includes(r.preferredAccessStationId),'CITIZEN_GROUNDING_RECORD');
 check(Array.isArray(r.circumstances)&&r.circumstances.length<=4,'CITIZEN_GROUNDING_RECORD');for(const c of r.circumstances){object(c,['id','subject','description','factRefs','basis']);check(c.id.startsWith('circumstance:'+r.id+':')&&['commute','schedule','workplace','employment'].includes(c.subject)&&['synthetic-assumption','calculated'].includes(c.basis),'CITIZEN_GROUNDING_RECORD');text(c.description,300);check(Array.isArray(c.factRefs)&&c.factRefs.length<=4&&c.factRefs.every(f=>typeof f==='string'&&f.startsWith('profile:'+r.id+':')),'CITIZEN_GROUNDING_RECORD');}
 object(r.fieldProvenance,provenanceFields);for(const p of Object.values(r.fieldProvenance)){object(p,['basis','sourceIds','assumptionIds','unknownReason'],['basis','sourceIds','assumptionIds']);check(['source-constrained','aggregate-conditioned','synthetic-assumption','unknown'].includes(p.basis),'CITIZEN_GROUNDING_RECORD');idList(p.sourceIds,16);idList(p.assumptionIds,16);if(p.basis==='unknown'||p.unknownReason!==undefined)text(p.unknownReason,300);}
 });
 if(base)check(['ageGroup','sex','planningArea','planningAreaName','subzone','subzoneName','weight','id'].every(k=>r[k as keyof CitizenRecord]===base[k as keyof Resident]),'CITIZEN_GROUNDING_SOURCE');
}
function shape(value:CitizenGroundedInput,activeIds:readonly string[],capableIds:readonly string[],base?:PopulationView){
 guard('CITIZEN_GROUNDING_SHAPE',()=>assertJsonData(value));check(bytes(value)<=CITIZEN_GROUNDING_LIMITS.inputBytes,'CITIZEN_GROUNDING_BOUND');
 const legacyFields=['version','policy','populationId','datasetId','scenarioFingerprint','profiles','personalities','sourceManifest'];
 guard('CITIZEN_GROUNDING_SHAPE',()=>{
  const root=object(value,[...legacyFields,'executionBundle','hybridBinding'],legacyFields);
  object(root,root.version===2?[...legacyFields,'executionBundle','hybridBinding']:legacyFields);
 });
 check((value.version===1||value.version===2)&&value.policy==='citizen-grounded-v1'&&/^population-[a-f0-9]{64}$/.test(value.populationId)&&/^citizens-[a-f0-9]{64}$/.test(value.datasetId)&&/^[a-f0-9]{64}$/.test(value.scenarioFingerprint),'CITIZEN_GROUNDING_IDENTITY');
 if(value.version===2){
  check(value.executionBundle==='hybrid-citizen-explore-v1','CITIZEN_GROUNDING_BINDING');
  const binding=guard('CITIZEN_GROUNDING_BINDING',()=>parseHybridBinding(value.hybridBinding));
  check(binding.scenarioFingerprint===value.scenarioFingerprint,'CITIZEN_GROUNDING_BINDING');
 }
 const ids=rosterIds(activeIds,capableIds);check(Array.isArray(value.profiles)&&value.profiles.length===ids.active.length&&value.profiles.every((p,i)=>p.citizen?.id===ids.active[i]),'CITIZEN_GROUNDING_ROSTER');
 parsePersonalityRoster(value.personalities,ids.capable,ids.background);
 guard('CITIZEN_GROUNDING_MANIFEST',()=>object(value.sourceManifest,['baseSourceHash','generatorVersion','sourceIds','assumptionIds']));check(/^[a-f0-9]{64}$/.test(value.sourceManifest.baseSourceHash),'CITIZEN_GROUNDING_MANIFEST');text(value.sourceManifest.generatorVersion,120);
 for(const refs of [value.sourceManifest.sourceIds,value.sourceManifest.assumptionIds])check(Array.isArray(refs)&&refs.length<=128&&new Set(refs).size===refs.length&&refs.every(v=>typeof v==='string'&&v.length>0&&v.length<=160&&!/\s|:\/\//.test(v)),'CITIZEN_GROUNDING_MANIFEST');
 const residents=base?new Map(base.residents.map(r=>[r.id,r])):null;
 if(base)check(value.populationId===base.id&&value.sourceManifest.baseSourceHash===base.source.rawSha256&&residents!.size===base.residents.length,'CITIZEN_GROUNDING_SOURCE');
 for(const p of value.profiles){guard('CITIZEN_GROUNDING_SHAPE',()=>object(p,['citizen','commute']));const resident=residents?.get(p.citizen.id);if(base)check(resident,'CITIZEN_GROUNDING_SOURCE');validateRecord(p.citizen,resident);if(p.commute)validateCitizenCommuteFact(p.commute,p.citizen,value.datasetId,value.populationId,value.scenarioFingerprint);else check(p.commute===null,'CITIZEN_GROUNDING_FACT');}
 return ids;
}

export async function createCitizenGrounding(dataset:CitizenDataset,commutes:CitizenCommuteRun,roster:PersonalityRoster,activeIds:string[],capableIds:string[]):Promise<CitizenGroundedInputV1>{
 const ids=rosterIds(activeIds,capableIds);await validatePersonalityRoster(roster,ids.capable,ids.background);
 check(dataset.version===1&&dataset.policy==='citizen-circumstances-v1'&&dataset.manifest.version===1&&dataset.manifest.policy===dataset.policy&&dataset.manifest.populationId===dataset.populationId&&dataset.manifest.baseSourceHash===dataset.baseSourceHash&&dataset.manifest.recordCount===dataset.records.length,'CITIZEN_GROUNDING_DATASET');
 check(commutes.version===1&&commutes.policy==='citizen-commute-v1'&&commutes.populationId===dataset.populationId&&commutes.citizenDatasetId===dataset.id&&commutes.facts.length===dataset.records.length,'CITIZEN_GROUNDING_FACT');
 const citizens=new Map(dataset.records.map(c=>[c.id,c])),facts=new Map(commutes.facts.map(f=>[f.citizenId,f]));check(citizens.size===dataset.records.length&&facts.size===commutes.facts.length,'CITIZEN_GROUNDING_DUPLICATE');
 const profiles=ids.active.map(id=>{const citizen=citizens.get(id),commute=facts.get(id);check(citizen&&commute,'CITIZEN_GROUNDING_ACTOR');return {citizen,commute};});
 const sourceIds=[...new Set([dataset.manifest.baseSourceHash,...dataset.manifest.sources.map(s=>s.id),...profiles.flatMap(p=>[...Object.values(p.citizen.fieldProvenance).flatMap(f=>f.sourceIds),...p.commute.sourceIds])])].sort();
 const assumptionIds=[...new Set([...dataset.manifest.assumptions.map(a=>a.id),...profiles.flatMap(p=>[...Object.values(p.citizen.fieldProvenance).flatMap(f=>f.assumptionIds),...p.commute.assumptions])])].sort();
 const input:CitizenGroundedInputV1={version:1,policy:'citizen-grounded-v1',populationId:dataset.populationId,datasetId:dataset.id,scenarioFingerprint:commutes.scenarioFingerprint,profiles,personalities:roster,sourceManifest:{baseSourceHash:dataset.baseSourceHash,generatorVersion:dataset.manifest.generatorVersion,sourceIds,assumptionIds}};
 shape(input,ids.active,ids.capable);return freezeSnapshot(input);
}

/** Pure replay validation checks accepted shapes and original strata; service/journal boundaries own SHA checks. */
export function validateCitizenGrounding(input:CitizenGroundedInput,base:PopulationView,activeIds:string[],capableIds:string[]):void{
 shape(input,activeIds,capableIds,base);
}
/** Trusted creation/service boundary: complete SHA verification before an input is persisted. */
export async function validateCitizenGroundingAsync(input:CitizenGroundedInput,base:PopulationView,activeIds:string[],capableIds:string[]):Promise<CitizenGroundedInput>{
 const ids=shape(input,activeIds,capableIds,base),snapshot=freezeSnapshot(input);
 await validatePersonalityRoster(snapshot.personalities,ids.capable,ids.background);
 if(snapshot.version===2)await guardAsyncBinding(snapshot.hybridBinding);
 return snapshot;
}
async function guardAsyncBinding(binding:HybridBinding):Promise<HybridBinding>{
 try{return await validateHybridBinding(binding);}catch{throw Error('CITIZEN_GROUNDING_BINDING');}
}
/** Explicit new execution bundle. Existing accepted inputs are never silently upgraded or rebound. */
export async function withHybridBinding(input:CitizenGroundedInputV1,binding:HybridBinding):Promise<CitizenGroundedInputV2>{
 guard('CITIZEN_GROUNDING_SHAPE',()=>assertJsonData(input));check(input?.version===1,'CITIZEN_GROUNDING_BINDING');
 const activeIds=guard('CITIZEN_GROUNDING_ROSTER',()=>input.profiles.map(p=>p.citizen.id)),capableIds=guard('CITIZEN_GROUNDING_ROSTER',()=>input.personalities.capableIds);
 const ids=shape(input,activeIds,capableIds),snapshot=freezeSnapshot(input);
 const accepted=guard('CITIZEN_GROUNDING_BINDING',()=>parseHybridBinding(binding));
 check(accepted.scenarioFingerprint===snapshot.scenarioFingerprint,'CITIZEN_GROUNDING_BINDING');
 await validatePersonalityRoster(snapshot.personalities,ids.capable,ids.background);await guardAsyncBinding(accepted);
 const result:CitizenGroundedInputV2={...snapshot,version:2,executionBundle:'hybrid-citizen-explore-v1',hybridBinding:accepted};
 shape(result,ids.active,ids.capable);return freezeSnapshot(result);
}
const clock=(minute:number)=>String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
function scheduleText(c:CitizenRecord){const s=c.schedule;return s?`${s.arrangement}; ${clock(s.startMinute)}-${clock(s.endMinute)}${s.overnight?' overnight':''}; ${s.days.length} fictional days/week; ${s.weeklyMinutes/60} hours/week`:null;}

export function presentCitizenGrounding(input:CitizenGroundedInput,actorId:string,selectionPolicy?:'citizen-selection-v2'):GroundedActorContext{
 check(selectionPolicy===undefined||selectionPolicy==='citizen-selection-v2','CITIZEN_GROUNDING_POLICY');
 const selected=input.profiles.find(p=>p.citizen.id===actorId),personality=input.personalities.profiles.find(p=>p.citizenId===actorId);check(selected&&personality,'CITIZEN_GROUNDING_ACTOR');
 const c=selected.citizen,m=selected.commute,schedule=scheduleText(c),numeric=m?.baseline.status==='reachable'&&m.intervention.status==='reachable';
 const sources=(key:string)=>c.fieldProvenance[key]?.sourceIds.slice(0,1)??[],routeSource=m?.sourceIds.find(id=>id.startsWith('graph-topology:'))??m?.sourceIds[0],routeSources=routeSource?[routeSource]:[];
 const facts:GroundedFact[]=[
  {id:'fact-home',label:'Residence stratum',value:c.planningAreaName+' / '+c.subzoneName,unit:null,basis:'source-constrained',sourceIds:sources('demographics')},
  {id:'fact-employment',label:'Synthetic employment',value:[c.labourForceStatus,c.employmentRelationship,c.nature].filter(Boolean).join('; '),unit:null,basis:'synthetic-assumption',sourceIds:sources('labourForceStatus')},
  {id:'fact-occupation',label:'Synthetic job title',value:c.jobTitle,unit:null,basis:'synthetic-assumption',sourceIds:sources('occupationCode')},
  {id:'fact-workplace',label:'Synthetic workplace',value:c.workplaceAreaName,unit:null,basis:'synthetic-assumption',sourceIds:sources('workplaceArea')},
  {id:'fact-schedule',label:'Fictional schedule',value:schedule,unit:null,basis:'synthetic-assumption',sourceIds:sources('schedule')},
  {id:'fact-mode',label:'Assigned usual travel mode',value:c.travelMode,unit:null,basis:'synthetic-assumption',sourceIds:sources('travelMode')},
  {id:'fact-baseline',label:'Baseline journey',value:m?.baseline.status==='reachable'?m.baseline.totalSeconds!/60:null,unit:'minutes',basis:'calculated',sourceIds:routeSources},
  {id:'fact-intervention',label:'Intervention journey',value:m?.intervention.status==='reachable'?m.intervention.totalSeconds!/60:null,unit:'minutes',basis:'calculated',sourceIds:routeSources},
  {id:'fact-saving',label:'Modelled saving',value:numeric?m!.minutesSaved:null,unit:'minutes',basis:'calculated',sourceIds:routeSources},
  {id:'fact-transfer-change',label:'Transfer change',value:numeric?m!.transferChange:null,unit:'transfers',basis:'calculated',sourceIds:routeSources},
 ];
 const subjects:GroundedIssueSubject[]=[{id:'commute',label:'Own modelled commute',keywords:['commute','journey','rail','travel','transfer'],factRefs:['fact-mode','fact-baseline','fact-intervention','fact-saving','fact-transfer-change'],...(numeric?{criterion:{id:'criterion-commute-improves',factId:'fact-saving',operator:'gte' as const,threshold:0.000001}}:{})}];
 if(c.schedule)subjects.push({id:'schedule',label:'Own fictional work schedule',keywords:['shift','schedule','hours','start','finish','availability'],factRefs:['fact-schedule','fact-employment']});
 if(c.workplaceArea)subjects.push({id:'workplace',label:'Own synthetic workplace access',keywords:['workplace','station','access','walking'],factRefs:['fact-workplace','fact-mode','fact-baseline','fact-intervention']});
 const result:GroundedActorContext={version:1,policy:'citizen-grounded-v1',citizenId:actorId,populationId:input.populationId,datasetId:input.datasetId,scenarioFingerprint:input.scenarioFingerprint,demographic:{ageGroup:c.ageGroup,exactAge:c.exactAge,sex:c.sex,planningArea:c.planningAreaName,subzone:c.subzoneName},employment:{status:c.labourForceStatus,relationship:c.employmentRelationship,nature:c.nature,occupationCode:c.occupationCode,jobTitle:c.jobTitle,workplaceArea:c.workplaceAreaName},schedule,personality:{origin:personality.origin,traits:personality.traits},commute:m?{factId:m.id,status:m.status,baselineMinutes:m.baseline.status==='reachable'?m.baseline.totalSeconds!/60:null,interventionMinutes:m.intervention.status==='reachable'?m.intervention.totalSeconds!/60:null,minutesSaved:numeric?m.minutesSaved:null,baselineTransfers:m.baseline.transfers,interventionTransfers:m.intervention.transfers,reason:m.unknownReason}:null,facts,subjects,limitations:['Census2020 strata constrain fictional people; jobs, exact ages and schedules are assumptions.','Scenario roles do not establish jobs. Background facts are not recorded experiences or past journeys.','Static rail/walking estimates do not verify shift feasibility, crowding or arrivals. Source statements remain claims.','Source IDs show primary references; full provenance stays in the frozen pack.']};
 // V2's broader roster reaches richer employed profiles. Compact repeated warnings only;
 // every fact, source ID, subject, numerical value and the original byte ceiling stays intact.
 if(selectionPolicy==='citizen-selection-v2')result.limitations=['Fictional Census2020 person; jobs, ages and schedules are synthetic, not scenario-role facts or past experiences.','Static commute estimates do not verify feasibility, crowding or arrivals. Sources are claims; full provenance remains frozen.'];
 check(bytes(result)<=CITIZEN_GROUNDING_LIMITS.actorContextBytes,'CITIZEN_GROUNDING_CONTEXT_BOUND');return freezeSnapshot(result);
}
