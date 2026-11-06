import '../../../scripts/testing/offline-network.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareHybridExplore,type HybridExploreDependencies} from '../../server/interventions/explore.ts';
import {createSociety,type SocietyWorld} from '../../society/engine.ts';
import {controlledIds} from '../../society/hybrid.ts';
import {multiDaySwarmPolicy,swarmHybrid} from '../../society/swarm.ts';
import {QUALITY_POLICY,CITIZEN_POLICY} from '../../society/intelligence.ts';
import {populationForActive} from '../../server/society/population.ts';
import {getCitizenDataset} from '../../server/citizen-grounding/data.ts';
import {calculateCitizenImpact} from '../../server/citizen-grounding/api.ts';
import {baselineFixture} from '../../../prototype/mrt/tests/scenario-fixtures.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {phase4eCommunication} from '../../../scripts/testing/phase4e-fixture.ts';
import {transportReference} from './citizen-transport-fixture.ts';
import type {NetworkCatalog} from '../../map-contract.ts';
import type {HybridExploreWire} from '../../interventions/explore-contract.ts';

const base=baselineFixture();
const catalog:NetworkCatalog={serviceDate:'2026-10-27',quarantinedTrips:0,stations:[...base.stations.values()].map(({id,name,lat,lon,lines})=>({id,name,lat,lon,lines})),lines:[{id:'NS',name:'Fixture NS',color:'#f00'},{id:'BP',name:'Fixture BP',color:'#00f'}],connections:[{from:'NS4',to:'X',line:'NS'},{from:'NS4',to:'Y',line:'BP'}]};
function wire(question='What if a new MRT line connects these plotted station dots?'):HybridExploreWire {
 return {version:2,attemptId:'isolated-hybrid-explore',request:{version:1,question,geometryRevision:4,geometry:{version:1,scenarioId:'fixture-mrt',features:[
  {kind:'line',id:'route',label:'Fixture route',coordinates:[{lat:1.38,lon:103.74},{lat:1.39,lon:103.77},{lat:1.4,lon:103.8}],provenance:'user-drawn'},
  ...[{id:'start',lat:1.38,lon:103.74},{id:'middle',lat:1.39,lon:103.77},{id:'end',lat:1.4,lon:103.8}].map(({id,lat,lon})=>({kind:'point' as const,id,label:id,coordinate:{lat,lon},role:'station' as const,provenance:'user-drawn' as const})),
 ]}},hybrid:{version:1,policy:'hybrid-citizen-explore-v1',serviceDate:'2026-10-27',anchors:{start:'NS4',end:'X'},selection:{routeId:'route',pointIds:['start','middle','end']},timings:{runSeconds:30,dwellSeconds:5,waitingTimeSeconds:30,transferWalkSeconds:10,geometryConfirmed:true,assumptionsConfirmed:true}}};
}
let cachedPreview:SocietyWorld|undefined;
function preview():SocietyWorld {
 if(cachedPreview)return cachedPreview;
 const draft=worldFixtures()[3].draft,swarm=multiDaySwarmPolicy(50,350,320);
 return cachedPreview=createSociety({runId:'hybrid-server-fixture',question:wire().request.question,seed:'hybrid-server-fixture',population:populationForActive(50),roles:draft.agents,jurisdictions:draft.jurisdictions,sharePolicy:'source-position-v1',socialPolicy:'memory-aware-v1',intelligence:QUALITY_POLICY,communication:phase4eCommunication(),swarm,hybrid:swarmHybrid(swarm),config:{agents:50,steps:320},acceptedActions:Array.from({length:8},(_,i)=>({id:'accepted-'+i,roleId:draft.agents[i%4].id,statement:'PRIVATE_INITIAL_STATEMENT',position:'conditional'}))});
}
function dependencies(fetcher?:typeof fetch):HybridExploreDependencies {
 const selected=new Set(preview().agents.map(a=>a.id)),original=getCitizenDataset(),records=original.records.filter(r=>selected.has(r.id));
 const dataset={...original,records,manifest:{...original.manifest,recordCount:records.length,representedPopulation:records.reduce((n,r)=>n+r.weight,0)}};
 return {key:'offline-test-only',enabled:true,catalog:()=>catalog,fetcher,impact:input=>calculateCitizenImpact(input,{dataset:()=>dataset,baseline:()=>base,demand:()=>transportReference,access:()=>({sourceHash:'e'.repeat(64),points:{}})})};
}
function response(value:unknown){return Response.json({id:'fixture-hybrid-generation',model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200,cost:0.0001,completion_tokens_details:{reasoning_tokens:0}}});}
function personalityFetcher(onRequest?:(body:any)=>void):typeof fetch {
 return async(url,init)=>{
  assert.equal(String(url),'https://openrouter.ai/api/v1/chat/completions');const body=JSON.parse(String(init?.body));onRequest?.(body);assert.equal(body.response_format.json_schema.name,'citizen_personalities_v1');assert.equal(body.max_tokens,6000);
  const context=JSON.parse(body.messages[1].content);assert.equal(context.slots.length,35);assert.deepEqual(Object.keys(context).sort(),['diversityToken','policy','slots','version']);
  return response({profiles:context.slots.map((slot:any,i:number)=>({...slot,style:'direct',c:i%5,i:Math.floor(i/5)%5,d:Math.floor(i/25)%5,k:0,u:0}))});
 };
}

