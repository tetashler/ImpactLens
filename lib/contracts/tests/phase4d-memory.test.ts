import test from 'node:test';import assert from 'node:assert/strict';
import {act,saveSociety,restoreSociety} from '../../society/engine.ts';
import {buildDecisionContext,prepareHybridStep,finishDecision,parseSocialDecision} from '../../society/hybrid.ts';
import {decodeMenuDecision,encodeMenuContext} from '../../society/decision-menu.ts';
import {phase4dWorld,fixtureDecision} from './phase4d-fixture.ts';

test('an important experienced seed survives short-memory eviction in a bounded episodic index',()=>{
 let w=phase4dWorld();const [a,b]=w.agents,seed=w.items.find(i=>i.actorId===b.id)!;
 w=act(w,{actorId:a.id,type:'read',platform:seed.platform,targetId:seed.id});const original=w.events.at(-1)!.id;
 for(let i=0;i<40;i++){w={...w,tick:i+1};w=act(w,{actorId:b.id,type:'post',platform:seed.platform,text:'Unrelated routine activity '+i});w=act(w,{actorId:a.id,type:'read',platform:seed.platform,targetId:w.items.at(-1)!.id});}
 assert.ok(!w.agents[0].memory.some(m=>m.eventId===original));const episodes=(w.agents[0] as any).episodic;assert.ok(episodes?.some((m:any)=>m.eventId===original));assert.ok(episodes.length<=32);
 const c=buildDecisionContext(w,a.id,seed.platform);assert.ok(c.memories.some(m=>m.eventId===original));assert.ok(c.items.some(i=>i.id===seed.id));assert.ok(Buffer.byteLength(JSON.stringify(c))<=24000);
 const decision=fixtureDecision(c,'comment',seed.id);parseSocialDecision(decision,c);assert.doesNotThrow(()=>act(w,{actorId:a.id,type:'comment',platform:seed.platform,targetId:seed.id,text:decision.text!}));
});
test('episodic references remain stored but cannot reveal messages after leaving or rejoining a group',()=>{
 let w=phase4dWorld();const group=w.groups![0],[a,b]=w.agents;w=act(w,{actorId:b.id,type:'message',platform:group.platform,groupId:group.id,text:'RAW_EPISODIC_PRIVATE_SENTINEL'});const item=w.items.at(-1)!;
 w=act(w,{actorId:a.id,type:'read',platform:group.platform,targetId:item.id});assert.ok((w.agents[0] as any).episodic?.some((m:any)=>m.exposedIds.includes(item.id)));
 w=act(w,{actorId:a.id,type:'group-leave',platform:group.platform,targetId:group.id});assert.ok(!JSON.stringify(buildDecisionContext(w,a.id,'reddit')).includes('RAW_EPISODIC_PRIVATE_SENTINEL'));
 // The creator must still be a member to invite: use another initial member leaving instead.
 let v=phase4dWorld();const g=v.groups![0],member=v.agents[1];v=act(v,{actorId:v.agents[0].id,type:'message',platform:g.platform,groupId:g.id,text:'RAW_OLD_JOIN_HISTORY'});const old=v.items.at(-1)!;
 v=act(v,{actorId:member.id,type:'read',platform:g.platform,targetId:old.id});v=act(v,{actorId:member.id,type:'group-leave',platform:g.platform,targetId:g.id});v=act(v,{actorId:g.creatorId,type:'group-invite',platform:g.platform,targetId:g.id,memberIds:[member.id]});v=act(v,{actorId:member.id,type:'group-join',platform:g.platform,targetId:g.id});assert.ok(!JSON.stringify(buildDecisionContext(v,member.id,'reddit')).includes('RAW_OLD_JOIN_HISTORY'));
});
test('an explicitly classified authored commitment is retained and cannot be resolved by an unrelated actor',()=>{
 let w=phase4dWorld();while(!w.hybrid!.pending)w=prepareHybridStep(w);const c=w.hybrid!.pending!,option=c.menu!.find(m=>m.action==='post')!;
 const wire={choiceId:option.id,text:'I will review the proposed service roster before supporting this trial.',motivation:'Keep the explicitly stated review commitment.',recallIds:[],stanceId:'keep',discussion:{topicIds:['topic-1'],argument:'condition'},issueUpdate:{kind:'commitment',topicId:'topic-1',issueId:null}};
 const d=decodeMenuDecision(wire,c);parseSocialDecision(d,c);w=finishDecision(w,{decision:d,usage:null,error:null});const a=w.agents.find(a=>a.id===c.actor.id)!;assert.equal((a as any).issues?.[0].kind,'commitment');assert.equal((a as any).issues[0].status,'open');
 assert.deepEqual(restoreSociety(saveSociety(w)),w);
 const encoded=JSON.parse(encodeMenuContext(buildDecisionContext(w,c.actor.id,c.platform))),issue=encoded.issues[0];assert.ok(encoded.items.some((i:any)=>i.id===issue.sourceItem));assert.ok(issue.memoryRefs.length>0);assert.ok(issue.memoryRefs.every((ref:string)=>encoded.memories.some((m:any)=>m.ref===ref&&m.items.includes(issue.sourceItem))));
 const other=buildDecisionContext(w,w.agents.find(a=>a.id!==c.actor.id)!.id,c.platform);assert.throws(()=>decodeMenuDecision({...wire,issueUpdate:{kind:'resolve',topicId:'topic-1',issueId:(a as any).issues[0].id}},other));
});
test('a concern is not silently promoted to a commitment',()=>{
 let w=phase4dWorld();while(!w.hybrid!.pending)w=prepareHybridStep(w);const c=w.hybrid!.pending!,d=fixtureDecision(c,'post');w=finishDecision(w,{decision:d,usage:null,error:null});assert.ok(!(w.agents.find(a=>a.id===c.actor.id) as any).issues?.some((i:any)=>i.kind==='commitment'));
});
test('an author can explicitly resolve an actually recalled condition and replay the lifecycle',()=>{
 let w=phase4dWorld(),owner:string|null=null,resolved=false;
 for(let t=0;t<80;t++){w=prepareHybridStep(w);const c=w.hybrid!.pending;if(!c)continue;let d=fixtureDecision(c);
  if(owner===null||c.actor.id===owner&&!resolved){const option=c.menu!.find(m=>m.action==='post');if(option){const issue=c.issues?.find(i=>i.kind==='condition'&&i.status==='open');const recall=issue?c.memories.findIndex(m=>m.itemIds.includes(issue.sourceEventId)):-1;
   d=decodeMenuDecision({choiceId:option.id,text:issue?'I now mark my earlier service-roster condition resolved within this fictional exercise.':'My support is conditional on reviewing the service roster.',motivation:'Record an explicit condition lifecycle, not an inferred outcome.',recallIds:recall>=0?['memory-'+(recall+1)]:[],stanceId:'keep',discussion:{topicIds:['topic-1'],argument:'condition'},issueUpdate:issue?{kind:'resolve',topicId:'topic-1',issueId:issue.id}:{kind:'condition',topicId:'topic-1',issueId:null}},c);
   if(issue)resolved=true;else owner=c.actor.id;
  }}
  w=finishDecision(w,{decision:d,usage:null,error:null});
 }
 assert.ok(resolved);const issue=w.agents.find(a=>a.id===owner)!.issues![0];assert.equal(issue.status,'resolved');assert.ok(w.events.some(e=>e.id===issue.changedEventId&&e.source==='social-model'));assert.deepEqual(restoreSociety(saveSociety(w)),w);
});
