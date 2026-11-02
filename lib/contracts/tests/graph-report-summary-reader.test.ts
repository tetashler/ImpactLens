import test from 'node:test';
import assert from 'node:assert/strict';
import type {PublicExplore} from '../../society/public-contract.ts';
import {graphReportSnapshot,watchSavedGraphReportSummary} from '../../../components/use-graph-report-summary.ts';

const run:PublicExplore={version:3,kind:'summary-execution',attemptId:'a',requestIdentity:'request',runId:'graph-run',planId:null,question:'Should we add another station?',status:'completed',request:null,graph:{version:1,scenarioIdentity:'scenario',executionIdentity:'graph-run',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:1,actionCalls:0,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:{id:'session',token:'test-access-token',revision:1},society:null};
const settle=()=>new Promise(resolve=>setTimeout(resolve,25));
async function envelope(snapshot:NonNullable<ReturnType<typeof graphReportSnapshot>>) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(snapshot.payload));
  const key=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  return {snapshotKey:key,summary:{version:1,runId:run.runId,snapshotKey:key,generatedAt:'2026-11-02T00:00:00Z',sections:{findings:'Fictional views.',agreements:'Not established.',disagreements:'Not established.',concerns:'Travel costs.',unknowns:'Outcomes unknown.'},nodeSummaries:[{nodeId:'reddit',summary:'Fictional participants discuss access to the proposed station.'}]}};
}

test('graph reads a matching saved narrative with authenticated GET and makes no generation request',async()=>{
  const snapshot=graphReportSnapshot(run);assert.ok(snapshot);
  const body=await envelope(snapshot);const requests:{url:string;init?:RequestInit}[]=[];const received:unknown[]=[];
  const stop=watchSavedGraphReportSummary(snapshot,true,summary=>received.push(summary),async(input,init)=>{requests.push({url:String(input),init});return Response.json(body);});
  await settle();stop();
  assert.equal(requests.length,1);assert.equal(requests[0].url,'/api/reports/summary?runId=graph-run');
  assert.equal(requests[0].init?.method,'GET');assert.equal(new Headers(requests[0].init?.headers).get('Authorization'),'Bearer test-access-token');
  assert.deepEqual(received,[body.summary]);
});

test('inactive graphs and graphs without an authenticated report never read saved summaries',async()=>{
  let calls=0;const fetcher:typeof fetch=async()=>{calls++;throw Error('Unexpected fetch');};
  for(const snapshot of [null,graphReportSnapshot({...run,session:null}),graphReportSnapshot(run)]){
    const stop=watchSavedGraphReportSummary(snapshot,false,()=>assert.fail('Inactive callback'),fetcher);stop();
  }
  watchSavedGraphReportSummary(null,true,()=>assert.fail('No report callback'),fetcher)();
  await settle();assert.equal(calls,0);
});

test('a report from another scenario or execution cannot attach a narrative to the displayed graph',()=>{
  assert.equal(graphReportSnapshot(run,{...run.graph,executionIdentity:'another-run'}),null);
  assert.equal(graphReportSnapshot(run,{...run.graph,scenarioIdentity:'another-scenario'}),null);
  assert.equal(graphReportSnapshot({...run,graph:{...run.graph,executionIdentity:'another-run'}}),null);
  assert.equal(graphReportSnapshot(run,null),null);
  assert.ok(graphReportSnapshot(run,structuredClone(run.graph)));
});

test('stale run IDs, snapshots and malformed saved summaries never become graph narratives',async()=>{
  const snapshot=graphReportSnapshot(run);assert.ok(snapshot);const body=await envelope(snapshot);
  for(const invalid of [{...body,snapshotKey:'a'.repeat(64)},{...body,summary:{...body.summary,runId:'other-run'}},{...body,summary:{...body.summary,snapshotKey:'b'.repeat(64)}},{...body,summary:{...body.summary,nodeSummaries:[{nodeId:'reddit',summary:{bad:true}}]}}]){
    const received:unknown[]=[];const stop=watchSavedGraphReportSummary(snapshot,true,summary=>received.push(summary),async()=>Response.json(invalid));
    await settle();stop();assert.deepEqual(received,[]);
  }
});

test('changing graph context aborts pending reads and discards late responses, then reactivation refetches',async()=>{
  const snapshot=graphReportSnapshot(run);assert.ok(snapshot);const body=await envelope(snapshot);
  let signal:AbortSignal|null|undefined;let respond:((response:Response)=>void)|undefined;const received:unknown[]=[];
  const stop=watchSavedGraphReportSummary(snapshot,true,summary=>received.push(summary),async(_input,init)=>{signal=init?.signal;return new Promise(resolve=>{respond=resolve;});});
  await settle();stop();assert.equal(signal?.aborted,true);respond!(Response.json(body));await settle();assert.equal(received.length,0);
  let calls=0;const fetcher:typeof fetch=async()=>{calls++;return Response.json(body);};
  watchSavedGraphReportSummary(snapshot,false,summary=>received.push(summary),fetcher)();
  const stopAgain=watchSavedGraphReportSummary(snapshot,true,summary=>received.push(summary),fetcher);await settle();stopAgain();
  assert.equal(calls,1);assert.deepEqual(received,[body.summary]);
  assert.notEqual(graphReportSnapshot({...run,session:{...run.session!,revision:2}})?.identity,snapshot.identity);
});
