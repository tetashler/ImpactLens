import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as swarm from '../../society/swarm.ts';
import {phase4dWorld,fixtureDecision} from './phase4d-fixture.ts';
import {act,createSociety,multiDayComplete,stepSociety,visibleFeed} from '../../society/engine.ts';
import {deepOpportunity,multiDayPacing} from '../../society/deep-scheduler.ts';
import type {SocietyWorld} from '../../society/contract.ts';
import {prepareHybridStep,finishDecision,replayHybrid} from '../../society/hybrid.ts';

function world(grant=70,steps:160|320|672=320){assert.equal(typeof swarm.multiDaySwarmPolicy,'function','grant-aware policy is missing');const i=phase4dWorld(50).genesis.input,p=swarm.multiDaySwarmPolicy(50,grant,steps);return createSociety({...i,swarm:p,hybrid:swarm.swarmHybrid(p),intelligence:{...i.intelligence!,memory:'episodic-topic-v2'},config:{...i.config,steps}});}

test('initial grant controls release and protects the final third under urgent early demand',async()=>{
 const w=world(),{multiDayPacing}=await import('../../society/deep-scheduler.ts');
 assert.equal(multiDayPacing(w,1,0)!.released,6);assert.equal(multiDayPacing(w,1,0)!.urgentAvailable,8);assert.equal(multiDayPacing(w,1,8)!.available,0);assert.equal(multiDayPacing(w,1,8)!.debt,2);
 assert.equal(multiDayPacing(w,160,0)!.released,37);assert.equal(multiDayPacing(w,213,0)!.urgentAvailable<=49,true);assert.equal(multiDayPacing(w,320,0)!.released,70);assert.equal(multiDayPacing(w,319,0)!.urgentAvailable,69);
 for(let tick=1;tick<=320;tick++){const p=multiDayPacing(w,tick,0)!;assert.ok(p.released<=70&&p.urgentAvailable<=70);if(tick<p.protectedUntilTick)assert.ok(p.urgentAvailable<=49);}
 assert.equal(multiDayPacing(world(1),1,0)!.urgentAvailable,0);assert.equal(multiDayPacing(world(1),320,0)!.urgentAvailable,1);assert.equal(multiDayPacing(world(0),1,0)!.urgentAvailable,0);
});

test('unused release carries forward and borrowing is repaid by future release',async()=>{
 const w=world(),{multiDayPacing}=await import('../../society/deep-scheduler.ts');assert.equal(multiDayPacing(w,20,8)!.debt,0);assert.ok(multiDayPacing(w,100,0)!.available>multiDayPacing(w,20,0)!.available);assert.equal(multiDayPacing(w,100,70)!.urgentAvailable,0);
});

test('quiet demand does not force grant exhaustion and late opportunity replay stays exact',()=>{
 let w=world(70,160);for(let n=0;n<400&&w.tick<160;n++){w=prepareHybridStep(w);if(w.hybrid!.pending)w=finishDecision(w,{decision:fixtureDecision(w.hybrid!.pending),usage:null,error:null});}
 assert.equal(w.tick,160);assert.ok(w.hybrid!.records.length>0&&w.hybrid!.records.length<70);assert.ok(w.hybrid!.records.some(r=>r.context.tick>100));
 for(const tick of new Set(w.hybrid!.records.map(r=>r.context.tick))){const rows=w.hybrid!.records.filter(r=>r.context.tick===tick);assert.ok(rows.length<=6);assert.equal(new Set(rows.map(r=>r.context.actor.id)).size,rows.length);}
 assert.deepEqual(replayHybrid(w.genesis.input,w.tick,w.hybrid!.records,null),w);
});

