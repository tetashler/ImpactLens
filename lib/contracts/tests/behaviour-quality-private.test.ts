import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {act,createSociety,restoreSociety,saveSociety,stepSociety,visibleFeed} from '../../society/engine.ts';
import {buildDecisionContext,finishDecision,prepareHybridStep,replayHybrid,replayHybridFrom} from '../../society/hybrid.ts';
import {privateDiscussionInbox} from '../../society/deep-context.ts';
import {deepOpportunity} from '../../society/deep-scheduler.ts';
import {canAccessItem} from '../../society/communication.ts';
import {QUALITY_POLICY,TOPIC_POLICY} from '../../society/intelligence.ts';
import {decodeMenuDecision} from '../../society/decision-menu.ts';
import {cohortIds,multiDaySwarmPolicy,swarmHybrid} from '../../society/swarm.ts';
import {phase4dWorld,fixtureDecision} from './phase4d-fixture.ts';
import type {SocietyWorld} from '../../society/contract.ts';
import type {DecisionContext} from '../../society/decision-contract.ts';

function world(quality=true){
 const input=phase4dWorld(50).genesis.input,p=multiDaySwarmPolicy();
 return createSociety({...input,acceptedActions:[],communication:{...input.communication!,channels:input.communication!.channels.filter(c=>c.style==='private-group')},intelligence:quality?QUALITY_POLICY:TOPIC_POLICY,swarm:p,hybrid:swarmHybrid(p),config:{agents:50,activation:0,steps:320}});
}
function at(w:SocietyWorld,tick:number){while(w.tick<tick)w=stepSociety(w);return w;}
function decisionFixture(c:DecisionContext,action='inactive',targetId?:string,text='A fixture response addressing the supplied safeguard.'){
 if(c.policy!=='conversation-menu-v3')return fixtureDecision(c,action,targetId,text);
 const option=c.menu!.find(m=>m.action===action&&(targetId===undefined||m.targetKind==='item'&&c.items[m.targetIndex!].id===targetId));
 assert.ok(option,'The fixture must select an offered action');
 return decodeMenuDecision({choiceId:option.id,text:['message','group-reply'].includes(action)?text:null,motivation:'Respond to the actual fixture opportunity.',recallIds:[],stanceId:'keep',discussion:{topicIds:[],argument:'unspecified'},issueChoiceId:null},c);
}
function modelMessage(w:SocietyWorld,authorId:string,groupId:string,text:string){
 const platform=w.groups!.find(g=>g.id===groupId)!.platform,c=buildDecisionContext(w,authorId,platform);
 const option=c.menu!.find(m=>m.action==='message'&&c.communication!.groups[m.groupIndex!].id===groupId)!;
 assert.ok(option,'The fixture must use an offered message destination');
 const base=decisionFixture(c,'message',undefined,text),decision={...base,groupId,selection:{...base.selection!,choiceId:option.id},discussion:{topicIds:[],argument:'question' as const}};
 return finishDecision({...w,hybrid:{...w.hybrid!,pending:c}},{decision,usage:null,error:null});
}
const same='A fixture question about the current service safeguard.';

test('quality private novelty never lets another inaccessible group suppress an accessible question',()=>{
 let w=world();const groupA=w.groups![0],author=w.agents[0].id,recipient=cohortIds(w).find(id=>!groupA.members.some(m=>m.agentId===id))!;
 w=act(w,{actorId:author,type:'message',platform:groupA.platform,groupId:groupA.id,text:same});const inaccessible=w.items.at(-1)!;
 w=act(w,{actorId:author,type:'group-create',platform:groupA.platform,memberIds:[recipient]});const groupB=w.groups!.at(-1)!;
 w=modelMessage(at(w,8),author,groupB.id,same);const fresh=w.items.at(-1)!;
 assert.equal(canAccessItem(w,recipient,inaccessible),false);
 assert.equal(canAccessItem(w,recipient,fresh),true);
 assert.ok(privateDiscussionInbox(w,recipient,groupA.platform).some(i=>i.id===fresh.id));
 assert.equal(deepOpportunity(w,visibleFeed)?.targetId,fresh.id,'The scheduler must not independently veto the corrected inbox');
 assert.equal(deepOpportunity(w,visibleFeed)?.actorId,recipient);
});

