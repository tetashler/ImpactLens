import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import type {PublicExplore} from '../../society/public-contract.ts';

const run:PublicExplore={version:3,kind:'summary-execution',attemptId:'a',requestIdentity:'request',runId:'detailed-ui',planId:null,question:'Should we add a station?',status:'completed',request:null,graph:{version:1,scenarioIdentity:'scenario',executionIdentity:'detailed-ui',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:1,actionCalls:0,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:{id:'session',token:'secret-test-token',revision:1},society:null};
const job={version:1 as const,id:'job',status:'running' as const,tick:1,totalSteps:10,acceptedDecisions:1,participatingAgents:1,capacity:10,admittedCalls:1,remainingCalls:9,reason:null,revision:1};

function render(input:unknown,content=false){
 const script=`import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import babel from 'next/dist/compiled/babel/core.js';import ts from 'next/dist/compiled/babel/preset-typescript.js';import react from 'next/dist/compiled/babel/preset-react.js';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';registerHooks({resolve(s,c,n){if(s.startsWith('.')&&c.parentURL)for(const x of ['.tsx','.ts']){const u=new URL(s+x,c.parentURL);if(existsSync(u))return n(u.href,c);}return n(s,c);},load(u,c,n){if(u.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(u.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[ts,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return n(u,c);}});globalThis.fetch=()=>{throw Error('Render must never dispatch report requests');};const module=await import(${JSON.stringify(new URL('../../../components/report-detailed.tsx',import.meta.url).href)});process.stdout.write(renderToStaticMarkup(createElement(${content?'module.DetailedReportContent':'module.default'},JSON.parse(readFileSync(0,'utf8')))));`;
 const child=spawnSync(process.execPath,['--input-type=module','--eval',script],{input:JSON.stringify(input),encoding:'utf8',timeout:15000});assert.equal(child.status,0,child.stderr);return child.stdout;
}

test('running authoritative jobs wait even when initial-stage status is completed',()=>{
 const html=render({result:{...run,job},autoGenerate:true});
 assert.match(html,/simulation is still running/i);
 assert.match(html,/detailed report will be generated automatically when it finishes/i);
 assert.doesNotMatch(html,/Generate detailed report|Checking for a saved detailed report|secret-test-token|role="alert"/);
});

test('stable snapshots first check saved reports without starting inference during rendering',()=>{
 for(const status of ['completed','paused','failed','cancelled'] as const){
  const html=render({result:{...run,job:{...job,status}},autoGenerate:true});
  assert.match(html,/Checking for a saved detailed report/);
  assert.doesNotMatch(html,/simulation is still running|secret-test-token/);
 }
});
test('automatic detailed generation explains the queue and writing stage without manual generation controls',()=>{
 for(const stage of ['idle','writing-summary','writing-detailed']){
  const html=render({result:{...run,job:{...job,status:'completed'}},automaticReports:{runId:run.runId,stage,summary:'pending',detailed:'pending',errors:{}}});
  assert.match(html,/aria-busy="true"/);
  assert.match(html,/after the quick summary|Writing your detailed report/);
  assert.doesNotMatch(html,/Generate detailed report|Check saved detailed report again/);
 }
});

test('report chapters render model strings as readable plain text with partial metadata',()=>{
 const html=render({report:{version:1,runId:'detailed-ui',snapshotKey:'a'.repeat(64),generatedAt:'2026-11-02T08:30:00.000Z',question:'A <b>question</b>',runStatus:'paused',sections:{assessment:'<script>no execution</script>',impacts:'Impacts paragraph',perspectives:'Perspectives paragraph',tradeoffs:'Tradeoffs paragraph',developments:'Developments paragraph',nextSteps:'Next steps paragraph'}}},true);
 assert.match(html,/A &lt;b&gt;question&lt;\/b&gt;/);
 assert.match(html,/&lt;script&gt;no execution&lt;\/script&gt;/);
 assert.equal((html.match(/<h3/g)||[]).length,6);
 assert.match(html,/paused.*partial/i);
 for(const text of ['Impacts paragraph','Perspectives paragraph','Tradeoffs paragraph','Developments paragraph','Next steps paragraph'])assert.ok(html.includes(text));
 assert.doesNotMatch(html,/<script|<b>|snapshotKey/);
});
