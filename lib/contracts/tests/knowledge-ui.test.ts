import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {type KnowledgeGraph} from '../../knowledge-graph/contract.ts';
import {graphElements} from '../../knowledge-graph/renderer.ts';
import type {PublicExplore} from '../../society/public-contract.ts';

/** Exercise the actual React component with the repository's existing TSX loader.
 * Effects intentionally do not run during SSR; browser tests own the renderer and
 * selection/inspector transitions. No DOM or second test framework is installed. */
function renderKnowledge(graph:KnowledgeGraph|null,visible=true,reportRun?:PublicExplore|null):string {
  const component=new URL('../../../components/knowledge-workspace.tsx',import.meta.url).href;
  const script=`
    import {registerHooks} from 'node:module';
    import {readFileSync,existsSync} from 'node:fs';
    import babel from 'next/dist/compiled/babel/core.js';
    import typescript from 'next/dist/compiled/babel/preset-typescript.js';
    import react from 'next/dist/compiled/babel/preset-react.js';
    import {createElement} from 'react';
    import {renderToStaticMarkup} from 'react-dom/server';
    registerHooks({
      resolve(specifier,context,next){if(specifier.startsWith('.')&&context.parentURL){for(const suffix of ['.tsx','.ts']){const candidate=new URL(specifier+suffix,context.parentURL);if(existsSync(candidate))return next(candidate.href,context);}}return next(specifier,context);},
      load(url,context,next){if(url.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(url.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(url),'utf8'),{filename:new URL(url).pathname,presets:[[typescript,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return next(url,context);}
    });
    const {default:KnowledgeWorkspace}=await import(${JSON.stringify(component)});
    const props=JSON.parse(readFileSync(0,'utf8'));
    process.stdout.write(renderToStaticMarkup(createElement(KnowledgeWorkspace,{...props,onReturn(){}})));
  `;
  const result=spawnSync(process.execPath,['--input-type=module','--eval',script],{input:JSON.stringify({graph,visible,reportRun}),encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stderr||result.error?.message||'React SSR child did not finish successfully');
  return result.stdout;
}

const hostileLabel='<img src=x onerror="globalThis.__pwned=1">';
const graph:KnowledgeGraph={version:1,scenarioIdentity:'ssr-ui-test',limitations:['<script>globalThis.__pwned=1</script>'],nodes:[{
  id:'scenario',label:hostileLabel,category:'scenario',description:'<svg onload="globalThis.__pwned=1">',
  provenance:{kind:'user-authored',reference:'SSR hostile-content test fixture'},
  properties:{caption:'<iframe src="javascript:alert(1)">',population:null},limitations:['Test input is not evidence.'],
}],edges:[]};

test('graph footer uses matching job progress and accepted decisions, with a legacy summary fallback',()=>{
 const current={...graph,executionIdentity:'run-live'};
 const run={runId:'run-live',graph:current,question:'A scenario',initialActions:[],session:null,society:{tick:80,totalSteps:320,usage:{calls:99,accepted:7}},job:{tick:120,totalSteps:320,acceptedDecisions:18}} as unknown as PublicExplore;
 const html=renderKnowledge(current,true,run);
 assert.match(html,/Step 120 \/ 320/);
 assert.match(html,/Accepted decisions 18/);
 assert.doesNotMatch(html,/Accepted decisions 99/,'Provider calls are not accepted decisions');
 const fallback=renderKnowledge(current,true,{...run,job:undefined});
 assert.match(fallback,/Step 80 \/ 320/);assert.match(fallback,/Accepted decisions 7/);
 const zero=renderKnowledge(current,true,{...run,job:{...run.job!,tick:0,acceptedDecisions:0}});
 assert.match(zero,/Step 0 \/ 320/);assert.match(zero,/Accepted decisions 0/);
});

test('graph footer never borrows simulation counters from an unrelated or unavailable run',()=>{
 const current={...graph,executionIdentity:'archived-run'};
 const other={runId:'different-run',graph:current,session:null,society:{tick:200,totalSteps:320,usage:{calls:99,accepted:30}},initialActions:[]} as unknown as PublicExplore;
 for(const html of [renderKnowledge(current,true,other),renderKnowledge(current),renderKnowledge(null)])assert.doesNotMatch(html,/kg-simulation-progress|Accepted decisions|Step \d/);
});

test('knowledge view preserves its renderer across tab changes and offers three inspector sizes',()=>{
  const workspace=readFileSync(new URL('../../../components/workspace.tsx',import.meta.url),'utf8');
  const view=readFileSync(new URL('../../../components/knowledge-workspace.tsx',import.meta.url),'utf8');
  assert.ok(!workspace.includes("{tab==='knowledge'&&<KnowledgeWorkspace"));
  for(const label of ['Expand inspector','Full-window details','Back to inspector','Search graph'])assert.ok(view.includes(label),label);
  assert.ok(view.includes('showModal()'));
  assert.ok(view.includes('dispose()'));
  assert.ok(!view.includes('dangerouslySetInnerHTML'));
});

test('actual React markup escapes hostile scenario labels and limitations without executable elements',()=>{
  const html=renderKnowledge(graph);
  assert.match(html,/&lt;img src=x onerror=&quot;globalThis\.__pwned=1&quot;&gt;/);
  assert.match(html,/&lt;script&gt;globalThis\.__pwned=1&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<(?:img|script|svg|iframe)\b/i);
  assert.match(html,/aria-pressed="false"/);
  // Property/description details wait for selection. Their hostile values must
  // neither become hidden HTML nor be inserted into an executable script blob.
  assert.doesNotMatch(html,/<iframe|javascript:alert\(1\)/i);
});

test('actual React markup exposes labelled search, category checkboxes and keyboard entity buttons',()=>{
  const html=renderKnowledge(graph);
  assert.match(html,/<section[^>]*aria-label="Knowledge Graph"/);
  assert.match(html,/<aside[^>]*aria-label="Graph exploration"/);
  assert.match(html,/<label[^>]*>Search graph<input type="search"/);
  assert.equal([...html.matchAll(/type="checkbox"/g)].length,2); // One present entity type and the edge-label control.
  assert.ok(html.includes('<span>Scenario</span>'));
  assert.ok(!html.includes('<span>Infrastructure</span>'));
  assert.match(html,/<h2>Entity index/);
  assert.match(html,/<button[^>]*aria-pressed="false"[^>]*>/);
  assert.match(html,/Interactive relationship network\. Use the entity index for keyboard selection\./);
  for(const label of ['Fit Graph','Back to Map'])assert.ok(html.includes(label),label);
});

test('empty graph renders an honest recovery action and hidden tab keeps semantic hidden state',()=>{
  const html=renderKnowledge(null);
  assert.match(html,/World entities are not available/);
  assert.match(html,/No matching entities\. Adjust your search or filters\./);
  assert.match(html,/>Back to Map<\/button>/);
  assert.match(html,/This view does not retrieve documents or execute stakeholder turns\./);
  assert.doesNotMatch(html,/GraphRAG.*(?:completed|executed|operational)/i);
  const hidden=renderKnowledge(graph,false);
  assert.match(hidden,/<section class="kg-workspace" hidden="" aria-label="Knowledge Graph"/);
});

test('canvas, filter swatches and entity index share the complete graph categorical colours',()=>{
 const names=['Community Facility','Discussion environment','Fictional participant aggregate','Grounded fictional citizen aggregate','MRT Line','Neighbourhood','Proposed Station','Resident','stakeholder'];
 const fixture:KnowledgeGraph={...graph,nodes:names.map((entityType,i)=>({...graph.nodes[0],id:`colour-${i}`,label:`Entity ${i}`,entityType}))};
 const html=renderKnowledge(fixture),canvas=graphElements(fixture);
 const colours=names.map((name,i)=>{
  const colour=canvas.find(item=>item.data.id===`colour-${i}`)!.data.colour;
  const filter=html.match(new RegExp(`<label><input[^>]*\\/><i style="background:([^"]+)"[^>]*><\\/i><span>${name}<\\/span>`));
  const index=html.match(new RegExp(`<button[^>]*data-entity-id="colour-${i}"[^>]*><i style="background:([^"]+)"`));
  assert.equal(filter?.[1],colour,`${name} filter matches the canvas`);
  assert.equal(index?.[1],colour,`${name} index matches the canvas`);
  return colour;
 });
 assert.equal(new Set(colours).size,names.length);
 assert.doesNotMatch(html,/Colour: entity type/);
});
