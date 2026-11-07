/** Browser-safe contract for one deterministic, shared-context MRT wait experiment. */
import {parseCitizenImpactRequest} from '../citizen-grounding/public-contract.ts';
import type {CitizenImpactPublic} from '../citizen-grounding/public-contract.ts';
import type {CitizenCommuteSummary} from '../citizen-grounding/contract.ts';
import type {MrtIntervention} from '../../prototype/mrt/scenario.ts';
import {assertJsonData,canonical,digest,ensure,freezeSnapshot,hash,object,strings,text} from './validation.ts';

export interface ControlledMrtRequest {
 version:1;serviceDate:string;intervention:MrtIntervention;
 optionB:{waitingTimeSeconds:number};sensitivity:{lowWaitingTimeSeconds:number;highWaitingTimeSeconds:number};
}
export interface ControlledMrtSnapshot {
 id:string;populationId:string;datasetId:string;baselineGraphHash:string;sourceSnapshotHash:string;serviceDate:string;
 sources:CitizenImpactPublic['sources'];demandSourceHash:string;accessSourceHash:string;
}
export interface ControlledMrtCommon {meanBaselineMinutes:number|null;meanTravelMinutes:number|null;meanMinutesSaved:number|null}
export type ControlledMrtOptionKey='A'|'B-low'|'B-base'|'B-high';
export type ControlledMrtPreference='A'|'B'|'tie'|'unknown';
export interface ControlledMrtOption {key:ControlledMrtOptionKey;waitingTimeSeconds:number;runId:string;scenarioFingerprint:string;summary:CitizenCommuteSummary;common:ControlledMrtCommon}
export interface ControlledMrtComparison {level:'low'|'base'|'high';differenceMinutesBMinusA:number|null;preferred:ControlledMrtPreference}
export interface ControlledMrtResponse {
 version:1;policy:'controlled-mrt-wait-v1';requestFingerprint:string;snapshot:ControlledMrtSnapshot;
 commonCohort:{agents:number;weight:number;excludedAgents:number;excludedWeight:number};options:ControlledMrtOption[];
 comparisons:ControlledMrtComparison[];preferenceChanges:boolean|null;assumptions:string[];limitations:string[];
}

export const CONTROLLED_MRT_TIE_SECONDS=1e-6;
export const CONTROLLED_MRT_REQUEST_BYTES=20*1024;
const responseBytes=256*1024;
const statuses=['improved','unchanged','worse','newly-reachable','unreachable','unknown','not-applicable'] as const;
const optionKeys=['A','B-low','B-base','B-high'] as const;
const levels=['low','base','high'] as const;
const number=(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER):number=>{ensure(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max,'CONTROLLED_MRT_NUMBER');return value;};
const integer=(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER):number=>{const n=number(value,min,max);ensure(Number.isSafeInteger(n),'CONTROLLED_MRT_INTEGER');return n;};
const wait=(value:unknown)=>integer(value,0,3600);
const near=(a:number,b:number)=>Math.abs(a-b)<=1e-8+1e-10*Math.max(Math.abs(a),Math.abs(b));
const bounded=(value:unknown,max:number):unknown[]=>{ensure(Array.isArray(value)&&value.length<=max,'CONTROLLED_MRT_ARRAY');return value;};
const date=(value:unknown)=>{const s=text(value,10);ensure(/^\d{4}-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s,'CONTROLLED_MRT_DATE');return s;};

export function parseControlledMrtRequest(value:unknown):ControlledMrtRequest {
 assertJsonData(value);ensure(new TextEncoder().encode(JSON.stringify(value)).byteLength<=CONTROLLED_MRT_REQUEST_BYTES,'CONTROLLED_MRT_REQUEST_BYTES');
 const r=object(value,['version','serviceDate','intervention','optionB','sensitivity']);ensure(r.version===1,'CONTROLLED_MRT_VERSION');
 const base=parseCitizenImpactRequest({serviceDate:r.serviceDate,intervention:r.intervention});wait(base.intervention.waitingTimeSeconds);
 const b=object(r.optionB,['waitingTimeSeconds']),s=object(r.sensitivity,['lowWaitingTimeSeconds','highWaitingTimeSeconds']);
 const middle=wait(b.waitingTimeSeconds),low=wait(s.lowWaitingTimeSeconds),high=wait(s.highWaitingTimeSeconds);ensure(low<=middle&&middle<=high,'CONTROLLED_MRT_WAIT_RANGE');
 return freezeSnapshot(value as ControlledMrtRequest);
}
export async function controlledMrtRequestFingerprint(value:unknown):Promise<string>{return digest('',parseControlledMrtRequest(value));}

