import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareHybridStep,finishDecision} from '../../society/hybrid.ts';
import {saveSociety,restoreSociety} from '../../society/engine.ts';
import {buildDecisionMenu} from '../../society/decision-menu.ts';
import {phase4dWorld,fixtureDecision} from './phase4d-fixture.ts';

test('eight model opportunities span early middle and late time and preserve selected-role fairness',()=>{
 let w=phase4dWorld();const ticks:number[]=[],actors:string[]=[];
 for(let t=0;t<80;t++){w=prepareHybridStep(w);if(w.hybrid!.pending){const c=w.hybrid!.pending;ticks.push(c.tick);actors.push(c.actor.id);w=finishDecision(w,{decision:fixtureDecision(c),usage:null,error:null});}}
 assert.equal(ticks.length,8);assert.ok(ticks.some(t=>t>40));assert.ok(ticks.at(-1)!<80);assert.equal(new Set(actors).size,4);for(const id of new Set(actors))assert.equal(actors.filter(a=>a===id).length,2);
 assert.deepEqual(restoreSociety(saveSociety(w)),w);
});
test('failed and skipped opportunities consume their slot without exhausting future windows',()=>{
 let w=phase4dWorld();const ticks:number[]=[];
 for(let t=0;t<80;t++){w=prepareHybridStep(w);if(w.hybrid!.pending){ticks.push(w.tick);w=finishDecision(w,{decision:null,usage:null,error:ticks.length%2?'AI_CANCELLED':'SOCIAL_DISABLED'});}}
 assert.equal(ticks.length,8);assert.ok(ticks.filter(t=>t>40).length>=3);assert.deepEqual(restoreSociety(saveSociety(w)),w);
});
test('a crowded bounded menu preserves an encountered peer reply and alternatives',()=>{
 let w=phase4dWorld();while(!w.hybrid!.pending)w=prepareHybridStep(w);const c=structuredClone(w.hybrid!.pending!) as any;
 c.policy='conversation-menu-v2';c.platform='reddit';c.actions=['comment','reply','read','post','like','upvote','downvote','follow','unfollow','share','inactive'];
 c.items=Array.from({length:8},(_,i)=>({id:'item-'+i,actorId:i===7?'peer':'other',platform:'reddit',parentId:i?'item-0':null,text:'An encountered argument.',media:'Text discussion',tick:i,modelAuthored:i===7,directToActor:i===7,conversationWithActor:i===7}));
 c.memories=[{eventId:'real-encounter',itemIds:c.items.map((i:any)=>i.id),kind:'exposure',platform:'reddit',text:''}];c.readableIds=c.items.map((i:any)=>i.id);
 const menu=buildDecisionMenu(c);assert.ok(menu.length<=24);assert.ok(menu.some(m=>m.action==='reply'&&m.targetIndex===7));assert.ok(menu.some(m=>m.action==='inactive'));assert.ok(menu.some(m=>m.action==='post'));
});
test('a voluntary fixture A to B to A chain uses real encounters and replays exactly',()=>{
 let w=phase4dWorld();let first:string|null=null,second:string|null=null,actorA:string|null=null,actorB:string|null=null,final:string|null=null;
 for(let t=0;t<80;t++){w=prepareHybridStep(w);const c=w.hybrid!.pending;if(!c)continue;let d=fixtureDecision(c);
  if(!first&&c.menu!.some(m=>m.action==='post')){actorA=c.actor.id;d=fixtureDecision(c,'post',undefined,'Could service coverage be maintained while protecting monthly wages?');}
  else if(first&&!second&&c.actor.id!==actorA){const choice=c.menu!.find(m=>['comment','reply'].includes(m.action)&&c.items[m.targetIndex!]?.id===first);if(choice){actorB=c.actor.id;d=fixtureDecision(c,choice.action,first,'Wage protection needs an explicit roster agreement, including service coverage.');}}
  else if(second&&!final&&c.actor.id===actorA){const choice=c.menu!.find(m=>m.action==='reply'&&c.items[m.targetIndex!]?.id===second);if(choice)d=fixtureDecision(c,'reply',second,'That roster agreement addresses my earlier concern; coverage and monthly wages should be reviewed together.');}
  const before=w.items.length;w=finishDecision(w,{decision:d,usage:null,error:null});if(w.items.length>before){if(!first)first=w.items.at(-1)!.id;else if(!second&&c.actor.id===actorB)second=w.items.at(-1)!.id;else if(second&&c.actor.id===actorA)final=w.items.at(-1)!.id;}
 }
 assert.ok(first&&second&&final,'Reciprocal conversation must actually occur');assert.equal(w.items.find(i=>i.id===second)!.parentId,first);assert.equal(w.items.find(i=>i.id===final)!.parentId,second);assert.deepEqual(restoreSociety(saveSociety(w)),w);
});
