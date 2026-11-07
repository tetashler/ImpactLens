await import((await import('node:url')).pathToFileURL((await import('node:path')).resolve('scripts/testing/offline-network.mjs')).href);
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createOfflineTestFixture,finishOfflineTestFixture} from '../../../scripts/testing/fixture-retention.ts';
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
const {createStructuredTransport}=await import('./lib/server/inference/deepseek.ts');
const g=await import('./scripts/testing/admission-timeout-smoke-live-guard.mjs');
const {readHistoricalScopeManifest}=await import('./scripts/testing/phase4e2-historical-scope.ts');
const {buildRetrievalQuery}=await import('./lib/server/evidence/retrieval-query.ts');
const sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>JSON.stringify(value&&typeof value==='object'?Array.isArray(value)?value.map(v=>JSON.parse(canonical(v))):Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonical(value[k]))])):value);
const directory=process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_LIVE_DIRECTORY;
const identityPath=process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_IDENTITY,gatePath=process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_OFFLINE_GATE;
const identity=JSON.parse(readFileSync(identityPath,'utf8')),geometry=JSON.parse(identity.expectedGeometryKey),question=identity.question;
identity.policies={context:'conversation-menu-v7',behaviour:'citizen-menu-v4',prose:'citizen-prose-v1',issue:'issue-declaration-v1',selection:'citizen-selection-v2'};identity.interpretationRequired=false;identity.diagnosticRoot=directory+'/diagnostics';identity.operatorPolicy={...g.OPERATOR_POLICY};identity.selectionProofPath=process.cwd()+'/tmp/geographic-selection-v7-integrated-20261102/reference-selection-proof.json';identity.selectionProofSha256=sha(readFileSync(identity.selectionProofPath));writeFileSync(identityPath,JSON.stringify(identity));const gate=JSON.parse(readFileSync(gatePath,'utf8'));gate.codeFingerprint=g.currentFingerprint();gate.identityHash=sha(readFileSync(identityPath));gate.datasetPinsHash=sha(canonical(identity.datasetFiles));gate.protectedHashDigest=sha(canonical(identity.protectedFiles));const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();const sourceNames=execFileSync('git',['ls-files','lib/citizen-grounding'],{encoding:'utf8'}).trim().split('\\n').slice(0,11),sourcePins=sourceNames.map(path=>({path,sha256:sha(readFileSync(path))}));gate.benchmarkAssessment={version:1,decision:'SOURCE_JUSTIFIED_HISTORICAL_REUSE',status:'PASS',codeFingerprint:gate.codeFingerprint,currentHead:head,baselineCommit:head,currentTree:tree,baselineTree:tree,applicationSourceUnchanged:false,admissionTimeoutRepairCovered:true,affectedIntegration:true,changedSourceFiles:[{path:'lib/server/inference/deepseek.ts',sha256:sha(readFileSync('lib/server/inference/deepseek.ts'))}],benchmarkRows:14,executedFresh:false,runtimeSourceFiles:sourcePins,unchangedSourceFiles:sourcePins,evidenceFiles:identity.datasetFiles,sourceBaselineFingerprint:'a'.repeat(64)};gate.benchmarks14=false;gate.selection350=true;gate.selectionFocused=true;
const approvedFile='f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json';
const replayRow=file=>({file,replayExact:true,roundTripExact:true,checkpointTailExact:null,archiveUnchanged:true,journalUnchanged:true});
const rows=Array.from({length:20},(_,i)=>replayRow((i+1).toString(16).padStart(64,'0')+'.json'));
const historical={version:3,codeFingerprint:gate.codeFingerprint,snapshotHash:'a'.repeat(64),scope:{version:1,manifestHash:readHistoricalScopeManifest().manifestHash},mandatory:{status:'PASS',expected:20,passed:20,failures:[],historical:rows.slice(0,10),swarm:rows.slice(10)},inventory:{status:'COMPLETE_WITH_CLASSIFIED_UNRESOLVED',qualifying:20,classified:[{file:approvedFile,classification:'pre-final-mocked-development-artifact',qualification:'nonqualifying-for-mandatory-historical-replay',replayStatus:'unresolved-SOCIAL_STALE',hashesVerified:true,sourcePolicyRecoverable:false,recordIndex:0,tick:1}],unresolved:1,entries:[...rows.map(({file})=>({file,coverage:'mandatory-strict-replay'})),{file:approvedFile,coverage:'classified-unresolved'}]},priorFilesUnchanged:7,providerCalls:0,networkAttempts:0};
const readiness={version:2,taskId:g.TASK_ID,codeFingerprint:gate.codeFingerprint,identityHash:gate.identityHash,status:'PASS',providerCalls:0,networkAttempts:0};
const saveGate=()=>writeFileSync(gatePath,JSON.stringify(gate));
const saveHistorical=()=>{const bytes=JSON.stringify(historical);writeFileSync(gate.historicalReportPath,bytes);gate.historicalReportHash=sha(bytes);saveGate();};
const saveReadiness=()=>{const bytes=JSON.stringify(readiness);writeFileSync(gate.readinessReportPath,bytes);gate.readinessReportHash=sha(bytes);saveGate();};saveHistorical();saveReadiness();
const slots=()=>Array.from({length:35},(_,i)=>({slotId:'profile-'+(i+1)}));
const context=(name,index=0)=>name==='citizen_personalities_v1'?{version:1,policy:'citizen-personality-v1',slots:slots(),diversityToken:index.toString(16).padStart(64,'0')}:name==='stakeholder_turn_v1'?{turnIndex:index,input:{question}}:name==='social_decision_v1'?{question,runId:'dummy-run',id:'decision-'+index,policy:'conversation-menu-v7',tick:Math.min(320,index),actor:{id:'citizen-'+index},grounding:{citizenId:'citizen-'+index},items:[],choices:[],memories:[],proseRules:{policy:'citizen-prose-v1',allowedFactIds:[]},issueRules:{policy:'issue-declaration-v1',authoredProseIsEvidence:false},issueOptions:[]}:name==='dynamic_entities_v3'?{question,spatial:{provenance:'user-drawn',features:geometry.features}}:{question,bindingKey:identity.acceptedInterpretationBinding};
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
 const fixture=createOfflineTestFixture('admission-cold-process-test-'),directory=fixture.directory;mkdirSync(join(directory,'diagnostics'));
 const gatePath=join(directory,'offline-gate.json'),identityPath=join(directory,'identity.json'),buildId=join(directory,'BUILD_ID');
 const pin=(name:string)=>{const path=join(directory,name);writeFileSync(path,'isolated dummy '+name);return {path:relative(process.cwd(),path).split(sep).join('/'),sha256:''};};
 const dataset=pin('dataset-dummy.json'),protectedFile=pin('protected-dummy.json');
 const priorIdentity=JSON.parse(readFileSync('tmp/geographic-selection-v7-live-20261102-01/identity.json','utf8'));
 const geometry=JSON.parse(priorIdentity.expectedGeometryKey),anchors=priorIdentity.anchors,hybrid=priorIdentity.hybrid;
 writeFileSync(buildId,'isolated-fixture-build');
 const identity={version:2,executionBundle:'hybrid-citizen-explore-v1',taskId:'admission-timeout-smoke-live-20261102-01',question:priorIdentity.question,expectedGeometryKey:priorIdentity.expectedGeometryKey,expectedGeometryRevision:priorIdentity.expectedGeometryRevision,anchors,hybrid,datasetFiles:[dataset],protectedFiles:[protectedFile]};
 // Hash the dummy files outside the child to keep every protected pin independent.
 for(const item of [dataset,protectedFile])item.sha256=createHash('sha256').update(readFileSync(item.path)).digest('hex');
 writeFileSync(join(directory,'selection-proof.json'),'DUMMY_OFFLINE_PROOF');writeFileSync(identityPath,JSON.stringify(identity));writeFileSync(gatePath,JSON.stringify({version:3,taskId:identity.taskId,offlinePass:true,nodeTests:2049,focusedPass:true,focusedTests:1,tsApp:true,tsStrict:true,productionBuild:'isolated-fixture-build',desktop50:true,desktop100:true,plotDesktop1440:true,plotDesktop1920:true,benchmarks14:true,benchmarkAssessment:{version:1,decision:'fresh-14-row-pass',reason:'fresh-run',sourceBaselineFingerprint:'a'.repeat(64),evidenceFiles:[dataset],unchangedSourceFiles:[protectedFile]},historical20:true,classifiedArtifact:true,privacy:true,fullAndTailReplay:true,protectedHash:true,datasetPins:true,proseDiagnosticSink:true,providerCalls:0,networkAttempts:0,historicalReportPath:join(directory,'historical-replay.json'),readinessReportPath:join(directory,'readiness.json')}));
 const childEnv:NodeJS.ProcessEnv={...process.env,NODE_ENV:'test',SOCIAL_STORAGE_ROOT:directory,IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_LIVE_DIRECTORY:directory,IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_IDENTITY:identityPath,IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_OFFLINE_GATE:gatePath,IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_TEST_BUILD_ID_PATH:buildId,IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_LIVE_GUARD:'false'};
 const runChild=(source:string)=>{const result=spawnSync(process.execPath,['--import',pathToFileURL(resolve('tmp/admission-timeout-repair-20261102/admission-absolute-offline.mjs')).href,'--input-type=module','-e',source],{cwd:process.cwd(),encoding:'utf8',timeout:180000,env:childEnv});assert.equal(result.status,0,result.stderr||result.stdout);return result;};
 let passed=false;try{
  // Separate preparer creates only isolated synthetic authority. The measured worker is a new cold process.
  runChild(setup+`await g.armAttempt(1);console.log(JSON.stringify({isolatedOfflineAuthority:true,paidCalls:0}));`);
  const result=runChild(source);
  inspect?.(directory);
  const line=result.stdout.split(/\r?\n/).find(line=>line.startsWith('{"coldIntegration":true'));
  assert.ok(line,result.stdout);const receipt=JSON.parse(line);
  assert.equal(receipt.status,'PASS');assert.equal(receipt.nativeSocial,2);assert.equal(receipt.cancelledBeforeReservation,true);
  writeFileSync('tmp/admission-timeout-repair-20261102/cold-process-integration-latest.json',JSON.stringify(receipt,null,2)+'\n');
  passed=true;
 }
 finally{finishOfflineTestFixture(fixture,passed);}
}


