import '../../../scripts/testing/offline-network.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createQuestionSimulation} from '../../question-simulation/client.ts';
import {PublicScenarioSession} from '../../question-simulation/public-session.ts';
import type {HybridExploreOptions} from '../../interventions/explore-contract.ts';
const geometry={version:1 as const,scenarioId:'drawn-map',features:[]};
const hybrid:HybridExploreOptions={version:1,policy:'hybrid-citizen-explore-v1',serviceDate:'2026-10-27',anchors:{},selection:{routeId:'line-1',pointIds:['point-1','point-2']},timings:{runSeconds:300.5,dwellSeconds:30,waitingTimeSeconds:150,transferWalkSeconds:180,geometryConfirmed:true,assumptionsConfirmed:true}};
for(const field of ['anchors','timings','selection','serviceDate'] as const)test('changing '+field+' cancels an in-flight hybrid Explore',async()=>{
 let dispatched=0,aborted=0;
 const fetcher:typeof fetch=async(_url,init)=>{dispatched++;return new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>{aborted++;reject(Error('cancelled fixture'));},{once:true}));};
 const controller=createQuestionSimulation({publicOnly:true,execution:'dynamic',fetcher});
 const input={question:'What if this hypothetical MRT line is added?',geometry,geometryRevision:1,hybrid};controller.invalidate(input);const work=controller.start('dynamic');
 await new Promise(r=>setTimeout(r,1));assert.equal(dispatched,1);
 const changed=structuredClone(hybrid);if(field==='anchors')changed.anchors={'point-1':'NS2'};if(field==='timings')changed.timings.runSeconds=301.5;if(field==='selection')changed.selection!.pointIds.reverse();if(field==='serviceDate')changed.serviceDate='2026-10-28';
 controller.invalidate({...input,hybrid:changed});await work;assert.equal(aborted,1);assert.equal(controller.getSnapshot().phase,'idle');assert.equal(controller.getSnapshot().publicRun,null);controller.dispose();
});
test('ordinary public client transmits only versioned plotting options and retains review',async()=>{
 const question='What if a polyclinic is added here?',review={version:1,kind:'hybrid-map-review',bindingKey:'a'.repeat(64),question,geometryRevision:1,interventionType:'new_polyclinic',analysisMode:'location-context',message:'Location context only.',limitations:['No healthcare outcome model is supplied.']};let sent:any;
 const session=new PublicScenarioSession();const result=await session.execute({version:1,question,geometry,geometryRevision:1},'fixture-review',async(_url,init)=>{sent=JSON.parse(String(init?.body));return Response.json(review);},1000,hybrid);
 assert.equal(sent.version,2);assert.deepEqual(sent.hybrid,hybrid);assert.equal(result?.kind,'hybrid-map-review');assert.equal(sent.request.question,question);assert.deepEqual(Object.keys(sent).sort(),['attemptId','hybrid','request','version']);
});
