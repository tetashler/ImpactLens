import {parsePublicExplore} from '../../question-simulation/public-session.ts';
import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {canonical} from '../../experiments/validation.ts';
import {handlePublicExplore,handlePublicSocial} from '../../server/society/public-service.ts';
import {readSocialSession} from '../../server/society/service.ts';
import {stopCoordinators} from '../../server/society/coordinator.ts';
import {getNetworkCatalog} from '../../server/mrt-service.ts';
import {calculateCitizenImpact,type PrivateCitizenImpact} from '../../server/citizen-grounding/api.ts';
import type {CitizenImpactRequest} from '../../citizen-grounding/public-contract.ts';
import {plannerFixture} from './helpers/planner-fixture.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';
import {replayHybrid,replayHybridFrom} from '../../society/hybrid.ts';
import {writeMaterialCheckpoint,readMaterialCheckpoint} from '../../server/society/checkpoint.ts';
import {readSwarmJournal} from '../../server/society/swarm-journal.ts';
import {findStorageBinding,storageBundle} from '../../server/society/storage-admission.ts';

const question='What if a new MRT line connects these plotted stops in Bukit Batok? How might nearby residents, workers and service providers discuss access, coordinate schedules and revisit practical concerns over the following days?';
const sourceText='OFFLINE FIXTURE: Land Transport Authority is mentioned in Singapore rail planning guidance. This excerpt does not verify this proposed line or any social outcome.';
const initialSentinel='PRIVATE_HYBRID_INITIAL_STATEMENT';
const catalog=getNetworkCatalog('2026-10-27');
const actualStart=catalog.stations.find(s=>s.id==='NS2')!,actualEnd=catalog.stations.find(s=>s.id==='NS3')!;
assert.ok(actualStart&&actualEnd,'The fixture requires actual feed stations NS2 and NS3');
const position=(s:{lat:number;lon:number})=>({lat:s.lat,lon:s.lon});
const middle={lat:(actualStart.lat+actualEnd.lat)/2,lon:(actualStart.lon+actualEnd.lon)/2};
const point=(id:string,coordinate=middle)=>({kind:'point' as const,id,label:id,coordinate:{...coordinate},role:'unassigned' as const,provenance:'user-drawn' as const});
const geometry=()=>({version:1 as const,scenarioId:'hybrid-public-line',features:[
 {kind:'line' as const,id:'route',label:'Hypothetical plotted line',coordinates:[position(actualStart),{...middle},position(actualEnd)],provenance:'user-drawn' as const},
 point('end',position(actualEnd)),point('middle'),point('start',position(actualStart)),point('independent',{lat:1.38,lon:103.8}),
]});
const hybrid=()=>({version:1 as const,policy:'hybrid-citizen-explore-v1' as const,serviceDate:catalog.serviceDate,anchors:{start:'NS2',end:'NS3'},selection:{routeId:'route',pointIds:['start','middle','end']},timings:{geometryConfirmed:true,assumptionsConfirmed:true,runSeconds:180,dwellSeconds:25,waitingTimeSeconds:120,transferWalkSeconds:150}});
const request=(wire:unknown)=>new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(wire)});
let actualImpact:Promise<PrivateCitizenImpact>|undefined,actualImpactRequest:string|undefined;
function sharedActualImpact(input:CitizenImpactRequest){
 const identity=canonical(input);if(actualImpactRequest!==undefined)assert.equal(identity,actualImpactRequest);
 actualImpactRequest=identity;return actualImpact??=calculateCitizenImpact(input);
}
function setup(options:{legacy?:boolean;malformedPersonality?:boolean;handoff?:boolean;currentMenu?:boolean;polyclinic?:boolean}={}){
 const scenarioQuestion=options.polyclinic?'What if a polyclinic was built at this location?':question;
 const f=plannerFixture();f.request={...f.request,question:scenarioQuestion,geometry:options.polyclinic?{version:1,scenarioId:'plotted-polyclinic',features:[point('site')]}:geometry(),geometryRevision:7};
 f.draft.description='A hypothetical plotted local MRT line';f.draft.trigger='A hypothetical rail connection is considered';f.draft.domains=['Local rail access'];
 f.draft.agents.forEach((a,i)=>{a.label=['Residents','Workers','Transit staff','Community representatives'][i];a.category=a.label;a.context='A broad fictional stakeholder role.';a.goals=['Clarify practical access and schedules'];a.incentives=['Maintain accessible transport'];a.concerns=['Unresolved schedules and access'];a.knowledgeLimits=['No observed effects of this hypothetical line'];});
 f.draft.ontology.entities[0].name='Land Transport Authority';f.draft.ontology.entities[0].support=null;f.draft.ontology.relationships[0].support=null;
 if(options.polyclinic){f.draft.description='A hypothetical local polyclinic';f.draft.trigger='A plotted polyclinic proposal is considered';f.draft.domains=['Community healthcare discussion'];f.draft.spatialRequirement='no-supported-quantitative-model';f.draft.agents.forEach((a,i)=>{a.label=['Residents','Healthcare staff','Local businesses','Community representatives'][i];a.category=a.label;a.context='A broad fictional role discussing a proposed polyclinic.';a.goals=['Discuss access and practical concerns'];a.incentives=['Understand the proposal'];a.concerns=['Unknown staffing and service arrangements'];a.knowledgeLimits=['No healthcare outcomes or service capacity are calculated'];});f.draft.ontology.entities[0].name='Proposed polyclinic';}
 const wire={version:options.legacy?1:2,attemptId:'hybrid-public-'+crypto.randomUUID(),request:f.request,...(!options.legacy?{hybrid:{...hybrid(),...(options.handoff?{interpretationPolicy:'hybrid-map-v2' as const}:{})}}:{})};
 if(options.polyclinic){(wire.hybrid as any).anchors={};delete (wire.hybrid as any).selection;}
 const stages:string[]=[],contexts:any[]=[],directory=mkdtempSync(join(tmpdir(),'hybrid-public-explore-'));let searches=0,socialCalls=0,impactCalls=0;
 const dynamic=mockDynamicProvider(f,(body,reply)=>{
  const name=body.response_format.json_schema.name,c=JSON.parse(body.messages[1].content);stages.push(name);contexts.push(c);
  (reply.usage as any).completion_tokens_details={reasoning_tokens:0};
  const value=JSON.parse(reply.choices[0].message.content);
  if(name==='dynamic_entities_v3'){const source=c.retrievalCandidates.sources[0];value.ontology.entityTypes[0].entities[0].support={sourceId:source.id,passageId:source.passages[0].id};}
  if(name==='stakeholder_turn_v1')value.statement=initialSentinel+' This fictional response keeps practical access conditions unresolved.';
  reply.choices[0].message.content=JSON.stringify(value);
 });
 const fetcher:typeof fetch=async(url,init)=>{
  const body=JSON.parse(String(init?.body)),name=body.response_format.json_schema.name;
  if(name==='social_decision_v1'){socialCalls++;throw Error('No social-model dispatch is admitted in this bounded genesis test');}
  if(name!=='citizen_personalities_v1')return dynamic.fetcher(url,init);
  stages.push(name);const c=JSON.parse(body.messages[1].content);contexts.push(c);
  assert.equal(stages.filter(s=>s==='stakeholder_turn_v1').length,8,'Personality must wait for all eight accepted initial turns');
  assert.equal(String(url),'https://openrouter.ai/api/v1/chat/completions');assert.deepEqual(body.provider,{only:['digitalocean'],allow_fallbacks:false,require_parameters:true});assert.deepEqual(body.reasoning,{effort:'none',exclude:true});assert.equal(body.max_tokens,6000);
  assert.equal(c.slots.length,35);assert.ok(c.slots.every((s:any,i:number)=>s.slotId==='profile-'+(i+1)));
  const profiles=c.slots.map((s:any,i:number)=>({slotId:s.slotId,style:'exploratory',c:i%5,i:Math.floor(i/5)%5,d:Math.floor(i/25)%5,k:4,u:4}));
  if(options.malformedPersonality)profiles.pop();
  return Response.json({id:'gen-hybrid-personality-fixture',model:body.model,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({profiles})}}],usage:{prompt_tokens:1800,completion_tokens:2200,total_tokens:4000,cost:0.003,completion_tokens_details:{reasoning_tokens:0}}});
 };
 const dynamicDependencies={enabled:true,key:'offline-fixture',fetcher,groundingKey:'offline-fixture',groundingFetcher:async(_url:unknown,init?:RequestInit)=>{searches++;const body=JSON.parse(String(init?.body));assert.ok(body.query.includes(scenarioQuestion));assert.equal(body.max_results,5);return Response.json({results:[{title:'OFFLINE rail planning guidance',url:searches===1?'https://www.lta.gov.sg/':`https://www.lta.gov.sg/offline-facet-${searches}`,content:sourceText,published_date:'2025-01-01'}],usage:{credits:1}});}};
 const socialDependencies={...(!options.currentMenu?{citizenMenuPolicy:'conversation-menu-v4' as const}:{}),enabled:true,key:'offline-fixture',fetcher,directory:join(directory,'sessions'),storeDirectory:join(directory,'accepted'),admission:{maxCalls:0},hybrid:{key:'offline-fixture',catalog:()=>catalog,impact:async(input:CitizenImpactRequest)=>{impactCalls++;return sharedActualImpact(input);}}};
 const accepted=()=>{const files=readdirSync(socialDependencies.storeDirectory).filter(f=>f.endsWith('.json'));assert.equal(files.length,1);return JSON.parse(readFileSync(join(socialDependencies.storeDirectory,files[0]),'utf8'));};
 return {wire,dynamicDependencies,socialDependencies,stages,contexts,accepted,expectedSearches:options.polyclinic?5:7,counts:()=>({searches,socialCalls,impactCalls})};
}
function privateFieldsAbsent(value:unknown){
 const encoded=JSON.stringify(value);for(const marker of [initialSentinel,'"profiles"','"traits"','"communicationStyle"','"uncertaintyTolerance"','"fieldProvenance"','"jobTitle"','"homeProxy"','"seedDigest"','gen-hybrid-personality-fixture'])assert.ok(!encoded.includes(marker),'Public summary leaked '+marker);
}

