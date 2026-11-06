import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareHybridExplore,type HybridExploreDependencies} from '../../server/interventions/explore.ts';
import {getNetworkCatalog} from '../../server/mrt-service.ts';
import {calculateCitizenImpact,type PrivateCitizenImpact} from '../../server/citizen-grounding/api.ts';
import {canonical,digest} from '../../experiments/validation.ts';
import type {HybridExploreWire} from '../../interventions/explore-contract.ts';
import {parseHybridExploreOptions} from '../../interventions/explore-contract.ts';
import {buildHybridContext} from '../../interventions/hybrid.ts';
import {buildHandoffContext,deterministicHandoff,acceptHandoff,encodeHandoff,handoffIntervention} from '../../interventions/handoff.ts';
import {createHybridBinding,createHandoffBinding,validateHybridBinding,parseHybridBinding,type HybridBindingV2} from '../../interventions/binding.ts';
import {handlePublicExplore} from '../../server/society/public-service.ts';
import {mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// The actual recorded user geometry is public scenario input, not a simulated provider response.
const question='What if Singapore built a hypothetical cross-town MRT connection along my drawn alignment, using only the station dots as stops, between Choa Chu Kang and Sengkang? How might modelled commutes, work schedules, practical concerns and coordination change for the same synthetic citizens over the following days?';
const routeId='9059d987-34ed-4109-b779-bfde7f7102ce',pointIds=['26aead68-1756-4f5e-8d69-3fb63003476c','5bff4bf4-4bbe-4381-a9a5-9cf27a25f322','ed33beba-debe-4acc-8106-4959c78f29a9'];
const coordinates=[{lat:1.38517205,lon:103.744369},{lat:1.39916,lon:103.819839},{lat:1.39152768,lon:103.895416}];
const catalog=getNetworkCatalog('2026-10-27');
function wire(q=question):HybridExploreWire&{hybrid:HybridExploreWire['hybrid']&{interpretationPolicy:'hybrid-map-v2'}}{
 return {version:2,attemptId:'synthetic-handoff-'+crypto.randomUUID(),request:{version:1,question:q,geometryRevision:12,geometry:{version:1,scenarioId:'0d7a423f-20e6-40b7-807b-ba6ecb5dcad5',features:[{kind:'line',id:routeId,label:'Line 1',coordinates:structuredClone(coordinates),provenance:'user-drawn'},...pointIds.map((id,i)=>({kind:'point' as const,id,label:['Choa Chu Kang (NS4)','Station 2','Sengkang (NE16)'][i],coordinate:{...coordinates[i]},role:'station' as const,provenance:'user-drawn' as const}))]}},hybrid:{version:1,policy:'hybrid-citizen-explore-v1',interpretationPolicy:'hybrid-map-v2',serviceDate:'2026-10-27',anchors:{[pointIds[0]]:'NS4',[pointIds[2]]:'NE16'},selection:{routeId,pointIds:[...pointIds]},timings:{runSeconds:600,dwellSeconds:30,waitingTimeSeconds:150,transferWalkSeconds:180,geometryConfirmed:true,assumptionsConfirmed:true}}};
}
let impact:Promise<PrivateCitizenImpact>|undefined,impactKey:string|undefined;
const dependencies=(fetcher?:typeof fetch):HybridExploreDependencies=>({enabled:true,key:'offline-handoff-fixture',catalog:()=>catalog,fetcher,impact:r=>{const key=canonical(r);if(impactKey)assert.equal(key,impactKey);impactKey=key;return impact??=calculateCitizenImpact(r);}});
const providerReply=(body:any,value:unknown)=>Response.json({id:'synthetic-handoff-v2',model:body.model,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200,cost:0.0001,completion_tokens_details:{reasoning_tokens:0}}});

test('the exact previously submitted confirmed NS4–middle–NE16 scenario reaches MRT interpretation without inference',async()=>{
 let calls=0;const input=wire(),before=canonical(input),prepared=await prepareHybridExplore(input,dependencies(async()=>{calls++;throw Error('No interpretation call is needed');}));
 assert.equal(prepared.kind,'ready');assert.equal(calls,0);assert.equal(canonical(input),before);
 if(prepared.kind!=='ready')return;const summary=prepared.publicGrounding();assert.equal(summary.interpretation.calls,0);assert.equal(summary.impact.summary.representedAgents,10000);
 assert.equal((summary as unknown as {interpretationPolicy:string}).interpretationPolicy,'hybrid-map-v2');
});

