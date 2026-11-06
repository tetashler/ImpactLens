import '../../../scripts/testing/offline-network.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {initializeProviderPersonalities} from '../../server/inference/personality.ts';
import {canonical} from '../../experiments/validation.ts';
import {buildPersonalityRequest,validatePersonalityRoster} from '../../citizen-grounding/personality.ts';

test('Claude personality initialization binds the actual request and preserves unknown dollar cost',async t=>{
 const previous=process.env.AI_PROVIDER;process.env.AI_PROVIDER='anthropic';t.after(()=>{if(previous===undefined)delete process.env.AI_PROVIDER;else process.env.AI_PROVIDER=previous;});
 const input={runId:'claude-personality-offline',capableIds:['citizen-1','citizen-2'],backgroundIds:['citizen-3'],seed:'offline-seed'};
 const logical=await buildPersonalityRequest(input);let calls=0,wireDigest='';
 const roster=await initializeProviderPersonalities(input,{key:'offline-claude-key',beforeDispatch:info=>{
  assert.equal(info.url,'https://api.anthropic.com/v1/messages');
  wireDigest=createHash('sha256').update(canonical(info.requestBody)).digest('hex');assert.equal(info.requestBodySha256,wireDigest);
 },fetcher:async(url,init)=>{
  calls++;assert.equal(String(url),'https://api.anthropic.com/v1/messages');assert.equal(new Headers(init?.headers).get('x-api-key'),'offline-claude-key');
  const body=JSON.parse(String(init?.body));assert.equal(createHash('sha256').update(canonical(body)).digest('hex'),wireDigest);assert.equal(body.model,'claude-haiku-5-5');
  return Response.json({id:'msg_personality_fixture',type:'message',role:'assistant',model:'claude-haiku-5-5',stop_reason:'end_turn',usage:{input_tokens:100,output_tokens:200},content:[{type:'text',text:JSON.stringify({profiles:[{slotId:'profile-1',style:'direct',c:1,i:1,d:1,k:1,u:1},{slotId:'profile-2',style:'reflective',c:2,i:2,d:2,k:2,u:2}]})}]});
 }});
 assert.equal(calls,1);assert.equal(roster.generation.requestedModel,'claude-haiku-5-5');assert.equal(roster.generation.servingProvider,'Anthropic');assert.equal(roster.generation.costUsd,null);
 assert.equal(roster.generation.usageBasis,'provider-reported-tokens-cost-unknown');assert.equal(roster.generation.inputDigest,logical.inputDigest);assert.equal(roster.generation.wireRequestDigest,wireDigest);assert.notEqual(wireDigest,logical.inputDigest);
 assert.deepEqual(await validatePersonalityRoster(roster,input.capableIds,input.backgroundIds),roster);
});
