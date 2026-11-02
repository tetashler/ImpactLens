import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {handlePublicExplore,handlePublicSocial} from '../../server/society/public-service.ts';
import {stopCoordinators} from '../../server/society/coordinator.ts';
import {multiDaySwarmPolicy} from '../../society/swarm.ts';
import {parsePublicExplore} from '../../question-simulation/public-session.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';
import {phase4eFetcher} from '../../../scripts/testing/phase4e-fixture.ts';
import {renderableCommunicationReport} from './helpers/report-ssr.ts';

const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

test('a real HTTP 429 fails the managed public job, preserves accepted work and renders a safe explanation without retry',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'impactlens-public-rate-limit-')),fixture=worldFixtures()[0];
 fixture.draft.ontology.entityTypes.push({id:'comms',name:'Communication platform',description:'Fictional discussion coordination.'});
 fixture.draft.ontology.entities.push({id:'reddit',name:'Reddit',typeId:'comms',jurisdictionId:null,support:null,communication:{version:1,style:'public-discussion'}});
 const planner=mockDynamicProvider(fixture),social=phase4eFetcher();
 let socialCalls=0;
 const fetcher:typeof fetch=async(url,init)=>{
  if(JSON.parse(String(init?.body)).response_format.json_schema.name!=='social_decision_v1')return planner.fetcher(url,init);
  socialCalls++;
  if(socialCalls===1)return social.fetcher(url,init);
  assert.equal(socialCalls,2,'A failed provider request must never be retried automatically.');
  return Response.json({error:{code:429,message:'RAW_PROVIDER_RATE_LIMIT_SENTINEL private upstream diagnostic'}},{status:429,headers:{'Retry-After':'0'}});
 };
 const deps={storeDirectory:join(directory,'accepted'),directory:join(directory,'sessions'),swarm:multiDaySwarmPolicy(50,30,160),admission:{maxCalls:30,reservedTokens:200_000,costUsd:0.2,deadlineMs:Date.now()+60_000},enabled:true,key:'offline-only',fetcher};
 try{
  const response=await handlePublicExplore(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:'public-rate-limit-'+crypto.randomUUID(),request:fixture.request})}),{enabled:true,key:'offline-only',groundingKey:'',fetcher},deps);
  assert.equal(response.status,200);
  const initial=parsePublicExplore(await response.json());
  assert.equal(initial.job?.status,'running');
  const query='runId='+encodeURIComponent(initial.runId)+'&token='+initial.session!.token;
  const read=async()=>{const r=await handlePublicSocial(new Request('http://localhost/api/social-simulate?'+query),deps);assert.equal(r.status,200);return parsePublicExplore(await r.json());};
  let status;
  for(let i=0;i<300;i++){
   const r=await handlePublicSocial(new Request('http://localhost/api/social-simulate?operation=status&'+query),deps);
   assert.equal(r.status,200);status=await r.json();
   assert.doesNotMatch(JSON.stringify(status),/RAW_|private upstream|stack|SOCIAL_FATAL|AI_RATE_LIMIT/);
   if(status.job.status!=='running')break;
   await wait(10);
  }
  assert.equal(status?.job.status,'failed');
  assert.equal(status?.job.reason,'PROVIDER_RATE_LIMIT');
  const final=await read();
  assert.equal(final.job?.status,'failed');
  assert.equal(final.job?.reason,'PROVIDER_RATE_LIMIT');
  assert.equal(final.job?.acceptedDecisions,1);
  assert.equal(final.job?.remainingCalls,28);
  assert.equal(final.society?.phase,'partial');
  assert.equal(final.society?.usage.calls,2);
  assert.equal(final.society?.usage.accepted,1);
  assert.equal(final.society?.usage.failed,1);
  assert.deepEqual(final.initialActions,initial.initialActions);
  assert.equal(final.society?.agents.find(a=>a.id===social.calls[0]?.actorId)?.modelDecisions,1);
  assert.equal(final.society?.agents.reduce((n,a)=>n+a.modelDecisions,0),1);
  assert.equal(social.calls.length,1,'The first provider response was accepted through the real decoder.');
  assert.doesNotMatch(JSON.stringify(final),/RAW_|private upstream|stack|SOCIAL_FATAL|AI_RATE_LIMIT/);
  const malformed=structuredClone(final);
  assert.ok(malformed.society!.links.length,'The real public DTO must exercise the nested relationship boundary.');
  Object.assign(malformed.society!.links[0],{detail:{mix:{reply:1,message:'PRIVATE_NESTED_SENTINEL'}}});
  assert.throws(()=>parsePublicExplore(malformed),'The browser parser must reject private nested relationship fields.');
  const legacy=structuredClone(final);for(const link of legacy.society!.links)delete link.detail;
  assert.doesNotThrow(()=>parsePublicExplore(legacy),'Saved links without metadata remain readable.');
  const {CommunicationStatus}=await renderableCommunicationReport();
  const html=renderToStaticMarkup(createElement(CommunicationStatus,{result:final}));
  assert.match(html,/Background communication: failed/);
  assert.match(html,/AI service rate-limited a request/);
  assert.match(html,/Accepted activity is retained; no automatic retry was made/);
  assert.match(html,/1 accepted model decisions/);
  assert.doesNotMatch(html,/RAW_|private upstream|stack|SOCIAL_FATAL|AI_RATE_LIMIT/);
  for(let i=0;i<3;i++)await read();
  await wait(30);
  assert.equal(socialCalls,2,'Passive public reads and elapsed time cannot restart failed work.');
 }finally{
  await stopCoordinators(join(deps.storeDirectory,'jobs'));
 }
});
