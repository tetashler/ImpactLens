import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {phase4eSource,phase4eCommunication,evictFixtureSession} from '../../../scripts/testing/phase4e-fixture.ts';
import {getCitizenDataset} from '../../server/citizen-grounding/data.ts';
import {getBaseline} from '../../server/mrt-service.ts';
import {buildPopulation,populationView} from '../../server/population/store.ts';
import {illustrativeLine} from '../../../prototype/mrt/examples/illustrative-line.ts';
import {calculateCitizenCommutes} from '../../citizen-grounding/commute.ts';
import {mockPersonalityRoster} from '../../citizen-grounding/personality.ts';
import {createCitizenGrounding} from '../../citizen-grounding/social.ts';
import {buildCitizenEvidenceMenu} from '../../citizen-grounding/decision-v5.ts';
import {createSociety,act,saveSociety,restoreSociety} from '../../society/engine.ts';
import {controlledIds,prepareHybridStep,buildDecisionContext,parseSocialDecision,finishDecision,replayHybrid,replayHybridFrom} from '../../society/hybrid.ts';
import {decisionContextBytes} from '../../society/context-capacity.ts';
import {decodeMenuDecision,encodeMenuContext} from '../../society/decision-menu.ts';
import {applyIssue} from '../../society/episodic.ts';
import {multiDaySwarmPolicy,swarmHybrid} from '../../society/swarm.ts';
import {CITIZEN_MENU_POLICY,QUALITY_POLICY} from '../../society/intelligence.ts';
import {socialOperation,type SocialDependencies} from '../../server/society/service.ts';
import {parseRejectionObservation} from '../../server/society/rejection-observations.ts';
import {canonical} from '../../experiments/validation.ts';
import type {DecisionContext} from '../../society/decision-contract.ts';
import type {SocietyInput,SocietyWorld,Platform} from '../../society/contract.ts';
import type {MemoryRetrievalDiagnostics} from '../../society/memory-diagnostics.ts';

const authored=new Set(['post','message','comment','reply','group-reply']);
let base:Promise<SocietyWorld>|undefined;
let fixtureSource:Awaited<ReturnType<typeof phase4eSource>>|undefined;
/** The same real-source builders as citizen-grounded-acceptance, without its top-level cohort runner or stores. */
function groundedWorld():Promise<SocietyWorld>{return base??=(async()=>{
 const source=fixtureSource=await phase4eSource('citizen-v5-production-context');assert.equal(source.inputSnapshot.version,2);
 if(source.inputSnapshot.version!==2)throw Error('Expected the existing dynamic fixture.');
 const plan=source.inputSnapshot.scenarioPlan,swarm=multiDaySwarmPolicy(50,350,320);
 const input:SocietyInput={runId:source.runId,question:plan.request.question,seed:plan.requestIdentity.slice(-32),population:populationView(buildPopulation({size:10000,seed:'impactlens-society-v1'})),roles:plan.draft.agents,jurisdictions:plan.draft.jurisdictions,acceptedActions:source.events.map(e=>({id:e.id,roleId:e.roleId,statement:e.statement,position:e.position})),sharePolicy:'source-position-v1',socialPolicy:'memory-aware-v1',communication:phase4eCommunication(),intelligence:QUALITY_POLICY,swarm,hybrid:swarmHybrid(swarm),config:{agents:50,steps:320,activation:0}};
 const preview=createSociety(input),activeIds=preview.agents.map(a=>a.id),capableIds=controlledIds(preview);
 const dataset=getCitizenDataset(),commutes=calculateCitizenCommutes(dataset,getBaseline('2026-10-27'),illustrativeLine);
 const roster=await mockPersonalityRoster({runId:source.runId,capableIds,backgroundIds:activeIds.filter(id=>!capableIds.includes(id)),seed:'citizen-v5-production-context'});
 const citizenGrounding=await createCitizenGrounding(dataset,commutes,roster,activeIds,capableIds);
 return createSociety({...input,intelligence:CITIZEN_MENU_POLICY,citizenGrounding});
})();}

