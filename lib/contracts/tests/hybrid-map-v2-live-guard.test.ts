import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,relative,sep} from 'node:path';
import {spawnSync} from 'node:child_process';

// Every child uses only new temporary dummy files and a Response-returning transport.
// The real guard directory, real task identity and existing paid ledgers are never opened.
const setup=`
await import('./scripts/testing/offline-network.mjs');
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
const g=await import('./scripts/testing/hybrid-map-v2-live-guard.mjs');
const {readHistoricalScopeManifest}=await import('./scripts/testing/phase4e2-historical-scope.ts');
const {buildRetrievalQuery}=await import('./lib/server/evidence/retrieval-query.ts');
const sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>JSON.stringify(value&&typeof value==='object'?Array.isArray(value)?value.map(v=>JSON.parse(canonical(v))):Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonical(value[k]))])):value);
const directory=process.env.IMPACTLENS_HYBRID_MAP_V2_LIVE_DIRECTORY;
const identityPath=process.env.IMPACTLENS_HYBRID_MAP_V2_IDENTITY,gatePath=process.env.IMPACTLENS_HYBRID_MAP_V2_OFFLINE_GATE;
const identity=JSON.parse(readFileSync(identityPath,'utf8')),geometry=JSON.parse(identity.expectedGeometryKey),question=identity.question;
const gate=JSON.parse(readFileSync(gatePath,'utf8'));gate.codeFingerprint=g.currentFingerprint();gate.identityHash=sha(readFileSync(identityPath));gate.datasetPinsHash=sha(canonical(identity.datasetFiles));gate.protectedHashDigest=sha(canonical(identity.protectedFiles));
const approvedFile='f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json';
const replayRow=file=>({file,replayExact:true,roundTripExact:true,checkpointTailExact:null,archiveUnchanged:true,journalUnchanged:true});
const rows=Array.from({length:20},(_,i)=>replayRow((i+1).toString(16).padStart(64,'0')+'.json'));
const historical={version:3,codeFingerprint:gate.codeFingerprint,snapshotHash:'a'.repeat(64),scope:{version:1,manifestHash:readHistoricalScopeManifest().manifestHash},mandatory:{status:'PASS',expected:20,passed:20,failures:[],historical:rows.slice(0,10),swarm:rows.slice(10)},inventory:{status:'COMPLETE_WITH_CLASSIFIED_UNRESOLVED',qualifying:20,classified:[{file:approvedFile,classification:'pre-final-mocked-development-artifact',qualification:'nonqualifying-for-mandatory-historical-replay',replayStatus:'unresolved-SOCIAL_STALE',hashesVerified:true,sourcePolicyRecoverable:false,recordIndex:0,tick:1}],unresolved:1,entries:[...rows.map(({file})=>({file,coverage:'mandatory-strict-replay'})),{file:approvedFile,coverage:'classified-unresolved'}]},priorFilesUnchanged:7,providerCalls:0,networkAttempts:0};
const readiness={version:2,taskId:g.TASK_ID,codeFingerprint:gate.codeFingerprint,identityHash:gate.identityHash,status:'PASS',providerCalls:0,networkAttempts:0};
const saveGate=()=>writeFileSync(gatePath,JSON.stringify(gate));
const saveHistorical=()=>{const bytes=JSON.stringify(historical);writeFileSync(gate.historicalReportPath,bytes);gate.historicalReportHash=sha(bytes);saveGate();};
const saveReadiness=()=>{const bytes=JSON.stringify(readiness);writeFileSync(gate.readinessReportPath,bytes);gate.readinessReportHash=sha(bytes);saveGate();};saveHistorical();saveReadiness();
const slots=()=>Array.from({length:35},(_,i)=>({slotId:'profile-'+(i+1)}));
const context=(name,index=0)=>name==='citizen_personalities_v1'?{version:1,policy:'citizen-personality-v1',slots:slots(),diversityToken:index.toString(16).padStart(64,'0')}:name==='stakeholder_turn_v1'?{turnIndex:index,input:{question}}:name==='social_decision_v1'?{question,id:'decision-'+index,policy:'conversation-menu-v4',tick:Math.min(320,index),actor:{id:'citizen-'+index},grounding:{citizenId:'citizen-'+index},items:[],choices:[],memories:[]}:name==='dynamic_entities_v3'?{question,spatial:{provenance:'user-drawn',features:geometry.features}}:{question,bindingKey:identity.acceptedInterpretationBinding};
const body=(name,index=0)=>({model:'deepseek/deepseek-v4-flash-0731',provider:{only:['digitalocean'],allow_fallbacks:false,require_parameters:true},reasoning:{effort:'none',exclude:true},stream:false,max_tokens:name==='social_decision_v1'?600:name==='stakeholder_turn_v1'?800:name==='hybrid_intervention_intent_v2'?1500:6000,response_format:{type:'json_schema',json_schema:{name,strict:true,schema:{type:'object',additionalProperties:false,properties:{}}}},messages:[{role:'system',content:'DUMMY_PRIVATE_PROMPT'}, {role:'user',content:JSON.stringify(context(name,index))}]});
const request=(name,index=0)=>({method:'POST',body:JSON.stringify(body(name,index))});
const valid=(usage={prompt_tokens:10,completion_tokens:10,cost:0.0001},name='dynamic_entities_v3')=>Response.json({id:'generation-'+Math.random().toString(16).slice(2),model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',usage,choices:[{finish_reason:'stop',message:{content:JSON.stringify(name==='citizen_personalities_v1'?{profiles:slots().map(({slotId})=>({slotId,style:'direct',c:1,i:1,d:1,k:1,u:1}))}:{private:'DUMMY_PRIVATE_PROVIDER_OUTPUT'})}}]});
const retrieved=()=>Response.json({results:[{title:'DUMMY_PRIVATE_SOURCE_TITLE',url:'https://www.lta.gov.sg/',content:'DUMMY_PRIVATE_RETRIEVAL'}],usage:{credits:1}});
const retrieveRequest=()=>({method:'POST',body:JSON.stringify({query:buildRetrievalQuery(question,identity.retrievalPlanningArea,'balanced-question-v1'),search_depth:'basic',max_results:5,auto_parameters:false})});
const endpoint='https://openrouter.ai/api/v1/chat/completions',tavily='https://api.tavily.com/search';
const guarded=(native=async(_url,init)=>valid(undefined,JSON.parse(init.body).response_format.json_schema.name))=>g.createGuardedFetch((url,init)=>String(url)===tavily?retrieved():native(url,init));
const bind=()=>g.bindExploreInput({question,geometry,geometryRevision:identity.expectedGeometryRevision,anchors:identity.anchors,hybrid:identity.hybrid});
const arm=async f=>{assert.equal(g.totals().attempts,0);g.armAttempt(1);bind();await f(tavily,retrieveRequest());};
const initial=async f=>{await arm(f);await f(endpoint,request('dynamic_entities_v3'));await f(endpoint,request('dynamic_relationships_v2'));for(let i=0;i<8;i++)await f(endpoint,request('stakeholder_turn_v1',i));};
const prime=async f=>{await initial(f);await f(endpoint,request('citizen_personalities_v1'));};
`;

