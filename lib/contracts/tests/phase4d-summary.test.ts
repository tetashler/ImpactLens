import test from 'node:test';import assert from 'node:assert/strict';
import {act} from '../../society/engine.ts';import {prepareHybridStep,finishDecision} from '../../society/hybrid.ts';
import {decodeMenuDecision,menuSchema} from '../../society/decision-menu.ts';
import {publicSociety,summaryGraph} from '../../server/society/summary.ts';
import {phase4dWorld} from './phase4d-fixture.ts';
import {aggregateFacts} from '../../server/society/facts.ts';
import {parsePublicExplore} from '../../question-simulation/public-session.ts';

test('one authored model decision with a state effect is one classified argument, with explicit coverage',()=>{
 let w=phase4dWorld();while(!w.hybrid!.pending)w=prepareHybridStep(w);const c=w.hybrid!.pending!,option=c.menu!.find(m=>['comment','reply','group-reply'].includes(m.action)&&c.items[m.targetIndex!].actorId!==c.actor.id)!;
 const schema=menuSchema(c) as any;const stance=schema.properties.stanceId.enum.find((s:string)=>s!=='keep');
 const d=decodeMenuDecision({choiceId:option.id,text:'The encountered safeguard needs an explicit service roster.',motivation:'Consider the actual safeguard.',recallIds:[],stanceId:stance,discussion:{topicIds:['topic-1'],argument:'condition'},issueUpdate:{kind:'condition',topicId:'topic-1',issueId:null}},c);
 w=finishDecision(w,{decision:d,usage:null,error:null});const s=publicSociety(w),p=s.platforms.find(p=>p.id===c.platform)!;
 assert.equal(w.events.filter(e=>e.decisionId===c.id).length,2);assert.match(p.arguments,/condition: 1(?:;|\.)/);const facts=(p as any).discussion;assert.equal(facts.classifiedDecisions,1);assert.equal(facts.modelAuthoredDecisions,1);assert.ok(facts.unclassifiedItems>=1);assert.equal(facts.timeline.reduce((n:number,t:any)=>n+t.authoredItems,0),facts.authoredItems);assert.equal(facts.openIssues,1);assert.equal(s.agents.find(a=>a.id===c.actor.id)!.discussion!.classifiedDecisions,1);
});
test('raw conversation, episodic and issue fields never enter summary, inspector or fact payloads',()=>{
 let w=phase4dWorld();const [a,b]=w.agents,g=w.groups![0];for(const [platform,text,groupId]of [['reddit','RAW_PUBLIC_4D',null],[g.platform,'RAW_GROUP_4D',g.id]] as const){w=act(w,{actorId:b.id,type:groupId?'message':'post',platform,...(groupId?{groupId}:{}),text});w=act(w,{actorId:a.id,type:'read',platform,targetId:w.items.at(-1)!.id});}
 w={...w,agents:w.agents.map((p,i)=>i? p:{...p,issues:[{id:'safe-issue',kind:'condition',topicId:'topic-1',sourceEventId:w.items.at(-1)!.id,createdTick:0,status:'open',changedEventId:null,text:'RAW_ISSUE_4D'} as any]})};
 const seed=w.items.find(i=>i.platform==='reddit')!;w=act(w,{actorId:a.id,type:'read',platform:'reddit',targetId:seed.id});w=act(w,{actorId:a.id,type:'share',platform:'instagram',targetId:seed.id});const pack=aggregateFacts(w,w.events);assert.equal(pack.transfers.length,1);assert.ok(pack.claims.some(c=>c.kind==='transfer'));
 const summary=publicSociety(w);assert.ok((summary.platforms[0] as any).discussion);const graph=summaryGraph({version:1,scenarioIdentity:'fixture',executionIdentity:w.genesis.input.runId,nodes:[],edges:[],limitations:[]},summary);
 assert.doesNotMatch(JSON.stringify({summary,graph}),/RAW_PUBLIC_4D|RAW_GROUP_4D|RAW_ISSUE_4D|exposedIds|episodic|memoryIds/);
});
test('100-agent summary retains every canonical agent while the graph discloses bounded selective presentation',()=>{
 const w=phase4dWorld(100),s=publicSociety(w),g=summaryGraph({version:1,scenarioIdentity:'fixture',executionIdentity:w.genesis.input.runId,nodes:[],edges:[],limitations:[]},s);
 assert.equal(s.agents.length,100);assert.ok(g.nodes.filter(n=>n.properties.agentId).length<=48);assert.ok(g.limitations.some(l=>/selective|48/.test(l)));assert.ok(s.agents.filter(a=>a.roleId).every(a=>g.nodes.some(n=>n.id===a.id)));
});
test('new safe fields and 100-agent summaries restore through the browser parser while raw additions reject',()=>{
 const w=phase4dWorld(100),society=publicSociety(w),graph=summaryGraph({version:1,scenarioIdentity:'fixture',executionIdentity:w.genesis.input.runId,nodes:[],edges:[],limitations:[]},society);
 const p:any={version:3,kind:'summary-execution',attemptId:'fixture',requestIdentity:'fixture',runId:w.genesis.input.runId,planId:null,question:w.genesis.input.question,status:'completed',request:null,graph,inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:2,actionCalls:8,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:null,society};
 assert.equal(parsePublicExplore(p).society!.agents.length,100);
 const raw=structuredClone(p);raw.society.platforms[0].discussion.messages=['RAW_FACT_PACK'];assert.throws(()=>parsePublicExplore(raw));const rawAgent=structuredClone(p);rawAgent.society.agents[0].discussion.messages=['RAW_AGENT_FACTS'];assert.throws(()=>parsePublicExplore(rawAgent));
 for(const [field,value]of [['indexedExperiences',{exposedIds:['RAW_NESTED_AGGREGATE']}],['indexedExperiences',33],['openIssues',9],['openIssues',-1]] as const){const invalid=structuredClone(p);invalid.society.agents[0][field]=value;assert.throws(()=>parsePublicExplore(invalid));}
});
