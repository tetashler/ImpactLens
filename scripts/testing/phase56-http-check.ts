/** Run only against a local server started with phase56-provider-preload.mjs. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { illustrativeLine } from '../../prototype/mrt/examples/illustrative-line.ts';
import { createDefaultEldercareRequest, parseFacilitiesResponse, parseEldercareApiResponse } from '../../lib/eldercare/api-contract.ts';
import { parseImpactRequest, parseImpactResponse, parseImpactProfileResponse } from '../../lib/impact/api-contract.ts';
import { parseAiResponse } from '../../lib/ai/contracts.ts';
import { evidenceGroupIds } from '../../lib/ai/grounding.ts';

const base=new URL(process.argv[2]??'http://127.0.0.1:3108');
assert.ok(['localhost','127.0.0.1','[::1]'].includes(base.hostname),'Local test server required');
const post=(path:string,body:unknown)=>fetch(new URL(path,base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
async function success(response:Response){assert.equal(response.status,200);return response.json();}
const availability=await success(await fetch(new URL('/api/ai/status',base)));
// Prevent accidental use against normal private provider configuration.
assert.ok(availability.available===false||['integration-gemini','integration/mock-model'].includes(availability.model),'Opt-in mock server required');
const catalogue=parseFacilitiesResponse(await success(await fetch(new URL('/api/eldercare/facilities',base))));
assert.equal(catalogue.summary.corroboratedAac,4);assert.equal(catalogue.summary.unknownServicePoints,129);
assert.ok(catalogue.facilities.every(f=>f.serviceType==='aac'&&f.capacity===null&&f.openedOn===null));
const request=createDefaultEldercareRequest('integration-default');
const eldercare=await parseEldercareApiResponse(await success(await post('/api/eldercare/simulate',request)),request);
const cli=JSON.parse(execFileSync(process.execPath,['prototype/eldercare/cli.ts','--json'],{encoding:'utf8',maxBuffer:8*1024*1024}));
assert.deepEqual(eldercare.result,cli,'HTTP and CLI calculations must be identical');
const overall=eldercare.result.metrics[0];
const near=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-6);
near(overall.population,44520);near(overall.locatedPopulation,6230);near(overall.unlocatedPopulation,38290);
assert.equal(eldercare.result.capacity.existingTotal,null);assert.equal(eldercare.result.capacity.serviceAllocation,'not-modelled');
for(const edit of ['position','threshold'] as const){
  const changed=structuredClone(request);changed.clientRequestId=`integration-${edit}`;
  if(edit==='position')changed.intervention.position.lon+=.001;else changed.options.thresholdsMetres=[250,500];
  const response=await parseEldercareApiResponse(await success(await post('/api/eldercare/simulate',changed)),changed);
  assert.notEqual(response.identity.scenarioId,eldercare.identity.scenarioId);
  assert.notEqual(response.identity.requestFingerprint,eldercare.identity.requestFingerprint);
}
const failures:[string,string,string,number][]=[
  ['invalid-type','application/json',JSON.stringify({...request,intervention:{...request.intervention,serviceType:'nursing-home'}}),400],
  ['malformed-json','application/json','{',400],
  ['oversized','application/json',' '.repeat(16400),413],
  ['unsupported-media','text/plain',JSON.stringify(request),415],
  ['jsonp','application/jsonp',JSON.stringify(request),415],
  ['source-id-collision','application/json',JSON.stringify({...request,intervention:{...request.intervention,id:catalogue.facilities[0].id}}),400],
];
for(const [name,type,body,status] of failures){
  const r=await fetch(new URL('/api/eldercare/simulate',base),{method:'POST',headers:{'Content-Type':type},body});
  assert.equal(r.status,status,name);const error=await r.json();assert.equal(error.version,1);assert.equal(typeof error.error.message,'string');assert.equal(typeof error.error.code,'string');
}
const impactRequest=parseImpactRequest({serviceDate:'2026-10-27',intervention:illustrativeLine,assumptionSetId:'illustrative-cck-demand',participationRate:.8,population:{size:500,seed:'integration-http'},thresholdMinutes:30,renderLimit:3});
const impact=await parseImpactResponse(await success(await post('/api/impact',impactRequest)),impactRequest);
assert.equal(impact.payload.animations.length,0);
const identity={runId:impact.identity.runId,requestId:impact.identity.requestId};
const agentId=impact.payload.citizens[0].agentId;
const profile=parseImpactProfileResponse(await success(await fetch(new URL(`/api/impact/profile?${new URLSearchParams({...identity,agentId})}`,base))),impact);
assert.equal(profile.profile.animation,null);
for(const kind of ['dashboard','explain','citizen-chat'] as const){
  const body=kind==='citizen-chat'?{...identity,agentId,messages:[{role:'user',content:'What is my modelled journey?'}]}:identity;
  const response=await post(`/api/ai/${kind}`,body);
  if(!availability.available){assert.equal(response.status,503);continue;}
  const value=parseAiResponse(await success(response),kind,identity,evidenceGroupIds(impact),kind==='citizen-chat'?agentId:undefined);
  assert.equal(value.provider,availability.provider);
}
if(availability.available){
  const unsupported=await success(await post('/api/ai/citizen-chat',{...identity,agentId,messages:[{role:'user',content:'What is my salary and employer?'}]}));
  assert.deepEqual(unsupported.output.topics,['unsupported']);
  assert.equal((await post('/api/ai/explain',{...identity,requestId:'0'.repeat(64)})).status,409);
  assert.equal((await post('/api/ai/explain',{...identity,metrics:{benefit:999}})).status,400);
  assert.equal((await post('/api/ai/citizen-chat',{...identity,agentId:'syn-0000000000000000-1',messages:[{role:'user',content:'Journey?'}]})).status,404);
}
console.log(JSON.stringify({provider:availability.available?availability.provider:'none',eldercareCliParity:true,eldercarePopulation:overall.population,located:overall.locatedPopulation,unlocated:overall.unlocatedPopulation,controlledEldercareFailures:failures.length,impactProfile:true,aiRoutes:3,status:'passed'}));
