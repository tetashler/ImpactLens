import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as swarm from '../../society/swarm.ts';
import {phase4dWorld} from './phase4d-fixture.ts';
import {act,createSociety,stepSociety,visibleFeed} from '../../society/engine.ts';
import {deepOpportunity} from '../../society/deep-scheduler.ts';

function world(){assert.equal(typeof swarm.multiDaySwarmPolicy,'function','temporal policy is missing');const i=phase4dWorld(50).genesis.input,p=swarm.multiDaySwarmPolicy();return createSociety({...i,swarm:p,hybrid:swarm.swarmHybrid(p),intelligence:{...i.intelligence!,memory:'episodic-topic-v2'},config:{...i.config,steps:320,activation:1}});}

test('calendar uses a fictional Singapore anchor and advances days without resetting elapsed time',async()=>{
 const w=world(),{simulationCalendar}=await import('../../society/temporal-policy.ts');assert.deepEqual(simulationCalendar(w,0),{day:1,hour:8,minute:0,timeZone:'Asia/Singapore',label:'Day 1 08:00',elapsedMinutes:0});assert.equal(simulationCalendar(w,64)!.label,'Day 2 00:00');assert.equal(simulationCalendar(w,192)!.label,'Day 3 08:00');assert.equal(simulationCalendar(phase4dWorld()),null);
});

test('rest windows are seeded, seven to nine hours, and unrelated to demographic attributes',async()=>{
 const w=world(),{actorAvailability}=await import('../../society/temporal-policy.ts');const starts=new Set<number>();
 for(const a of w.agents){const status=actorAvailability(w,a.id,0);assert.ok(status.restMinutes>=420&&status.restMinutes<=540);starts.add(status.restStartMinute);const altered={...w,agents:w.agents.map(x=>({...x,resident:null,role:null}))};assert.deepEqual(actorAvailability(altered,a.id,70),actorAvailability(w,a.id,70));assert.equal(actorAvailability(w,a.id,16).available,true);assert.equal(actorAvailability(w,a.id,72).available,false);}
 assert.ok(starts.size>1);
});

test('sleeping actors do not receive inference opportunities or inactive routine floods',async()=>{
 let w=world();const root=w.items.find(i=>!i.groupId)!,responder=w.agents.find(a=>a.id!==root.actorId&&visibleFeed(w,a.id,root.platform).some(i=>i.id===root.id))!;w=act(w,{actorId:responder.id,type:'read',platform:root.platform,targetId:root.id});w=act(w,{actorId:responder.id,type:'comment',platform:root.platform,targetId:root.id,text:'A recorded direct question waiting for its recipient.'});const reply=w.items.at(-1)!.id;
 for(let tick=0;tick<72;tick++)w=stepSociety(w);assert.equal(w.tick,72);assert.equal(deepOpportunity(w,visibleFeed),null);assert.ok(w.agents.find(a=>a.id===root.actorId)!.notifications.includes(reply));
 const count=w.events.length;w=stepSociety(w);assert.equal(w.tick,73);assert.equal(w.events.length,count);assert.ok(w.agents.find(a=>a.id===root.actorId)!.notifications.includes(reply));
});