test('ordinary version-two Explore preserves the actual plotted MRT binding through eight initial turns and citizen genesis',async()=>{
 const f=setup(),original=structuredClone(f.wire.request);
 try{
  const response=await handlePublicExplore(request(f.wire),f.dynamicDependencies,f.socialDependencies),body=await response.json();
  assert.equal(response.status,200);assert.equal(body.kind,'summary-execution');assert.equal(body.initialActions.length,8);
  assert.deepEqual(f.stages,['dynamic_entities_v3','dynamic_relationships_v2',...Array(8).fill('stakeholder_turn_v1'),'citizen_personalities_v1']);assert.deepEqual(f.counts(),{searches:f.expectedSearches,socialCalls:0,impactCalls:1});
  assert.equal(body.accounting.planningCalls,2);assert.equal(body.accounting.actionCalls,8);assert.equal(body.society.totalSteps,320);assert.equal(body.society.tick,0);assert.equal(body.society.swarm.activeAgents,50);assert.equal(body.society.swarm.llmCapableAgents,35);assert.equal(body.society.swarm.maxCalls,350);
  assert.equal(body.grounding.personalities.modelGenerated,35);assert.equal(body.grounding.personalities.calls,1);assert.equal(body.grounding.interpretation.calls,0);
  const commuteNodes=body.graph.nodes.filter((n:any)=>n.properties.recordType==='citizen-commute-aggregate');assert.equal(commuteNodes.length,1,'Ordinary Explore must connect its authoritative commute aggregate to the graph');
  for(const key of ['representedAgents','representedPopulation','comparableWeight','meanMinutesSaved'])assert.equal(commuteNodes[0].properties[key],body.grounding.impact.summary[key],'Graph/Report commute quantity mismatch');
  const stored=f.accepted();assert.equal(stored.execution.run.events.length,8);assert.ok(stored.execution.inference.records.every((r:any)=>r.status==='accepted'));
  assert.deepEqual(stored.execution.plan.request,original);assert.deepEqual(stored.execution.plan.draft.userConditions,[question]);assert.equal(stored.execution.run.inputSnapshot.question,question);assert.equal(stored.execution.plan.draft.ontology.entities[0].support.quote,sourceText);
  const state=await readSocialSession(body.session.id,f.socialDependencies),grounding=state.world.genesis.input.citizenGrounding!;
  assert.equal(grounding.version,2);assert.equal(grounding.executionBundle,'hybrid-citizen-explore-v1');if(grounding.version!==2)assert.fail('Explicit V2 input is required');
  assert.equal(grounding.hybridBinding.question,question);assert.deepEqual(grounding.hybridBinding.geometry,original.geometry);assert.equal(grounding.hybridBinding.revision,7);assert.deepEqual(grounding.hybridBinding.anchors,{start:'NS2',end:'NS3'});assert.deepEqual(grounding.hybridBinding.intent.stationPointIds,['start','middle','end']);
  assert.equal(grounding.hybridBinding.scenarioFingerprint,grounding.scenarioFingerprint);assert.equal(body.grounding.impact.scenarioFingerprint,grounding.scenarioFingerprint);assert.equal(grounding.personalities.generation.mode,'real-provider');assert.equal(grounding.profiles.length,50);assert.ok(Object.isFrozen(grounding.hybridBinding));
  f.wire.request.question='Caller changed this later';assert.equal(grounding.hybridBinding.question,question);privateFieldsAbsent(body);
  const before=[...f.stages],passive=await handlePublicSocial(new Request(`http://localhost/api/social-simulate?runId=${body.runId}&token=${body.session.token}`),f.socialDependencies);assert.equal(passive.status,200);privateFieldsAbsent(await passive.json());assert.deepEqual(f.stages,before);
 }finally{await stopCoordinators(join(f.socialDependencies.storeDirectory,'jobs'));}
});