function summary(value:unknown):CitizenCommuteSummary {
 const s=object(value,['representedPopulation','representedAgents','coverage','comparableWeight','weightedMinutesSaved','meanMinutesSaved','benefitingShare','interpretation']);
 const population=number(s.representedPopulation),count=integer(s.representedAgents,1,30000),coverage=object(s.coverage,statuses);let agents=0,weight=0;
 for(const status of statuses){const c=object(coverage[status],['agents','weight']),n=integer(c.agents),w=number(c.weight);ensure((n===0)===(w===0),'CONTROLLED_MRT_COVERAGE');agents+=n;weight+=w;}
 ensure(agents===count&&near(weight,population),'CONTROLLED_MRT_POPULATION');
 const comparable=['improved','unchanged','worse'].reduce((n,k)=>n+(coverage[k] as {weight:number}).weight,0);ensure(near(number(s.comparableWeight),comparable),'CONTROLLED_MRT_COMPARABLE');
 if(comparable===0)ensure(s.weightedMinutesSaved===null&&s.meanMinutesSaved===null&&s.benefitingShare===null,'CONTROLLED_MRT_NULL_SUMMARY');
 else{const total=number(s.weightedMinutesSaved,-Number.MAX_SAFE_INTEGER),mean=number(s.meanMinutesSaved,-Number.MAX_SAFE_INTEGER),share=number(s.benefitingShare,0,1);ensure(near(mean,total/comparable)&&near(share,(coverage.improved as {weight:number}).weight/comparable),'CONTROLLED_MRT_SUMMARY_ARITHMETIC');}
 text(s.interpretation,4000);return value as CitizenCommuteSummary;
}
function sources(value:unknown):void {
 const seen=new Set<string>();for(const item of bounded(value,32)){const s=object(item,['id','title','organisation','referenceYear','publicationUrl','sha256']);const id=text(s.id,160);ensure(!seen.has(id),'CONTROLLED_MRT_SOURCE_DUPLICATE');seen.add(id);text(s.title,500);text(s.organisation,300);integer(s.referenceYear,1900,2200);hash(s.sha256,'');const url=new URL(text(s.publicationUrl,2000));ensure(url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash,'CONTROLLED_MRT_SOURCE_URL');}
}
function common(value:unknown,covered:boolean):ControlledMrtCommon {
 const c=object(value,['meanBaselineMinutes','meanTravelMinutes','meanMinutesSaved']);
 if(!covered)ensure(Object.values(c).every(v=>v===null),'CONTROLLED_MRT_NULL_COMMON');
 else{const baseline=number(c.meanBaselineMinutes),travel=number(c.meanTravelMinutes),saved=number(c.meanMinutesSaved);ensure(near(saved,baseline-travel)&&travel<=baseline+CONTROLLED_MRT_TIE_SECONDS/60,'CONTROLLED_MRT_COMMON_ARITHMETIC');}
 return value as ControlledMrtCommon;
}
/** Structural and arithmetic validation; full private route authenticity belongs to the server producer. */
export function parseControlledMrtResponse(value:unknown):ControlledMrtResponse {
 assertJsonData(value);ensure(new TextEncoder().encode(JSON.stringify(value)).byteLength<=responseBytes,'CONTROLLED_MRT_RESPONSE_BYTES');
 const r=object(value,['version','policy','requestFingerprint','snapshot','commonCohort','options','comparisons','preferenceChanges','assumptions','limitations']);
 ensure(r.version===1&&r.policy==='controlled-mrt-wait-v1','CONTROLLED_MRT_POLICY');hash(r.requestFingerprint,'');
 const snapshot=object(r.snapshot,['id','populationId','datasetId','baselineGraphHash','sourceSnapshotHash','serviceDate','sources','demandSourceHash','accessSourceHash']);
 hash(snapshot.id,'mrt-context-');hash(snapshot.populationId,'population-');hash(snapshot.datasetId,'citizens-');date(snapshot.serviceDate);for(const key of ['baselineGraphHash','sourceSnapshotHash','demandSourceHash','accessSourceHash'])hash(snapshot[key],'');sources(snapshot.sources);
 const cohort=object(r.commonCohort,['agents','weight','excludedAgents','excludedWeight']),agents=integer(cohort.agents,0,30000),weight=number(cohort.weight),excludedAgents=integer(cohort.excludedAgents,0,30000),excludedWeight=number(cohort.excludedWeight);
 ensure((agents===0)===(weight===0)&&(excludedAgents===0)===(excludedWeight===0),'CONTROLLED_MRT_COMMON_COVERAGE');
 const options=bounded(r.options,4);ensure(options.length===4,'CONTROLLED_MRT_OPTIONS');
 for(const [i,item]of options.entries()){
  const o=object(item,['key','waitingTimeSeconds','runId','scenarioFingerprint','summary','common']);ensure(o.key===optionKeys[i],'CONTROLLED_MRT_OPTION_ORDER');wait(o.waitingTimeSeconds);hash(o.runId,'citizen-impact-');hash(o.scenarioFingerprint,'');const s=summary(o.summary),c=common(o.common,weight>0);
  ensure(s.representedAgents===agents+excludedAgents&&near(s.representedPopulation,weight+excludedWeight)&&weight<=s.comparableWeight+1e-8&&agents<=s.coverage.improved.agents+s.coverage.unchanged.agents+s.coverage.worse.agents,'CONTROLLED_MRT_COHORT_BINDING');
  if(i>0){const a=options[0] as ControlledMrtOption;ensure(c.meanBaselineMinutes===null?a.common.meanBaselineMinutes===null:near(c.meanBaselineMinutes,a.common.meanBaselineMinutes!),'CONTROLLED_MRT_BASELINE_BINDING');}
  for(let prior=0;prior<i;prior++){const p=options[prior] as ControlledMrtOption;if(p.waitingTimeSeconds===o.waitingTimeSeconds){const {key:_left,...left}=p,{key:_right,...right}=o;ensure(canonical(left)===canonical(right),'CONTROLLED_MRT_IDENTICAL_WAIT');}}
 }
 const typed=options as ControlledMrtOption[];ensure(typed[1].waitingTimeSeconds<=typed[2].waitingTimeSeconds&&typed[2].waitingTimeSeconds<=typed[3].waitingTimeSeconds,'CONTROLLED_MRT_WAIT_RANGE');
 const comparisons=bounded(r.comparisons,3);ensure(comparisons.length===3,'CONTROLLED_MRT_COMPARISONS');
 for(const [i,item]of comparisons.entries()){
  const c=object(item,['level','differenceMinutesBMinusA','preferred']);ensure(c.level===levels[i],'CONTROLLED_MRT_COMPARISON_ORDER');
  if(weight===0)ensure(c.differenceMinutesBMinusA===null&&c.preferred==='unknown','CONTROLLED_MRT_UNKNOWN_PREFERENCE');
  else{const difference=number(c.differenceMinutesBMinusA,-Number.MAX_SAFE_INTEGER),expected=typed[i+1].common.meanTravelMinutes!-typed[0].common.meanTravelMinutes!;ensure(near(difference,expected),'CONTROLLED_MRT_DIFFERENCE');const preferred=Math.abs(difference*60)<=CONTROLLED_MRT_TIE_SECONDS?'tie':difference>0?'A':'B';ensure(c.preferred===preferred,'CONTROLLED_MRT_PREFERENCE');}
 }
 const preferenceChanges=weight===0?null:new Set((comparisons as ControlledMrtComparison[]).map(c=>c.preferred)).size>1;ensure(r.preferenceChanges===preferenceChanges,'CONTROLLED_MRT_PREFERENCE_CHANGES');
 strings(r.assumptions,32,4000);strings(r.limitations,32,4000);return freezeSnapshot(value as ControlledMrtResponse);
}

export async function assertControlledMrtBinding(response:unknown,request:unknown):Promise<ControlledMrtResponse> {
 const result=parseControlledMrtResponse(response),input=parseControlledMrtRequest(request);
 ensure(result.requestFingerprint===await controlledMrtRequestFingerprint(input)&&result.snapshot.serviceDate===input.serviceDate,'CONTROLLED_MRT_REQUEST_BINDING');
 const waits=[input.intervention.waitingTimeSeconds,input.sensitivity.lowWaitingTimeSeconds,input.optionB.waitingTimeSeconds,input.sensitivity.highWaitingTimeSeconds];ensure(result.options.every((o,i)=>o.waitingTimeSeconds===waits[i]),'CONTROLLED_MRT_WAIT_BINDING');
 const {id,...content}=result.snapshot;ensure(id===await digest('mrt-context-',content),'CONTROLLED_MRT_SNAPSHOT_BINDING');return result;
}
