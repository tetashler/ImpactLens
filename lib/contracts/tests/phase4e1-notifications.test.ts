import '../../../scripts/testing/offline-network.mjs';import test from 'node:test';import assert from 'node:assert/strict';
import {phase4dWorld} from './phase4d-fixture.ts';import {createSociety,act,stepSociety,visibleFeed} from '../../society/engine.ts';import {deepSwarmPolicy,swarmHybrid} from '../../society/swarm.ts';
test('recorded direct notifications permit a real read when a dynamic public thread root ages out of the feed',()=>{
 const i=phase4dWorld(50).genesis.input,p=deepSwarmPolicy();const platform='channel:forum' as const;
 const communication={...i.communication!,channels:i.communication!.channels.map(c=>c.id==='reddit'?{...c,id:platform}:c)};
 let w=createSociety({...i,communication,intelligence:{...i.intelligence!,memory:'episodic-topic-v2'},swarm:p,hybrid:swarmHybrid(p)});
 const a=w.agents[0],peers=w.agents.filter(c=>c.community===a.community&&c.id!==a.id),b=peers[0],c=peers[1];
 w=act(w,{actorId:a.id,type:'unfollow',platform,targetId:c.id});w=act(w,{actorId:c.id,type:'post',platform,text:'RAW_NOTICE root safeguard question'});const root=w.items.at(-1)!.id;
 w=act(w,{actorId:a.id,type:'read',platform,targetId:root});w=act(w,{actorId:a.id,type:'comment',platform,targetId:root,text:'RAW_NOTICE own condition'});const parent=w.items.at(-1)!.id;
 w=act(w,{actorId:b.id,type:'read',platform,targetId:parent});
 for(let n=0;n<24;n++){w=stepSociety(w);w=act(w,{actorId:c.id,type:'post',platform,text:'RAW_NOTICE new discussion '+n});}
 assert.ok(!visibleFeed(w,a.id,platform).some(i=>i.id===root));
 w=act(w,{actorId:b.id,type:'reply',platform,targetId:parent,text:'RAW_NOTICE actual incoming answer'});const reply=w.items.at(-1)!.id;
 assert.ok(w.agents.find(x=>x.id===a.id)!.notifications.includes(reply));
 assert.doesNotThrow(()=>act(w,{actorId:a.id,type:'read',platform,targetId:reply}));
 const outsider=w.agents.find(x=>x.id!==a.id&&!x.notifications.includes(reply)&&x.community!==a.community)!;
 assert.throws(()=>act(w,{actorId:outsider.id,type:'read',platform,targetId:reply}));
});
