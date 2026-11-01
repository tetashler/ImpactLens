/** Synthetic safety fixture, not a reconstruction of the unretained live provider JSON. */
import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {handlePublicExplore} from '../../server/society/public-service.ts';
import {baselineFixture} from '../../../prototype/mrt/tests/scenario-fixtures.ts';
import type {NetworkCatalog} from '../../map-contract.ts';

test('a valid model clarification stops a confirmed plotted Explore without downstream calls or duplicate dispatch',async()=>{
 const base=baselineFixture(),catalog:NetworkCatalog={serviceDate:'2026-10-27',quarantinedTrips:0,stations:[...base.stations.values()].map(({id,name,lat,lon,lines})=>({id,name,lat,lon,lines})),lines:[{id:'NS',name:'Synthetic NS',color:'#f00'},{id:'BP',name:'Synthetic BP',color:'#00f'}],connections:[{from:'NS4',to:'X',line:'NS'},{from:'NS4',to:'Y',line:'BP'}]};
 const start=catalog.stations.find(s=>s.id==='NS4')!,end=catalog.stations.find(s=>s.id==='X')!,positions=[{lat:start.lat,lon:start.lon},{lat:(start.lat+end.lat)/2,lon:(start.lon+end.lon)/2},{lat:end.lat,lon:end.lon}];
 const ids=['start','middle','end'],wire={version:2,attemptId:'synthetic-clarification-'+crypto.randomUUID(),request:{version:1,question:'How might my hypothetical cross-town MRT connection affect these plotted areas?',geometryRevision:9,geometry:{version:1,scenarioId:'synthetic-clarification',features:[{kind:'line',id:'route',label:'Synthetic route',coordinates:positions,provenance:'user-drawn'},...positions.map((coordinate,i)=>({kind:'point',id:ids[i],label:ids[i],coordinate,role:'station',provenance:'user-drawn'}))]}},hybrid:{version:1,policy:'hybrid-citizen-explore-v1',serviceDate:catalog.serviceDate,anchors:{start:'NS4',end:'X'},selection:{routeId:'route',pointIds:ids},timings:{runSeconds:180,dwellSeconds:30,waitingTimeSeconds:150,transferWalkSeconds:180,geometryConfirmed:true,assumptionsConfirmed:true}}};
 const directory=mkdtempSync(join(tmpdir(),'hybrid-clarification-safety-')),stages:string[]=[];let searches=0,impacts=0;
 const fetcher:typeof fetch=async(url,init)=>{
  assert.equal(String(url),'https://openrouter.ai/api/v1/chat/completions');const body=JSON.parse(String(init?.body));stages.push(body.response_format.json_schema.name);assert.equal(stages.length,1);assert.equal(stages[0],'hybrid_intervention_intent_v1');
  const context=JSON.parse(body.messages[1].content);assert.equal(context.question,wire.request.question);assert.deepEqual(context.attachments[0].orderedPointIds,ids);assert.deepEqual(context.explicitAnchors,wire.hybrid.anchors);
  const value={version:context.version,bindingKey:context.bindingKey,type:'clarify',routeId:null,stationPointIds:[],sitePointIds:[],clarification:'Synthetic fixture: clarification requested.'};
  return Response.json({id:'synthetic-clarification-result',model:body.model,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200,cost:0.0001,completion_tokens_details:{reasoning_tokens:0}}});
 };
 const dynamic={enabled:true,key:'offline-only',fetcher,groundingKey:'offline-only',groundingFetcher:async()=>{searches++;throw Error('Unexpected retrieval');}};
 const social={enabled:true,key:'offline-only',fetcher,directory:join(directory,'sessions'),storeDirectory:join(directory,'accepted'),admission:{maxCalls:350},hybrid:{key:'offline-only',catalog:()=>catalog,impact:async()=>{impacts++;throw Error('Unexpected impact');}}};
 const request=()=>new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(wire)});
 const reply=await handlePublicExplore(request(),dynamic,social),review=await reply.json();
 assert.equal(reply.status,200);assert.equal(review.kind,'hybrid-map-review');assert.equal(review.interventionType,'clarify');assert.equal(review.analysisMode,'clarification');assert.equal(review.message,'Synthetic fixture: clarification requested.');
 assert.equal(searches,0);assert.equal(impacts,0);assert.deepEqual(stages,['hybrid_intervention_intent_v1']);assert.ok(!review.society&&!review.grounding&&!review.session);
 assert.equal(readdirSync(social.storeDirectory).filter(name=>name.endsWith('.json')).length,0,'No accepted society archive may be manufactured from clarification');
 const duplicate=await handlePublicExplore(request(),dynamic,social);assert.equal(duplicate.status,409);assert.equal((await duplicate.json()).code,'DUPLICATE_ATTEMPT');assert.equal(stages.length,1);assert.equal(searches,0);assert.equal(impacts,0);
});
