import '../../../scripts/testing/offline-network.mjs';import test from 'node:test';import assert from 'node:assert/strict';
import {phase4dWorld,fixtureDecision} from './phase4d-fixture.ts';import {createSociety,act,saveSociety,restoreSociety} from '../../society/engine.ts';
import {controlledIds,prepareHybridStep,finishDecision} from '../../society/hybrid.ts';import type {SocietyInput} from '../../society/contract.ts';
import {swarmPolicy,swarmHybrid} from '../../society/swarm.ts';
const input=(n=50)=>{const i=structuredClone(phase4dWorld(n).genesis.input) as SocietyInput&{swarm:any};i.intelligence!.memory='episodic-topic-v2';i.swarm={version:1,cohort:'seeded-majority-v1',scheduling:'event-triggers-v1',rules:'routine-only-v1',activeAgents:n,modelAgents:n===50?35:70,maxPerAgent:4,cooldownTicks:4,decisionsPerTick:2,proactiveInterval:8,maxConcurrent:1};i.hybrid={selectedAgents:i.swarm.modelAgents,maxCalls:n===50?64:128,reservedTokens:n===50?2400000:4800000,costUsd:n===50?1.5:3};return i;};
test('a versioned majority cohort identifies 35 of 50 separate agents beyond four role bindings',()=>{const w=createSociety(input());assert.equal(new Set(controlledIds(w)).size,35);assert.ok(Object.values(w.genesis.bindings).every(id=>controlledIds(w).includes(id)));});
test('selected residents outside role bindings index their own actual encounters',()=>{let w=createSociety(input());const actor=controlledIds(w).find(id=>!Object.values(w.genesis.bindings).includes(id))!,seed=w.items.find(i=>i.actorId!==actor&&!i.groupId)!;w=act(w,{actorId:actor,type:'read',platform:seed.platform,targetId:seed.id});assert.ok(w.agents.find(a=>a.id===actor)!.episodic?.length);});
test('event-triggered slots exercise a fair majority cohort under 64 calls and replay multiple decisions per tick',()=>{let w=createSociety(input());for(let n=0;n<300&&w.tick<80;n++){w=prepareHybridStep(w);if(w.hybrid!.pending)w=finishDecision(w,{decision:fixtureDecision(w.hybrid!.pending),usage:null,error:null});}assert.equal(w.tick,80);assert.equal(w.hybrid!.records.length,64);assert.ok(new Set(w.hybrid!.records.map(r=>r.context.actor.id)).size>=30);assert.deepEqual(restoreSociety(saveSociety(w)),w);});
test('the current scheduler offers actual accessible private discussions without increasing completion budgets',()=>{
 const i=input();i.swarm=swarmPolicy(50);i.hybrid=swarmHybrid(i.swarm);let w=createSociety(i);for(let n=0;n<300&&w.tick<80;n++){w=prepareHybridStep(w);if(w.hybrid!.pending)w=finishDecision(w,{decision:fixtureDecision(w.hybrid!.pending),usage:null,error:null});}
 const privateRecords=w.hybrid!.records.filter(r=>r.context.platform==='whatsapp');assert.ok(privateRecords.length>0);assert.ok(privateRecords.some(r=>r.context.opportunity?.kind==='group-discussion'));assert.equal(w.hybrid!.records.length,64);assert.deepEqual(restoreSociety(saveSociety(w)),w);
});
test('primary-run admission retains useful model opportunities after halfway rather than burning all calls early',()=>{
 const i=input();i.swarm=swarmPolicy(50);i.hybrid=swarmHybrid(i.swarm);let w=createSociety(i);for(let n=0;n<300&&w.tick<80;n++){w=prepareHybridStep(w);if(w.hybrid!.pending)w=finishDecision(w,{decision:fixtureDecision(w.hybrid!.pending),usage:null,error:null});}
 const ticks=w.hybrid!.records.map(r=>r.context.tick);assert.equal(ticks.length,64);assert.ok(ticks.filter(t=>t>40).length>=20);assert.ok(ticks.at(-1)!<80);assert.deepEqual(restoreSociety(saveSociety(w)),w);
});
test('cost reservations, token ceilings and per-agent ceilings independently stop majority inference',()=>{
 for(const bound of ['cost','tokens','agent'] as const){
  const i=input();i.swarm={...swarmPolicy(50),...(bound==='agent'?{maxPerAgent:1}:{})};i.hybrid={...swarmHybrid(i.swarm),...(bound==='cost'?{costUsd:0.02}:bound==='tokens'?{reservedTokens:1}:{})};
  let w=createSociety(i);for(let n=0;n<300&&w.tick<80;n++){w=prepareHybridStep(w);if(w.hybrid!.pending)w=finishDecision(w,{decision:fixtureDecision(w.hybrid!.pending),usage:null,error:null});}
  assert.equal(w.tick,80);assert.equal(w.hybrid!.records.length,bound==='cost'?1:bound==='tokens'?0:35);assert.deepEqual(restoreSociety(saveSociety(w)),w);
 }
});
