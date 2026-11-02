import test from 'node:test';
import assert from 'node:assert/strict';
import {graphSummarySnapshotPayload,parseGraphNodeSummaries,parseGraphNodeSummaryBatch} from '../../graph-summary/contract.ts';
import {projectGraphSummaryContext} from '../../graph-summary/evidence.ts';
import type {PublicExplore} from '../../society/public-contract.ts';
const run=()=>({runId:'graph-summary-test',question:'What if we add a clinic?',status:'completed',session:{token:'PRIVATE_TOKEN',revision:4},job:{status:'completed'},society:null,assumptions:[],limitations:[],roles:[],sources:[],graph:{scenarioIdentity:'scenario',executionIdentity:'graph-summary-test',nodes:Array.from({length:30},(_,i)=>({id:`node-${i}`,label:`Place ${i}`,category:'planning',description:'A proposed place.',provenance:{kind:'model-assumption'},properties:{persistentGoal:'PRIVATE_GOAL',demographicContext:'PRIVATE_PROFILE',memory:'PRIVATE_MEMORY'},limitations:[]})),edges:[]}} as unknown as PublicExplore);
test('graph summary context includes every node without arbitrary profile/property bags or credentials',()=>{
 const value=run(),context=projectGraphSummaryContext(value);
 assert.equal(context.nodes.length,30);assert.equal(context.nodes[29].nodeId,'node-29');
 assert.doesNotMatch(JSON.stringify(context),/PRIVATE_/);
 const key=graphSummarySnapshotPayload(value);value.session!.token='CHANGED';assert.equal(graphSummarySnapshotPayload(value),key);
 value.graph.nodes[29].description='Updated context';assert.notEqual(graphSummarySnapshotPayload(value),key);
 assert.notEqual(graphSummarySnapshotPayload(run(),'other-prompt'),key);
});
test('all-node artifact supports more than sixteen unique summaries but exact batch coverage is mandatory',()=>{
 const summaries=run().graph.nodes.map(n=>({nodeId:n.id,summary:'A useful explanation of this place in the scenario.'}));
 const artifact={version:1,runId:'graph-summary-test',snapshotKey:'a'.repeat(64),generatedAt:'2026-11-02T10:00:00.000Z',totalNodes:30,summaries};
 assert.equal(parseGraphNodeSummaries(artifact,new Set(summaries.map(s=>s.nodeId))).summaries.length,30);
 const expected=new Set(['node-1','node-2']);
 assert.deepEqual(parseGraphNodeSummaryBatch({summaries:summaries.slice(1,3)},expected),summaries.slice(1,3));
 for(const batch of [summaries.slice(1,2),[summaries[1],summaries[1]],[summaries[1],summaries[3]]])assert.throws(()=>parseGraphNodeSummaryBatch({summaries:batch},expected));
 assert.throws(()=>parseGraphNodeSummaries({...artifact,summaries:[{nodeId:'unknown',summary:'Wrong.'}]},new Set(['node-1'])));
 assert.throws(()=>parseGraphNodeSummaries({...artifact,token:'PRIVATE'}));
});
test('communication nodes request conversation recaps rather than definitions or activity-log descriptions',()=>{
 const value=run();value.graph.nodes[0].properties={recordType:'communication-platform',platformId:'whatsapp',style:'private-group'};
 value.graph.nodes[0].description='Recorded authored-item scores and private activity counts.';
 const context=projectGraphSummaryContext(value).nodes[0];
 assert.equal(context.summaryFocus,'conversation');
 assert.match(context.evidenceScope,/server-only.*conversation/);
 assert.doesNotMatch(context.description,/unavailable|metadata only|authored-item scores/i);
});
