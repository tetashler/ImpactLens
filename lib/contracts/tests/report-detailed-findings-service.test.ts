import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {PublicExplore} from '../../society/public-contract.ts';
import type {PublicDiscussionEvidence} from '../../report-summary/discussion-contract.ts';
import {detailedReportSnapshotPayload} from '../../report-detailed/contract.ts';
import {createDetailedReportService,createDetailedReportGenerator} from '../../server/report-detailed.ts';

const token='a'.repeat(64),hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const sections=()=>({assessment:'A conditional fictional assessment.',impacts:'No observed outcomes.',perspectives:'A participant raised an access condition.',tradeoffs:'Operating conditions remain open.',developments:'Initial statements only.',nextSteps:'Check operating hours.'});
function run():PublicExplore{return {version:3,kind:'summary-execution',attemptId:'findings-service',requestIdentity:'findings-service',runId:'findings-service',planId:null,question:'What may change?',status:'partial',request:null,graph:{version:1,scenarioIdentity:'findings-service',executionIdentity:'findings-service',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:null,actionCalls:null,inputTokens:null,outputTokens:null,costUsd:null},demographics:{profile:'PRIVATE_PROFILE'},session:{id:'PRIVATE_SESSION',token,revision:1},society:null};}
function discussion():PublicDiscussionEvidence{return {version:1,scope:'Accepted public fictional statements.',initialStatements:2,followupStatements:0,omitted:0,statements:[{id:'RAW_PRIVATE_EVENT_ID',actor:'Fictional resident',nodeIds:['RAW_NODE_ID'],phase:'initial',text:'Suitable operating hours are a condition of access.'},{id:'UNUSED_EVENT_ID',actor:'Another resident',nodeIds:[],phase:'initial',text:'UNREFERENCED_STATEMENT: a separate issue.'}],nodes:[]};}
function finding(supportId:string){return {text:'A fictional resident raised operating hours as a condition of access.',supportIds:[supportId],limitations:['One fictional initial statement, not measured public opinion.'],unresolvedDependencies:['Operating hours need to be established.']};}

test('V2 persists only referenced public support and reopens without source reads or inference',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'findings-service-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const current=run(),pack=discussion();let calls=0,sourceReads=0;
 let selectedId='';
 const service=createDetailedReportService({storeDirectory:directory,readSnapshot:async()=>current,readDiscussion:async()=>{sourceReads++;return pack;},generate:async evidence=>{
  calls++;const support=evidence.findingEvidence.find(e=>e.kind==='discussion-event'&&e.text.startsWith('Suitable operating hours'))!;assert.ok(support);selectedId=support.id;
  for(const rawId of ['RAW_PRIVATE_EVENT_ID','RAW_NODE_ID','UNUSED_EVENT_ID'])assert.ok(!JSON.stringify(evidence).includes(rawId));
  return {sections:sections(),findings:[finding(support.id)]};
 }});
 const initial=await service.read(current.runId,token),saved=await service.generate(current.runId,token,initial.snapshotKey);assert.equal(saved.version,2);
 if(saved.version!==2)assert.fail('V2 expected');
 assert.equal(saved.findings[0].id,'finding-1');assert.deepEqual(saved.findings[0].supportIds,[selectedId]);assert.equal(saved.evidence.length,1);assert.equal(saved.evidence[0].kind,'discussion-event');
 const bytes=readFileSync(join(directory,hash(current.runId)+'.json'),'utf8');
 for(const secret of [token,'PRIVATE_PROFILE','PRIVATE_SESSION','RAW_PRIVATE_EVENT_ID','RAW_NODE_ID','UNUSED_EVENT_ID','UNREFERENCED_STATEMENT','publicDiscussion','initialStatements'])assert.ok(!bytes.includes(secret),secret);
 assert.ok(bytes.includes(pack.statements[0].text));
 const reopened=createDetailedReportService({storeDirectory:directory,readSnapshot:async()=>current,readDiscussion:async()=>{throw Error('GET must not read sources');},generate:async()=>{throw Error('GET must not use inference');}});
 assert.deepEqual((await reopened.read(current.runId,token)).report,saved);assert.deepEqual(await reopened.generate(current.runId,token,initial.snapshotKey),saved);assert.equal(calls,1);assert.equal(sourceReads,1);
});

