import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuestionSimulation} from '../../question-simulation/client.ts';
import {worldFixtures as dynamicFixtures} from '../../world-graph/fixtures.ts';
import {handleDynamicRequest} from '../../server/inference/dynamic-service.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';
import {startQuestionWork} from '../../dynamic-scenarios/client.ts';
test('question-first dynamic flow accepts a previously unsupported question without preset or form dependencies',async()=>{
 const f=dynamicFixtures()[0],m=mockDynamicProvider(f),fetcher:typeof fetch=async(url,init)=>{assert.equal(String(url),'/api/scenario-simulate');return handleDynamicRequest(new Request('http://localhost'+url,init),{enabled:true,groundingKey:'',key:'mock',fetcher:m.fetcher});};
 const c=createQuestionSimulation({execution:'dynamic',fetcher});c.invalidate({question:f.request.question,geometry:f.request.geometry,geometryRevision:f.request.geometryRevision});await c.start();const s=c.getSnapshot();assert.equal(s.phase,'completed');assert.equal(s.run?.events.length,8);assert.equal(s.dynamic?.kind,'dynamic-execution');assert.equal(s.plan,null);assert.equal(s.scope,null);c.dispose();
});
test('dynamic cancellation and A-B-A never resurrect a delayed planning/run result',async()=>{
 const f=dynamicFixtures()[0],m=mockDynamicProvider(f);let release!:(r:Response)=>void;const held=new Promise<Response>(r=>release=r);let wire:any;
 const c=createQuestionSimulation({execution:'dynamic',fetcher:async(_u,init)=>{wire=JSON.parse(String(init?.body));return held;}});const input={question:f.request.question,geometry:f.request.geometry,geometryRevision:0};c.invalidate(input);const p=c.start();await new Promise(r=>setTimeout(r,10));c.invalidate({...input,question:'Different hypothetical question'});c.invalidate(input);
 const response=await handleDynamicRequest(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(wire)}),{enabled:true,groundingKey:'',key:'mock',fetcher:m.fetcher});release(response);await p;await new Promise(r=>setTimeout(r,30));assert.equal(c.getSnapshot().run,null);assert.equal(c.getSnapshot().phase,'idle');c.dispose();
});
test('timeout and geometry revision edits settle without stale dynamic runs',async()=>{
 const f=dynamicFixtures()[0],input={question:f.request.question,geometry:f.request.geometry,geometryRevision:0};
 const timed=createQuestionSimulation({execution:'dynamic',timeoutMs:5,fetcher:async()=>new Promise(()=>{})});timed.invalidate(input);await timed.start();assert.equal(timed.getSnapshot().phase,'error');assert.equal(timed.getSnapshot().run,null);timed.dispose();
 let release!:(r:Response)=>void;const held=new Promise<Response>(r=>release=r);const c=createQuestionSimulation({execution:'dynamic',fetcher:async()=>held});c.invalidate(input);const running=c.start();await new Promise(r=>setTimeout(r,5));c.invalidate({...input,geometryRevision:1});release(Response.json({invalid:'late response'}));await running;await new Promise(r=>setTimeout(r,5));assert.equal(c.getSnapshot().phase,'idle');assert.equal(c.getSnapshot().dynamic,null);c.dispose();
});
test('confirmed native models start before pending exploration and never launch after cancellation',async()=>{
 let release!:()=>void;const pending=new Promise<void>(r=>release=r),events:string[]=[];const joined=startQuestionWork(()=>{events.push('exploration');return pending;},async()=>{events.push('mrt');},()=>{events.push('aac');});
 assert.deepEqual(events,['exploration','mrt','aac']);events.push('cancel');release();await joined;assert.deepEqual(events,['exploration','mrt','aac','cancel']);
});
