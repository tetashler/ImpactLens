import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {createSociety,act,multiDayComplete} from '../../society/engine.ts';
import {buildDecisionContext,finishDecision,prepareHybridStep} from '../../society/hybrid.ts';
import {deepSwarmPolicy,multiDaySwarmPolicy,swarmHybrid} from '../../society/swarm.ts';
import {TOPIC_POLICY} from '../../society/intelligence.ts';
import {publicSociety,summaryGraph} from '../../server/society/summary.ts';
import {parsePublicExplore} from '../../question-simulation/public-session.ts';
import {phase4dWorld,fixtureDecision} from './phase4d-fixture.ts';
import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';

function summaryWorld(){const p=multiDaySwarmPolicy();return createSociety({...phase4dWorld().genesis.input,acceptedActions:[],swarm:p,hybrid:swarmHybrid(p),intelligence:TOPIC_POLICY,config:{agents:50,activation:0,steps:320}});}
function publicEnvelope(w:ReturnType<typeof summaryWorld>){const society=publicSociety(w);return {version:3,kind:'summary-execution',attemptId:'offline-multiday',requestIdentity:'offline-multiday',runId:w.genesis.input.runId,planId:null,question:w.genesis.input.question,status:'completed',request:null,graph:summaryGraph({version:1,scenarioIdentity:'fixture',executionIdentity:w.genesis.input.runId,nodes:[],edges:[],limitations:[]},society),inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{},demographics:null,session:null,society};}
function recordedChronology(){
 let w=summaryWorld();const [a,b]=w.agents,g=w.groups![0];
 w=act({...w,tick:1},{actorId:a.id,type:'post',platform:'reddit',text:'RAW_DAILY_PUBLIC recorded public condition.'});const parent=w.items.at(-1)!.id;
 w=act(w,{actorId:b.id,type:'read',platform:'reddit',targetId:parent});
 const c=buildDecisionContext(w,b.id,'reddit'),d=fixtureDecision(c,'comment',parent,'RAW_DAILY_MODEL recorded follow-up about the condition.');
 w=finishDecision({...w,hybrid:{...w.hybrid!,pending:c}},{decision:{...d,discussion:{topicIds:['topic-1'],argument:'question'}},usage:null,error:null});
 w=act({...w,tick:64},{actorId:b.id,type:'message',platform:g.platform,groupId:g.id,text:'RAW_DAILY_PRIVATE recorded current-member question.'});
 w={...w,tick:128};const next=buildDecisionContext(w,a.id,'reddit');w=finishDecision({...w,hybrid:{...w.hybrid!,pending:next}},{decision:fixtureDecision(next),usage:null,error:null});
 return w;
}

test('multi-day daily chronology uses committed events and accepted decisions with the 08:00 day boundary',()=>{
 const w=recordedChronology(),s=publicSociety(w),clock=s.clock!;
 assert.equal(clock.day,2);assert.equal(clock.hour,16);assert.equal(clock.minute,0);assert.equal(clock.elapsedMinutes,1920);
 assert.equal(clock.anchor,'Day 1 08:00');assert.equal(clock.timeZone,'Asia/Singapore');assert.equal(s.swarm!.executionPolicy,'multi-day-swarm-v1');
 assert.deepEqual(clock.daily,[
  {day:1,authoredItems:3,classifiedDecisions:1,followups:1,positionChanges:0,opportunities:1,acceptedDecisions:1,participatingAgents:1,modelAuthoredItems:1,ruleAuthoredItems:2,publicAuthoredItems:2,privateAuthoredItems:1},
  {day:2,authoredItems:1,classifiedDecisions:0,followups:0,positionChanges:0,opportunities:1,acceptedDecisions:1,participatingAgents:1,modelAuthoredItems:0,ruleAuthoredItems:1,publicAuthoredItems:0,privateAuthoredItems:1}
 ]);
 assert.equal(clock.daily.reduce((n,d)=>n+d.authoredItems,0),s.platforms.reduce((n,p)=>n+p.discussion!.authoredItems,0));
 assert.equal(clock.daily.reduce((n,d)=>n+d.acceptedDecisions,0),s.swarm!.acceptedDecisions);
 assert.match(clock.availabilityAssumption,/fictional/i);
});

