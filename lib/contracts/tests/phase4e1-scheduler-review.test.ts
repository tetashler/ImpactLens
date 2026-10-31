import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {phase4dWorld} from './phase4d-fixture.ts';
import {act,createSociety,stepSociety,visibleFeed} from '../../society/engine.ts';
import {deepSwarmPolicy,swarmHybrid,cohortIds} from '../../society/swarm.ts';
import {deepOpportunity} from '../../society/deep-scheduler.ts';
import {applyIssue} from '../../society/episodic.ts';
import {buildDecisionContext,prepareHybridStep,finishDecision,replayHybrid} from '../../society/hybrid.ts';
import {fixtureDecision} from './phase4d-fixture.ts';

function world(){const input=phase4dWorld(50).genesis.input,p=deepSwarmPolicy(50);return createSociety({...input,communication:{...input.communication!,channels:input.communication!.channels.filter(c=>c.style!=='private-group')},intelligence:{...input.intelligence!,memory:'episodic-topic-v2'},swarm:p,hybrid:swarmHybrid(p)});}
const advance=(w:ReturnType<typeof world>)=>{while(w.tick<8)w=stepSociety(w);return w;};
const allRoots=(w:ReturnType<typeof world>,_actor:string,p:string)=>w.items.filter(i=>i.platform===p&&!i.parentId);

test('identical same-author content in one thread does not become fresh demand merely by replying to a new parent',()=>{
 let w=world();const [a,b]=cohortIds(w),platform=w.genesis.input.communication!.channels[0].id;
 w=act(w,{actorId:a,type:'post',platform,text:'A legitimate fictional question about safeguards.'});const root=w.items.at(-1)!;
 w=act(w,{actorId:b,type:'read',platform,targetId:root.id});w=act(w,{actorId:b,type:'comment',platform,targetId:root.id,text:'The same wage concern remains.'});const first=w.items.at(-1)!;
 w=act(w,{actorId:a,type:'read',platform,targetId:first.id});w=act(w,{actorId:a,type:'reply',platform,targetId:first.id,text:'Please explain the staffing condition.'});const parent=w.items.at(-1)!;
 w=act(w,{actorId:b,type:'read',platform,targetId:parent.id});w=act(w,{actorId:b,type:'reply',platform,targetId:parent.id,text:'The same wage concern remains.'});const duplicate=w.items.at(-1)!;
 w=advance(w);const offered=deepOpportunity(w,allRoots);assert.ok(offered);assert.notEqual(offered.targetId,duplicate.id);assert.equal(offered.targetId,first.id);
});

test('old public items excluded from the supplied feed do not suppress bounded proactive initiation',()=>{
 const w=advance(world());const opportunity=deepOpportunity(w,()=>[]);
 assert.ok(opportunity);assert.equal(opportunity.targetId,undefined);
});

test('a ninth legitimate open issue retains scheduler priority beyond the eight-entry active index',()=>{
 let w=world();const [a,b]=cohortIds(w),platform=w.genesis.input.communication!.channels[0].id,topics=w.genesis.input.communication!.topics;
 assert.ok(topics.length>=2);
 for(let i=0;i<9;i++){w=act(w,{actorId:a,type:'post',platform,text:'Recorded fictional condition '+i});w=applyIssue(w,a,{kind:'condition',topicId:topics[i<8?0:1].id,issueId:null},w.items.at(-1)!.id);}
 w=act(w,{actorId:b,type:'post',platform,text:'An unrelated new discussion.'});const unrelated=w.items.at(-1)!;
 w=act(w,{actorId:b,type:'post',platform,text:'A later development addressing the ninth condition.'});const relevant=w.items.at(-1)!;
 w={...w,events:w.events.map(e=>e.id===relevant.id?{...e,discussion:{topicIds:[topics[1].id],argument:'unspecified' as const}}:e)};
 w=advance(w);assert.equal(w.agents.find(x=>x.id===a)!.issues!.length,8);assert.equal(w.agents.find(x=>x.id===a)!.issueHistory!.length,9);
 const offered=deepOpportunity(w,allRoots);assert.equal(offered?.actorId,a);assert.equal(offered?.targetId,relevant.id);assert.notEqual(offered?.targetId,unrelated.id);
});

test('a legitimate same-tick read of a subsequently withdrawn source does not relabel a proactive opportunity',()=>{
 const base=world().genesis.input,channel=base.communication!.channels.find(c=>c.style==='public-discussion')!;
 let w=createSociety({...base,communication:{...base.communication!,channels:[channel]}});
 const [actor,author]=cohortIds(w),source=w.items.find(i=>i.actorId===author)!;
 for(const item of [...w.items])if(item.id!==source.id)w=act(w,{actorId:item.actorId,type:'moderate',platform:channel.id,targetId:item.id});
 w=advance(w);w=act(w,{actorId:actor,type:'read',platform:channel.id,targetId:source.id});
 const legitimateRead=w.events.at(-1)!;assert.equal(legitimateRead.tick,w.tick);
 w=act(w,{actorId:author,type:'moderate',platform:channel.id,targetId:source.id});
 const selected=deepOpportunity(w,visibleFeed);assert.equal(selected?.actorId,actor);assert.equal(selected?.targetId,undefined);
 const context=buildDecisionContext(w,actor,channel.id);
 assert.equal(context.opportunity?.kind,'proactive-window');assert.equal(context.opportunity?.sourceEventId,null);assert.equal(context.items.some(i=>i.id===source.id),false);
 const offered=prepareHybridStep(w);assert.equal(offered.hybrid!.pending!.opportunity!.kind,'proactive-window');
 const accepted=finishDecision(offered,{decision:fixtureDecision(offered.hybrid!.pending!),usage:null,error:null});
 assert.equal(accepted.hybrid!.records.at(-1)!.context.opportunity!.kind,'proactive-window');assert.ok(accepted.events.some(e=>e.id===legitimateRead.id));
});

test('an actual deep preparation read binds its own ordinal without changing rule provenance or replay',()=>{
 const offered=prepareHybridStep(world()),context=offered.hybrid!.pending!,read=offered.events.at(-1)!;
 assert.equal(read.type,'read');assert.equal(read.decisionId,context.id);assert.equal(read.source,'deterministic-rule');assert.equal(context.opportunity!.sourceEventId,read.targetId);assert.notEqual(context.opportunity!.kind,'proactive-window');
 assert.deepEqual(buildDecisionContext(offered,context.actor.id,context.platform),context);
 const accepted=finishDecision(offered,{decision:fixtureDecision(context),usage:null,error:null});
 assert.deepEqual(replayHybrid(accepted.genesis.input,accepted.tick,accepted.hybrid!.records,null),accepted);
});
