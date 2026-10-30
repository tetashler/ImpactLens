// Opt-in REAL-provider pass-through for this task. No fixtures, synthetic replies or retries.
import {existsSync,mkdirSync,readFileSync,writeFileSync,openSync,closeSync,writeSync,readSync,fsyncSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const directory=process.env.IMPACTLENS_GUARD_OFFLINE_TEST_DIRECTORY??fileURLToPath(new URL('../../tmp/staged-planner/live/',import.meta.url));
mkdirSync(directory,{recursive:true});const file=`${directory}/ledger.json`;
const limits={attempts:20,tavilySearches:25,tavilyCredits:50,completions:180,usd:2};
const journal=`${directory}/ledger.jsonl`;
function read(){
 if(existsSync(journal)){const size=statSync(journal).size;if(size>67108864)throw Error('Task journal bound exceeded.');const count=Math.min(size,1048576),buffer=Buffer.alloc(count),fd=openSync(journal,'r');try{readSync(fd,buffer,0,count,size-count);}finally{closeSync(fd);}const tail=buffer.toString('utf8');if(!tail.endsWith('\n'))throw Error('Incomplete durable ledger; manual audit required.');return JSON.parse(tail.slice(tail.lastIndexOf('\n',tail.length-2)+1,-1));}
 return existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{version:1,task:'phase2b-registered-stages',limits,attempts:[],requests:[]};
}
function save(d){
 // Authoritative append-only, flushed journal avoids Windows/OneDrive replacement locks.
 const line=JSON.stringify(d)+'\n';if(Buffer.byteLength(line)>1048576)throw Error('Task snapshot bound exceeded.');const fd=openSync(journal,'a');try{if(writeSync(fd,line)!==Buffer.byteLength(line))throw Error('Incomplete task journal write.');fsyncSync(fd);}finally{closeSync(fd);}
 // Human-readable summary is best effort; budget decisions always read the journal.
 try{writeFileSync(file,JSON.stringify(d,null,2));}catch{/* Authoritative journal is already durable. */}
}
function totals(d){const o=d.requests.filter(r=>r.service==='openrouter'),t=d.requests.filter(r=>r.service==='tavily');return {attempts:d.attempts.length,completions:o.length,tavilySearches:t.length,reportedUsd:o.reduce((n,r)=>n+(r.costUsd??0),0),conservativeUsd:o.reduce((n,r)=>n+(r.costUsd??r.reservedUsd),0),reportedCredits:t.reduce((n,r)=>n+(r.credits??0),0),conservativeCredits:t.reduce((n,r)=>n+(r.credits??r.reservedCredits),0)};}
export function armAttempt(){const d=read(),s=totals(d);if(d.attempts.some(a=>a.status==='passed'))throw Error('Task acceptance already passed; no further paid attempts.');if(d.attempts.at(-1)?.status==='armed'||d.requests.some(r=>r.state==='pending'))throw Error('Finish and audit the prior attempt before arming another.');if(s.attempts>=20||s.completions+10>180||s.tavilySearches+1>25||s.conservativeCredits+2>50||s.conservativeUsd+0.2>2)throw Error('Insufficient conservative task budget.');d.attempts.push({id:d.attempts.length+1,status:'armed',armedAt:new Date().toISOString(),reservation:{completions:10,usd:0.2,tavilyCredits:2}});save(d);return totals(d);}
export function finishAttempt(status){if(!['failed','passed','partial'].includes(status))throw Error('Invalid outcome.');const d=read();d.attempts.at(-1).status=status;d.attempts.at(-1).finishedAt=new Date().toISOString();save(d);return totals(d);}
if(process.argv[1]===fileURLToPath(import.meta.url)){const command=process.argv[2];console.log(command==='arm'?armAttempt():command==='finish'?finishAttempt(process.argv[3]):totals(read()));}
else if(process.env.IMPACTLENS_STAGED_LIVE_GUARD==='true'&&!globalThis.__stagedLiveGuard){
 globalThis.__stagedLiveGuard=true;const native=globalThis.fetch;
 globalThis.fetch=async(url,init={})=>{try{
  const address=typeof url==='string'?url:url instanceof URL?url.href:url.url;
  const service=address==='https://api.tavily.com/search'?'tavily':address==='https://openrouter.ai/api/v1/chat/completions'?'openrouter':null;
  if(!service){if(address.startsWith('https://openrouter.ai/api/v1/generation?')||/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//.test(address))return native(url,init);throw Error('Task guard disallows other server-side external requests.');}
  // Framework fetch wrappers may supply a Request rather than a string URL/body.
  const body=typeof init.body==='string'?init.body:typeof url?.clone==='function'?await url.clone().text():null;
  if(typeof body!=='string')throw Error('Expected inspectable bounded provider request.');const b=JSON.parse(body);
  const d=read(),attempt=d.attempts.at(-1);if(!attempt||attempt.status!=='armed')throw Error('No armed live attempt.');
  const prior=d.requests.filter(r=>r.attempt===attempt.id),s=totals(d),isPlan=service==='openrouter'&&b.response_format?.json_schema?.name?.startsWith('dynamic_');
  if(prior.some(r=>r.state==='pending'))throw Error('Concurrent provider calls forbidden.');
  if(service==='openrouter'){
   if(b.model!=='deepseek/deepseek-v4-flash-0731'||JSON.stringify(b.provider)!==JSON.stringify({only:['digitalocean'],allow_fallbacks:false,require_parameters:true})||b.reasoning?.effort!=='none'||b.reasoning?.exclude!==true||b.stream!==false||b.response_format?.type!=='json_schema')throw Error('Routing/structured-output guard failed.');
   if(Buffer.byteLength(body)>98304||!Number.isInteger(b.max_tokens)||b.max_tokens>(isPlan?6000:800)||b.max_tokens<1)throw Error('Token/input reservation exceeded.');
   if(prior.filter(r=>r.service==='openrouter').length>=10||prior.filter(r=>r.purpose===(isPlan?'planning':'action')).length>=(isPlan?2:8)||s.completions>=180||s.conservativeUsd+0.02>2)throw Error('Completion budget exceeded.');
  }else if(b.search_depth!=='basic'||b.max_results>5||b.auto_parameters!==false||prior.some(r=>r.service==='tavily')||s.tavilySearches>=25||s.conservativeCredits+2>50)throw Error('Retrieval budget exceeded.');
  const record={id:d.requests.length+1,attempt:attempt.id,service,purpose:service==='tavily'?'retrieval':isPlan?'planning':'action',schema:service==='openrouter'?b.response_format.json_schema.name:null,startedAt:new Date().toISOString(),state:'pending',reservedUsd:service==='openrouter'?0.02:0,reservedCredits:service==='tavily'?2:0,costUsd:null,credits:null};
  d.requests.push(record);save(d);const start=Date.now();
  try{
   const response=await native(url,init);record.httpStatus=response.status;
   // Consume a clone only in memory. Persist a finite telemetry projection, never content.
   try{const data=await response.clone().json();const usage=data.usage??{};Object.assign(record,{inputTokens:usage.prompt_tokens??null,outputTokens:usage.completion_tokens??null,reasoningTokens:usage.completion_tokens_details?.reasoning_tokens??null,costUsd:typeof usage.cost==='number'&&usage.cost>=0?usage.cost:null,credits:typeof usage.credits==='number'&&usage.credits>=0?usage.credits:null,provider:data.provider==='DigitalOcean'?'DigitalOcean':null,model:data.model==='deepseek/deepseek-v4-flash-0731'?data.model:null,generationId:/^[\w.:-]{1,200}$/.test(data.id??'')?data.id:null,finishReason:['stop','length','error','content_filter','tool_calls'].includes(data.choices?.[0]?.finish_reason)?data.choices[0].finish_reason:null,resultCount:Array.isArray(data.results)?data.results.length:null});}catch{/* Unknown charges retain the reservation. */}
   record.state='returned';return response;
  }catch(error){record.state='interrupted';throw error;}
  finally{record.durationMs=Date.now()-start;const latest=read();latest.requests[record.id-1]=record;save(latest);}
 }catch(error){const known=['Task guard disallows other server-side external requests.','Expected inspectable bounded provider request.','No armed live attempt.','Concurrent provider calls forbidden.','Routing/structured-output guard failed.','Token/input reservation exceeded.','Completion budget exceeded.','Retrieval budget exceeded.'];const d=read();(d.blocked??=[]).push({at:new Date().toISOString(),reason:known.includes(error?.message)?known.indexOf(error.message):8,bodyKind:typeof init.body});save(d);throw error;}};
}