test('trusted hybrid Explore orchestration exists before the public handler can initialize citizens',async()=>{
 const api=await import('../../server/interventions/explore.ts').catch(()=>null);
 assert.ok(api?.prepareHybridExplore,'a server-owned hybrid Explore preparer is required');
});

test('actual plotted MRT impact and one provider roster become a frozen V2 citizen genesis',async()=>{
 let calls=0;const input=wire(),prepared=await prepareHybridExplore(input,dependencies(personalityFetcher(()=>calls++)));
 assert.equal(prepared.kind,'ready');if(prepared.kind!=='ready')return;
 assert.equal(calls,0);assert.equal(prepared.interpretationRecords.length,0);assert.equal(prepared.publicGrounding().personalities.calls,0);
 const before=JSON.stringify(input),world=preview(),pending=prepared.citizenGrounding(world),again=prepared.citizenGrounding(world);assert.equal(pending,again);
 const grounding=await pending;assert.equal(calls,1);assert.equal(grounding.version,2);if(grounding.version!==2)return;
 assert.equal(grounding.hybridBinding.question,input.request.question);assert.deepEqual(grounding.hybridBinding.geometry,input.request.geometry);assert.equal(grounding.hybridBinding.scenarioFingerprint,grounding.scenarioFingerprint);assert.equal(grounding.personalities.generation.mode,'real-provider');assert.equal(grounding.personalities.runId,world.genesis.input.runId);assert.deepEqual(grounding.profiles.map(p=>p.citizen.id),world.agents.map(a=>a.id));assert.equal(controlledIds(world).length,35);
 const accepted=createSociety({...world.genesis.input,citizenGrounding:grounding,intelligence:CITIZEN_POLICY});assert.equal(accepted.genesis.version,6);assert.equal(accepted.genesis.input.intelligence?.context,'conversation-menu-v4');assert.ok(Object.isFrozen(grounding.hybridBinding));assert.equal(JSON.stringify(input),before);
 const summary=prepared.publicGrounding();assert.deepEqual(summary.personalities,{capable:35,background:15,modelGenerated:35,calls:1,inputTokens:100,outputTokens:100,costUsd:0.0001});assert.equal(summary.impact.scenarioFingerprint,grounding.scenarioFingerprint);assert.equal(summary.interpretation.calls,0);assert.ok(Object.isFrozen(summary));assert.doesNotMatch(JSON.stringify(summary),/PRIVATE_INITIAL_STATEMENT|communicationStyle|homeProxy|workplaceProxy|jobTitle|fieldProvenance|"profiles"/);
});