test('ordinary v2 handoff Explore freezes validated selection through citizen genesis and exact replay',async()=>{
 const f=setup({handoff:true});try{
  const response=await handlePublicExplore(request(f.wire),f.dynamicDependencies,f.socialDependencies),body=await response.json();assert.equal(response.status,200);assert.equal(body.society.tick,0);assert.equal(body.grounding.interpretationPolicy,'hybrid-map-v2');assert.equal(body.grounding.interpretation.calls,0);assert.equal(body.grounding.personalities.modelGenerated,35);privateFieldsAbsent(body);
  const state=await readSocialSession(body.session.id,f.socialDependencies),grounding=state.world.genesis.input.citizenGrounding!;
  assert.equal(grounding.version,2);if(grounding.version!==2)assert.fail('Expected grounded input');const binding=grounding.hybridBinding;assert.equal(binding.version,2);if(binding.version!==2)assert.fail('Expected v2 handoff binding');
  assert.equal(binding.interpretation.context.confirmedSelection?.serverValidated,true);assert.equal(binding.interpretation.context.geometryRevision,7);assert.deepEqual(binding.interpretation.context.confirmedSelection?.orderedStationPointIds,['start','middle','end']);
  const world=state.world;assert.equal(canonical(replayHybrid(world.genesis.input,world.tick,world.hybrid!.records,world.hybrid!.pending)),canonical(world));
  const journal=readSwarmJournal(join(f.socialDependencies.directory,body.session.id+'.jsonl'));await writeMaterialCheckpoint({id:state.sessionId,runId:world.genesis.input.runId,revision:state.revision,world,journalHead:journal.journalHead,journalRecords:journal.journalRecords,reservation:null},f.socialDependencies.directory);
  const checkpoint=readMaterialCheckpoint(f.socialDependencies.directory,journal);assert.ok(checkpoint);assert.equal(canonical(replayHybridFrom(checkpoint!,world.tick,world.hybrid!.records,world.hybrid!.pending)),canonical(world));
  const stages=[...f.stages],duplicate=await handlePublicExplore(request(f.wire),f.dynamicDependencies,f.socialDependencies);assert.equal(duplicate.status,409);assert.equal((await duplicate.json()).code,'DUPLICATE_ATTEMPT');assert.deepEqual(f.stages,stages);
 }finally{await stopCoordinators(join(f.socialDependencies.storeDirectory,'jobs'));}
});

