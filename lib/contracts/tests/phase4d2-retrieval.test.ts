import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {createSociety,act,saveSociety,restoreSociety} from '../../society/engine.ts';
import {buildDecisionContext,prepareHybridStep,finishDecision} from '../../society/hybrid.ts';
import {canonical} from '../../experiments/validation.ts';import {createHash} from 'node:crypto';
import {buildMemoryStressFixture} from '../../../scripts/testing/phase4d1-memory-fixture.ts';
import {buildTopicMemoryFixtures,topicMemoryPolicyArm,scoreTopicMemoryFixture} from '../../../scripts/testing/phase4d2-memory-fixture.ts';
import {BALANCED_POLICY,type IntelligencePolicy} from '../../society/intelligence.ts';
import {phase4dWorld,fixtureDecision} from './phase4d-fixture.ts';

test('the topic policy is accepted as a separate frozen input while the existing balanced bundle stays episodic-v1',()=>{
 const input=structuredClone(phase4dWorld().genesis.input);
 input.intelligence={...BALANCED_POLICY,memory:'episodic-topic-v2'} as IntelligencePolicy;
 assert.doesNotThrow(()=>createSociety(input));
 const next=createSociety(input);assert.equal(next.genesis.input.intelligence!.memory,'episodic-topic-v2');assert.equal(BALANCED_POLICY.memory,'episodic-v1');
 assert.throws(()=>createSociety({...input,intelligence:{...input.intelligence!,memory:'episodic-unknown'} as unknown as IntelligencePolicy}));
});
test('v2 diagnostics explain contributions without changing returned context or mutating the world',()=>{
 const f=buildTopicMemoryFixtures().find(f=>f.id==='canonical-topic')!,arm=topicMemoryPolicyArm(f,'episodic-topic-v2'),before=canonical(arm.world);let metrics:any;
 const context=buildDecisionContext(arm.world,f.actorId,f.platform,m=>metrics=m);
 assert.equal(canonical(context),canonical(arm.context));assert.equal(canonical(arm.world),before);assert.equal(metrics.policy,'episodic-topic-v2');
 const old=metrics.topicSelection.scores.find((s:any)=>s.eventId===f.earlierReadEventIds[0]);assert.ok(old.topic>0&&old.counterparty>0&&old.importance>0&&old.recency>0);assert.equal(old.exclusion,'none');
 assert.ok(metrics.episodicOnlyPrimaryItemsIncluded>0);assert.doesNotMatch(JSON.stringify(metrics),/Payroll|take-home|\"text\"|\"goal\"/);
});
test('v2 ordinary scheduler runs freeze their selector and restore exactly without changing the eight opportunities',()=>{
 const input=structuredClone(phase4dWorld().genesis.input);input.intelligence={...BALANCED_POLICY,memory:'episodic-topic-v2'};
 let w=createSociety(input);const ticks:number[]=[];for(let i=0;i<80;i++){w=prepareHybridStep(w);if(w.hybrid?.pending){ticks.push(w.tick);w=finishDecision(w,{decision:fixtureDecision(w.hybrid.pending),usage:null,error:null});}}
 assert.deepEqual(ticks,[2,12,22,32,42,52,62,72]);assert.deepEqual(restoreSociety(saveSociety(w)),w);assert.equal(w.genesis.input.intelligence!.memory,'episodic-topic-v2');
});
test('v2 reports ancestry and item limits rather than returning selected primary references without content',()=>{
 const input=structuredClone(phase4dWorld().genesis.input);input.intelligence={...BALANCED_POLICY,memory:'episodic-topic-v2'};
 let w=createSociety(input);const [a,b]=w.agents;w=act(w,{actorId:b.id,type:'post',platform:'reddit',text:'A fictional evidence question.'});const root=w.items.at(-1)!.id;let id=root;
 for(let n=0;n<9;n++){w=act({...w,tick:n+1},{actorId:b.id,type:n===0?'comment':'reply',platform:'reddit',targetId:id,text:'An encountered evidence question continuation.'});id=w.items.at(-1)!.id;w=act(w,{actorId:a.id,type:'read',platform:'reddit',targetId:id});}
 let metrics:any;const c=buildDecisionContext(w,a.id,'reddit',m=>metrics=m);assert.ok(metrics.topicSelection.itemLimitRejected>0);assert.ok(c.items.length<=8&&c.memories.length<=6);assert.ok(c.memories.every(m=>c.items.some(i=>i.id===m.primaryItemId)));
 assert.ok(metrics.entries.some((e:any)=>e.stage==='item-limit'));assert.ok(metrics.rejected['item-filtered']>0);
 w=act(w,{actorId:b.id,type:'moderate',platform:'reddit',targetId:root});buildDecisionContext(w,a.id,'reddit',m=>metrics=m);assert.ok(metrics.topicSelection.ancestryRejected>0);
});
test('memory benchmark recall requires the actual primary content, not a dangling reference',()=>{
 const f=buildTopicMemoryFixtures().find(f=>f.id==='same-wording')!,c=structuredClone(topicMemoryPolicyArm(f,'episodic-v1').context);
 c.items=c.items.filter(i=>!f.earlierItemIds.includes(i.id));assert.equal(scoreTopicMemoryFixture(f,c).recalledRelevantSources,0);
});
test('a byte-limited v2 context fails closed with safe diagnostic evidence before inference',()=>{
 const input=structuredClone(phase4dWorld().genesis.input);input.intelligence={...BALANCED_POLICY,memory:'episodic-topic-v2'};let w=createSociety(input);const [a,b]=w.agents;
 w=act(w,{actorId:b.id,type:'post',platform:'reddit',text:'界'.repeat(980)});let id=w.items.at(-1)!.id;
 for(let n=0;n<7;n++){w=act({...w,tick:n+1},{actorId:b.id,type:n===0?'comment':'reply',platform:'reddit',targetId:id,text:'界'.repeat(980)});id=w.items.at(-1)!.id;}
 w=act(w,{actorId:a.id,type:'read',platform:'reddit',targetId:id});let metrics:any;
 assert.throws(()=>buildDecisionContext(w,a.id,'reddit',m=>metrics=m),/SOCIAL_SHAPE/);assert.equal(metrics.contextByteLimitExceeded,true);assert.ok(metrics.contextBytes>24000);assert.ok(!JSON.stringify(metrics).includes('界'));
});
test('coalescing repeated evidence does not fill the freed slots with unrelated encounters',()=>{
 const f=buildTopicMemoryFixtures().find(f=>f.id==='duplicate-source-reads')!;
 const metrics=scoreTopicMemoryFixture(f,topicMemoryPolicyArm(f,'episodic-topic-v2').context);
 assert.equal(metrics.recall,1);assert.equal(metrics.duplicateSourceSelections,0);assert.equal(metrics.irrelevantSourceSelections,0);
});
test('topic-aware recall improves an authorised tagged paraphrase without pretending untagged paraphrases are understood',()=>{
 const fixtures=buildTopicMemoryFixtures(),tagged=fixtures.find(f=>f.id==='canonical-topic')!,untagged=fixtures.find(f=>f.id==='unshared-paraphrase')!;
 assert.equal(scoreTopicMemoryFixture(tagged,topicMemoryPolicyArm(tagged,'episodic-v1').context).recall,0);
 assert.equal(scoreTopicMemoryFixture(tagged,topicMemoryPolicyArm(tagged,'episodic-topic-v2').context).recall,1);
 assert.equal(scoreTopicMemoryFixture(untagged,topicMemoryPolicyArm(untagged,'episodic-topic-v2').context).recall,0);
});
test('repeat encounters with one unchanged source occupy a single v2 context slot',()=>{
 const input=structuredClone(phase4dWorld().genesis.input);input.intelligence={...BALANCED_POLICY,memory:'episodic-topic-v2'};
 let w=createSociety(input);const actor=w.agents[0].id,item=w.items.find(i=>i.actorId!==actor)!;
 for(let tick=1;tick<=10;tick++)w=act({...w,tick},{actorId:actor,type:'read',platform:item.platform,targetId:item.id});
 const c=buildDecisionContext(w,actor,item.platform);assert.equal(c.memories.filter(m=>m.primaryItemId===item.id).length,1);
});
test('the two previous v1 stress contexts retain their exact canonical hashes',()=>{
 for(const [wording,expected] of [['lexical','d3e91155a7bf4ea7161cf6ea18536ac14d8b726a415bdce0bbcffecb661cf5ec'],['paraphrase','a828019479413648c15981c6958646fa4e6f0235f353d134720c1af2f0e30c2e']] as const){const f=buildMemoryStressFixture({wording});assert.equal(createHash('sha256').update(canonical(f.context)).digest('hex'),expected);}
});
test('a nonmember with a matching public topic cannot retrieve hidden group history',()=>{
 const f=buildTopicMemoryFixtures().find(f=>f.id==='private-left-membership')!,arm=topicMemoryPolicyArm(f,'episodic-topic-v2');let w=arm.world;
 const original=w.items.find(i=>i.id===f.earlierItemIds[0])!,g=w.groups!.find(g=>g.id===original.groupId)!,outsider=w.agents.find(a=>!g.members.some(m=>m.agentId===a.id))!;
 assert.ok(outsider);w=act(w,{actorId:outsider.id,type:'follow',platform:'reddit',targetId:f.counterpartyId});w=act(w,{actorId:outsider.id,type:'read',platform:'reddit',targetId:f.targetItemId});
 const c=buildDecisionContext(w,outsider.id,'reddit');assert.ok(c.items.some(i=>i.id===f.targetItemId));assert.ok(!c.items.some(i=>i.id===original.id));assert.throws(()=>act(w,{actorId:outsider.id,type:'read',platform:original.platform,targetId:original.id}));
});
test('an authorised private episode can inform a later public question after short-term eviction',()=>{
 const input=structuredClone(phase4dWorld().genesis.input);input.intelligence={...BALANCED_POLICY,memory:'episodic-topic-v2'};let w=createSociety(input);const [reader,author]=w.agents,g=w.groups![0];
 const c=buildDecisionContext(w,author.id,g.platform),d={...fixtureDecision(c,'message',undefined,'RAW_TOPIC_PRIVATE_CROSS_CHANNEL_SAFEGUARD'),discussion:{topicIds:['topic-1'],argument:'condition' as const}};
 w=finishDecision({...w,hybrid:{...w.hybrid!,pending:c}},{decision:d,usage:null,error:null});const old=w.items.at(-1)!.id;w=act(w,{actorId:reader.id,type:'read',platform:g.platform,targetId:old});const encounter=w.events.at(-1)!.id;
 w=act(w,{actorId:reader.id,type:'follow',platform:'reddit',targetId:author.id});
 for(let n=0;n<14;n++){w=act({...w,tick:n+1},{actorId:author.id,type:'post',platform:'reddit',text:'Unrelated garden catalog entries '+n});w=act(w,{actorId:reader.id,type:'read',platform:'reddit',targetId:w.items.at(-1)!.id});}
 const q=buildDecisionContext(w,author.id,'reddit'),answer={...fixtureDecision(q,'post',undefined,'Which previously recorded requirement matters for this practical decision?'),discussion:{topicIds:['topic-1'],argument:'question' as const}};
 w=finishDecision({...w,hybrid:{...w.hybrid!,pending:q}},{decision:answer,usage:null,error:null});w=act(w,{actorId:reader.id,type:'read',platform:'reddit',targetId:w.items.at(-1)!.id});
 assert.ok(!w.agents.find(a=>a.id===reader.id)!.memory.some(m=>m.eventId===encounter));const result=buildDecisionContext(w,reader.id,'reddit');assert.ok(result.memories.some(m=>m.eventId===encounter&&m.origin==='episodic'));assert.ok(result.items.some(i=>i.id===old));
});