test('explicit facilities and unresolved station markers return bounded review without inference or MRT calculation',async()=>{
 for(const question of ['What if a new polyclinic is built at middle?','What if a new MRT station is built at middle?']){
  let calls=0;const prepared=await prepareHybridExplore(wire(question),{key:'',catalog:()=>catalog,fetcher:async()=>{calls++;throw Error('UNEXPECTED_INFERENCE');},impact:async()=>{calls++;throw Error('UNEXPECTED_MRT_CALCULATION');}});
  assert.equal(prepared.kind,'hybrid-map-review');if(prepared.kind!=='hybrid-map-review')continue;assert.equal(prepared.question,question);assert.equal(prepared.analysisMode,'location-context');assert.equal(calls,0);assert.doesNotMatch(JSON.stringify(prepared),/baselineMinutes|minutesSaved|personalities/);assert.ok(prepared.locations?.length);assert.ok(prepared.locations!.every(l=>l.referenceYear===2019&&/^[a-f0-9]{64}$/.test(l.sourceSha256)));assert.deepEqual(prepared.locations!.map(l=>l.pointId),['middle']);
 }
});

test('semantic ambiguity makes one fixed bounded interpretation request attached to the original context',async()=>{
 const input=wire('How might this proposed connection work?');let calls=0,originalQuestion='';
 const deps=dependencies(async(url,init)=>{calls++;assert.equal(String(url),'https://openrouter.ai/api/v1/chat/completions');const body=JSON.parse(String(init?.body));assert.equal(body.response_format.json_schema.name,'hybrid_intervention_intent_v1');assert.equal(body.max_tokens,1500);assert.deepEqual(body.provider,{only:['digitalocean'],allow_fallbacks:false,require_parameters:true});const c=JSON.parse(body.messages[1].content);originalQuestion=c.question;assert.equal(c.revision,4);assert.deepEqual(c.explicitAnchors,input.hybrid.anchors);return response({version:c.version,bindingKey:c.bindingKey,type:'new_mrt_line',routeId:'route',stationPointIds:['start','middle','end'],sitePointIds:[],clarification:null});});
 const prepared=await prepareHybridExplore(input,deps);assert.equal(prepared.kind,'ready');assert.equal(calls,1);assert.equal(originalQuestion,input.request.question);if(prepared.kind==='ready'){assert.equal(prepared.interpretationRecords.length,1);assert.equal(prepared.interpretationRecords[0].status,'accepted');assert.deepEqual(prepared.publicGrounding().interpretation,{calls:1,inputTokens:100,outputTokens:100,costUsd:0.0001});}
});

test('invalid interpretation cannot fall back to a different geometry or start MRT or personalities',async()=>{
 for(const mutation of [(v:any)=>v.bindingKey='0'.repeat(64),(v:any)=>v.coordinates=[1,2],(v:any)=>v.stationPointIds=['start','end']]){
  let calls=0,impact=0;const deps=dependencies(async(_url,init)=>{calls++;const c=JSON.parse(JSON.parse(String(init?.body)).messages[1].content),v={version:c.version,bindingKey:c.bindingKey,type:'new_mrt_line',routeId:'route',stationPointIds:['start','middle','end'],sitePointIds:[],clarification:null};mutation(v);return response(v);});deps.impact=async()=>{impact++;throw Error('UNEXPECTED_IMPACT');};
  await assert.rejects(prepareHybridExplore(wire('How might this proposed connection work?'),deps));assert.equal(calls,1);assert.equal(impact,0);
 }
});

test('missing excluded or reordered confirmation cannot calculate a different MRT station sequence',async()=>{
 for(const selection of [undefined,{routeId:'route',pointIds:['start','end']},{routeId:'route',pointIds:['end','middle','start']},{routeId:'other',pointIds:['start','middle','end']}]){
  const input=wire();if(selection===undefined)delete input.hybrid.selection;else input.hybrid.selection=selection;let paid=0,impact=0;
  const prepared=await prepareHybridExplore(input,{key:'',catalog:()=>catalog,fetcher:async()=>{paid++;throw Error('UNEXPECTED_PROVIDER');},impact:async()=>{impact++;throw Error('UNEXPECTED_CALCULATION');}});
  assert.equal(prepared.kind,'hybrid-map-review');if(prepared.kind==='hybrid-map-review'){assert.equal(prepared.analysisMode,'clarification');assert.equal(prepared.bindingKey.length,64);assert.match(prepared.message,/confirm|order|selection/i);}assert.equal(impact,0);assert.equal(paid,0);
 }
});