function run(source:string,inspect?:(directory:string)=>void){
 mkdirSync('tmp',{recursive:true});const directory=mkdtempSync(join(process.cwd(),'tmp','hybrid-map-v2-guard-test-'));
 const gatePath=join(directory,'offline-gate.json'),identityPath=join(directory,'identity.json'),buildId=join(directory,'BUILD_ID');
 const pin=(name:string)=>{const path=join(directory,name);writeFileSync(path,'isolated dummy '+name);return {path:relative(process.cwd(),path).split(sep).join('/'),sha256:''};};
 const dataset=pin('dataset-dummy.json'),protectedFile=pin('protected-dummy.json');
 const geometry={version:1,scenarioId:'dummy-mrt',features:[{kind:'point',id:'station-a',label:'Dummy station',coordinate:{lat:1.35,lon:103.85},role:'station',provenance:'user-drawn'},{kind:'point',id:'station-b',label:'Dummy second station',coordinate:{lat:1.36,lon:103.86},role:'station',provenance:'user-drawn'},{kind:'line',id:'route',label:'Dummy route',coordinates:[{lat:1.35,lon:103.85},{lat:1.36,lon:103.86}],provenance:'user-drawn'}]};
 writeFileSync(buildId,'isolated-fixture-build');
 const anchors={'station-a':'NS2'},hybrid={version:1,policy:'hybrid-citizen-explore-v1',interpretationPolicy:'hybrid-map-v2',serviceDate:'2026-10-27',anchors,selection:{routeId:'route',pointIds:['station-a','station-b']},timings:{runSeconds:120.5,dwellSeconds:30,waitingTimeSeconds:120,transferWalkSeconds:90,geometryConfirmed:true,assumptionsConfirmed:true}};
 const identity={version:2,executionBundle:'hybrid-citizen-explore-v1',taskId:'hybrid-map-v2-live-20261101-01',question:'How could a hypothetical MRT link in Singapore affect fictional citizen commutes?',expectedGeometryKey:JSON.stringify(geometry),expectedGeometryRevision:3,anchors,hybrid,datasetFiles:[dataset],protectedFiles:[protectedFile]};
 // Hash the dummy files outside the child to keep every protected pin independent.
 for(const item of [dataset,protectedFile])item.sha256=createHash('sha256').update(readFileSync(item.path)).digest('hex');
 writeFileSync(identityPath,JSON.stringify(identity));writeFileSync(gatePath,JSON.stringify({version:2,taskId:identity.taskId,offlinePass:true,nodeTests:1687,tsApp:true,tsStrict:true,productionBuild:'isolated-fixture-build',desktop50:true,desktop100:true,plotDesktop1440:true,plotDesktop1920:true,benchmarks14:false,benchmarkAssessment:{version:1,decision:'not-rerun',reason:'unchanged-simulation-and-selection',sourceBaselineFingerprint:'a'.repeat(64),evidenceFiles:[dataset],unchangedSourceFiles:[protectedFile]},historical20:true,classifiedArtifact:true,privacy:true,fullAndTailReplay:true,protectedHash:true,datasetPins:true,providerCalls:0,networkAttempts:0,historicalReportPath:join(directory,'historical-replay.json'),readinessReportPath:join(directory,'readiness.json')}));
 try{const result=spawnSync(process.execPath,['--input-type=module','-e',setup+source],{cwd:process.cwd(),encoding:'utf8',timeout:120000,env:{...process.env,NODE_ENV:'test',IMPACTLENS_HYBRID_MAP_V2_LIVE_DIRECTORY:directory,IMPACTLENS_HYBRID_MAP_V2_IDENTITY:identityPath,IMPACTLENS_HYBRID_MAP_V2_OFFLINE_GATE:gatePath,IMPACTLENS_HYBRID_MAP_V2_TEST_BUILD_ID_PATH:buildId,IMPACTLENS_HYBRID_MAP_V2_LIVE_GUARD:'false'}});assert.equal(result.status,0,result.stderr||result.stdout);inspect?.(directory);}
 finally{assert.ok(resolve(directory).startsWith(resolve('tmp')+sep+'hybrid-map-v2-guard-test-'));rmSync(directory,{recursive:true,force:true});}
}

