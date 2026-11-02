import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGraphSummaryContext} from '../../graph-summary/evidence.ts';
import {graphSummarySnapshotPayload} from '../../graph-summary/contract.ts';
import {projectGraphSummaryWriterEvidence} from '../../server/graph-summary-evidence.ts';
import type {PublicExplore} from '../../society/public-contract.ts';

function run():PublicExplore {
 return {runId:'site-summary-test',question:'What if a polyclinic was built at this location?',status:'completed',session:null,society:null,assumptions:['The plotted site is in Sengkang.'],limitations:[],graph:{version:1,scenarioIdentity:'site',nodes:[{id:'plotted-site',label:'Plotted Location',category:'geography',description:'Model-proposed Sengkang location.',provenance:{kind:'model-assumption',reference:'scenario'},properties:{recordType:'world-entity'},limitations:[]}],edges:[],limitations:[]},locationContext:{version:1,kind:'hybrid-map-review',bindingKey:'a'.repeat(64),question:'What if a polyclinic was built at this location?',geometryRevision:1,interventionType:'new_polyclinic',analysisMode:'location-context',message:'Plotted location context only.',limitations:['Land availability and site feasibility have not been assessed.'],locations:[{pointId:'point-1',coordinate:{lat:1.325243,lon:103.856099},planningArea:'NOVENA',subzone:'BALESTIER',sourceId:'NVSZ01',sourceSha256:'b'.repeat(64),referenceYear:2019}]}} as unknown as PublicExplore;
}

test('graph writers receive the official plotted location alongside conflicting model context without private property bags',()=>{
 const value=run();Object.assign(value.locationContext!,{token:'PRIVATE_TOKEN'});Object.assign(value.locationContext!.locations![0],{privateNotes:'PRIVATE_NOTES'});
 const context=projectGraphSummaryContext(value);
 const location=(context as unknown as {locationContext?:Record<string,unknown>}).locationContext;
 assert.ok(location,'Dropping the official site leaves the writer with only a model-invented neighbourhood.');
 assert.deepEqual(location.locations,[{pointId:'point-1',coordinate:{lat:1.325243,lon:103.856099},planningArea:'NOVENA',subzone:'BALESTIER'}]);
 assert.deepEqual(location.limitations,['Land availability and site feasibility have not been assessed.']);
 assert.doesNotMatch(JSON.stringify(context),/PRIVATE_|sourceSha256/);
 const discussion={version:1 as const,scope:'Permitted public evidence only',initialStatements:0,followupStatements:0,omitted:0,statements:[],nodes:[]};
 const writer=projectGraphSummaryWriterEvidence(value,['plotted-site'],discussion);
 assert.deepEqual((writer as unknown as {locationContext?:unknown}).locationContext,location);
 assert.match(writer.nodes[0].description,/Sengkang/,'The archive is preserved; the writer receives authoritative evidence to resolve the conflict.');
});

test('a changed official plotted location invalidates a graph summary cache even when graph text is unchanged',()=>{
 const value=run(),original=graphSummarySnapshotPayload(value);
 const changed=structuredClone(value);changed.locationContext!.locations![0].planningArea='SENGKANG';changed.locationContext!.locations![0].subzone='ANCHORVALE';
 assert.deepEqual(changed.graph,value.graph);
 assert.notEqual(graphSummarySnapshotPayload(changed),original);
 const changedPoint=structuredClone(value);changedPoint.locationContext!.locations![0].coordinate.lat=1.3253;
 assert.notEqual(graphSummarySnapshotPayload(changedPoint),original);
 const legacy=structuredClone(value);delete legacy.locationContext;
 assert.equal(Object.hasOwn(projectGraphSummaryContext(legacy),'locationContext'),false);
 assert.notEqual(graphSummarySnapshotPayload(legacy),original);
});
