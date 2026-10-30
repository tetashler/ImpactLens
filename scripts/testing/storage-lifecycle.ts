/** Offline storage acceptance. Default mode writes only uniquely identified disposable fixture records. */
import './offline-network.mjs';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,readdirSync,lstatSync,unlinkSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';import {spawnSync} from 'node:child_process';import {createHash,randomUUID} from 'node:crypto';
import {handlePublicExplore,handlePublicSocial,registerAcceptedExecution} from '../../lib/server/society/public-service.ts';
import {handleSocialRequest} from '../../lib/server/society/service.ts';import {privateStoreDirectory} from '../../lib/server/society/storage.ts';
import {restoreSociety,saveSociety} from '../../lib/society/engine.ts';import {canonical,ensure} from '../../lib/experiments/validation.ts';
import {parsePublicExplore} from '../../lib/question-simulation/public-session.ts';import {readSummaryHistory,rememberSummary} from '../../lib/question-simulation/summary-history.ts';
import {worldFixtures} from '../../lib/world-graph/fixtures.ts';import {mockDynamicProvider} from '../../lib/contracts/tests/helpers/dynamic-provider.ts';
import {socialProviderFixture} from './social-decision-fixture.ts';

const [mode='override',phase='parent',stateArg]=process.argv.slice(2);ensure(['default','override'].includes(mode),'OFFLINE_MODE');
const output=resolve('tmp/phase4d-storage');mkdirSync(output,{recursive:true});
if(mode==='default')delete process.env.SOCIAL_STORAGE_ROOT;else process.env.SOCIAL_STORAGE_ROOT=join(output,'trusted-root');
process.env.SOCIAL_ACTIVE_AGENTS='24';process.env.SOCIAL_MAX_DECISIONS='8';process.env.SOCIAL_CONTROLLED_AGENTS='4';
const post=(value:unknown)=>new Request('http://localhost/api/social-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
const acceptedRoot=privateStoreDirectory('accepted-private'),sessionRoot=privateStoreDirectory('social-sessions');
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const snapshot=()=>Object.fromEntries([acceptedRoot,sessionRoot].flatMap(dir=>{try{return readdirSync(dir).filter(f=>/\.(json|jsonl|index)$/.test(f)).map(f=>{const p=join(dir,f);return [p,digest(readFileSync(p,'utf8'))];});}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}}));

