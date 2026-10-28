import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createLiveInput} from '../../stakeholder-simulation/inference-input.ts';
import {runStakeholderSimulation,deterministicTurn} from '../../stakeholder-simulation/engine.ts';
import {INFERENCE_MODEL,INFERENCE_LIMITS,type InferenceDiagnosticsV1} from '../../stakeholder-simulation/inference-contract.ts';
import {classifyQuestionContext} from '../../question-simulation/context.ts';
import {projectQuestionReport} from '../../question-simulation/report.ts';
import {questionRunErrorMessage} from '../../question-simulation/errors.ts';
import type {SimulationResponse} from '../../map-contract.ts';
import {createDefaultEldercareRequest} from '../../eldercare/api-contract.ts';
import {calculateEldercare} from '../../server/eldercare-service.ts';

// Local test generator only: no HTTP transport, provider key or paid inference.
async function fixture(partial=false){
 const question='What if Singapore increased tax on imported goods?';
 const run=await runStakeholderSimulation(createLiveInput('import-tax',question),{attemptId:partial?'ui-partial':'ui-complete',provider:'openrouter',model:INFERENCE_MODEL,generateTurn:async context=>{if(partial&&context.turnIndex===1)throw new Error('test interruption');return deterministicTurn(context);}});
 const records:InferenceDiagnosticsV1['records']=run.events.map((_,index)=>({requestedModel:INFERENCE_MODEL,requestedProvider:'digitalocean',servingModel:INFERENCE_MODEL,servingProvider:'DigitalOcean',identityVerification:'completion',generationId:`test-${index}`,inputTokens:null,outputTokens:null,totalTokens:null,costUsd:null,status:'accepted',errorCode:null,durationMs:1}));
 if(partial)records.push({requestedModel:INFERENCE_MODEL,requestedProvider:'digitalocean',servingModel:null,servingProvider:null,identityVerification:'unverified',generationId:null,inputTokens:null,outputTokens:null,totalTokens:null,costUsd:null,status:'failed',errorCode:'AI_UPSTREAM',durationMs:1});
 const inference:InferenceDiagnosticsV1={version:1,requestedModel:INFERENCE_MODEL,requestedProvider:'digitalocean',allowFallbacks:false,successfulCalls:run.events.length,failedCalls:partial?1:0,retries:0,inputTokens:null,outputTokens:null,totalTokens:null,costUsd:null,reservedTokens:10000,reservationBasis:'Conservative UTF-8 bytes plus bounded output; not billed usage.',durationMs:100,roundsCompleted:partial?0:2,activeAgents:4,records,limits:INFERENCE_LIMITS};
 return {question,run,inference};
}

function render(props:unknown,exportName='default'){
 const url=new URL('../../../components/question-console.tsx',import.meta.url).href;
 const script=`import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import babel from 'next/dist/compiled/babel/core.js';import typescript from 'next/dist/compiled/babel/preset-typescript.js';import react from 'next/dist/compiled/babel/preset-react.js';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';registerHooks({resolve(s,c,n){if(s.startsWith('.')&&c.parentURL){for(const suffix of ['.tsx','.ts']){const u=new URL(s+suffix,c.parentURL);if(existsSync(u))return n(u.href,c);}}return n(s,c);},load(u,c,n){if(u.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(u.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[typescript,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return n(u,c);}});const mod=await import(${JSON.stringify(url)});const props=JSON.parse(readFileSync(0,'utf8'));const noop=()=>{};process.stdout.write(renderToStaticMarkup(createElement(mod[${JSON.stringify(exportName)}],{onQuestion:noop,onStart:noop,onCancel:noop,onMap:noop,onGraph:noop,onReport:noop,onScripted:noop,onRefreshStatus:noop,mrt:null,aac:null,...props})));`;
 const result=spawnSync(process.execPath,['--input-type=module','--eval',script],{input:JSON.stringify(props),encoding:'utf8',timeout:15000});
 assert.equal(result.status,0,result.stderr);return result.stdout;
}
function state(question:string){return {question,scope:classifyQuestionContext(question),phase:'error',revision:1,attemptId:'test-ui',error:'Live inference is unavailable.',history:[],selectedArchiveId:null,plan:null,record:null,run:null,linked:null,live:null,executionMode:'live',inferenceStatus:null};}

test('report retains validated live accounting and rejects accounting detached from the accepted run',async()=>{
 const {question,run,inference}=await fixture(true),context=classifyQuestionContext(question);
 const report=await projectQuestionReport({context,run,inference} as Parameters<typeof projectQuestionReport>[0]);
 assert.deepEqual((report as typeof report & {inference?:InferenceDiagnosticsV1}).inference,inference);
 assert.equal(report.runStatus,'partial');assert.equal(report.executionMode,'llm-assisted');
 await assert.rejects(projectQuestionReport({context,inference} as Parameters<typeof projectQuestionReport>[0]));
 await assert.rejects(projectQuestionReport({context,run,inference:{...inference,successfulCalls:0}} as Parameters<typeof projectQuestionReport>[0]));
 const unrelated=await fixture();await assert.rejects(projectQuestionReport({context,run:unrelated.run,inference} as Parameters<typeof projectQuestionReport>[0]));
});

