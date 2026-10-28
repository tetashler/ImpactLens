// Opt-in paid acceptance tooling. Never imported by the application or npm tests.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createDeepseekTransport,MODEL} from '../../lib/server/inference/deepseek.ts';
import {turnRejectionCode} from '../../lib/stakeholder-simulation/inference-errors.ts';
import {createLiveInput} from '../../lib/stakeholder-simulation/inference-input.ts';
import {deterministicTurn,runStakeholderSimulation} from '../../lib/stakeholder-simulation/engine.ts';
import {parseStakeholderTurnOutput} from '../../lib/stakeholder-simulation/contract.ts';
const path=new URL('../../tmp/live-debug/ledger.json',import.meta.url);
mkdirSync(new URL('../../tmp/live-debug/',import.meta.url),{recursive:true});
const nativeFetch=globalThis.fetch;
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
const label=v=>typeof v==='string'&&/^[\w.:/-]{1,200}$/.test(v)?v:null;
export async function budgetFetch(url,init){
 if(String(url)!=='https://openrouter.ai/api/v1/chat/completions')return nativeFetch(url,init);
 const body=JSON.parse(String(init.body));
 if(body.model!==MODEL||JSON.stringify(body.provider)!==JSON.stringify({only:['digitalocean'],allow_fallbacks:false,require_parameters:true})||body.max_tokens>1200)throw Error('Diagnostic routing/cap rejected');
 const ledger=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):[];
 if(ledger.length>=64||ledger.reduce((n,e)=>n+e.budgetChargeUsd,0)+0.05>2)throw Error('Independent test budget exhausted');
 const entry={test:ledger.length+1,time:new Date().toISOString(),model:MODEL,requestedProvider:'digitalocean',outputCap:body.max_tokens,reasoning:body.reasoning??null,budgetChargeUsd:0.05,costUsd:null,result:'reserved'};
 ledger.push(entry);writeFileSync(path,JSON.stringify(ledger,null,2));
 try{
  const r=await nativeFetch(url,init);const j=await r.clone().json();const c=j.choices?.[0],content=c?.message?.content,u=j.usage??{};
  const retry=r.headers.get('retry-after');const em=j.error?.metadata;
  Object.assign(entry,{retryAfterSeconds:retry&&/^\d{1,8}$/.test(retry)?Number(retry):null,limitSource:['openrouter_in_flight_budget','openrouter_key_limit','openrouter_credits'].includes(em?.limit_source)?em.limit_source:null,http:r.status,generationId:label(j.id),finishReason:label(c?.finish_reason),nativeFinishReason:label(c?.native_finish_reason),servingModel:j.model===MODEL?MODEL:null,servingProvider:typeof j.provider==='string'&&j.provider.toLowerCase()==='digitalocean'?'DigitalOcean':null,promptBytes:Buffer.byteLength(body.messages.find(m=>m.role==='user').content),inputTokens:finite(u.prompt_tokens),outputTokens:finite(u.completion_tokens),reasoningTokens:finite(u.completion_tokens_details?.reasoning_tokens),costUsd:finite(u.cost),contentBytes:typeof content==='string'?Buffer.byteLength(content):null,jsonValid:false,actionValid:false,referencesValid:null,result:r.ok?'received':'http-error'});
  let action;try{if(typeof content==='string'){action=JSON.parse(content);entry.jsonValid=true;}}catch{}
  if(action){const context=JSON.parse(body.messages.find(m=>m.role==='user').content);
   entry.eventType=typeof action.type==='string'&&['argument','response','challenge-assumption','evidence-question','acknowledgement','revision'].includes(action.type)?action.type:null;entry.previousReferenceCount=Array.isArray(action.previousEventIds)?action.previousEventIds.length:null;
   entry.addressedRoleCategory=action.addressedRoleId===null?'none':action.addressedRoleId===context.role.id?'self':context.input.stakeholderRoles.some(r=>r.id===action.addressedRoleId)?'other-known':'unknown';
   entry.referencesValid=Array.isArray(action.previousEventIds)&&Array.isArray(action.evidenceFindingIds)&&Array.isArray(action.assumptionIds)&&action.previousEventIds.every(id=>context.previousEvents.some(e=>e.id===id))&&action.evidenceFindingIds.every(id=>context.input.evidence?.findings.some(f=>f.id===id))&&action.assumptionIds.every(id=>context.input.assumptions.some(a=>a.id===id));
   try{parseStakeholderTurnOutput(action,context);entry.actionValid=true;}catch(error){entry.errorCategory=turnRejectionCode(error);entry.validationRule=['Cite evidence IDs instead of source URLs','Quantitative societal claims are unsupported in stakeholder dialogue','Later turns must reference another recorded participant','A revision must reference the participant previous event','A changed position requires a recorded revision','Interaction requires a prior event'].indexOf(error.message);}
  }
  if(!r.ok)entry.errorCategory=r.status===429?'AI_RATE_LIMIT':r.status===402?'AI_CREDITS':'AI_UPSTREAM';
  else if(entry.finishReason!=='stop')entry.errorCategory='AI_RESPONSE_INCOMPLETE';
  else if(!entry.jsonValid)entry.errorCategory='AI_RESPONSE_JSON';
  else if(entry.actionValid)entry.errorCategory=null;
  if(entry.costUsd!==null)entry.budgetChargeUsd=Math.max(entry.costUsd,0.000001);
  writeFileSync(path,JSON.stringify(ledger,null,2));return r;
 }catch{entry.result='transport-interrupted';writeFileSync(path,JSON.stringify(ledger,null,2));throw Error('Diagnostic transport interrupted; reservation retained');}
}
if(process.argv[1]?.endsWith('live-provider-debug.mjs')){
 const domain=process.argv[2]??'import-tax',mode=process.argv[3]??'one';
 const question=domain==='asean'?'What if Singapore leaves ASEAN?':'What if Singapore increases tax on imported goods?';
 const input=createLiveInput(domain,question);if(mode!=='full'&&mode!=='foreign'){input.stakeholderRoles=input.stakeholderRoles.slice(0,2);input.simulationOptions.rounds=mode==='rounds'?2:1;}if(mode==='foreign')input.simulationOptions.rounds=1;
 const transport=createDeepseekTransport({key:process.env.OPENROUTER_API_KEY??'',fetcher:budgetFetch,maxOutputTokens:Number(process.env.DEBUG_OUTPUT_CAP??800),timeoutMs:30000});
 if(mode==='one'){
  const role=input.stakeholderRoles[0],context={input,role,turnIndex:0,round:1,checkpointYear:0,previousEvents:[],memory:{roleId:role.id,eventIds:[],position:null,citedFindingIds:[],concerns:[],uncertainties:[]}};
  try{const result=await transport.generate(context);console.log(JSON.stringify({accepted:true,record:result.record}));}catch(e){console.log(JSON.stringify({accepted:false,code:e.code??'UNKNOWN',record:transport.records.at(-1)}));}
 }else{
  const run=await runStakeholderSimulation(input,{attemptId:`paid-${crypto.randomUUID()}`,provider:'openrouter',model:MODEL,generateTurn:async(c,s)=>mode==='foreign'&&c.turnIndex<3?deterministicTurn(c):(await transport.generate(c,s)).value});
  console.log(JSON.stringify({diagnosticMode:mode==='foreign'?'one-live-turn-with-three-scripted-context-turns':'all-live',status:run.status,events:run.events.length,interactions:run.events.map(e=>({turn:e.turnIndex,role:e.roleId,priorReferences:e.previousEventIds.length,positionChange:e.positionChange})),error:run.error,records:transport.records}));
 }
 const ledger=JSON.parse(readFileSync(path,'utf8'));console.log(JSON.stringify({latest:ledger.at(-1),calls:ledger.length,cumulativeBudgetChargeUsd:ledger.reduce((n,e)=>n+e.budgetChargeUsd,0)}));
}