test('historical version-one Explore retains its original planning and society path without personalities',async()=>{
 const f=setup({legacy:true});try{
  const response=await handlePublicExplore(request(f.wire),f.dynamicDependencies,f.socialDependencies),body=await response.json();assert.equal(response.status,200);assert.equal(body.initialActions.length,8);
  assert.deepEqual(f.stages,['dynamic_entities_v3','dynamic_relationships_v2',...Array(8).fill('stakeholder_turn_v1')]);assert.deepEqual(f.counts(),{searches:f.expectedSearches,socialCalls:0,impactCalls:0});assert.ok(!Object.hasOwn(body,'grounding'));
  const state=await readSocialSession(body.session.id,f.socialDependencies);assert.equal(state.world.genesis.version,5);assert.ok(!state.world.genesis.input.citizenGrounding);assert.equal(state.world.genesis.input.intelligence?.context,'conversation-menu-v3');privateFieldsAbsent(body);
 }finally{await stopCoordinators(join(f.socialDependencies.storeDirectory,'jobs'));}
});

test('invalid plotted geometry stops ordinary hybrid Explore before any retrieval or provider dispatch',async()=>{
 const f=setup();(f.wire.request.geometry.features[0] as any).coordinates[0].lat=90;
 const response=await handlePublicExplore(request(f.wire),f.dynamicDependencies,f.socialDependencies);assert.ok(response.status>=400);assert.deepEqual(f.stages,[]);assert.deepEqual(f.counts(),{searches:0,socialCalls:0,impactCalls:0});
});

