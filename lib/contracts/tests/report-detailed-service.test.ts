import '../../../scripts/testing/offline-network.mjs';
import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import type {PublicExplore} from '../../society/public-contract.ts';
import type {PublicDiscussionEvidence} from '../../report-summary/discussion-contract.ts';
import * as implementation from '../../server/report-detailed.ts';

const token = 'a'.repeat(64);
function run(): PublicExplore {
  return {version:3,kind:'summary-execution',attemptId:'attempt',requestIdentity:'request',runId:'detailed-test',planId:null,question:'What may change?',status:'partial',request:null,graph:{version:1,scenarioIdentity:'scenario',executionIdentity:'detailed-test',nodes:[],edges:[],limitations:[]},inspections:{},roles:[{id:'resident',label:'Resident',goals:['Reliable access']}],initialActions:[],assumptions:['Fictional scenario'],limitations:['Incomplete run'],sources:[],accounting:{planningCalls:null,actionCalls:null,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:{id:'session',token,revision:1},society:null};
}
const sections = () => ({assessment:'The interrupted fictional discussion suggests conditional support.',impacts:'Effects depend on the assumptions; no observed outcomes are available.',perspectives:'Residents prioritise reliable access.',tradeoffs:'Access and operating constraints remain in tension.',developments:'Only initial views are available; later change is not established.',nextSteps:'The analysis suggests checking operating assumptions.'});
const draft = () => ({sections:sections(),findings:[]});
const discussion = ():PublicDiscussionEvidence => ({version:1,scope:'Initial public statements only.',initialStatements:1,followupStatements:0,omitted:0,statements:[{id:'public-1',actor:'Resident',nodeIds:[],phase:'initial',text:'PUBLIC_SOURCE_ONLY_SERVER: reliable access needs suitable operating hours.'}],nodes:[]});
function setup(t:TestContext) {
  const directory = mkdtempSync(join(tmpdir(),'detailed-report-'));
  t.after(() => rmSync(directory,{recursive:true,force:true}));
  let current=run(),calls=0,reads=0,sourceReads=0;
  const readSnapshot=async(id:string,provided:string)=>{reads++;if(provided!==token||id!==current.runId)throw Error('PUBLIC_ACCESS');return structuredClone(current);};
  const readDiscussion=async()=>{sourceReads++;return discussion();};
  const generate=async()=>{calls++;return draft();};
  const service=implementation.createDetailedReportService({storeDirectory:directory,readSnapshot,readDiscussion,generate});
  return {directory,service,readSnapshot,readDiscussion,generate,get calls(){return calls;},get reads(){return reads;},get sourceReads(){return sourceReads;},get current(){return current;},set current(v:PublicExplore){current=v;}};
}

test('detailed reports persist independently and authenticated reads never invoke sources or inference',async t=>{
  const d=setup(t),before=await d.service.read('detailed-test',token);
  assert.equal(before.report,null);assert.equal(d.calls,0);assert.equal(d.sourceReads,0);
  const report=await d.service.generate('detailed-test',token,before.snapshotKey);
  assert.equal(report.version,2);assert.equal(report.question,'What may change?');assert.equal(report.runStatus,'partial');assert.deepEqual(report.sections,sections());
  const reopened=implementation.createDetailedReportService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readDiscussion:d.readDiscussion,generate:d.generate});
  assert.deepEqual((await reopened.read('detailed-test',token)).report,report);
  assert.deepEqual(await reopened.generate('detailed-test',token,before.snapshotKey),report);assert.equal(d.calls,1);assert.equal(d.sourceReads,1);
  await assert.rejects(()=>reopened.read('detailed-test','b'.repeat(64)),/PUBLIC_ACCESS/);
  await assert.rejects(()=>reopened.generate('detailed-test','b'.repeat(64),before.snapshotKey),/PUBLIC_ACCESS/);
  const file=readdirSync(d.directory).find(p=>p.endsWith('.json'))!;
  const saved=readFileSync(join(d.directory,file),'utf8');
  assert.ok(!saved.includes(token));assert.ok(!saved.includes('PUBLIC_SOURCE_ONLY_SERVER'));assert.ok(!saved.includes('session'));
});

