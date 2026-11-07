import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createReportSummaryService,reportSnapshotKey,projectReportEvidence,handleReportSummary} from '../../server/report-summary.ts';
import {createDetailedReportService,detailedReportSnapshotKey,handleDetailedReport} from '../../server/report-detailed.ts';
import {createGraphNodeSummaryService,graphNodeSummarySnapshotKey,handleGraphNodeSummaries} from '../../server/graph-node-summaries.ts';
import type {PublicExplore} from '../../society/public-contract.ts';
import {readPublicReportSnapshot} from '../../server/society/public-service.ts';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {handleAssumptionRequest} from '../../server/assumption-review/service.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {reserveStorageAdmission} from '../../server/society/storage-admission.ts';
const token='a'.repeat(64),runId='archive-report';
function run():PublicExplore{return {version:3,kind:'summary-execution',attemptId:'attempt',requestIdentity:'request',runId,planId:null,question:'What may change?',status:'partial',request:null,graph:{version:1,scenarioIdentity:'scenario',executionIdentity:runId,nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:null,actionCalls:null,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:null,society:null};}
const discussion={version:1 as const,scope:'No public statements.',initialStatements:0,followupStatements:0,omitted:0,statements:[],nodes:[]};
for(const kind of ['summary','detailed','graph'] as const)test(`${kind}: archived artifacts remain authenticated and generation is refused even when cached`,async()=>{
 const directory=mkdtempSync(join(tmpdir(),'archive-reports-')),archived=join(directory,'period');mkdirSync(archived);
 let current=run(),calls=0,resolutions=0;
 const common={storeDirectory:directory,readSnapshot:async(id:string,provided:string)=>{if(id!==runId||provided!==token)throw Error('PUBLIC_ACCESS');return structuredClone(current);},resolveArtifactDirectory:()=>{resolutions++;return archived;}};
 const service=kind==='summary'?createReportSummaryService({...common,generate:async()=>{calls++;return {findings:'Fictional views.',agreements:'Unknown.',disagreements:'Unknown.',concerns:'Unknown.',unknowns:'Unknown.'};}}):kind==='detailed'?createDetailedReportService({...common,readDiscussion:async()=>discussion,generate:async()=>{calls++;return {sections:{assessment:'Fictional views.',impacts:'Unknown.',perspectives:'Unknown.',tradeoffs:'Unknown.',developments:'Unknown.',nextSteps:'Unknown.'},findings:[]};}}):createGraphNodeSummaryService({...common,readEvidence:async()=>{throw Error('NO_EVIDENCE');},generate:async()=>{calls++;return [];}});
 const initial=await service.read(runId,token);await service.generate(runId,token,initial.snapshotKey);
 const before=readdirSync(archived).map(file=>readFileSync(join(archived,file),'utf8'));
 current={...current,storage:{version:1,policy:'storage-admission-v1',disposition:'historical-read-only'}};
 const retained=await service.read(runId,token);assert.equal(retained.snapshotKey,initial.snapshotKey);
 if(kind==='summary')assert.ok('summary' in retained&&retained.summary);
 if(kind==='detailed')assert.ok('report' in retained&&retained.report);
 await assert.rejects(()=>service.generate(runId,token,retained.snapshotKey),{code:kind==='graph'?'GRAPH_SUMMARY_READ_ONLY':'REPORT_READ_ONLY',status:409});
 const resolved=resolutions;await assert.rejects(()=>service.read(runId,'b'.repeat(64)),/PUBLIC_ACCESS/);assert.equal(resolutions,resolved,'authentication precedes artifact resolution');
 assert.equal(calls,kind==='graph'?0:1);assert.deepEqual(readdirSync(archived).map(file=>readFileSync(join(archived,file),'utf8')),before);
 if(kind!=='graph')assert.equal(before.length,1,'the retained artifact directory was used');
});

test('historical report identity can retain original frozen status without consulting mutable job state',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'archive-frozen-')),value={...run(),job:{version:1,status:'running'}};
 writeFileSync(join(directory,createHash('sha256').update(runId).digest('hex')+'.json'),JSON.stringify({version:1,token,publicRun:value,execution:{},sessionId:null,revision:0}));
 const deps={storeDirectory:directory,storageHistorical:true};
 const visible=await readPublicReportSnapshot(runId,token,deps),frozen=await readPublicReportSnapshot(runId,token,deps,true);
 assert.equal(visible.job?.status,'paused');assert.equal(frozen.job?.status,'running');assert.equal(frozen.storage?.disposition,'historical-read-only');
 await assert.rejects(()=>readPublicReportSnapshot(runId,'b'.repeat(64),deps,true),/PUBLIC_ACCESS/);
});