test('quality independently discovers authorized groups while suppressing repeated roots within one group',()=>{
 let w=world();const groupA=w.groups![0],[author,recipient]=w.agents;
 w=act(w,{actorId:author.id,type:'message',platform:groupA.platform,groupId:groupA.id,text:same});const first=w.items.at(-1)!;
 w=act(w,{actorId:author.id,type:'group-create',platform:groupA.platform,memberIds:[recipient.id]});const groupB=w.groups!.at(-1)!;
 w=act(w,{actorId:author.id,type:'message',platform:groupB.platform,groupId:groupB.id,text:same});const separate=w.items.at(-1)!;
 w=act(w,{actorId:author.id,type:'message',platform:groupB.platform,groupId:groupB.id,text:same});const repeated=w.items.at(-1)!;
 const inbox=privateDiscussionInbox(w,recipient.id,groupA.platform);
 assert.ok(inbox.some(i=>i.id===first.id));assert.ok(inbox.some(i=>i.id===separate.id));
 assert.ok(!inbox.some(i=>i.id===repeated.id));assert.ok(inbox.length<=16);
});

for(const previouslyRead of [false,true])test('quality private novelty starts at the current joining epoch after '+(previouslyRead?'rejoin':'join'),()=>{
 let w=world();const g=w.groups![0],[author,recipient]=w.agents;
 if(!previouslyRead)w=act(w,{actorId:recipient.id,type:'group-leave',platform:g.platform,targetId:g.id});
 w=act(w,{actorId:author.id,type:'message',platform:g.platform,groupId:g.id,text:same});const old=w.items.at(-1)!;
 if(previouslyRead){w=act(w,{actorId:recipient.id,type:'read',platform:g.platform,targetId:old.id});w=act(w,{actorId:recipient.id,type:'group-leave',platform:g.platform,targetId:g.id});}
 w=act(w,{actorId:author.id,type:'group-invite',platform:g.platform,targetId:g.id,memberIds:[recipient.id]});
 w=act(w,{actorId:recipient.id,type:'group-join',platform:g.platform,targetId:g.id});
 w=modelMessage(at(w,8),author.id,g.id,same);const fresh=w.items.at(-1)!;
 assert.equal(canAccessItem(w,recipient.id,old),false);
 assert.ok(privateDiscussionInbox(w,recipient.id,g.platform).some(i=>i.id===fresh.id));
 const selected=deepOpportunity(w,visibleFeed);assert.equal(selected?.actorId,recipient.id);assert.equal(selected?.targetId,fresh.id);
 assert.throws(()=>act(w,{actorId:recipient.id,type:'read',platform:g.platform,targetId:old.id}));
 assert.throws(()=>act(w,{actorId:recipient.id,type:'group-reply',platform:g.platform,targetId:fresh.id,text:'A fixture response without a new read.'}));
 w=act(w,{actorId:recipient.id,type:'read',platform:g.platform,targetId:fresh.id});
 const context=buildDecisionContext(w,recipient.id,g.platform);
 assert.ok(context.items.some(i=>i.id===fresh.id));assert.ok(!context.items.some(i=>i.id===old.id));
 assert.doesNotThrow(()=>decisionFixture(context,'group-reply',fresh.id));
});

test('historical private novelty preserves its existing pre-join duplicate suppression',()=>{
 let w=world(false);const g=w.groups![0],[author,recipient]=w.agents;
 w=act(w,{actorId:recipient.id,type:'group-leave',platform:g.platform,targetId:g.id});
 w=act(w,{actorId:author.id,type:'message',platform:g.platform,groupId:g.id,text:same});
 w=act(w,{actorId:author.id,type:'group-invite',platform:g.platform,targetId:g.id,memberIds:[recipient.id]});
 w=act(w,{actorId:recipient.id,type:'group-join',platform:g.platform,targetId:g.id});
 w=act(w,{actorId:author.id,type:'message',platform:g.platform,groupId:g.id,text:same});const fresh=w.items.at(-1)!;
 assert.ok(!privateDiscussionInbox(w,recipient.id,g.platform).some(i=>i.id===fresh.id));
});