test('raw discussion identifier echoes in chapters or finding caveats are rejected before persistence',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'findings-privacy-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const current=run(),path=join(directory,hash(current.runId)+'.json');
 const original=JSON.stringify({version:1,runId:current.runId,snapshotKey:hash(detailedReportSnapshotPayload(current,'detailed-report-v1')),generatedAt:'2026-11-02T00:00:00.000Z',question:current.question,runStatus:'partial',sections:sections()});writeFileSync(path,original);
 for(const field of ['chapter','finding'] as const){
  const service=createDetailedReportService({storeDirectory:directory,readSnapshot:async()=>current,readDiscussion:async()=>discussion(),generate:async evidence=>{
   const draft={sections:sections(),findings:[finding(evidence.findingEvidence[0].id)]};
   if(field==='chapter')draft.sections.assessment='The event RAW_PRIVATE_EVENT_ID. raises a condition.';
   else draft.findings[0].limitations=['Check RAW_NODE_ID: before relying on the statement.'];
   return draft;
  }});
  const initial=await service.read(current.runId,token);await assert.rejects(()=>service.generate(current.runId,token,initial.snapshotKey),/REPORT_PRIVATE_REFERENCE/);assert.equal(readFileSync(path,'utf8'),original);
 }
});

test('unknown evidence references leave legacy bytes intact and a manual upgrade replaces them only after valid generation',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'findings-upgrade-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const current=run(),path=join(directory,hash(current.runId)+'.json');
 const legacy={version:1,runId:current.runId,snapshotKey:hash(detailedReportSnapshotPayload(current,'detailed-report-v1')),generatedAt:'2026-11-02T00:00:00.000Z',question:current.question,runStatus:'partial',sections:sections()},bytes=JSON.stringify(legacy);writeFileSync(path,bytes);
 const bad=createDetailedReportService({storeDirectory:directory,readSnapshot:async()=>current,readDiscussion:async()=>discussion(),generate:async()=>({sections:sections(),findings:[finding('invented-evidence-id')]})});
 const initial=await bad.read(current.runId,token);assert.equal(initial.report,null);assert.deepEqual(initial.legacyReport,legacy);
 await assert.rejects(()=>bad.generate(current.runId,token,initial.snapshotKey),/REPORT_FINDINGS_REFERENCE/);assert.equal(readFileSync(path,'utf8'),bytes);assert.deepEqual((await bad.read(current.runId,token)).legacyReport,legacy);
 let calls=0;const good=createDetailedReportService({storeDirectory:directory,readSnapshot:async()=>current,readDiscussion:async()=>discussion(),generate:async evidence=>{calls++;return {sections:sections(),findings:[finding(evidence.findingEvidence[0].id)]};}});
 const report=await good.generate(current.runId,token,initial.snapshotKey);assert.equal(report.version,2);assert.notEqual(readFileSync(path,'utf8'),bytes);assert.deepEqual((await good.read(current.runId,token)).report,report);assert.ok(!Object.hasOwn(await good.read(current.runId,token),'legacyReport'));assert.equal(calls,1);
});

test('healthcare generation reserves and persists the unknown finding in its one structured completion',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'findings-healthcare-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const current=run();current.question='What if a new polyclinic is built?';const pack=discussion();let calls=0;
 const generator=createDetailedReportGenerator({key:'offline-key',fetcher:async(_url,init)=>{
  calls++;const body=JSON.parse(String(init?.body));assert.equal(body.response_format.json_schema.schema.properties.findings.maxItems,4);assert.match(body.messages[0].content,/waiting-time improvements/);assert.equal(body.max_tokens,6000);
  return Response.json({id:'healthcare-findings',model:body.model,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify({sections:sections(),findings:[]})}}],usage:{}});
 }});
 const service=createDetailedReportService({storeDirectory:directory,readSnapshot:async()=>current,readDiscussion:async()=>pack,generate:generator});
 const initial=await service.read(current.runId,token),report=await service.generate(current.runId,token,initial.snapshotKey);assert.equal(report.version,2);
 if(report.version!==2)assert.fail('V2 expected');assert.equal(report.findings.length,1);assert.match(report.findings[0].text,/Waiting-time improvement is unknown/);assert.equal(report.evidence.length,1);assert.equal(report.evidence[0].kind,'model-limitation');assert.equal(calls,1);
});
