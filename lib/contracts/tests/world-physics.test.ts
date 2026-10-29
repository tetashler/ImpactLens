import test from 'node:test';
import assert from 'node:assert/strict';
import {GraphRenderer,graphElements} from '../../knowledge-graph/renderer.ts';
import type {KnowledgeGraph} from '../../knowledge-graph/contract.ts';
import {WorldPhysics} from '../../knowledge-graph/physics.ts';

const provenance={kind:'planning-only' as const,reference:'Physics interaction fixture'};
function fixture(identity:string):KnowledgeGraph {
  return {version:1,scenarioIdentity:identity,limitations:[],nodes:['a','b','c'].map(id=>({id,label:id,category:'planning',description:'Physics fixture',provenance,properties:{},limitations:[]})),edges:[{id:'ab',source:'a',target:'b',relationship:'connects',description:'Physics fixture',provenance,directed:true},{id:'bc',source:'b',target:'c',relationship:'connects',description:'Physics fixture',provenance,directed:true}]};
}

test('dynamic type filtering never aliases an identically named technical category',()=>{
 const g=fixture('type-category-collision');g.nodes[0].entityType='planning';g.nodes[1].entityType='Agency';g.nodes[2].entityType='Location';
 const r=new GraphRenderer(undefined,g,()=>{});
 try{r.filter(['planning'],'entity-type');assert.equal(r.snapshot().visibleNodes,1);assert.equal(r.core.nodes('.kg-hidden').length,2);r.filter(['planning']);assert.equal(r.snapshot().visibleNodes,3);}finally{r.dispose();}
});

test('native grab does not reheat; actual drag pins the node and moves its neighbours continuously',()=>{
  const selected:unknown[]=[],r=new GraphRenderer(undefined,fixture('drag-physics'),s=>selected.push(s));
  try {
    const node=r.core.getElementById('a'),before=r.snapshot();
    node.emit('grab');
    assert.equal(r.snapshot().physics.alphaTarget,0);
    const destination={x:node.position('x')+350,y:node.position('y')+100};
    node.position(destination);node.emit('drag');
    assert.equal(r.snapshot().physics.alphaTarget,.3);
    r.physics.tick(20);
    assert.deepEqual(node.position(),destination);
    const initialNeighbour=before.positions.find(p=>p.id==='b')!;
    assert.ok(Math.hypot(initialNeighbour.x-r.core.getElementById('b').position('x'),initialNeighbour.y-r.core.getElementById('b').position('y'))>1);
    const neighbour={...r.core.getElementById('b').position()};
    r.physics.tick(20);
    assert.ok(Math.hypot(neighbour.x-r.core.getElementById('b').position('x'),neighbour.y-r.core.getElementById('b').position('y'))>.01);
    node.emit('free');node.emit('tap');
    assert.deepEqual(node.position(),destination);
    assert.equal(r.snapshot().physics.alphaTarget,0);
    assert.deepEqual(selected,[]);
    r.physics.tick(350);
    assert.ok(r.snapshot().physics.alpha<.001);
    assert.equal(r.snapshot().physics.running,false);
    const stable=r.snapshot().positions;r.physics.tick(1);assert.deepEqual(r.snapshot().positions,stable);
    node.emit('grab');node.emit('free');node.emit('tap');
    assert.deepEqual(selected,[{kind:'node',id:'a'}]);
  }finally{r.dispose();}
});

test('dispose preserves layout and camera for matching identity; reset view and layout are explicit',()=>{
  const graph=fixture('cache-physics'),r=new GraphRenderer(undefined,graph,()=>{});
  r.core.getElementById('a').position({x:900,y:300});
  r.core.zoom(1.7);r.core.pan({x:41,y:53});
  const before=r.snapshot();r.dispose();
  const restored=new GraphRenderer(undefined,graph,()=>{});
  try {
    assert.deepEqual(restored.snapshot().positions,before.positions);
    assert.equal(restored.snapshot().zoom,1.7);assert.deepEqual(restored.snapshot().pan,{x:41,y:53});
    restored.resetView();assert.equal(restored.snapshot().zoom,1);assert.deepEqual(restored.snapshot().positions,before.positions);
    restored.resetLayout();assert.notDeepEqual(restored.snapshot().positions,before.positions);
    restored.setVisible(false);assert.equal(restored.snapshot().physics.running,false);
    restored.dispose();restored.setVisible(true);restored.resetLayout();
    assert.equal(restored.snapshot().physics.running,false);
  }finally{restored.dispose();}
});

