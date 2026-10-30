import test from 'node:test';
import assert from 'node:assert/strict';
import {GraphRenderer} from '../../knowledge-graph/renderer.ts';
import type {KnowledgeGraph} from '../../knowledge-graph/contract.ts';

const provenance={kind:'synthetic-exploratory' as const,reference:'Fictional desktop graph fixture'};
function fixture():KnowledgeGraph {
  return {version:1,scenarioIdentity:'phase4e-desktop-graph',nodes:[
    {id:'entity',label:'Public transport agency',category:'planning',entityType:'Agency',properties:{presentationCategory:'entity',presentationPrimary:true}},
    {id:'role',label:'Commuter representative',category:'planning',entityType:'Fictional stakeholder role',properties:{presentationCategory:'role',presentationPrimary:true}},
    {id:'person',label:'Fictional commuter 35',category:'planning',entityType:'Fictional person',properties:{presentationCategory:'person',presentationPrimary:false}},
    {id:'aggregate',label:'Other fictional commuters',category:'population',entityType:'Fictional population aggregate',properties:{presentationCategory:'aggregate',presentationPrimary:true}},
  ].map(node=>({...node,category:node.category as KnowledgeGraph['nodes'][number]['category'],description:'Safe summary only.',provenance,limitations:[]})),edges:[
    {id:'entity-role',source:'entity',target:'role',relationship:'contains',description:'Fictional link.',provenance,directed:true},
    {id:'role-person',source:'role',target:'person',relationship:'represents',description:'Fictional link.',provenance,directed:true},
  ],limitations:[]};
}

test('entity-first renderer hides background candidates without removing their nodes or coordinates',()=>{
  const renderer=new GraphRenderer(undefined,fixture(),()=>{});
  try {
    assert.equal(renderer.snapshot().nodes,4);
    assert.equal(renderer.snapshot().visibleNodes,3);
    assert.equal(renderer.core.getElementById('person').hasClass('kg-hidden'),true);
    const positions=renderer.snapshot().positions;
    renderer.setPresentationVisibility(new Set(['entity','role','person','aggregate']));
    renderer.focus('person');
    assert.equal(renderer.snapshot().visibleNodes,4);
    assert.equal(renderer.core.getElementById('person').hasClass('focused'),true);
    assert.deepEqual(renderer.snapshot().positions,positions);
    renderer.filter(['Agency'],'entity-type');
    assert.equal(renderer.snapshot().visibleNodes,1);
    assert.equal(renderer.snapshot().visibleEdges,0);
    renderer.setPresentationVisibility(new Set(['entity','role','aggregate']));
    renderer.filter(['Agency','Fictional stakeholder role','Fictional person','Fictional population aggregate'],'entity-type');
    assert.equal(renderer.snapshot().visibleNodes,3);
    assert.equal(renderer.snapshot().visibleEdges,1);
    assert.deepEqual(renderer.snapshot().positions,positions);
  }finally{renderer.dispose();}
});

test('canvas distinguishes entities, roles, people and population aggregates without relying on colour',()=>{
  const renderer=new GraphRenderer(undefined,fixture(),()=>{});
  try {
    const entity=renderer.core.getElementById('entity'),role=renderer.core.getElementById('role'),person=renderer.core.getElementById('person'),aggregate=renderer.core.getElementById('aggregate');
    assert.equal(entity.style('shape'),'round-rectangle');
    assert.equal(role.style('shape'),'diamond');
    assert.equal(person.style('shape'),'ellipse');
    assert.equal(aggregate.style('shape'),'hexagon');
    assert.ok(parseFloat(entity.style('width'))>parseFloat(person.style('width')));
    assert.ok(parseFloat(role.style('width'))>parseFloat(person.style('width')));
  }finally{renderer.dispose();}
});

test('overview zoom keeps institution and aggregate names readable while preserving coordinates',()=>{
  const graph=fixture();graph.nodes[0].label='Singapore National Employers Federation';
  const renderer=new GraphRenderer(undefined,graph,()=>{});
  try {
    const positions=renderer.snapshot().positions;renderer.core.zoom(.35);
    const zoom=renderer.snapshot().zoom,entity=renderer.core.getElementById('entity'),aggregate=renderer.core.getElementById('aggregate'),role=renderer.core.getElementById('role'),person=renderer.core.getElementById('person');
    assert.ok(parseFloat(entity.style('font-size'))*zoom>=10.99,'Institution captions must render at least 11 px at overview zoom');
    assert.ok(parseFloat(aggregate.style('font-size'))*zoom>=10.99,'Aggregate captions must render at least 11 px at overview zoom');
    assert.ok(parseFloat(role.style('font-size'))*zoom>=9.49,'Scenario roles remain readable below the entity tier');
    assert.ok(parseFloat(person.style('font-size'))<parseFloat(entity.style('font-size')));
    assert.equal(entity.style('label'),'Singapore National Employers Federation');
    assert.equal(entity.style('text-wrap'),'wrap');
    assert.ok(parseFloat(entity.style('text-max-width'))*zoom>=159,'Institution names get enough rendered line width');
    assert.deepEqual(renderer.snapshot().positions,positions);
  }finally{renderer.dispose();}
});