function pendingWorld(initial:SocietyWorld):SocietyWorld{
 let w=initial;for(let i=0;i<400&&!w.hybrid?.pending;i++)w=prepareHybridStep(w);
 assert.ok(w.hybrid?.pending,'The production scheduler must offer a bounded v5 opportunity.');return w;
}
function wire(c:DecisionContext,text='The supplied commute arrangements need a practical review before the proposed service begins.'){
 const option=c.menu?.find(o=>authored.has(o.action))??c.menu?.find(o=>o.action==='inactive');assert.ok(option);
 return {choiceId:option.id,text:authored.has(option.action)?text:null,motivation:'Scripted offline contribution using only the supplied context.',recallIds:[],stanceId:'keep',discussion:{topicIds:[],argument:'unspecified'},issueEvidenceId:null,factIds:[]};
}
function openCommuteIssue(initial:SocietyWorld,actorId:string,platform:Platform,groupId?:string){
 const question='Which commute arrangements will be confirmed before the proposed service begins?';
 let w=act(initial,{actorId,type:groupId?'message':'post',platform,...(groupId?{groupId}:{}),text:question}),source=w.events.at(-1)!;
 w=applyIssue(w,actorId,{kind:'question',topicId:w.genesis.input.communication!.topics[0].id,issueId:null,grounding:{subjectId:'commute',basisRef:'fact-mode',quote:question,criterion:null,statusEvidence:'open',updates:[]}},source.id);
 return {w,sourceId:source.id,issueId:'issue:'+source.id};
}
function prose(kind:string,keyword:string,predicate:string|null){
 if(kind==='condition'&&predicate)return predicate;
 const texts:Record<string,string>={question:`Which ${keyword} arrangements will be confirmed before the proposed service begins?`,condition:`I can participate only if the ${keyword} arrangements are confirmed before the proposed service begins.`,commitment:`I will review the ${keyword} arrangements before the proposed service begins.`,disagreement:`I disagree because the ${keyword} arrangements need confirmation before the proposed service begins.`,progress:`The ${keyword} question is still pending before the proposed service begins.`,resolve:`My question is answered because the ${keyword} arrangements are confirmed before the proposed service begins.`,withdraw:`I withdraw my ${keyword} question because I no longer plan to participate.`};
 assert.ok(texts[kind]);return texts[kind];
}

test('real grounded createSociety and prepareHybridStep produce bounded own-citizen v5 contexts',async()=>{
 const w=pendingWorld(await groundedWorld()),c=w.hybrid!.pending!,encoded=JSON.parse(encodeMenuContext(c));
 assert.equal(w.genesis.version,6);assert.equal(c.policy,'conversation-menu-v5');assert.equal(encoded.policy,'conversation-menu-v5');
 assert.ok(decisionContextBytes(c)<=24000);assert.ok(Buffer.byteLength(canonical(c))<=24000);assert.ok(Buffer.byteLength(encodeMenuContext(c))<=24000);
 assert.ok(c.items.length<=8&&c.memories.length<=6);assert.equal(c.grounding?.citizenId,c.actor.id);assert.equal(encoded.grounding.citizenId,c.actor.id);
 assert.ok(!Object.hasOwn(encoded.grounding,'profiles'));assert.ok(!Object.hasOwn(encoded.grounding,'personalities'));assert.equal(c.grounding?.personality.origin,'offline-mock');
 const decision=decodeMenuDecision(wire(c),c);assert.deepEqual(parseSocialDecision(decision,c),decision);
});

test('real v5 context packing keeps offered source, memory and evidence bindings aligned',async()=>{
 let w=await groundedWorld();const reader=controlledIds(w)[0],author=w.agents.find(a=>a.id!==reader)!.id;
 w=openCommuteIssue(w,reader,'reddit').w;
 w=act(w,{actorId:reader,type:'follow',platform:'reddit',targetId:author});
 for(let i=0;i<8;i++){w=act(w,{actorId:author,type:'post',platform:'reddit',text:'界'.repeat(930)+' The commute arrangements need a careful practical review.'});w=act(w,{actorId:reader,type:'read',platform:'reddit',targetId:w.items.at(-1)!.id});}
 const before=canonical(w);let diagnostic:MemoryRetrievalDiagnostics|undefined;
 const c=buildDecisionContext(w,reader,'reddit',value=>diagnostic=value),encoded=JSON.parse(encodeMenuContext(c));
 assert.ok(diagnostic?.capacityPacking?.changed,'The real grounded context must exercise overflow packing.');assert.ok(decisionContextBytes(c)<=24000);
 assert.equal(canonical(w),before);assert.equal(canonical(buildDecisionContext(w,reader,'reddit')),canonical(c));
 for(const item of c.items)assert.equal(item.text,w.items.find(source=>source.id===item.id)!.text);
 for(const memory of c.memories){assert.ok(c.items.some(i=>i.id===memory.primaryItemId));assert.ok(memory.itemIds.every(id=>c.items.some(i=>i.id===id)));}
 for(const option of c.menu??[]){if(option.targetKind==='item')assert.ok(option.targetIndex!==null&&c.items[option.targetIndex]);assert.ok(option.memoryIndices.every(index=>c.memories[index]));}
 assert.ok(c.menu?.some(o=>o.action==='inactive'));assert.ok(c.menu?.some(o=>authored.has(o.action)));
 assert.ok(encoded.issueOptions.length>0);
 for(const option of encoded.issueOptions){
  const keyword=encoded.issueRules.subjects.find((s:{id:string})=>s.id===option.subjectId).proseKeywords[0];assert.ok(keyword);
  for(const ref of option.requiredMemories){const match=/^memory-([1-6])$/.exec(ref);assert.ok(match&&c.memories[Number(match[1])-1]);}
  if(option.sourceItem){const match=/^item-([1-8])$/.exec(option.sourceItem);assert.ok(match&&c.items[Number(match[1])-1]);}
  const decision=decodeMenuDecision({...wire(c,prose(option.kind,keyword,option.criterionCondition)),discussion:null,issueEvidenceId:option.id},c);
  assert.equal(decision.issueUpdate?.kind,option.kind);assert.equal(decision.issueUpdate?.grounding?.basisRef,option.basisRef);
  assert.deepEqual(parseSocialDecision(decision,c),decision);
  for(const ref of option.requiredMemories)assert.ok(decision.memoryIds.includes(c.memories[Number(ref.slice(7))-1].eventId));
 }
});

