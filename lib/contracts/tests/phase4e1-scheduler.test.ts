import '../../../scripts/testing/offline-network.mjs';import test from 'node:test';import assert from 'node:assert/strict';
import {phase4dWorld,fixtureDecision} from './phase4d-fixture.ts';
import {createSociety,saveSociety,restoreSociety} from '../../society/engine.ts';
import {prepareHybridStep,finishDecision,replayHybrid} from '../../society/hybrid.ts';
import {deepSwarmPolicy,swarmHybrid,cohortIds} from '../../society/swarm.ts';
const world=()=>{const i=phase4dWorld(50).genesis.input,p=deepSwarmPolicy(50,175);return createSociety({...i,intelligence:{...i.intelligence!,memory:'episodic-topic-v2'},swarm:p,hybrid:swarmHybrid(p)});};
test('deep decisions have stable causal substeps, bounded per-tick slots and distributed fair participation',()=>{
 let w=world();for(let i=0;i<300&&w.tick<80;i++){w=prepareHybridStep(w);if(w.hybrid!.pending)w=finishDecision(w,{decision:fixtureDecision(w.hybrid!.pending),usage:null,error:null});}
 const rs=w.hybrid!.records;assert.equal(w.tick,80);assert.ok(rs.length>64&&rs.length<=175);assert.equal(new Set(rs.map(r=>r.context.actor.id)).size,35);assert.ok(rs.some(r=>r.context.tick>40));assert.ok(rs.some((r,i)=>i&&r.context.tick===rs[i-1].context.tick));
 for(const tick of new Set(rs.map(r=>r.context.tick))){const rows=rs.filter(r=>r.context.tick===tick);assert.ok(rows.length<=6);assert.equal(new Set(rows.map(r=>r.context.actor.id)).size,rows.length);assert.deepEqual(rows.map(r=>r.context.opportunity?.substep),rows.map((_,i)=>i));}
 for(const id of cohortIds(w))assert.ok(rs.filter(r=>r.context.actor.id===id).length<=16);
 assert.deepEqual(replayHybrid(w.genesis.input,w.tick,rs,null),w);assert.deepEqual(restoreSociety(saveSociety(w)),w);
});
test('an unchanged trigger cannot immediately reactivate an inactive agent',()=>{
 let w=world();w=prepareHybridStep(w);const c=w.hybrid!.pending!;const d=fixtureDecision(c);w=finishDecision(w,{decision:d,usage:null,error:null});w=prepareHybridStep(w);assert.notEqual(w.hybrid?.pending?.actor.id,c.actor.id);
});
test('a quiet society does not exhaust deep capacity with repeated inactive reviews of old feed items',()=>{
 const input=world().genesis.input,p=deepSwarmPolicy(50);let w=createSociety({...input,swarm:p,hybrid:swarmHybrid(p)});
 for(let i=0;i<500&&w.tick<80;i++){w=prepareHybridStep(w);if(w.hybrid!.pending)w=finishDecision(w,{decision:fixtureDecision(w.hybrid!.pending),usage:null,error:null});}
 assert.equal(w.tick,80);assert.ok(w.hybrid!.records.length<175,'Inactivity requires a fresh trigger rather than recycling old feed demand');assert.deepEqual(replayHybrid(w.genesis.input,w.tick,w.hybrid!.records,null),w);
});
