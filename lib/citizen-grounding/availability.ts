/** Fictional social availability only. It creates no work, journey, sleep or memory events. */
import {ensure} from '../experiments/validation.ts';
import type {CitizenGroundedInput} from './social.ts';
import type {WorkSchedule} from './contract.ts';

export interface CitizenAvailability {available:boolean;period:'awake'|'rest'|'work'|'work-break';assumptions:string[]}
export const CITIZEN_AVAILABILITY_POLICY=Object.freeze({policy:'citizen-availability-v1',tickMinutes:15,anchorMinute:480,anchorWeekday:0,weekdayConvention:'Monday=0',maximumSocialBreakMinutes:15});
const DAY=1440;
const mod=(n:number,m:number)=>(n%m+m)%m;
const seed=(s:string)=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const within=(minute:number,start:number,duration:number)=>mod(minute-start,DAY)<duration;
function restWindow(actorId:string,seedDigest:string,schedule:WorkSchedule|null){
 const n=seed(seedDigest+'|'+actorId+'|citizen-rest-v1'),duration=420+15*(n%5),start=1320+15*(Math.floor(n/5)%7);
 if(!schedule)return {start:mod(start,DAY),duration};
 const workDuration=mod(schedule.endMinute-schedule.startMinute,DAY);
 // The default night rest is retained when it does not overlap the declared shift template.
 const overlaps=Array.from({length:duration/15},(_,i)=>within(mod(start+i*15,DAY),schedule.startMinute,workDuration)).some(Boolean);
 if(!overlaps)return {start:mod(start,DAY),duration};
 const gap=DAY-workDuration,restDuration=Math.min(duration,gap),offset=Math.min(60+15*(Math.floor(n/35)%4),Math.max(0,gap-restDuration));
 return {start:mod(schedule.endMinute+offset,DAY),duration:restDuration};
}
function working(schedule:WorkSchedule,day:number,minute:number){
 const today=mod(day,7),yesterday=mod(day-1,7);
 if(schedule.overnight)return minute>=schedule.startMinute&&schedule.days.includes(today)||minute<schedule.endMinute&&schedule.days.includes(yesterday);
 return schedule.days.includes(today)&&minute>=schedule.startMinute&&minute<schedule.endMinute;
}

/** Day 1 is explicitly fictional Monday, 08:00 Asia/Singapore. No live date is consulted. */
export function citizenAvailability(input:CitizenGroundedInput,actorId:string,tick:number):CitizenAvailability{
 ensure(Number.isSafeInteger(tick)&&tick>=0&&tick<=(Number.MAX_SAFE_INTEGER-480)/15,'CITIZEN_AVAILABILITY_TICK');
 const actor=input.profiles.find(p=>p.citizen.id===actorId);ensure(actor,'CITIZEN_AVAILABILITY_ACTOR');
 ensure(typeof input.personalities.seedDigest==='string'&&/^[a-f0-9]{64}$/.test(input.personalities.seedDigest),'CITIZEN_AVAILABILITY_SEED');
 const absolute=480+tick*15,day=Math.floor(absolute/DAY),minute=absolute%DAY,schedule=actor.citizen.schedule;
 const assumptions=['citizen-availability-v1','fictional-monday-anchor-v1','seeded-rest-v1'];
 if(schedule)assumptions.push('declared-work-schedule-v1','fictional-social-break-v1');
 const rest=restWindow(actorId,input.personalities.seedDigest,schedule);
 if(schedule&&working(schedule,day,minute)){
  const duration=mod(schedule.endMinute-schedule.startMinute,DAY),elapsed=mod(minute-schedule.startMinute,DAY);
  const breakMinutes=Math.min(15,Math.floor(schedule.breakMinutes/15)*15),breakStart=Math.floor(duration/30)*15;
  const onBreak=breakMinutes>0&&elapsed>=breakStart&&elapsed<breakStart+breakMinutes;
  return {available:onBreak,period:onBreak?'work-break':'work',assumptions};
 }
 const resting=within(minute,rest.start,rest.duration);
 return {available:!resting,period:resting?'rest':'awake',assumptions};
}
