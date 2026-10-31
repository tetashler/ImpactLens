import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSociety,act} from '../../society/engine.ts';
import {buildDecisionContext,finishDecision,prepareHybridStep} from '../../society/hybrid.ts';
import {multiDaySwarmPolicy,swarmHybrid} from '../../society/swarm.ts';
import {TOPIC_POLICY} from '../../society/intelligence.ts';
import {applyIssue} from '../../society/episodic.ts';
import {decodeMenuDecision,encodeMenuContext,menuSchema} from '../../society/decision-menu.ts';
import {canonical} from '../../experiments/validation.ts';
import {phase4dWorld,fixtureDecision} from './phase4d-fixture.ts';

export function multiDayMemoryWorld(){const p=multiDaySwarmPolicy();return createSociety({...phase4dWorld().genesis.input,swarm:p,hybrid:swarmHybrid(p),intelligence:TOPIC_POLICY,config:{agents:50,activation:0,steps:320}});}

test('a multi-day menu stops advertising new issues at the lifetime bound while retaining legitimate resolutions',()=>{
 let w=multiDayMemoryWorld();const actor=w.agents[0].id;
 for(let n=0;n<16;n++){w=act(w,{actorId:actor,type:'post',platform:'reddit',text:`Recorded wage condition ${n} awaits an explicit answer.`});w=applyIssue(w,actor,{kind:'condition',topicId:'topic-1',issueId:null},w.events.at(-1)!.id);}
 const c=buildDecisionContext(w,actor,'reddit'),schema=menuSchema(c) as any;
 assert.equal(c.issueCreationAllowed,false);
 assert.deepEqual(schema.properties.issueUpdate.anyOf[1].properties.kind.enum,['resolve','withdraw']);
 const choice=c.menu!.find(m=>m.action==='post')!,issue=c.issues!.find(i=>c.memories.some(m=>m.itemIds.includes(i.sourceEventId)))!;
 assert.ok(issue,'a retained real issue remains available');
 const base={choiceId:choice.id,text:'The recorded condition has now been explicitly answered.',motivation:'Revisit the retained issue.',recallIds:['memory-'+(c.memories.findIndex(m=>m.itemIds.includes(issue.sourceEventId))+1)],stanceId:'keep',discussion:{topicIds:['topic-1'],argument:'condition'}};
 assert.throws(()=>decodeMenuDecision({...base,issueUpdate:{kind:'condition',topicId:'topic-1',issueId:null}},c));
 const decision=decodeMenuDecision({...base,issueUpdate:{kind:'resolve',topicId:'topic-1',issueId:issue.id}},c);
 const next=finishDecision({...w,hybrid:{...w.hybrid!,pending:c}},{decision,usage:null,error:null});
 assert.equal(next.agents[0].issueHistory!.length,16);
 assert.equal(next.agents[0].issueHistory!.find(i=>i.id===issue.id)!.status,'resolved');
 assert.equal(next.agents[0].issueHistory!.filter(i=>i.status==='open').length,15);
});

test('the inference menu receives the real multi-day calendar and bounded availability metadata',()=>{
 const w={...multiDayMemoryWorld(),tick:128},before=canonical(w),c=buildDecisionContext(w,w.agents[0].id,'reddit'),wire=JSON.parse(encodeMenuContext(c));
 assert.equal(wire.calendar.day,2);assert.equal(wire.calendar.hour,16);assert.equal(wire.calendar.minute,0);
 assert.equal(wire.calendar.elapsedMinutes,1920);assert.equal(wire.calendar.timeZone,'Asia/Singapore');
 assert.equal(wire.calendar.policy,'multi-day-swarm-v1');assert.equal(wire.calendar.pacingTarget,350);
 assert.equal(typeof wire.calendar.availability.available,'boolean');
 assert.match(wire.calendar.assumption,/fictional/i);
 assert.ok(Buffer.byteLength(canonical(c))<=24000&&Buffer.byteLength(encodeMenuContext(c))<=24000);
 assert.ok(c.items.length<=8&&c.memories.length<=6);assert.equal(canonical(w),before);
 const legacy=buildDecisionContext(phase4dWorld(),phase4dWorld().agents[0].id,'reddit');
 assert.equal(legacy.calendar,undefined);assert.equal(legacy.issueCreationAllowed,undefined);
 assert.ok(!Object.hasOwn(JSON.parse(encodeMenuContext(legacy)),'calendar'));
});

