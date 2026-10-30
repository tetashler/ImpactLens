import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import type {KnowledgeGraph} from '../../knowledge-graph/contract.ts';

/** Render the actual client component using Next's already installed TSX loader. */
function render(component:string,props:unknown,exportName='default'){
  const url=new URL(`../../../components/${component}.tsx`,import.meta.url).href;
  const script=`import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import babel from 'next/dist/compiled/babel/core.js';import typescript from 'next/dist/compiled/babel/preset-typescript.js';import react from 'next/dist/compiled/babel/preset-react.js';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';registerHooks({resolve(s,c,n){if(s.startsWith('.')&&c.parentURL){for(const suffix of ['.tsx','.ts']){const u=new URL(s+suffix,c.parentURL);if(existsSync(u))return n(u.href,c);}}return n(s,c);},load(u,c,n){if(u.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(u.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[typescript,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return n(u,c);}});const mod=await import(${JSON.stringify(url)});process.stdout.write(renderToStaticMarkup(createElement(mod[${JSON.stringify(exportName)}],{...JSON.parse(readFileSync(0,'utf8')),onReturn(){}})));`;
  const result=spawnSync(process.execPath,['--input-type=module','--eval',script],{input:JSON.stringify(props),encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stderr);return result.stdout;
}
const provenance={kind:'synthetic-exploratory' as const,reference:'Safe fictional UI fixture'};
const graph:KnowledgeGraph={version:1,scenarioIdentity:'phase4e-ui',nodes:[
  {id:'entity',label:'Transport agency',entityType:'Agency',category:'planning',description:'Scenario entity.',properties:{presentationCategory:'entity',presentationPrimary:true},provenance,limitations:[]},
  {id:'person',label:'Fictional background commuter',entityType:'Fictional person',category:'planning',description:'Activity counts only.',properties:{presentationCategory:'person',presentationPrimary:false,events:7},provenance,limitations:[]},
],edges:[],limitations:[]};

test('desktop entity index foregrounds scenario entities and explains how to discover background people',()=>{
  const html=render('knowledge-workspace',{graph,visible:true});
  const index=html.match(/<div class="kg-entity-index">[\s\S]*?<p class="kg-source-note">/)?.[0]??'';
  assert.match(index,/Transport agency/);
  assert.doesNotMatch(index,/Fictional background commuter/);
  assert.match(html,/1 background person available through search/);
  assert.match(html,/aria-label="Graph node shapes"/);
  assert.match(html,/aria-label="Graph view controls"/);
});

test('inspectors show grounded activity counts without exposing presentation implementation fields',()=>{
  const html=render('knowledge-workspace',{graph,node:graph.nodes[1]},'KnowledgeInspectorContent');
  assert.match(html,/>Events<\/dt><dd>7<\/dd>/);
  assert.doesNotMatch(html,/Presentation Category|Presentation Primary/);
});

test('duplicate entity labels expose distinct canonical search result controls',()=>{
  const duplicate=structuredClone(graph);duplicate.nodes.push({...structuredClone(graph.nodes[0]),id:'role-agent'});
  const html=render('knowledge-workspace',{graph:duplicate,visible:true});
  const controls=[...html.matchAll(/<button[^>]*data-entity-id="([^"]+)"[^>]*>[\s\S]*?<\/button>/g)];
  assert.deepEqual(controls.map(match=>match[1]).sort(),['entity','role-agent']);
  for(const control of controls)assert.match(control[0],/Transport agency/);
});

function report(swarm?:Record<string,unknown>){
  return {version:3,kind:'summary-execution',attemptId:'mock',requestIdentity:'mock',runId:'mock',planId:null,question:'Fictional transport scenario',status:'completed',request:null,graph,inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:null,actionCalls:null,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:null,society:{version:2,runId:'mock',worldId:'mock',phase:'completed',tick:2,totalSteps:2,minutes:30,counts:{agents:50,events:80,seeds:0,modelEvents:11,ruleEvents:69,failureEvents:0},platforms:[],groups:[],agents:[],links:[],map:{},usage:{calls:12,skipped:0,accepted:11,failed:1,inputTokens:null,outputTokens:null,costUsd:null,unknownReservedUsd:0},limitations:[],...(swarm?{swarm}:{})}};
}

test('communication report distinguishes capability, opportunity and accepted decisions from authored activity',()=>{
  const html=render('communication-report',{result:report({version:1,activeAgents:50,llmCapableAgents:35,ruleDrivenAgents:15,offeredAgents:10,acceptedAgents:9,opportunities:12,acceptedDecisions:11,rejectedDecisions:1,skippedDecisions:0,modelAuthoredItems:4,ruleAuthoredItems:20,reads:30,reactions:15,deterministicStateChanges:8,maxPerAgent:2,maxCalls:64,perAgent:[]})});
  assert.match(html,/35<\/strong><span>LLM-capable agents/);
  assert.match(html,/10<\/strong><span>offered a decision/);
  assert.match(html,/9<\/strong><span>agents with an accepted decision/);
  assert.match(html,/4 model-authored/);
  assert.match(html,/20 rule-authored/);
  assert.match(html,/30 reads/);
  assert.match(html,/15 reactions/);
  assert.match(html,/capability does not mean a call was made/i);
});

test('historical communication reports leave unavailable cohort metrics unasserted',()=>{
  const html=render('communication-report',{result:report()});
  assert.match(html,/Recorded fictional communication/);
  assert.doesNotMatch(html,/LLM-capable agents|offered a decision|accepted a decision/);
  assert.match(html,/Reported social USD: Unknown/);
});