test('only one new task can arm and all distinct schema caps survive the complete allowance',()=>run(`
let calls=0;const f=guarded(async(_url,init)=>{calls++;const state=JSON.parse(readFileSync(directory+'/ledger.json','utf8'));assert.equal(state.requests.at(-1).state,'pending');assert.ok(state.requests.at(-1).reservedUsd>0);return valid(undefined,JSON.parse(init.body).response_format.json_schema.name);});
await arm(f);await f(endpoint,request('hybrid_intervention_intent_v2'));await f(endpoint,request('dynamic_entities_v3'));await assert.rejects(f(endpoint,request('dynamic_entities_v3')));await f(endpoint,request('dynamic_relationships_v2'));for(let i=0;i<8;i++)await f(endpoint,request('stakeholder_turn_v1',i));await assert.rejects(f(endpoint,request('stakeholder_turn_v1',8)));for(let i=0;i<3;i++)await f(endpoint,request('citizen_personalities_v1',i));await assert.rejects(f(endpoint,request('citizen_personalities_v1',3)));for(let i=0;i<350;i++)await f(endpoint,request('social_decision_v1',i));await assert.rejects(f(endpoint,request('social_decision_v1',350)));await assert.rejects(f(endpoint,request('hybrid_intervention_intent_v2')));assert.equal(calls,364);assert.equal(g.totals().completions,364);assert.equal(g.totals().entity,1);assert.equal(g.totals().relationship,1);assert.equal(g.totals().social,350);g.finishAttempt('partial');assert.throws(()=>g.armAttempt(1));assert.throws(()=>g.armAttempt(2));
`,directory=>assert.doesNotMatch(readFileSync(join(directory,'ledger.jsonl'),'utf8'),/DUMMY_PRIVATE|Bearer|"messages"|"profiles"|lta\.gov|hypothetical MRT link/)));

test('arming starts the ninety minute deadline and repeating Explore cannot reset it',()=>run(`
const original=Date.now,base=original();Date.now=()=>base;const f=guarded();await arm(f);assert.throws(bind);assert.throws(()=>g.armAttempt(1));Date.now=()=>base+5400000;await assert.rejects(f(endpoint,request('dynamic_entities_v3')));assert.equal(g.totals().completions,0);Date.now=original;
`));

test('each paid stage and metadata verification must fit its full bound before the absolute deadline',()=>{
 for(const [name,remaining]of [['dynamic_entities_v3',44999],['hybrid_intervention_intent_v2',29999]] as const)run(`const realNow=Date.now,base=realNow();Date.now=()=>base;let calls=0;const f=guarded(async()=>{calls++;return valid();});await arm(f);Date.now=()=>base+5400000-${remaining};await assert.rejects(f(endpoint,request('${name}')));assert.equal(calls,0);assert.equal(g.totals().completions,0);Date.now=realNow;`);
 run(`const realNow=Date.now,base=realNow();Date.now=()=>base;g.armAttempt(1);bind();let calls=0;const f=g.createGuardedFetch(async()=>{calls++;return retrieved();});Date.now=()=>base+5400000-9999;await assert.rejects(f(tavily,retrieveRequest()));assert.equal(calls,0);assert.equal(g.totals().tavilySearches,0);Date.now=realNow;`);
 run(`const realNow=Date.now,base=realNow();Date.now=()=>base;let calls=0;const f=guarded(async()=>{calls++;return Response.json({id:'generation-1',model:'deepseek/deepseek-v4-flash-0731',choices:[{finish_reason:'stop',message:{content:'{}'}}],usage:{}});});await arm(f);await f(endpoint,request('dynamic_entities_v3'));Date.now=()=>base+5400000-29999;await assert.rejects(f('https://openrouter.ai/api/v1/generation?id=generation-1'));assert.equal(calls,1);Date.now=realNow;`);
});