test('an authorised condition survives a day gap in episodic memory after short-term eviction and a novel counterparty revisits its topic',()=>{
 let w=multiDayMemoryWorld();const [reader,author,novel]=w.agents;
 const c=buildDecisionContext(w,author.id,'reddit'),raw=fixtureDecision(c,'post',undefined,'RAW_MULTIDAY_OLD wage protection needs an agreed service roster.');
 w=finishDecision({...w,hybrid:{...w.hybrid!,pending:c}},{decision:{...raw,discussion:{topicIds:['topic-1'],argument:'condition'}},usage:null,error:null});
 const old=w.items.at(-1)!.id;w=act(w,{actorId:reader.id,type:'read',platform:'reddit',targetId:old});const encounter=w.events.at(-1)!.id;
 for(let n=0;n<14;n++){w=act({...w,tick:n+1},{actorId:author.id,type:'post',platform:'reddit',text:`Recorded unrelated garden inventory ${n}.`});w=act(w,{actorId:reader.id,type:'read',platform:'reddit',targetId:w.items.at(-1)!.id});}
 w={...w,tick:128};const question=buildDecisionContext(w,novel.id,'reddit'),d=fixtureDecision(question,'post',undefined,'RAW_MULTIDAY_REVISIT Which prior wage safeguard still needs an answer?');
 w=finishDecision({...w,hybrid:{...w.hybrid!,pending:question}},{decision:{...d,discussion:{topicIds:['topic-1'],argument:'question'}},usage:null,error:null});
 w=act(w,{actorId:reader.id,type:'read',platform:'reddit',targetId:w.items.at(-1)!.id});
 const actor=w.agents.find(a=>a.id===reader.id)!,result=buildDecisionContext(w,reader.id,'reddit');
 assert.ok(!actor.memory.some(m=>m.eventId===encounter));assert.ok(actor.episodic!.some(m=>m.eventId===encounter));
 assert.ok(result.memories.some(m=>m.eventId===encounter&&m.origin==='episodic'));
 assert.equal(result.items.find(i=>i.id===old)!.text,'RAW_MULTIDAY_OLD wage protection needs an agreed service roster.');
 assert.ok(actor.memory.length<=12&&actor.episodic!.length<=32&&result.memories.length<=6&&result.items.length<=8);
 assert.ok(Buffer.byteLength(canonical(result))<=24000);
});

test('a multi-day opportunity reserves room for the preparation read, stance and action before offering provider work',()=>{
 let w=multiDayMemoryWorld();const actorId=w.agents.at(-1)!.id;
 while(w.events.length<8190)w=act(w,{actorId,type:'inactive'});
 w={...w,tick:1};const before=w.events.length,result=prepareHybridStep(w);
 assert.equal(result.status,'event-limit');assert.equal(result.hybrid!.pending,null);
 assert.equal(result.events.length,before);assert.equal(result.hybrid!.records.length,0);
});

test('multi-day calendar metadata stays inside the byte bound while preserving the exact multibyte source',()=>{
 let w=multiDayMemoryWorld();const [reader,author]=w.agents;
 w=act(w,{actorId:reader.id,type:'follow',platform:'reddit',targetId:author.id});
 for(let n=0;n<8;n++){w=act({...w,tick:n+1},{actorId:author.id,type:'post',platform:'reddit',text:'界'.repeat(940)+` Recorded wage safeguard ${n}.`});w=act(w,{actorId:reader.id,type:'read',platform:'reddit',targetId:w.items.at(-1)!.id});}
 const target=w.items.at(-1)!,c=buildDecisionContext(w,reader.id,'reddit'),wire=JSON.parse(encodeMenuContext(c));
 assert.equal(c.items.find(i=>i.id===target.id)!.text,target.text);
 assert.ok(c.memories.some(m=>m.kind==='exposure'&&m.primaryItemId===target.id));
 assert.equal(wire.calendar.day,1);assert.equal(wire.calendar.hour,10);
 assert.ok(Buffer.byteLength(canonical(c))<=24000&&Buffer.byteLength(encodeMenuContext(c))<=24000);
 assert.ok(c.items.length<=8&&c.memories.length<=6);
});
