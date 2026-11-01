import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {prepareHybridExplore} from '../../server/interventions/explore.ts';
import {getPrivateCitizenImpact} from '../../server/citizen-grounding/api.ts';
import {populationForActive,populationForCitizenSelection} from '../../server/society/population.ts';
import {createSociety,saveSociety,restoreSociety,type SocietyInput} from '../../society/engine.ts';
import {controlledIds} from '../../society/hybrid.ts';
import {multiDaySwarmPolicy,swarmHybrid} from '../../society/swarm.ts';
import {QUALITY_POLICY,CITIZEN_DECLARATION_POLICY} from '../../society/intelligence.ts';
import {phase4eCommunication} from '../../../scripts/testing/phase4e-fixture.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {publicSociety} from '../../server/society/summary.ts';
import {parseHybridPublicGrounding,type HybridExploreWire} from '../../interventions/explore-contract.ts';
import {canonical} from '../../experiments/validation.ts';
import {presentCitizenGrounding,CITIZEN_GROUNDING_LIMITS} from '../../citizen-grounding/social.ts';
import {groundedMemoryBonus} from '../../citizen-grounding/memory.ts';
const coordinates=[{lat:1.38517205,lon:103.744369},{lat:1.399447,lon:103.819552},{lat:1.39152768,lon:103.895416}];
export function selectionWire():HybridExploreWire{return {version:2,attemptId:'synthetic-selection-acceptance',request:{version:1,question:'What if a proposed MRT connection links Choa Chu Kang and Sengkang along this drawn route using the station dots?',geometryRevision:12,geometry:{version:1,scenarioId:'citizen-selection-fixture',features:[{kind:'line',id:'route',label:'Hypothetical route',coordinates,provenance:'user-drawn'},...coordinates.map((coordinate,i)=>({kind:'point' as const,id:'stop-'+i,label:'Stop '+i,coordinate,role:'station' as const,provenance:'user-drawn' as const}))]}},hybrid:{version:1,policy:'hybrid-citizen-explore-v1',interpretationPolicy:'hybrid-map-v2',serviceDate:'2026-10-27',anchors:{'stop-0':'NS4','stop-2':'NE16'},selection:{routeId:'route',pointIds:['stop-0','stop-1','stop-2']},timings:{runSeconds:600,dwellSeconds:30,waitingTimeSeconds:150,transferWalkSeconds:180,geometryConfirmed:true,assumptionsConfirmed:true}}};}
function input(n:50|100):SocietyInput {const draft=worldFixtures()[3].draft,swarm=multiDaySwarmPolicy(n,n===50?350:700,320);return {runId:'synthetic-selection-'+n,question:selectionWire().request.question,seed:'citizen-selection-fixture',population:populationForActive(n),roles:draft.agents,jurisdictions:draft.jurisdictions,sharePolicy:'source-position-v1',socialPolicy:'memory-aware-v1',intelligence:QUALITY_POLICY,communication:phase4eCommunication(),swarm,hybrid:swarmHybrid(swarm),config:{agents:n,steps:320},acceptedActions:Array.from({length:8},(_,i)=>({id:'synthetic-turn-'+i,roleId:draft.agents[i%4].id,statement:'PRIVATE_SELECTION_INITIAL_ACTION',position:'conditional'}))};}
test('ordinary prepared MRT path exposes a server-owned selector before personality generation',async()=>{
 const ready=await prepareHybridExplore(selectionWire(),{key:'offline-only',enabled:false});assert.equal(ready.kind,'ready');if(ready.kind!=='ready')return;assert.equal(typeof ready.citizenSelection,'function');
});
test('real local CCK–Sengkang calculation enriches 50/100, freezes roster and preserves national weights',async()=>{
 let calls=0;const fetcher:typeof fetch=async(_url,init)=>{calls++;const b=JSON.parse(String(init?.body));assert.equal(b.response_format.json_schema.name,'citizen_personalities_v1');const c=JSON.parse(b.messages[1].content);return Response.json({id:'synthetic-personality-'+calls,model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200,cost:0,completion_tokens_details:{reasoning_tokens:0}},choices:[{finish_reason:'stop',message:{content:JSON.stringify({profiles:c.slots.map((s:any,i:number)=>({slotId:s.slotId,style:'direct',c:i%5,i:Math.floor(i/5)%5,d:Math.floor(i/25),k:2,u:3}))})}}]});};
 const first=await prepareHybridExplore(selectionWire(),{key:'offline-only',enabled:true,fetcher});assert.equal(first.kind,'ready');if(first.kind!=='ready')return;
 const impact=getPrivateCitizenImpact(first.publicGrounding().impact.runId)!;assert.ok(impact);const before=canonical(impact.run.summary),datasetBefore=canonical(impact.dataset);assert.equal(impact.dataset.records.length,10000);const improved=impact.run.facts.filter(f=>f.status==='improved');assert.equal(improved.length,4);
 for(const n of [50,100] as const){
  const prepared:Awaited<ReturnType<typeof prepareHybridExplore>>=n===50?first:await prepareHybridExplore(selectionWire(),{key:'offline-only',enabled:true,fetcher,impact:async()=>impact});assert.equal(prepared.kind,'ready');if(prepared.kind!=='ready')continue;
  const old=input(n),legacyIds=createSociety(old).agents.map(a=>a.id),selected=prepared.citizenSelection(old);const enriched={...old,population:populationForCitizenSelection(selected),citizenSelection:selected},preview=createSociety(enriched);
  assert.equal(preview.agents.length,n);assert.equal(new Set(preview.agents.map(a=>a.id)).size,n);assert.equal(controlledIds(preview).length,n===50?35:70);assert.ok(selected.members.filter(m=>m.bucket==='comparison').length>=n/2);
  const eligible=improved.filter(f=>Number(impact.dataset.records.find(c=>c.id===f.citizenId)!.ageGroup.split('_')[0])>=20);assert.equal(eligible.length,4);for(const f of eligible)assert.ok(selected.members.some(m=>m.id===f.citizenId&&m.status==='improved'));
  const grounding=await prepared.citizenGrounding(preview),world=createSociety({...enriched,intelligence:CITIZEN_DECLARATION_POLICY,citizenGrounding:grounding});assert.deepEqual(grounding.profiles.map(p=>p.citizen.id),selected.members.map(m=>m.id));assert.deepEqual(restoreSociety(saveSociety(world),world.genesis),world);assert.deepEqual(createSociety(old).agents.map(a=>a.id),legacyIds);assert.equal(old.citizenSelection,undefined);
  for(const agent of world.agents){const context=presentCitizenGrounding(grounding,agent.id,'citizen-selection-v2');assert.ok(Buffer.byteLength(JSON.stringify(context))<=CITIZEN_GROUNDING_LIMITS.actorContextBytes);assert.equal(context.citizenId,agent.id);assert.equal(context.facts.length,10);let legacy;try{legacy=presentCitizenGrounding(grounding,agent.id);}catch(error){assert.equal((error as Error).message,'CITIZEN_GROUNDING_CONTEXT_BOUND');}if(legacy)assert.deepEqual({...context,limitations:legacy.limitations},legacy,'Only repeated warnings may change under the new selection policy');
   if(!legacy){
    // Synthetic recorded-source controls, not claims of voluntary model recollection.
    const items=['selection-memory-earlier','selection-memory-query'].map((id,i)=>({id,actorId:agent.id,tick:i?200:1,platform:'reddit',parentId:null,community:agent.community,text:'Synthetic retained commute concern.',position:0,media:'none',votes:0,likes:0,hidden:false,sharedFrom:null}));
    const events=items.map(item=>({...item,type:'post',minute:item.tick*15,targetId:null,position:0,previousPosition:null,causes:[],source:'social-model',sourceEventId:null,location:null,citizenEvidence:{factLinks:[{citizenId:agent.id,scenarioFingerprint:grounding.scenarioFingerprint,factId:'fact-mode'}],issueSubjectId:null}}));
    assert.equal(groundedMemoryBonus({...world,tick:200,items,events} as any,agent.id,items[1].id,items[0].id),1,'Retrieval must use the same compact projection without changing its relevance score');
   }
  }
  const publicResult=prepared.publicGrounding();parseHybridPublicGrounding(publicResult);assert.ok(publicResult.limitations.some(s=>s.startsWith('citizen-selection-v2:')));assert.doesNotMatch(JSON.stringify(publicResult),/homeProxy|workplaceProxy|PRIVATE_SELECTION|PRIVATE_JOB|"profiles"|distanceMetres/);assert.doesNotMatch(JSON.stringify(publicSociety(world)),/homeProxy|workplaceProxy|"jobTitle"|distanceMetres/);
  assert.equal(enriched.population.sampleSize,10000);assert.deepEqual(enriched.population.validation,old.population.validation);for(const p of grounding.profiles)assert.equal(p.citizen.weight,impact.dataset.records.find(c=>c.id===p.citizen.id)!.weight);
  const forged=structuredClone(enriched);forged.citizenSelection.bindingFingerprint='0'.repeat(64);assert.throws(()=>createSociety({...forged,intelligence:CITIZEN_DECLARATION_POLICY,citizenGrounding:grounding}));
 }
 assert.equal(canonical(impact.run.summary),before);assert.equal(canonical(impact.dataset),datasetBefore);assert.equal(calls,2);
});
