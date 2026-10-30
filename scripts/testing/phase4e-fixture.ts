/** Task-only, network-blocked fixtures. Never imported by production inference. */
import './offline-network.mjs';
import {openSync,readSync,closeSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {worldFixtures} from '../../lib/world-graph/fixtures.ts';
import {createDynamicPlan} from '../../lib/dynamic-scenarios/plan.ts';
import {createDynamicInput} from '../../lib/dynamic-scenarios/execution.ts';
import {deterministicTurn,runStakeholderSimulation} from '../../lib/stakeholder-simulation/engine.ts';
import {selectCommunication} from '../../lib/society/communication.ts';
import {handleSocialRequest,type SocialDependencies} from '../../lib/server/society/service.ts';
import {swarmPolicy,cohortIds} from '../../lib/society/swarm.ts';
import type {SocietyWorld} from '../../lib/society/contract.ts';
import {ensure} from '../../lib/experiments/validation.ts';

export const FIXTURE_USAGE=Object.freeze({prompt_tokens:450,completion_tokens:120,total_tokens:570,cost:0.0001,completion_tokens_details:{reasoning_tokens:0}});
export interface WireItem {id:string;actorId:string;platform:string;parentId:string|null;groupId:string|null;text:string;modelAuthored?:boolean;tick?:number}
export interface WireChoice {id:string;action:string;platform:string;target:string|null;requiredMemories:string[];destinationGroup:string|null}
export interface SwarmWireContext {id:string;runId:string;policy:string;tick:number;platform:string;actor:{id:string;goal:string;label:string};items:WireItem[];choices:WireChoice[];memories:{ref:string;kind:string;origin?:string;items:string[]}[];topics?:{id:string;label:string}[];channels?:{id:string;style:string}[];groups?:{ref:string;member:boolean}[]}
export interface FixtureSelection {choiceId:string;text:string|null;motivation:string;recallIds:string[];stanceId:string;discussion:{topicIds:string[];argument:string};issueUpdate:null}
const authored=new Set(['post','comment','reply','message','group-reply']);
const replying=new Set(['comment','reply','group-reply']);

export function phase4eProviderFixture(c:SwarmWireContext,choice?:WireChoice,text?:string):FixtureSelection{
 const selected=choice??c.choices.find(m=>replying.has(m.action)&&c.items.some(i=>i.id===m.target&&i.modelAuthored&&i.actorId!==c.actor.id))??c.choices.find(m=>replying.has(m.action))??c.choices.find(m=>m.action==='post'||m.action==='message')??c.choices.find(m=>m.action==='inactive')??c.choices[0];
 ensure(selected&&c.choices.some(m=>m.id===selected.id),'PHASE4E_FIXTURE_MENU');
 return {choiceId:selected.id,text:authored.has(selected.action)?text??`RAW_PHASE4E_SOCIAL ${c.actor.label.slice(0,80)} considers wages, staffing and service coverage at tick ${c.tick}.`:null,motivation:'RAW_PHASE4E_MEMORY A fictional fixture response to the supplied goal and encounter.',recallIds:[],stanceId:'keep',discussion:{topicIds:(c.topics??[]).slice(0,1).map(t=>t.id),argument:'condition'},issueUpdate:null};
}

/** Deliberate capability fixture: it chooses replies only when the real menu offers them. */
export function chainSelector(){
 const actors:string[]=[];let stage=0;
 const select=(c:SwarmWireContext)=>{
  let option:WireChoice|undefined;
  if(stage===0){option=c.choices.find(m=>m.action==='post');if(option){actors.push(c.actor.id);stage=1;return phase4eProviderFixture(c,option,'RAW_PHASE4E_CHAIN_A Could wages and service coverage be protected with a fair roster?');}}
  if(stage===1&&c.actor.id!==actors[0]){option=c.choices.find(m=>replying.has(m.action)&&c.items.some(i=>i.id===m.target&&i.text.startsWith('RAW_PHASE4E_CHAIN_A')));if(option){actors.push(c.actor.id);stage=2;return phase4eProviderFixture(c,option,'RAW_PHASE4E_CHAIN_B The wage safeguard needs explicit staffing and coverage conditions.');}}
  if(stage===2&&!actors.includes(c.actor.id)){option=c.choices.find(m=>replying.has(m.action)&&c.items.some(i=>i.id===m.target&&i.text.startsWith('RAW_PHASE4E_CHAIN_B')));if(option){actors.push(c.actor.id);stage=3;return phase4eProviderFixture(c,option,'RAW_PHASE4E_CHAIN_C That staffing condition should also protect monthly wages.');}}
  return phase4eProviderFixture(c,c.choices.find(m=>m.action==='inactive'));
 };
 return {select,actors,stage:()=>stage};
}

export async function phase4eSource(id='phase4e-offline'){
 const f=worldFixtures()[0];
 return runStakeholderSimulation(await createDynamicInput(await createDynamicPlan(f.request,f.draft)),{attemptId:id,provider:'offline-fixture',model:'fixture',generateTurn:async c=>deterministicTurn(c)});
}
export function phase4eCommunication(publicOnly=false){
 return selectCommunication((publicOnly?['Reddit']:['Reddit','Instagram','WhatsApp','Telegram']).map(name=>({id:name.toLowerCase(),name,typeId:'communication'})),[{id:'communication',name:'Communication platform'}],['Workweek safeguards','Service continuity']);
}
export const socialRequest=(body:unknown)=>new Request('http://localhost/api/social-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export interface FixtureCall {actorId:string;tick:number;platform:string;contextBytes:number;memoryCount:number;episodicMemories:number;itemCount:number;offeredPeerReplies:number;offeredActions:string[];selectedAction:string;selectedPeer:boolean}
export function phase4eFetcher(select=(c:SwarmWireContext)=>phase4eProviderFixture(c)){
 const calls:FixtureCall[]=[];let inFlight=0,maxInFlight=0;
 const fetcher:typeof fetch=async(url,init)=>{
  ensure(String(url)==='https://openrouter.ai/api/v1/chat/completions','PHASE4E_FIXTURE_URL');
  const b=JSON.parse(String(init?.body));
  ensure(b.model==='deepseek/deepseek-v4-flash-0731'&&JSON.stringify(b.provider)===JSON.stringify({only:['digitalocean'],allow_fallbacks:false,require_parameters:true})&&b.reasoning?.effort==='none'&&b.reasoning?.exclude===true&&b.max_tokens===600&&b.response_format?.json_schema?.name==='social_decision_v1','PHASE4E_FIXTURE_ROUTE');
  const c=JSON.parse(b.messages[1].content) as SwarmWireContext,v=select(c),chosen=c.choices.find(m=>m.id===v.choiceId);
  const peer=(choice:WireChoice)=>replying.has(choice.action)&&c.items.some(i=>i.id===choice.target&&i.actorId!==c.actor.id&&i.modelAuthored);
  calls.push({actorId:c.actor.id,tick:c.tick,platform:c.platform,contextBytes:Buffer.byteLength(b.messages[1].content),memoryCount:c.memories.length,episodicMemories:c.memories.filter(m=>m.origin==='episodic').length,itemCount:c.items.length,offeredPeerReplies:c.choices.filter(peer).length,offeredActions:[...new Set(c.choices.map(m=>m.action))],selectedAction:chosen?.action??'invalid',selectedPeer:!!chosen&&peer(chosen)});
  inFlight++;maxInFlight=Math.max(maxInFlight,inFlight);
  try{return Response.json({id:'mock-phase4e-'+calls.length,model:b.model,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(v)}}],usage:FIXTURE_USAGE});}finally{inFlight--;}
 };
 return {fetcher,calls,maxInFlight:()=>maxInFlight};
}
export interface ServiceFixtureOptions {active:50|100;directory:string;source?:Awaited<ReturnType<typeof phase4eSource>>;select?:(c:SwarmWireContext)=>FixtureSelection;publicOnly?:boolean;historical?:boolean;maxRequests?:number}
export async function runPhase4eServiceFixture(options:ServiceFixtureOptions){
 const source=options.source??await phase4eSource(),mock=phase4eFetcher(options.select),dependencies:SocialDependencies={directory:options.directory,enabled:true,key:'offline-fixture-only',communication:phase4eCommunication(options.publicOnly),swarm:options.historical?false:swarmPolicy(options.active),fetcher:mock.fetcher};
 const began=performance.now();const started=await handleSocialRequest(socialRequest({operation:'start',run:source}),dependencies);ensure(started.ok,'PHASE4E_START');
 let state=await started.json() as {sessionId:string;revision:number;world:SocietyWorld};
 const journalPath=join(options.directory,state.sessionId+'.jsonl'),initialJournalBytes=statSync(journalPath).size,journalGrowth:{request:number;tick:number;calls:number;bytes:number}[]=[];
 let requests=0,clockAdvances=0,sameTickRequests=0,peakHeap=process.memoryUsage().heapUsed,maxCheckpointBytes=initialJournalBytes-1,serviceJournalMs=performance.now()-began,journalOffset=initialJournalBytes;
 while(state.world.tick<state.world.genesis.config.steps||state.world.hybrid?.pending){
  ensure(requests++<(options.maxRequests??400),'PHASE4E_REQUEST_BOUND');const before=state.world.tick;
  const operationStart=performance.now(),response=await handleSocialRequest(socialRequest({operation:'step',sessionId:state.sessionId,revision:state.revision}),dependencies);ensure(response.ok,'PHASE4E_STEP');state=await response.json();serviceJournalMs+=performance.now()-operationStart;
  if(state.world.tick>before)clockAdvances++;else sameTickRequests++;
  const journalBytes=statSync(journalPath).size,buffer=Buffer.alloc(journalBytes-journalOffset),fd=openSync(journalPath,'r');try{ensure(readSync(fd,buffer,0,buffer.length,journalOffset)===buffer.length,'PHASE4E_JOURNAL_READ');}finally{closeSync(fd);}journalOffset=journalBytes;
  maxCheckpointBytes=Math.max(maxCheckpointBytes,...buffer.toString('utf8').trimEnd().split('\n').map(line=>Buffer.byteLength(line)));
  journalGrowth.push({request:requests,tick:state.world.tick,calls:mock.calls.length,bytes:journalBytes});peakHeap=Math.max(peakHeap,process.memoryUsage().heapUsed);
 }
 return {source,dependencies,mock,state,journalPath,journalGrowth,initialJournalBytes,maxCheckpointBytes,requests,clockAdvances,sameTickRequests,peakHeap,serviceJournalMs,observedDriverMs:performance.now()-began,capableIds:options.historical?Object.values(state.world.genesis.bindings).slice(0,state.world.genesis.input.hybrid?.selectedAgents):cohortIds(state.world)};
}

export function evictFixtureSession(directory:string,id:string){
 const sessions=(globalThis as typeof globalThis&{__socialSessions?:Map<string,unknown>}).__socialSessions;
 sessions?.delete(directory+'/'+id);
}
