import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {continuePublicSociety,societyContinuationLimit} from '../../question-simulation/continuation.ts';
import type {PublicExplore} from '../../society/public-contract.ts';

function fixture(revision=0,{totalSteps=80,tick=Math.min(80,Math.floor(revision*80/130)),maxCalls=128,swarm=true,completed=revision===130}={}):PublicExplore {
 const calls=Math.min(revision,maxCalls),capable=70,offered=(i:number)=>Math.max(0,Math.min(2,calls-i*2));
 const agents=Array.from({length:100},(_,i)=>({id:'agent-'+i,roleId:null,label:'Fictional participant '+i,entityType:'Resident',affiliation:null,goal:'Fictional service coverage',initialPosition:0,position:0,activity:'community-context',platformIds:[],groupCount:0,events:offered(i),modelDecisions:offered(i),ruleEvents:0,stateChanges:0,demographic:'No observed person.',...(swarm?{controlMode:i<capable?'llm-capable' as const:'rule-driven' as const,offeredDecisions:offered(i)}:{})}));
 return {version:3,kind:'summary-execution',attemptId:'continuation-test',requestIdentity:'continuation-test',runId:'run-continuation-test',planId:null,question:'Fictional continuation fixture',status:'completed',request:null,graph:{version:1,scenarioIdentity:'continuation-test',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:2,actionCalls:8,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:{id:'test-session',token:'test-only-token',revision},society:{version:2,runId:'run-continuation-test',worldId:'test-world',phase:completed?'completed':'simulating',tick,totalSteps,minutes:tick*15,counts:{agents:100,events:calls+tick,seeds:0,modelEvents:calls,ruleEvents:tick,failureEvents:0},platforms:[],groups:[],agents,links:[],map:{version:1,worldId:'test-world',tick,sourceHash:null,features:{type:'FeatureCollection',features:[]},unlocated:100,limitation:'Fictional fixture only.'},usage:{calls,skipped:0,accepted:calls,failed:0,inputTokens:null,outputTokens:null,costUsd:null,unknownReservedUsd:0},limitations:[],...(swarm?{swarm:{version:1,activeAgents:100,llmCapableAgents:capable,ruleDrivenAgents:30,offeredAgents:Math.ceil(calls/2),acceptedAgents:Math.ceil(calls/2),opportunities:calls,acceptedDecisions:calls,rejectedDecisions:0,skippedDecisions:0,modelAuthoredItems:calls,ruleAuthoredItems:0,reads:0,reactions:0,deterministicStateChanges:0,maxPerAgent:2,maxCalls,perAgent:agents.slice(0,capable).map((a,i)=>({agentId:a.id,offered:offered(i),accepted:offered(i)}))}}:{})}};
}
const options=(accept:(value:PublicExplore)=>void,fetcher:typeof fetch)=>({signal:new AbortController().signal,accept,fetcher,intervalMs:0});

test('continuation advances through more than 100 accepted revisions to the complete 128-decision checkpoint',async()=>{
 let requests=0;const accepted:PublicExplore[]=[];
 const result=await continuePublicSociety(fixture(),options(v=>accepted.push(v),async(url,init)=>{
  assert.equal(url,'/api/social-simulate');assert.equal(init?.method,'POST');
  assert.deepEqual(JSON.parse(String(init?.body)),{operation:'continue',runId:'run-continuation-test',token:'test-only-token',revision:requests});
  requests++;return Response.json(fixture(requests));
 }));
 assert.equal(requests,130);assert.equal(result.society?.phase,'completed');assert.equal(result.society?.usage.accepted,128);
 assert.equal(result.session?.revision,130);assert.equal(accepted.length,130);
 assert.deepEqual(accepted.map(v=>v.session?.revision),Array.from({length:130},(_,i)=>i+1));
});

test('continuation bounds account for remaining clock and opportunities while retaining the legacy cap',()=>{
 assert.equal(societyContinuationLimit(fixture()),208);
 assert.equal(societyContinuationLimit(fixture(100,{tick:58})),50);
 assert.equal(societyContinuationLimit(fixture(0,{totalSteps:144})),272);
 assert.equal(societyContinuationLimit(fixture(0,{totalSteps:10000})),272);
 assert.equal(societyContinuationLimit(fixture(0,{swarm:false})),100);
});

test('exhausting the derived bound publishes the retained checkpoint as partial and never retries',async()=>{
 let requests=0;const accepted:PublicExplore[]=[];
 await assert.rejects(continuePublicSociety(fixture(0,{totalSteps:2,tick:0,maxCalls:0}),options(v=>accepted.push(v),async()=>{
  requests++;return Response.json(fixture(requests,{totalSteps:2,tick:0,maxCalls:0,completed:false}));
 })),/SOCIETY_CONTINUATION_BOUND/);
 assert.equal(requests,2);assert.equal(accepted.at(-1)?.society?.phase,'partial');
 assert.equal(accepted.at(-1)?.session?.revision,2);assert.equal(accepted.at(-1)?.society?.usage.calls,0);
});

test('stagnant revisions or backward ticks cannot replace the accepted checkpoint or dispatch again',async()=>{
 for(const value of [fixture(10,{tick:20}),fixture(11,{tick:19})]){
  let requests=0,accepted=0;
  await assert.rejects(continuePublicSociety(fixture(10,{tick:20}),options(()=>accepted++,async()=>{requests++;return Response.json(value);})),/SOCIETY_CONTINUATION_STALE/);
  assert.equal(requests,1);assert.equal(accepted,0);
 }
});

test('network failures and aborted signals cannot retry a continuation',async()=>{
 let requests=0;
 await assert.rejects(continuePublicSociety(fixture(),options(()=>{},async()=>{requests++;throw Error('Controlled network failure');})),/Controlled network failure/);
 assert.equal(requests,1);
 const abort=new AbortController();abort.abort();
 await assert.rejects(continuePublicSociety(fixture(),{...options(()=>{},async()=>{requests++;return Response.json(fixture(1));}),signal:abort.signal}),{name:'AbortError'});
 assert.equal(requests,1);
});

test('cancelling an in-flight continuation prevents publishing or another request',async()=>{
 let requests=0,accepted=0;const abort=new AbortController();let started!:()=>void;
 const ready=new Promise<void>(resolve=>started=resolve);
 const work=continuePublicSociety(fixture(),{...options(()=>accepted++,async(_url,init)=>{
  requests++;started();return new Promise<Response>((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true}));
 }),signal:abort.signal});
 await ready;abort.abort();await assert.rejects(work,{name:'AbortError'});
 assert.equal(requests,1);assert.equal(accepted,0);
});

test('allowlist and run identity are checked before a response reaches accepted client state',async()=>{
 for(const kind of ['private-field','wrong-run'] as const){
  let accepted=0,requests=0;const value=fixture(1);
  if(kind==='private-field')Object.assign(value.society!.agents[0],{memory:'PRIVATE_TEST_CANARY'});else{value.runId='another-run';value.society!.runId='another-run';}
  await assert.rejects(continuePublicSociety(fixture(),options(()=>accepted++,async()=>{requests++;return Response.json(value);})));assert.equal(requests,1);assert.equal(accepted,0);
 }
});

test('complete snapshots dispatch no request when ordinary navigation reuses them',async()=>{
 let requests=0;
 const result=await continuePublicSociety(fixture(130),options(()=>{},async()=>{requests++;throw Error('Unexpected continuation');}));
 assert.equal(requests,0);assert.equal(result.society?.phase,'completed');
});
