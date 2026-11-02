import '../../../scripts/testing/offline-network.mjs';
import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createReportSummaryService,createReportSummaryGenerator,projectReportEvidence,reportSnapshotKey,handleReportSummary,REPORT_SUMMARY_SYSTEM} from '../../server/report-summary.ts';
import {MODEL,PROVIDER} from '../../server/inference/deepseek.ts';
import type {PublicExplore} from '../../society/public-contract.ts';
import type {ReportSections} from '../../report-summary/contract.ts';
import {reportSnapshotPayload} from '../../report-summary/evidence.ts';
const token='a'.repeat(64);
const sections=():ReportSections=>({findings:'This fictional run was interrupted.',agreements:'Agreement details are unavailable.',disagreements:'Disagreement details are unavailable.',concerns:'Concern details cannot be assessed.',unknowns:'Calculated effects are estimates; outcomes remain unknown.'});
function run():PublicExplore {
 return {version:3,kind:'summary-execution',attemptId:'attempt',requestIdentity:'request',runId:'report-test',planId:null,question:'What may change?',status:'partial',request:null,graph:{version:1,scenarioIdentity:'scenario',executionIdentity:'report-test',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:['Fictional scenario'],limitations:['Incomplete run'],sources:[],accounting:{planningCalls:null,actionCalls:null,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:{id:'session',token,revision:1},society:null};
}
function setup(t:TestContext) {
 const directory=mkdtempSync(join(tmpdir(),'report-summary-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 let current=run(),calls=0,reads=0;
 const readSnapshot=async(id:string,provided:string)=>{reads++;if(provided!==token||id!==current.runId)throw Error('PUBLIC_ACCESS');return structuredClone(current);};
 const generate=async()=>{calls++;return sections();};
 const service=createReportSummaryService({storeDirectory:directory,readSnapshot,generate});
 return {directory,service,readSnapshot,generate,get calls(){return calls;},get reads(){return reads;},get current(){return current;},set current(value:PublicExplore){current=value;}};
}
test('report input is a bounded allowlist, excluding tokens, private content, profiles, graph bags and groups',()=>{
 const value=run() as any;value.session.token='PRIVATE_TOKEN';value.demographics={profile:'PRIVATE_PROFILE'};value.memory='PRIVATE_MEMORY';value.messages=['PRIVATE_MESSAGES'];value.graph.nodes=[{properties:{secret:'PRIVATE_GRAPH'}}];
 value.society={phase:'partial',tick:3,totalSteps:80,counts:{agents:50,events:30,modelEvents:29,ruleEvents:1},limitations:[],platforms:[{name:'Public venue',summary:'Recorded activity only.',arguments:'Counts do not establish meaning.',themes:['transport'],limitations:[],private:'PRIVATE_PLATFORM'}],groups:[{members:['PRIVATE_MEMBER'],summary:'PRIVATE_GROUP'}],agents:[{profile:'PRIVATE_AGENT'}]};
 value.grounding={limitations:['Static model'],impact:{assumptions:['Assumed operating service'],sample:[{citizenId:'PRIVATE_CITIZEN'}],diagnostics:{private:'PRIVATE_DIAGNOSTIC'},summary:{interpretation:'Static commute estimates',representedPopulation:50,representedAgents:5,comparableWeight:40,meanMinutesSaved:2,benefitingShare:.5,coverage:Object.fromEntries(['improved','unchanged','worse','newly-reachable','unreachable','unknown','not-applicable'].map(key=>[key,{agents:1,weight:10}]))}}};
 const evidence=projectReportEvidence(value),encoded=JSON.stringify(evidence);assert.equal(evidence.calculatedCommute?.meanMinutesSaved,2);for(const forbidden of ['PRIVATE_TOKEN','PRIVATE_PROFILE','PRIVATE_MEMORY','PRIVATE_MESSAGES','PRIVATE_GRAPH','PRIVATE_MEMBER','PRIVATE_GROUP','PRIVATE_AGENT','PRIVATE_PLATFORM','PRIVATE_CITIZEN','PRIVATE_DIAGNOSTIC'])assert.ok(!encoded.includes(forbidden),forbidden);
 value.question='q'.repeat(10000);value.society.platforms=Array.from({length:100},()=>value.society.platforms[0]);const bounded=projectReportEvidence(value);assert.equal(bounded.question.length,2000);assert.equal(bounded.simulation?.environments.length,16);
 assert.match(REPORT_SUMMARY_SYSTEM,/Counts.*cannot establish substantive agreement/);assert.match(REPORT_SUMMARY_SYSTEM,/interrupted/);assert.match(REPORT_SUMMARY_SYSTEM,/untrusted data/);
});
test('snapshot identity binds evidence/run and prompt version, excluding credentials',()=>{
 const value=run(),original=reportSnapshotKey(projectReportEvidence(value));value.session!.token='b'.repeat(64);assert.equal(reportSnapshotKey(projectReportEvidence(value)),original);
 value.question='Changed question';assert.notEqual(reportSnapshotKey(projectReportEvidence(value)),original);value.question=run().question;value.runId='another-run';assert.notEqual(reportSnapshotKey(projectReportEvidence(value)),original);
 assert.notEqual(reportSnapshotKey(projectReportEvidence(run()),'prompt-v2'),original);
});
test('browser snapshot payload and server hash agree for the same permitted evidence',async()=>{
 const evidence=projectReportEvidence(run()),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(reportSnapshotPayload(evidence)));
 assert.equal(Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),reportSnapshotKey(evidence));
});
test('saved output survives service reopen and reads never generate or bypass authentication',async t=>{
 const d=setup(t),before=await d.service.read('report-test',token);assert.equal(before.summary,null);assert.equal(d.calls,0);
 const summary=await d.service.generate('report-test',token,before.snapshotKey);assert.equal(d.calls,1);
 const reopened=createReportSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,generate:d.generate});
 assert.deepEqual((await reopened.read('report-test',token)).summary,summary);assert.deepEqual(await reopened.generate('report-test',token,before.snapshotKey),summary);assert.equal(d.calls,1);
 await assert.rejects(()=>reopened.read('report-test','0'.repeat(64)),/PUBLIC_ACCESS/);await assert.rejects(()=>reopened.generate('report-test','0'.repeat(64),before.snapshotKey),/PUBLIC_ACCESS/);assert.equal(d.calls,1);
 const saved=readdirSync(d.directory).filter(p=>p.endsWith('.json'));assert.equal(saved.length,1);const content=readFileSync(join(d.directory,saved[0]),'utf8');assert.ok(!content.includes(token));assert.ok(!content.includes('session'));
});

