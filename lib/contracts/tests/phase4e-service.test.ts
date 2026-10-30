import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {runPhase4eServiceFixture,chainSelector,phase4eProviderFixture,phase4eSource,phase4eFetcher,phase4eCommunication,socialRequest,evictFixtureSession,FIXTURE_USAGE} from '../../../scripts/testing/phase4e-fixture.ts';
import {handleSocialRequest} from '../../server/society/service.ts';
import {publicSociety,summaryGraph} from '../../server/society/summary.ts';
import {aggregateFacts} from '../../server/society/facts.ts';
import {saveSociety,restoreSociety} from '../../society/engine.ts';
import {swarmPolicy} from '../../society/swarm.ts';
import type {SocietyWorld} from '../../society/contract.ts';

const directory=()=>{const root=resolve('tmp/phase4e/private-tests');mkdirSync(root,{recursive:true,mode:0o700});return mkdtempSync(join(root,'service-'));};
const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const baseGraph=(w:SocietyWorld)=>({version:1 as const,scenarioIdentity:'phase4e-fixture',executionIdentity:w.genesis.input.runId,nodes:[],edges:[],limitations:[]});
function assertPermissions(w:SocietyWorld){
 for(const r of w.hybrid!.records){
  const c=r.context,d=r.decision;
  for(const item of c.items)if(item.groupId)assert.ok(c.communication?.groups.some(g=>g.id===item.groupId&&g.member),'Private context requires actual membership');
  if(!d?.targetId||!['comment','reply','group-reply','read','like','upvote','downvote','share'].includes(d.action))continue;
  assert.ok(c.items.some(i=>i.id===d.targetId));
  assert.ok(d.memoryIds.some(id=>c.memories.some(m=>m.eventId===id&&m.itemIds.includes(d.targetId!))),'Target requires an actual supplied encounter');
 }
}

