import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {socialOperation,readSocialSession,type SocialDependencies} from '../../server/society/service.ts';
import {multiDaySwarmPolicy,deepSwarmPolicy} from '../../society/swarm.ts';
import {hybridBudget} from '../../society/hybrid.ts';
import {phase4eSource,phase4eCommunication,phase4eFetcher,evictFixtureSession} from '../../../scripts/testing/phase4e-fixture.ts';

for(const knownSide of ['prompt_tokens','completion_tokens'] as const)test(`new-policy ${knownSide} partial usage above its reservation stops both token budgets and future dispatch`,async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-partial-tokens-'));try{
  const source=await phase4eSource('pt-'+knownSide.slice(0,3)+'-'+crypto.randomUUID()),mock=phase4eFetcher(),knownTokens=16_000_001;
  const fetcher:typeof fetch=async(u,i)=>{const body=await(await mock.fetcher(u,i)).json();body.usage={...body.usage,prompt_tokens:null,completion_tokens:null,total_tokens:null,[knownSide]:knownTokens};return Response.json(body);};
  const d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),swarm:multiDaySwarmPolicy(50,70,160),fetcher,admission:{maxCalls:70,reservedTokens:16_000_000,costUsd:1}};
  let state=await socialOperation({operation:'start',run:source},d);for(let i=0;i<100&&!state.world.hybrid!.records.length;i++)state=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},d);
  const record=state.world.hybrid!.records[0];assert.equal(record.status,'accepted');assert.ok(record.reservedTokens<knownTokens);assert.equal(mock.calls.length,1);
  assert.equal(hybridBudget(state.world).tokens,knownTokens);assert.equal(hybridBudget(state.world).exhausted,true);assert.equal(state.admission.tokens,knownTokens);assert.equal(state.admission.status,'budget-limited');assert.equal(state.admission.reason,'token-limit');
  const frozen=state.world,next=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},d);assert.deepEqual(next.world,frozen);assert.equal(next.revision,state.revision);assert.equal(mock.calls.length,1);
  evictFixtureSession(directory,state.sessionId);state=await readSocialSession(state.sessionId,d);assert.deepEqual(state.world,frozen);assert.equal(state.admission.tokens,knownTokens);await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},d);assert.equal(mock.calls.length,1);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('legacy deep partial usage retains its recorded reservation accounting and replay semantics',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'legacy-partial-tokens-'));try{
  const source=await phase4eSource('legacy-partial-token-'+crypto.randomUUID()),mock=phase4eFetcher();
  const fetcher:typeof fetch=async(u,i)=>{const body=await(await mock.fetcher(u,i)).json();body.usage={...body.usage,prompt_tokens:16_000_001,completion_tokens:null,total_tokens:null};return Response.json(body);};
  const d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),swarm:deepSwarmPolicy(50),fetcher,admission:{maxCalls:70,reservedTokens:16_000_000,costUsd:1}};
  let state=await socialOperation({operation:'start',run:source},d);for(let i=0;i<100&&!state.world.hybrid!.records.length;i++)state=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},d);
  const reservation=state.world.hybrid!.records[0].reservedTokens;assert.equal(hybridBudget(state.world).tokens,reservation);assert.equal(hybridBudget(state.world).exhausted,false);assert.equal(state.admission.tokens,reservation);assert.equal(state.admission.status,'available');
  const original=state.world;evictFixtureSession(directory,state.sessionId);state=await readSocialSession(state.sessionId,d);assert.deepEqual(state.world,original);assert.equal(state.admission.tokens,reservation);assert.equal(mock.calls.length,1);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
