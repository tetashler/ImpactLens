import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import type {CitizenGroundedInput} from '../../citizen-grounding/social.ts';
import type {WorkSchedule} from '../../citizen-grounding/contract.ts';
import {citizenAvailability} from '../../citizen-grounding/availability.ts';

/** Synthetic availability capability fixtures; no observed employment or real calendar is implied. */
const office:WorkSchedule={timeZone:'Asia/Singapore',arrangement:'on-site',days:[0,1,2,3,4],startMinute:540,endMinute:1080,breakMinutes:60,overnight:false,weeklyMinutes:2400,templateId:'fictional-office',assumptionIds:['fixture-schedule']};
const input=(schedule:WorkSchedule|null=office,actorId='citizen-fixture'):CitizenGroundedInput=>({profiles:[{citizen:{id:actorId,schedule}}],personalities:{seedDigest:'a'.repeat(64)}} as CitizenGroundedInput);
const tick=(day:number,hour:number,minute=0)=>((day-1)*1440+hour*60+minute-480)/15;

test('declared weekday shifts allow only a small fictional break during working hours',()=>{
 const g=input(),values=[];for(let t=tick(1,9);t<tick(1,18);t++)values.push(citizenAvailability(g,'citizen-fixture',t));
 assert.equal(values.filter(v=>v.available).length,1);assert.equal(values.filter(v=>v.period==='work-break').length,1);
 assert.ok(values.filter(v=>v.period!=='work-break').every(v=>!v.available&&v.period==='work'));
 assert.equal(citizenAvailability(g,'citizen-fixture',tick(1,18)).available,true);
});

test('fictional Monday anchor yields weekday work and weekend free periods without using wall clock',()=>{
 const g=input();assert.equal(citizenAvailability(g,'citizen-fixture',tick(5,10)).period,'work');
 assert.equal(citizenAvailability(g,'citizen-fixture',tick(6,10)).period,'awake');assert.equal(citizenAvailability(g,'citizen-fixture',tick(7,10)).period,'awake');
 assert.equal(citizenAvailability(g,'citizen-fixture',tick(8,10)).period,'work');
 assert.ok(citizenAvailability(g,'citizen-fixture',0).assumptions.includes('fictional-monday-anchor-v1'));
});

test('overnight shift belongs to its starting day and seeded rest is kept away from it',()=>{
 const g=input({...office,days:[0],startMinute:1140,endMinute:420,overnight:true,weeklyMinutes:660});
 assert.equal(citizenAvailability(g,'citizen-fixture',tick(1,20)).period,'work');assert.equal(citizenAvailability(g,'citizen-fixture',tick(2,3)).period,'work');
 assert.notEqual(citizenAvailability(g,'citizen-fixture',tick(2,8)).period,'work');
 assert.notEqual(citizenAvailability(g,'citizen-fixture',tick(2,20)).period,'work');
 const dayRest=[];for(let t=tick(2,7);t<tick(2,19);t++)if(citizenAvailability(g,'citizen-fixture',t).period==='rest')dayRest.push(t);
 assert.ok(dayRest.length>=28&&dayRest.length<=32);
});

test('rest and work classifications are deterministic across day boundaries and input restoration',()=>{
 const g=input(),restored=JSON.parse(JSON.stringify(g));
 for(let t=0;t<=672;t++)assert.deepEqual(citizenAvailability(g,'citizen-fixture',t),citizenAvailability(restored,'citizen-fixture',t));
 assert.equal(citizenAvailability(g,'citizen-fixture',tick(2,3)).period,'rest');
 assert.equal(citizenAvailability(g,'citizen-fixture',tick(2,10)).period,'work');
});

test('actors with no schedule still have bounded seeded rest and no fabricated work or journey periods',()=>{
 const g=input(null),periods=[];for(let t=tick(2,0);t<tick(3,0);t++)periods.push(citizenAvailability(g,'citizen-fixture',t).period);
 assert.ok(periods.includes('awake'));assert.ok(periods.includes('rest'));assert.ok(periods.every(p=>p==='awake'||p==='rest'));
 const count=periods.filter(p=>p==='rest').length;assert.ok(count>=28&&count<=32);
});

test('rest variations use only identity and frozen seed, not source demographics or occupation',()=>{
 const g=input(null) as any,changed=JSON.parse(JSON.stringify(g));changed.profiles[0].citizen.sex='male';changed.profiles[0].citizen.exactAge=90;changed.profiles[0].citizen.jobTitle='Unrelated title';
 for(let t=0;t<96;t++)assert.deepEqual(citizenAvailability(g,'citizen-fixture',t),citizenAvailability(changed,'citizen-fixture',t));
 const patterns=new Set(Array.from({length:15},(_,i)=>{const id='citizen-'+i,x=input(null,id);return Array.from({length:96},(_,t)=>citizenAvailability(x,id,t).period).join(',');}));assert.ok(patterns.size>1);
});

test('availability rejects unknown actors and invalid logical ticks without provider access',()=>{
 const g=input();assert.throws(()=>citizenAvailability(g,'outsider',0),/CITIZEN_AVAILABILITY_ACTOR/);
 for(const t of [-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER])assert.throws(()=>citizenAvailability(g,'citizen-fixture',t),/CITIZEN_AVAILABILITY_TICK/);
 let calls=0;const old=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw Error('NO_NETWORK');};try{citizenAvailability(g,'citizen-fixture',0);}finally{globalThis.fetch=old;}assert.equal(calls,0);
});