for(const [active,capable,maxCalls]of [[50,35,64],[100,70,128]] as const){
 test(`${active} active agents use the real bounded gateway and durable majority cohort without changing the 80-tick clock`,async()=>{
  const f=await runPhase4eServiceFixture({active,directory:directory()}),w=f.state.world;
  assert.equal(w.agents.length,active);assert.equal(w.tick,80);assert.equal(f.clockAdvances,80);assert.equal(f.capableIds.length,capable);
  assert.equal(f.mock.calls.length,maxCalls);assert.equal(w.hybrid!.records.length,maxCalls);assert.ok(w.hybrid!.records.every(r=>r.status==='accepted'));
  assert.ok(w.hybrid!.records.some(r=>r.context.tick>w.genesis.config.steps/2),'Model opportunities continue after the midpoint');assert.ok(w.hybrid!.records.every(r=>r.context.tick<w.genesis.config.steps),'No model opportunity follows the final clock tick');
  assert.equal(new Set(f.mock.calls.map(c=>c.actorId)).size,capable);assert.equal(f.mock.maxInFlight(),1);
  assert.ok(f.mock.calls.every(c=>f.capableIds.includes(c.actorId)));
  assert.ok(w.agents.every(a=>a.goal.trim().length>0));assert.ok(w.hybrid!.records.every(r=>r.context.actor.goal.trim().length>0));
  assert.ok(f.capableIds.some(id=>!Object.values(w.genesis.bindings).includes(id)),'The cohort includes ordinary fictional people');
  assert.equal(w.events.filter(e=>e.tick>0&&e.source==='deterministic-rule'&&['post','comment','reply','message','group-reply'].includes(e.type)).length,0,'Routine support does not invent authored dialogue after declared genesis initialization');
  const opinions=w.events.filter(e=>e.type==='opinion');assert.equal(new Set(opinions.map(e=>e.actorId+'|'+e.targetId)).size,opinions.length,'An unchanged item is not repeatedly applied to the same actor');
  for(const e of opinions)assert.ok(e.causes.some(id=>{const exposure=w.events.find(prior=>prior.id===id);return exposure?.type==='read'&&exposure.actorId===e.actorId&&w.events.indexOf(exposure)<w.events.indexOf(e);}), 'Every bounded state change retains a preceding actual encounter');
  for(const id of f.capableIds){const ticks=f.mock.calls.filter(c=>c.actorId===id).map(c=>c.tick);assert.ok(ticks.length>=1&&ticks.length<=4);assert.ok(ticks.every((t,i)=>i===0||t-ticks[i-1]>=4));}
  for(const tick of new Set(f.mock.calls.map(c=>c.tick)))assert.ok(f.mock.calls.filter(c=>c.tick===tick).length<=2);
  assert.ok(f.mock.calls.every(c=>c.contextBytes<=24000&&c.itemCount<=8&&c.memoryCount<=6));assertPermissions(w);
  const privatePlatforms=new Set(w.genesis.input.communication!.channels.filter(c=>c.style==='private-group').map(c=>c.id));
  assert.ok(w.hybrid!.records.some(r=>r.status==='accepted'&&privatePlatforms.has(r.context.platform)),'Accessible private discussions receive actual model decisions');
  assert.ok(w.events.some(e=>e.source==='social-model'&&e.platform!==null&&privatePlatforms.has(e.platform)&&!!e.groupId&&['message','group-reply'].includes(e.type)),'Private model-authored messages or replies are distinct from initialization');
  const summary=publicSociety(w),graph=summaryGraph(baseGraph(w),summary),facts=aggregateFacts(w,w.events);
  assert.equal(summary.usage.accepted,maxCalls);assert.ok(Math.abs(summary.usage.costUsd!-maxCalls*FIXTURE_USAGE.cost)<1e-10);
  assert.doesNotMatch(JSON.stringify({summary,graph,facts}),/RAW_PHASE4E_|memoryIds|exposedIds|"episodic"/);
  assert.equal(summary.agents.length,active);assert.ok(graph.nodes.filter(n=>n.properties.recordType==='fictional-agent'&&n.properties.presentationPrimary===true).length<=16);
  assert.deepEqual(restoreSociety(saveSociety(w)),w);
  const before=hash(f.journalPath),calls=f.mock.calls.length;evictFixtureSession(f.dependencies.directory!,f.state.sessionId);
  const reopened=await handleSocialRequest(socialRequest({operation:'start',run:f.source}),f.dependencies);assert.equal(reopened.status,200);assert.deepEqual((await reopened.json()).world,w);assert.equal(f.mock.calls.length,calls);assert.equal(hash(f.journalPath),before);
  const stale=await handleSocialRequest(socialRequest({operation:'step',sessionId:f.state.sessionId,revision:0}),f.dependencies);assert.equal(stale.status,409);assert.equal(f.mock.calls.length,calls);
 });
}

test('three distinct model agents can choose an A to B to C chain through actual exposure menus and replay it',async()=>{
 const chain=chainSelector(),f=await runPhase4eServiceFixture({active:50,directory:directory(),publicOnly:true,select:chain.select}),w=f.state.world;
 assert.equal(chain.stage(),3,'The fixture must actually encounter and choose all three links');assert.equal(new Set(chain.actors).size,3);
 const items=['A','B','C'].map(tag=>w.items.find(i=>i.text.startsWith('RAW_PHASE4E_CHAIN_'+tag))!);assert.ok(items.every(Boolean));assert.equal(items[1].parentId,items[0].id);assert.equal(items[2].parentId,items[1].id);
 assertPermissions(w);assert.deepEqual(restoreSociety(saveSociety(w)),w);
 const s=publicSociety(w);assert.doesNotMatch(JSON.stringify({s,graph:summaryGraph(baseGraph(w),s)}),/RAW_PHASE4E_CHAIN_/);
 evictFixtureSession(f.dependencies.directory!,f.state.sessionId);const reopened=await handleSocialRequest(socialRequest({operation:'start',run:f.source}),f.dependencies);assert.equal(reopened.status,200);assert.deepEqual((await reopened.json()).world,w);
});

