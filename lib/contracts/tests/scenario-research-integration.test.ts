import test from 'node:test';
import assert from 'node:assert/strict';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {handleDynamicRequest} from '../../server/inference/dynamic-service.ts';
import {validateDynamicResponse} from '../../dynamic-scenarios/response.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';

test('a new simulation researches multiple aspects once and freezes the bounded results with its plan', async()=>{
 const fixture=worldFixtures()[0], planningInputs:unknown[]=[];
 const provider=mockDynamicProvider(fixture,(body)=>{if(body.response_format.json_schema.name.startsWith('dynamic_'))planningInputs.push(JSON.parse(body.messages[1].content));});
 let searches=0;
 const request=new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:`research-${crypto.randomUUID()}`,request:fixture.request})});
 const wire=await request.clone().json();
 const response=await handleDynamicRequest(request,{enabled:true,key:'mock-only',groundingKey:'mock-tavily',fetcher:provider.fetcher,groundingFetcher:async(url,init)=>{
  assert.equal(String(url),'https://api.tavily.com/search');
  const body=JSON.parse(String(init?.body));
  assert.equal(body.search_depth,'basic');assert.equal(body.auto_parameters,false);
  searches++;
  return Response.json({results:[1,2].map(i=>({title:`Published context ${searches}-${i}`,url:`https://example.org/research/${searches}/${i}`,content:`Published source excerpt ${searches}-${i} about service arrangements and stakeholder concerns.`,published_date:'2026-10-01'})),usage:{credits:1}});
 }});
 assert.equal(response.status,200);
 const result=await validateDynamicResponse(await response.json(),wire);
 assert.equal(result.kind,'dynamic-execution');if(result.kind!=='dynamic-execution')throw Error('Expected execution');
 assert.ok(searches>1,'Research must go beyond the original single broad search');
 assert.ok(searches<=30);
 assert.equal(result.plan.grounding?.research?.budgetCredits,30);
 assert.equal(result.plan.grounding?.research?.reservedCredits,searches);
 assert.equal(result.plan.grounding?.usage.credits,searches);
 assert.equal(result.plan.grounding?.usage.searches,searches);
 assert.ok(result.plan.grounding!.sources.length>5);
 assert.equal(planningInputs.length,2);
 for(const input of planningInputs as {retrievalCandidates:unknown}[])assert.ok(JSON.stringify(input.retrievalCandidates).includes('Published source excerpt'));
 assert.equal(result.run.events.length,8);
 assert.deepEqual(provider.counts(),{calls:10,plans:2},'Research adds no briefing or research-planning inference calls');
});