test('absolute task cancellation interrupts fetch or body reading and preserves the unknown reservation',()=>{
 for(const phase of ['fetch','body'])run(`const realNow=Date.now,base=realNow();Date.now=()=>base;let calls=0;const f=guarded(async(_url,init)=>{calls++;assert.ok(init.signal instanceof AbortSignal);if('${phase}'==='fetch')return new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true}));return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{"model":'));}}));});await arm(f);const realTimeout=AbortSignal.timeout,windows=[],keepAlive=setTimeout(()=>{},1000);AbortSignal.timeout=ms=>{windows.push(ms);return realTimeout(5);};try{await assert.rejects(f(endpoint,request('dynamic_entities_v3')));assert.deepEqual(windows,[5400000,45000]);assert.equal(g.totals().halted,true);assert.equal(g.totals().outstandingUsd,0.02);assert.equal(g.totals().interrupted,1);await assert.rejects(f(endpoint,request('dynamic_relationships_v2')));assert.equal(calls,1);}finally{AbortSignal.timeout=realTimeout;Date.now=realNow;clearTimeout(keepAlive);}`);
});

test('metadata full-body cancellation halts without releasing an unknown completion charge',()=>run(`
const realNow=Date.now,base=realNow();Date.now=()=>base;const f=g.createGuardedFetch(async(url,init)=>{if(url===tavily)return retrieved();if(String(url).includes('/generation?')){assert.ok(init.signal instanceof AbortSignal);return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{"data":'));}}));}return Response.json({id:'generation-1',model:'deepseek/deepseek-v4-flash-0731',usage:{},choices:[{finish_reason:'stop',message:{content:'{}'}}]});});await arm(f);await f(endpoint,request('dynamic_entities_v3'));const realTimeout=AbortSignal.timeout,windows=[],keepAlive=setTimeout(()=>{},1000);AbortSignal.timeout=ms=>{windows.push(ms);return realTimeout(5);};try{await assert.rejects(f('https://openrouter.ai/api/v1/generation?id=generation-1'));assert.deepEqual(windows,[5400000,30000]);assert.equal(g.totals().outstandingUsd,0.02);assert.equal(g.totals().halted,true);assert.equal(g.totals().interrupted,1);}finally{AbortSignal.timeout=realTimeout;Date.now=realNow;clearTimeout(keepAlive);}
`));

test('a previously aborted caller cannot reserve or dispatch another paid request',()=>run(`
let calls=0;const f=guarded(async()=>{calls++;return valid();});await arm(f);const controller=new AbortController();controller.abort();await assert.rejects(f(endpoint,{...request('dynamic_entities_v3'),signal:controller.signal}));assert.equal(calls,0);assert.equal(g.totals().completions,0);
`));

test('a server Explore binding must match exact question geometry and revision before any dispatch',()=>{
 for(const mutation of ["input.question='Another question'","input.geometry.features[0].coordinate.lat=1.36","input.geometryRevision=4","input.anchors={'station-a':'NS3'}"])run(`g.armAttempt(1);const input={question,geometry:structuredClone(geometry),geometryRevision:3,anchors:identity.anchors,hybrid:identity.hybrid};${mutation};assert.throws(()=>g.bindExploreInput(input));let calls=0;const f=guarded(async()=>{calls++;return valid();});await assert.rejects(f(tavily,retrieveRequest()));assert.equal(calls,0);assert.equal(g.totals().completions,0);`);
});

test('the complete hybrid options cannot change after the one paid task is armed',()=>{
 for(const mutation of ["input.hybrid.selection.pointIds.reverse()","input.hybrid.selection.routeId='other-route'","input.hybrid.serviceDate='2026-10-28'","input.hybrid.timings.runSeconds=120.75","input.hybrid.timings.waitingTimeSeconds=121","input.hybrid.timings.geometryConfirmed=false","input.hybrid.anchors['station-a']='NS3'","delete input.hybrid.selection","delete input.hybrid"])run(`g.armAttempt(1);const input={question,geometry,geometryRevision:3,anchors:identity.anchors,hybrid:structuredClone(identity.hybrid)};${mutation};assert.throws(()=>g.bindExploreInput(input));let calls=0;const f=g.createGuardedFetch(async()=>{calls++;return retrieved();});await assert.rejects(f(tavily,retrieveRequest()));assert.equal(calls,0);assert.equal(g.totals().tavilySearches,0);assert.equal(g.totals().completions,0);`);
});