test('fresh cold process prewarms the real immutable 10k proof and executes stored selected V7 contexts before a warm call and cancellation',{timeout:360000},()=>run(`
import assert from 'node:assert/strict';
import {readFileSync,readSync,openSync,closeSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
const g=await import('./scripts/testing/admission-timeout-smoke-live-guard.mjs');
const {createSocialTransport}=await import('./lib/server/inference/social.ts');
const {createSociety}=await import('./lib/society/engine.ts');
const {prepareHybridStep,finishDecision,controlledIds}=await import('./lib/society/hybrid.ts');
const {canonical}=await import('./lib/experiments/validation.ts');
const {appendSwarmJournal,readSwarmJournal}=await import('./lib/server/society/swarm-journal.ts');
const {encodeMenuContext}=await import('./lib/society/decision-menu.ts');
const directory=process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_LIVE_DIRECTORY,identity=JSON.parse(readFileSync(process.env.IMPACTLENS_ADMISSION_TIMEOUT_SMOKE_IDENTITY,'utf8'));
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const sourceEvidence='tmp/citizen-selection-v2-20261101/integration/citizen-menu-50.json',prior=JSON.parse(readFileSync(sourceEvidence,'utf8')).rows[0],originalJournalHash=sha(prior.sourceJournal),proofHash=sha(identity.selectionProofPath);
const preRun={version:1,pid:process.pid,sourceFingerprint:g.currentFingerprint(),sourceEvidence:{path:sourceEvidence,sha256:sha(sourceEvidence)},journal:{path:prior.sourceJournal,sha256:originalJournalHash},proof:{path:identity.selectionProofPath,sha256:proofHash},testHelper:{path:'lib/contracts/tests/admission-cold-process.test.ts',sha256:sha('lib/contracts/tests/admission-cold-process.test.ts')},guard:{path:'scripts/testing/admission-timeout-smoke-live-guard.mjs',sha256:sha('scripts/testing/admission-timeout-smoke-live-guard.mjs')},startedUtc:new Date().toISOString(),providerCalls:0};
writeFileSync(join(directory,'cold-pre-run.json'),JSON.stringify(preRun,null,2));
const started=performance.now(),cold=await g.prewarmAdmission();assert.equal(cold.cache,'cold');assert.equal(cold.proofSha256,proofHash);assert.equal(g.totals().completions,0);
// Only genesis is loaded; full350 replay remains a separate gate.
const fd=openSync(prior.sourceJournal,'r'),buffer=Buffer.alloc(1024*1024);let text='';try{for(;;){const n=readSync(fd,buffer);assert.ok(n>0);text+=buffer.subarray(0,n).toString('utf8');if(text.includes('\\n'))break;}}finally{closeSync(fd);}
const input=JSON.parse(text.slice(0,text.indexOf('\\n'))).input;assert.equal(input.config.agents,50);assert.equal(input.citizenSelection.policy,'citizen-selection-v2');assert.equal(input.intelligence.context,'conversation-menu-v7');
let world=prepareHybridStep(createSociety(input));assert.equal(controlledIds(world).length,35);const store=join(directory,'session-store-v2/social-sessions');mkdirSync(store,{recursive:true});
const state={id:'b665c64c-651a-443c-beb5-99014ac0ae70',runId:input.runId,revision:0,world,reservation:world.hybrid.pending};await appendSwarmJournal(state,store);
const slots=Array.from({length:35},(_,i)=>({slotId:'profile-'+(i+1)}));let nativeTotal=0,nativeSocial=0,activeContext=world.hybrid.pending;
const f=g.createGuardedFetch(async(url,init)=>{
 if(String(url)==='https://api.tavily.com/search')return Response.json({results:[{title:'Synthetic offline source',url:'https://www.lta.gov.sg/',content:'SYNTHETIC_OFFLINE_SOURCE'}],usage:{credits:1}});
 nativeTotal++;const request=JSON.parse(init.body),name=request.response_format.json_schema.name;
 let content={private:'SYNTHETIC_OFFLINE_INITIALIZATION_ONLY'};
 if(name==='citizen_personalities_v1')content={profiles:slots.map(({slotId})=>({slotId,style:'direct',c:1,i:1,d:1,k:1,u:1}))};
 if(name==='social_decision_v1'){
  nativeSocial++;assert.deepEqual(JSON.parse(request.messages.find(m=>m.role==='user').content),JSON.parse(encodeMenuContext(activeContext)));
  const choice=activeContext.menu.find(o=>o.action==='inactive');assert.ok(choice);
  content={choiceId:choice.id,text:null,motivation:'Read the supplied fictional context before another action.',recallIds:[],stanceId:'keep',discussion:{topicIds:[],argument:'unspecified'},issueEvidenceId:null,factIds:[]};
 }
 return Response.json({id:'offline-cold-'+name+'-'+nativeTotal,model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',usage:{prompt_tokens:10,completion_tokens:10,cost:0,total_tokens:20},choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}]});
});
const geometry=JSON.parse(identity.expectedGeometryKey),question=identity.question;g.bindExploreInput({question,geometry,geometryRevision:identity.expectedGeometryRevision,anchors:identity.anchors,hybrid:identity.hybrid});
const {buildRetrievalQuery}=await import('./lib/server/evidence/retrieval-query.ts');await f('https://api.tavily.com/search',{method:'POST',body:JSON.stringify({query:buildRetrievalQuery(question,identity.retrievalPlanningArea,'balanced-question-v1'),search_depth:'basic',max_results:5,auto_parameters:false})});
const request=(name,index=0)=>({method:'POST',body:JSON.stringify({model:'deepseek/deepseek-v4-flash-0731',provider:{only:['digitalocean'],allow_fallbacks:false,require_parameters:true},reasoning:{effort:'none',exclude:true},stream:false,max_tokens:name==='stakeholder_turn_v1'?800:6000,response_format:{type:'json_schema',json_schema:{name,strict:true,schema:{type:'object',additionalProperties:false,properties:{}}}},messages:[{role:'system',content:'SYNTHETIC_OFFLINE_INITIALIZATION_ONLY'},{role:'user',content:JSON.stringify(name==='dynamic_entities_v3'?{question,spatial:{provenance:'user-drawn',features:geometry.features}}:name==='citizen_personalities_v1'?{version:1,policy:'citizen-personality-v1',slots,diversityToken:'a'.repeat(64)}:name==='stakeholder_turn_v1'?{turnIndex:index,input:{question}}:{question,bindingKey:identity.acceptedInterpretationBinding})}]})});
const endpoint='https://openrouter.ai/api/v1/chat/completions';await f(endpoint,request('dynamic_entities_v3'));await f(endpoint,request('dynamic_relationships_v2'));for(let i=0;i<8;i++)await f(endpoint,request('stakeholder_turn_v1',i));await f(endpoint,request('citizen_personalities_v1'));
const transport=createSocialTransport({key:'synthetic-offline-key',fetcher:f});
const firstStart=performance.now(),first=await transport.generate(activeContext),firstElapsed=performance.now()-firstStart;assert.equal(first.record.status,'accepted');
world=finishDecision(world,{decision:first.value,usage:first.record,error:null});
for(let i=0;i<1000&&!world.hybrid.pending;i++)world=prepareHybridStep(world);assert.ok(world.hybrid.pending);state.world=world;state.revision++;state.reservation=world.hybrid.pending;await appendSwarmJournal(state,store);activeContext=world.hybrid.pending;
const secondStart=performance.now(),second=await transport.generate(activeContext),warmElapsed=performance.now()-secondStart;assert.equal(second.record.status,'accepted');
const beforeCancel=g.totals().social,cancel=new AbortController();cancel.abort();await assert.rejects(transport.generate(activeContext,cancel.signal));assert.equal(g.totals().social,beforeCancel);assert.equal(nativeSocial,2);
const ledger=JSON.parse(readFileSync(join(directory,'ledger.json'),'utf8')),social=ledger.requests.filter(r=>r.purpose==='social');assert.equal(social.length,2);assert.ok(social.every(r=>r.nativeInvoked&&r.admissionReceiptVerified&&r.ledgerPolicy==='phased-provider-admission-v1'&&r.chargeClassification==='reported'));
assert.equal(sha(prior.sourceJournal),originalJournalHash);assert.equal(sha(identity.selectionProofPath),proofHash);assert.equal(g.currentFingerprint(),preRun.sourceFingerprint);
g.finishAttempt('partial');
console.log(JSON.stringify({coldIntegration:true,version:1,status:'PASS',pid:process.pid,sourceFingerprint:preRun.sourceFingerprint,representedAgents:10000,active:50,capable:35,policy:'conversation-menu-v7',selection:'citizen-selection-v2',coldPrewarm:true,prewarmMs:cold.durationMs,coldFirstSocialMs:firstElapsed,warmSocialMs:warmElapsed,totalMs:performance.now()-started,nativeSocial,cancelledBeforeReservation:true,firstStoredJournalVerified:true,actualV7Parsing:true,originalJournalUnchanged:true,proofUnchanged:true,preRunReceipt:{path:join(directory,'cold-pre-run.json'),sha256:sha(join(directory,'cold-pre-run.json'))},ledger:{path:join(directory,'ledger.jsonl'),sha256:sha(join(directory,'ledger.jsonl'))},providerCalls:0,networkAttempts:0}));
`));
