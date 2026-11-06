import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import type {PublicExplore} from '../../society/public-contract.ts';
import {graphReportSnapshot,watchSavedGraphReportSummary} from '../../../components/use-graph-report-summary.ts';
import {prepareAutomaticGraphSummaries} from '../../graph-summary/automatic.ts';

const originalKey='a'.repeat(64),projectedKey='b'.repeat(64);
const run:PublicExplore={version:3,kind:'summary-execution',attemptId:'archive-reader',requestIdentity:'archive-reader',runId:'run-archive-reader',planId:null,question:'Should Singapore add another station?',status:'completed',request:null,graph:{version:1,scenarioIdentity:'archive-reader',executionIdentity:'run-archive-reader',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:1,actionCalls:0,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:{id:'archive-session',token:'test-archive-access-token',revision:1},society:null,storage:{version:1,policy:'storage-admission-v1',disposition:'historical-read-only'}};
const summary={version:1,runId:run.runId,snapshotKey:originalKey,generatedAt:'2026-11-02T00:00:00Z',sections:{findings:'Fictional views.',agreements:'Not established.',disagreements:'Not established.',concerns:'Travel costs.',unknowns:'Outcomes unknown.'}};
const report={version:1,runId:run.runId,snapshotKey:originalKey,generatedAt:'2026-11-02T00:00:00Z',question:run.question,runStatus:'running',sections:{assessment:'Fictional assessment.',impacts:'Unknown impacts.',perspectives:'Fictional perspectives.',tradeoffs:'Unknown tradeoffs.',developments:'Recorded developments.',nextSteps:'Further research.'}};

test('archived report readers accept only authenticated-envelope keys with matching strict artifact identity',async()=>{
 const readers=await import('../../report-summary/saved.ts').catch(()=>null);assert.ok(readers?.parseSavedReportSummary,'shared archived report validation is required');
 assert.deepEqual(readers.parseSavedReportSummary({snapshotKey:originalKey,summary},run,projectedKey),{snapshotKey:originalKey,summary});
 assert.deepEqual(readers.parseSavedDetailedReport({snapshotKey:originalKey,report},run,projectedKey),{snapshotKey:originalKey,report});
 for(const body of [{snapshotKey:'INVALID',summary},{snapshotKey:originalKey,summary:{...summary,runId:'other-run'}},{snapshotKey:originalKey,summary:{...summary,snapshotKey:projectedKey}},{snapshotKey:originalKey,summary:{...summary,sections:{findings:{private:'bad'}}}}])assert.throws(()=>readers.parseSavedReportSummary(body,run,projectedKey));
 assert.throws(()=>readers.parseSavedDetailedReport({snapshotKey:originalKey,report:{...report,question:'Another question'}},run,projectedKey));
 const active={...run,storage:{version:1 as const,policy:'storage-admission-v1' as const,disposition:'active' as const}};
 assert.throws(()=>readers.parseSavedReportSummary({snapshotKey:originalKey,summary},active,projectedKey));assert.throws(()=>readers.parseSavedDetailedReport({snapshotKey:originalKey,report},active,projectedKey));
});

test('archived graph narratives read the retained server key with authenticated GET only',async()=>{
 const snapshot=graphReportSnapshot(run);assert.ok(snapshot);const received:unknown[]=[];let method='';
 const stop=watchSavedGraphReportSummary(snapshot,true,value=>received.push(value),async(_url,init)=>{method=init?.method??'GET';assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer test-archive-access-token');return Response.json({snapshotKey:originalKey,summary});});
 await new Promise(resolve=>setTimeout(resolve,30));stop();assert.equal(method,'GET');assert.deepEqual(received,[summary]);
});

test('archived node summaries accept the retained key and never POST missing or partial cached artifacts',async()=>{
 const historical={...run,graph:{...run.graph,nodes:[{id:'node-1',label:'Node one',category:'population' as const,description:'Public scenario context.',provenance:{kind:'synthetic-exploratory' as const,reference:'Scenario'},properties:{},limitations:[]},{id:'node-2',label:'Node two',category:'population' as const,description:'Public scenario context.',provenance:{kind:'synthetic-exploratory' as const,reference:'Scenario'},properties:{},limitations:[]}]}};
 for(const artifact of [null,{version:1,runId:run.runId,snapshotKey:originalKey,totalNodes:2,generatedAt:'2026-11-02T00:00:00Z',summaries:[{nodeId:'node-1',summary:'Fictional public scenario context.'}]}]){
  const methods:string[]=[];const state=await prepareAutomaticGraphSummaries(historical,{storage:null,retry:true,fetcher:async(_url,init)=>{methods.push(init?.method??'GET');return Response.json({snapshotKey:originalKey,totalNodes:2,artifact,complete:false});}});
  assert.equal(state.phase,'idle');assert.equal(state.snapshotKey,originalKey);assert.deepEqual(state.artifact,artifact);assert.deepEqual(methods,['GET']);
 }
});
