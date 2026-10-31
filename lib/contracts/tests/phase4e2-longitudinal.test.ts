import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {phase4dWorld,fixtureDecision} from './phase4d-fixture.ts';
import {act,createSociety,visibleFeed} from '../../society/engine.ts';
import {prepareHybridStep,finishDecision,parseSocialDecision,replayHybrid,replayHybridFrom} from '../../society/hybrid.ts';
import {deepOpportunity,multiDayPacing} from '../../society/deep-scheduler.ts';
import {multiDaySwarmPolicy,swarmHybrid} from '../../society/swarm.ts';
import {actorAvailability,simulationCalendar} from '../../society/temporal-policy.ts';
import type {SocietyWorld,SocialItem} from '../../society/contract.ts';

test('an actual Day 3 counterparty reply reopens an authorised conversation while its matched quiet fork stays quiet',()=>{
 const base=phase4dWorld(50).genesis.input,policy=multiDaySwarmPolicy(),channel=base.communication!.channels.find(c=>c.style!=='private-group')!;
 let quiet=createSociety({...base,communication:{...base.communication!,channels:[channel]},acceptedActions:[base.acceptedActions[0]],intelligence:{...base.intelligence!,memory:'episodic-topic-v2'},swarm:policy,hybrid:swarmHybrid(policy),config:{...base.config,steps:320}});
 let author:string|undefined,counterparty:string|undefined,root:SocialItem|undefined;
 // Explicit capability choices: an early root and counterparty response, then
 // accepted inactivity. Nothing here claims spontaneous provider behaviour.
 for(let turns=0;turns<600&&quiet.tick<196;turns++){
  quiet=prepareHybridStep(quiet);const context=quiet.hybrid!.pending;if(!context)continue;
  let decision;
  if(!author){author=context.actor.id;decision=fixtureDecision(context,'post',undefined,'A recorded early root about wage safeguards.');}
  else if(!counterparty){counterparty=context.actor.id;root=quiet.items.find(i=>i.actorId===author&&quiet.events.find(e=>e.id===i.id)?.source==='social-model')!;assert.ok(root);decision=fixtureDecision(context,'comment',root.id,'An early counterparty asks for a later safeguard review.');}
  else decision=fixtureDecision(context);
  quiet=finishDecision(quiet,{decision:parseSocialDecision(decision,context),usage:null,error:null});
 }
 assert.ok(author&&counterparty&&root);assert.notEqual(author,counterparty);assert.equal(quiet.tick,196);assert.equal(simulationCalendar(quiet)!.label,'Day 3 09:00');
 assert.deepEqual(quiet.hybrid!.records.slice(0,6).map(r=>r.context.tick),[1,1,1,1,1,1]);assert.ok(quiet.hybrid!.records.length<350);assert.ok(multiDayPacing(quiet)!.available>0);
 assert.equal(actorAvailability(quiet,author).available,true);assert.equal(actorAvailability(quiet,counterparty).available,true);
 assert.equal(deepOpportunity(quiet,visibleFeed),null,'spare capacity and elapsed days do not create an incoming trigger');
 assert.deepEqual(replayHybrid(quiet.genesis.input,quiet.tick,quiet.hybrid!.records,null),quiet);
 const quietNext=prepareHybridStep(quiet);assert.equal(quietNext.tick,197);assert.equal(quietNext.hybrid!.pending,null);assert.equal(quietNext.hybrid!.records.length,quiet.hybrid!.records.length);
 assert.deepEqual(replayHybrid(quietNext.genesis.input,quietNext.tick,quietNext.hybrid!.records,null),quietNext);

 // This is a labelled, recorded scenario input at Day 3, using real transition
 // validation. It is not an unrecorded exposure or a fabricated model decision.
 // Its accepted model tail is replayed from this input's committed checkpoint;
 // genesis replay cannot invent a new external scenario input.
 const recordLateInput=(world:SocietyWorld)=>{
  world=act(world,{actorId:counterparty!,type:'read',platform:channel.id,targetId:root!.id});
  return act(world,{actorId:counterparty!,type:'comment',platform:channel.id,targetId:root!.id,text:'A recorded Day 3 update asks whether the earlier safeguard now has a review condition.'});
 };
 const checkpoint=recordLateInput(quiet),late=checkpoint.items.at(-1)!;
 assert.equal(late.actorId,counterparty);assert.equal(late.tick,196);assert.equal(late.parentId,root.id);assert.ok(checkpoint.agents.find(a=>a.id===author)!.notifications.includes(late.id));
 assert.equal(checkpoint.events.at(-2)!.type,'read');assert.equal(checkpoint.events.at(-2)!.targetId,root.id);assert.equal(checkpoint.events.at(-1)!.source,'deterministic-rule');
 assert.deepEqual(recordLateInput(replayHybrid(quiet.genesis.input,quiet.tick,quiet.hybrid!.records,null)),checkpoint);

 const offered=prepareHybridStep(checkpoint),context=offered.hybrid!.pending!;
 assert.ok(context);assert.equal(offered.tick,196);assert.equal(context.actor.id,author);assert.equal(context.actor.id,quiet.hybrid!.records[0].context.actor.id);
 assert.equal(context.opportunity!.kind,'direct-reply');assert.equal(context.opportunity!.sourceEventId,late.id);assert.equal(context.calendar!.day,3);
 assert.ok(context.items.some(i=>i.id===late.id&&i.actorId===counterparty));assert.ok(context.memories.some(m=>m.primaryItemId===late.id&&m.kind==='exposure'));
 const preparation=offered.events.at(-1)!;assert.equal(preparation.type,'read');assert.equal(preparation.targetId,late.id);assert.equal(preparation.decisionId,context.id);
 const decision=parseSocialDecision(fixtureDecision(context,'reply',late.id,'This explicit fixture response addresses the recorded Day 3 safeguard review.'),context);
 const accepted=finishDecision(offered,{decision,usage:null,error:null}),last=accepted.hybrid!.records.at(-1)!;
 assert.equal(last.status,'accepted');assert.equal(last.context.actor.id,author);assert.equal(accepted.events.at(-1)!.source,'social-model');assert.equal(accepted.events.at(-1)!.targetId,late.id);
 assert.equal(accepted.hybrid!.records.length,quiet.hybrid!.records.length+1);assert.ok(accepted.hybrid!.records.length<=multiDayPacing(accepted)!.released);assert.equal(last.context.opportunity!.substep,0);
 assert.deepEqual(replayHybridFrom(checkpoint,accepted.tick,accepted.hybrid!.records,null),accepted);
});