test('unconfirmed, incomplete or differently ordered MRT selection cannot begin retrieval, impact or provider execution',async()=>{
 for(const selection of [undefined,{routeId:'route',pointIds:['start','end']},{routeId:'route',pointIds:['end','middle','start']},{routeId:'other-route',pointIds:['start','middle','end']},{routeId:'route',pointIds:['start','middle','end','independent']}]){
  const f=setup();if(selection===undefined)delete (f.wire as any).hybrid.selection;else (f.wire as any).hybrid.selection=selection;
  const response=await handlePublicExplore(request(f.wire),f.dynamicDependencies,f.socialDependencies),body=await response.json();
  assert.equal(response.status,200);assert.equal(body.kind,'hybrid-map-review');assert.equal(body.analysisMode,'clarification');
  assert.deepEqual(f.stages,[]);assert.deepEqual(f.counts(),{searches:0,socialCalls:0,impactCalls:0});
 }
});

for(const [question,type]of [['Add a community centre here','new_community_centre'],['Add an MRT station here','new_mrt_station']])test(type+' produces a bounded review without quantitative or paid execution',async()=>{
 const f=setup();f.wire.request.question=question;f.wire.request.geometry={version:1,scenarioId:'independent-site',features:[point('site')]};(f.wire as any).hybrid.anchors={};delete (f.wire as any).hybrid.selection;
 const response=await handlePublicExplore(request(f.wire),f.dynamicDependencies,f.socialDependencies),body=await response.json();assert.equal(response.status,200);assert.equal(body.kind,'hybrid-map-review');assert.equal(body.interventionType,type);assert.equal(body.question,question);assert.deepEqual(f.stages,[]);assert.deepEqual(f.counts(),{searches:0,socialCalls:0,impactCalls:0});assert.ok(!body.society&&!body.grounding);privateFieldsAbsent(body);
});

test('plotted polyclinic continues into fictional stakeholder discussion without citizen or healthcare calculations',async()=>{
 const f=setup({polyclinic:true,handoff:true,currentMenu:true}),original=structuredClone(f.wire.request);
 try{
  const response=await handlePublicExplore(request(f.wire),f.dynamicDependencies,f.socialDependencies),body=await response.json();
  assert.equal(response.status,200);assert.equal(body.kind,'summary-execution');assert.equal(body.status,'completed');assert.equal(body.initialActions.length,8);assert.ok(body.session);assert.ok(body.society);
  assert.deepEqual(f.stages,['dynamic_entities_v3','dynamic_relationships_v2',...Array(8).fill('stakeholder_turn_v1')]);assert.deepEqual(f.counts(),{searches:f.expectedSearches,socialCalls:0,impactCalls:0});
  assert.equal(body.attemptId,f.wire.attemptId);assert.equal(body.question,original.question);assert.deepEqual(body.request,{question:original.question,geometry:original.geometry,geometryRevision:original.geometryRevision});
  assert.equal(body.locationContext.analysisMode,'location-context');assert.equal(body.locationContext.interventionType,'new_polyclinic');assert.equal(body.locationContext.question,original.question);assert.equal(body.locationContext.geometryRevision,7);assert.deepEqual(body.locationContext.locations.map((l:any)=>l.pointId),['site']);
  assert.match(body.limitations[0],/fictional.*discussion/i);assert.match(body.limitations[0],/location context/i);assert.match(body.limitations[0],/healthcare|wait times|capacity/i);assert.match(body.limitations[0],/not citizen-grounded/i);
  assert.ok(!Object.hasOwn(body,'grounding'));assert.ok(!body.graph.nodes.some((n:any)=>n.properties.recordType==='citizen-commute-aggregate'));assert.equal(body.society.swarm.activeAgents,50);assert.equal(body.job.admittedCalls,0);
  const stored=f.accepted();assert.deepEqual(stored.execution.plan.request,original);assert.deepEqual(stored.execution.plan.draft.userConditions,[original.question]);assert.deepEqual(stored.publicRun.locationContext,body.locationContext);assert.deepEqual(stored.publicRun.limitations,body.limitations);
  const world=(await readSocialSession(body.session.id,f.socialDependencies)).world;assert.ok(!world.genesis.input.citizenGrounding);assert.ok(!world.genesis.input.citizenSelection);assert.equal(world.genesis.input.question,original.question);privateFieldsAbsent(body);
  const before=[...f.stages],passive=await handlePublicSocial(new Request(`http://localhost/api/social-simulate?runId=${body.runId}&token=${body.session.token}`),f.socialDependencies),retained=await passive.json();assert.equal(passive.status,200);assert.deepEqual(retained.locationContext,body.locationContext);assert.deepEqual(retained.limitations,body.limitations);privateFieldsAbsent(retained);assert.deepEqual(f.stages,before);
  const duplicate=await handlePublicExplore(request(f.wire),f.dynamicDependencies,f.socialDependencies);assert.equal(duplicate.status,409);assert.equal((await duplicate.json()).code,'DUPLICATE_ATTEMPT');assert.deepEqual(f.stages,before);assert.deepEqual(f.counts(),{searches:f.expectedSearches,socialCalls:0,impactCalls:0});
 }finally{await stopCoordinators(join(f.socialDependencies.storeDirectory,'jobs'));}
});