if(phase==='parent'){
 const dir=mkdtempSync(join(output,'lifecycle-'+mode+'-')),path=join(dir,'state.json'),before=snapshot(),attemptId='offline-storage-'+randomUUID();writeFileSync(path,JSON.stringify({attemptId}));
 let state:any;
 try{for(const step of ['create','recover']){const child=spawnSync(process.execPath,[resolve('scripts/testing/storage-lifecycle.ts'),mode,step,path],{cwd:process.cwd(),env:process.env,encoding:'utf8'});ensure(child.status===0,'OFFLINE_CHILD_'+step);if(step==='create'){if(process.env.IMPACTLENS_STORAGE_TEST_ORPHAN_INDEX==='true'){const v=JSON.parse(readFileSync(path,'utf8'));const index=join(sessionRoot,digest(v.result.runId)+'.index');ensure(!before[index]&&readFileSync(index,'utf8')===v.result.session.id,'FIXTURE_INDEX');unlinkSync(index);}ensure(process.env.IMPACTLENS_STORAGE_TEST_FAIL_AFTER_CREATE!=='true','OFFLINE_INJECTED_RECOVERY_FAILURE');}}state=JSON.parse(readFileSync(path,'utf8'));}
 finally{
  // Discover only this attempt's new records, even when a child failed before saving its result.
  const owned=new Map<string,string>();
  for(const p of Object.keys(snapshot()).filter(p=>p.startsWith(acceptedRoot+sep)&&!before[p]&&p.endsWith('.json'))){const stored=JSON.parse(readFileSync(p,'utf8'));if(stored.execution?.attemptId!==attemptId)continue;const runId=stored.publicRun.runId;ensure(p===join(acceptedRoot,digest(runId)+'.json'),'FIXTURE_ARCHIVE');owned.set(p,digest(readFileSync(p,'utf8')));const index=join(sessionRoot,digest(runId)+'.index');
   try{const id=readFileSync(index,'utf8');ensure(/^[a-f0-9-]{36}$/.test(id),'FIXTURE_INDEX');const journal=join(sessionRoot,id+'.jsonl');ensure(!before[index]&&!before[journal]&&readFileSync(journal,'utf8').includes(runId),'FIXTURE_JOURNAL');owned.set(index,digest(readFileSync(index,'utf8')));owned.set(journal,digest(readFileSync(journal,'utf8')));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
   // Journal persistence precedes index creation. Recover ownership even across that failure window.
   for(const journal of Object.keys(snapshot()).filter(j=>j.startsWith(sessionRoot+sep)&&j.endsWith('.jsonl')&&!before[j])){const raw=readFileSync(journal,'utf8'),record=JSON.parse(raw.trimEnd().split('\n')[0]);if(record.runId!==runId)continue;ensure(/^[a-f0-9-]{36}$/.test(record.id)&&journal===join(sessionRoot,record.id+'.jsonl'),'FIXTURE_ORPHAN');owned.set(journal,digest(raw));}
  }
  writeFileSync(join(dir,'owned-files.json'),JSON.stringify([...owned],null,2));
  for(const [p,hash]of owned){ensure(lstatSync(p).isFile()&&digest(readFileSync(p,'utf8'))===hash,'FIXTURE_OWNERSHIP');unlinkSync(p);}
  writeFileSync(join(dir,'cleanup.json'),JSON.stringify({ownedFilesRemoved:owned.size,historyUnchanged:Object.entries(before).every(([p,hash])=>digest(readFileSync(p,'utf8'))===hash)}));
 }
 ensure(Object.entries(before).every(([p,hash])=>digest(readFileSync(p,'utf8'))===hash),'HISTORICAL_RECORD_CHANGED');
 ensure(canonical(snapshot())===canonical(before),'HISTORICAL_INVENTORY_CHANGED');
 const safe={mode,defaultPaths:mode==='default',processRestart:true,initialActions:state.result.initialActions.length,socialAccepted:state.result.society.usage.accepted,socialCalls:state.socialCalls,planningAndInitialMockCalls:state.initialCalls,totalEvents:state.result.society.counts.events,groups:state.result.society.groups.length,revision:state.result.session.revision,phase:state.result.society.phase,replayExact:true,historyRestored:true,noDuplicateSession:true,noInferenceOnRestoration:true,rawLeaks:0,historicalFilesPreserved:Object.keys(before).length,ownedFixturesCleaned:true};
 writeFileSync(join(output,'lifecycle-'+mode+'.json'),JSON.stringify(safe,null,2));console.log(JSON.stringify(safe));
}else{
 ensure(['create','recover'].includes(phase)&&stateArg,'OFFLINE_PHASE');const path=resolve(stateArg);ensure(path.startsWith(output+sep),'OFFLINE_STATE_PATH');
 const f=worldFixtures()[0];f.draft.ontology.entityTypes.push({id:'storage-comms',name:'Communication platform',description:'Offline storage fixture channels.'});for(const name of ['Reddit','Instagram','WhatsApp','Telegram'])f.draft.ontology.entities.push({id:name.toLowerCase(),name,typeId:'storage-comms',jurisdictionId:null,support:null,communication:{version:1,style:['WhatsApp','Telegram'].includes(name)?'private-group':name==='Reddit'?'public-discussion':'public-feed'}});
 const mock=mockDynamicProvider(f);let initialCalls=0,socialCalls=0;let state:any=JSON.parse(readFileSync(path,'utf8'));if(phase==='recover'){initialCalls=state.initialCalls;socialCalls=state.socialCalls;}
 const fetcher:typeof fetch=async(url,init)=>{const b=JSON.parse(String(init?.body));if(b.response_format.json_schema.name!=='social_decision_v1'){initialCalls++;return mock.fetcher(url,init);}socialCalls++;return Response.json({id:'mock-storage-'+socialCalls,model:b.model,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(socialProviderFixture(JSON.parse(b.messages[1].content)))}}],usage:{prompt_tokens:400,completion_tokens:150,total_tokens:550,cost:0.0001,completion_tokens_details:{reasoning_tokens:0}}});};
 const deps={enabled:true,key:'offline-storage-only',fetcher};
 if(phase==='create'){
  const r=await handlePublicExplore(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:state.attemptId,request:f.request})}),{...deps,groundingKey:''},deps);ensure(r.ok,'OFFLINE_EXPLORE');state={...state,result:await r.json()};writeFileSync(path,JSON.stringify({...state,initialCalls,socialCalls}));
  for(let n=0;n<5;n++){const p=state.result,r=await handlePublicSocial(post({operation:'continue',runId:p.runId,token:p.session.token,revision:p.session.revision}),deps);ensure(r.ok,'OFFLINE_CONTINUE');state.result=await r.json();}
  ensure(state.result.society.tick>0&&state.result.society.tick<80,'OFFLINE_PARTIAL');
 }else{
  const original=state.result,beforeCalls=socialCalls;const r=await handlePublicSocial(new Request('http://localhost/api/social-simulate?runId='+encodeURIComponent(original.runId)+'&token='+original.session.token),deps);ensure(r.ok,'OFFLINE_RESTORE');const restored=await r.json();ensure(restored.society.phase==='partial'&&restored.society.tick===original.society.tick,'OFFLINE_RESTART_STATE');ensure(socialCalls===beforeCalls,'OFFLINE_RESTORE_INFERENCE');
  const stored=JSON.parse(readFileSync(join(acceptedRoot,digest(original.runId)+'.json'),'utf8'));const duplicate=await registerAcceptedExecution(stored.execution,deps);ensure(duplicate.session!.id===original.session.id&&socialCalls===beforeCalls,'OFFLINE_DUPLICATE');
  for(let n=0;n<30&&state.result.society.phase!=='completed';n++){const p=state.result,r=await handlePublicSocial(post({operation:'continue',runId:p.runId,token:p.session.token,revision:p.session.revision}),deps);ensure(r.ok,'OFFLINE_RECOVER_CONTINUE');state.result=await r.json();}
  const p=state.result;ensure(p.society.phase==='completed'&&p.society.usage.accepted===8&&socialCalls===8&&initialCalls===10,'OFFLINE_FINAL_COUNTS');
  const internal=await handleSocialRequest(post({operation:'start',run:stored.execution.run}),deps);ensure(internal.ok,'OFFLINE_INTERNAL_RESTORE');const privateState=await internal.json();ensure(privateState.sessionId===p.session.id,'OFFLINE_SAME_SESSION');ensure(canonical(restoreSociety(saveSociety(privateState.world)))===canonical(privateState.world),'OFFLINE_EXACT_REPLAY');
  const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},key:(i:number)=>[...data.keys()][i]??null,get length(){return data.size;}};rememberSummary(storage,parsePublicExplore(p));ensure(readSummaryHistory(storage)[0].runId===p.runId,'OFFLINE_HISTORY');
  const restoredAgain=await(await handlePublicSocial(new Request('http://localhost/api/social-simulate?runId='+encodeURIComponent(p.runId)+'&token='+p.session.token),deps)).json();ensure(canonical(restoredAgain)===canonical(p)&&socialCalls===8,'OFFLINE_PUBLIC_RESTORE');
  ensure(!JSON.stringify({public:p,history:[...data.values()]}).includes('RAW_'),'OFFLINE_PRIVACY');
 }
 state.initialCalls=initialCalls;state.socialCalls=socialCalls;writeFileSync(path,JSON.stringify(state));
}
