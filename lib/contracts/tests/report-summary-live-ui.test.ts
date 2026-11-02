import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import type {PublicExplore} from '../../society/public-contract.ts';

const run:PublicExplore={version:3,kind:'summary-execution',attemptId:'a',requestIdentity:'request',runId:'live-report',planId:null,question:'Should we add another station?',status:'completed',request:null,graph:{version:1,scenarioIdentity:'scenario',executionIdentity:'live-report',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:1,actionCalls:0,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:{id:'session',token:'test-access-token',revision:1},society:null};
const job={version:1 as const,id:'job',status:'running' as const,tick:1,totalSteps:10,acceptedDecisions:1,participatingAgents:1,capacity:10,admittedCalls:1,remainingCalls:9,reason:null,revision:1};
const society:NonNullable<PublicExplore['society']>={version:2,runId:run.runId,worldId:'world',phase:'simulating',tick:1,totalSteps:10,minutes:15,counts:{agents:1,events:1,seeds:0,modelEvents:1,ruleEvents:0,failureEvents:0},platforms:[],groups:[],agents:[],links:[],map:{version:1,worldId:'world',tick:1,sourceHash:null,features:{type:'FeatureCollection',features:[]},unlocated:1,limitation:'Fictional participants.'},usage:{calls:1,skipped:0,accepted:1,failed:0,inputTokens:null,outputTokens:null,costUsd:null,unknownReservedUsd:0},limitations:[]};

function render(result:PublicExplore,canPause=false,automaticReports?:unknown){
 const script=`import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import babel from 'next/dist/compiled/babel/core.js';import ts from 'next/dist/compiled/babel/preset-typescript.js';import react from 'next/dist/compiled/babel/preset-react.js';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';registerHooks({resolve(s,c,n){if(s.startsWith('.')&&c.parentURL)for(const x of ['.tsx','.ts']){const u=new URL(s+x,c.parentURL);if(existsSync(u))return n(u.href,c);}return n(s,c);},load(u,c,n){if(u.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(u.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[ts,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return n(u,c);}});globalThis.fetch=()=>{throw Error('Rendering must never request or generate a summary');};const {default:Report}=await import(${JSON.stringify(new URL('../../../components/report-ai-summary.tsx',import.meta.url).href)});process.stdout.write(renderToStaticMarkup(createElement(Report,{result:JSON.parse(readFileSync(0,'utf8')),${canPause?'onPause(){throw Error("Rendering must not pause the run");}':''}})));`;
 const withAutomatic=script.replace('result:JSON.parse(readFileSync(0,\'utf8\')),',`result:JSON.parse(readFileSync(0,'utf8')),automaticReports:${JSON.stringify(automaticReports)},`);
 const child=spawnSync(process.execPath,['--input-type=module','--eval',withAutomatic],{input:JSON.stringify(result),encoding:'utf8',timeout:15000});assert.equal(child.status,0,child.stderr);return child.stdout;
}

test('completed runs immediately show automatic preparation and stay busy during the writer-to-reader handoff',()=>{
 const completed={...run,job:{...job,status:'completed' as const}};
 for(const [stage,status]of [['idle','pending'],['writing-summary','pending'],['complete','available']]){
  const html=render(completed,false,{runId:run.runId,stage,summary:status,detailed:'pending',errors:{}});
  assert.match(html,/aria-busy="true"/);
  assert.match(html,/Preparing your quick summary|Writing your quick summary|Loading your quick summary/);
  assert.doesNotMatch(html,/Generate summary|Check saved summary again/);
 }
});

test('a running job waits for a stable report even when run status says completed',()=>{
 const html=render({...run,job},true);
 assert.match(html,/simulation is still running/i);
 assert.match(html,/quick summary will be generated automatically when it finishes/i);
 assert.match(html,/<button[^>]*>Pause for a partial summary<\/button>/);
 assert.match(html.replace(/<[^>]*>/g,''),/step 1 of 10/i);
 assert.doesNotMatch(html,/Generate summary|Checking for a saved summary|run changed|role="alert"/i);
});

test('running reports without a pause action still explain when summary generation becomes available',()=>{
 const html=render({...run,job});
 assert.match(html,/simulation is still running/i);
 assert.match(html,/pause|finish/i);
 assert.doesNotMatch(html,/<button|run changed/i);
});

test('paused and terminal jobs return to saved-summary lookup without generating or pausing on render',()=>{
 for(const status of ['paused','completed','cancelled','failed'] as const){
  const html=render({...run,society,job:{...job,status}},true);
  assert.match(html,/Checking for a saved summary/);
  assert.doesNotMatch(html,/Pause to prepare summary|simulation is still running|Generate summary/i);
 }
});

test('society work without a job also waits rather than offering a report that is still changing',()=>{
 const html=render({...run,society});
 assert.match(html,/simulation is still running/i);
 assert.doesNotMatch(html,/Checking for a saved summary|Generate summary|run changed/i);
});