test('incomplete initial actions and disabled or missing provider authority cannot initialize a roster',async()=>{
 let calls=0;const input=wire(),deps=dependencies(personalityFetcher(()=>calls++)),prepared=await prepareHybridExplore(input,deps);assert.equal(prepared.kind,'ready');if(prepared.kind!=='ready')return;
 const incomplete=structuredClone(preview());incomplete.genesis.input.acceptedActions.pop();await assert.rejects(prepared.citizenGrounding(incomplete),/INITIAL_RUN_INCOMPLETE/);await assert.rejects(prepared.citizenGrounding(incomplete));assert.throws(()=>prepared.citizenGrounding(preview()),/INITIALIZATION_IDENTITY/);assert.equal(calls,0);
 for(const patch of [{enabled:false},{key:''}]){const p=await prepareHybridExplore(input,{...deps,...patch});if(p.kind==='ready')await assert.rejects(p.citizenGrounding(preview()));}assert.equal(calls,0);
 await assert.rejects(prepareHybridExplore(wire('How might this proposed connection work?'),{...deps,enabled:false}),/PROVIDER_DISABLED/);assert.equal(calls,0);
});

test('a failed persona promise stays failed and cannot regenerate on the next initialization request',async()=>{
 let calls=0;const prepared=await prepareHybridExplore(wire(),dependencies(async()=>{calls++;return response({profiles:[]});}));if(prepared.kind!=='ready')throw Error('Expected MRT preparer');
 const first=prepared.citizenGrounding(preview());await assert.rejects(first);assert.equal(prepared.citizenGrounding(preview()),first);await assert.rejects(prepared.citizenGrounding(preview()));assert.equal(calls,1);assert.equal(prepared.publicGrounding().personalities.modelGenerated,0);
});

test('v2 model interpretation provenance survives real provider serialization and frozen citizen initialization',async()=>{
 const input=wire('How might this plotted proposal work?');input.hybrid.interpretationPolicy='hybrid-map-v2';let semantics=0,rosters=0;
 const fetcher:typeof fetch=async(url,init)=>{const body=JSON.parse(String(init?.body));
  if(body.response_format.json_schema.name==='citizen_personalities_v1')return personalityFetcher(()=>rosters++)(url,init);
  semantics++;assert.equal(body.response_format.json_schema.name,'hybrid_intervention_intent_v2');assert.deepEqual(body.provider,{only:['digitalocean'],allow_fallbacks:false,require_parameters:true});assert.deepEqual(body.reasoning,{effort:'none',exclude:true});
  const c=JSON.parse(body.messages[1].content);assert.equal(c.confirmedSelection.serverValidated,true);assert.equal(c.confirmedSelection.timings.runSeconds,30);assert.ok(c.capabilities.unsupported.includes('actual-individual-journeys'));
  return response({version:c.version,bindingKey:c.bindingKey,type:'new_mrt_line',routeId:'route',stationPointIds:['start','middle','end'],sitePointIds:[],clarification:null});
 };
 const prepared=await prepareHybridExplore(input,dependencies(fetcher));assert.equal(prepared.kind,'ready');if(prepared.kind!=='ready')return;
 const world=createSociety({...preview().genesis.input,question:input.request.question});const grounded=await prepared.citizenGrounding(world);assert.equal(semantics,1);assert.equal(rosters,1);assert.equal(grounded.version,2);if(grounded.version!==2)assert.fail('Expected frozen grounding');
 const binding=grounded.hybridBinding;assert.equal(binding.version,2);if(binding.version!==2)assert.fail('Expected handoff v2');assert.equal(binding.interpretation.source,'model');assert.equal(binding.interpretation.generation?.servingProvider,'DigitalOcean');assert.match(binding.interpretation.generation!.requestCanonicalHash,/^[a-f0-9]{64}$/);assert.match(binding.interpretation.generation!.outputCanonicalHash,/^[a-f0-9]{64}$/);
 const {validateHybridBinding}=await import('../../interventions/binding.ts');assert.deepEqual(await validateHybridBinding(structuredClone(binding)),binding);assert.equal(prepared.publicGrounding().interpretation.calls,1);assert.doesNotMatch(JSON.stringify(prepared.publicGrounding()),/requestCanonicalHash|generationId|jobTitle|profiles/);
});

