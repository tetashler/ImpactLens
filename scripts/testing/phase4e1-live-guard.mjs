// Task-only real-provider admission. No fixtures, replacement outputs or automatic retries.
import {existsSync,mkdirSync,readFileSync,writeFileSync,openSync,closeSync,writeSync,fsyncSync,statSync,unlinkSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,join,sep} from 'node:path';

const root=fileURLToPath(new URL('../../',import.meta.url));
const directory=resolve(process.env.IMPACTLENS_PHASE4E1_LIVE_DIRECTORY??join(root,'tmp','phase4e1-live'));
const journal=join(directory,'ledger.jsonl'),projection=join(directory,'ledger.json'),lockPath=join(directory,'ledger.lock');
export const LIMITS=Object.freeze({attempts:3,tavilySearches:3,tavilyCredits:6,planning:6,action:24,social:210,socialPerAttempt:70,completions:240,usd:1,concurrent:1,requestBytes:98304});
export const RESERVED_USD=0.02;
export const SCENARIOS=Object.freeze({A:'What if Singapore introduces a nationwide four-day workweek instead of the traditional five-day workweek? How would this affect employees, businesses, productivity, wages, and the wider Singapore economy?',B:'What if Singapore introduces a new government-supported eldercare centre in Sengkang? How might nearby residents, caregivers, community organisations and service providers respond over time?'});
const hash=value=>createHash('sha256').update(value).digest('hex');
const check=value=>{if(!value)throw Error('PHASE4E1_TASK_GUARD');};
const finite=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
const integer=value=>Number.isSafeInteger(value)&&value>=0?value:null;
const safeId=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9:._-]{0,239}$/i.test(value)?value:null;
const model='deepseek/deepseek-v4-flash-0731';
const ocean=value=>typeof value==='string'&&value.toLowerCase()==='digitalocean';
const actions=new Set(['read','post','comment','reply','like','upvote','downvote','follow','unfollow','share','group-create','group-invite','group-join','group-leave','message','group-reply','inactive']);
let verifiedCache;
const stamp=()=>{const s=statSync(journal,{bigint:true});return `${s.ino}:${s.size}:${s.mtimeNs}`;};