test('parallel, opposite and self relationships get distinct geometry; labels can be toggled',()=>{
  const graph=fixture('geometry-physics');
  graph.edges.push({...graph.edges[0],id:'ba',source:'b',target:'a'},{...graph.edges[0],id:'aa',target:'a'});
  const elements=graphElements(graph);
  assert.match(String(elements.find(e=>e.data.id==='ab')?.classes),/parallel/);
  assert.match(String(elements.find(e=>e.data.id==='ba')?.classes),/parallel/);
  assert.match(String(elements.find(e=>e.data.id==='aa')?.classes),/loop/);
  assert.match(String(elements.find(e=>e.data.id==='bc')?.classes),/single/);
  const r=new GraphRenderer(undefined,graph,()=>{});
  try {
    r.setEdgeLabels(true);assert.equal(r.core.edges('.edge-label').length,4);
    r.setEdgeLabels(false);assert.equal(r.core.edges('.edge-label').length,0);
  }finally{r.dispose();}
});

test('browser physics pauses when hidden or reduced motion is enabled, and stays stopped after disposal',async()=>{
  const graph=fixture('timer-physics');let updates=0;
  const physics=new WorldPhysics(graph,[{id:'a',x:0,y:0},{id:'b',x:50,y:0},{id:'c',x:100,y:0}],true,()=>updates++);
  const pause=()=>new Promise(resolve=>setTimeout(resolve,45));
  try {
    physics.start();await pause();assert.ok(updates>0);
    physics.setVisible(false);const hidden=updates;await pause();assert.equal(updates,hidden);assert.equal(physics.snapshot().running,false);
    physics.setVisible(true);assert.equal(physics.snapshot().running,true);
    physics.setReducedMotion(true);const reduced=updates;await pause();assert.equal(updates,reduced);assert.equal(physics.snapshot().running,false);
    physics.setReducedMotion(false);await pause();assert.ok(updates>reduced);
    physics.dispose();const disposed=updates;physics.start();physics.setVisible(true);physics.tick(10);await pause();assert.equal(updates,disposed);assert.equal(physics.snapshot().running,false);
  }finally{physics.dispose();}
});

test('cache cannot restore positions from a different execution or different node set',()=>{
  const graph=fixture('cache-identity-physics'),first=new GraphRenderer(undefined,graph,()=>{});
  first.core.getElementById('a').position({x:9000,y:9000});first.dispose();
  for(const changed of [{...graph,executionIdentity:'next'},{...graph,nodes:graph.nodes.slice(0,2),edges:graph.edges.slice(0,1)},{...graph,edges:[graph.edges[0]]}]){
    const r=new GraphRenderer(undefined,changed,()=>{});
    try{assert.ok(Math.abs(r.core.getElementById('a').position('x'))<2000);}finally{r.dispose();}
  }
});

test('layout cache evicts old graphs after eight entries',()=>{
  for(let i=0;i<9;i++){
    const r=new GraphRenderer(undefined,fixture(`cache-bound-${i}`),()=>{});
    if(i===0)r.core.getElementById('a').position({x:9000,y:9000});r.dispose();
  }
  const restored=new GraphRenderer(undefined,fixture('cache-bound-0'),()=>{});
  try{assert.ok(Math.abs(restored.core.getElementById('a').position('x'))<2000);}finally{restored.dispose();}
});

test('a completed drag cannot suppress a later keyboard-style node tap',async()=>{
  const selected:unknown[]=[],r=new GraphRenderer(undefined,fixture('later-tap-physics'),s=>selected.push(s));
  try {
    const node=r.core.getElementById('a');node.emit('grab');node.position({x:500,y:300});node.emit('drag');node.emit('free');
    await new Promise(resolve=>setTimeout(resolve,150));node.emit('tap');
    assert.deepEqual(selected,[{kind:'node',id:'a'}]);
  }finally{r.dispose();}
});