test('final-tick demand remains eligible until all final reasoning slots are settled',()=>{
 let w:SocietyWorld={...world(),tick:320,status:'complete'};assert.equal(multiDayComplete(w),false);assert.ok(deepOpportunity(w,visibleFeed));const before=w.events.length;
 for(let n=0;n<6;n++){w=prepareHybridStep(w);assert.equal(w.tick,320);assert.ok(w.hybrid!.pending);w=finishDecision(w,{decision:fixtureDecision(w.hybrid!.pending),usage:null,error:null});if(n<5)assert.equal(multiDayComplete(w),false);}
 assert.equal(w.hybrid!.records.length,6);assert.equal(multiDayComplete(w),true);assert.equal(prepareHybridStep(w),w);assert.ok(w.events.length>before);
});

test('only actual direct replies borrow early credit and the borrower cannot monopolise a tick',()=>{
 let w=world();for(let n=0;n<6;n++){w=prepareHybridStep(w);assert.equal(w.tick,1);assert.ok(w.hybrid!.pending);w=finishDecision(w,{decision:fixtureDecision(w.hybrid!.pending),usage:null,error:null});}
 const targets:string[]=[];for(const root of w.items.filter(i=>!i.parentId&&!i.groupId).slice(0,2)){const responder=w.agents.find(a=>a.id!==root.actorId&&visibleFeed(w,a.id,root.platform).some(i=>i.id===root.id))!;assert.ok(responder);w=act(w,{actorId:responder.id,type:'read',platform:root.platform,targetId:root.id});w=act(w,{actorId:responder.id,type:'comment',platform:root.platform,targetId:root.id,text:'A fresh direct question about the recorded safeguard.'});targets.push(w.items.at(-1)!.id);}
 w=stepSociety(w);assert.equal(w.tick,2);assert.equal(multiDayPacing(w)!.available,0);
 for(let n=0;n<2;n++){const selected=deepOpportunity(w,visibleFeed)!;assert.ok(targets.includes(selected.targetId!));w=prepareHybridStep(w);assert.equal(w.tick,2);assert.ok(w.hybrid!.pending);assert.equal(w.hybrid!.pending.opportunity!.kind,'direct-reply');w=finishDecision(w,{decision:fixtureDecision(w.hybrid!.pending),usage:null,error:null});}
 assert.equal(w.hybrid!.records.length,8);assert.equal(multiDayPacing(w)!.debt,2);assert.equal(deepOpportunity(w,visibleFeed),null);assert.equal(new Set(w.hybrid!.records.filter(r=>r.context.tick===2).map(r=>r.context.actor.id)).size,2);
 while(w.tick<6)w=stepSociety(w);const root=w.items.find(i=>!i.parentId&&!i.groupId)!,responder=w.agents.find(a=>a.id!==root.actorId&&visibleFeed(w,a.id,root.platform).some(i=>i.id===root.id))!;w=act(w,{actorId:responder.id,type:'read',platform:root.platform,targetId:root.id});w=act(w,{actorId:responder.id,type:'comment',platform:root.platform,targetId:root.id,text:'A distinct followup should wait until the existing urgent loan is repaid.'});
 assert.equal(multiDayPacing(w)!.released,7);assert.equal(multiDayPacing(w)!.debt,1);assert.equal(multiDayPacing(w)!.urgentAvailable,0,'partial repayment cannot replenish the urgent loan');assert.equal(deepOpportunity(w,visibleFeed),null);
 const earlier=structuredClone(w);delete earlier.genesis.input.swarm!.multiDay!.pacingRevision;swarm.validateSwarm(earlier.genesis.input.swarm!);assert.equal(multiDayPacing(earlier)!.urgentAvailable,1,'recorded pre-repayment policies retain their original allowance');
 while(w.tick<16)w=stepSociety(w);assert.equal(multiDayPacing(w)!.available,1);assert.equal(multiDayPacing(w)!.urgentAvailable,1,'an ordinarily released opportunity precedes another urgent loan');
 const ordinary=deepOpportunity(w,visibleFeed)!;assert.ok(ordinary.targetId);assert.equal(w.hybrid!.records.filter(r=>r.context.actor.id===ordinary.actorId).length,0,'ordinary release gives an eligible low-count actor priority over repeated private direct traffic');
});