test('offline archived public runs retain original capabilities, refuse controls and verify immutable binding bytes',async()=>{
 const base=mkdtempSync(join(tmpdir(),'archive-public-')),value=run();
 const child=spawnSync(process.execPath,['--input-type=module','-e',`import {mkdirSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import {createHash} from 'node:crypto';import * as a from './lib/server/society/storage-admission.ts';const base=${JSON.stringify(base)},run=${JSON.stringify(value)},token=${JSON.stringify(token)};const claim=a.reserveStorageAdmission(run.attemptId,'a'.repeat(64),base);a.bindStorageAdmission(claim,{runId:run.runId,attemptId:run.attemptId},base);const b=a.storageBundle(base);mkdirSync(b.archives,{recursive:true});writeFileSync(join(b.archives,createHash('sha256').update(run.runId).digest('hex')+'.json'),JSON.stringify({version:1,token,publicRun:run,execution:{attemptId:run.attemptId,run:{runId:run.runId}},sessionId:null,revision:0}));`],{cwd:process.cwd(),encoding:'utf8',windowsHide:true});
 assert.equal(child.status,0,child.stderr);
 const artifacts=[['report-summaries',{version:1,runId,snapshotKey:reportSnapshotKey(projectReportEvidence(value)),generatedAt:'2026-11-06T00:00:00.000Z',sections:{findings:'Retained fictional views.',agreements:'Unknown.',disagreements:'Unknown.',concerns:'Unknown.',unknowns:'Unknown.'}}],['detailed-reports',{version:1,runId,snapshotKey:detailedReportSnapshotKey(value),generatedAt:'2026-11-06T00:00:00.000Z',question:value.question,runStatus:'partial',sections:{assessment:'Retained fictional views.',impacts:'Unknown.',perspectives:'Unknown.',tradeoffs:'Unknown.',developments:'Unknown.',nextSteps:'Unknown.'}}],['graph-node-summaries',{version:1,runId,snapshotKey:graphNodeSummarySnapshotKey(value),generatedAt:'2026-11-06T00:00:00.000Z',totalNodes:0,summaries:[]}]] as const;
 for(const [kind,artifact]of artifacts){const directory=join(base,'accepted-private',kind);mkdirSync(directory,{recursive:true});writeFileSync(join(directory,createHash('sha256').update(runId).digest('hex')+'.json'),JSON.stringify(artifact));}
 const lifecycle=await import('../../server/society/storage-lifecycle.ts'),{handlePublicSocial}=await import('../../server/society/public-service.ts');
 lifecycle.rotateStorage(base,{confirm:true});const bundle=lifecycle.archivedStorageBundles(base)[0];
 const before=readdirSync(bundle.archives).map(file=>readFileSync(join(bundle.archives,file),'utf8'));
 const get=(provided=token)=>new Request(`http://localhost/api/social-simulate?runId=${runId}&token=${provided}`);
 const response=await handlePublicSocial(get(),{storageBase:base});assert.equal(response.status,200);const retained=await response.json();assert.equal(retained.storage.disposition,'historical-read-only');assert.ok(!JSON.stringify(retained).includes(token));
 assert.equal((await handlePublicSocial(get('b'.repeat(64)),{storageBase:base})).status,409);
 for(const operation of ['continue','pause','resume','cancel']){const response=await handlePublicSocial(new Request('http://localhost/api/social-simulate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation,runId,token,revision:0})}),{storageBase:base});assert.equal(response.status,409);assert.equal((await response.json()).error,'PUBLIC_ARCHIVED_READ_ONLY');}
 const previousRoot=process.env.SOCIAL_STORAGE_ROOT;process.env.SOCIAL_STORAGE_ROOT=base;
 try{for(const [index,handler]of [handleReportSummary,handleDetailedReport,handleGraphNodeSummaries].entries()){
  const response=await handler(new Request(`http://localhost/api/reports/cache?runId=${runId}`,{headers:{authorization:`Bearer ${token}`}}));assert.equal(response.status,200);const body=await response.json();assert.equal(body.snapshotKey,artifacts[index][1].snapshotKey);assert.ok(body.summary??body.report??body.artifact);
  const denied=await handler(new Request(`http://localhost/api/reports/cache?runId=${runId}`,{headers:{authorization:`Bearer ${'b'.repeat(64)}`}}));assert.equal(denied.status,403);
  const refused=await handler(new Request('http://localhost/api/reports/cache',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({runId,snapshotKey:body.snapshotKey})}));assert.equal(refused.status,409);assert.match((await refused.json()).error,/READ_ONLY/);
  const artifactDirectory=lifecycle.resolveStorageArtifactDirectory(runId,artifacts[index][0],base),artifactPath=join(artifactDirectory,createHash('sha256').update(runId).digest('hex')+'.json'),original=readFileSync(artifactPath,'utf8');
  writeFileSync(artifactPath,original.replace(index===2?'2026':'Unknown',index===2?'2025':'Corrupt'));
  try{const corrupt=await handler(new Request(`http://localhost/api/reports/cache?runId=${runId}`,{headers:{authorization:`Bearer ${token}`}}));assert.equal(corrupt.status,503);const content=await corrupt.text();assert.ok(!content.includes(base));assert.ok(!content.includes(token));}finally{writeFileSync(artifactPath,original);}
 }}finally{if(previousRoot===undefined)delete process.env.SOCIAL_STORAGE_ROOT;else process.env.SOCIAL_STORAGE_ROOT=previousRoot;}
 assert.deepEqual(readdirSync(bundle.archives).map(file=>readFileSync(join(bundle.archives,file),'utf8')),before);
 writeFileSync(join(bundle.archives,readdirSync(bundle.archives)[0]),'CORRUPT_PRIVATE_ARCHIVE');const denied=await handlePublicSocial(get(),{storageBase:base});assert.equal(denied.status,409);assert.ok(!(await denied.text()).includes(base));
});

test('a first pending-review planning process protects storage before any admission claim exists',()=>{
 const base=mkdtempSync(join(tmpdir(),'archive-review-'));
 const child=spawnSync(process.execPath,['--input-type=module','-e',`import './scripts/testing/offline-network.mjs';import {handlePublicExplore} from './lib/server/society/public-service.ts';import {rotateStorage} from './lib/server/society/storage-lifecycle.ts';import {mockDynamicProvider} from './lib/contracts/tests/helpers/dynamic-provider.ts';import {worldFixtures} from './lib/world-graph/fixtures.ts';const base=${JSON.stringify(base)};let code='UNTRIED';const fixture=worldFixtures()[0],provider=mockDynamicProvider(fixture,()=>{if(code==='UNTRIED'){try{rotateStorage(base,{confirm:true});code='ROTATED';}catch(error){code=error.message;}}});const result=await handlePublicExplore(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({version:1,attemptId:'review-before-claim',request:fixture.request})}),{enabled:true,key:'offline',groundingKey:'',fetcher:provider.fetcher},{storageBase:base,swarm:false,prepareReview:async()=>Response.json({kind:'review'})});console.log(JSON.stringify({code,status:result.status}));`],{cwd:process.cwd(),encoding:'utf8',windowsHide:true});
 assert.equal(child.status,0,child.stderr);const result=JSON.parse(child.stdout.trim().split('\n').at(-1)!);assert.match(result.code,/BUSY/);assert.equal(result.status,200);
});

test('capacity consumed after preparation returns a finite storage error and never starts reviewed actions',async()=>{
 const base=mkdtempSync(join(tmpdir(),'archive-review-full-')),fixture=worldFixtures()[0];fixture.draft.assumptions=[{id:'hours',text:'Opening hours remain unchanged.'}];
 const provider=mockDynamicProvider(fixture),dynamic={enabled:true,key:'offline',groundingKey:'',fetcher:provider.fetcher},social={storageBase:base,skipSocialInitialization:true};
 const call=(body:unknown)=>handleAssumptionRequest(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),dynamic,social);
 const prepared=await call({version:3,operation:'prepare',attemptId:'full-after-prepare',request:fixture.request});assert.equal(prepared.status,200);const draft=await prepared.json();
 for(let slot=0;slot<32;slot++)reserveStorageAdmission('other-'+slot,'a'.repeat(64),base);
 const response=await call({version:3,operation:'start',draftId:draft.draftId,token:draft.token,contextKey:draft.contextKey,decisions:draft.assumptions.map((assumption:{id:string})=>({assumptionId:assumption.id,decision:'allow'}))});
 assert.equal(response.status,503);const body=await response.json();assert.equal(body.error,'PRIVATE_STORAGE_CAPACITY');assert.ok(!JSON.stringify(body).includes(base));assert.deepEqual(provider.counts(),{calls:2,plans:2});
});
