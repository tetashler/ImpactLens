import test from 'node:test';
import assert from 'node:assert/strict';
import {GraphRenderer,createGraphCore} from '../../knowledge-graph/renderer.ts';
import type {KnowledgeGraph} from '../../knowledge-graph/contract.ts';

const graph:KnowledgeGraph={version:1,scenarioIdentity:'renderer-fixture',limitations:[],nodes:[
  ['scenario','scenario'],['station','infrastructure'],['assumption','assumption'],['other','source'],
].map(([id,category])=>({id,label:id,category:category as KnowledgeGraph['nodes'][number]['category'],description:'Renderer test fixture only.',provenance:{kind:'planning-only',reference:'Automated performance/interaction fixture'},properties:{},limitations:[]})),edges:[
  {id:'a',source:'scenario',target:'station',relationship:'contains',description:'Test relationship.',provenance:{kind:'planning-only',reference:'Renderer fixture'},directed:true},
  {id:'b',source:'scenario',target:'assumption',relationship:'uses',description:'Test relationship.',provenance:{kind:'planning-only',reference:'Renderer fixture'},directed:true},
]};

test('headless graph uses deterministic finite settled positions without changing graph input',()=>{
  const original=structuredClone(graph),a=new GraphRenderer(undefined,graph,()=>{}),b=new GraphRenderer(undefined,graph,()=>{});
  assert.deepEqual(a.snapshot().positions,b.snapshot().positions);
  assert.ok(a.snapshot().positions.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  assert.deepEqual(graph,original);
  assert.equal(a.snapshot().nodes,4);
  assert.equal(a.snapshot().edges,2);
  a.dispose();b.dispose();
});

test('selection highlights one-hop neighbours and relationships without relayout',()=>{
  const renderer=new GraphRenderer(undefined,graph,()=>{}),before=renderer.snapshot().positions;
  renderer.select('station');
  assert.ok(renderer.core.getElementById('scenario').hasClass('neighbour'));
  assert.ok(renderer.core.getElementById('station').hasClass('focused'));
  assert.ok(renderer.core.getElementById('other').hasClass('dimmed'));
  assert.ok(renderer.core.getElementById('a').hasClass('focused'));
  assert.deepEqual(renderer.snapshot().positions,before);
  renderer.select(null);
  assert.equal(renderer.core.elements('.dimmed').length,0);
  renderer.dispose();
});

test('filter hides incident edges, preserves coordinates and restores all categories',()=>{
  const renderer=new GraphRenderer(undefined,graph,()=>{}),before=renderer.snapshot().positions;
  renderer.filter(['scenario','assumption']);
  assert.equal(renderer.snapshot().visibleNodes,2);
  assert.equal(renderer.snapshot().visibleEdges,1);
  assert.deepEqual(renderer.snapshot().positions,before);
  renderer.filter(['scenario','assumption','infrastructure','source']);
  assert.equal(renderer.snapshot().visibleNodes,4);
  assert.equal(renderer.snapshot().visibleEdges,2);
  renderer.dispose();
});

test('node/edge/background picking calls selection handler and disposal releases Cytoscape',()=>{
  const selected:unknown[]=[],renderer=new GraphRenderer(undefined,graph,s=>selected.push(s));
  renderer.core.getElementById('station').emit('tap');
  renderer.core.getElementById('a').emit('tap');
  renderer.core.emit('tap');
  assert.deepEqual(selected,[{kind:'node',id:'station'},{kind:'edge',id:'a'},null]);
  renderer.dispose();renderer.dispose();
  assert.equal(renderer.core.destroyed(),true);
  renderer.resize();renderer.fit();renderer.focus('station');renderer.select(null);renderer.zoomBy(2);
});

test('focus and camera controls preserve settled positions; isolated graph core is disposable',()=>{
  const renderer=new GraphRenderer(undefined,graph,()=>{}),before=renderer.snapshot().positions;
  renderer.zoomBy(2);renderer.focus('station');renderer.resize();renderer.fit();
  assert.deepEqual(renderer.snapshot().positions,before);
  assert.ok(Number.isFinite(renderer.snapshot().zoom));
  renderer.dispose();
  const core=createGraphCore(graph);assert.equal(core.nodes().length,4);core.destroy();
});

test('performance-only 500-node fixture settles, filters and releases its core',{timeout:20000},t=>{
  const count=500,fixture:KnowledgeGraph={version:1,scenarioIdentity:'synthetic-performance-only',limitations:['Artificial renderer load fixture; never an actual scenario result.'],
    nodes:Array.from({length:count},(_,i)=>({id:`perf-${i}`,label:`Performance-only node ${i}`,category:i%5===0?'scenario':'planning',description:'Synthetic renderer load fixture only.',provenance:{kind:'planning-only',reference:'Automated performance test'},properties:{testOnly:true},limitations:[]})),
    edges:Array.from({length:count-1},(_,i)=>({id:`perf-edge-${i}`,source:`perf-${Math.floor(i/2)}`,target:`perf-${i+1}`,relationship:'plans',description:'Artificial performance-only edge.',provenance:{kind:'planning-only',reference:'Automated performance test'},directed:true}))};
  const renderer=new GraphRenderer(undefined,fixture,()=>{});
  try{
    const snap=renderer.snapshot();assert.equal(snap.nodes,500);assert.equal(snap.edges,499);
    assert.ok(snap.positions.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
    renderer.filter(['scenario']);assert.equal(renderer.snapshot().visibleNodes,100);
    t.diagnostic(`Headless 500-node / 499-edge layout: ${snap.layoutMs.toFixed(1)} ms (not browser render latency).`);
  }finally{renderer.dispose();}
  assert.equal(renderer.core.destroyed(),true);
});
