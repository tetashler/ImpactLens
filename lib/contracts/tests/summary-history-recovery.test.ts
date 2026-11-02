import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuestionSimulation} from '../../question-simulation/client.ts';
import {rememberSummary,readSummaryReferences,restoreSummaryHistory} from '../../question-simulation/summary-history.ts';
import {assumptionContextKey} from '../../assumption-review/contract.ts';
import {digest} from '../../experiments/validation.ts';
import type {PublicExplore} from '../../society/public-contract.ts';

function storage(){const values=new Map<string,string>();return {getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},key:(i:number)=>[...values.keys()][i]??null,get length(){return values.size;}};}
function run(id='saved',revision=0):PublicExplore{return {version:3,kind:'summary-execution',runId:'run-'+id,attemptId:'history-attempt',requestIdentity:'history',planId:null,question:'What if working hours changed?',status:'completed',request:null,graph:{version:1,scenarioIdentity:'history',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:2,actionCalls:8,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:{id:'history-session',token:'a'.repeat(64),revision},society:null,job:{version:1,id:'history-job',status:'paused',tick:1,totalSteps:144,acceptedDecisions:1,participatingAgents:1,capacity:700,admittedCalls:2,remainingCalls:1,reason:null,revision}};}

test('failed passive history restoration reports unavailability, retains references, and explicit retry recovers the run',async()=>{
 const browser=storage(),saved=run();rememberSummary(browser,saved,100);let unavailable=0;
 const missing=await restoreSummaryHistory(browser,async()=>Response.json({error:'unavailable'},{status:503}),undefined,n=>{unavailable=n;});
 assert.equal(unavailable,1);assert.deepEqual(missing,[]);assert.equal(readSummaryReferences(browser).length,1);
 const restored=await restoreSummaryHistory(browser,async(url,init)=>{assert.match(String(url),/^\/api\/social-simulate\?runId=run-saved&token=[a-f0-9]{64}$/);assert.equal(init?.method,undefined,'Retry must remain a passive GET');assert.equal(init?.cache,'no-store');return Response.json(saved);},undefined,n=>{unavailable=n;});
 assert.equal(unavailable,0);assert.equal(restored[0]?.runId,'run-saved');
});

test('aborted history restoration cannot report failure or publish a late successful response',async()=>{
 const browser=storage();rememberSummary(browser,run(),100);const abort=new AbortController();let notified=false;
 const values=await restoreSummaryHistory(browser,async()=>{abort.abort();return Response.json(run());},abort.signal,()=>{notified=true;});
 assert.deepEqual(values,[]);assert.equal(notified,false);assert.equal(readSummaryReferences(browser).length,1);
});

test('late or failed restoration preserves current history and selected archive, while newer server revisions can refresh it',()=>{
 const controller=createQuestionSimulation();controller.restorePublicHistory([run('current',2)]);controller.inspectArchive('run-current');
 controller.restorePublicHistory([]);assert.equal(controller.getSnapshot().history.length,1);assert.equal(controller.getSnapshot().selectedArchiveId,'run-current');
 controller.restorePublicHistory([run('older'),run('current',1)]);assert.equal(controller.getSnapshot().history[0]?.id,'run-current');assert.equal(controller.getSnapshot().history[0]?.publicRun?.session?.revision,2);
 controller.restorePublicHistory([run('current',3)]);assert.equal(controller.getSnapshot().history[0]?.publicRun?.session?.revision,3);assert.equal(controller.getSnapshot().history.length,2);controller.dispose();
});

test('ranked server references displace older legacy DTOs after initial synchronous restoration',()=>{
 const controller=createQuestionSimulation();controller.restorePublicHistory([run('old-1'),run('old-2'),run('old-3'),run('old-4')]);
 controller.restorePublicHistory([run('newest'),run('next-newest'),run('old-1'),run('old-2')]);
 assert.deepEqual(controller.getSnapshot().history.map(item=>item.id),['run-newest','run-next-newest','run-old-1','run-old-2']);controller.dispose();
});

function acceptedController(onPublicRunAccepted:(value:PublicExplore)=>void){
 const context={question:'What if working hours changed?',geometry:{version:1 as const,scenarioId:'history',features:[]},geometryRevision:0};let prepared:any;
 const controller=createQuestionSimulation({execution:'dynamic',publicOnly:true,onPublicRunAccepted,fetcher:async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  if(body.operation==='prepare'){prepared={version:1,kind:'assumption-review',draftId:'draft-history',token:'a'.repeat(64),attemptId:body.attemptId,contextKey:await assumptionContextKey(body.request),expiresAt:new Date(Date.now()+60000).toISOString(),question:context.question,description:'A hypothetical scenario.',assumptions:[]};return Response.json(prepared);}
  assert.equal(body.operation,'start');return Response.json({...run('accepted'),attemptId:prepared.attemptId,requestIdentity:await digest('dynamic-request-',{version:1,...context}),assumptionReview:{version:1,policy:'assumption-approval-v1',sourcePlanId:'dynamic-plan-'+'b'.repeat(64),contextKey:prepared.contextKey,reviewedAt:new Date().toISOString(),items:[]}});
 }});
 return {controller,context};
}

test('accepted reviewed runs are saved before subscribers can start passive background refresh',async()=>{
 const browser=storage(),{controller,context}=acceptedController(value=>rememberSummary(browser,value));
 let savedBeforePublish=false;controller.subscribe(()=>{if(controller.getSnapshot().publicRun)savedBeforePublish=readSummaryReferences(browser)[0]?.runId==='run-accepted';});
 try{
  controller.invalidate(context);await controller.start('dynamic');await controller.startReviewed([]);assert.equal(controller.getSnapshot().publicRun?.runId,'run-accepted');assert.equal(savedBeforePublish,true);assert.equal(readSummaryReferences(browser)[0]?.runId,'run-accepted');
  controller.restorePublicHistory([run('selected')]);controller.inspectArchive('run-selected');
  controller.restorePublicHistory([run('newest'),run('next-newest'),run('older'),run('oldest')]);
  assert.deepEqual(controller.getSnapshot().history.map(item=>item.id),['run-accepted','run-selected','run-newest','run-next-newest']);assert.equal(controller.getSnapshot().selectedArchiveId,'run-selected');
 }finally{controller.dispose();}
});

test('rejected browser persistence remains visible while the accepted report stays available',async()=>{
 const {controller,context}=acceptedController(()=>{throw new Error('Quota exceeded');});
 try{controller.invalidate(context);await controller.start('dynamic');await controller.startReviewed([]);assert.equal(controller.getSnapshot().phase,'completed');assert.equal(controller.getSnapshot().publicRun?.runId,'run-accepted');assert.equal(controller.getSnapshot().history[0]?.id,'run-accepted');assert.match(controller.getSnapshot().error??'',/persistence is unavailable/);}finally{controller.dispose();}
});

test('editing after acceptance cannot let a pending mount restore evict the newly accepted report',async()=>{
 const browser=storage(),{controller,context}=acceptedController(value=>rememberSummary(browser,value));
 try{
  controller.invalidate(context);await controller.start('dynamic');await controller.startReviewed([]);
  controller.invalidate({...context,question:'What if the policy changes again?'});assert.equal(controller.getSnapshot().publicRun,null);
  controller.restorePublicHistory([run('old-1'),run('old-2'),run('old-3'),run('old-4')]);
  assert.equal(controller.getSnapshot().history[0]?.id,'run-accepted');assert.equal(controller.getSnapshot().history.length,4);
 }finally{controller.dispose();}
});
