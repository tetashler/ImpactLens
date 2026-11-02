import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {KnowledgeGraph,KnowledgeNode} from '../../knowledge-graph/contract.ts';

const componentUrl=new URL('../../../components/knowledge-workspace.tsx',import.meta.url);
const require=createRequire(import.meta.url),babel=require('next/dist/compiled/babel/core');
const source=await readFile(componentUrl,'utf8');
const js:string=babel.transformSync(source.replace(/import ['"][^'"]+\.css['"];?/g,''),{filename:'knowledge-workspace.tsx',babelrc:false,configFile:false,presets:[[require.resolve('next/dist/compiled/babel/preset-typescript'),{allExtensions:true,isTSX:true}],[require.resolve('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]]}).code;
const resolved=js.replace(/from (['"])([^'"]+)\1/g,(_match,quote,specifier:string)=>`from ${quote}${specifier.startsWith('.')?new URL(`${specifier}.ts`,componentUrl).href:pathToFileURL(require.resolve(specifier)).href}${quote}`);
const {KnowledgeInspectorContent,default:KnowledgeWorkspace}=await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`);
const node=(id:string,recordType:string):KnowledgeNode=>({id,label:id,category:'population',description:'Scenario context.',properties:{recordType,members:34,recordedEvents:27,countScope:'Candidates overlap this aggregate.'},provenance:{kind:'synthetic-exploratory',reference:'Fictional fixture'},limitations:[]});
const nodes=[node('group','fictional-agent-aggregate'),node('private','fictional-messaging-group'),node('commute','citizen-commute-aggregate'),node('person','fictional-agent'),node('entity','world-entity')];
const graph:KnowledgeGraph={version:1,scenarioIdentity:'scenario-a',executionIdentity:'run-a',nodes,edges:[],limitations:[]};
const artifact={version:1,runId:'run-a',snapshotKey:'snapshot-a',generatedAt:'2026-11-02T00:00:00.000Z',totalNodes:5,summaries:nodes.map(n=>({nodeId:n.id,summary:`Useful AI explanation for ${n.id}. <script>unsafe()</script>`}))};
const state=(overrides:Record<string,unknown>={})=>({runId:'run-a',snapshotKey:'snapshot-a',artifact,phase:'complete',error:'',retry(){throw Error('Rendering must not request a retry');},...overrides});
function visible(html:string):string {let depth=0,text='';for(const token of html.match(/<[^>]+>|[^<]+/g)??[]){if(/^<details\b/.test(token))depth++;else if(/^<\/details>/.test(token))depth--;else if(depth===0&&!token.startsWith('<'))text+=token;}return text;}

test('all node kinds use their own AI explanation in every inspector size and preserve closed accounting',()=>{
  for(const n of nodes)for(const options of [{compact:true},{},{full:true}]){
    const html=renderToStaticMarkup(createElement(KnowledgeInspectorContent,{graph,node:n,nodeSummaries:state(),savedSummary:'Legacy quick report summary.',...options}));
    assert.match(visible(html),/AI summary/);
    assert.match(visible(html),new RegExp(`Useful AI explanation for ${n.id}`));
    assert.doesNotMatch(visible(html),/Legacy quick report|Candidates overlap|Recorded Events|27/);
    assert.match(html,/Candidates overlap/);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
  }
});

test('waiting nodes show preparation without presenting deterministic context as an AI summary',()=>{
  const html=renderToStaticMarkup(createElement(KnowledgeInspectorContent,{graph,node:nodes[0],nodeSummaries:state({artifact:{...artifact,summaries:[]},phase:'generating'}),savedSummary:'Old report text.'}));
  assert.match(visible(html),/AI summary/);assert.match(visible(html),/preparing|being prepared|waiting/i);
  assert.doesNotMatch(visible(html),/Old report text|calculated group|34|overlap/i);
});

test('stale runs and snapshots never attach old text to selected nodes',()=>{
  for(const overrides of [{runId:'old-run'},{snapshotKey:'new-snapshot'},{artifact:{...artifact,runId:'old-run'}}]){
    const html=renderToStaticMarkup(createElement(KnowledgeInspectorContent,{graph,node:nodes[0],nodeSummaries:state(overrides)}));
    assert.doesNotMatch(visible(html),/Useful AI explanation/);
  }
  const html=renderToStaticMarkup(createElement(KnowledgeInspectorContent,{graph,node:{...nodes[0],id:'missing-node'},nodeSummaries:state()}));
  assert.doesNotMatch(visible(html),/Useful AI explanation/);
});

test('failed preparation retains available AI text and offers an explicit retry',()=>{
  const html=renderToStaticMarkup(createElement(KnowledgeInspectorContent,{graph,node:nodes[0],nodeSummaries:state({phase:'error',error:'Summary preparation failed.'})}));
  assert.match(visible(html),/Useful AI explanation for group/);assert.match(visible(html),/Summary preparation failed/);
  assert.match(html,/<button[^>]*>Retry summaries<\/button>/);
});

test('graph progress counts saved node explanations and keeps retry visible without selecting a node',()=>{
  const run={runId:'run-a',graph,question:'Should Singapore add a new MRT station?',initialActions:[],society:null};
  const html=renderToStaticMarkup(createElement(KnowledgeWorkspace,{graph,reportRun:run,visible:true,onReturn(){},nodeSummaries:state({artifact:{...artifact,summaries:artifact.summaries.slice(0,2)},phase:'error',error:'Preparation stopped.'})}));
  assert.match(html,/2\s*(?:of|\/)\s*5/);assert.match(html,/Retry summaries/);assert.match(html,/Preparation stopped/);
});
