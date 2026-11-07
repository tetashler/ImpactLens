import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {PublicExplore} from '../../society/public-contract.ts';
import {detailedReportSnapshotPayload} from '../../report-detailed/contract.ts';
import {createDetailedReportService} from '../../server/report-detailed.ts';
import {prepareAutomaticReports} from '../../report-detailed/automatic.ts';
import {projectReportEvidence,reportSnapshotPayload} from '../../report-summary/evidence.ts';
import {parseSavedDetailedReport} from '../../report-summary/saved.ts';

const token='a'.repeat(64),hash=(value:string)=>createHash('sha256').update(value).digest('hex');
function run():PublicExplore{return {version:3,kind:'summary-execution',attemptId:'legacy-upgrade',requestIdentity:'legacy-upgrade',runId:'legacy-upgrade',planId:null,question:'What may change?',status:'completed',request:null,graph:{version:1,scenarioIdentity:'legacy-upgrade',executionIdentity:'legacy-upgrade',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:null,actionCalls:null,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:{id:'legacy-session',token,revision:1},society:null,job:{version:1,id:'legacy-job',status:'completed',tick:1,totalSteps:1,acceptedDecisions:0,participatingAgents:0,capacity:1,admittedCalls:0,remainingCalls:0,reason:null,revision:1}};}
function legacy(value:PublicExplore){return {version:1 as const,runId:value.runId,snapshotKey:hash(detailedReportSnapshotPayload(value,'detailed-report-v1')),generatedAt:'2026-11-02T08:30:00.000Z',question:value.question,runStatus:'completed',sections:{assessment:'Legacy assessment.',impacts:'Unknown.',perspectives:'Fictional views.',tradeoffs:'Unknown.',developments:'Initial remarks only.',nextSteps:'Check the evidence.'}};}

test('browser legacy reads require both current identity and a matching legacy identity',()=>{
 const current=run(),report=legacy(current),key=hash(detailedReportSnapshotPayload(current)),body={snapshotKey:key,report:null,legacyReport:report};
 assert.deepEqual(parseSavedDetailedReport(body,current,key,report.snapshotKey),{snapshotKey:key,report});
 assert.throws(()=>parseSavedDetailedReport(body,current,key));
 assert.throws(()=>parseSavedDetailedReport({...body,snapshotKey:'f'.repeat(64)},current,key,report.snapshotKey));
 assert.throws(()=>parseSavedDetailedReport(body,current,key,'f'.repeat(64)));
 assert.throws(()=>parseSavedDetailedReport({...body,legacyReport:{...report,question:'A different proposal'}},current,key,report.snapshotKey));
 current.storage={version:1,policy:'storage-admission-v1',disposition:'historical-read-only'};
 assert.deepEqual(parseSavedDetailedReport({snapshotKey:report.snapshotKey,report},current,key),{snapshotKey:report.snapshotKey,report});
 assert.throws(()=>parseSavedDetailedReport(body,current,key,report.snapshotKey));
});

test('active legacy cache remains readable separately from the current generation identity',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'detailed-legacy-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const current=run(),report=legacy(current),path=join(directory,hash(current.runId)+'.json'),bytes=JSON.stringify(report);
 writeFileSync(path,bytes);let sources=0,calls=0;
 const service=createDetailedReportService({storeDirectory:directory,readSnapshot:async()=>current,readDiscussion:async()=>{sources++;throw Error('No read required');},generate:async()=>{calls++;throw Error('No writer required');}});
 const saved=await service.read(current.runId,token);
 assert.equal(saved.report,null);assert.deepEqual('legacyReport' in saved?saved.legacyReport:null,report);
 assert.notEqual(saved.snapshotKey,report.snapshotKey);assert.equal(readFileSync(path,'utf8'),bytes);assert.equal(sources,0);assert.equal(calls,0);
 current.question='A changed question';const changed=await service.read(current.runId,token);assert.equal(changed.report,null);assert.ok(!('legacyReport' in changed));
});

