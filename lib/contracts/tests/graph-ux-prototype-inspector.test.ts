import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {KnowledgeGraph,KnowledgeNode} from '../../knowledge-graph/contract.ts';

// Render the actual inspector, omitting CSS through the installed Next Babel loader.
const componentUrl=new URL('../../../components/knowledge-workspace.tsx',import.meta.url);
const require=createRequire(import.meta.url),babel=require('next/dist/compiled/babel/core');
const source=await readFile(componentUrl,'utf8');
const js:string=babel.transformSync(source.replace(/import ['"][^'"]+\.css['"];?/g,''),{filename:'knowledge-workspace.tsx',babelrc:false,configFile:false,presets:[[require.resolve('next/dist/compiled/babel/preset-typescript'),{allExtensions:true,isTSX:true}],[require.resolve('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]]}).code;
const resolved=js.replace(/from (['"])([^'"]+)\1/g,(_match,quote,specifier:string)=>`from ${quote}${specifier.startsWith('.')?new URL(`${specifier}.ts`,componentUrl).href:pathToFileURL(require.resolve(specifier)).href}${quote}`);
const {KnowledgeInspectorContent}=await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`);
const node:KnowledgeNode={id:'technical-node-reference',label:'A canonical name that must stay inspectable',category:'population',description:'A unique original description.',properties:{recordType:'fictional-agent',agentId:'a',persistentGoal:'Keep travel affordable',recordedEvents:0},provenance:{kind:'synthetic-exploratory',reference:'technical-provenance-reference'},limitations:[]};
const graph:KnowledgeGraph={version:1,scenarioIdentity:'graph-ux-prototype-inspector',nodes:[node],edges:[],limitations:[]};
function initiallyVisible(html:string):string {let depth=0,text='';for(const token of html.match(/<[^>]+>|[^<]+/g)??[]){if(/^<details\b/.test(token))depth++;else if(/^<\/details>/.test(token))depth--;else if(depth===0&&!token.startsWith('<'))text+=token;}return text;}

test('every inspector size leads with useful summary and keeps original description without immediate duplication',()=>{
  for(const options of [{compact:true},{},{full:true}]){
    const html=renderToStaticMarkup(createElement(KnowledgeInspectorContent,{graph,node,...options}));
    assert.match(html,/kg-node-summary/);
    assert.ok(html.indexOf('fictional participant')<html.indexOf('kg-provenance'));
    assert.match(html,/Keep travel affordable/);
    assert.equal(html.split(node.description).length-1,1);
    assert.match(html,/<summary>Original description<\/summary>/);
    if(!('compact' in options)){assert.match(html,/technical-node-reference/);assert.match(html,/technical-provenance-reference/);}
  }
});

test('platform inspectors lead with a readable narrative and keep activity metadata closed in every size',()=>{
  const platform={...node,label:'Reddit',properties:{recordType:'communication-platform',participants:42,posts:20,discussionSummary:'Recorded 20 posts and 0 classified decisions.',themes:'Topic classification coverage: zero',discussionTimeline:'Turn 17',arguments:'No argument detail'}};
  for(const options of [{compact:true},{},{full:true}]){
    const html=renderToStaticMarkup(createElement(KnowledgeInspectorContent,{graph,node:platform,summaryContext:{question:'Should we build another MRT station?',socialCalls:0,initialStatements:20},...options}));
    const visible=initiallyVisible(html);
    assert.match(visible,/Reddit/);assert.match(visible,/initial views/i);
    assert.doesNotMatch(visible,/20 posts|classified decisions|Topic classification|Turn 17|42|technical-provenance-reference/);
    assert.match(html,/<details class="kg-activity-details"><summary>Activity and technical details<\/summary>/);
    assert.match(html,/Recorded 20 posts/);assert.match(html,/technical-provenance-reference/);
  }
});

test('a saved node narrative replaces the deterministic introduction without rendering HTML',()=>{
  const html=renderToStaticMarkup(createElement(KnowledgeInspectorContent,{graph,node,savedSummary:'Travel costs matter to this participant. <script>bad()</script>',full:true}));
  const visible=initiallyVisible(html);
  assert.match(visible,/Travel costs matter/);assert.doesNotMatch(visible,/A fictional participant/);
  assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
});

test('relationship inspectors retain their description and endpoint navigation outside activity details',()=>{
  const target={...node,id:'another-node',label:'Local residents'};
  const edge={id:'relationship',source:node.id,target:target.id,relationship:'affects',description:'Explores how the proposal could affect residents.',directed:true,provenance:node.provenance};
  const html=renderToStaticMarkup(createElement(KnowledgeInspectorContent,{graph:{...graph,nodes:[node,target],edges:[edge]},edge,compact:true}));
  const visible=initiallyVisible(html);
  assert.match(visible,/Explores how the proposal could affect residents/);assert.match(visible,/Local residents/);
});

test('generic description used in the summary appears once and escaped public text remains safe',()=>{
  const entity={...node,description:'An assumed <script>unsafe()</script> context.',properties:{recordType:'world-entity'},provenance:{kind:'model-assumption',reference:'Assumed'}};
  const html=renderToStaticMarkup(createElement(KnowledgeInspectorContent,{graph,node:entity,full:true}));
  assert.equal(html.split('An assumed &lt;script&gt;unsafe()&lt;/script&gt; context.').length-1,1);
  assert.doesNotMatch(html,/<script>|Original description/);
  assert.match(html,/&lt;script&gt;/);
});