test('invalid provider choice consumes one durable failed opportunity and never receives a retry',async()=>{
 let offered=0;const f=await runPhase4eServiceFixture({active:50,directory:directory(),select:c=>{const d=phase4eProviderFixture(c);if(offered++===0)d.choiceId='never-offered';return d;}}),w=f.state.world;
 assert.equal(f.mock.calls.length,64);assert.equal(w.hybrid!.records.length,64);assert.equal(w.hybrid!.records.filter(r=>r.status==='failed').length,1);assert.equal(w.hybrid!.records.filter(r=>r.status==='accepted').length,63);assert.equal(w.hybrid!.records[0].decision,null);
 assert.ok(w.events.some(e=>e.source==='social-decision-failed'));assert.deepEqual(restoreSociety(saveSociety(w)),w);assertPermissions(w);
 evictFixtureSession(f.dependencies.directory!,f.state.sessionId);const r=await handleSocialRequest(socialRequest({operation:'start',run:f.source}),f.dependencies);assert.equal(r.status,200);assert.equal((await r.json()).world.hybrid.records[0].status,'failed');assert.equal(f.mock.calls.length,64);
});

test('HTTP clients cannot supply a cohort or larger provider budget; disabled dispatch remains zero',async()=>{
 const source=await phase4eSource(),mock=phase4eFetcher(),d={directory:directory(),enabled:true,key:'offline',swarm:swarmPolicy(50),communication:phase4eCommunication(),fetcher:mock.fetcher};
 for(const extra of [{swarm:swarmPolicy(100)},{maxCalls:10000},{world:{}}]){const r=await handleSocialRequest(socialRequest({operation:'start',run:source,...extra}),d);assert.equal(r.status,409);}
 assert.equal(mock.calls.length,0);
 const disabled=await handleSocialRequest(socialRequest({operation:'start',run:source}),{...d,enabled:false});assert.equal(disabled.status,503);assert.equal(mock.calls.length,0);
});

test('a second simultaneous session step cannot reserve or dispatch another model call',async()=>{
 const source=await phase4eSource(),mock=phase4eFetcher();let ready!:()=>void,release!:()=>void;
 const dispatchStarted=new Promise<void>(resolve=>{ready=resolve;}),heldResponse=new Promise<void>(resolve=>{release=resolve;});
 const d={directory:directory(),enabled:true,key:'offline',swarm:swarmPolicy(50),communication:phase4eCommunication(),fetcher:async(input:Parameters<typeof fetch>[0],init?:RequestInit)=>{const response=await mock.fetcher(input,init);ready();await heldResponse;return response;}};
 let state=await(await handleSocialRequest(socialRequest({operation:'start',run:source}),d)).json(),pending:Promise<Response>|undefined;
 try{
  for(let i=0;i<20;i++){
   const operation=handleSocialRequest(socialRequest({operation:'step',sessionId:state.sessionId,revision:state.revision}),d);
   const outcome=await Promise.race([dispatchStarted.then(()=>({kind:'dispatch' as const})),operation.then(response=>({kind:'step' as const,response}))]);
   if(outcome.kind==='dispatch'){pending=operation;break;}
   assert.equal(outcome.response.status,200);state=await outcome.response.json();
  }
  assert.ok(pending,'The fixture must reach an actual model reservation');assert.equal(mock.calls.length,1);
  const duplicate=await handleSocialRequest(socialRequest({operation:'step',sessionId:state.sessionId,revision:state.revision}),d);assert.equal(duplicate.status,409);assert.equal(mock.calls.length,1);
 }finally{release();}
 assert.ok(pending);const completed=await pending;assert.equal(completed.status,200);const accepted=await completed.json();assert.equal(accepted.world.hybrid.records.length,1);assert.equal(accepted.world.hybrid.records[0].status,'accepted');assert.equal(mock.calls.length,1);
 evictFixtureSession(d.directory,accepted.sessionId);const reopened=await handleSocialRequest(socialRequest({operation:'start',run:source}),d);assert.equal(reopened.status,200);assert.deepEqual((await reopened.json()).world,accepted.world);assert.equal(mock.calls.length,1);
});