test('snapshot identity matches browser payload and invalidates on prompt changes but not credentials',async t=>{
  const d=setup(t),key=(await d.service.read('detailed-test',token)).snapshotKey;
  const {detailedReportSnapshotPayload}=await import('../../report-detailed/contract.ts');
  assert.equal(key,createHash('sha256').update(detailedReportSnapshotPayload(d.current)).digest('hex'));
  d.current.session!.token='b'.repeat(64);assert.equal((await d.service.read('detailed-test',token)).snapshotKey,key);
  const upgraded=implementation.createDetailedReportService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readDiscussion:d.readDiscussion,generate:d.generate,promptVersion:'detailed-v-next'});
  assert.notEqual((await upgraded.read('detailed-test',token)).snapshotKey,key);
  assert.equal((await upgraded.read('detailed-test',token)).snapshotKey,createHash('sha256').update(detailedReportSnapshotPayload(d.current,'detailed-v-next')).digest('hex'));
});

test('running coordinator and stale requests are rejected before source reads or inference',async t=>{
  const d=setup(t),key=(await d.service.read('detailed-test',token)).snapshotKey;
  d.current.question='Changed question';
  await assert.rejects(()=>d.service.generate('detailed-test',token,key),{code:'REPORT_STALE',status:409});
  d.current={...d.current,status:'completed',job:{version:1,id:'job',status:'running',tick:10,totalSteps:100,acceptedDecisions:0,participatingAgents:0,capacity:100,admittedCalls:0,remainingCalls:10,reason:null,revision:1}};
  const runningKey=(await d.service.read('detailed-test',token)).snapshotKey;
  await assert.rejects(()=>d.service.generate('detailed-test',token,runningKey),{code:'REPORT_RUNNING',status:409});
  assert.equal(d.calls,0);assert.equal(d.sourceReads,0);
  d.current.job!.status='paused';
  const pausedKey=(await d.service.read('detailed-test',token)).snapshotKey;
  const pausedReport=await d.service.generate('detailed-test',token,pausedKey);
  assert.equal(pausedReport.runId,'detailed-test');assert.equal(pausedReport.runStatus,'paused');assert.equal(d.calls,1);
});

test('concurrent requests share one writer operation; explicit failures have no automatic retries',async t=>{
  const d=setup(t);let release!:()=>void,started!:()=>void,calls=0;
  const gate=new Promise<void>(r=>release=r),entered=new Promise<void>(r=>started=r);
  const service=implementation.createDetailedReportService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readDiscussion:d.readDiscussion,generate:async()=>{calls++;started();await gate;return draft();}});
  const key=(await service.read('detailed-test',token)).snapshotKey;
  const one=service.generate('detailed-test',token,key),two=service.generate('detailed-test',token,key);await entered;release();
  assert.deepEqual(await one,await two);assert.equal(calls,1);assert.equal(d.sourceReads,1);
  d.current.question='Another snapshot';let failures=0;
  const failing=implementation.createDetailedReportService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readDiscussion:d.readDiscussion,generate:async()=>{failures++;throw Error('PRIVATE_FAILURE');}});
  const next=(await failing.read('detailed-test',token)).snapshotKey;
  await assert.rejects(()=>failing.generate('detailed-test',token,next),/PRIVATE_FAILURE/);assert.equal(failures,1);
  assert.equal((await failing.read('detailed-test',token)).report,null);assert.equal(failures,1);
  await assert.rejects(()=>failing.generate('detailed-test',token,next));assert.equal(failures,2);
});