test('leaving an actual private group removes its owned issue sources and evidence from v5 context',async()=>{
 let w=await groundedWorld();const owner=controlledIds(w)[0],peer=w.agents.find(a=>a.id!==owner)!.id;
 const channel=w.genesis.input.communication!.channels.find(ch=>ch.style==='private-group')!.id;
 w=act(w,{actorId:owner,type:'group-create',platform:channel,memberIds:[peer],purposeId:w.genesis.input.communication!.topics[0].id});const groupId=w.groups!.at(-1)!.id;
 const issue=openCommuteIssue(w,owner,channel,groupId);w=issue.w;
 const before=buildDecisionContext(w,owner,channel);assert.ok(before.items.some(i=>i.id===issue.sourceId));assert.ok(buildCitizenEvidenceMenu(before).some(e=>e.choice.update.issueId===issue.issueId));
 w=act(w,{actorId:owner,type:'group-leave',platform:channel,targetId:groupId});const after=buildDecisionContext(w,owner,channel);
 assert.ok(w.items.some(i=>i.id===issue.sourceId),'The private source remains retained in authoritative state.');
 assert.ok(!after.items.some(i=>i.id===issue.sourceId));assert.ok(!after.issues?.some(i=>i.id===issue.issueId));assert.ok(!buildCitizenEvidenceMenu(after).some(e=>e.choice.update.issueId===issue.issueId));
});

test('actual citizen issue-history saturation disables new evidence while ordinary discussion remains legal',async()=>{
 let w=await groundedWorld();const owner=controlledIds(w)[0];
 for(let i=0;i<16;i++){
  const issue=openCommuteIssue(w,owner,'reddit');w=issue.w;
  const text='I withdraw my commute question because I no longer plan to participate.';w=act(w,{actorId:owner,type:'post',platform:'reddit',text});
  w=applyIssue(w,owner,{kind:'withdraw',topicId:w.genesis.input.communication!.topics[0].id,issueId:issue.issueId,grounding:{subjectId:'commute',basisRef:'fact-mode',quote:text,criterion:null,statusEvidence:'owner-withdrawal',updates:[]}},w.events.at(-1)!.id);
 }
 assert.equal(w.agents.find(a=>a.id===owner)!.issueHistory?.length,16);
 const c=buildDecisionContext(w,owner,'reddit');assert.equal(c.issueCreationAllowed,false);assert.deepEqual(buildCitizenEvidenceMenu(c),[]);
 const decision=decodeMenuDecision(wire(c),c);assert.equal(decision.issueUpdate,null);assert.deepEqual(parseSocialDecision(decision,c),decision);
});

