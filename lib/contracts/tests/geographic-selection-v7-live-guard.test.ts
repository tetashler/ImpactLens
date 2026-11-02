await import((await import('node:url')).pathToFileURL((await import('node:path')).resolve('scripts/testing/offline-network.mjs')).href);
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,relative,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

// Every child uses only new temporary dummy files and a Response-returning transport.
// The real guard directory, real task identity and existing paid ledgers are never opened.
const setup=`
await import('${pathToFileURL(resolve('scripts/testing/offline-network.mjs')).href}');
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const g=await import('./scripts/testing/geographic-selection-v7-live-guard.mjs');
const {readHistoricalScopeManifest}=await import('./scripts/testing/phase4e2-historical-scope.ts');
const {buildRetrievalQuery}=await import('./lib/server/evidence/retrieval-query.ts');
const sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>JSON.stringify(value&&typeof value==='object'?Array.isArray(value)?value.map(v=>JSON.parse(canonical(v))):Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonical(value[k]))])):value);
const directory=process.env.IMPACTLENS_GEOGRAPHIC_SELECTION_V7_LIVE_DIRECTORY;
const identityPath=process.env.IMPACTLENS_GEOGRAPHIC_SELECTION_V7_IDENTITY,gatePath=process.env.IMPACTLENS_GEOGRAPHIC_SELECTION_V7_OFFLINE_GATE;
const identity=JSON.parse(readFileSync(identityPath,'utf8')),geometry=JSON.parse(identity.expectedGeometryKey),question=identity.question;
identity.policies={context:'conversation-menu-v7',behaviour:'citizen-menu-v4',prose:'citizen-prose-v1',issue:'issue-declaration-v1',selection:'citizen-selection-v2'};identity.interpretationRequired=false;identity.diagnosticRoot=directory+'/diagnostics';identity.operatorPolicy={...g.OPERATOR_POLICY};identity.selectionProofPath=directory+'/selection-proof.json';identity.selectionProofSha256=sha(readFileSync(identity.selectionProofPath));writeFileSync(identityPath,JSON.stringify(identity));const gate=JSON.parse(readFileSync(gatePath,'utf8'));gate.codeFingerprint=g.currentFingerprint();gate.identityHash=sha(readFileSync(identityPath));gate.datasetPinsHash=sha(canonical(identity.datasetFiles));gate.protectedHashDigest=sha(canonical(identity.protectedFiles));const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();const sourceNames=execFileSync('git',['ls-files','lib/citizen-grounding'],{encoding:'utf8'}).trim().split('\\n').slice(0,11),sourcePins=sourceNames.map(path=>({path,sha256:sha(readFileSync(path))}));gate.benchmarkAssessment={version:1,decision:'SOURCE_JUSTIFIED_HISTORICAL_REUSE',status:'PASS',codeFingerprint:gate.codeFingerprint,currentHead:head,baselineCommit:head,currentTree:tree,baselineTree:tree,applicationSourceUnchanged:true,benchmarkRows:14,executedFresh:false,runtimeSourceFiles:sourcePins,unchangedSourceFiles:sourcePins,evidenceFiles:identity.datasetFiles,sourceBaselineFingerprint:'a'.repeat(64)};gate.benchmarks14=false;gate.selection350=true;gate.selectionFocused=true;
const approvedFile='f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json';
const replayRow=file=>({file,replayExact:true,roundTripExact:true,checkpointTailExact:null,archiveUnchanged:true,journalUnchanged:true});
const rows=Array.from({length:20},(_,i)=>replayRow((i+1).toString(16).padStart(64,'0')+'.json'));
const historical={version:3,codeFingerprint:gate.codeFingerprint,snapshotHash:'a'.repeat(64),scope:{version:1,manifestHash:readHistoricalScopeManifest().manifestHash},mandatory:{status:'PASS',expected:20,passed:20,failures:[],historical:rows.slice(0,10),swarm:rows.slice(10)},inventory:{status:'COMPLETE_WITH_CLASSIFIED_UNRESOLVED',qualifying:20,classified:[{file:approvedFile,classification:'pre-final-mocked-development-artifact',qualification:'nonqualifying-for-mandatory-historical-replay',replayStatus:'unresolved-SOCIAL_STALE',hashesVerified:true,sourcePolicyRecoverable:false,recordIndex:0,tick:1}],unresolved:1,entries:[...rows.map(({file})=>({file,coverage:'mandatory-strict-replay'})),{file:approvedFile,coverage:'classified-unresolved'}]},priorFilesUnchanged:7,providerCalls:0,networkAttempts:0};
const readiness={version:2,taskId:g.TASK_ID,codeFingerprint:gate.codeFingerprint,identityHash:gate.identityHash,status:'PASS',providerCalls:0,networkAttempts:0};
const saveGate=()=>writeFileSync(gatePath,JSON.stringify(gate));
const saveHistorical=()=>{const bytes=JSON.stringify(historical);writeFileSync(gate.historicalReportPath,bytes);gate.historicalReportHash=sha(bytes);saveGate();};
const saveReadiness=()=>{const bytes=JSON.stringify(readiness);writeFileSync(gate.readinessReportPath,bytes);gate.readinessReportHash=sha(bytes);saveGate();};saveHistorical();saveReadiness();
const slots=()=>Array.from({length:35},(_,i)=>({slotId:'profile-'+(i+1)}));
const context=(name,index=0)=>name==='citizen_personalities_v1'?{version:1,policy:'citizen-personality-v1',slots:slots(),diversityToken:index.toString(16).padStart(64,'0')}:name==='stakeholder_turn_v1'?{turnIndex:index,input:{question}}:name==='social_decision_v1'?{question,id:'decision-'+index,policy:'conversation-menu-v7',tick:Math.min(320,index),actor:{id:'citizen-'+index},grounding:{citizenId:'citizen-'+index},items:[],choices:[],memories:[],proseRules:{policy:'citizen-prose-v1',allowedFactIds:[]},issueRules:{policy:'issue-declaration-v1',authoredProseIsEvidence:false},issueOptions:[]}:name==='dynamic_entities_v3'?{question,spatial:{provenance:'user-drawn',features:geometry.features}}:{question,bindingKey:identity.acceptedInterpretationBinding};
const body=(name,index=0)=>({model:'deepseek/deepseek-v4-flash-0731',provider:{only:['digitalocean'],allow_fallbacks:false,require_parameters:true},reasoning:{effort:'none',exclude:true},stream:false,max_tokens:name==='social_decision_v1'?600:name==='stakeholder_turn_v1'?800:name==='hybrid_intervention_intent_v2'?1500:6000,response_format:{type:'json_schema',json_schema:{name,strict:true,schema:{type:'object',additionalProperties:false,properties:{}}}},messages:[{role:'system',content:'DUMMY_PRIVATE_PROMPT'}, {role:'user',content:JSON.stringify(context(name,index))}]});
const request=(name,index=0)=>({method:'POST',body:JSON.stringify(body(name,index))});
const valid=(usage={prompt_tokens:10,completion_tokens:10,cost:0.0001},name='dynamic_entities_v3')=>Response.json({id:'generation-'+Math.random().toString(16).slice(2),model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',usage,choices:[{finish_reason:'stop',message:{content:JSON.stringify(name==='citizen_personalities_v1'?{profiles:slots().map(({slotId})=>({slotId,style:'direct',c:1,i:1,d:1,k:1,u:1}))}:{private:'DUMMY_PRIVATE_PROVIDER_OUTPUT'})}}]});
const retrieved=()=>Response.json({results:[{title:'DUMMY_PRIVATE_SOURCE_TITLE',url:'https://www.lta.gov.sg/',content:'DUMMY_PRIVATE_RETRIEVAL'}],usage:{credits:1}});
const retrieveRequest=()=>({method:'POST',body:JSON.stringify({query:buildRetrievalQuery(question,identity.retrievalPlanningArea,'balanced-question-v1'),search_depth:'basic',max_results:5,auto_parameters:false})});
const endpoint='https://openrouter.ai/api/v1/chat/completions',tavily='https://api.tavily.com/search';
const guarded=(native=async(_url,init)=>valid(undefined,JSON.parse(init.body).response_format.json_schema.name))=>g.createGuardedFetch((url,init)=>String(url)===tavily?retrieved():native(url,init));
const bind=()=>g.bindExploreInput({question,geometry,geometryRevision:identity.expectedGeometryRevision,anchors:identity.anchors,hybrid:identity.hybrid});
const arm=async f=>{assert.equal(g.totals().attempts,0);await g.armAttempt(1);bind();await f(tavily,retrieveRequest());};
const initial=async f=>{await arm(f);await f(endpoint,request('dynamic_entities_v3'));await f(endpoint,request('dynamic_relationships_v2'));for(let i=0;i<8;i++)await f(endpoint,request('stakeholder_turn_v1',i));};
const prime=async f=>{await initial(f);await f(endpoint,request('citizen_personalities_v1'));};
`;