test('a paid identity cannot omit hybrid options or contradict its duplicate anchors',()=>{
 for(const mutation of ["delete identity.hybrid","identity.hybrid.anchors={'station-a':'NS3'}","identity.hybrid.timings.runSeconds=-1","identity.hybrid.serviceDate='2026-02-30'","identity.hybrid.selection.pointIds=['station-a','station-a']"])run(`${mutation};writeFileSync(identityPath,JSON.stringify(identity));assert.throws(()=>g.armAttempt(1));assert.equal(g.totals().attempts,0);assert.equal(g.totals().completions,0);`);
});

test('planning cannot spend before retrieval or before the correct preceding schema',()=>run(`
const f=guarded();g.armAttempt(1);bind();await assert.rejects(f(endpoint,request('dynamic_entities_v3')));await f(tavily,retrieveRequest());await assert.rejects(f(endpoint,request('dynamic_relationships_v2')));await assert.rejects(f(endpoint,request('stakeholder_turn_v1')));await assert.rejects(f(endpoint,request('citizen_personalities_v1')));await assert.rejects(f(endpoint,request('social_decision_v1')));await f(endpoint,request('dynamic_entities_v3'));await f(endpoint,request('dynamic_relationships_v2'));assert.equal(g.totals().planning,2);
`));

test('stage requests reject wrong model route reasoning menu bounds and malformed context without dispatch',()=>{
 for(const mutation of ["b.model='wrong'","b.provider.allow_fallbacks=true","b.provider.require_parameters=false","b.provider.only=['other']","b.reasoning.effort='low'","b.stream=true","b.max_tokens=6001","b.response_format.json_schema.name='dynamic_entities_v2'","b.messages[1].content='not-json'","b.messages[1].content=JSON.stringify({question,spatial:{features:[]}})","b.messages[1].content=' '.repeat(24001)","b.response_format.json_schema.schema=null","b.plugins=[{id:'web'}]","b.web_search_options={search_context_size:'high'}"])
 run(`let calls=0;const f=guarded(async()=>{calls++;return valid();});await arm(f);const b=body('dynamic_entities_v3');${mutation};await assert.rejects(f(endpoint,{method:'POST',body:JSON.stringify(b)}));assert.equal(calls,0);assert.equal(g.totals().completions,0);`);
});

test('all question-bearing stages remain attached to the single original question',()=>{
 for(const name of ['hybrid_intervention_intent_v2','dynamic_entities_v3','dynamic_relationships_v2','stakeholder_turn_v1','social_decision_v1'])run(`const f=guarded();await arm(f);if(['dynamic_relationships_v2','stakeholder_turn_v1','social_decision_v1'].includes('${name}'))await f(endpoint,request('dynamic_entities_v3'));if(['stakeholder_turn_v1','social_decision_v1'].includes('${name}'))await f(endpoint,request('dynamic_relationships_v2'));if('${name}'==='social_decision_v1'){for(let i=0;i<8;i++)await f(endpoint,request('stakeholder_turn_v1',i));await f(endpoint,request('citizen_personalities_v1'));}const before=g.totals().completions,b=body('${name}'),c=JSON.parse(b.messages[1].content);${name==='stakeholder_turn_v1'?'c.input.question':'c.question'}='Different question';b.messages[1].content=JSON.stringify(c);await assert.rejects(f(endpoint,{method:'POST',body:JSON.stringify(b)}));assert.equal(g.totals().completions,before);`);
});

test('social and personality bounds apply even after every legitimate preceding stage',()=>{
 for(const mutation of ["c.policy='conversation-menu-v3'","c.grounding.citizenId='other-citizen'","c.tick=321","c.padding='x'.repeat(24000)","b.max_tokens=601"])run(`const f=guarded();await prime(f);const before=g.totals().completions,b=body('social_decision_v1'),c=JSON.parse(b.messages[1].content);${mutation};b.messages[1].content=JSON.stringify(c);await assert.rejects(f(endpoint,{method:'POST',body:JSON.stringify(b)}));assert.equal(g.totals().completions,before);`);
 for(const mutation of ["c.slots.pop()","c.slots.push({slotId:'profile-36'})","c.slots[0].citizenId='private-citizen'","c.question=question","b.max_tokens=6001"])run(`const f=guarded();await initial(f);const b=body('citizen_personalities_v1'),c=JSON.parse(b.messages[1].content);${mutation};b.messages[1].content=JSON.stringify(c);await assert.rejects(f(endpoint,{method:'POST',body:JSON.stringify(b)}));assert.equal(g.totals().personality,0);`);
});

