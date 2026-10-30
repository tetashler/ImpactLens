// Task-only REAL-provider pass-through: no fixtures, replacement outputs, or retries.
import {existsSync,mkdirSync,readFileSync,writeFileSync,openSync,closeSync,writeSync,fsyncSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const directory=process.env.IMPACTLENS_PHASE4C_GUARD_DIRECTORY??fileURLToPath(new URL('../../tmp/phase4c-live/',import.meta.url));
mkdirSync(directory,{recursive:true});
const journal=directory+'/ledger.jsonl',file=directory+'/ledger.json';
const limits={attempts:2,tavilySearches:2,tavilyCredits:8,planning:4,action:16,social:16,completions:36,usd:0.5};
const reserveUsd=0.0135; // >= 98,304 input bytes/tokens + 6,000 output tokens at the checked DigitalOcean rates.
function check(value){if(!value)throw Error('PHASE4C_TASK_GUARD');}
function read(){
 if(!existsSync(journal))return {version:1,task:'phase4c-two-run-live',limits,attempts:[],requests:[],blocked:[]};
 check(statSync(journal).size<8*1024*1024);const text=readFileSync(journal,'utf8');check(text.endsWith('\n'));return JSON.parse(text.trimEnd().split('\n').at(-1));
}
function save(d){const line=JSON.stringify(d)+'\n';check(Buffer.byteLength(line)<1048576);const fd=openSync(journal,'a');try{check(writeSync(fd,line)===Buffer.byteLength(line));fsyncSync(fd);}finally{closeSync(fd);}try{writeFileSync(file,JSON.stringify(d,null,2));}catch{/* Journal is authoritative. */}}
export function totals(d=read()){
 const o=d.requests.filter(r=>r.service==='openrouter'),t=d.requests.filter(r=>r.service==='tavily');
 return {attempts:d.attempts.length,planning:o.filter(r=>r.purpose==='planning').length,action:o.filter(r=>r.purpose==='action').length,social:o.filter(r=>r.purpose==='social').length,completions:o.length,tavilySearches:t.length,reportedUsd:o.reduce((n,r)=>n+(r.costUsd??0),0),conservativeUsd:o.reduce((n,r)=>n+(r.costUsd??r.reservedUsd),0),unknownCharges:o.filter(r=>r.costUsd===null).length,reportedCredits:t.reduce((n,r)=>n+(r.credits??0),0),conservativeCredits:t.reduce((n,r)=>n+(r.credits??r.reservedCredits),0),inputTokens:o.every(r=>r.inputTokens!=null)?o.reduce((n,r)=>n+r.inputTokens,0):null,outputTokens:o.every(r=>r.outputTokens!=null)?o.reduce((n,r)=>n+r.outputTokens,0):null};
}
export function armAttempt(id){const d=read(),s=totals(d);check(!d.halted&&id===d.attempts.length+1&&id<=2&&!d.requests.some(r=>r.state==='pending')&&d.attempts.at(-1)?.status!=='armed');check(s.completions+18<=36&&s.planning+2<=4&&s.action+8<=16&&s.social+8<=16&&s.tavilySearches+1<=2&&s.conservativeCredits+4<=8&&s.conservativeUsd+18*reserveUsd<=0.5);d.attempts.push({id,status:'armed',armedAt:new Date().toISOString(),reservation:{planning:2,action:8,social:8,usd:18*reserveUsd,tavilyCredits:4}});save(d);return totals(d);}
export function finishAttempt(status){check(['failed','partial','passed'].includes(status));const d=read();check(d.attempts.at(-1)?.status==='armed'&&!d.requests.some(r=>r.state==='pending'));Object.assign(d.attempts.at(-1),{status,finishedAt:new Date().toISOString()});save(d);return totals(d);}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const command=process.argv[2];console.log(JSON.stringify(command==='arm'?armAttempt(Number(process.argv[3])):command==='finish'?finishAttempt(process.argv[3]):totals(),null,2));
}else if(process.env.IMPACTLENS_PHASE4C_LIVE_GUARD==='true'&&!globalThis.__phase4cLiveGuard){
 globalThis.__phase4cLiveGuard=true;const native=globalThis.fetch;
 globalThis.fetch=async(url,init={})=>{
  const address=typeof url==='string'?url:url instanceof URL?url.href:url.url;
  const service=address==='https://api.tavily.com/search'?'tavily':address==='https://openrouter.ai/api/v1/chat/completions'?'openrouter':null;
  if(!service){check(address.startsWith('https://openrouter.ai/api/v1/generation?')||/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//.test(address));return native(url,init);}
  let d;
  try{
   const body=typeof init.body==='string'?init.body:typeof url?.clone==='function'?await url.clone().text():null;check(typeof body==='string'&&Buffer.byteLength(body)<=98304);const b=JSON.parse(body);
   d=read();const attempt=d.attempts.at(-1),s=totals(d);check(!d.halted&&attempt?.status==='armed'&&!d.requests.some(r=>r.state==='pending'));
   const prior=d.requests.filter(r=>r.attempt===attempt.id),schema=service==='openrouter'?b.response_format?.json_schema?.name:null;
   let purpose='retrieval',requestKey=null;
   if(service==='openrouter'){
    check(['dynamic_entities_v2','dynamic_relationships_v2','stakeholder_turn_v1','social_decision_v1'].includes(schema));purpose=schema.startsWith('dynamic_')?'planning':schema==='social_decision_v1'?'social':'action';
    check(b.model==='deepseek/deepseek-v4-flash-0731'&&JSON.stringify(b.provider)===JSON.stringify({only:['digitalocean'],allow_fallbacks:false,require_parameters:true})&&b.reasoning?.effort==='none'&&b.reasoning?.exclude===true&&b.stream===false&&b.response_format?.type==='json_schema'&&b.response_format.json_schema.strict===true);
    check(Number.isInteger(b.max_tokens)&&b.max_tokens>0&&b.max_tokens<=(purpose==='planning'?6000:purpose==='social'?600:800));
    const context=JSON.parse(b.messages.find(m=>m.role==='user').content),identity=purpose==='planning'?schema:purpose==='social'?context.id:context.turnIndex;check(identity!==undefined);
    requestKey=createHash('sha256').update(schema+':'+identity).digest('hex');check(!prior.some(r=>r.requestKey===requestKey));
    check(prior.filter(r=>r.purpose===purpose).length<(purpose==='planning'?2:8)&&s[purpose]<limits[purpose]&&s.completions<36&&s.conservativeUsd+reserveUsd<=0.5);
   }else check(b.search_depth==='basic'&&b.max_results<=5&&b.auto_parameters===false&&!prior.some(r=>r.service==='tavily')&&s.tavilySearches<2&&s.conservativeCredits+4<=8);
   const record={id:d.requests.length+1,attempt:attempt.id,service,purpose,schema,requestKey,startedAt:new Date().toISOString(),state:'pending',reservedUsd:service==='openrouter'?reserveUsd:0,reservedCredits:service==='tavily'?4:0,costUsd:null,credits:null,inputTokens:null,outputTokens:null};
   d.requests.push(record);save(d);const start=Date.now();
   try{
    const response=await native(url,init);record.httpStatus=response.status;
    // Clone is consumed only in memory for finite telemetry; never persist provider content or prompts.
    try{const v=await response.clone().json(),u=v.usage??{};const number=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;Object.assign(record,{inputTokens:number(u.prompt_tokens),outputTokens:number(u.completion_tokens),reasoningTokens:number(u.completion_tokens_details?.reasoning_tokens),costUsd:number(u.cost),credits:number(u.credits),model:v.model==='deepseek/deepseek-v4-flash-0731'?v.model:null,provider:typeof v.provider==='string'&&v.provider.toLowerCase()==='digitalocean'?'DigitalOcean':null,finishReason:['stop','length','error','content_filter','tool_calls'].includes(v.choices?.[0]?.finish_reason)?v.choices[0].finish_reason:null,resultCount:Array.isArray(v.results)?v.results.length:null});if(service==='openrouter'&&(v.model!==undefined&&record.model===null||v.provider!==undefined&&record.provider===null))record.identityMismatch=true;}catch{/* Unknown billing retains its reservation. */}
    record.state='returned';return response;
   }catch(error){record.state='interrupted';throw error;}
   finally{record.durationMs=Date.now()-start;const latest=read();latest.requests[record.id-1]=record;if(record.identityMismatch||totals(latest).conservativeUsd>0.5||totals(latest).conservativeCredits>8)latest.halted=true;save(latest);}
  }catch(error){const latest=read();latest.blocked.push({at:new Date().toISOString(),rule:'TASK_REQUEST_REJECTED'});save(latest);throw error;}
 };
}
