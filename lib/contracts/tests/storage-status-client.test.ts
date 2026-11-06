import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {createQuestionSimulation} from '../../question-simulation/client.ts';
import {assumptionContextKey} from '../../assumption-review/contract.ts';

const context={question:'What if Singapore introduced a four-day workweek?',geometry:{version:1 as const,scenarioId:'storage-errors',features:[]},geometryRevision:0};
const decisions=[{assumptionId:'pay',decision:'allow' as const}];
async function draft(body:any){return {version:1,kind:'assumption-review',draftId:'draft-'+body.attemptId,token:'a'.repeat(64),attemptId:body.attemptId,contextKey:await assumptionContextKey(body.request),expiresAt:new Date(Date.now()+900000).toISOString(),question:body.request.question,description:'A fictional workweek scenario.',assumptions:[{id:'pay',text:'Monthly pay remains unchanged.'}]};}

for(const stage of ['prepare','start'])for(const code of ['PRIVATE_STORAGE_CAPACITY','PRIVATE_STORAGE_UNAVAILABLE','PRIVATE_STORAGE_DUPLICATE'])test(`${stage} displays trusted ${code} guidance without private response prose or retry`,async()=>{
 let requests=0;const controller=createQuestionSimulation({execution:'dynamic',publicOnly:true,fetcher:async(_url,init)=>{const body=JSON.parse(String(init?.body));requests++;if(body.operation===stage)return Response.json({error:code,message:'PRIVATE_PATH SECRET_TOKEN'},{status:code.endsWith('DUPLICATE')?409:503});if(body.operation==='prepare')return Response.json(await draft(body));throw Error('Unexpected automatic retry');}});
 controller.invalidate(context);await controller.start();if(stage==='start')await controller.startReviewed(decisions);
 const state=controller.getSnapshot();assert.equal(state.phase,'error');assert.match(state.error??'',code.endsWith('CAPACITY')?/storage is full/i:code.endsWith('DUPLICATE')?/already used/i:/storage is unavailable/i);assert.doesNotMatch(state.error??'',/PRIVATE_PATH|SECRET_TOKEN/);assert.equal(requests,stage==='prepare'?1:2);controller.dispose();
});

test('unknown storage error code cannot turn server prose into a displayed error',async()=>{
 const controller=createQuestionSimulation({execution:'dynamic',publicOnly:true,fetcher:async()=>Response.json({error:'PRIVATE_STORAGE_PATH_SECRET',message:'PRIVATE_PATH SECRET_TOKEN'},{status:503})});controller.invalidate(context);await controller.start();assert.doesNotMatch(controller.getSnapshot().error??'',/PRIVATE_PATH|SECRET_TOKEN|PRIVATE_STORAGE_PATH_SECRET/);controller.dispose();
});