test('malformed or oversized persona and excess reported stage output halt without retry',()=>{
 for(const content of ['{}',JSON.stringify({profiles:[],extra:'x'.repeat(6001)})])run(`const f=guarded(async(_url,init)=>JSON.parse(init.body).response_format.json_schema.name==='citizen_personalities_v1'?Response.json({model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:${JSON.stringify(content)}}}],usage:{cost:0.0001}}):valid());await initial(f);await assert.rejects(f(endpoint,request('citizen_personalities_v1')));assert.equal(g.totals().halted,true);await assert.rejects(f(endpoint,request('citizen_personalities_v1',1)));assert.equal(g.totals().personality,1);`);
 run(`const f=guarded(async()=>valid({prompt_tokens:10,completion_tokens:6001,cost:0.0001}));await arm(f);await assert.rejects(f(endpoint,request('dynamic_entities_v3')));assert.equal(g.totals().halted,true);await assert.rejects(f(endpoint,request('dynamic_relationships_v2')));`);
});

test('unknown cost and partial token telemetry retain their conservative reservation across restart',()=>run(`
const f=guarded(async()=>valid({prompt_tokens:10}));await arm(f);await f(endpoint,request('dynamic_entities_v3'));assert.equal(g.totals().outstandingUsd,0.02);assert.ok(g.totals().reservedTokens>6000);const restored=await import('./scripts/testing/hybrid-map-v2-live-guard.mjs?restore=1');assert.equal(restored.totals().outstandingUsd,0.02);assert.equal(restored.totals().completions,1);const h=restored.createGuardedFetch(async()=>valid({prompt_tokens:10,completion_tokens:10,cost:0.965}));await h(endpoint,request('dynamic_relationships_v2'));assert.equal(restored.totals().conservativeUsd,0.985);await assert.rejects(h(endpoint,request('stakeholder_turn_v1')));
`));

test('single concurrency interrupted dispatch and reported overspend halt further spending',()=>{
 run(`let calls=0,release;const f=guarded(async()=>{calls++;await new Promise(r=>release=r);return valid();});await arm(f);const pending=f(endpoint,request('dynamic_entities_v3'));await new Promise(r=>setTimeout(r,0));await assert.rejects(f(endpoint,request('hybrid_intervention_intent_v2')));release();await pending;assert.equal(calls,1);`);
 run(`let calls=0;const f=guarded(async()=>{calls++;throw Error('DUMMY_PRIVATE_TRANSPORT_ERROR');});await arm(f);await assert.rejects(f(endpoint,request('dynamic_entities_v3')));await assert.rejects(f(endpoint,request('dynamic_entities_v3')));assert.equal(calls,1);assert.equal(g.totals().halted,true);assert.equal(g.totals().outstandingUsd,0.02);`);
 for(const usage of [{prompt_tokens:40000001,cost:0.001},{prompt_tokens:10,completion_tokens:10,cost:1.01}])run(`const f=guarded(async()=>valid(${JSON.stringify(usage)}));await arm(f);await assert.rejects(f(endpoint,request('dynamic_entities_v3')));assert.equal(g.totals().halted,true);await assert.rejects(f(endpoint,request('dynamic_relationships_v2')));`);
});

test('a pending reservation survives another guard instance and acknowledgment never authorizes redispatch',()=>run(`
let release;const f=guarded(async()=>{await new Promise(r=>release=r);return valid();});await arm(f);const pending=f(endpoint,request('dynamic_entities_v3'));await new Promise(r=>setTimeout(r,0));const restored=await import('./scripts/testing/hybrid-map-v2-live-guard.mjs?pending=1');assert.equal(restored.totals().pending,1);assert.equal(restored.totals().outstandingUsd,0.02);const h=restored.createGuardedFetch(async()=>{throw Error('MUST_NOT_DISPATCH');});await assert.rejects(h(endpoint,request('dynamic_relationships_v2')));const ledger=JSON.parse(readFileSync(directory+'/ledger.json','utf8'));restored.acknowledgeInterrupted(ledger.requests.at(-1).id);assert.equal(restored.totals().halted,true);const stopped=assert.rejects(pending);release();await stopped;await assert.rejects(h(endpoint,request('dynamic_entities_v3')));assert.equal(restored.totals().completions,1);
`));

test('wrong identity malformed response and non-success response do not permit another dispatch',()=>{
 for(const raw of ['not-json','null','0','[]','{}','{"id":"invalid id"}','{"model":"wrong","provider":"Other"}'])run(`let calls=0;const f=guarded(async()=>{calls++;return new Response(${JSON.stringify(raw)},{status:200});});await arm(f);await assert.rejects(f(endpoint,request('dynamic_entities_v3')));assert.equal(g.totals().halted,true);await assert.rejects(f(endpoint,request('dynamic_relationships_v2')));assert.equal(calls,1);`);
 run(`const f=guarded(async()=>new Response('{}',{status:500}));await arm(f);await assert.rejects(f(endpoint,request('dynamic_entities_v3')));assert.equal(g.totals().halted,true);await assert.rejects(f(endpoint,request('dynamic_relationships_v2')));`);
});