test('changed or resumed snapshots after source loading or inference never save stale output',async t=>{
  const d=setup(t);
  for(const stage of ['discussion','inference']){
    let calls=0;
    const change=()=>{d.current.session!.revision++;};
    const service=implementation.createDetailedReportService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readDiscussion:async()=>{if(stage==='discussion')change();return discussion();},generate:async()=>{calls++;if(stage==='inference')change();return draft();}});
    const key=(await service.read('detailed-test',token)).snapshotKey;
    await assert.rejects(()=>service.generate('detailed-test',token,key),{code:'REPORT_STALE'});
    assert.equal(calls,stage==='discussion'?0:1);assert.equal(readdirSync(d.directory).filter(p=>p.endsWith('.json')).length,0);
  }
  const service=implementation.createDetailedReportService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readDiscussion:async()=>{throw Error('REPORT_DISCUSSION_STALE');},generate:d.generate});
  const key=(await service.read('detailed-test',token)).snapshotKey;
  await assert.rejects(()=>service.generate('detailed-test',token,key),{code:'REPORT_STALE'});assert.equal(d.calls,0);
});

test('malformed or oversized writer sections are rejected without overwriting an existing artifact',async t=>{
  const d=setup(t),key=(await d.service.read('detailed-test',token)).snapshotKey;
  const previous=await d.service.generate('detailed-test',token,key);
  const file=join(d.directory,readdirSync(d.directory).find(p=>p.endsWith('.json'))!),contents=readFileSync(file,'utf8');
  d.current.question='Changed';
  const service=implementation.createDetailedReportService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readDiscussion:d.readDiscussion,generate:async()=>({sections:{...sections(),assessment:'x'.repeat(12001)},findings:[]})});
  const next=(await service.read('detailed-test',token)).snapshotKey;
  await assert.rejects(()=>service.generate('detailed-test',token,next));assert.equal(readFileSync(file,'utf8'),contents);
  assert.equal(previous.snapshotKey,key);assert.equal((await service.read('detailed-test',token)).report,null);
});

test('saved quick-summary shaped output cannot be read as a detailed report',async t=>{
  const d=setup(t),key=(await d.service.read('detailed-test',token)).snapshotKey;
  writeFileSync(join(d.directory,createHash('sha256').update('detailed-test').digest('hex')+'.json'),JSON.stringify({version:1,runId:'detailed-test',snapshotKey:key,generatedAt:new Date().toISOString(),sections:{findings:'Quick summary'}}));
  await assert.rejects(()=>d.service.read('detailed-test',token));assert.equal(d.calls,0);
});

test('HTTP boundary enforces authentication, origin and strict bounded requests with safe no-store responses',async t=>{
  const d=setup(t),url='http://localhost/api/reports/detailed',headers={authorization:`Bearer ${token}`,'content-type':'application/json'};
  const unauthorized=await implementation.handleDetailedReport(new Request(url+'?runId=detailed-test'),d.service);
  assert.equal(unauthorized.status,403);assert.equal(d.reads,0);
  const key=(await d.service.read('detailed-test',token)).snapshotKey;
  for(const body of [{runId:'detailed-test',snapshotKey:key,evidence:discussion()},{runId:'detailed-test',snapshotKey:key,token},{runId:'../private',snapshotKey:key},{runId:'detailed-test',snapshotKey:'x'.repeat(1100)}]){
    assert.ok((await implementation.handleDetailedReport(new Request(url,{method:'POST',headers,body:JSON.stringify(body)}),d.service)).status>=400);
  }
  for(const query of ['?runId=detailed-test&runId=detailed-test','?runId=detailed-test&evidence=x'])assert.equal((await implementation.handleDetailedReport(new Request(url+query,{headers}),d.service)).status,400);
  const cross=await implementation.handleDetailedReport(new Request(url+'?runId=detailed-test',{headers:{...headers,host:'localhost',origin:'https://elsewhere.invalid','x-forwarded-host':'elsewhere.invalid'}}),d.service);assert.equal(cross.status,403);
  const passive=await implementation.handleDetailedReport(new Request(url+'?runId=detailed-test',{headers}),d.service);assert.equal(passive.status,200);assert.equal(passive.headers.get('cache-control'),'no-store');assert.equal(passive.headers.get('vary'),'Authorization');assert.equal(d.calls,0);
  assert.deepEqual(Object.keys(await passive.json()).sort(),['report','snapshotKey']);
  const response=await implementation.handleDetailedReport(new Request(url,{method:'POST',headers:{...headers,host:'127.0.0.1',origin:'http://127.0.0.1'},body:JSON.stringify({runId:'detailed-test',snapshotKey:key})}),d.service);
  assert.equal(response.status,200);assert.deepEqual(Object.keys(await response.json()),['report']);
  d.current.question='Different';const next=(await d.service.read('detailed-test',token)).snapshotKey;
  const failing=implementation.createDetailedReportService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readDiscussion:d.readDiscussion,generate:async()=>{throw Error('PRIVATE_ERROR_WITH_SECRET');}});
  const failure=await implementation.handleDetailedReport(new Request(url,{method:'POST',headers,body:JSON.stringify({runId:'detailed-test',snapshotKey:next})}),failing);
  assert.equal(failure.status,503);assert.ok(!(await failure.text()).includes('PRIVATE_ERROR_WITH_SECRET'));
});