test('plotted polyclinic preserves the configured fifty-agent cohort and thirty-call admission',async()=>{
 const f=setup({polyclinic:true,handoff:true}),social={...f.socialDependencies,admission:{maxCalls:30,deadlineMs:1}};
 try{
  const response=await handlePublicExplore(request(f.wire),f.dynamicDependencies,social),body=await response.json();assert.equal(response.status,200);assert.equal(body.kind,'summary-execution');assert.equal(body.society.swarm.activeAgents,50);assert.equal(body.job.admittedCalls,30);
  const state=await readSocialSession(body.session.id,social);assert.equal(state.admission.maxCalls,30);assert.equal(state.admission.calls,0);assert.deepEqual(f.counts(),{searches:f.expectedSearches,socialCalls:0,impactCalls:0});
 }finally{await stopCoordinators(join(f.socialDependencies.storeDirectory,'jobs'));}
});

test('polyclinic without a plotted point remains a terminal map review',async()=>{
 const f=setup({polyclinic:true,handoff:true});f.wire.request.geometry.features=[];
 const response=await handlePublicExplore(request(f.wire),f.dynamicDependencies,f.socialDependencies),body=await response.json();assert.equal(response.status,200);assert.equal(body.kind,'hybrid-map-review');assert.deepEqual(f.stages,[]);assert.deepEqual(f.counts(),{searches:0,socialCalls:0,impactCalls:0});
});

test('bounded storage admission retains plotted polyclinic discussion context',async()=>{
 const f=setup({polyclinic:true,handoff:true,currentMenu:true}),base=mkdtempSync(join(tmpdir(),'polyclinic-storage-base-')),bundle=storageBundle(base);
 const {directory:_sessions,storeDirectory:_archives,...dependencies}=f.socialDependencies,social={...dependencies,storageBase:base,admission:{maxCalls:30,deadlineMs:1}};
 try{
  const response=await handlePublicExplore(request(f.wire),f.dynamicDependencies,social),body=await response.json();assert.equal(response.status,200);const accepted=parsePublicExplore(body);assert.equal(accepted.kind,'summary-execution');assert.equal(accepted.storage?.disposition,'active');assert.equal(accepted.locationContext?.interventionType,'new_polyclinic');assert.equal(accepted.society?.swarm?.activeAgents,50);assert.equal(accepted.job?.admittedCalls,30);
  const binding=findStorageBinding(accepted.runId,base);assert.equal(binding?.binding?.sessionId,accepted.session?.id);assert.equal(binding?.claim.sessionId,accepted.session?.id);
  const archives=readdirSync(bundle.archives).filter(name=>name.endsWith('.json'));assert.equal(archives.length,1);const stored=JSON.parse(readFileSync(join(bundle.archives,archives[0]),'utf8'));assert.deepEqual(stored.execution.plan.request,f.wire.request);assert.deepEqual(stored.publicRun.locationContext,accepted.locationContext);
  const state=await readSocialSession(accepted.session!.id,{...social,directory:bundle.sessions});assert.equal(state.admission.maxCalls,30);assert.equal(state.admission.calls,0);assert.ok(!state.world.genesis.input.citizenGrounding);assert.ok(!state.world.genesis.input.citizenSelection);assert.ok(!accepted.grounding);assert.ok(!accepted.graph.nodes.some(node=>node.properties.recordType==='citizen-commute-aggregate'));privateFieldsAbsent(accepted);
  const before=[...f.stages],passive=await handlePublicSocial(new Request(`http://localhost/api/social-simulate?runId=${accepted.runId}&token=${accepted.session!.token}`),social);assert.equal(passive.status,200);const retained=parsePublicExplore(await passive.json());assert.deepEqual(retained.locationContext,accepted.locationContext);assert.deepEqual(retained.limitations,accepted.limitations);assert.equal(retained.society?.swarm?.activeAgents,50);assert.equal(retained.job?.admittedCalls,30);privateFieldsAbsent(retained);assert.deepEqual(f.stages,before);assert.deepEqual(f.counts(),{searches:f.expectedSearches,socialCalls:0,impactCalls:0});assert.ok(!f.stages.includes('citizen_personalities_v1'));
 }finally{await stopCoordinators(bundle.jobs);}
});