function run(source:string,inspect?:(directory:string)=>void){
 mkdirSync('tmp',{recursive:true});const directory=mkdtempSync(join(process.cwd(),'tmp','geographic-selection-v7-guard-test-'));mkdirSync(join(directory,'diagnostics'));
 const gatePath=join(directory,'offline-gate.json'),identityPath=join(directory,'identity.json'),buildId=join(directory,'BUILD_ID');
 const pin=(name:string)=>{const path=join(directory,name);writeFileSync(path,'isolated dummy '+name);return {path:relative(process.cwd(),path).split(sep).join('/'),sha256:''};};
 const dataset=pin('dataset-dummy.json'),protectedFile=pin('protected-dummy.json');
 const geometry={version:1,scenarioId:'dummy-mrt',features:[{kind:'point',id:'station-a',label:'Dummy station',coordinate:{lat:1.35,lon:103.85},role:'station',provenance:'user-drawn'},{kind:'point',id:'station-b',label:'Dummy second station',coordinate:{lat:1.36,lon:103.86},role:'station',provenance:'user-drawn'},{kind:'line',id:'route',label:'Dummy route',coordinates:[{lat:1.35,lon:103.85},{lat:1.36,lon:103.86}],provenance:'user-drawn'}]};
 writeFileSync(buildId,'isolated-fixture-build');
 const anchors={'station-a':'NS2'},hybrid={version:1,policy:'hybrid-citizen-explore-v1',interpretationPolicy:'hybrid-map-v2',serviceDate:'2026-10-27',anchors,selection:{routeId:'route',pointIds:['station-a','station-b']},timings:{runSeconds:120.5,dwellSeconds:30,waitingTimeSeconds:120,transferWalkSeconds:90,geometryConfirmed:true,assumptionsConfirmed:true}};
 const identity={version:2,executionBundle:'hybrid-citizen-explore-v1',taskId:'geographic-selection-v7-live-20261102-01',question:'How could a hypothetical MRT link in Singapore affect fictional citizen commutes?',expectedGeometryKey:JSON.stringify(geometry),expectedGeometryRevision:3,anchors,hybrid,datasetFiles:[dataset],protectedFiles:[protectedFile]};
 // Hash the dummy files outside the child to keep every protected pin independent.
 for(const item of [dataset,protectedFile])item.sha256=createHash('sha256').update(readFileSync(item.path)).digest('hex');
 writeFileSync(join(directory,'selection-proof.json'),'DUMMY_OFFLINE_PROOF');writeFileSync(identityPath,JSON.stringify(identity));writeFileSync(gatePath,JSON.stringify({version:2,taskId:identity.taskId,offlinePass:true,nodeTests:1981,tsApp:true,tsStrict:true,productionBuild:'isolated-fixture-build',desktop50:true,desktop100:true,plotDesktop1440:true,plotDesktop1920:true,benchmarks14:true,benchmarkAssessment:{version:1,decision:'fresh-14-row-pass',reason:'fresh-run',sourceBaselineFingerprint:'a'.repeat(64),evidenceFiles:[dataset],unchangedSourceFiles:[protectedFile]},historical20:true,classifiedArtifact:true,privacy:true,fullAndTailReplay:true,protectedHash:true,datasetPins:true,proseDiagnosticSink:true,providerCalls:0,networkAttempts:0,historicalReportPath:join(directory,'historical-replay.json'),readinessReportPath:join(directory,'readiness.json')}));
 const mockPath=join(directory,'mock-admission.mjs'),loaderPath=join(directory,'loader.mjs');
 writeFileSync(mockPath, `export async function preloadGeographicSelectionProof({proofSha256}){return {policy:'geographic-selection-admission-v1',proofSha256,representedAgents:10000,improved:4,summarySha256:'a'.repeat(64),scenarioSha256:'b'.repeat(64),createdAt:'2020-01-01T00:00:00Z'};}; export async function verifyGeographicSelectionAdmission({actor,contextId,context,proofSha256}){if(actor!==context.actor.id||contextId!==context.id||contextId==='decision-fail') throw Error('MOCK_SELECTION_REJECT');return {policy:'geographic-selection-admission-v1',proofSha256,active:50,capable:35,ruleDriven:15,improvedSelected:4,improvedCapable:4,comparisonAreas:25,byBucket:{impact:4,geography:12,comparison:34,fallback:0},selectionSha256:'c'.repeat(64),bindingSha256:'d'.repeat(64),scenarioSha256:'b'.repeat(64),populationSha256:'e'.repeat(64),summarySha256:'a'.repeat(64),runSha256:'f'.repeat(64),contextSha256:'1'.repeat(64),actorSha256:'2'.repeat(64)};}`);
 writeFileSync(loaderPath, `import {registerHooks} from 'node:module'; registerHooks({resolve(specifier,context,next){if(specifier==='./geographic-selection-admission.mjs') return {url:${JSON.stringify(pathToFileURL(mockPath).href)},shortCircuit:true};return next(specifier,context);}});`);
 try{const result=spawnSync(process.execPath,['--import',pathToFileURL(loaderPath).href,'--input-type=module','-e',setup+source],{cwd:process.cwd(),encoding:'utf8',timeout:120000,env:{...process.env,NODE_ENV:'test',IMPACTLENS_GEOGRAPHIC_SELECTION_V7_LIVE_DIRECTORY:directory,IMPACTLENS_GEOGRAPHIC_SELECTION_V7_IDENTITY:identityPath,IMPACTLENS_GEOGRAPHIC_SELECTION_V7_OFFLINE_GATE:gatePath,IMPACTLENS_GEOGRAPHIC_SELECTION_V7_TEST_BUILD_ID_PATH:buildId,IMPACTLENS_GEOGRAPHIC_SELECTION_V7_LIVE_GUARD:'false'}});assert.equal(result.status,0,result.stderr||result.stdout);inspect?.(directory);}
 finally{assert.ok(resolve(directory).startsWith(resolve('tmp')+sep+'geographic-selection-v7-guard-test-'));rmSync(directory,{recursive:true,force:true});}
}

