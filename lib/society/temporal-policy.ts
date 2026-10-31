import {randomFor,type SocietyInput,type SocietyWorld} from './contract.ts';
import {getExecutionProfile} from './execution-profile.ts';
import {ensure} from '../experiments/validation.ts';

export function simulationCalendar(value:SocietyInput|SocietyWorld,tick='genesis' in value?value.tick:0){
 const p=getExecutionProfile(value);if(!p)return null;ensure(Number.isSafeInteger(tick)&&tick>=0&&tick<=p.steps,'Invalid simulated calendar tick.');
 const elapsedMinutes=tick*p.tickMinutes,absolute=p.calendar.anchorMinute+elapsedMinutes,day=p.calendar.anchorDay+Math.floor(absolute/1440),hour=Math.floor(absolute%1440/60),minute=absolute%60;
 return {day,hour,minute,timeZone:p.calendar.timeZone,label:`Day ${day} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,elapsedMinutes};
}
/** Fictional seeded rest assumptions use only the run seed and actor identity, never demographics. */
export function actorAvailability(value:SocietyInput|SocietyWorld,actorId:string,tick='genesis' in value?value.tick:0){
 const p=getExecutionProfile(value);if(!p)return {available:true,restStartMinute:0,restMinutes:0,localMinute:tick*15%1440};
 const input='genesis' in value?value.genesis.input:value,clock=simulationCalendar(value,tick)!,localMinute=clock.hour*60+clock.minute;
 const restStartMinute=(1320+15*Math.floor(randomFor(input.seed+'|'+actorId+'|rest-start-v1')*9))%1440,restMinutes=420+15*Math.floor(randomFor(input.seed+'|'+actorId+'|rest-duration-v1')*9);
 return {available:(localMinute-restStartMinute+1440)%1440>=restMinutes,restStartMinute,restMinutes,localMinute};
}
export const isActorAvailable=(value:SocietyInput|SocietyWorld,actorId:string,tick='genesis' in value?value.tick:0)=>actorAvailability(value,actorId,tick).available;