test('one writer request uses server-only public statements and saves readable graph summaries without source text',async t=>{
 const d=setup(t);d.current.graph.nodes=[{id:'reddit'} as any];let sourceReads=0;
 const service=createReportSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,
  readDiscussion:async(value,provided)=>{assert.equal(provided,token);assert.equal(value.runId,d.current.runId);sourceReads++;return {version:1,scope:'Initial public remarks only.',initialStatements:1,followupStatements:0,omitted:0,statements:[{id:'statement-1',actor:'Fictional resident',nodeIds:['reddit'],phase:'initial',text:'PUBLIC_SOURCE_ONLY_SERVER: access could improve but opening hours matter.'}],nodes:[{nodeId:'reddit',label:'Reddit',kind:'communication-platform',description:'A fictional public forum.'}]};},
  generate:async evidence=>{assert.equal(evidence.publicDiscussion?.statements[0].phase,'initial');assert.match(evidence.publicDiscussion!.statements[0].text,/opening hours/);return {sections:sections(),nodeSummaries:[{nodeId:'reddit',summary:'Initial remarks raised access and opening-hour questions.'}]};}});
 const key=(await service.read('report-test',token)).snapshotKey;assert.equal(sourceReads,0,'passive GET never loads raw discussion');
 const output=await service.generate('report-test',token,key);assert.equal(sourceReads,1);assert.equal(output.nodeSummaries?.[0].nodeId,'reddit');
 const reopened=await service.read('report-test',token);assert.deepEqual(reopened.summary,output);await service.generate('report-test',token,key);assert.equal(sourceReads,1,'saved narrative is reused without rereading raw content');
 assert.ok(!JSON.stringify(reopened).includes('PUBLIC_SOURCE_ONLY_SERVER'));assert.ok(!readFileSync(join(d.directory,readdirSync(d.directory)[0]),'utf8').includes('PUBLIC_SOURCE_ONLY_SERVER'));
});

