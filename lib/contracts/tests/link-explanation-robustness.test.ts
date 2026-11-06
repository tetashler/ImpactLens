import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {explainLink,explainKnown,explainProposed,explainStakeholderEvent} from '../../knowledge-graph/edge-explain.ts';
import {parseKnowledgeGraph,type EdgeDetail,type KnowledgeGraph} from '../../knowledge-graph/contract.ts';
import {entityFirstGraph} from '../../server/society/entity-graph.ts';
import {publicSociety} from '../../server/society/summary.ts';
import {buildLinks} from '../../server/society/link-detail.ts';
import {phase4dWorld,fixtureDecision} from './phase4d-fixture.ts';
import {prepareHybridStep,finishDecision} from '../../society/hybrid.ts';
import {saveSociety,restoreSociety} from '../../society/engine.ts';
import type {SocialEvent,SocialItem} from '../../society/contract.ts';

const base=():KnowledgeGraph=>({version:1,scenarioIdentity:'robust-links',executionIdentity:'robust-links',nodes:[],edges:[],limitations:[]});
function graphWithDetail(detail:EdgeDetail){return parseKnowledgeGraph({...base(),nodes:['a','b'].map(id=>({id,label:id,category:'planning',description:'Safe base label.',provenance:{kind:'synthetic-exploratory',reference:'Offline fixture'},properties:{},limitations:[]})),edges:[{id:'edge',source:'a',target:'b',relationship:'describes',description:'Safe base description.',provenance:{kind:'synthetic-exploratory',reference:'Offline fixture'},directed:true,detail}]});}

test('valid public actor names and aggregate themes containing angle brackets cannot crash the production graph projection',()=>{
 const summary=publicSociety(phase4dWorld(100));
 summary.agents=summary.agents.map((a,i)=>i<2?{...a,label:i?'Service > cost':'Pay < staffing'}:a);
 summary.platforms[0]={...summary.platforms[0],name:'Forum <public>'};
 summary.links=[{source:summary.agents[0].id,target:summary.agents[1].id,kind:'RECORDED_PUBLIC_INTERACTION',count:2,detail:{mix:{reply:2},platforms:[summary.platforms[0].id],themes:[{label:'Pay < staffing',count:2}],stance:{changes:1,towardSupport:1,towardConcern:0}}}];
 const graph=entityFirstGraph(base(),summary);assert.ok(graph.nodes.some(n=>n.label.includes('<')),'Original safe source labels must remain unchanged');
 const detail=graph.edges.find(e=>e.relationshipLabel==='RECORDED_PUBLIC_INTERACTION')!.detail!;
 for(const value of Object.values(detail))if(typeof value==='string')assert.doesNotMatch(value,/[<>]/);
 assert.match(detail.about!,/Pay/);assert.match(detail.where!,/Forum/);assert.doesNotThrow(()=>parseKnowledgeGraph(graph));
});

test('all explanation builders produce bounded nonempty safe display fields across hostile and degenerate prose',()=>{
 const cases=['',' ','---','  _ -  ','<team>','A > B','成本 < 公平','line\nbreak','bad\u0000control','X'.repeat(10000),'🙂'.repeat(800)];
 for(const input of cases){
  const names={source:input,target:input,platformName:()=>input};
  const details=[
   explainLink({source:'a',target:'b',kind:'RECORDED_PUBLIC_INTERACTION',count:1,detail:{platforms:['reddit'],themes:[{label:input,count:1}],stance:{changes:1,towardSupport:1,towardConcern:0}}},names).detail,
   explainKnown('SIMULATED_PARTICIPATION',names,input)!,
   explainProposed(input,names,input,false),
   explainStakeholderEvent({type:'response',position:'conditional',positionChange:'unchanged',topics:[input]},names)
  ];
  for(const detail of details){assert.doesNotThrow(()=>graphWithDetail(detail),JSON.stringify({input,detail}));assert.ok(detail.label.trim());for(const [key,value]of Object.entries(detail))if(key!=='basis')assert.ok(value.length<=(key==='label'?80:400));}
 }
});

test('unknown relationship and tie names cannot read inherited object properties',()=>{
 for(const key of ['constructor','toString','__proto__']){
  assert.equal(explainKnown(key,{source:'A',target:'B'},'Safe description.'),undefined);
  const tie=explainLink({source:'a',target:'b',kind:'ASSUMED_SOCIAL_TIE',count:1,detail:{tie:key}},{source:'A',target:'B',platformName:id=>id});
  assert.equal(tie.label,'assumed connection');assert.doesNotThrow(()=>graphWithDetail(tie.detail));
 }
});

