import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuestionSimulation} from '../../question-simulation/client.ts';
import {assumptionContextKey,type AssumptionDecision,type AssumptionReviewDraft} from '../../assumption-review/contract.ts';
import type {HybridExploreOptions} from '../../interventions/explore-contract.ts';

const geometry={version:1 as const,scenarioId:'assumption-controller',features:[]};
const context={question:'What if Singapore introduced a four-day workweek?',geometry,geometryRevision:0};
const decisions:AssumptionDecision[]=[{assumptionId:'pay',decision:'do-not-allow'}];
async function flush(){for(let i=0;i<30;i++)await Promise.resolve();}
async function reviewFor(body:any):Promise<AssumptionReviewDraft>{
 return {version:1,kind:'assumption-review',draftId:'draft-'+body.attemptId,token:'a'.repeat(64),attemptId:body.attemptId,contextKey:await assumptionContextKey(body.request,body.hybrid),expiresAt:new Date(Date.now()+900_000).toISOString(),question:body.request.question,description:'A fictional workweek scenario.',assumptions:[{id:'pay',text:'Monthly pay remains unchanged.'}]};
}
function immediateNetwork(){
 const calls:any[]=[];
 const fetcher:typeof fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));calls.push(body);
  if(body.operation==='prepare')return Response.json(await reviewFor(body));
  if(body.operation==='discard')return Response.json({version:1,kind:'assumption-review-discarded'});
  throw Error('Unexpected execution before explicit approval');
 };
 return {calls,fetcher};
}

test('Explore settles at assumption review without starting a simulation or keeping the request timer',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1_800_000_000_000});
 const net=immediateNetwork(),controller=createQuestionSimulation({execution:'dynamic',publicOnly:true,fetcher:net.fetcher,timeoutMs:1000});
 controller.invalidate(context);await controller.start('dynamic');
 assert.equal(controller.getSnapshot().phase,'reviewing-assumptions');
 assert.equal(controller.getSnapshot().assumptionReview?.question,context.question);
 assert.deepEqual(net.calls.map(c=>c.operation),['prepare']);assert.equal(controller.getSnapshot().publicRun,null);
 t.mock.timers.tick(130_000);await flush();
 assert.equal(controller.getSnapshot().phase,'reviewing-assumptions','human review must outlive the completed request timer');
 assert.deepEqual(net.calls.map(c=>c.operation),['prepare']);controller.dispose();
});

test('every question or geometry change discards review, including question A to B to A',async()=>{
 const net=immediateNetwork(),controller=createQuestionSimulation({execution:'dynamic',publicOnly:true,fetcher:net.fetcher});
 controller.invalidate(context);await controller.start('dynamic');const original=controller.getSnapshot().assumptionReview?.draftId;assert.ok(original);
 controller.invalidate({...context,question:'What if working hours changed?'});await flush();
 assert.equal(controller.getSnapshot().assumptionReview,null);assert.equal(controller.getSnapshot().phase,'idle');
 controller.invalidate(context);await controller.startReviewed(decisions);assert.equal(net.calls.filter(c=>c.operation==='start').length,0);
 assert.equal(controller.getSnapshot().assumptionReview,null);assert.equal(net.calls.filter(c=>c.operation==='discard').length,1);
 await controller.start('dynamic');assert.notEqual(controller.getSnapshot().assumptionReview?.draftId,original);
 controller.invalidate({...context,geometryRevision:1});assert.equal(controller.getSnapshot().assumptionReview,null);controller.dispose();
});

