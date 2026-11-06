import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {socialOperation,readSocialSession,type SocialDependencies} from '../../server/society/service.ts';
import {multiDaySwarmPolicy} from '../../society/swarm.ts';
import {AiError} from '../../server/ai/errors.ts';
import {phase4eSource,phase4eCommunication,phase4eFetcher,evictFixtureSession} from '../../../scripts/testing/phase4e-fixture.ts';

for(const code of ['AI_UPSTREAM','AI_TIMEOUT','AI_CREDITS','AI_CANCELLED','AI_RATE_LIMIT'] as const)test(`a persisted new-policy ${code} stops later dispatch while preserving its accepted prefix`,async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-fatal-'));try{
  const source=await phase4eSource('fatal-'+code+'-'+crypto.randomUUID()),mock=phase4eFetcher();let calls=0;
  const fetcher:typeof fetch=async(u,i)=>{if(++calls===1)return mock.fetcher(u,i);if(code==='AI_UPSTREAM')throw TypeError('RAW_NETWORK_PRIVATE');throw new AiError('RAW_TRANSPORT_PRIVATE',code,502);};
  const d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),swarm:multiDaySwarmPolicy(50,70,160),fetcher,admission:{maxCalls:70}};
  let state=await socialOperation({operation:'start',run:source},d),caught=false;
  for(let i=0;i<100&&state.world.hybrid!.records.length<2;i++)try{state=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},d);}catch(error){assert.match(String(error),/SOCIAL_FATAL/);assert.equal((error as {code?:string}).code,code);caught=true;break;}
  assert.equal(caught,true);state=await readSocialSession(state.sessionId,d);assert.equal(state.world.hybrid!.records.length,2);assert.equal(state.world.hybrid!.records[0].status,'accepted');assert.equal(state.world.hybrid!.records[1].error,code);assert.equal(calls,2);
  await assert.rejects(()=>socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},d),/SOCIAL_FATAL/);evictFixtureSession(directory,state.sessionId);state=await readSocialSession(state.sessionId,d);
  await assert.rejects(()=>socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},d),/SOCIAL_FATAL/);assert.equal(calls,2);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('new-policy menu rejection consumes one opportunity and a later valid response remains possible',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'multiday-recoverable-'));try{
  const source=await phase4eSource('recoverable-'+crypto.randomUUID()),mock=phase4eFetcher();let calls=0;
  const fetcher:typeof fetch=async(u,i)=>{const r=await mock.fetcher(u,i);if(++calls!==2)return r;const body=await r.json(),value=JSON.parse(body.choices[0].message.content);value.choiceId='invalid-choice';body.choices[0].message.content=JSON.stringify(value);return Response.json(body);};
  const d:SocialDependencies={directory,enabled:true,key:'offline',communication:phase4eCommunication(),swarm:multiDaySwarmPolicy(50,70,160),fetcher,admission:{maxCalls:70}};
  let state=await socialOperation({operation:'start',run:source},d);for(let i=0;i<100&&state.world.hybrid!.records.length<3;i++)state=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},d);
  assert.deepEqual(state.world.hybrid!.records.map(r=>r.status),['accepted','failed','accepted']);assert.equal(calls,3);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
