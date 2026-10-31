import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSociety,act} from '../../society/engine.ts';
import {buildDecisionContext} from '../../society/hybrid.ts';
import {encodeMenuContext} from '../../society/decision-menu.ts';
import {QUALITY_POLICY} from '../../society/intelligence.ts';
import {multiDaySwarmPolicy,swarmHybrid} from '../../society/swarm.ts';
import {phase4dWorld} from './phase4d-fixture.ts';
import {canonical} from '../../experiments/validation.ts';

test('quality wire metadata fits24KB without truncating mandatory multibyte source',()=>{
 const p=multiDaySwarmPolicy();let w=createSociety({...phase4dWorld().genesis.input,swarm:p,hybrid:swarmHybrid(p),intelligence:QUALITY_POLICY,config:{agents:50,activation:0,steps:320}});
 const [reader,author]=w.agents;
 w=act(w,{actorId:reader.id,type:'follow',platform:'reddit',targetId:author.id});
 for(let n=0;n<8;n++){w=act({...w,tick:n+1},{actorId:author.id,type:'post',platform:'reddit',text:'界'.repeat(940)+` Recorded source ${n}.`});w=act(w,{actorId:reader.id,type:'read',platform:'reddit',targetId:w.items.at(-1)!.id});}
 const source=w.items.at(-1)!,c=buildDecisionContext(w,reader.id,'reddit');
 assert.equal(c.policy,'conversation-menu-v3');assert.equal(c.items.find(i=>i.id===source.id)!.text,source.text);
 assert.ok(Buffer.byteLength(canonical(c))<=24000);assert.ok(Buffer.byteLength(encodeMenuContext(c))<=24000);
 assert.ok(c.memories.length<=6&&c.items.length<=8);assert.ok(c.menu!.some(m=>m.action==='inactive'));
});

test('public opportunity exposes permitted private group creation without hidden group history',()=>{
 const p=multiDaySwarmPolicy();const w=createSociety({...phase4dWorld().genesis.input,swarm:p,hybrid:swarmHybrid(p),intelligence:QUALITY_POLICY,config:{agents:50,activation:0,steps:320}});
 const outsider=w.agents.find(a=>!w.groups?.some(g=>g.members.some(m=>m.agentId===a.id&&m.leftSequence===null)))!;
 const c=buildDecisionContext(w,outsider.id,'reddit');
 assert.ok(c.menu!.some(m=>m.action==='group-create'));assert.equal(c.items.some(i=>i.groupId),false);
});
