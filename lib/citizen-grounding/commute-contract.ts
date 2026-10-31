/** Browser-safe selected-fact checks. The trusted producer separately verifies SHA identities and routing. */
import {assertJsonData,ensure,object} from '../experiments/validation.ts';
import type {CitizenCommuteFact,CitizenRecord,CommuteSide} from './contract.ts';
const near=(a:number,b:number)=>Math.abs(a-b)<=1e-6;
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const text=(s:unknown,max=2000)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
export function commuteFactStatus(b:CommuteSide,s:CommuteSide):CitizenCommuteFact['status']{
 if(b.status==='not-applicable'&&s.status==='not-applicable')return 'not-applicable';if(b.status==='unknown'||s.status==='unknown')return 'unknown';
 if(b.status==='reachable'&&s.status==='reachable'){const delta=b.totalSeconds!-s.totalSeconds!;return near(delta,0)?'unchanged':delta>0?'improved':'worse';}
 return b.status==='unreachable'&&s.status==='reachable'?'newly-reachable':'unreachable';
}
export const citizenScheduleSummary=(c:CitizenRecord):string|null=>c.schedule?`${c.schedule.templateId}; ${c.schedule.startMinute}-${c.schedule.endMinute} local minutes; ${c.schedule.arrangement}; fictional schedule`:null;
export function validateCitizenCommuteFact(f:CitizenCommuteFact,c:CitizenRecord,datasetId:string,populationId:string,scenarioFingerprint:string):void{
 assertJsonData(f);object(f,['version','policy','id','citizenId','citizenDatasetId','populationId','scenarioFingerprint','residentialArea','workplaceArea','scheduleSummary','mode','baseline','intervention','status','minutesSaved','transferChange','sourceIds','assumptions','unknownReason']);
 ensure(f.version===1&&f.policy==='citizen-commute-v1'&&/^commute-[a-f0-9]{64}$/.test(f.id)&&f.citizenId===c.id&&f.citizenDatasetId===datasetId&&f.populationId===populationId&&f.scenarioFingerprint===scenarioFingerprint&&f.residentialArea===c.planningArea&&f.workplaceArea===c.workplaceArea&&f.mode===c.travelMode,'CITIZEN_COMMUTE_BINDING');
 ensure(f.scheduleSummary===citizenScheduleSummary(c),'CITIZEN_COMMUTE_SCHEDULE_BINDING');
 ensure(Array.isArray(f.sourceIds)&&f.sourceIds.length<=32&&f.sourceIds.every(s=>text(s,200))&&new Set(f.sourceIds).size===f.sourceIds.length&&Array.isArray(f.assumptions)&&f.assumptions.length<=16&&f.assumptions.every(s=>text(s))&&(f.unknownReason===null||text(f.unknownReason)),'CITIZEN_COMMUTE_PROVENANCE');
 const side=(s:CommuteSide)=>{
  object(s,['status','totalSeconds','railSeconds','accessSeconds','egressSeconds','transfers','originStationId','destinationStationId','stationIds']);ensure(['reachable','unreachable','unknown','not-applicable'].includes(s.status)&&Array.isArray(s.stationIds)&&s.stationIds.length<=128&&s.stationIds.every(s=>text(s,160)),'CITIZEN_COMMUTE_SIDE');
  if(s.status==='reachable'){ensure([s.totalSeconds,s.railSeconds,s.accessSeconds,s.egressSeconds].every(finite)&&Number.isSafeInteger(s.transfers)&&s.transfers!>=0&&near(s.totalSeconds!,s.railSeconds!+s.accessSeconds!+s.egressSeconds!),'CITIZEN_COMMUTE_ARITHMETIC');ensure(s.totalSeconds===0||text(s.originStationId,160)&&text(s.destinationStationId,160)&&s.stationIds[0]===s.originStationId&&s.stationIds.at(-1)===s.destinationStationId,'CITIZEN_COMMUTE_ROUTE');}
  else ensure([s.totalSeconds,s.railSeconds,s.accessSeconds,s.egressSeconds,s.transfers,s.originStationId,s.destinationStationId].every(v=>v===null)&&s.stationIds.length===0,'CITIZEN_COMMUTE_UNKNOWN');
 };
 side(f.baseline);side(f.intervention);ensure(f.status===commuteFactStatus(f.baseline,f.intervention),'CITIZEN_COMMUTE_STATUS');
 const comparable=f.baseline.status==='reachable'&&f.intervention.status==='reachable';
 ensure(comparable?typeof f.minutesSaved==='number'&&Number.isFinite(f.minutesSaved)&&near(f.minutesSaved,(f.baseline.totalSeconds!-f.intervention.totalSeconds!)/60)&&f.transferChange===f.intervention.transfers!-f.baseline.transfers!:f.minutesSaved===null&&f.transferChange===null,'CITIZEN_COMMUTE_DELTA');
 if(comparable)ensure(c.travelMode==='rail'&&c.labourForceStatus==='employed'&&c.homeProxy&&c.workplaceProxy&&c.workplaceArea&&c.schedule&&c.schedule.arrangement!=='remote','CITIZEN_COMMUTE_MODE');
 if(['bus','car-taxi','other','no-work-trip'].includes(c.travelMode))ensure(f.status==='not-applicable','CITIZEN_COMMUTE_MODE');
 if(c.travelMode==='rail-bus'||c.travelMode==='unknown')ensure(!comparable,'CITIZEN_COMMUTE_MODE');
}