test('unknown graph node narratives are rejected before saving',async t=>{
 const d=setup(t),service=createReportSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,generate:async()=>({sections:sections(),nodeSummaries:[{nodeId:'invented',summary:'Invented node.'}]})}),key=(await service.read('report-test',token)).snapshotKey;
 await assert.rejects(()=>service.generate('report-test',token,key),/REPORT_NODES_TEXT/);assert.equal((await service.read('report-test',token)).summary,null);
});

test('a stale discussion snapshot returns reload-needed without invoking the writer',async t=>{
 const d=setup(t),service=createReportSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readDiscussion:async()=>{throw Error('REPORT_DISCUSSION_STALE');},generate:d.generate}),key=(await service.read('report-test',token)).snapshotKey;
 await assert.rejects(()=>service.generate('report-test',token,key),{code:'REPORT_STALE',status:409});assert.equal(d.calls,0);
});

test('active simulation is rejected before raw discussion reads or paid report generation',async t=>{
 const d=setup(t);let sourceReads=0;
 d.current={...d.current,status:'completed',job:{status:'running',tick:100,totalSteps:320,reason:null} as any};
 const service=createReportSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readDiscussion:async()=>{sourceReads++;throw Error('Must not read discussion while running');},generate:d.generate});
 const key=(await service.read('report-test',token)).snapshotKey;
 await assert.rejects(()=>service.generate('report-test',token,key),{code:'REPORT_RUNNING',status:409});
 await assert.rejects(()=>service.generate('report-test',token,'0'.repeat(64)),{code:'REPORT_RUNNING',status:409});
 assert.equal(sourceReads,0);assert.equal(d.calls,0);
 const response=await handleReportSummary(new Request('http://localhost/api/reports/summary',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({runId:'report-test',snapshotKey:key})}),service);
 assert.equal(response.status,409);assert.match((await response.json()).message,/pause|running/i);assert.equal(d.calls,0);
});

test('the retained run can be summarised after it is paused without restarting its simulation',async t=>{
 const d=setup(t);d.current={...d.current,job:{status:'paused',tick:100,totalSteps:320,reason:null} as any};
 const key=(await d.service.read('report-test',token)).snapshotKey;
 assert.equal((await d.service.generate('report-test',token,key)).runId,'report-test');assert.equal(d.calls,1);
 assert.equal(d.current.job?.status,'paused');
});

test('an incomplete node narrative is not saved by a custom writer adapter',async t=>{
 const d=setup(t);d.current.graph.nodes=[{id:'reddit'} as any];
 const service=createReportSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,generate:async()=>({sections:sections(),nodeSummaries:[]})}),key=(await service.read('report-test',token)).snapshotKey;
 await assert.rejects(()=>service.generate('report-test',token,key),/REPORT_NODES_SHAPE/);assert.equal((await service.read('report-test',token)).summary,null);
});