test('the shared multi-day chronology reaches Graph, browser parsing and the report without raw private records',async()=>{
 const result=publicEnvelope(recordedChronology()),clock=result.society.clock!;
 const node=result.graph.nodes.find(n=>n.properties.recordType==='fictional-agent-aggregate')!;
 assert.ok(node);assert.match(String(node.properties.simulationCalendar),/Day 2 16:00/);
 assert.match(String(node.properties.dailyChronology),/Day 1: 3 authored/);
 assert.match(String(node.properties.dailyChronology),/Day 2: 1 authored/);
 assert.ok(!result.graph.nodes.some(n=>n.properties.recordType==='fictional-simulation-clock'));
 assert.equal(parsePublicExplore(result).society!.clock!.daily[1].authoredItems,1);
 const Report=await renderableReport(),html=renderToStaticMarkup(createElement(Report,{result}));
 assert.match(html,/Day 2 16:00/);assert.match(html,/Daily fictional chronology/);assert.match(html,/Day 1/);assert.match(html,/Day 2/);
 assert.doesNotMatch(JSON.stringify({result,html}),/RAW_DAILY_|exposedIds|memoryIds|joinedSequence|leftSequence/);
 const raw=structuredClone(result) as any;raw.society.clock.daily[0].messages=['RAW_DAILY_LEAK'];assert.throws(()=>parsePublicExplore(raw));
});

test('a seven-day horizon has at most eight daily bins and legacy summaries keep their existing shape',()=>{
 const p=multiDaySwarmPolicy(50,350,672),w=createSociety({...phase4dWorld().genesis.input,swarm:p,hybrid:swarmHybrid(p),intelligence:TOPIC_POLICY,config:{agents:50,activation:0,steps:672}}),s=publicSociety({...w,tick:672});
 assert.equal(s.clock!.day,8);assert.equal(s.clock!.hour,8);assert.equal(s.clock!.daily.length,8);
 const legacy=deepSwarmPolicy(),old=publicSociety(createSociety({...phase4dWorld().genesis.input,swarm:legacy,hybrid:swarmHybrid(legacy),intelligence:TOPIC_POLICY,config:{agents:50,activation:0}}));
 assert.equal(old.clock,undefined);assert.equal(old.swarm!.executionPolicy,'deep-swarm-v1');
});

test('daily authored totals retain accepted stakeholder seeds without relabelling them as social or rule authored',()=>{
 const p=multiDaySwarmPolicy(),w=createSociety({...phase4dWorld().genesis.input,swarm:p,hybrid:swarmHybrid(p),intelligence:TOPIC_POLICY,config:{agents:50,activation:0,steps:320}}),result=publicEnvelope(w),d=result.society.clock!.daily[0];
 assert.equal(d.authoredItems,w.genesis.input.acceptedActions.length+1);
 assert.equal(d.modelAuthoredItems,0);assert.equal(d.ruleAuthoredItems,1);
 assert.doesNotThrow(()=>parsePublicExplore(result));
});

test('the final multi-day clock tick stays simulating until its eligible model slots are finished',()=>{
 let w={...summaryWorld(),tick:320,status:'complete' as const};
 assert.equal(multiDayComplete(w),false);assert.equal(publicSociety(w).phase,'simulating');
 for(let n=0;n<8&&!multiDayComplete(w);n++){w=prepareHybridStep(w) as typeof w;if(w.hybrid!.pending)w=finishDecision(w,{decision:fixtureDecision(w.hybrid!.pending),usage:null,error:null}) as typeof w;}
 assert.equal(multiDayComplete(w),true);assert.equal(publicSociety(w).phase,'completed');
});

async function renderableReport(){return (await (await import('./helpers/report-ssr.ts')).renderableCommunicationReport()).default;}