const hybrid:HybridExploreOptions={version:1,policy:'hybrid-citizen-explore-v1',serviceDate:'2026-10-27',anchors:{},selection:{routeId:'route-1',pointIds:['point-1','point-2']},timings:{runSeconds:300,dwellSeconds:30,waitingTimeSeconds:150,transferWalkSeconds:180,geometryConfirmed:true,assumptionsConfirmed:true}};
for(const field of ['anchors','timings','selection','serviceDate'] as const)test(`review decisions are invalidated by changed ${field}`,async()=>{
 const net=immediateNetwork(),controller=createQuestionSimulation({execution:'dynamic',publicOnly:true,fetcher:net.fetcher});
 const input={...context,hybrid};controller.invalidate(input);await controller.start('dynamic');assert.equal(controller.getSnapshot().phase,'reviewing-assumptions');
 const changed=structuredClone(hybrid);if(field==='anchors')changed.anchors={'point-1':'NS4'};if(field==='timings')changed.timings.runSeconds=301;if(field==='selection')changed.selection!.pointIds.reverse();if(field==='serviceDate')changed.serviceDate='2026-10-28';
 controller.invalidate({...input,hybrid:changed});await controller.startReviewed(decisions);assert.equal(controller.getSnapshot().assumptionReview,null);assert.equal(net.calls.filter(c=>c.operation==='start').length,0);controller.dispose();
});

test('a delayed preparation cannot replace a newer question review',async()=>{
 let release!:(response:Response)=>void;let staleBody:any;const calls:any[]=[];
 const fetcher:typeof fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));calls.push(body);
  if(body.operation==='discard')return Response.json({version:1,kind:'assumption-review-discarded'});
  if(body.operation!=='prepare')throw Error('No execution expected');
  if(calls.filter(c=>c.operation==='prepare').length===1){staleBody=body;return new Promise(resolve=>release=resolve);}
  return Response.json(await reviewFor(body));
 };
 const controller=createQuestionSimulation({execution:'dynamic',publicOnly:true,fetcher});controller.invalidate(context);const first=controller.start('dynamic');await flush();assert.ok(staleBody);
 const newer={...context,question:'What if a three-day workweek was introduced?'};controller.invalidate(newer);await controller.start('dynamic');
 release(Response.json(await reviewFor(staleBody)));await first;await flush();
 assert.equal(controller.getSnapshot().phase,'reviewing-assumptions');assert.equal(controller.getSnapshot().assumptionReview?.question,newer.question);assert.equal(controller.getSnapshot().publicRun,null);controller.dispose();
});

for(const action of ['cancel','reviseReview'] as const)test(`${action} clears a pending review and best-effort discards it`,async()=>{
 const net=immediateNetwork(),controller=createQuestionSimulation({execution:'dynamic',publicOnly:true,fetcher:net.fetcher});
 controller.invalidate(context);await controller.start('dynamic');controller[action]();await flush();
 assert.equal(controller.getSnapshot().assumptionReview,null);assert.equal(controller.getSnapshot().phase,action==='cancel'?'cancelled':'idle');assert.equal(net.calls.filter(c=>c.operation==='discard').length,1);
 await controller.startReviewed(decisions);assert.equal(net.calls.filter(c=>c.operation==='start').length,0);controller.dispose();
});

test('duplicate explicit Start actions share one HTTP execution; cancellation stops the pending request',async()=>{
 const calls:any[]=[];let release!:(response:Response)=>void;
 const fetcher:typeof fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));calls.push(body);
  if(body.operation==='prepare')return Response.json(await reviewFor(body));
  if(body.operation==='discard')return Response.json({version:1,kind:'assumption-review-discarded'});
  if(body.operation==='start')return new Promise((resolve,reject)=>{release=resolve;init?.signal?.addEventListener('abort',()=>reject(Error('cancelled fixture')),{once:true});});
  throw Error('Unexpected request');
 };
 const controller=createQuestionSimulation({execution:'dynamic',publicOnly:true,fetcher});controller.invalidate(context);await controller.start('dynamic');
 const reviewed=controller.getSnapshot().assumptionReview!;assert.ok(reviewed);
 const first=controller.startReviewed(decisions),second=controller.startReviewed(decisions);await flush();
 assert.equal(calls.filter(c=>c.operation==='start').length,1);const start=calls.find(c=>c.operation==='start');assert.equal(start.draftId,reviewed.draftId);assert.equal(start.token,reviewed.token);assert.deepEqual(start.decisions,decisions);
 controller.cancel();await Promise.all([first,second]);assert.equal(controller.getSnapshot().phase,'cancelled');assert.equal(controller.getSnapshot().publicRun,null);assert.ok(release);controller.dispose();
});