test('quality private discovery applies actual thread-burst eligibility before its sixteen-item bound',()=>{
 let w=world();const g=w.groups![0],[recipient,author]=w.agents;
 w=act(w,{actorId:author.id,type:'message',platform:g.platform,groupId:g.id,text:'A separate quiet-thread fixture question.'});const quiet=w.items.at(-1)!;
 w=act(w,{actorId:recipient.id,type:'message',platform:g.platform,groupId:g.id,text:'The active-thread fixture root.'});const root=w.items.at(-1)!;
 w=act(w,{actorId:author.id,type:'read',platform:g.platform,targetId:root.id});
 for(let n=0;n<16;n++)w=act(w,{actorId:author.id,type:'group-reply',platform:g.platform,targetId:root.id,text:'A distinct active-thread fixture answer '+n+'.'});
 const direct=w.items.at(-1)!;w=at(w,8);
 for(const actor of w.agents.slice(1,5)){
  w=act(w,{actorId:actor.id,type:'read',platform:g.platform,targetId:direct.id});
  const context=buildDecisionContext(w,actor.id,g.platform);
  w=finishDecision({...w,hybrid:{...w.hybrid!,pending:context}},{decision:decisionFixture(context),usage:null,error:null});
 }
 assert.equal(w.hybrid!.records.filter(r=>r.context.tick===8&&r.context.opportunity?.sourceEventId===direct.id).length,4);
 assert.ok(!privateDiscussionInbox(w,recipient.id,g.platform).some(i=>i.id===quiet.id),'The ordinary bounded inbox is saturated by direct targets');
 const selected=deepOpportunity(w,visibleFeed);
 assert.equal(selected?.actorId,recipient.id);assert.equal(selected?.targetId,quiet.id,'Burst-exhausted targets must not hide another legal thread');
 const base=w,offered=prepareHybridStep(w),context=offered.hybrid!.pending!;
 assert.equal(context.opportunity?.sourceEventId,quiet.id);assert.equal(offered.events.at(-1)!.type,'read');assert.equal(offered.events.at(-1)!.targetId,quiet.id);
 assert.ok(context.items.some(i=>i.id===quiet.id));assert.doesNotThrow(()=>decisionFixture(context,'group-reply',quiet.id));
 const accepted=finishDecision(offered,{decision:decisionFixture(context),usage:null,error:null});
 assert.equal(accepted.items.length,base.items.length,'The selected agent can still choose inactivity');
 assert.deepEqual(replayHybridFrom(base,accepted.tick,accepted.hybrid!.records,null),accepted);
});

test('quality empty groups and outsiders acquire no invented messages or private history',()=>{
 let w=world();const g=w.groups![0],creator=g.creatorId,outsider=cohortIds(w).find(id=>!g.members.some(m=>m.agentId===id))!;
 const before=w.items.length;
 w=act(w,{actorId:creator,type:'group-create',platform:g.platform,memberIds:[w.agents[1].id]});const empty=w.groups!.at(-1)!;
 assert.equal(w.items.length,before);assert.equal(w.items.filter(i=>i.groupId===empty.id).length,0);
 assert.deepEqual(privateDiscussionInbox(w,outsider,g.platform),[]);
 assert.ok(!buildDecisionContext(w,outsider,g.platform).items.some(i=>i.groupId));
 assert.throws(()=>act(w,{actorId:outsider,type:'read',platform:g.platform,targetId:w.items[0].id}));
});

for(const quality of [false,true])test((quality?'quality':'historical')+' ordinary private inactivity remains bounded and exactly replayable',()=>{
 let w=world(quality);
 for(let n=0;n<24;n++){
  w=prepareHybridStep(w);if(w.hybrid!.pending)w=finishDecision(w,{decision:decisionFixture(w.hybrid!.pending),usage:null,error:null});
 }
 assert.ok(w.hybrid!.records.length>0);
 assert.ok(w.hybrid!.records.every(r=>r.decision?.action==='inactive'));
 assert.equal(w.items.length,1,'Optional inactivity must not synthesize a conversation');
 assert.deepEqual(replayHybrid(w.genesis.input,w.tick,w.hybrid!.records,w.hybrid!.pending),w);
 assert.deepEqual(restoreSociety(saveSociety(w)),w);
});