test('report input explicitly distinguishes initial remarks, AI followups and rule activity',()=>{
 const value=run() as any;value.initialActions=Array(8).fill({});value.society={phase:'completed',tick:320,totalSteps:320,counts:{agents:50,events:1568,modelEvents:0,ruleEvents:1560},usage:{calls:0,accepted:0,skipped:30},limitations:[],platforms:[]};
 const evidence=projectReportEvidence(value);assert.deepEqual(evidence.simulation?.aiDiscussion,{calls:0,accepted:0,skipped:30,initialStatements:8});
 assert.match(REPORT_SUMMARY_SYSTEM,/initial.*remarks/i);assert.match(REPORT_SUMMARY_SYSTEM,/everyday language/i);assert.match(REPORT_SUMMARY_SYSTEM,/Do not lead with.*counts/i);
});
test('changed evidence or prompt invalidates saved output; stale explicit requests make no call',async t=>{
 const d=setup(t),before=await d.service.read('report-test',token);await d.service.generate('report-test',token,before.snapshotKey);d.current={...d.current,question:'Changed'};
 assert.equal((await d.service.read('report-test',token)).summary,null);await assert.rejects(()=>d.service.generate('report-test',token,before.snapshotKey),{code:'REPORT_STALE'});assert.equal(d.calls,1);
 d.current=run();const upgraded=createReportSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,generate:d.generate,promptVersion:'v-next'});assert.equal((await upgraded.read('report-test',token)).summary,null);assert.equal(d.calls,1);
});
test('parallel explicit requests deduplicate to one call and failures do not trigger retries or negative caching',async t=>{
 const d=setup(t);let release!:()=>void,started!:()=>void,calls=0;const gate=new Promise<void>(resolve=>release=resolve),entered=new Promise<void>(resolve=>started=resolve);
 const service=createReportSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,generate:async()=>{calls++;started();await gate;return sections();}}),key=(await service.read('report-test',token)).snapshotKey;
 const one=service.generate('report-test',token,key),two=service.generate('report-test',token,key);await entered;release();assert.deepEqual(await one,await two);assert.equal(calls,1);
 d.current={...d.current,question:'Different snapshot'};let failures=0;
 const failing=createReportSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,generate:async()=>{failures++;throw Error('PRIVATE_UPSTREAM');}}),next=(await failing.read('report-test',token)).snapshotKey;
 await assert.rejects(()=>failing.generate('report-test',token,next),/PRIVATE_UPSTREAM/);assert.equal(failures,1);assert.equal((await failing.read('report-test',token)).summary,null);assert.equal(failures,1);
 await assert.rejects(()=>failing.generate('report-test',token,next));assert.equal(failures,2,'only a new explicit request retries');
});
test('a run changing during inference discards output without saving it',async t=>{
 const d=setup(t),service=createReportSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,generate:async()=>{d.current={...d.current,session:{...d.current.session!,revision:2}};return sections();}}),key=(await service.read('report-test',token)).snapshotKey;
 await assert.rejects(()=>service.generate('report-test',token,key),{code:'REPORT_STALE'});assert.equal(readdirSync(d.directory).filter(p=>p.endsWith('.json')).length,0);assert.equal((await service.read('report-test',token)).summary,null);
});
test('malformed provider output is rejected without a saved result',async t=>{
 const d=setup(t),service=createReportSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,generate:async()=>({...sections(),findings:'x'.repeat(2401)})}),key=(await service.read('report-test',token)).snapshotKey;
 await assert.rejects(()=>service.generate('report-test',token,key),/REPORT_SUMMARY_TEXT/);assert.equal((await service.read('report-test',token)).summary,null);assert.equal(readdirSync(d.directory).filter(p=>p.endsWith('.json')).length,0);
});
test('HTTP boundary rejects unauthenticated/arbitrary evidence and returns safe errors with no-store headers',async t=>{
 const d=setup(t),url='http://localhost/api/reports/summary',headers={authorization:`Bearer ${token}`,'content-type':'application/json'};
 const unauth=await handleReportSummary(new Request(url+'?runId=report-test'),d.service);assert.equal(unauth.status,403);assert.equal(d.reads,0);
 const key=(await d.service.read('report-test',token)).snapshotKey;
 for(const body of [{runId:'report-test',snapshotKey:key,evidence:'PRIVATE'}, {runId:'report-test',snapshotKey:key,token}, {runId:'report-test',snapshotKey:'x'.repeat(1100)}])assert.ok((await handleReportSummary(new Request(url,{method:'POST',headers,body:JSON.stringify(body)}),d.service)).status>=400);
 assert.equal(d.calls,0);const get=await handleReportSummary(new Request(url+'?runId=report-test',{headers}),d.service);assert.equal(get.status,200);assert.equal(get.headers.get('cache-control'),'no-store');assert.equal(d.calls,0);
 const privateFail=createReportSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,generate:async()=>{throw Error('PRIVATE_ERROR_AND_KEY');}});
 const failed=await handleReportSummary(new Request(url,{method:'POST',headers,body:JSON.stringify({runId:'report-test',snapshotKey:key})}),privateFail);assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('PRIVATE_ERROR_AND_KEY'));
 const cross=await handleReportSummary(new Request(url+'?runId=report-test',{headers:{...headers,origin:'https://elsewhere.invalid'}}),d.service);assert.equal(cross.status,403);
});
for(const [internalHost,browserHost] of [['localhost:3000','127.0.0.1:3000'],['127.0.0.1:3000','localhost:3000']])test('report generation accepts the browser Host when Next uses '+internalHost+' internally',async t=>{
 const d=setup(t),key=(await d.service.read('report-test',token)).snapshotKey;
 const headers={authorization:`Bearer ${token}`,'content-type':'application/json',host:browserHost,origin:'http://'+browserHost};
 const response=await handleReportSummary(new Request('http://'+internalHost+'/api/reports/summary',{method:'POST',headers,body:JSON.stringify({runId:'report-test',snapshotKey:key})}),d.service);
 assert.equal(response.status,200,await response.text());assert.equal(d.calls,1);
});

