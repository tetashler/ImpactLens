import test from 'node:test';
import assert from 'node:assert/strict';
import * as renderer from '../../knowledge-graph/renderer.ts';
import type {KnowledgeGraph} from '../../knowledge-graph/contract.ts';

const provenance={kind:'planning-only' as const,reference:'Renderer visual regression fixture'};
function fixture(identity:string,count=5):KnowledgeGraph {
  return {version:1,scenarioIdentity:identity,limitations:[],
    nodes:Array.from({length:count},(_,i)=>({id:`node-${i}`,label:i===1?'A very long public transport infrastructure name':`Node ${i}`,
      category:i===0?'scenario':'planning',description:'Visual fixture only.',provenance,properties:{},limitations:[]})),
    edges:Array.from({length:count-2},(_,i)=>({id:`edge-${i}`,source:'node-0',target:`node-${i+1}`,
      relationship:'contains',description:'Visual fixture only.',provenance,directed:true}))};
}

test('canvas pixel ratio follows normal and high-DPI screens with a bounded safe fallback',()=>{
  for(const [value,expected] of [[1,1],[1.25,1.25],[2,2],[3,2],[.5,1],[0,1],[-2,1],
    [undefined,1],[null,1],[NaN,1],[Infinity,1],[-Infinity,1],['2',1],[{},1]] as const){
    assert.equal(renderer.graphPixelRatio(value),expected,`safe canvas ratio for ${String(value)}`);
  }
});

test('real node styles keep hubs, high-degree nodes and isolated nodes compact without selection growth',()=>{
  const core=renderer.createGraphCore(fixture('compact-visual',25));
  try {
    const widths=core.nodes().map(node=>node.width());
    assert.ok(widths.every(width=>width>=12&&width<=14),'Every node remains between 12 and 14 graph units');
    assert.ok(Math.max(...widths)-Math.min(...widths)<=2,'Degree and scenario role cannot create oversized nodes');
    for(const id of ['node-0','node-1','node-24']){
      const node=core.getElementById(id),before=node.width();
      assert.ok(Number.parseFloat(node.style('border-width'))<=2);
      assert.ok(Number.parseFloat(node.style('font-size'))>=12&&Number.parseFloat(node.style('font-size'))<=13);
      node.addClass('focused');
      assert.equal(node.width(),before);
      assert.equal(node.style('border-width'),'2px');
      assert.equal(node.style('font-size'),'13px');
      assert.ok(Number.parseInt(node.style('font-weight'))<=500);
      node.removeClass('focused').addClass('hovered');
      assert.ok(Number.parseFloat(node.style('border-width'))<=2);
      assert.equal(node.style('font-size'),'13px');
    }
  }finally{core.destroy();}
});

test('canvas captions are bounded while graph data and source names remain complete',()=>{
  const graph=fixture('captions-visual');
  graph.nodes[3].label='1234567890123456789012345678';
  graph.nodes[4].label='12345678901234567890123456🚆 more';
  const original=structuredClone(graph);
  const core=renderer.createGraphCore(graph);
  try {
    const long=core.getElementById('node-1');
    assert.equal(long.data('label'),'A very long public transport infrastructure name');
    assert.equal(long.data('displayLabel'),'A very long public transpor…');
    assert.ok(Array.from(long.style('label')).length<=28);
    assert.equal(long.style('label'),long.data('displayLabel'));
    assert.equal(core.getElementById('node-2').style('label'),'Node 2');
    assert.equal(core.getElementById('node-3').style('label'),'1234567890123456789012345678');
    assert.equal(core.getElementById('node-4').style('label'),'12345678901234567890123456🚆…');
    assert.deepEqual(graph,original);
  }finally{core.destroy();}
});

test('dense canvas suppression still reveals compact captions for focused and hovered nodes',()=>{
  const graph=fixture('dense-captions-visual',100),instance=new renderer.GraphRenderer(undefined,graph,()=>{});
  try {
    instance.core.zoom(.5);
    const selected=instance.core.getElementById('node-1'),hovered=instance.core.getElementById('node-2');
    assert.equal(selected.style('label'),'');
    instance.select(selected.id());
    assert.equal(selected.style('label'),'A very long public transpor…');
    assert.equal(selected.style('min-zoomed-font-size'),'0px');
    hovered.emit('mouseover');
    assert.equal(hovered.style('label'),'Node 2');
    assert.equal(hovered.style('min-zoomed-font-size'),'0px');
    hovered.emit('mouseout');
    assert.equal(hovered.style('label'),'');
    instance.select(null);instance.core.zoom(1);
    assert.equal(selected.style('label'),'A very long public transpor…');
    assert.equal(selected.style('min-zoomed-font-size'),'8px');
  }finally{instance.dispose();}
});