test('malformed personality output preserves all eight accepted initial records without a society or retry',async()=>{
 const f=setup({malformedPersonality:true});try{
  const response=await handlePublicExplore(request(f.wire),f.dynamicDependencies,f.socialDependencies),body=await response.json();assert.equal(response.status,200);assert.equal(body.kind,'summary-execution');assert.equal(body.initialActions.length,8);assert.equal(body.society,null);assert.equal(body.session,null);assert.ok(!body.grounding);
  assert.deepEqual(f.stages,['dynamic_entities_v3','dynamic_relationships_v2',...Array(8).fill('stakeholder_turn_v1'),'citizen_personalities_v1']);assert.deepEqual(f.counts(),{searches:f.expectedSearches,socialCalls:0,impactCalls:1});
  const stored=f.accepted();assert.equal(stored.execution.run.events.length,8);assert.equal(stored.execution.run.status,'completed');assert.ok(stored.execution.inference.records.every((r:any)=>r.status==='accepted'));assert.equal(readdirSync(f.socialDependencies.directory).filter(n=>n.endsWith('.jsonl')).length,0);privateFieldsAbsent(body);
  const before=[...f.stages],passive=await handlePublicSocial(new Request(`http://localhost/api/social-simulate?runId=${body.runId}&token=${stored.token}`),f.socialDependencies);assert.equal(passive.status,200);assert.deepEqual(f.stages,before);
  const duplicate=await handlePublicExplore(request(f.wire),f.dynamicDependencies,f.socialDependencies);assert.equal(duplicate.status,409);assert.deepEqual(f.stages,before);
 }finally{await stopCoordinators(join(f.socialDependencies.storeDirectory,'jobs'));}
});

// Existing cases pin the frozen v4 contract; current server-owned initialization is tested separately.
test('current ordinary citizen Explore freezes v7 without accepting a browser policy or personality roster',async()=>{
 const f=setup({handoff:true,currentMenu:true});try{
  const response=await handlePublicExplore(request(f.wire),f.dynamicDependencies,f.socialDependencies),body=await response.json();assert.equal(response.status,200);
  const state=await readSocialSession(body.session.id,f.socialDependencies);assert.equal(state.world.genesis.input.intelligence?.context,'conversation-menu-v7');assert.equal(state.world.genesis.input.intelligence?.behaviour,'citizen-menu-v4');
  assert.equal(state.world.genesis.input.citizenGrounding?.policy,'citizen-grounded-v1');assert.equal(body.grounding.personalities.modelGenerated,35);assert.equal(body.society.issueDeclarations.policy,'issue-declaration-v1');assert.equal(body.society.issueDeclarations.selectedStatements,0);assert.equal(parsePublicExplore(body).society?.issueDeclarations?.policy,'issue-declaration-v1');privateFieldsAbsent(body);
  assert.equal(canonical(replayHybrid(state.world.genesis.input,state.world.tick,state.world.hybrid!.records,state.world.hybrid!.pending)),canonical(state.world));
 }finally{await stopCoordinators(join(f.socialDependencies.storeDirectory,'jobs'));}
});