test('one Tavily basic search cannot upgrade repeat or authorize an unsafe empty result',()=>{
 run(`const f=guarded();await arm(f);await assert.rejects(f(tavily,retrieveRequest()));assert.equal(g.totals().tavilySearches,1);assert.equal(g.totals().conservativeCredits,1);`);
 for(const mutation of ["b.search_depth='advanced'","b.max_results=6","b.auto_parameters=true","b.query='another question'"])run(`g.armAttempt(1);bind();let calls=0;const f=g.createGuardedFetch(async()=>{calls++;return retrieved();});const b=JSON.parse(retrieveRequest().body);${mutation};await assert.rejects(f(tavily,{method:'POST',body:JSON.stringify(b)}));assert.equal(calls,0);`);
 for(const results of [[],[{url:'http://www.lta.gov.sg/'}],[{url:'https://name:password@www.lta.gov.sg/'}]])run(`g.armAttempt(1);bind();const f=g.createGuardedFetch(async()=>Response.json({results:${JSON.stringify(results)}}));await assert.rejects(f(tavily,retrieveRequest()));assert.equal(g.totals().halted,true);await assert.rejects(f(endpoint,request('dynamic_entities_v3')));`);
});

test('the exact production retrieval wording stays derived from the original question',()=>run(`
g.armAttempt(1);bind();let calls=0;const f=g.createGuardedFetch(async()=>{calls++;return retrieved();});const raw=JSON.parse(retrieveRequest().body);assert.equal(raw.query,'Singapore: How could a hypothetical MRT link in Singapore affect fictional citizen commutes?');await assert.rejects(f(tavily,{method:'POST',body:JSON.stringify({...raw,query:question})}));await f(tavily,{method:'POST',body:JSON.stringify(raw)});assert.equal(calls,1);assert.equal(g.totals().tavilySearches,1);
`));

test('external URL tricks and non-string overrides never reach transport while redirects are disabled',()=>run(`
let calls=0;const f=guarded(async(_url,init)=>{calls++;assert.equal(init.redirect,'error');return valid();});await arm(f);for(const url of [endpoint+'?extra=1',endpoint+'/', 'https://openrouter.ai.evil.example/api/v1/chat/completions','https://user@openrouter.ai/api/v1/chat/completions','https://api.tavily.com/search#ignored'])await assert.rejects(f(url,request('dynamic_entities_v3')));for(const replacement of [new Uint8Array([1]),new Blob(['{}']),new URLSearchParams({model:'wrong'})])await assert.rejects(f(new Request(endpoint,request('dynamic_entities_v3')),{method:'POST',body:replacement}));await f(endpoint,{...request('dynamic_entities_v3'),redirect:'follow'});assert.equal(calls,1);
`));

test('generation metadata is read-only single-use and missing cost never turns unknown spend into zero',()=>run(`
let metadata=0;const f=g.createGuardedFetch(async(url,init)=>{assert.equal(init.redirect,'error');if(url===tavily)return retrieved();if(String(url).includes('/generation?')){metadata++;return Response.json({data:{id:'generation-1',model:'deepseek/deepseek-v4-flash-0731',provider_name:'DigitalOcean'}});}return Response.json({id:'generation-1',model:'deepseek/deepseek-v4-flash-0731',usage:{},choices:[{finish_reason:'stop',message:{content:'{}'}}]});});await arm(f);await f(endpoint,request('dynamic_entities_v3'));assert.equal(g.totals().outstandingUsd,0.02);await assert.rejects(f('https://openrouter.ai/api/v1/generation?id=generation-1',{method:'POST'}));await f('https://openrouter.ai/api/v1/generation?id=generation-1',{redirect:'follow'});assert.equal(g.totals().outstandingUsd,0.02);assert.equal(g.totals().completions,1);await assert.rejects(f('https://openrouter.ai/api/v1/generation?id=generation-1'));assert.equal(metadata,1);
`));

test('proof fingerprint build identity pinned data readiness and historical failures cannot arm',()=>{
 for(const mutation of ["gate.codeFingerprint='0'.repeat(64);saveGate()","gate.productionBuild='stale';saveGate()","gate.identityHash='0'.repeat(64);saveGate()","gate.nodeTests=1169;saveGate()","gate.plotDesktop1440=false;saveGate()","gate.datasetPinsHash='0'.repeat(64);saveGate()","writeFileSync(identity.datasetFiles[0].path,'changed dummy data')","writeFileSync(identity.protectedFiles[0].path,'changed dummy protected file')","readiness.status='FAIL';saveReadiness()","historical.mandatory.swarm[0].replayExact=false;saveHistorical()","historical.inventory.classified[0].replayStatus='PASS';saveHistorical()","historical.mandatory.expected=19;saveHistorical()","historical.codeFingerprint='0'.repeat(64);saveHistorical()","unlinkSync(gate.historicalReportPath)","writeFileSync(gate.readinessReportPath,'{}')"])
 run(`${mutation};assert.throws(()=>g.armAttempt(1));assert.equal(g.totals().attempts,0);`);
});

