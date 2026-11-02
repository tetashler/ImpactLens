import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ComponentType} from 'react';
import type {KnowledgeGraph} from '../../knowledge-graph/contract.ts';

// Render the real component without a Next server or browser. Only CSS loading
// is omitted; imports still use the production graph helpers and React runtime.
const componentUrl=new URL('../../../components/knowledge-workspace.tsx',import.meta.url);
const require=createRequire(import.meta.url);
const babel=require('next/dist/compiled/babel/core');
let workspace:Promise<ComponentType<{graph:KnowledgeGraph|null;visible:boolean;onReturn:()=>void}>>|undefined;
function loadWorkspace(){
  return workspace??=readFile(componentUrl,'utf8').then(async source=>{
    const js:string=babel.transformSync(source.replace(/import ['"][^'"]+\.css['"];?/g,''),{filename:'knowledge-workspace.tsx',babelrc:false,configFile:false,presets:[[require.resolve('next/dist/compiled/babel/preset-typescript'),{allExtensions:true,isTSX:true}],[require.resolve('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]]}).code;
    const resolved=js.replace(/from (['"])([^'"]+)\1/g,(_match,quote,specifier:string)=>{
      const url=specifier.startsWith('.')?new URL(`${specifier}.ts`,componentUrl).href:pathToFileURL(require.resolve(specifier)).href;
      return `from ${quote}${url}${quote}`;
    });
    return (await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`)).default;
  });
}
const provenance={kind:'synthetic-exploratory' as const,reference:'Generated hypothesis; not independently verified.'};
function graph():KnowledgeGraph{
  return {version:1,scenarioIdentity:'world-ui',nodes:[
    {id:'sg',label:'Singapore',category:'geography',entityType:'Country',description:'Country context',properties:{},limitations:[],provenance},
    {id:'my',label:'Malaysia',category:'geography',entityType:'Country',description:'Country context',properties:{},limitations:[],provenance},
    {id:'tax',label:'Import tax',category:'assumption',entityType:'Trade policy',description:'Policy hypothesis',properties:{},limitations:[],provenance},
  ],edges:[],limitations:[]};
}
async function render(value:KnowledgeGraph|null){const Workspace=await loadWorkspace();return renderToStaticMarkup(createElement(Workspace,{graph:value,visible:true,onReturn:()=>{}}));}

test('workspace legend reflects only actual entity types, with counts and readable names',async()=>{
  const html=await render(graph());
  const legend=html.match(/<details class="kg-filters"[\s\S]*?<\/details>/)?.[0]??'';
  assert.match(legend,/>Country<\/span><small>2<\/small>/);
  assert.match(legend,/>Trade policy<\/span><small>1<\/small>/);
  assert.equal((legend.match(/type="checkbox"/g)??[]).length,2);
  assert.doesNotMatch(legend,/Infrastructure|Geography|Limitation/);
  assert.match(html,/Singapore<small>Country<\/small>/);
});

test('empty workspace has no invented entity types',async()=>{
  const html=await render(null),legend=html.match(/<details class="kg-filters"[\s\S]*?<\/details>/)?.[0]??'';
  assert.equal((legend.match(/type="checkbox"/g)??[]).length,0);
  assert.match(html,/World entities are not available/);
});

test('layout, view, fit and labels are distinct accessible controls',async()=>{
  const html=await render(graph());
  for(const label of ['Fit Graph','Reset Layout'])assert.match(html,new RegExp(`>${label}<\\/button>`));
  assert.match(html,/<label[^>]*>[\s\S]*?type="checkbox"[^>]*[\s\S]*?Edge labels<\/label>/);
  assert.match(html,/Motion settles after release/);
  assert.doesNotMatch(html,/documented relationships|A documented relationship/);
});
