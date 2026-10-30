import test from 'node:test';import assert from 'node:assert/strict';
import {act} from '../../society/engine.ts';import {buildDecisionContext} from '../../society/hybrid.ts';
import {canonical} from '../../experiments/validation.ts';import {phase4dWorld} from './phase4d-fixture.ts';

test('observational memory diagnostics report real eviction and inclusion without changing the immutable context',()=>{
 let w=phase4dWorld();const [actor,other]=w.agents,seed=w.items.find(i=>i.actorId===other.id)!;
 w=act(w,{actorId:actor.id,type:'read',platform:seed.platform,targetId:seed.id});const earlier=w.events.at(-1)!.id;
 for(let i=0;i<18;i++){w={...w,tick:i+1};w=act(w,{actorId:other.id,type:'post',platform:seed.platform,text:'PRIVATE_DIAGNOSTIC_SENTINEL unrelated archive inventory '+i});w=act(w,{actorId:actor.id,type:'read',platform:seed.platform,targetId:w.items.at(-1)!.id});}
 const before=canonical(w),plain=buildDecisionContext(w,actor.id,seed.platform);let metrics:any;
 const observed=buildDecisionContext(w,actor.id,seed.platform,(m:unknown)=>{metrics=m;});
 assert.ok(metrics,'the authoritative retrieval path must expose a separate observation');assert.equal(canonical(observed),canonical(plain));assert.equal(canonical(w),before);
 assert.equal(metrics.shortTermEntries,12);assert.ok(metrics.shortTermEvictions>0);assert.ok(metrics.episodicOnlyCandidates>0);assert.ok(metrics.episodicOnlyIncluded>0);assert.ok(metrics.entries.some((e:any)=>e.eventId===earlier&&e.stage==='included'&&e.origin==='episodic'));
 assert.ok(metrics.contextBytes<=24000);assert.doesNotMatch(JSON.stringify(metrics),/PRIVATE_DIAGNOSTIC_SENTINEL|unrelated archive inventory|"text"|"goal"|"content"/);
});

test('a withdrawn ancestor is reported as context filtering rather than a proven capacity rejection',()=>{
 let w=phase4dWorld();const [actor,other]=w.agents;
 w=act(w,{actorId:other.id,type:'post',platform:'reddit',text:'A fictional discussion root.'});const root=w.items.at(-1)!.id;
 w=act(w,{actorId:other.id,type:'comment',platform:'reddit',targetId:root,text:'An encountered fictional follow-up.'});const child=w.items.at(-1)!.id;
 w=act(w,{actorId:actor.id,type:'read',platform:'reddit',targetId:child});w=act(w,{actorId:other.id,type:'moderate',platform:'reddit',targetId:root});let metrics:any;
 buildDecisionContext(w,actor.id,'reddit',(m:unknown)=>{metrics=m;});assert.ok(metrics.rejected['item-filtered']>0);assert.equal(metrics.entries.find((e:any)=>e.itemId===child).stage,'selected-not-in-context');
});