test('aggregate link construction preserves direction and excludes self/private/unchanged stance events without disclosing bodies',()=>{
 const world=structuredClone(phase4dWorld(100)),[a,b,c]=world.agents;
 const item=(id:string,actorId:string,groupId?:string):SocialItem=>({id,actorId,platform:'reddit',parentId:null,community:'c',text:'SECRET BODY',position:0,tick:1,media:'none',votes:0,likes:0,hidden:false,sharedFrom:null,...(groupId?{groupId}:{})});
 const event=(id:string,actorId:string,type:SocialEvent['type'],targetId:string,extra:Partial<SocialEvent>={}):SocialEvent=>({id,actorId,type,platform:'reddit',tick:2,minute:30,targetId,parentId:null,text:'SECRET BODY',position:null,previousPosition:null,causes:[],source:'social-model',sourceEventId:null,location:null,...extra});
 world.ties=[];world.items=[item('item-a',a.id),item('item-b',b.id),item('item-c',c.id),item('private-item',b.id,'private-group')];
 world.events=[event('one',a.id,'reply','item-b'),event('two',b.id,'comment','item-a'),event('self',a.id,'reply','item-a'),event('private',a.id,'reply','private-item'),event('change',a.id,'opinion','item-b',{position:0.8,previousPosition:0.2}),event('other-person',a.id,'opinion','item-c',{position:-0.8,previousPosition:0.2}),event('same',a.id,'opinion','item-b',{position:0.2,previousPosition:0.2})];
 const links=buildLinks(world).filter(l=>l.kind==='RECORDED_PUBLIC_INTERACTION');assert.equal(links.length,2);
 const forward=links.find(l=>l.source===a.id&&l.target===b.id)!,reverse=links.find(l=>l.source===b.id&&l.target===a.id)!;
 assert.equal(forward.count,1);assert.deepEqual(forward.detail!.mix,{reply:1});assert.deepEqual(forward.detail!.stance,{changes:1,towardSupport:1,towardConcern:0});
 assert.equal(reverse.count,1);assert.deepEqual(reverse.detail!.mix,{comment:1});assert.equal(reverse.detail!.stance,undefined);
 assert.doesNotMatch(JSON.stringify(links),/SECRET BODY|private-item|private-group|"tick"|"minute"|"text"/);
});

test('bounded combinations of valid Unicode labels and empty aggregate arrays keep the production graph valid',()=>{
 const source=publicSociety(phase4dWorld(100)),words=['A < B','C > D','工作与生活🙂','---','A & B'];
 for(let index=0;index<30;index++){
  const summary=structuredClone(source),label=words[index%words.length].repeat(1+index).slice(0,170);
  summary.agents=summary.agents.map((a,i)=>i<2?{...a,label:label+(i?' B':' A')}:a);
  summary.platforms[0]={...summary.platforms[0],name:label};
  summary.links=[{source:summary.agents[0].id,target:summary.agents[1].id,kind:'RECORDED_PUBLIC_INTERACTION',count:index+1,detail:{mix:index%2?{}:{reply:index+1},platforms:index%3?[]:[summary.platforms[0].id],themes:index%4?[]:[{label:label.slice(0,100),count:index+1}]}}];
  assert.doesNotThrow(()=>entityFirstGraph(base(),summary),'Case '+index);
 }
});

test('accepted production decision flow creates inspectable recorded social links and survives saved-world restoration',()=>{
 let world=phase4dWorld(),first:string|null=null,second:string|null=null,actorA:string|null=null;
 for(let tick=0;tick<80;tick++){
  world=prepareHybridStep(world);const context=world.hybrid!.pending;if(!context)continue;
  let decision=fixtureDecision(context);
  if(!first&&context.menu!.some(m=>m.action==='post')){actorA=context.actor.id;decision=fixtureDecision(context,'post',undefined,'SECRET FIRST: can service coverage be maintained while protecting wages?');}
  else if(first&&!second&&context.actor.id!==actorA){const choice=context.menu!.find(m=>['comment','reply'].includes(m.action)&&context.items[m.targetIndex!]?.id===first);if(choice)decision=fixtureDecision(context,choice.action,first,'SECRET REPLY: coverage needs an explicit roster agreement.');}
  const prior=world.items.length;world=finishDecision(world,{decision,usage:null,error:null});
  if(world.items.length>prior){if(!first)first=world.items.at(-1)!.id;else if(!second&&context.actor.id!==actorA)second=world.items.at(-1)!.id;}
 }
 assert.ok(first&&second,'A genuine accepted fixture reply must occur through the production reducer');
 const summary=publicSociety(world),links=summary.links.filter(l=>l.kind==='RECORDED_PUBLIC_INTERACTION');assert.ok(links.length);
 const graph=entityFirstGraph(base(),summary),edges=graph.edges.filter(e=>e.relationshipLabel==='RECORDED_PUBLIC_INTERACTION');assert.ok(edges.length);
 assert.ok(edges.some(e=>e.detail?.where?.startsWith('On ')));assert.ok(edges.every(e=>e.detail?.basis==='recorded'));
 assert.doesNotMatch(JSON.stringify(links),/SECRET FIRST|SECRET REPLY/);assert.doesNotMatch(JSON.stringify(edges),/SECRET FIRST|SECRET REPLY/);
 const restored=restoreSociety(saveSociety(world));assert.deepEqual(buildLinks(restored),buildLinks(world));assert.deepEqual(entityFirstGraph(base(),publicSociety(restored)),graph);
});
