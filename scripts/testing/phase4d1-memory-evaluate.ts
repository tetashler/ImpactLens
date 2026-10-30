/** Isolated server-side evaluation; no HTTP route or full Explore. Raw records stay in ignored private storage. */
import {mkdirSync,readFileSync,writeFileSync,openSync,writeSync,fsyncSync,closeSync,existsSync,unlinkSync,statSync,fstatSync} from 'node:fs';
import {resolve,join} from 'node:path';import {createHash} from 'node:crypto';
import {userInfo} from 'node:os';
import nextEnvironment from '@next/env';
import {buildMemoryStressFixture,buildMatchedMemoryAblation,offerMemoryFixtureContext,saveMemoryFixtureJournal,replayMemoryFixtureJournal,memoryResponseWire} from './phase4d1-memory-fixture.ts';
import {createSocialTransport} from '../../lib/server/inference/social.ts';import {buildDecisionContext,finishDecision} from '../../lib/society/hybrid.ts';
import type {MemoryRetrievalDiagnostics} from '../../lib/society/memory-diagnostics.ts';import type {InferenceCallRecord} from '../../lib/server/inference/deepseek.ts';
import {encodeMenuContext} from '../../lib/society/decision-menu.ts';import {publicSociety,summaryGraph} from '../../lib/server/society/summary.ts';import {aggregateFacts} from '../../lib/server/society/facts.ts';
import {privateStoreDirectory,verifyPrivateStore,replacePrivateCheckpoint} from '../../lib/server/society/storage.ts';import {canonical,ensure} from '../../lib/experiments/validation.ts';

interface RequestRecord {id:number;condition:string;contextHash:string;state:'reserved'|'accepted'|'rejected';reservedUsd:number;costUsd:number|null;inputTokens:number|null;outputTokens:number|null;identity:string|null;error:string|null;durationMs:number|null}
interface Ledger {version:1;task:string;requests:RequestRecord[];halted:boolean}
const mode=process.argv[2]??'offline';ensure(['offline','live','replay'].includes(mode),'MEMORY_EVAL_MODE');
const directory=resolve(process.env.IMPACTLENS_PHASE4D1_DIRECTORY??'tmp/phase4d1'),privateRoot=join(directory,'private');mkdirSync(privateRoot,{recursive:true,mode:0o700});
const digest=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
const live=mode==='live',journal=join(directory,live?'ledger.jsonl':'offline-ledger.jsonl'),resultFile=join(directory,live?'real-evaluation.json':'offline-evaluation.json');
const readLedger=():Ledger=>{if(!existsSync(journal))return {version:1,task:'phase4d1-memory',requests:[],halted:false};const text=readFileSync(journal,'utf8');ensure(text.endsWith('\n'),'MEMORY_LEDGER_INCOMPLETE');return JSON.parse(text.trimEnd().split('\n').at(-1)!);};
const saveLedger=(s:Ledger)=>{const fd=openSync(journal,'a',0o600);try{const text=JSON.stringify(s)+'\n';ensure(writeSync(fd,text)===Buffer.byteLength(text),'MEMORY_LEDGER_WRITE');fsyncSync(fd);}finally{closeSync(fd);}};
const reserveUsd=0.0135,limits={completions:8,usd:0.15}; // Conservative checked DigitalOcean input/output maximum; not an external prepaid cap.
const totals=(s:Ledger)=>({completions:s.requests.length,reportedUsd:s.requests.reduce((n,r)=>n+(r.costUsd??0),0),conservativeUsd:s.requests.reduce((n,r)=>n+(r.costUsd??r.reservedUsd),0),unknownCharges:s.requests.filter(r=>r.costUsd===null).length});
let native:typeof fetch=globalThis.fetch;

