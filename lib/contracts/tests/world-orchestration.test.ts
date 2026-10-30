import test from 'node:test';
import assert from 'node:assert/strict';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {parseGeneratedDraft} from '../../server/inference/planner.ts';
import {handleDynamicRequest} from '../../server/inference/dynamic-service.ts';
import {parseDynamicDraft} from '../../dynamic-scenarios/plan.ts';
test('new generation enforces identity slots without changing archived plan parsing',()=>{
 const f=worldFixtures()[0],d=structuredClone(f.draft);const old=d.agents[0].id;d.agents[0].id='outside-slot';
 for(const r of d.relationships){if(r.sourceAgentId===old)r.sourceAgentId='outside-slot';if(r.targetAgentId===old)r.targetAgentId='outside-slot';}
 for(const r of d.ontology.relationships){if(r.source===old)r.source='outside-slot';if(r.target===old)r.target='outside-slot';}
 assert.throws(()=>parseGeneratedDraft(d,f.request),(e:any)=>e.diagnostic?.rule==='agent.role_slot_invalid');
 assert.doesNotThrow(()=>parseDynamicDraft(d,f.request));
});
test('cancelling optional research returns cancellation before any planner/action calls',async()=>{
 const f=worldFixtures()[0],abort=new AbortController();let inferenceCalls=0;
 const request=new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.signal,body:JSON.stringify({version:1,attemptId:`cancel-${crypto.randomUUID()}`,request:f.request})});
 const response=await handleDynamicRequest(request,{enabled:true,key:'mock',groundingKey:'mock',fetcher:async()=>{inferenceCalls++;throw Error('Must not infer');},groundingFetcher:async(_u,i)=>{abort.abort();throw i?.signal?.reason;}});
 assert.equal(response.status,499);assert.equal((await response.json()).error.code,'AI_CANCELLED');assert.equal(inferenceCalls,0);
});