test('natural MRT line, route, connection and rail-link descriptions require the same confirmed geometry',async()=>{
 for(const q of ['What if a new MRT line follows my alignment?','What if this proposed MRT route links these areas?','What if an MRT connection between these areas follows these station dots?','What if a new rail link follows my plotted alignment?']){
  const prepared=await prepareHybridExplore(wire(q),dependencies(async()=>{throw Error('Unexpected semantic inference');}));assert.equal(prepared.kind,'ready',q);
 }
});

test('v2 semantic context discloses verified selection, catalogue and bounded capabilities without private profiles',async()=>{
 let calls=0;const input=wire('How might this plotted proposal help?');const prepared=await prepareHybridExplore(input,dependencies(async(_url,init)=>{
  calls++;const body=JSON.parse(String(init?.body)),c=JSON.parse(body.messages[1].content);assert.equal(body.response_format.json_schema.name,'hybrid_intervention_intent_v2');
  assert.equal(c.version,'hybrid-map-v2');assert.equal(c.question,input.request.question);assert.equal(c.revision,12);
  assert.equal(c.confirmedSelection.routeId,routeId);assert.deepEqual(c.confirmedSelection.orderedStationPointIds,pointIds);assert.equal(c.confirmedSelection.serverValidated,true);
  assert.deepEqual(c.confirmedSelection.anchors,input.hybrid.anchors);assert.deepEqual(c.confirmedSelection.timings,input.hybrid.timings);assert.equal(c.catalogueIdentity.serviceDate,catalog.serviceDate);assert.match(c.catalogueIdentity.fingerprint,/^[a-f0-9]{64}$/);
  assert.ok(c.capabilities.supported.includes('synthetic-citizen-commute'));assert.ok(c.capabilities.unsupported.includes('real-behaviour-forecast'));assert.ok(c.capabilities.unsupported.includes('engineering-feasibility'));
  assert.doesNotMatch(JSON.stringify(c),/"profiles"|"jobTitle"|"employment"|"personalities"|"memories"|"messages"/);
  return providerReply(body,{version:c.version,bindingKey:c.bindingKey,type:'clarify',routeId:null,stationPointIds:[],sitePointIds:[],clarification:'Synthetic clarification remains a legitimate terminal outcome.'});
 }));assert.equal(calls,1);assert.equal(prepared.kind,'hybrid-map-review');if(prepared.kind==='hybrid-map-review')assert.equal(prepared.analysisMode,'clarification');
});

test('changed order, incomplete stops and unconfirmed timing fail safely before inference or impact',async()=>{
 for(const mutate of [(v:ReturnType<typeof wire>)=>v.hybrid.selection!.pointIds.reverse(),(v:ReturnType<typeof wire>)=>v.hybrid.selection!.pointIds.splice(1,1),(v:ReturnType<typeof wire>)=>v.hybrid.timings.assumptionsConfirmed=false,(v:ReturnType<typeof wire>)=>v.hybrid.timings.geometryConfirmed=false]){
  const input=wire();mutate(input);let calls=0,calculations=0;const prepared=await prepareHybridExplore(input,{...dependencies(),fetcher:async()=>{calls++;throw Error('Unexpected inference');},impact:async()=>{calculations++;throw Error('Unexpected calculation');}});
  assert.equal(prepared.kind,'hybrid-map-review');assert.equal(calls,0);assert.equal(calculations,0);
 }
});