test('failed inference diagnostics retain safe metadata once and exclude arbitrary model or transport text',async()=>{
 const original=console.warn,logs:unknown[][]=[];console.warn=(...values:unknown[])=>logs.push(values);
 try{
  const malformed=await prepareHybridExplore(wire(),dependencies(async()=>response({profiles:[]})));if(malformed.kind!=='ready')throw Error('Expected MRT preparer');await assert.rejects(malformed.citizenGrounding(preview()));await assert.rejects(malformed.citizenGrounding(preview()));
  assert.equal(logs.length,1);assert.equal(logs[0][0],'HYBRID_INITIALIZATION_SAFE');const entry=JSON.parse(String(logs[0][1]));assert.equal(entry.code,'AI_ACTION_SCHEMA');assert.equal(entry.records.length,1);assert.equal(entry.records[0].errorCode,'AI_ACTION_SCHEMA');assert.equal(entry.records[0].status,'failed');assert.equal(entry.records[0].requestedModel,'deepseek/deepseek-v4-flash-0731');assert.equal(entry.records[0].servingProvider,'DigitalOcean');
  const deps=dependencies();deps.personality=async()=>{throw Error('PRIVATE_PROVIDER_TRAITS_AND_PROMPT');};const unknown=await prepareHybridExplore(wire(),deps);if(unknown.kind==='ready')await assert.rejects(unknown.citizenGrounding(preview()));assert.equal(JSON.parse(String(logs[1][1])).code,'HYBRID_INITIALIZATION_FAILED');assert.doesNotMatch(JSON.stringify(logs),/PRIVATE_PROVIDER|profiles|prompt|traits/i);
  const semantic=dependencies(async()=>response({version:'hybrid-map-v1',bindingKey:'0'.repeat(64),type:'new_mrt_line',routeId:'route',stationPointIds:['start','middle','end'],sitePointIds:[],clarification:null}));await assert.rejects(prepareHybridExplore(wire('How might this proposed connection work?'),semantic));assert.equal(logs[2][0],'HYBRID_INTERPRETATION_SAFE');assert.equal(JSON.parse(String(logs[2][1])).records.length,1);
 }finally{console.warn=original;}
});

test('Claude hybrid failure diagnostics preserve registered identity and redact unknown providers',async()=>{
 const original=console.warn,logs:unknown[][]=[];console.warn=(...values:unknown[])=>logs.push(values);
 try{
  const deps=dependencies();deps.personality=async(_input,options)=>{
   options.onRecord?.({requestedModel:'claude-haiku-5-5',requestedProvider:'anthropic',servingModel:'claude-haiku-5-5',servingProvider:'Anthropic',status:'failed',errorCode:'AI_ACTION_SCHEMA',inputTokens:12,outputTokens:3,costUsd:null} as any);
   options.onRecord?.({requestedModel:'PRIVATE_MODEL',requestedProvider:'PRIVATE_PROVIDER',servingModel:'PRIVATE_MODEL',servingProvider:'PRIVATE_PROVIDER',status:'failed'} as any);
   throw Error('PRIVATE_PROVIDER_TEXT');
  };
  const prepared=await prepareHybridExplore(wire(),deps);if(prepared.kind!=='ready')throw Error('Expected MRT preparer');await assert.rejects(prepared.citizenGrounding(preview()));
  const entry=JSON.parse(String(logs[0][1]));assert.equal(entry.records[0].requestedModel,'claude-haiku-5-5');assert.equal(entry.records[0].requestedProvider,'anthropic');assert.equal(entry.records[0].servingModel,'claude-haiku-5-5');assert.equal(entry.records[0].servingProvider,'Anthropic');assert.doesNotMatch(JSON.stringify(logs),/PRIVATE_/);
 }finally{console.warn=original;}
});