function fresh(){return {version:1,task:'phase4e1-deep-live',limits:LIMITS,attempts:[],requests:[],blocked:[],halted:false};}
function readState(){
 if(!existsSync(journal))return {state:fresh(),head:'genesis',revision:0};
 const currentStamp=stamp();if(verifiedCache?.stamp===currentStamp)return structuredClone(verifiedCache.value);
 check(statSync(journal).size<128*1024*1024);const content=readFileSync(journal,'utf8');check(content.endsWith('\n'));
 let head='genesis',revision=0,state;
 for(const line of content.trimEnd().split('\n')){const row=JSON.parse(line);check(row.version===1&&row.previousHash===head&&row.revision===revision+1&&hash(JSON.stringify(row.state))===row.stateHash&&hash(row.previousHash+':'+row.revision+':'+row.stateHash)===row.hash);head=row.hash;revision=row.revision;state=row.state;}
 check(state?.version===1&&state.task==='phase4e1-deep-live'&&JSON.stringify(state.limits)===JSON.stringify(LIMITS)&&Array.isArray(state.requests)&&Array.isArray(state.attempts));
 const value={state,head,revision};verifiedCache={stamp:currentStamp,value:structuredClone(value)};return value;
}
function append(state,prior){
 const stateHash=hash(JSON.stringify(state)),revision=prior.revision+1,row={version:1,revision,previousHash:prior.head,stateHash,hash:hash(prior.head+':'+revision+':'+stateHash),state};
 const bytes=Buffer.from(JSON.stringify(row)+'\n');check(bytes.length<1048576);const fd=openSync(journal,'a');try{check(writeSync(fd,bytes)===bytes.length);fsyncSync(fd);}finally{closeSync(fd);}
 verifiedCache={stamp:stamp(),value:{state:structuredClone(state),head:row.hash,revision}};
 // Convenience projection only. The fsynced hash-chained journal is authoritative.
 try{writeFileSync(projection,JSON.stringify(state,null,2));}catch{/* Never substitute this file for the journal. */}
}
function mutate(operation){
 check(directory.startsWith(resolve(root,'tmp')+sep));mkdirSync(directory,{recursive:true});
 const identity=JSON.stringify({pid:process.pid,nonce:randomUUID()}),fd=openSync(lockPath,'wx');
 try{writeSync(fd,identity);const prior=readState(),result=operation(prior.state);append(prior.state,prior);return result;}
 finally{closeSync(fd);if(readFileSync(lockPath,'utf8')===identity)unlinkSync(lockPath);}
}
export function totals(d=readState().state){
 const o=d.requests.filter(r=>r.service==='openrouter'),t=d.requests.filter(r=>r.service==='tavily');
 const knownTokens=key=>o.every(r=>r[key]!==null)?o.reduce((n,r)=>n+r[key],0):null;
 return {attempts:d.attempts.length,planning:o.filter(r=>r.purpose==='planning').length,action:o.filter(r=>r.purpose==='action').length,social:o.filter(r=>r.purpose==='social').length,completions:o.length,tavilySearches:t.length,reportedUsd:o.reduce((n,r)=>n+(r.costUsd??0),0),conservativeUsd:o.reduce((n,r)=>n+(r.costUsd??r.reservedUsd),0),unknownCharges:o.filter(r=>r.costUsd===null).length,outstandingUsd:o.filter(r=>r.costUsd===null).reduce((n,r)=>n+r.reservedUsd,0),reportedCredits:t.reduce((n,r)=>n+(r.credits??0),0),conservativeCredits:t.reduce((n,r)=>n+(r.credits??r.reservedCredits),0),inputTokens:knownTokens('inputTokens'),outputTokens:knownTokens('outputTokens'),reservedTokens:o.filter(r=>r.inputTokens===null||r.outputTokens===null).reduce((n,r)=>n+r.reservedTokens,0),pending:d.requests.filter(r=>r.state==='pending').length,interrupted:d.requests.filter(r=>r.state==='interrupted'||r.state==='uncertain').length,halted:d.halted};
}
function fingerprint(){const names=[...new Set([...execFileSync('git',['diff','--name-only'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split('\n'),...execFileSync('git',['ls-files','--others','--exclude-standard'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split('\n')])].filter(p=>/^(app|components|lib|scripts)\//.test(p)&&!p.includes('..')&&existsSync(join(root,p))).sort();const result=createHash('sha256');for(const name of names)result.update(name+'\0').update(readFileSync(join(root,name)));return result.digest('hex');}
export function armAttempt(id,scenario='A'){
 return mutate(d=>{const s=totals(d);check(!d.halted&&Object.hasOwn(SCENARIOS,scenario)&&!d.attempts.some(a=>['passed','budget-limited'].includes(a.status))&&id===d.attempts.length+1&&id<=LIMITS.attempts&&!d.requests.some(r=>r.state==='pending')&&d.attempts.at(-1)?.status!=='armed');check(s.completions+11<=LIMITS.completions&&s.tavilySearches+1<=LIMITS.tavilySearches&&s.conservativeCredits+2<=LIMITS.tavilyCredits&&s.conservativeUsd+10*RESERVED_USD<=LIMITS.usd);d.attempts.push({id,scenario,codeFingerprint:fingerprint(),status:'armed',armedAt:new Date().toISOString(),admission:{planning:2,action:8,social:70,concurrency:1},armingCheckUsd:10*RESERVED_USD});return totals(d);});
}
export function finishAttempt(status){check(['failed','partial','passed','budget-limited','blocked'].includes(status));return mutate(d=>{check(d.attempts.at(-1)?.status==='armed'&&!d.requests.some(r=>r.state==='pending'));Object.assign(d.attempts.at(-1),{status,finishedAt:new Date().toISOString()});return totals(d);});}
/** Explicit operator acknowledgement only after verifying the original process is stopped. Never redispatches. */
export function acknowledgeInterrupted(id){return mutate(d=>{const record=d.requests.find(r=>r.id===id);check(record?.state==='pending');record.state='uncertain';record.acknowledgedAt=new Date().toISOString();return totals(d);});}

function contextShape(context,output){
 const choice=context.choices?.find(c=>c.id===output?.choiceId),target=context.items?.find(i=>i.id===choice?.target),peer=c=>['comment','reply','group-reply'].includes(c.action)&&context.items?.some(i=>i.id===c.target&&i.modelAuthored&&i.actorId!==context.actor?.id);
 return {actorId:safeId(context.actor?.id),tick:integer(context.tick),itemCount:Array.isArray(context.items)?context.items.length:null,memoryCount:Array.isArray(context.memories)?context.memories.length:null,episodicCount:context.memories?.filter(m=>m.origin==='episodic').length??0,offeredPeerReplies:context.choices?.filter(peer).length??0,selectedAction:actions.has(choice?.action)?choice.action:null,selectedPeerReply:!!choice&&peer(choice),targetKind:!choice?.target?'none':target?.groupId?'group-item':target?.parentId?'reply':target?'post':'other',optionalRecalls:Array.isArray(output?.recallIds)?output.recallIds.length:null,issueKind:['question','condition','disagreement','commitment','resolve','withdraw'].includes(output?.issueUpdate?.kind)?output.issueUpdate.kind:null};
}
function inspectResult(record,value,body,context){
 const usage=value?.usage??{};
 Object.assign(record,{inputTokens:integer(usage.prompt_tokens),outputTokens:integer(usage.completion_tokens),reasoningTokens:integer(usage.completion_tokens_details?.reasoning_tokens),costUsd:finite(usage.cost),credits:finite(usage.credits)});
 if(record.service==='tavily'){
  record.resultCount=Array.isArray(value.results)?value.results.length:null;
  record.sources=(value.results??[]).slice(0,5).flatMap(source=>{try{const u=new URL(source.url);return u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<=1000?[{title:String(source.title??'').slice(0,240),url:u.href,publishedAt:typeof source.published_date==='string'?source.published_date.slice(0,100):null}]:[];}catch{return [];}});
  return;
 }
 Object.assign(record,{generationId:safeId(value.id),model:value.model===model?model:null,provider:ocean(value.provider)?'DigitalOcean':null,identityVerification:value.model===model&&ocean(value.provider)?'completion':'unverified',identityMismatch:value.model!==undefined&&value.model!==model||value.provider!==undefined&&!ocean(value.provider),finishReason:['stop','length','error','content_filter','tool_calls'].includes(value.choices?.[0]?.finish_reason)?value.choices[0].finish_reason:null});
 if(record.httpStatus>=200&&record.httpStatus<300&&record.identityVerification==='unverified'&&!record.generationId)record.identityMismatch=true;
 if(value.error){const raw=JSON.stringify(value.error);record.upstreamCategory=/schema|anyof|\$defs|structured|regex|pattern|grammar/i.test(raw)?'structured-output':/rate.?limit|too many requests/i.test(raw)?'rate-limit':/timeout|timed out/i.test(raw)?'timeout':'upstream';record.upstreamDigest=hash(raw);}
 if(record.purpose==='social'){let output;try{output=JSON.parse(value.choices?.[0]?.message?.content);}catch{/* Structural metrics only; no output preservation. */}record.social=contextShape(context,output);}
 if(record.purpose==='planning'){try{const result=JSON.parse(value.choices?.[0]?.message?.content);record.planning={scope:['local','cross-border','international','undetermined'].includes(result.scope)?result.scope:null,jurisdictions:result.jurisdictions?.length??null,agentCount:result.agents?.length??null,entityCount:result.entities?.length??null,relationshipCount:result.relationships?.length??null};}catch{/* Raw provider text is never retained. */}}
}
function blocked(){try{mutate(d=>{d.blocked.push({at:new Date().toISOString(),rule:'TASK_REQUEST_REJECTED'});if(d.blocked.length>512)d.blocked=d.blocked.slice(-512);});}catch{/* Fail closed; never dispatch to compensate for a ledger error. */}}

export function createGuardedFetch(nativeFetch){
 return async function guardedFetch(url,init={}){
  const address=typeof url==='string'?url:url instanceof URL?url.href:url.url;
  const service=address==='https://api.tavily.com/search'?'tavily':address==='https://openrouter.ai/api/v1/chat/completions'?'openrouter':null;
  if(!service){
   if(/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//.test(address))return nativeFetch(url,init);
   if(address.startsWith('https://openrouter.ai/api/v1/generation?'))return generationDetails(nativeFetch,url,init,address);
   blocked();throw Error('PHASE4E1_TASK_GUARD');
  }
  let record;
  try{
   const raw=typeof init.body==='string'?init.body:typeof url?.clone==='function'?await url.clone().text():null;
   check(typeof raw==='string'&&Buffer.byteLength(raw)<=LIMITS.requestBytes&&(init.method??url.method)==='POST');const body=JSON.parse(raw),schema=body.response_format?.json_schema?.name;
   let context,purpose='retrieval',requestKey=null;
   if(service==='openrouter'){
    check(['dynamic_entities_v2','dynamic_relationships_v2','stakeholder_turn_v1','social_decision_v1'].includes(schema));purpose=schema.startsWith('dynamic_')?'planning':schema==='social_decision_v1'?'social':'action';
    check(body.model===model&&JSON.stringify(body.provider)===JSON.stringify({only:['digitalocean'],allow_fallbacks:false,require_parameters:true})&&JSON.stringify(body.reasoning)===JSON.stringify({effort:'none',exclude:true})&&body.stream===false&&body.response_format?.type==='json_schema'&&body.response_format.json_schema.strict===true&&(body.n===undefined||body.n===1)&&body.tools===undefined&&body.tool_choice===undefined);
    check(Number.isInteger(body.max_tokens)&&body.max_tokens>0&&body.max_tokens<=(purpose==='planning'?6000:purpose==='social'?600:800));
    context=JSON.parse(body.messages.find(m=>m.role==='user').content);const identity=purpose==='planning'?schema:purpose==='social'?safeId(context.id):integer(context.turnIndex);check(identity!==undefined&&identity!==null);
    if(purpose==='action')check(identity<8);
    if(purpose==='social')check(context.policy==='conversation-menu-v2'&&Number.isSafeInteger(context.tick)&&context.tick>=0&&context.tick<=80&&Buffer.byteLength(body.messages.find(m=>m.role==='user').content)<=24000);
    requestKey=hash(schema+':'+identity);
   }
   record=mutate(d=>{
    const attempt=d.attempts.at(-1),s=totals(d);check(!d.halted&&attempt?.status==='armed'&&!d.requests.some(r=>r.state==='pending'));
    const prior=d.requests.filter(r=>r.attempt===attempt.id);check(!requestKey||!prior.some(r=>r.requestKey===requestKey));
    if(service==='openrouter')check(prior.filter(r=>r.purpose===purpose).length<(purpose==='planning'?2:purpose==='action'?8:70)&&s[purpose]<LIMITS[purpose]&&s.completions<LIMITS.completions&&s.conservativeUsd+RESERVED_USD<=LIMITS.usd);
    else check(body.search_depth==='basic'&&Number.isInteger(body.max_results)&&body.max_results>=1&&body.max_results<=5&&body.auto_parameters===false&&!prior.some(r=>r.service==='tavily')&&s.tavilySearches<LIMITS.tavilySearches&&s.conservativeCredits+2<=LIMITS.tavilyCredits&&body.query===SCENARIOS[attempt.scenario]);
    const next={id:d.requests.length+1,attempt:attempt.id,service,purpose,schema:schema??null,requestKey,startedAt:new Date().toISOString(),state:'pending',reservedUsd:service==='openrouter'?RESERVED_USD:0,reservedCredits:service==='tavily'?2:0,reservedTokens:service==='openrouter'?Buffer.byteLength(raw)+2000+body.max_tokens:0,costUsd:null,credits:null,inputTokens:null,outputTokens:null};d.requests.push(next);return structuredClone(next);
   });
   const start=Date.now();
   try{const response=await nativeFetch(url,init);record.httpStatus=response.status;try{inspectResult(record,await response.clone().json(),body,context);}catch{/* Missing telemetry remains conservatively reserved. */}record.state='returned';return response;}
   catch(error){record.state='interrupted';throw error;}
   finally{record.durationMs=Date.now()-start;mutate(d=>{const index=d.requests.findIndex(r=>r.id===record.id);check(index>=0&&d.requests[index].state==='pending');d.requests[index]=record;const s=totals(d);if(record.identityMismatch||s.conservativeUsd>LIMITS.usd||s.conservativeCredits>LIMITS.tavilyCredits)d.halted=true;});}
  }catch(error){blocked();throw error;}
 };
}

async function generationDetails(nativeFetch,url,init,address){
 let requestId;
 try{
  const parsed=new URL(address),id=parsed.searchParams.get('id');check(parsed.searchParams.size===1&&safeId(id));
  requestId=mutate(d=>{check(!d.halted&&d.attempts.at(-1)?.status==='armed'&&!d.requests.some(r=>r.state==='pending'));const record=d.requests.findLast(r=>r.service==='openrouter'&&r.generationId===id&&r.identityVerification==='unverified');check(record&&!record.metadataChecked);record.metadataChecked=true;return record.id;});
  const response=await nativeFetch(url,init);let details;try{details=(await response.clone().json()).data;}catch{/* Fail closed below. */}
  mutate(d=>{const record=d.requests.find(r=>r.id===requestId);if(details?.id!==id||details?.model!==model||!ocean(details?.provider_name)){record.identityMismatch=true;d.halted=true;return;}Object.assign(record,{model,provider:'DigitalOcean',identityVerification:'generation-details',inputTokens:record.inputTokens??integer(details.native_tokens_prompt),outputTokens:record.outputTokens??integer(details.native_tokens_completion),costUsd:record.costUsd??finite(details.total_cost)});if(totals(d).conservativeUsd>LIMITS.usd)d.halted=true;});
  return response;
 }catch(error){if(requestId)try{mutate(d=>{d.halted=true;});}catch{/* Durable reservation remains. */}blocked();throw error;}
}

export function installLiveGuard(){
 check(process.env.IMPACTLENS_PHASE4E1_LIVE_GUARD==='true'&&!Object.entries(process.env).some(([key,value])=>/MOCK|PREFLIGHT/.test(key)&&value==='true')&&!/offline-network|provider-preload/.test(process.env.NODE_OPTIONS??'')&&!globalThis.fetch.toString().includes('OFFLINE_EXTERNAL_FETCH_BLOCKED'));
 if(!globalThis.__phase4e1LiveGuard){globalThis.fetch=createGuardedFetch(globalThis.fetch);globalThis.__phase4e1LiveGuard=true;}
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){const command=process.argv[2];console.log(JSON.stringify(command==='arm'?armAttempt(Number(process.argv[3]),process.argv[4]??'A'):command==='finish'?finishAttempt(process.argv[3]):command==='interrupt'?acknowledgeInterrupted(Number(process.argv[3])):totals(),null,2));}
else if(process.env.IMPACTLENS_PHASE4E1_LIVE_GUARD==='true')installLiveGuard();