test('contradictory facilities, disconnected station markers and unsupported forecasts never run MRT inference',async()=>{
 for(const [q,markerOnly]of [['What if a new polyclinic is built here?',true],['What if a new MRT station is built here?',true],['What if a new MRT line and a new polyclinic are built here?',false],['Forecast the guaranteed impact of this new MRT line.',false]] as const){
  const input=wire(q);if(markerOnly){input.request.geometry.features=[{kind:'point',id:'site',label:'Independent site',role:'unassigned',coordinate:{lat:1.39916,lon:103.819839},provenance:'user-drawn'}];input.hybrid.anchors={};delete input.hybrid.selection;}
  let calls=0;const prepared=await prepareHybridExplore(input,{...dependencies(),fetcher:async()=>{calls++;throw Error('Unexpected interpretation');},impact:async()=>{calls++;throw Error('Unexpected MRT impact');}});
  assert.equal(prepared.kind,'hybrid-map-review');assert.equal(calls,0);if(prepared.kind!=='hybrid-map-review')continue;
  if(markerOnly){assert.equal(prepared.analysisMode,'location-context');assert.equal(prepared.interventionType,q.includes('polyclinic')?'new_polyclinic':'new_mrt_station');assert.ok(prepared.locations?.length);assert.doesNotMatch(JSON.stringify(prepared),/baselineMinutes|minutesSaved/);}
  else assert.equal(prepared.analysisMode,'clarification');
 }
});

test('invalid anchors and invented IDs fail before provider dispatch and cannot be browser-validated',async()=>{
 for(const mutate of [(v:ReturnType<typeof wire>)=>v.hybrid.anchors[pointIds[0]]='INVENTED', (v:ReturnType<typeof wire>)=>(v.request.geometry.features[1] as any).coordinate.lat+=0.001,(v:ReturnType<typeof wire>)=>(v.hybrid as any).serverValidated=true]){
  const input=wire();mutate(input);let calls=0;await assert.rejects(prepareHybridExplore(input,{...dependencies(),fetcher:async()=>{calls++;throw Error('Unexpected inference');}}));assert.equal(calls,0);
 }
 const input=wire();input.hybrid.selection!.routeId='invented';assert.equal((await prepareHybridExplore(input,dependencies())).kind,'hybrid-map-review');
 assert.throws(()=>parseHybridExploreOptions({...wire().hybrid,interpretationPolicy:'unapproved-version'}));
});

test('confirmed selection may resolve multiple routes, but contradictory named route remains a clarification',async()=>{
 const input=wire();input.request.geometry.features.push({kind:'line',id:'other-route',label:'Other alignment',coordinates:[{lat:1.31,lon:103.76},{lat:1.32,lon:103.77}],provenance:'user-drawn'});
 assert.equal((await prepareHybridExplore(input,dependencies())).kind,'ready');
 input.request.question='What if a new MRT line follows Other alignment?';const result=await prepareHybridExplore(input,dependencies());assert.equal(result.kind,'hybrid-map-review');if(result.kind==='hybrid-map-review')assert.equal(result.analysisMode,'clarification');
});

async function handoff(input=wire()){
 const base=buildHybridContext(input.request.question,input.request.geometry,input.request.geometryRevision,input.hybrid.anchors,catalog);
 return buildHandoffContext(base,input.hybrid);
}
test('v2 interpretation proof accepts exact Anthropic identity and rejects crossed serving attribution',async()=>{
 const context=await handoff(),original=deterministicHandoff(context)!;
 const result=acceptHandoff(original.wire,context);
 const legacy=await createHybridBinding(context.base,result.intent,handoffIntervention(context,result),'b'.repeat(64));
 const generation={requestedModel:'claude-haiku-5-5',servingModel:'claude-haiku-5-5',servingProvider:'Anthropic',identityVerification:'completion',generationId:'msg-fixture',requestCanonicalHash:'a'.repeat(64),outputCanonicalHash:await digest('',result.wire)} as const;
 const proof={context:context.snapshot,result:result.wire,source:'model' as const,generation};
 const binding=await createHandoffBinding(legacy,proof);
 assert.equal((await validateHybridBinding(binding) as HybridBindingV2).interpretation.generation?.servingProvider,'Anthropic');
 await assert.rejects(createHandoffBinding(legacy,{...proof,generation:{...generation,servingProvider:'DigitalOcean'}}));
});
test('question, geometry revision, stop order, timing and catalogue are immutable v2 context identity',async()=>{
 const first=await handoff();
 for(const mutate of [(v:ReturnType<typeof wire>)=>v.request.geometryRevision++,(v:ReturnType<typeof wire>)=>v.request.question+=' Illustrative only.',(v:ReturnType<typeof wire>)=>v.hybrid.timings.runSeconds++, (v:ReturnType<typeof wire>)=>{(v.request.geometry.features[2] as any).coordinate.lat+=0.00001;}]){
  const input=wire();mutate(input);const changed=await handoff(input);assert.notEqual(first.snapshot.bindingKey,changed.snapshot.bindingKey);
  const original=deterministicHandoff(first)!;assert.throws(()=>acceptHandoff(original.wire,changed),/STALE/);
 }
 const input=wire();input.hybrid.selection!.pointIds.reverse();const changed=await handoff(input);assert.equal(changed.snapshot.confirmedSelection,null);assert.equal(deterministicHandoff(changed)?.intent.type,'clarify');
});