test('detailed generator sends one structured completion through the configured model and rejects incomplete output without retry',async t=>{
  setup(t);
  const {MODEL,PROVIDER}=await import('../../server/inference/deepseek.ts');
  const {projectDetailedReportEvidence}=await import('../../report-detailed/evidence.ts');
  const {buildFindingEvidenceCatalog}=await import('../../server/report-detailed-findings.ts');
  const evidence={...projectDetailedReportEvidence(run()),publicDiscussion:discussion(),findingEvidence:buildFindingEvidenceCatalog(run(),discussion())};
  let calls=0;
  const generator=implementation.createDetailedReportGenerator({key:'mock-private-key',timeoutMs:45000,fetcher:async(url,init)=>{
    calls++;assert.equal(String(url),'https://openrouter.ai/api/v1/chat/completions');
    const body=JSON.parse(String(init?.body));assert.equal(body.model,MODEL);assert.deepEqual(body.provider,{only:[PROVIDER],allow_fallbacks:false,require_parameters:true});assert.ok(body.max_tokens<=6500);assert.ok(body.max_tokens>=4000);
    const schema=body.response_format.json_schema.schema;assert.equal(body.response_format.json_schema.name,'detailed_report_v2');assert.deepEqual(schema.required,['sections','findings']);assert.deepEqual(schema.properties.sections.required,['assessment','impacts','perspectives','tradeoffs','developments','nextSteps']);assert.equal(schema.additionalProperties,false);assert.deepEqual(schema.properties.findings.items.properties.supportIds.items.enum,evidence.findingEvidence.map(item=>item.id));assert.deepEqual(JSON.parse(body.messages[1].content),evidence);assert.ok(!body.messages[1].content.includes('mock-private-key'));
    return Response.json({id:'mock-detailed',model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(draft())}}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}});
  }});
  assert.deepEqual(await generator(evidence),draft());assert.equal(calls,1);
  let failures=0;
  const truncated=implementation.createDetailedReportGenerator({key:'mock-private-key',fetcher:async()=>{failures++;return Response.json({id:'mock-truncated',model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'length',message:{content:JSON.stringify(draft())}}],usage:{}});}});
  await assert.rejects(()=>truncated(evidence),{code:'AI_RESPONSE_INCOMPLETE'});assert.equal(failures,1);
});

test('oversized UTF-8 detailed evidence is rejected before provider dispatch',async t=>{
  setup(t);
  const {projectDetailedReportEvidence}=await import('../../report-detailed/evidence.ts');
  const pack=discussion();pack.statements[0].text='界'.repeat(90000);
  let calls=0;
  const generator=implementation.createDetailedReportGenerator({key:'mock-private-key',fetcher:async()=>{calls++;throw Error('Must not dispatch');}});
  await assert.rejects(()=>generator({...projectDetailedReportEvidence(run()),publicDiscussion:pack,findingEvidence:[]}),{code:'REPORT_INPUT',status:413});
  assert.equal(calls,0);
});