test('an explicit layout reset settles once with reduced motion and leaves no active timer',()=>{
  const graph=fixture('reduced-reset-physics'),seeds=[{id:'a',x:0,y:0},{id:'b',x:50,y:0},{id:'c',x:100,y:0}];
  const physics=new WorldPhysics(graph,seeds,true,()=>{});
  try {
    physics.setReducedMotion(true);physics.reset(seeds);
    assert.ok(Math.abs(physics.nodes[0].x)>1);assert.equal(physics.snapshot().alpha,0);assert.equal(physics.snapshot().running,false);
  }finally{physics.dispose();}
});

test('dense relationship labels hide at low zoom and entity-type filtering keeps incident edges honest',()=>{
  const graph=fixture('dense-physics');graph.nodes[0].entityType='Agency';graph.nodes[1].entityType='Agency';graph.nodes[2].entityType='Location';
  graph.edges=Array.from({length:121},(_,i)=>({...graph.edges[i%2],id:`edge-${i}`}));
  const r=new GraphRenderer(undefined,graph,()=>{});
  try {
    r.filter(['Agency'],'entity-type');assert.equal(r.snapshot().visibleNodes,2);assert.equal(r.snapshot().visibleEdges,61);
    r.setEdgeLabels(true);r.core.zoom(.2);assert.equal(r.core.edges('.labels-hidden').length,121);
    r.core.zoom(1);assert.equal(r.core.edges('.labels-hidden').length,0);
    const node=r.core.getElementById('a');node.emit('grab');node.position({x:500,y:300});node.emit('drag');
    r.setVisible(false);assert.equal(r.snapshot().physics.alphaTarget,0);
  }finally{r.dispose();}
});

function largeFixture(identity:string):KnowledgeGraph {
  const graph=fixture(identity),node=graph.nodes[0],edge=graph.edges[0];
  return {...graph,nodes:Array.from({length:100},(_,i)=>({...node,id:`node-${i}`})),edges:Array.from({length:99},(_,i)=>({...edge,id:`edge-${i}`,source:`node-${i}`,target:`node-${i+1}`}))};
}

test('large graphs integrate two real force steps before publishing one frame',async()=>{
  const graph=largeFixture('large-step-physics'),seeds=graph.nodes.map((n,i)=>({id:n.id,x:i*10,y:(i%7)*20}));
  const reference=new WorldPhysics(graph,seeds,false,()=>{});reference.tick(2);
  let actual:WorldPhysics;
  try {
    await new Promise<void>((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('No automatic physics update')),1000);
      actual=new WorldPhysics(graph,seeds,true,()=>{
        actual.setVisible(false);clearTimeout(timeout);
        try{for(const i of [0,50,99])assert.deepEqual(actual.nodes[i],reference.nodes[i]);assert.equal(actual.snapshot().ticks,2);resolve();}catch(error){reject(error);}
      });
      actual.start();
    });
  }finally{reference.dispose();actual!.dispose();}
});

test('dense node labels are empty below zoom threshold while focused and hovered names remain available',()=>{
  const r=new GraphRenderer(undefined,largeFixture('dense-node-labels'),()=>{});
  try {
    r.core.zoom(.5);assert.equal(r.core.getElementById('node-1').style('label'),'');
    r.select('node-1');assert.equal(r.core.getElementById('node-1').style('label'),'a');
    r.core.getElementById('node-2').emit('mouseover');assert.equal(r.core.getElementById('node-2').style('label'),'a');
    r.core.getElementById('node-2').emit('mouseout');assert.equal(r.core.getElementById('node-2').style('label'),'');
    r.core.zoom(1);assert.equal(r.core.getElementById('node-3').style('label'),'a');
  }finally{r.dispose();}
  const small=new GraphRenderer(undefined,fixture('small-node-labels'),()=>{});
  try{small.core.zoom(.7);assert.equal(small.core.getElementById('a').style('min-zoomed-font-size'),'8px');assert.equal(small.core.getElementById('a').style('label'),'a');}finally{small.dispose();}
});