test('accepted model intent cannot invent, reorder, omit or override confirmed geometry',async()=>{
 const input=wire('How could this plotted proposal work?'),context=await handoff(input),valid={version:'hybrid-map-v2',bindingKey:context.snapshot.bindingKey,type:'new_mrt_line',routeId,stationPointIds:[...pointIds],sitePointIds:[],clarification:null};
 assert.equal(acceptHandoff(valid,context).intent.classificationSource,'model-inference');
 for(const patch of [{routeId:'invented'},{stationPointIds:[pointIds[0],pointIds[2]]},{stationPointIds:[...pointIds].reverse()},{stationPointIds:['invented',...pointIds]},{runSeconds:1},{sitePointIds:['site']},{sitePointIds:''},{sitePointIds:{length:0}}])assert.throws(()=>acceptHandoff({...valid,...patch},context));
 assert.throws(()=>acceptHandoff(valid,structuredClone(context)),/SERVER_CONTEXT/);
});

test('v2 binding verifies both frozen legacy identity and new interpretation proof without external IO',async()=>{
 const context=await handoff(),result=deterministicHandoff(context)!;
 const legacy=await createHybridBinding(context.base,result.intent,handoffIntervention(context,result),'b'.repeat(64)),before=canonical(legacy);
 const binding=await createHandoffBinding(legacy,{context:context.snapshot,result:result.wire,source:'deterministic',generation:null});
 assert.equal(binding.version,2);assert.equal(binding.interpretation.legacyFingerprint,legacy.fingerprint);assert.equal(canonical(legacy),before);assert.equal((await validateHybridBinding(legacy)).version,1);
 assert.deepEqual(await validateHybridBinding(structuredClone(binding)),binding);assert.ok(Object.isFrozen(binding.interpretation.context.confirmedSelection));
 for(const mutate of [(v:HybridBindingV2)=>v.interpretation.context.confirmedSelection!.timings.runSeconds++, (v:HybridBindingV2)=>v.interpretation.context.capabilities.unsupported.pop(), (v:HybridBindingV2)=>v.interpretation.result.stationPointIds.reverse(), (v:HybridBindingV2)=>v.interpretation.context.geometryRevision++, (v:HybridBindingV2)=>v.interpretation.legacyFingerprint='0'.repeat(64)]){
  const changed=structuredClone(binding);mutate(changed);const {fingerprint:_,...body}=changed;changed.fingerprint=await digest('',body);await assert.rejects(validateHybridBinding(changed));
 }
 const nested=structuredClone(binding);nested.interpretation.context.bindingKey='0'.repeat(64);nested.interpretation.result.bindingKey='0'.repeat(64);const {fingerprint:_,...body}=nested;nested.fingerprint=await digest('',body);assert.doesNotThrow(()=>parseHybridBinding(nested));await assert.rejects(validateHybridBinding(nested),/CONTEXT_DIGEST/);
 assert.ok(Buffer.byteLength(encodeHandoff(context))<24000);
});