test('Claude hybrid interpretation and personality initialization preserve real transport provenance',async t=>{
 const previous=process.env.AI_PROVIDER;process.env.AI_PROVIDER='anthropic';t.after(()=>{if(previous===undefined)delete process.env.AI_PROVIDER;else process.env.AI_PROVIDER=previous;});
 const input=wire('How might this plotted proposal work?');input.hybrid.interpretationPolicy='hybrid-map-v2';let semanticCalls=0,personalityCalls=0;
 const fetcher:typeof fetch=async(url,init)=>{
  assert.equal(String(url),'https://api.anthropic.com/v1/messages');assert.equal(new Headers(init?.headers).get('x-api-key'),'offline-test-only');
  const body=JSON.parse(String(init?.body));assert.equal(body.model,'claude-haiku-5-5');assert.equal(body.messages.length,1);assert.equal(body.messages[0].role,'user');assert.equal(typeof body.system,'string');assert.equal(body.provider,undefined);
  const context=JSON.parse(body.messages[0].content);let value:unknown;
  if(context.slots){personalityCalls++;assert.equal(body.max_tokens,6000);assert.equal(context.slots.length,35);value={profiles:context.slots.map((slot:any,i:number)=>({...slot,style:'direct',c:i%5,i:Math.floor(i/5)%5,d:Math.floor(i/25)%5,k:0,u:0}))};}
  else{semanticCalls++;assert.equal(body.max_tokens,1500);assert.equal(context.confirmedSelection.serverValidated,true);value={version:context.version,bindingKey:context.bindingKey,type:'new_mrt_line',routeId:'route',stationPointIds:['start','middle','end'],sitePointIds:[],clarification:null};}
  return Response.json({id:`msg-claude-hybrid-${semanticCalls}-${personalityCalls}`,type:'message',role:'assistant',model:'claude-haiku-5-5',content:[{type:'text',text:JSON.stringify(value)}],stop_reason:'end_turn',stop_sequence:null,usage:{input_tokens:100,output_tokens:100}});
 };
 const prepared=await prepareHybridExplore(input,dependencies(fetcher));assert.equal(prepared.kind,'ready');if(prepared.kind!=='ready')throw Error('Expected MRT preparer');
 const world=createSociety({...preview().genesis.input,question:input.request.question}),grounded=await prepared.citizenGrounding(world);assert.equal(semanticCalls,1);assert.equal(personalityCalls,1);assert.equal(grounded.version,2);if(grounded.version!==2)throw Error('Expected hybrid grounding');
 assert.equal(grounded.hybridBinding.version,2);if(grounded.hybridBinding.version!==2)throw Error('Expected handoff provenance');
 assert.equal(grounded.hybridBinding.interpretation.generation?.requestedModel,'claude-haiku-5-5');assert.equal(grounded.hybridBinding.interpretation.generation?.servingProvider,'Anthropic');
 assert.equal(grounded.personalities.generation.requestedModel,'claude-haiku-5-5');assert.equal(grounded.personalities.generation.servingModel,'claude-haiku-5-5');assert.equal(grounded.personalities.generation.servingProvider,'Anthropic');assert.equal(grounded.personalities.generation.costUsd,null);
 assert.equal(grounded.personalities.generation.usageBasis,'provider-reported-tokens-cost-unknown');assert.match(grounded.personalities.generation.wireRequestDigest??'',/^[a-f0-9]{64}$/);
 const {validateHybridBinding}=await import('../../interventions/binding.ts');assert.deepEqual(await validateHybridBinding(structuredClone(grounded.hybridBinding)),grounded.hybridBinding);
 const {validateCitizenGroundingAsync}=await import('../../citizen-grounding/social.ts');await validateCitizenGroundingAsync(structuredClone(grounded),world.genesis.input.population,world.agents.map(a=>a.id),controlledIds(world));
 assert.deepEqual(prepared.publicGrounding().interpretation,{calls:1,inputTokens:100,outputTokens:100,costUsd:null});assert.equal(prepared.publicGrounding().personalities.modelGenerated,35);assert.equal(prepared.publicGrounding().personalities.costUsd,null);
});
