import test from 'node:test';
import assert from 'node:assert/strict';
import type {KnowledgeNode,KnowledgeGraph} from '../../knowledge-graph/contract.ts';
import * as display from '../../knowledge-graph/display.ts';
import {GraphRenderer,graphElements} from '../../knowledge-graph/renderer.ts';
import {searchKnowledgeNodes} from '../../knowledge-graph/selectors.ts';

const node=(properties:KnowledgeNode['properties']={},label='Transport planning representative'):KnowledgeNode=>({id:'fixture',label,category:'planning',entityType:'Transport organisation',description:'Scenario context only.',properties,provenance:{kind:'model-assumption',reference:'Fixture assumption'},limitations:[]});
const graph=(nodes:KnowledgeNode[]):KnowledgeGraph=>({version:1,scenarioIdentity:'graph-ux-prototype',nodes,edges:[],limitations:[]});

test('concise labels retain participant identity and full canonical search without inventing service names',()=>{
  const label=(display as Record<string,unknown>).knowledgeNodeLabel as (n:KnowledgeNode)=>string;
  assert.equal(typeof label,'function','Display labels need a node-aware helper');
  const participant=node({recordType:'fictional-agent',agentId:'a',roleId:'r'},'A very long transport planning representative for the eastern region (participant)');
  const original=structuredClone(participant),caption=label(participant);
  assert.ok(Array.from(caption).length<=44);assert.match(caption,/participant/);
  assert.notEqual(caption,label({...participant,properties:{recordType:'fictional-agent',roleId:'r'}}));
  assert.equal(label(node({recordType:'communication-platform'},'Messaging app')),'Messaging app');
  assert.ok(label(node({},'   ')).trim());
  assert.ok(!/[\uD800-\uDBFF]$/.test(label(node({},'🚆'.repeat(80)))));
  assert.deepEqual(participant,original);
  assert.equal(searchKnowledgeNodes(graph([participant]),'eastern region')[0].id,'fixture');
  const element=graphElements(graph([participant]))[0];
  assert.equal(element.data.label,participant.label);assert.equal(element.data.displayLabel,caption);
});

test('overview labels are bounded below 100 nodes and search/selection priority changes no positions',()=>{
  const g=graph(Array.from({length:48},(_,i)=>({...node({presentationCategory:'entity'}),id:`entity:${i}`})));
  const renderer=new GraphRenderer(undefined,g,()=>{});
  try {
    renderer.core.zoom(.35);
    const positions=renderer.snapshot().positions;
    const hidden=renderer.core.nodes('.labels-hidden');
    assert.ok(hidden.length>0,'Medium-size overviews must reduce competing labels');
    const id=hidden[0].id();renderer.select(id);
    assert.equal(renderer.core.getElementById(id).hasClass('labels-hidden'),false);
    const setMatches=(renderer as unknown as {setSearchMatches(ids:ReadonlySet<string>):void}).setSearchMatches;
    assert.equal(typeof setMatches,'function');
    const match=renderer.core.nodes('.labels-hidden')[0].id();
    setMatches.call(renderer,new Set([match]));
    assert.equal(renderer.core.getElementById(match).hasClass('labels-hidden'),false);
    assert.equal(renderer.core.getElementById(match).style('opacity'),'1','Search results must remain readable during selection');
    renderer.select(null);assert.equal(renderer.core.getElementById(match).hasClass('labels-hidden'),false);
    assert.ok(renderer.core.nodes('.labels-hidden').length>0);
    setMatches.call(renderer,new Set());
    assert.deepEqual(renderer.snapshot().positions,positions);
    assert.equal(renderer.snapshot().nodes,48);
  } finally {renderer.dispose();}
});

test('summaries distinguish fictional scenario roles, participants and assumed entity facts',async()=>{
  const module=await import('../../knowledge-graph/node-summary.ts').catch(()=>null);
  assert.ok(module,'A browser-safe deterministic summary helper is required');
  const role=node({recordType:'fictional-agent',roleId:'r'});
  const participant=node({recordType:'fictional-agent',roleId:'r',agentId:'a',persistentGoal:'Keep fares affordable',recordedEvents:0});
  assert.match(module.nodeSummary(role),/fictional scenario role/i);
  const summary=module.nodeSummary(participant);
  assert.match(summary,/fictional participant/i);assert.match(summary,/Keep fares affordable/);assert.doesNotMatch(summary,/0 recorded/);
  assert.doesNotMatch(summary,/observed person|real participant/i);
  assert.doesNotMatch(summary,/separate role record/i,'A role ID alone does not prove another node exists');
  const assumed=node({recordType:'world-entity'},'Messaging app');
  assert.match(module.nodeSummary(assumed),/assum|unverified/i);
  assert.doesNotMatch(module.nodeSummary(assumed),/WhatsApp|Telegram|Signal/);
  assert.equal(module.nodeSummary(assumed),module.nodeSummary(structuredClone(assumed)));
});

test('communication summaries explain the scenario and distinguish initial views from AI discussion',async()=>{
  const {nodeSummary}=await import('../../knowledge-graph/node-summary.ts');
  const platform=node({recordType:'communication-platform',participants:40,posts:18,messages:0,discussionSummary:'18 posts; 0 classified decisions.'},'Reddit');
  const summary=nodeSummary(platform,{question:'Should Singapore add another MRT station?',socialCalls:0,initialStatements:18});
  assert.match(summary,/Reddit/);assert.match(summary,/Should Singapore add another MRT station/);
  assert.match(summary,/no AI follow-up discussion/i);assert.match(summary,/initial views/i);
  assert.doesNotMatch(summary,/40|18 posts|0 classified|consensus|agreed/i);
  const role=node({recordType:'role',persistentGoal:'Keep travel affordable',recordedEvents:16});
  assert.match(nodeSummary(role),/What they want: Keep travel affordable/);
  assert.doesNotMatch(nodeSummary(role),/16|Assumed goal/);
});

test('aggregate summaries preserve synthetic commute scope, unknowns, zero and negative values',async()=>{
  const module=await import('../../knowledge-graph/node-summary.ts').catch(()=>null);assert.ok(module);
  const commute={...node({recordType:'citizen-commute-aggregate',representedAgents:50,representedPopulation:10000,comparableWeight:3000,meanMinutesSaved:-2,unknownAgents:0,notApplicableAgents:4}),provenance:{kind:'calculated' as const,reference:'Synthetic routing'}};
  const before=structuredClone(commute),summary=module.nodeSummary(commute);
  assert.match(summary,/calculated/i);assert.match(summary,/synthetic/i);assert.match(summary,/comparable rail subset/i);
  assert.match(summary,/-2/);assert.match(summary,/0 unknown/);assert.match(summary,/4 not applicable/);
  assert.match(summary,/3,000/);assert.doesNotMatch(summary,/50 real|all citizens save/i);
  const unknown=module.nodeSummary({...commute,properties:{recordType:'citizen-commute-aggregate',meanMinutesSaved:null}});
  assert.match(unknown,/unknown/i);assert.doesNotMatch(unknown,/0 minutes/);
  const background=module.nodeSummary(node({recordType:'fictional-agent-aggregate',members:34,countScope:'Revealed candidates overlap this aggregate; do not add them to totals.'}));
  assert.match(background,/34/);assert.match(background,/do not represent assigned scenario roles/i);assert.match(background,/overlap/);
  assert.deepEqual(commute,before);
});
