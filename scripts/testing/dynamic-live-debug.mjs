// Explicitly opt-in PAID acceptance. Never imported by the app or ordinary tests.
import {readFileSync,writeFileSync,existsSync,mkdirSync,openSync,closeSync,unlinkSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createDynamicPlanner,parseGeneratedDraft} from '../../lib/server/inference/planner.ts';
import {createDynamicPlan} from '../../lib/dynamic-scenarios/plan.ts';
import {createDynamicInput} from '../../lib/dynamic-scenarios/execution.ts';
import {parseStakeholderTurnOutput} from '../../lib/stakeholder-simulation/contract.ts';
import {MODEL} from '../../lib/server/inference/deepseek.ts';
const directory=new URL('../../tmp/dynamic-live/',import.meta.url),path=new URL('ledger.json',directory),lock=new URL('request.lock',directory);
mkdirSync(directory,{recursive:true});
const nativeFetch=globalThis.fetch,hash=v=>createHash('sha256').update(v).digest('hex');
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
const label=v=>typeof v==='string'&&/^[\w.:-]{1,200}$/.test(v)?v:null;
const save=v=>{const temp=new URL('ledger.next.json',directory);writeFileSync(temp,JSON.stringify(v,null,2));renameSync(temp,path);};
const read=()=>existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{version:1,task:'dynamic-live-20261029',ceilingUsd:0.50,reservationUsd:0.02,maxCalls:60,historicalLedgerSha256:existsSync(new URL('../live-debug/ledger.json',directory))?hash(readFileSync(new URL('../live-debug/ledger.json',directory))):null,calls:[]};
/** Bounded schema diagnostics: field paths and finite rule names, never rejected values. */
function schemaIssues(s,v,p='$',out=[]){
 const types=Array.isArray(s.type)?s.type:[s.type];const actual=v===null?'null':Array.isArray(v)?'array':typeof v;
 if(!types.some(t=>t===actual||t==='integer'&&Number.isSafeInteger(v))){out.push({path:p,rule:'type'});return out;}
 if(s.enum&&!s.enum.some(x=>x===v))out.push({path:p,rule:'enum'});
 if(actual==='object'){
  if(s.required?.some(k=>!Object.hasOwn(v,k)))out.push({path:p,rule:'required'});
  for(const k of Object.keys(v)){if(!s.properties?.[k]){out.push({path:p,rule:'additionalProperties'});continue;}schemaIssues(s.properties[k],v[k],`${p}.${k}`,out);}
 }
 if(actual==='array'){if(v.length<(s.minItems??0))out.push({path:p,rule:'minItems'});if(v.length>(s.maxItems??Infinity))out.push({path:p,rule:'maxItems'});v.slice(0,40).forEach((x,i)=>schemaIssues(s.items,x,`${p}[${i}]`,out));}
 if(actual==='string'){for(const [key,bad]of [['minLength',v.length<(s.minLength??0)],['maxLength',v.length>(s.maxLength??Infinity)],['pattern',s.pattern&&!new RegExp(s.pattern).test(v)]])if(bad)out.push({path:p,rule:key});}
 if(actual==='number'&&(v<(s.minimum??-Infinity)||v>(s.maximum??Infinity)))out.push({path:p,rule:'range'});
 return out;
}
const semanticCategory=e=>({
 'Local scope cannot contain multiple relevant jurisdictions.':'scope-consistency','Duplicate generated ID.':'duplicate-id','Unknown generated entity.':'entity-reference','Invalid generated relationship.':'relationship-reference','Each agent needs an interaction opportunity.':'isolated-agent','Interaction opportunities must connect all agents.':'disconnected-relationships','No verified finding registry supplied.':'evidence-reference','Generated quantitative claims are unsupported.':'quantitative-claim','Planner citations require a verified source registry.':'citation-url','User conditions must quote the actual question.':'user-quotation',
}[e instanceof Error?e.message:'']??'other-local-validation');
async function safeJson(response){const reader=response.body?.getReader();if(!reader)return null;let size=0;const chunks=[];try{while(true){const n=await reader.read();if(n.done)break;size+=n.value.byteLength;if(size>1048576){void reader.cancel().catch(()=>{});return null;}chunks.push(n.value);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}finally{reader.releaseLock();}}
async function guardedFetch(input,init){
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 if(url!=='https://openrouter.ai/api/v1/chat/completions'){
  if(/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)||/^https:\/\/openrouter\.ai\/api\/v1\/generation\?id=[\w.:%-]+$/.test(url))return nativeFetch(input,init);
  throw Error('Only fixed inference, identity lookup and loopback requests are permitted by acceptance guard');
 }
 init??={};const text=typeof init.body==='string'?init.body:typeof input.clone==='function'?await input.clone().text():String(init.body);
 const body=JSON.parse(text),purpose=body.response_format?.json_schema?.name;
 if(body.model!==MODEL||JSON.stringify(body.provider)!==JSON.stringify({only:['digitalocean'],allow_fallbacks:false,require_parameters:true})||body.reasoning?.effort!=='none'||body.reasoning?.exclude!==true||!['dynamic_scenario_v1','stakeholder_turn_v1'].includes(purpose)||!Number.isSafeInteger(body.max_tokens)||body.max_tokens<1||body.max_tokens>(purpose==='dynamic_scenario_v1'?3000:1200)||Buffer.byteLength(text)>48000)throw Error('Acceptance route/reasoning/size bound rejected');
 const pricing=JSON.parse(readFileSync(new URL('pricing.json',directory),'utf8'));
 if(pricing.model!==MODEL||pricing.provider!=='digitalocean'||Date.now()-Date.parse(pricing.checkedAt)>14400000||!(pricing.prompt>0&&pricing.prompt<=0.00000025&&pricing.completion>0&&pricing.completion<=0.0000005))throw Error('Fresh conservative pricing verification required');
 // At the verified price ceilings, 48k input bytes + 3k output tokens cost <= USD .0135.
 // Reserve .02 before sending; unknown or interrupted calls never release that reservation.
 const fd=openSync(lock,'wx');writeFileSync(fd,JSON.stringify({pid:process.pid,at:new Date().toISOString()}));closeSync(fd);
 let ledger,entry;
 try{
  ledger=read();assertAcceptanceBudget(ledger);
  const user=JSON.parse(body.messages.find(m=>m.role==='user').content),q=user.question??user.input?.question??'';
  const scenario=q==='What if Singapore introduces a four-day workweek?'?'workweek':q==='What if Malaysia restricts water exports to Singapore?'?'water':q==='What if Singapore introduces universal basic income?'?'basic-income':'other';
  entry={test:ledger.calls.length+1,stage:process.env.DYNAMIC_TEST_STAGE??'browser',scenario,purpose:purpose==='dynamic_scenario_v1'?'planning':'action',time:new Date().toISOString(),model:MODEL,requestedProvider:'digitalocean',outputCap:body.max_tokens,inputBytes:Buffer.byteLength(text),accountedUsd:ledger.reservationUsd,costUsd:null,outcome:'reserved'};ledger.calls.push(entry);save(ledger);const start=Date.now();
  try{
   const response=await nativeFetch(input,init);entry.http=response.status;const retry=response.headers.get('retry-after');entry.retryAfterSeconds=retry&&/^\d{1,8}$/.test(retry)?Number(retry):null;
   const raw=await safeJson(response.clone()),choice=raw?.choices?.[0],content=choice?.message?.content,u=raw?.usage??{};
   Object.assign(entry,{generationId:label(raw?.id),servingModel:raw?.model===MODEL?MODEL:null,servingProvider:typeof raw?.provider==='string'&&raw.provider.toLowerCase()==='digitalocean'?'DigitalOcean':null,finishReason:label(choice?.finish_reason),nativeFinishReason:label(choice?.native_finish_reason),inputTokens:finite(u.prompt_tokens),outputTokens:finite(u.completion_tokens),reasoningTokens:finite(u.completion_tokens_details?.reasoning_tokens),costUsd:finite(u.cost),contentBytes:typeof content==='string'?Buffer.byteLength(content):null,jsonValid:false,schemaValid:null,semanticValid:null,outcome:response.ok?'received':'http-error'});
   let parsed;try{if(typeof content==='string'){parsed=JSON.parse(content);entry.jsonValid=true;}}catch{}
   if(parsed){const issues=schemaIssues(body.response_format.json_schema.schema,parsed);entry.schemaValid=!issues.length;entry.schemaIssues=issues.slice(0,10);try{
    if(entry.purpose==='planning'){parseGeneratedDraft(parsed,{version:1,question:q,geometry:{version:1,scenarioId:'diagnostic',features:[]},geometryRevision:0});entry.agentCount=parsed.agents.length;entry.uniqueAgentIds=new Set(parsed.agents.map(a=>a.id)).size;entry.relationshipCount=parsed.relationships.length;entry.scope=parsed.scope;entry.singaporeMentioned=parsed.jurisdictions.some(j=>j.label.toLowerCase()==='singapore');entry.malaysiaMentioned=parsed.jurisdictions.some(j=>j.label.toLowerCase()==='malaysia');}
    else{parseStakeholderTurnOutput(parsed,user);entry.priorEventReferences=parsed.previousEventIds.length;}
    entry.semanticValid=true;
   }catch(e){entry.semanticValid=false;if(entry.purpose==='planning'&&Array.isArray(parsed.relationships))entry.invalidRelationships=parsed.relationships.map((r,i)=>({index:i,unknownSource:!parsed.agents?.some(a=>a.id===r.sourceAgentId),unknownTarget:!parsed.agents?.some(a=>a.id===r.targetAgentId),self:r.sourceAgentId===r.targetAgentId})).filter(r=>r.unknownSource||r.unknownTarget||r.self);entry.validationCategory=entry.purpose==='planning'?semanticCategory(e):['Cite evidence IDs instead of source URLs','Quantitative societal claims are unsupported in stakeholder dialogue','Later turns must reference another recorded participant','A revision must reference the participant previous event','A changed position requires a recorded revision','Interaction requires a prior event'].includes(e?.message)?e.message:'other-action-validation';}}
   if(entry.costUsd!==null)entry.accountedUsd=Math.max(entry.costUsd,0.000001);entry.latencyMs=Date.now()-start;save(ledger);return response;
  }catch{entry.outcome='interrupted';entry.latencyMs=Date.now()-start;save(ledger);throw Error('Acceptance transport interrupted; reservation retained');}
 }finally{unlinkSync(lock);}
}
/** Reject corrupted accounting rather than interpreting unknown charges as zero. */
export function assertAcceptanceBudget(ledger){
 if(ledger.task!=='dynamic-live-20261029'||ledger.ceilingUsd!==0.50||ledger.reservationUsd!==0.02||ledger.maxCalls!==60||!Array.isArray(ledger.calls)||ledger.calls.some(e=>typeof e.accountedUsd!=='number'||!Number.isFinite(e.accountedUsd)||e.accountedUsd<0.000001))throw Error('Invalid acceptance ledger');
 if(ledger.calls.length>=60||ledger.calls.reduce((n,e)=>n+e.accountedUsd,0)+0.02>0.50+1e-12)throw Error('New-task spending/call ceiling reached');
}
export async function guardedDynamicFetch(input,init){
 try{return await guardedFetch(input,init);}catch(e){
  const allowed=['Only fixed inference, identity lookup and loopback requests are permitted by acceptance guard','Acceptance route/reasoning/size bound rejected','Fresh conservative pricing verification required','New-task spending/call ceiling reached','Acceptance transport interrupted; reservation retained','Invalid acceptance ledger'];
  const category=allowed.includes(e?.message)?e.message:['EEXIST','EPERM','EACCES','ENOENT'].includes(e?.code)?e.code:e?.name==='SyntaxError'?'guard-json-parse':'other-guard-error';
  writeFileSync(new URL('guard-failure.json',directory),JSON.stringify({time:new Date().toISOString(),category},null,2));throw e;
 }
}
if(process.argv[1]?.endsWith('dynamic-live-debug.mjs')){
 const topic=process.argv[2]??'workweek',q=topic==='water'?'What if Malaysia restricts water exports to Singapore?':topic==='basic-income'?'What if Singapore introduces universal basic income?':'What if Singapore introduces a four-day workweek?';
 const request={version:1,question:q,geometry:{version:1,scenarioId:'live-acceptance',features:[]},geometryRevision:0};
 const planner=createDynamicPlanner({key:process.env.OPENROUTER_API_KEY??'',fetcher:guardedDynamicFetch});
 try{const result=await planner.generate(request);const plan=await createDynamicPlan(request,result.value);await createDynamicInput(plan);console.log(JSON.stringify({accepted:true,planId:plan.planId,agents:plan.draft.agents.map(a=>({id:a.id,category:a.category})),scope:plan.draft.scope,record:result.record}));}
 catch(e){console.log(JSON.stringify({accepted:false,code:e.code??'LOCAL_VALIDATION',record:planner.records.at(-1)}));}
 const ledger=read();console.log(JSON.stringify({calls:ledger.calls.length,accountedUsd:ledger.calls.reduce((n,e)=>n+e.accountedUsd,0),latest:ledger.calls.at(-1)}));
}