test('archived legacy reads and refusal never depend on the new evidence projector',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'detailed-archived-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const current=run(),report=legacy(current),path=join(directory,hash(current.runId)+'.json'),bytes=JSON.stringify(report);writeFileSync(path,bytes);
 current.storage={version:1,policy:'storage-admission-v1',disposition:'historical-read-only'};
 current.roles=Array.from({length:24},(_,i)=>({id:'role-'+i,label:'Stakeholder',goals:Array(6).fill('x'.repeat(500))}));current.assumptions=Array(24).fill('x'.repeat(800));current.limitations=Array(24).fill('x'.repeat(800));
 assert.throws(()=>detailedReportSnapshotPayload(current));
 let calls=0,resolutions=0;
 const service=createDetailedReportService({storeDirectory:directory,resolveArtifactDirectory:()=>{resolutions++;return directory;},readSnapshot:async(_id,provided)=>{if(provided!==token)throw Error('PUBLIC_ACCESS');return current;},readDiscussion:async()=>{calls++;throw Error('No archived sources');},generate:async()=>{calls++;throw Error('No archived writer');}});
 assert.deepEqual(await service.read(current.runId,token),{snapshotKey:report.snapshotKey,report});
 await assert.rejects(()=>service.generate(current.runId,token,report.snapshotKey),{code:'REPORT_READ_ONLY'});
 const previous=resolutions;await assert.rejects(()=>service.read(current.runId,'b'.repeat(64)),/PUBLIC_ACCESS/);assert.equal(resolutions,previous);
 assert.equal(calls,0);assert.equal(readFileSync(path,'utf8'),bytes);
});

test('a valid active legacy cache prevents automatic paid upgrades without changing its V2 key',async()=>{
 const current=run(),report=legacy(current),key=hash(detailedReportSnapshotPayload(current)),summaryKey=hash(reportSnapshotPayload(projectReportEvidence(current))),methods:string[]=[];
 const state=await prepareAutomaticReports(current,{storage:null,fetcher:async(input,init)=>{
  methods.push((init?.method??'GET')+' '+(String(input).includes('/summary')?'summary':'detailed'));
  if(String(input).includes('/summary'))return Response.json({snapshotKey:summaryKey,summary:{version:1,runId:current.runId,snapshotKey:summaryKey,generatedAt:report.generatedAt,sections:{findings:'Fictional views.',agreements:'Unknown.',disagreements:'Unknown.',concerns:'Unknown.',unknowns:'Unknown.'}}});
  return Response.json({snapshotKey:key,report:null,legacyReport:report});
 }});
 assert.equal(state.detailed,'available');assert.deepEqual(methods,['GET summary','GET detailed']);
});

test('mismatched legacy artifacts fail automatic validation without dispatching a paid replacement',async()=>{
 for(const change of [(value:ReturnType<typeof legacy>)=>({...value,snapshotKey:'f'.repeat(64)}),(value:ReturnType<typeof legacy>)=>({...value,question:'Another question'})]){
  const current=run();current.runId+='-'+Math.random();const report=change(legacy(current)),key=hash(detailedReportSnapshotPayload(current)),summaryKey=hash(reportSnapshotPayload(projectReportEvidence(current))),methods:string[]=[];
  const state=await prepareAutomaticReports(current,{storage:null,fetcher:async(input,init)=>{
   const kind=String(input).includes('/summary')?'summary':'detailed';methods.push((init?.method??'GET')+' '+kind);
   if(kind==='summary')return Response.json({snapshotKey:summaryKey,summary:{version:1,runId:current.runId,snapshotKey:summaryKey,generatedAt:report.generatedAt,sections:{findings:'Fictional views.',agreements:'Unknown.',disagreements:'Unknown.',concerns:'Unknown.',unknowns:'Unknown.'}}});
   return Response.json({snapshotKey:key,report:null,legacyReport:report});
  }});
  assert.equal(state.detailed,'failed');assert.deepEqual(methods,['GET summary','GET detailed']);
 }
});