test('arming starts the sixty minute deadline and repeating Explore cannot reset it',()=>run(`
const original=Date.now,base=original();Date.now=()=>base;const f=guarded();await arm(f);assert.throws(bind);await assert.rejects(g.armAttempt(1));Date.now=()=>base+3600000;await assert.rejects(f(endpoint,request('dynamic_entities_v3')));assert.equal(g.totals().completions,0);Date.now=original;
`));

test('each paid stage and metadata verification must fit its full bound before the absolute deadline',()=>{
 for(const [name,remaining]of [['dynamic_entities_v3',44999],['hybrid_intervention_intent_v2',29999]] as const)run(`const realNow=Date.now,base=realNow();Date.now=()=>base;let calls=0;const f=guarded(async()=>{calls++;return valid();});await arm(f);Date.now=()=>base+3600000-${remaining};await assert.rejects(f(endpoint,request('${name}')));assert.equal(calls,0);assert.equal(g.totals().completions,0);Date.now=realNow;`);
 run(`const realNow=Date.now,base=realNow();Date.now=()=>base;await g.armAttempt(1);bind();let calls=0;const f=g.createGuardedFetch(async()=>{calls++;return retrieved();});Date.now=()=>base+3600000-9999;await assert.rejects(f(tavily,retrieveRequest()));assert.equal(calls,0);assert.equal(g.totals().tavilySearches,0);Date.now=realNow;`);
 run(`const realNow=Date.now,base=realNow();Date.now=()=>base;let calls=0;const f=guarded(async()=>{calls++;return Response.json({id:'generation-1',model:'deepseek/deepseek-v4-flash-0731',choices:[{finish_reason:'stop',message:{content:'{}'}}],usage:{}});});await arm(f);await f(endpoint,request('dynamic_entities_v3'));Date.now=()=>base+3600000-29999;await assert.rejects(f('https://openrouter.ai/api/v1/generation?id=generation-1'));assert.equal(calls,1);Date.now=realNow;`);
});