test('recorded live playback retains accepted partial events and exposes unknown usage and failed calls',async()=>{
 const {question,run,inference}=await fixture(true);
 const html=render({question,report:true,state:{...state(question),phase:'partial',run,live:{version:1,domain:'import-tax',response:{version:2,attemptId:run.attemptId,run,inference}}}});
 assert.match(html,/Recorded LLM interaction playback/);assert.match(html,/partial/);assert.match(html,/AI_UPSTREAM/);
 assert.equal([...html.matchAll(/data-event-id=/g)].length,1);
 assert.match(html,/Unknown/);assert.match(html,/Failed calls/);assert.match(html,/DigitalOcean/);
 assert.doesNotMatch(html,/Deterministic fictional stakeholder script|Recorded scripted exploration|\$0\.0000/);
});

test('live execution shows a waiting state without fabricated playback or streaming',()=>{
 const question='What if Singapore leaves ASEAN?';const html=render({question,state:{...state(question),phase:'executing',error:null}});
 assert.match(html,/Executing live inference/);assert.match(html,/accepted result/i);assert.doesNotMatch(html,/data-event-id=|Recorded LLM interaction playback/);
});

test('explicit scripted action is available only for narrow ASEAN questions after live failure',()=>{
 for(const [question,allowed] of [['What if Singapore leaves ASEAN?',true],['What if Singapore increased tax on imported goods?',false],['What if Malaysia leaves ASEAN?',false],['What if Singapore stays in ASEAN?',false]] as const){
  const html=render({question,state:state(question)});
  assert.equal(html.includes('Run scripted ASEAN demonstration'),allowed,question);
 }
});

test('connection details distinguish configuration from serving identity verification',()=>{
 const question='What if Singapore leaves ASEAN?';const html=render({question,landing:true,state:{...state(question),phase:'idle',error:null,inferenceStatus:{version:1,model:INFERENCE_MODEL,gateway:'OpenRouter',provider:'digitalocean',fallback:false,connection:'configured',enabled:true,servingIdentityVerified:false,limits:INFERENCE_LIMITS}}});
 assert.match(html,/configured/i);assert.match(html,/not verified/i);assert.match(html,/Fallbacks disabled/i);assert.match(html,/OpenRouter/);assert.match(html,/120000/);
});

test('accepted native MRT and AAC reports recover local heuristic scope after geometry clears preparation',async()=>{
 const mrt:SimulationResponse={serviceDate:'2026-10-27',model:'static-median-travel-time',comparisons:[]};
 const aac=await calculateEldercare(createDefaultEldercareRequest('native-report-scope'));
 for(const [question,result] of [['What if Singapore builds a new MRT line?',{mrt}],['What if a new AAC opens in Singapore?',{aac}]] as const){
  const snapshot={...state(question),phase:'idle',scope:null,error:null};
  const html=render({question,state:snapshot,report:true,...result});
  assert.match(html,/Modelled accessibility report/);assert.match(html,/local scope/);assert.match(html,/heuristic interpretation/);assert.match(html,/Scenario interpretation/);assert.match(html,/Within Singapore/);
  assert.doesNotMatch(html,/International and cross-border relevance|Ready when you are|data-event-id=|Recorded LLM interaction playback/);
  const stale=render({question:'What if Singapore increases tax on imported goods?',state:snapshot,report:true,...result});
  assert.doesNotMatch(stale,/local scope|Scenario interpretation|Within Singapore/);
 }
 const question='What if Singapore builds a new MRT line?';
 assert.doesNotMatch(render({question,report:true,state:{...state(question),phase:'idle',scope:null,error:null}}),/local scope|Within Singapore/);
});

test('partial execution accounting names configured roles and explains a soft cost limit can overshoot',async()=>{
 const {run,inference}=await fixture(true);
 const html=render({run,inference},'InferenceDiagnostics');
 assert.match(html,/Configured fictional roles/);assert.doesNotMatch(html,/Active fictional agents/);
 assert.match(html,/one call/i);assert.match(html,/overshoot/i);assert.match(html,/not a prepaid guarantee/i);
});
test('reports disclose actual supplied preset assumptions without introducing editable setup fields',async()=>{
 const {question,run}=await fixture();const html=render({question,report:true,state:{...state(question),phase:'completed',error:null,run}});
 assert.match(html,/Assumptions supplied to the participants/);assert.match(html,/Scenario and preset inputs/);
 for(const assumption of run.inputSnapshot.assumptions){assert.ok(html.includes(assumption.label));assert.ok(html.includes(assumption.value));}
 assert.doesNotMatch(html,/<textarea|<input/);
});

test('inherited object names cannot escape the finite run error message lookup',async()=>{
 const {run}=await fixture(true);
 assert.ok(run.error);
 for(const code of ['constructor','toString','__proto__']){
  const copy=structuredClone(run);copy.error={...run.error,code};
  assert.equal(questionRunErrorMessage(copy),'This execution did not complete safely.');
 }
});