test('report origin check rejects cross-origin and forged forwarded-host requests before reading or generating',async t=>{
 const d=setup(t),url='http://localhost:3000/api/reports/summary';
 for(const origin of ['https://elsewhere.invalid','http://localhost:3001','https://localhost:3000','null','http://localhost:3000']){
  const response=await handleReportSummary(new Request(url,{method:'POST',headers:{host:'127.0.0.1:3000',origin,'x-forwarded-host':origin==='null'?'elsewhere.invalid':new URL(origin).host,authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({runId:'report-test',snapshotKey:'a'.repeat(64)})}),d.service);
  assert.equal(response.status,403);assert.equal((await response.json()).message,'Invalid request origin.');
 }
 assert.equal(d.calls,0);assert.equal(d.reads,0);
});

test('report generator keeps the configured transport identity and sends one bounded structured completion',async()=>{
 let calls=0;const evidence=projectReportEvidence(run());
 const generate=createReportSummaryGenerator({key:'mock-private-key',fetcher:async(url,init)=>{
  calls++;assert.equal(String(url),'https://openrouter.ai/api/v1/chat/completions');assert.equal(init?.method,'POST');
  const body=JSON.parse(String(init?.body));assert.equal(body.model,MODEL);assert.deepEqual(body.provider,{only:[PROVIDER],allow_fallbacks:false,require_parameters:true});assert.equal(body.max_tokens,4000);
  assert.deepEqual(body.response_format.json_schema.schema.required,['findings','agreements','disagreements','concerns','unknowns','nodeSummaries']);assert.equal(body.response_format.json_schema.schema.additionalProperties,false);assert.deepEqual(JSON.parse(body.messages[1].content),evidence);assert.ok(!body.messages[1].content.includes('mock-private-key'));
  return Response.json({id:'mock-report',model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify({...sections(),nodeSummaries:[]})}}],usage:{prompt_tokens:400,completion_tokens:150,total_tokens:550,cost:0.0001}});
 }});
 assert.deepEqual(await generate(evidence),{sections:sections(),nodeSummaries:[]});assert.equal(calls,1);
});
test('report transport never retries malformed output or provider errors',async()=>{
 for(const mode of ['malformed','upstream'] as const){let calls=0;
  const generate=createReportSummaryGenerator({key:'mock-key',fetcher:async()=>{calls++;return mode==='upstream'?Response.json({error:'PRIVATE_PROVIDER_BODY'},{status:503}):Response.json({id:'mock-invalid',model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify({findings:'missing four sections'})}}]});}});
  await assert.rejects(()=>generate(projectReportEvidence(run())),error=>{assert.ok(error instanceof Error);assert.ok(!error.message.includes('PRIVATE_PROVIDER_BODY'));return true;});assert.equal(calls,1,mode);
 }
});
