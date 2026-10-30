import test from 'node:test';import assert from 'node:assert/strict';
import {act,advanceSociety,createSociety,saveSociety,restoreSociety,visibleFeed} from '../../society/engine.ts';
import {attentiveStep} from '../../society/attention.ts';
import {phase4dWorld} from './phase4d-fixture.ts';

test('new policy permits 100 active agents without raising the default or legacy capacity',()=>{
 assert.equal(phase4dWorld().agents.length,24);const w=phase4dWorld(100);assert.equal(w.agents.length,100);assert.equal(w.genesis.input.hybrid!.selectedAgents,4);assert.equal(w.genesis.input.hybrid!.maxCalls,8);assert.throws(()=>phase4dWorld(101));assert.throws(()=>phase4dWorld(100,0,true));
 const input=structuredClone(w.genesis.input);input.intelligence!.episodicEntries=100000;assert.throws(()=>createSociety(input));
});
test('a previously considered high-priority reply does not block another legitimate fresh consideration',()=>{
 let w=phase4dWorld();const [a,b,c]=w.agents,root=w.items.find(i=>i.actorId===a.id&&i.platform==='reddit')!;
 w=act(w,{actorId:b.id,type:'read',platform:'reddit',targetId:root.id});w=act(w,{actorId:b.id,type:'comment',platform:'reddit',targetId:root.id,text:'A direct response about the original condition.'});const old=w.items.at(-1)!;
 w=act(w,{actorId:a.id,type:'read',platform:'reddit',targetId:old.id});w=act(w,{actorId:a.id,type:'opinion',platform:'reddit',targetId:old.id});w=act(w,{actorId:c.id,type:'post',platform:'reddit',text:'A different relevant service-coverage condition.'});const fresh=w.items.at(-1)!;w=act(w,{actorId:a.id,type:'read',platform:'reddit',targetId:fresh.id});
 w={...w,tick:10,agents:w.agents.map(p=>p.id===a.id?{...p,turns:3}:p)};const next=attentiveStep(w,a.id,'reddit',visibleFeed(w,a.id,'reddit'),act);assert.equal(next.events.at(-1)!.type,'opinion');assert.equal(next.events.at(-1)!.targetId,fresh.id);
});
test('unchanged public and private items can be encountered again without repeated influence',()=>{
 for(const privateGroup of [false,true]){
  let w=phase4dWorld();const [a,b]=w.agents,g=w.groups![0],platform=privateGroup?g.platform:'reddit';
  w=act(w,{actorId:b.id,type:privateGroup?'message':'post',platform,...(privateGroup?{groupId:g.id}:{}),text:'A new encountered proposal.',position:-0.8});const item=w.items.at(-1)!;
  w=act(w,{actorId:a.id,type:'read',platform,targetId:item.id});w=act(w,{actorId:a.id,type:'opinion',platform,targetId:item.id});const position=w.agents[0].opinion;
  w=act(w,{actorId:a.id,type:'read',platform,targetId:item.id});w=act(w,{actorId:a.id,type:'opinion',platform,targetId:item.id});assert.equal(w.agents[0].opinion,position);assert.equal(w.events.filter(e=>e.type==='opinion'&&e.targetId===item.id).length,1);
 }
});
test('attention policy reduces authored repetition while preserving recorded reads and inactivity',()=>{
 const source=phase4dWorld(24,0.55).genesis.input;const {hybrid,...input}=source;const modern=advanceSociety(createSociety(input),80);const {intelligence,...legacy}=input;const old=advanceSociety(createSociety(legacy),80);
 const authored=(w:typeof modern)=>w.events.filter(e=>['post','message','reply','comment','group-reply'].includes(e.type));
 const duplicates=(w:typeof modern)=>{const items=authored(w).map(e=>e.actorId+'|'+e.platform+'|'+e.text?.toLowerCase().replace(/\s+/g,' ').trim());return items.length-new Set(items).size;};
 assert.ok(authored(modern).length<authored(old).length);assert.equal(duplicates(modern),0);assert.ok(modern.events.some(e=>e.type==='read'));assert.ok(modern.events.some(e=>e.type==='inactive'));assert.ok(modern.events.length<=8192);assert.deepEqual(restoreSociety(saveSociety(modern)),modern);
});