test('small accepted production v5 decisions replay exactly from genesis and an accepted prefix',async()=>{
 let w=await groundedWorld(),prefix:SocietyWorld|undefined;
 for(let i=0;i<4;i++){
  w=pendingWorld(w);const c=w.hybrid!.pending!,decision=decodeMenuDecision(wire(c),c);w=finishDecision(w,{decision,usage:null,error:null});
  assert.equal(w.hybrid!.records.at(-1)!.status,'accepted');if(i===1)prefix=w;
 }
 assert.equal(w.hybrid!.records.length,4);assert.ok(w.hybrid!.records.every(r=>r.context.policy==='conversation-menu-v5'));
 assert.ok(w.hybrid!.records.some(r=>authored.has(r.decision!.action)));
 assert.equal(canonical(replayHybrid(w.genesis.input,w.tick,w.hybrid!.records,w.hybrid!.pending)),canonical(w));
 assert.equal(canonical(replayHybridFrom(prefix!,w.tick,w.hybrid!.records,w.hybrid!.pending)),canonical(w));
 assert.equal(canonical(restoreSociety(saveSociety(w))),canonical(w));
});

test('production v5 service records a finite rejection sidecar without retaining rejected prose or retrying',async()=>{
 const initial=await groundedWorld(),directory=mkdtempSync(join(tmpdir(),'citizen-v5-production-service-')),marker='PRIVATE_REJECTED_PRODUCTION_SENTINEL';
 let sessionId:string|undefined,calls=0;
 const dependencies:SocialDependencies={directory,enabled:true,key:'offline-v5-production-fixture',communication:phase4eCommunication(),swarm:multiDaySwarmPolicy(50,350,320),citizenMenuPolicy:'conversation-menu-v5',admission:{maxCalls:1},citizenGrounding:async preview=>{
  assert.deepEqual(preview.agents.map(a=>a.id),initial.genesis.input.citizenGrounding!.profiles.map(p=>p.citizen.id));
  assert.deepEqual(controlledIds(preview),initial.genesis.input.citizenGrounding!.personalities.capableIds);
  return initial.genesis.input.citizenGrounding!;
 },fetcher:async(url,init)=>{
  calls++;assert.equal(String(url),'https://openrouter.ai/api/v1/chat/completions');
  const body=JSON.parse(String(init?.body)),c=JSON.parse(body.messages[1].content);assert.equal(c.policy,'conversation-menu-v5');
  assert.ok(body.response_format.json_schema.schema.properties.issueEvidenceId);assert.equal(body.response_format.json_schema.schema.properties.issueEvidence,undefined);
  const option=c.choices.find((o:{action:string})=>authored.has(o.action));assert.ok(option,'The rejected completion must use an offered authored action.');
  const value={choiceId:option.id,text:'twelve minutes '+marker,motivation:'Scripted offline rejection exercising the production observer.',recallIds:[],stanceId:'keep',discussion:{topicIds:[],argument:'unspecified'},issueEvidenceId:null,factIds:[]};
  return Response.json({id:'mock-v5-production-rejection',model:body.model,provider:'DigitalOcean',usage:{prompt_tokens:100,completion_tokens:30,total_tokens:130,cost:0.0001,completion_tokens_details:{reasoning_tokens:0}},choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]});
 }};
 try{
  let state=await socialOperation({operation:'start',run:fixtureSource!},dependencies);sessionId=state.sessionId;
  assert.equal(state.world.genesis.input.intelligence?.context,'conversation-menu-v5');
  for(let i=0;i<400&&!state.world.hybrid!.records.length;i++)state=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},dependencies);
  assert.equal(calls,1);assert.equal(state.world.hybrid!.records.length,1);assert.equal(state.admission.calls,1);
  const record=state.world.hybrid!.records[0];assert.equal(record.status,'failed');assert.equal(record.error,'SOCIAL_TEXT');assert.equal(record.usage?.socialValidationRule,'SOCIAL_TEXT');
  const sidecar=readFileSync(join(directory,sessionId+'.rejections-v1'),'utf8'),rows=sidecar.trimEnd().split('\n');assert.equal(rows.length,1);
  const observation=parseRejectionObservation(JSON.parse(rows[0]));assert.equal(observation.diagnostic.subreason,'unsupported-number-or-unit');assert.equal(observation.diagnostic.stage,'factual');
  assert.equal(observation.contextSha256,createHash('sha256').update(record.context.id).digest('hex'));
  assert.ok(!sidecar.includes(marker)&&!sidecar.includes(record.context.id));
  assert.ok(!readFileSync(join(directory,sessionId+'.jsonl'),'utf8').includes(marker));
  for(let i=0;i<2;i++)state=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},dependencies);
  assert.equal(calls,1);assert.equal(state.admission.calls,1);assert.equal(state.world.hybrid!.records.length,1);
 }finally{
  if(sessionId)evictFixtureSession(directory,sessionId);
  assert.ok(directory.startsWith(join(tmpdir(),'citizen-v5-production-service-')));rmSync(directory,{recursive:true,force:true});
 }
});
