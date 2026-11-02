import test from 'node:test';
import assert from 'node:assert/strict';
import {explainLink} from '../../knowledge-graph/edge-explain.ts';
import {buildLinks} from '../../server/society/link-detail.ts';
import {entityFirstGraph} from '../../server/society/entity-graph.ts';
import {parseKnowledgeGraph,type KnowledgeGraph} from '../../knowledge-graph/contract.ts';
import {publicSociety} from '../../server/society/summary.ts';
import {phase4dWorld} from './phase4d-fixture.ts';
import type {SocialEvent,SocialItem} from '../../society/contract.ts';

const names={source:'Ann',target:'Ben',platformName:(id:string)=>id==='reddit'?'Reddit':id};

test('recorded interaction explains what happened, where, about what and the stance outcome',()=>{
 const e=explainLink({source:'a',target:'b',kind:'RECORDED_PUBLIC_INTERACTION',count:3,detail:{mix:{reply:2,comment:1},platforms:['reddit'],themes:[{label:'Crowding',count:2}],arguments:{concern:2,question:1},stance:{changes:2,towardSupport:2,towardConcern:0}}},names);
 assert.equal(e.label,'responded to ×3');
 assert.equal(e.detail.basis,'recorded');
 assert.equal(e.detail.headline,'Ann responded to Ben 3 times');
 assert.equal(e.detail.interaction,'1 comment and 2 replies');
 assert.equal(e.detail.where,'On Reddit');
 assert.match(e.detail.about!,/Mostly about Crowding; mainly concerns \(2\) and questions \(1\)/);
 assert.match(e.detail.outcome!,/stance changed twice, toward support/);
 assert.match(e.detail.outcome!,/association, not proof of influence/);
 assert.doesNotMatch(e.description,/RECORDED_|ASSUMED_|minute|tick/i);
});

test('missing detail never invents facts; empty detail reports no stance change plainly',()=>{
 const old=explainLink({source:'a',target:'b',kind:'RECORDED_PUBLIC_INTERACTION',count:1},names);
 assert.equal(old.detail.outcome,undefined);assert.doesNotMatch(old.description,/stance/);
 const e=explainLink({source:'a',target:'b',kind:'RECORDED_PUBLIC_INTERACTION',count:1,detail:{}},names);
 assert.equal(e.detail.headline,'Ann responded to Ben once');
 assert.equal(e.detail.interaction,undefined);assert.equal(e.detail.where,undefined);assert.equal(e.detail.about,undefined);
 assert.match(e.detail.outcome!,/No stance change was recorded/);
});

test('assumed ties are labelled as starting conditions, not interactions',()=>{
 const e=explainLink({source:'a',target:'b',kind:'ASSUMED_SOCIAL_TIE',count:1,detail:{tie:'neighbourhood-assumption'}},names);
 assert.equal(e.label,'assumed neighbours');assert.equal(e.detail.basis,'assumed');
 assert.match(e.detail.note!,/does not mean they interacted/);
 assert.equal(e.detail.outcome,undefined);
});

test('transfers describe discussion carried between environments with themes',()=>{
 const e=explainLink({source:'x',target:'y',kind:'RECORDED_INFORMATION_TRANSFER',count:2,detail:{mix:{share:1,reply:1},themes:[{label:'Fares',count:1}]}},{...names,source:'Reddit',target:'WhatsApp'});
 assert.equal(e.label,'carried over ×2');
 assert.match(e.detail.headline,/carried discussion from Reddit to WhatsApp/);
 assert.equal(e.detail.interaction,'1 reply and 1 share');assert.match(e.detail.about!,/Fares/);
});

test('buildLinks adds aggregate detail without text, ids or time and keeps counts',()=>{
 const w=structuredClone(phase4dWorld(100));
 const [a,b]=w.agents;
 const item=(id:string,actorId:string):SocialItem=>({id,actorId,platform:'reddit',parentId:null,community:'c',text:'SECRET TEXT',position:0,tick:1,media:'none',votes:0,likes:0,hidden:false,sharedFrom:null});
 const ev=(id:string,actorId:string,type:SocialEvent['type'],targetId:string,extra:Partial<SocialEvent>={}):SocialEvent=>({id,actorId,type,platform:'reddit',tick:2,minute:30,targetId,parentId:null,text:'SECRET TEXT',position:null,previousPosition:null,causes:[],source:'social-model',sourceEventId:null,location:null,...extra});
 w.ties=[];w.items=[item('i-b',b.id)];
 w.events=[
  ev('e1',a.id,'reply','i-b',{discussion:{topicIds:[],argument:'concern'}}),
  ev('e2',a.id,'comment','i-b'),
  ev('e3',a.id,'opinion','i-b',{position:0.5,previousPosition:-0.2}),
  ev('e4',a.id,'opinion','i-b',{position:0.1,previousPosition:0.1})
 ];
 const links=buildLinks(w),link=links.find(l=>l.kind==='RECORDED_PUBLIC_INTERACTION'&&l.source===a.id&&l.target===b.id)!;
 assert.equal(link.count,2);
 assert.deepEqual(link.detail!.mix,{reply:1,comment:1});
 assert.deepEqual(link.detail!.platforms,['reddit']);
 assert.deepEqual(link.detail!.arguments,{concern:1});
 assert.deepEqual(link.detail!.stance,{changes:1,towardSupport:1,towardConcern:0});
 const json=JSON.stringify(links);
 assert.doesNotMatch(json,/SECRET|e1|"minute"|"tick"/);
});