test('journal truncation and loss of the durable head fail closed even with a valid projection',()=>{
 for(const mutation of ["writeFileSync(directory+'/ledger.jsonl',readFileSync(directory+'/ledger.jsonl','utf8').split('\\n').slice(0,-2).join('\\n')+'\\n')","unlinkSync(directory+'/ledger-head.json')","writeFileSync(directory+'/ledger.jsonl',readFileSync(directory+'/ledger.jsonl','utf8').slice(0,-1))"])
 run(`const f=guarded();await arm(f);${mutation};const fresh=await import('./scripts/testing/hybrid-map-v2-live-guard.mjs?recheck=1');assert.throws(()=>fresh.totals());await assert.rejects(f(endpoint,request('dynamic_entities_v3')));`);
});

test('test overrides and offline transports cannot be installed as the real live guard',()=>run(`
process.env.IMPACTLENS_HYBRID_MAP_V2_LIVE_GUARD='true';assert.throws(()=>g.installLiveGuard(),/^Error: HYBRID_MAP_V2_TASK_GUARD$/);assert.equal(g.totals().attempts,0);
`));

test('build and package configuration bytes always participate in the exact source fingerprint',()=>run(`
const filesystem=(await import('node:fs')).default,{syncBuiltinESMExports}=await import('node:module'),{resolve}=await import('node:path');const realRead=filesystem.readFileSync,baseline=g.currentFingerprint();
for(const name of ['next.config.ts','package.json','package-lock.json','tsconfig.json','postcss.config.mjs']){
 const target=resolve(name);filesystem.readFileSync=function(file,...args){const value=realRead.call(this,file,...args);if(typeof file==='string'&&resolve(file)===target)return typeof value==='string'?value+'\\nFIXTURE_CONFIG_CHANGED':Buffer.concat([value,Buffer.from('\\nFIXTURE_CONFIG_CHANGED')]);return value;};syncBuiltinESMExports();
 try{assert.notEqual(g.currentFingerprint(),baseline,name+' must change the proof fingerprint');}finally{filesystem.readFileSync=realRead;syncBuiltinESMExports();}
 assert.equal(g.currentFingerprint(),baseline);
}
assert.equal(g.totals().attempts,0);
`));


test('v2 authority rejects legacy identity and misleading benchmark claims without arming',()=>{
 for(const mutation of ["identity.version=1;writeFileSync(identityPath,JSON.stringify(identity))","delete identity.hybrid.interpretationPolicy;writeFileSync(identityPath,JSON.stringify(identity))","identity.executionBundle='other';writeFileSync(identityPath,JSON.stringify(identity))","gate.version=1;saveGate()","gate.nodeTests=1686;saveGate()","delete gate.benchmarkAssessment;saveGate()","gate.benchmarks14=true;saveGate()","gate.benchmarkAssessment.decision='PASS';saveGate()","gate.benchmarkAssessment.evidenceFiles[0].sha256='0'.repeat(64);saveGate()"])run(mutation+";assert.throws(()=>g.armAttempt(1));assert.equal(g.totals().attempts,0);");
});


test('guard-terminal response fails immediately after durable settlement without another dispatch',()=>{
 for(const invalid of ["new Response('not-json',{status:200})","new Response('{}',{status:500})","valid({prompt_tokens:10,completion_tokens:10,cost:1.01})"])run(`let calls=0;const f=guarded(async()=>{calls++;return ${invalid};});await arm(f);await assert.rejects(f(endpoint,request('dynamic_entities_v3')));assert.equal(calls,1);assert.equal(g.totals().halted,true);assert.equal(g.totals().pending,0);assert.equal(g.totals().completions,1);await assert.rejects(f(endpoint,request('dynamic_relationships_v2')));assert.equal(calls,1);`);
});


test('metadata-reconciled overspend fails immediately without releasing evidence or permitting another call',()=>{
 for(const details of [{total_cost:1.01,native_tokens_prompt:10,native_tokens_completion:10},{total_cost:0.0001,native_tokens_prompt:40000001,native_tokens_completion:10}])run(`const f=g.createGuardedFetch(async(url)=>url===tavily?retrieved():String(url).includes('/generation?')?Response.json({data:{id:'generation-1',model:'deepseek/deepseek-v4-flash-0731',provider_name:'DigitalOcean',...${JSON.stringify(details)}}}):Response.json({id:'generation-1',model:'deepseek/deepseek-v4-flash-0731',usage:{},choices:[{finish_reason:'stop',message:{content:'{}'}}]}));await arm(f);await f(endpoint,request('dynamic_entities_v3'));await assert.rejects(f('https://openrouter.ai/api/v1/generation?id=generation-1'));assert.equal(g.totals().halted,true);assert.equal(g.totals().pending,0);assert.equal(g.totals().completions,1);await assert.rejects(f(endpoint,request('dynamic_relationships_v2')));`);
});
