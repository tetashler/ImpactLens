import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {deepSwarmPolicy,swarmPolicy,swarmHybrid,validateSwarm} from '../../society/swarm.ts';
import {deepLimits} from '../../society/deep-policy.ts';
import {phase4dWorld} from './phase4d-fixture.ts';
import {createSociety} from '../../society/engine.ts';
test('deep capacities freeze explicit new policies without changing quick profiles',()=>{
 for(const [active,capable,capacity,slots]of [[50,35,350,6],[100,70,700,12]] as const){const p=deepSwarmPolicy(active);validateSwarm(p);assert.equal(p.modelAgents,capable);assert.equal(p.maxPerAgent,16);assert.equal(p.decisionsPerTick,slots);assert.equal(swarmHybrid(p).maxCalls,capacity);assert.equal(p.deep?.policy,'deep-swarm-v1');assert.ok(Object.isFrozen(p.deep));}
 assert.equal(swarmHybrid(swarmPolicy(50)).maxCalls,64);assert.equal(swarmHybrid(swarmPolicy(100)).maxCalls,128);assert.equal(swarmPolicy().maxPerAgent,4);
});
test('deep input admits only policy-scoped capacity and bounded resource ceilings',()=>{
 const original=phase4dWorld(50).genesis.input,p=deepSwarmPolicy(50,175),input={...original,swarm:p,hybrid:swarmHybrid(p),intelligence:{...original.intelligence!,memory:'episodic-topic-v2' as const}};
 const w=createSociety(input);assert.equal(w.genesis.input.hybrid!.maxCalls,175);assert.equal(deepLimits(w).decisions,175);
 assert.throws(()=>createSociety({...input,hybrid:{...input.hybrid,maxCalls:351}}));
 assert.throws(()=>validateSwarm({...p,decisionsPerTick:7}));assert.throws(()=>deepSwarmPolicy(50,700));
 assert.throws(()=>validateSwarm({...swarmPolicy(50),maxPerAgent:16}));
});
