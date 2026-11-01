import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {appendCitizenCommuteGraph} from '../../citizen-grounding/graph.ts';
import {calculateCitizenImpact} from '../../server/citizen-grounding/api.ts';
import {transportDataset,transportReference} from './citizen-transport-fixture.ts';
import {baselineFixture,proposalFixture} from '../../../prototype/mrt/tests/scenario-fixtures.ts';

const source=readFileSync(new URL('../../../components/workspace.tsx',import.meta.url),'utf8');
async function impact(waitingTimeSeconds:number){return (await calculateCitizenImpact({serviceDate:'2026-10-27',intervention:{...proposalFixture(),waitingTimeSeconds}},{dataset:()=>transportDataset(),baseline:()=>baselineFixture(),demand:()=>transportReference,access:()=>({sourceHash:'e'.repeat(64),points:{}})})).publicResult;}

test('actual workspace graph selector preserves accepted commute A when the same question has a different draft calculation B',async()=>{
 const a=await impact(30),b=await impact(300),graphA=appendCitizenCommuteGraph(null,a,'accepted-A'),before=JSON.stringify(graphA);
 assert.notEqual(a.scenarioFingerprint,b.scenarioFingerprint,'Synthetic control changes the real deterministic transport calculation');
 const callback=source.match(/const primaryGraph=useMemo\((\(\)=>\{[^\n]+\}),\[/)?.[1];assert.ok(callback,'Exercise the production workspace selection callback');
 const select=new Function('displayedFlow','society','experimentGraph','legacyWorldEntities','currentCitizenImpact','archive','graphArchived','planner','graphIdentity','appendCitizenCommuteGraph',`return (${callback})();`);
 const run={question:'Same unchanged question',graph:graphA};
 const selected=select({publicRun:run},{result:null},null,()=>{throw Error('Unexpected legacy projection');},b,null,false,{question:run.question},'draft-B',appendCitizenCommuteGraph);
 assert.deepEqual(selected,graphA,'Accepted run A must use only its server-owned graph, irrespective of later draft B');
 assert.equal(JSON.stringify(graphA),before,'Projection must not mutate the accepted graph');
 const draft=select({publicRun:null},{result:null},null,()=>null,b,null,false,{question:run.question},'draft-B',appendCitizenCommuteGraph);
 assert.equal(draft.nodes.length,1);assert.equal(draft.nodes[0].properties.scenarioFingerprint,b.scenarioFingerprint,'Independent calculations remain available without an accepted run');
});

test('actual workspace Report does not prepend an unrelated local commute calculation to an accepted run',()=>{
 const condition=source.match(/\{([^{}\n]+)&&<CitizenCommuteReport result=\{currentCitizenImpact\}\/\s*>/)?.[1];assert.ok(condition,'Exercise the production standalone citizen Report condition');
 const visible=new Function('displayedFlow','archive','currentCitizenImpact',`return !!(${condition});`);
 assert.equal(visible({publicRun:{runId:'accepted-A'}},null,{runId:'draft-B'}),false,'Accepted Report owns its immutable commute facts');
 assert.equal(visible({publicRun:null},null,{runId:'draft-B'}),true,'An independent calculation remains visible in the draft Report');
 assert.equal(visible({publicRun:null},{id:'historical'}, {runId:'draft-B'}),false,'Historical selection must not inherit a current draft');
});

test('accepted communication Report is never passed unbound native calculator outputs',()=>{
 const call=source.match(/<CommunicationReport\b[^>]+/)?.[0];assert.ok(call,'Exercise the actual accepted Report call site');
 for(const name of ['mrt','aac']){
  const expression:string|undefined=call.match(new RegExp(name+'=\\{([^}]+)\\}'))?.[1];
  const value:unknown=expression?new Function('archive','result','aac',`return (${expression});`)(null,{scenarioId:'unrelated-MRT-B'},{report:{scenarioId:'unrelated-facility-B'}}):null;
  assert.equal(value,null,'Unbound '+name+' calculator results must stay separate from an immutable accepted run');
 }
});