test('single concurrency interrupted dispatch and reported overspend halt further spending',()=>{
 run(`let calls=0,release;const f=guarded(async()=>{calls++;await new Promise(r=>release=r);return valid();});await arm(f);const pending=f(endpoint,request('dynamic_entities_v3'));await new Promise(r=>setTimeout(r,0));await assert.rejects(f(endpoint,request('hybrid_intervention_intent_v2')));release();await pending;assert.equal(calls,1);`);
 run(`let calls=0;const f=guarded(async()=>{calls++;throw Error('DUMMY_PRIVATE_TRANSPORT_ERROR');});await arm(f);await assert.rejects(f(endpoint,request('dynamic_entities_v3')));await assert.rejects(f(endpoint,request('dynamic_entities_v3')));assert.equal(calls,1);assert.equal(g.totals().halted,true);assert.equal(g.totals().outstandingUsd,0.02);`);
 for(const usage of [{prompt_tokens:40000001,cost:0.001},{prompt_tokens:10,completion_tokens:10,cost:1.01}])run(`const f=guarded(async()=>valid(${JSON.stringify(usage)}));await arm(f);await assert.rejects(f(endpoint,request('dynamic_entities_v3')));assert.equal(g.totals().halted,true);await assert.rejects(f(endpoint,request('dynamic_relationships_v2')));`);
});

