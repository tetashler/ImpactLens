import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchJson} from '../../server/ai/http.ts';
import {AiError} from '../../server/ai/errors.ts';
import {createStructuredTransport,MODEL} from '../../server/inference/deepseek.ts';
import {handleReportSummary} from '../../server/report-summary.ts';
import {handleDetailedReport} from '../../server/report-detailed.ts';
import {handleGraphNodeSummaries} from '../../server/graph-node-summaries.ts';
import {handleDynamicRequest} from '../../server/inference/dynamic-service.ts';
import {validateDynamicResponse,dynamicFailureMessage} from '../../dynamic-scenarios/response.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {handlePublicExplore} from '../../server/society/public-service.ts';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

const endpoint='https://openrouter.ai/api/v1/chat/completions';
const key=()=>`cooldown-http-${crypto.randomUUID()}`;
test('a real upstream 429 retains provider guidance and an immediate retry reaches the provider',async()=>{
 const credential=key(),init={method:'POST',headers:{Authorization:`Bearer ${credential}`},body:'{}'};let calls=0;
 const fetcher:typeof fetch=async()=>{calls++;return calls===1?Response.json({error:{message:'PRIVATE_PROVIDER_SENTINEL'}},{status:429,headers:{'Retry-After':'30'}}):Response.json({ok:true});};
 await assert.rejects(fetchJson(fetcher,endpoint,init),(error:any)=>{
  assert.equal(error.code,'AI_RATE_LIMIT');assert.equal(error.retryAfterSeconds,30);assert.equal(error.requestDispatched,undefined);
  assert.doesNotMatch(error.message,/PRIVATE_PROVIDER_SENTINEL|Bearer|local cooldown/i);return true;
 });
 assert.deepEqual(await fetchJson(fetcher,endpoint,init),{ok:true});
 assert.equal(calls,2,'An immediate explicit retry must reach the provider.');
 assert.deepEqual(await fetchJson(fetcher,endpoint,{...init,headers:{Authorization:`Bearer ${key()}`}}),{ok:true});
});

test('repeated upstream 429 records retain unknown usage without local blocking',async()=>{
 let calls=0;const credential=key(),fetcher:typeof fetch=async()=>{calls++;return Response.json({error:'limited'},{status:429,headers:{'Retry-After':'30'}});};
 const spec={name:'cooldown_test',system:'Offline fixture.',schema:()=>({type:'object'}),encode:()=> '{}',parse:(v:unknown)=>v,outputLimit:100,defaultOutput:100,contentBytes:1000};
 const first=createStructuredTransport({key:credential,fetcher},spec);await assert.rejects(first.generate({}));
 assert.equal(first.records[0].costUsd,null);assert.equal(first.records[0].termination?.httpStatus,429);
 const second=createStructuredTransport({key:credential,fetcher},spec);await assert.rejects(second.generate({}));
 assert.equal(calls,2);assert.equal(second.records[0].errorCode,'AI_RATE_LIMIT');assert.equal(second.records[0].costUsd,null);
 assert.equal(second.records[0].inputTokens,null);assert.equal(second.records[0].outputTokens,null);assert.equal(second.records[0].termination?.httpStatus,429);
});

for(const [kind,handle] of [['summary',handleReportSummary],['detailed',handleDetailedReport],['graph',handleGraphNodeSummaries]] as const)test(`${kind} report returns a safe Retry-After header`,async()=>{
 const service={read:async()=>{throw Error('unused');},generate:async()=>{throw new AiError('AI requests are paused. Retry in 30 seconds.','AI_RATE_LIMIT',429,undefined,30);}};
 const request=new Request('http://localhost'+(kind==='graph'?'/api/knowledge-graph/summaries':'/api/reports/'+kind),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+'a'.repeat(64)},body:JSON.stringify({runId:'run-cooldown',snapshotKey:'b'.repeat(64)})});
 const response=await handle(request,service);assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'30');
 assert.equal((await response.json()).error,'AI_RATE_LIMIT');
});

test('Explore exposes bounded provider retry guidance without weakening failure identity or accounting validation',async()=>{
 const fixture=worldFixtures()[0],attemptId='cooldown-'+crypto.randomUUID(),wire={version:1 as const,attemptId,request:fixture.request};let calls=0;
 const response=await handleDynamicRequest(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(wire)}),{enabled:true,key:key(),groundingKey:'',fetcher:async()=>{calls++;return Response.json({error:'PRIVATE_SENTINEL'},{status:429,headers:{'Retry-After':'25'}});}});
 assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'25');const body=await response.json();
 assert.equal(body.error.retryAfterSeconds,25);assert.equal(calls,1);assert.doesNotMatch(JSON.stringify(body),/PRIVATE_SENTINEL/);
 await validateDynamicResponse(body,wire);
 assert.match(dynamicFailureMessage(body),/25 seconds/);
 for(const value of [-1,0,86401,NaN,'25']){const malformed=structuredClone(body);malformed.error.retryAfterSeconds=value;await assert.rejects(validateDynamicResponse(malformed,wire));}
 assert.equal(body.planning.records[0].requestedModel,MODEL);
});

test('the legacy internal Explore adapter preserves provider retry headers when forwarding a failed planning response',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'public-provider-cooldown-')),fixture=worldFixtures()[0];let calls=0;
 const response=await handlePublicExplore(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:'cooldown-'+crypto.randomUUID(),request:fixture.request})}),
  {enabled:true,key:key(),groundingKey:'',fetcher:async()=>{calls++;return Response.json({error:'limited'},{status:429,headers:{'Retry-After':'17'}});}},
  {storeDirectory:join(directory,'accepted'),directory:join(directory,'sessions'),swarm:false});
 assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'17');assert.equal(calls,1);
});