test('ordinary v2 Explore preserves a synthetic model clarification and rejects repeat submission without downstream dispatch',async()=>{
 const input=wire('Could the plotted proposal be useful?'),root=mkdtempSync(join(tmpdir(),'handoff-clarification-'));let calls=0,searches=0,calculations=0;
 const fetcher:typeof fetch=async(_url,init)=>{calls++;const body=JSON.parse(String(init?.body)),context=JSON.parse(body.messages[1].content);assert.equal(body.response_format.json_schema.name,'hybrid_intervention_intent_v2');assert.equal(context.confirmedSelection.serverValidated,true);return providerReply(body,{version:context.version,bindingKey:context.bindingKey,type:'clarify',routeId:null,stationPointIds:[],sitePointIds:[],clarification:'Synthetic clarification: the intervention purpose remains ambiguous.'});};
 const dynamic={enabled:true,key:'offline-only',fetcher,groundingKey:'offline-only',groundingFetcher:async()=>{searches++;throw Error('No retrieval after clarification');}},social={directory:join(root,'sessions'),storeDirectory:join(root,'accepted'),hybrid:{key:'offline-only',catalog:()=>catalog,impact:async()=>{calculations++;throw Error('No calculation after clarification');}}};
 const request=()=>new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 const response=await handlePublicExplore(request(),dynamic,social),body=await response.json();assert.equal(response.status,200);assert.equal(body.kind,'hybrid-map-review');assert.equal(body.interventionType,'clarify');assert.match(body.message,/Synthetic clarification/);assert.equal(calls,1);assert.equal(searches,0);assert.equal(calculations,0);assert.ok(!body.society&&!body.grounding);assert.equal(readdirSync(social.storeDirectory).filter(n=>n.endsWith('.json')).length,0);
 assert.equal((await handlePublicExplore(request(),dynamic,social)).status,409);assert.equal(calls,1);assert.equal(searches,0);
});

test('negated and merely existing MRT mentions do not imply a proposed rail calculation',async()=>{
 const negative=await prepareHybridExplore(wire('Do not build a new MRT line here.'),dependencies(async()=>{throw Error('No interpretation for explicit contradiction');}));assert.equal(negative.kind,'hybrid-map-review');
 let calls=0;const input=wire('Are existing MRT lines reliable?');const result=await prepareHybridExplore(input,dependencies(async(_url,init)=>{calls++;const body=JSON.parse(String(init?.body)),c=JSON.parse(body.messages[1].content);return providerReply(body,{version:c.version,bindingKey:c.bindingKey,type:'clarify',routeId:null,stationPointIds:[],sitePointIds:[],clarification:'Specify a hypothetical intervention.'});}));assert.equal(result.kind,'hybrid-map-review');assert.equal(calls,1);
});

test('negated future construction and network removal cannot become new-line calculations',async()=>{
 for(const question of ['What if a new MRT line is not built?','What if we remove this MRT line?','What if this MRT line closes?','What if we do not add a new MRT connection?']){
  let calls=0;const result=await prepareHybridExplore(wire(question),{...dependencies(),fetcher:async()=>{calls++;throw Error('Unexpected inference');},impact:async()=>{calls++;throw Error('Unexpected new-line calculation');}});assert.equal(result.kind,'hybrid-map-review');assert.equal(calls,0);
 }
});

test('v2 factory and adapter require original server context and current interpretation binding',async()=>{
 const input=wire(),context=await handoff(input),result=deterministicHandoff(context)!;
 await assert.rejects(buildHandoffContext(structuredClone(context.base),input.hybrid));
 await assert.rejects(buildHandoffContext(context.base,{...input.hybrid,serviceDate:'2026-10-28'}),/OPTIONS_ORIGIN/);
 assert.throws(()=>handoffIntervention(context,{...result,wire:{...result.wire,bindingKey:'0'.repeat(64)}}),/HANDOFF_WIRE/);
});

test('new-train wording is not a new-line proposal and short explicit route IDs override neither selection nor validation',async()=>{
 const existing=await handoff(wire('What if the existing MRT line gets new trains?'));assert.equal(deterministicHandoff(existing),null);
 const input=wire('What if a new MRT line follows #B?');input.request.geometry.features[0].id='A';input.hybrid.selection!.routeId='A';input.request.geometry.features.push({kind:'line',id:'B',label:'B',coordinates:[{lat:1.31,lon:103.76},{lat:1.32,lon:103.77}],provenance:'user-drawn'});
 assert.equal(deterministicHandoff(await handoff(input))?.intent.type,'clarify');
 input.request.geometry.features.at(-1)!.id='new';input.request.question='What if a new MRT line follows my plotted alignment?';assert.equal(deterministicHandoff(await handoff(input))?.intent.type,'new_mrt_line');
});