test('proof fingerprint build identity pinned data readiness and historical failures cannot arm',()=>{
 for(const mutation of ["gate.codeFingerprint='0'.repeat(64);saveGate()","gate.productionBuild='stale';saveGate()","gate.identityHash='0'.repeat(64);saveGate()","gate.nodeTests=1169;saveGate()","gate.plotDesktop1440=false;saveGate()","gate.datasetPinsHash='0'.repeat(64);saveGate()","writeFileSync(identity.datasetFiles[0].path,'changed dummy data')","writeFileSync(identity.protectedFiles[0].path,'changed dummy protected file')","readiness.status='FAIL';saveReadiness()","historical.mandatory.swarm[0].replayExact=false;saveHistorical()","historical.inventory.classified[0].replayStatus='PASS';saveHistorical()","historical.mandatory.expected=19;saveHistorical()","historical.codeFingerprint='0'.repeat(64);saveHistorical()","unlinkSync(gate.historicalReportPath)","writeFileSync(gate.readinessReportPath,'{}')"])
 run(`${mutation};await assert.rejects(g.armAttempt(1));assert.equal(g.totals().attempts,0);`);
});

test('planning diagnostics never persist provider-authored length properties',()=>{
 for(const field of ['jurisdictions','agents','entities','relationships'])run(`const payload={scope:'local',[${JSON.stringify(field)}]:{length:{body:'DUMMY_PRIVATE_PLANNING_TEXT'}}};const f=guarded(async()=>Response.json({id:'generation-1',model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',usage:{prompt_tokens:10,completion_tokens:10,cost:.0001},choices:[{finish_reason:'stop',message:{content:JSON.stringify(payload)}}]}));await arm(f);await assert.rejects(f(endpoint,request('dynamic_entities_v3')));assert.equal(g.totals().halted,true);for(const name of ['ledger.json','ledger.jsonl'])assert.doesNotMatch(readFileSync(directory+'/'+name,'utf8'),/DUMMY_PRIVATE_PLANNING_TEXT|"body"/);`);
});

test('independent guard caps social at 40 and forbids unnecessary interpretation',()=>run(`
let calls=0;const f=guarded(async(_url,init)=>{calls++;return valid(undefined,JSON.parse(init.body).response_format.json_schema.name);});await arm(f);await assert.rejects(f(endpoint,request('hybrid_intervention_intent_v2')));await f(endpoint,request('dynamic_entities_v3'));await f(endpoint,request('dynamic_relationships_v2'));for(let i=0;i<8;i++)await f(endpoint,request('stakeholder_turn_v1',i));for(let i=0;i<3;i++)await f(endpoint,request('citizen_personalities_v1',i));for(let i=0;i<40;i++)await f(endpoint,request('social_decision_v1',i));await assert.rejects(f(endpoint,request('social_decision_v1',40)));assert.equal(calls,53);assert.equal(g.totals().completions,53);assert.equal(g.totals().social,40);assert.equal(g.RESERVED_USD,0.02);
`,directory=>assert.doesNotMatch(readFileSync(join(directory,'ledger.jsonl'),'utf8'),/DUMMY_PRIVATE|Bearer|"messages"|"profiles"|hypothetical MRT link/)));

test('the first social call fails closed before reservation on a rejected selection',()=>run(`
const f=guarded();await prime(f);const b=body('social_decision_v1'),c=JSON.parse(b.messages[1].content);c.id='decision-fail';b.messages[1].content=JSON.stringify(c);await assert.rejects(f(endpoint,{method:'POST',body:JSON.stringify(b)}),/GEOGRAPHIC_SELECTION_V7_TASK_GUARD/);assert.equal(g.totals().social,0);assert.equal(g.totals().halted,true);await assert.rejects(f(endpoint,request('social_decision_v1',1)));assert.equal(g.totals().social,0);
`));

test('the selected proof, selection policy and operator policy are bound before arming',()=>{
 for(const mutation of ["identity.selectionProofSha256='0'.repeat(64)","identity.policies.selection='other'","identity.interpretationRequired=true","identity.operatorPolicy.minimumReturned=8"])run(`${mutation};writeFileSync(identityPath,JSON.stringify(identity));await assert.rejects(g.armAttempt(1));assert.equal(g.totals().attempts,0);`);
});