test('entity-first graph shows plain relationship explanations and still validates',()=>{
 const s=publicSociety(phase4dWorld(100));
 const [a,b]=s.agents;
 s.links=[{source:a.id,target:b.id,kind:'RECORDED_PUBLIC_INTERACTION',count:2,detail:{mix:{reply:2},platforms:[s.platforms[0].id],stance:{changes:1,towardSupport:0,towardConcern:1}}},{source:b.id,target:a.id,kind:'ASSUMED_SOCIAL_TIE',count:1,detail:{tie:'fictional-friendship'}}];
 const base:KnowledgeGraph={version:1,scenarioIdentity:'link-fixture',executionIdentity:'link-fixture',nodes:[],edges:[],limitations:[]};
 const g=parseKnowledgeGraph(entityFirstGraph(base,s));
 const recorded=g.edges.find(e=>e.relationshipLabel==='RECORDED_PUBLIC_INTERACTION'&&e.source===a.id)!,assumed=g.edges.find(e=>e.relationshipLabel==='ASSUMED_SOCIAL_TIE'&&e.source===b.id)!;
 assert.ok(recorded&&assumed);
 assert.equal(recorded.detail!.label,'replied to ×2');assert.equal(recorded.relationshipLabel,'RECORDED_PUBLIC_INTERACTION');
 assert.match(recorded.detail!.outcome!,/toward concern/);
 assert.equal(assumed.detail!.label,'assumed friends');
 for(const e of [recorded,assumed])assert.doesNotMatch(e.description,/explicitly assumed fictional social ties|recorded public fictional interactions/);
});

import {explainKnown,explainProposed,explainStakeholderEvent} from '../../knowledge-graph/edge-explain.ts';

test('stakeholder turns read as plain interactions with topics and stance, never the statement',()=>{
 const d=explainStakeholderEvent({type:'evidence-question',position:'information-seeking',positionChange:'more-conditional',topics:['Parking','Footfall']},{source:'Volunteer',target:'Planner'});
 assert.equal(d.label,'asked for evidence');assert.equal(d.basis,'recorded');
 assert.equal(d.headline,'Volunteer asked for evidence from Planner');
 assert.equal(d.about,'Topics: Parking and Footfall');
 assert.match(d.outcome!,/information seeking and became more conditional/);
 assert.match(d.note!,/statement text is not shown/);
 const initial=explainStakeholderEvent({type:'revision',position:'concerned',positionChange:'initial',topics:[]},{source:'A',target:'B'});
 assert.equal(initial.about,undefined);assert.equal(initial.outcome,'A was concerned');
});

test('proposed and reported relationships are never presented as observed',()=>{
 const p=explainProposed('CONSULTS_WITH',{source:'Agency',target:'Town council'},'A model-proposed consultation.',false);
 assert.equal(p.basis,'proposed');assert.equal(p.label,'consults with');assert.match(p.note!,/Not an observed or causal relationship/);
 const r=explainProposed('hostsDiscussion',{source:'Platform',target:'Topic'},'Reported text.',true);
 assert.equal(r.basis,'reported');assert.equal(r.label,'hosts discussion');
});

test('fixed society relationship kinds get plain wording and unknown kinds are left alone',()=>{
 const d=explainKnown('REPRESENTS_FICTIONAL_SCENARIO_ROLE',{source:'Resident',target:'Resident role'},'Explicit simulation role binding.')!;
 assert.equal(d.label,'represents role');assert.equal(d.basis,'assumed');
 assert.equal(explainKnown('SOMETHING_ELSE',{source:'a',target:'b'},'x'),undefined);
});

test('very long entity names cannot make an edge detail exceed the graph contract',()=>{
 const long='X'.repeat(180);
 const e=explainLink({source:'a',target:'b',kind:'RECORDED_PUBLIC_INTERACTION',count:2,detail:{mix:{reply:2},platforms:['reddit'],themes:[{label:'T'.repeat(120),count:2}],stance:{changes:2,towardSupport:1,towardConcern:1}}},{source:long,target:long,platformName:()=>'P'.repeat(100)});
 for(const v of [e.detail.headline,e.detail.interaction,e.detail.where,e.detail.about,e.detail.outcome,e.detail.note])assert.ok(v===undefined||v.length<=400);
 const s=publicSociety(phase4dWorld(100));
 s.agents=s.agents.map((a,i)=>i<2?{...a,label:`Agent ${i} `+long.slice(0,170)}:a);
 s.links=[{source:s.agents[0].id,target:s.agents[1].id,kind:'RECORDED_PUBLIC_INTERACTION',count:3,detail:{mix:{reply:3},platforms:[s.platforms[0].id],stance:{changes:3,towardSupport:2,towardConcern:1}}}];
 const base:KnowledgeGraph={version:1,scenarioIdentity:'long-fixture',executionIdentity:'long-fixture',nodes:[],edges:[],limitations:[]};
 assert.doesNotThrow(()=>parseKnowledgeGraph(entityFirstGraph(base,s)));
});
