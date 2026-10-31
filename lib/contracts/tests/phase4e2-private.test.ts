import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSociety,act} from '../../society/engine.ts';
import {buildDecisionContext,finishDecision} from '../../society/hybrid.ts';
import {deepSwarmPolicy,multiDaySwarmPolicy,swarmHybrid} from '../../society/swarm.ts';
import {TOPIC_POLICY} from '../../society/intelligence.ts';
import {privateDiscussionInbox} from '../../society/deep-context.ts';
import {canAccessItem} from '../../society/communication.ts';
import {experiencedMemories} from '../../society/episodic.ts';
import {phase4dWorld,fixtureDecision} from './phase4d-fixture.ts';

function privateWorld(modern=true){const p=modern?multiDaySwarmPolicy():deepSwarmPolicy();return createSociety({...phase4dWorld().genesis.input,swarm:p,hybrid:swarmHybrid(p),intelligence:TOPIC_POLICY,config:{agents:50,activation:0,...(modern?{steps:320}:{})}});}

test('a saturated multi-day private inbox filters handled and self-authored items before the sixteen-candidate bound',()=>{
 let w=privateWorld();const [a,b,c]=w.agents,g=w.groups![0];
 w=act(w,{actorId:c.id,type:'message',platform:g.platform,groupId:g.id,text:'RAW_INBOX_NOVEL a separate recorded question.'});const novel=w.items.at(-1)!.id;
 w=act(w,{actorId:a.id,type:'message',platform:g.platform,groupId:g.id,text:'RAW_INBOX_OWN earlier question.'});const root=w.items.at(-1)!.id;
 w=act(w,{actorId:b.id,type:'read',platform:g.platform,targetId:root});
 for(let n=0;n<16;n++){
  w=act({...w,tick:n+1},{actorId:b.id,type:'group-reply',platform:g.platform,targetId:root,text:`RAW_INBOX_HANDLED recorded answer ${n}.`});const target=w.items.at(-1)!.id;
  w=act(w,{actorId:a.id,type:'read',platform:g.platform,targetId:target});const context=buildDecisionContext(w,a.id,g.platform);
  w=finishDecision({...w,hybrid:{...w.hybrid!,pending:context}},{decision:fixtureDecision(context),usage:null,error:null});
 }
 for(let n=0;n<20;n++)w=act(w,{actorId:a.id,type:'message',platform:g.platform,groupId:g.id,text:`RAW_INBOX_SELF recorded self contribution ${n}.`});
 const inbox=privateDiscussionInbox(w,a.id,g.platform);
 assert.ok(inbox.some(i=>i.id===novel));assert.ok(inbox.length<=16);
 assert.ok(inbox.every(i=>i.actorId!==a.id&&!w.hybrid!.records.some(r=>r.context.actor.id===a.id&&r.context.opportunity?.sourceEventId===i.id)));
 const historical={...w,genesis:{...w.genesis,input:{...w.genesis.input,swarm:deepSwarmPolicy()}}};
 assert.ok(!privateDiscussionInbox(historical,a.id,g.platform).some(i=>i.id===novel));
});

test('repeated private sources cannot hide a separate unhandled multi-day question',()=>{
 let w=privateWorld();const [a,b,c]=w.agents,g=w.groups![0];
 w=act(w,{actorId:c.id,type:'message',platform:g.platform,groupId:g.id,text:'RAW_INBOX_DISTINCT a separate issue.'});const novel=w.items.at(-1)!.id;
 w=act(w,{actorId:b.id,type:'message',platform:g.platform,groupId:g.id,text:'RAW_INBOX_REPEATED unchanged source.'});const first=w.items.at(-1)!.id;
 w=act(w,{actorId:a.id,type:'read',platform:g.platform,targetId:first});const context=buildDecisionContext(w,a.id,g.platform);
 w=finishDecision({...w,hybrid:{...w.hybrid!,pending:context}},{decision:fixtureDecision(context),usage:null,error:null});
 for(let n=0;n<20;n++)w=act({...w,tick:n+1},{actorId:b.id,type:'message',platform:g.platform,groupId:g.id,text:'RAW_INBOX_REPEATED unchanged source.'});
 const inbox=privateDiscussionInbox(w,a.id,g.platform);assert.ok(inbox.some(i=>i.id===novel));assert.ok(inbox.every(i=>!i.text.includes('RAW_INBOX_REPEATED')));
});

test('multi-day leave and rejoin preserve current-join ancestry and require a real new read before replying',()=>{
 let w=privateWorld();const [,a,b]=w.agents,g=w.groups![0];
 w=act(w,{actorId:b.id,type:'message',platform:g.platform,groupId:g.id,text:'RAW_PRIVATE_PREJOIN retained earlier private condition.'});const old=w.items.at(-1)!.id;
 w=act(w,{actorId:a.id,type:'read',platform:g.platform,targetId:old});w=act(w,{actorId:a.id,type:'group-leave',platform:g.platform,targetId:g.id});
 w={...w,tick:128};assert.equal(privateDiscussionInbox(w,a.id,g.platform).length,0);
 assert.ok(!experiencedMemories(w,a.id).some(m=>m.exposedIds.includes(old)));
 w=act(w,{actorId:g.creatorId,type:'group-invite',platform:g.platform,targetId:g.id,memberIds:[a.id]});w=act(w,{actorId:a.id,type:'group-join',platform:g.platform,targetId:g.id});
 assert.equal(canAccessItem(w,a.id,w.items.find(i=>i.id===old)!),false);assert.throws(()=>act(w,{actorId:a.id,type:'read',platform:g.platform,targetId:old}));
 w=act(w,{actorId:b.id,type:'message',platform:g.platform,groupId:g.id,text:'RAW_PRIVATE_NEW current joining epoch question.'});const fresh=w.items.at(-1)!.id;
 assert.ok(privateDiscussionInbox(w,a.id,g.platform).some(i=>i.id===fresh));
 assert.throws(()=>act(w,{actorId:a.id,type:'group-reply',platform:g.platform,targetId:fresh,text:'A response without a recorded read.'}));
 w=act(w,{actorId:a.id,type:'read',platform:g.platform,targetId:fresh});const c=buildDecisionContext(w,a.id,g.platform);
 assert.ok(c.items.some(i=>i.id===fresh));assert.ok(!c.items.some(i=>i.id===old));
 assert.doesNotThrow(()=>fixtureDecision(c,'group-reply',fresh));
});