async function main(){
 if(mode==='replay'){await import('./offline-network.mjs');
  const safe=[];for(const label of ['A','B']){const record=JSON.parse(readFileSync(join(privateRoot,'live-'+label+'.json'),'utf8')),base=replayMemoryFixtureJournal(record.fixtureJournal),f=buildMemoryStressFixture(),pair=buildMatchedMemoryAblation({...f,world:base});const arm=label==='A'?pair.full:pair.control;ensure(digest(arm.context)===record.contextHash,'MEMORY_CONTEXT_REPLAY');const replay=finishDecision(offerMemoryFixtureContext(arm.world,arm.context),{decision:record.accepted.decision,usage:record.accepted.usage,error:record.accepted.error});ensure(digest(replay)===record.worldHash,'MEMORY_DECISION_REPLAY');const summary=publicSociety(replay),graph=summaryGraph({version:1,scenarioIdentity:'memory-private-audit',executionIdentity:replay.genesis.input.runId,nodes:[],edges:[],limitations:[]},summary),encoded=JSON.stringify({summary,graph,facts:aggregateFacts(replay,replay.events)});const privateStrings=[...replay.items.map(i=>i.text),...arm.context.memories.map(m=>m.text),record.accepted.decision?.text??''].filter(s=>s.length>=24);ensure(privateStrings.every(s=>!encoded.includes(s)),'MEMORY_PUBLIC_LEAK');safe.push({condition:label,contextExact:true,decisionExact:true,worldExact:true,publicLiteralLeaks:0});}console.log(JSON.stringify({replay:safe,providerCalls:0}));return;
 }
 if(live){
  ensure(process.env.IMPACTLENS_PHASE4D1_LIVE==='true'&&!/offline-network|provider-preload|live-guard/.test(process.env.NODE_OPTIONS??''),'MEMORY_LIVE_OPT_IN');
  nextEnvironment.loadEnvConfig(process.cwd(),false,{info:()=>{},error:()=>{throw Error('MEMORY_ENV_CONFIG');}});
  ensure(!Object.entries(process.env).some(([k,v])=>/MOCK|PREFLIGHT/.test(k)&&v==='true'),'MEMORY_MOCK_SWITCH');
  ensure(!!process.env.OPENROUTER_API_KEY?.trim(),'MEMORY_CREDENTIALS_REQUIRED');
  await verifyPrivateStore(privateStoreDirectory('accepted-private'));await verifyPrivateStore(privateStoreDirectory('social-sessions'));
  writeFileSync(join(directory,'storage-preflight.json'),JSON.stringify({account:userInfo().username,configuration:process.env.SOCIAL_STORAGE_ROOT?'trusted-override':'original-defaults',acceptedRoot:privateStoreDirectory('accepted-private'),sessionRoot:privateStoreDirectory('social-sessions'),durableProbe:true,paidRequests:0},null,2));
 }else{await import('./offline-network.mjs');native=globalThis.fetch;}
 await verifyPrivateStore(privateRoot);
 const f=buildMemoryStressFixture(),pair=buildMatchedMemoryAblation(f),fixtureJournal=saveMemoryFixtureJournal(f);
 ensure(canonical(replayMemoryFixtureJournal(fixtureJournal))===canonical(f.world),'MEMORY_FIXTURE_REPLAY');
 const old=f.world.items.find(i=>i.id===f.earlierItemId)!.text,distinct=old.match(/floor of ([0-9]+) dollars/)![1];
 ensure(encodeMenuContext(pair.full.context).includes(distinct)&&!encodeMenuContext(pair.control.context).includes(distinct),'MEMORY_ABLATION_LEAK');
 const initial=readLedger();ensure(!initial.halted&&!initial.requests.some(r=>r.state==='reserved')&&totals(initial).completions+2<=limits.completions&&totals(initial).conservativeUsd+2*reserveUsd<=limits.usd,'MEMORY_PAIR_BUDGET');
 // Check both arms before replacing any pending checkpoint. Repeating the CLI must preserve accepted evidence.
 for(const [condition,arm] of [['A',pair.full],['B',pair.control]] as const){ensure(!initial.requests.some(r=>r.contextHash===digest(arm.context))&&!existsSync(join(privateRoot,(live?'live-':'offline-')+condition+'.json')),'MEMORY_CONTEXT_DUPLICATE');}
 const results=[];
 for(const [condition,arm] of [['A',pair.full],['B',pair.control]] as const){
  let diagnostic:MemoryRetrievalDiagnostics|undefined;buildDecisionContext(arm.world,f.actorId,f.platform,v=>{diagnostic=v;});
  const contextHash=digest(arm.context),prefix=(live?'live-':'offline-')+condition,path=join(privateRoot,prefix+'.json');
  await replacePrivateCheckpoint(path,JSON.stringify({version:1,fixtureJournal,condition,contextHash,pending:arm.context}));
  let recordId:number|null=null;
  const guarded:typeof fetch=async(url,init)=>{
   const address=String(url);
   if(address.startsWith('https://openrouter.ai/api/v1/generation?')){ensure(recordId!==null,'MEMORY_IDENTITY_LOOKUP');return native(url,init);}
   ensure(address==='https://openrouter.ai/api/v1/chat/completions','MEMORY_PROVIDER_DENIED');const body=String(init?.body??'');ensure(Buffer.byteLength(body)<=98304,'MEMORY_REQUEST_BYTES');const b=JSON.parse(body);
   ensure(b.model==='deepseek/deepseek-v4-flash-0731'&&canonical(b.provider)===canonical({only:['digitalocean'],allow_fallbacks:false,require_parameters:true})&&canonical(b.reasoning)===canonical({effort:'none',exclude:true})&&b.max_tokens===600&&b.stream===false&&b.response_format?.type==='json_schema'&&b.response_format.json_schema.name==='social_decision_v1'&&b.response_format.json_schema.strict===true,'MEMORY_PROVIDER_CONFIG');
   const state=readLedger(),count=totals(state);ensure(!state.halted&&!state.requests.some(r=>r.state==='reserved')&&!state.requests.some(r=>r.contextHash===contextHash)&&count.completions<limits.completions&&count.conservativeUsd+reserveUsd<=limits.usd,'MEMORY_REQUEST_BUDGET');
   recordId=state.requests.length+1;state.requests.push({id:recordId,condition,contextHash,state:'reserved',reservedUsd:reserveUsd,costUsd:null,inputTokens:null,outputTokens:null,identity:null,error:null,durationMs:null});saveLedger(state);
   if(live)return native(url,init);
   const wire=memoryResponseWire(arm.context,f.targetItemId,condition==='A'?[f.earlierEventId]:[],condition==='A'?'The protected monthly floor should be confirmed before this fictional trial can launch.':'I do not have the earlier audit detail; confirm the floor before launch.');
   return Response.json({id:'mock-memory-'+condition,model:b.model,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(wire)}}],usage:{prompt_tokens:400,completion_tokens:120,total_tokens:520,cost:0.0001,completion_tokens_details:{reasoning_tokens:0}}});
  };
  const onRecord=(r:InferenceCallRecord)=>{if(recordId===null)return;const state=readLedger(),entry=state.requests.find(v=>v.id===recordId)!;Object.assign(entry,{state:r.status==='accepted'?'accepted':'rejected',costUsd:r.costUsd,inputTokens:r.inputTokens,outputTokens:r.outputTokens,identity:r.identityVerification,error:r.socialValidationRule??r.errorCode,durationMs:r.durationMs});if(r.errorCode==='AI_PROVIDER_IDENTITY'||totals(state).conservativeUsd>limits.usd)state.halted=true;saveLedger(state);};
  const transport=createSocialTransport({key:live?process.env.OPENROUTER_API_KEY!:'offline-memory-only',fetcher:guarded,onRecord});
  const out=await transport.generate(arm.context),next=finishDecision(offerMemoryFixtureContext(arm.world,arm.context),{decision:out.value,usage:out.record,error:null}),accepted=next.hybrid!.records.at(-1)!;
  await replacePrivateCheckpoint(path,JSON.stringify({version:1,fixtureJournal,condition,contextHash,accepted,worldHash:digest(next)}));
  const choice=arm.context.menu!.find(c=>c.id===accepted.decision?.selection?.choiceId)!,oldIndex=arm.context.memories.findIndex(m=>m.eventId===f.earlierEventId),oldRef=oldIndex>=0?'memory-'+(oldIndex+1):null;
  const required=new Set(choice.memoryIndices.map(i=>'memory-'+(i+1)));if(accepted.decision?.stance){const i=arm.context.memories.findIndex(m=>m.eventId===accepted.decision!.stance!.exposureId);required.add('memory-'+(i+1));}
  const text=accepted.decision?.text??'',specificFact=(text.match(/\b[0-9][0-9,]*(?:\.[0-9]+)?\b/g)??[]).some(n=>Number(n.replaceAll(',',''))===Number(distinct))||/two\s+thousand(?:\s+and)?\s+eight\s+hundred/i.test(text),payMeaning=/pay|floor|salary|earnings|monthly/i.test(text),approvalCondition=/before|until|launch|approv|confirm|condition/i.test(text),authored=['post','comment','reply','message','group-reply'].includes(accepted.decision?.action??'');
  const summary=JSON.stringify(publicSociety(next));ensure(!summary.includes(old)&&(!text||text.length<30||!summary.includes(text)),'MEMORY_PUBLIC_LEAK');
  const targetsCurrentQuestion=accepted.decision!.targetId===f.targetItemId,optionalOlderRecall=!!oldRef&&!required.has(oldRef)&&!!accepted.decision!.selection?.recallIds.includes(oldRef);
  results.push({condition,realProvider:live,status:accepted.status,action:accepted.decision!.action,targetsCurrentQuestion,diagnostic,contextHash,earlierAbsentShortTerm:true,oldEpisodeInContext:oldIndex>=0,explicitOlderRecall:!!oldRef&&!!accepted.decision!.selection?.recallIds.includes(oldRef),optionalOlderRecallBeyondTargetAndStance:optionalOlderRecall,olderBindingRequired:!!oldRef&&required.has(oldRef),specificOldFactCorrect:specificFact,payMeaning,approvalCondition,authored,unsupportedSpecificFact:condition==='B'&&specificFact,substantiveRecall:condition==='A'&&authored&&targetsCurrentQuestion&&oldIndex>=0&&optionalOlderRecall&&specificFact&&payMeaning&&approvalCondition,usage:{inputTokens:out.record.inputTokens,outputTokens:out.record.outputTokens,costUsd:out.record.costUsd,identity:out.record.identityVerification,durationMs:out.record.durationMs},privacy:{rawLiteralLeaks:0},worldHash:digest(next)});
 }
 const safe={mode,limits,results,totals:totals(readLedger()),fixture:{commands:f.commands.length,tick:f.world.tick,oldEventId:f.earlierEventId,oldItemId:f.earlierItemId,currentTargetId:f.targetItemId,contextDifferences:pair.differences.contextKeys,matchedActor:true,matchedLatestTarget:true},assessmentLimit:'Two stochastic decisions are exploratory. Specific-fact predicates are a safe diagnostic, not a blinded semantic evaluation.'};
 writeFileSync(resultFile,JSON.stringify(safe,null,2));console.log(JSON.stringify({mode,conditions:results.map(({condition,status,action,targetsCurrentQuestion,oldEpisodeInContext,explicitOlderRecall,optionalOlderRecallBeyondTargetAndStance,specificOldFactCorrect,unsupportedSpecificFact,substantiveRecall,usage})=>({condition,status,action,targetsCurrentQuestion,oldEpisodeInContext,explicitOlderRecall,optionalOlderRecallBeyondTargetAndStance,specificOldFactCorrect,unsupportedSpecificFact,substantiveRecall,usage})),totals:safe.totals}));
}
let lock:number|undefined;const lockPath=journal+'.lock';
try{if(mode!=='replay'){try{lock=openSync(lockPath,'wx',0o600);}catch{throw Error('MEMORY_LEDGER_LOCK');}}await main();}catch(error){const code=(error as {code?:string}).code,message=(error as Error).message;console.error(JSON.stringify({error:code&&/^[A-Z_]+$/.test(code)?code:/^(MEMORY_|SOCIAL_)[A-Z_]+$/.test(message)?message:'MEMORY_EVALUATION_FAILED',mode}));process.exitCode=1;}finally{if(lock!==undefined){const owned=fstatSync(lock);closeSync(lock);if(existsSync(lockPath)){const current=statSync(lockPath);if(current.ino===owned.ino&&current.dev===owned.dev)unlinkSync(lockPath);}}}
