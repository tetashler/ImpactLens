/** Local, process-owned prepare/review/start gate. No executable plan is accepted from a browser. */
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {assumptionContextKey,applyAssumptionDecisions,parseAssumptionDecisions,reviewableAssumptions,type AssumptionReviewDraft} from '../../assumption-review/contract.ts';
import {parseDynamicRequest} from '../../dynamic-scenarios/plan.ts';
import {parseHybridExploreOptions} from '../../interventions/explore-contract.ts';
import {ensure,object,identifier} from '../../experiments/validation.ts';
import type {PreparedDynamic,DynamicDependencies} from '../inference/dynamic-service.ts';
import {handlePublicExplore,readReviewedPublicSnapshot,type PublicDependencies} from '../society/public-service.ts';

interface Entry {attemptId:string;created:number;expires:number;state:'preparing'|'pending'|'starting'|'done'|'failed'|'discarded';token:string;contextKey:string;draft?:AssumptionReviewDraft;prepared?:PreparedDynamic;resume?:(plan:PreparedDynamic['plan'],signal:AbortSignal)=>Promise<Response>;result?:{status:number;body:string};runId?:string}
const entries=new Map<string,Entry>(),attempts=new Map<string,number>();
const TTL=15*60_000,MAX_ACTIVE=16,MAX_ATTEMPTS=2048;
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const failure=(code:string,status=409)=>json({kind:'assumption-review-error',code,error:code==='ASSUMPTION_REVIEW_GONE'?'This review expired or is no longer available. Prepare a new review.':code==='ASSUMPTION_REVIEW_INCOMPLETE'?'Choose Allow or Do not allow for every assumption.':'The assumption review could not proceed safely. Review the question and try again.'},status);
async function body(request:Request){
 ensure(request.body,'ASSUMPTION_REVIEW_INVALID');const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;const cancel=()=>void reader.cancel().catch(()=>{});request.signal.addEventListener('abort',cancel,{once:true});
 try{for(;;){request.signal.throwIfAborted();const part=await reader.read();if(part.done)break;size+=part.value.byteLength;ensure(size<=131072,'ASSUMPTION_REVIEW_TOO_LARGE');chunks.push(part.value);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}finally{reader.releaseLock();request.signal.removeEventListener('abort',cancel);}
}
function sweep(){const now=Date.now();for(const [id,e]of entries){if(e.state==='pending'&&now>=e.expires){e.state='discarded';delete e.prepared;delete e.resume;delete e.draft;}if(now-e.created>86400000&&e.state!=='starting')entries.delete(id);}for(const [id,time]of attempts)if(now-time>86400000)attempts.delete(id);}
function authorised(draftId:unknown,token:unknown){identifier(draftId);ensure(typeof token==='string'&&/^[a-f0-9]{64}$/.test(token),'ASSUMPTION_REVIEW_ACCESS');const e=entries.get(draftId as string);if(!e)throw Error('ASSUMPTION_REVIEW_GONE');ensure(timingSafeEqual(Buffer.from(e.token,'hex'),Buffer.from(token,'hex')),'ASSUMPTION_REVIEW_ACCESS');return e;}

export async function handleAssumptionRequest(request:Request,deps:DynamicDependencies={},social:PublicDependencies={}):Promise<Response>{
 try{
  sweep();const url=new URL(request.url),origin=request.headers.get('origin');ensure(!url.search&&(!origin||origin===new URL(`${url.protocol}//${request.headers.get('host')??url.host}`).origin),'ASSUMPTION_REVIEW_ACCESS');
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return failure('ASSUMPTION_REVIEW_CONTENT_TYPE',415);
  const b=await body(request);if(b.version!==3)return failure('ASSUMPTION_REVIEW_REQUIRED');
  if(b.operation==='prepare'){
   object(b,['version','operation','attemptId','request','hybrid'],['version','operation','attemptId','request']);identifier(b.attemptId);ensure(b.attemptId.length<=64,'ASSUMPTION_REVIEW_INVALID');
   const input=parseDynamicRequest(b.request),hybrid=b.hybrid===undefined?undefined:parseHybridExploreOptions(b.hybrid);
   ensure(!attempts.has(b.attemptId),'ASSUMPTION_REVIEW_USED');ensure(attempts.size<MAX_ATTEMPTS&&[...entries.values()].filter(e=>['preparing','pending','starting'].includes(e.state)).length<MAX_ACTIVE,'ASSUMPTION_REVIEW_CAPACITY');
   // Claim synchronously, before the first await/provider call. Concurrent prepares cannot race the cap.
   const draftId=randomUUID(),entry:Entry={attemptId:b.attemptId,created:Date.now(),expires:Date.now()+TTL,state:'preparing',token:randomBytes(32).toString('hex'),contextKey:''};entries.set(draftId,entry);attempts.set(b.attemptId,entry.created);
   try{
    entry.contextKey=await assumptionContextKey(input,hybrid);request.signal.throwIfAborted();
    const oldWire=hybrid?{version:2,attemptId:b.attemptId,request:input,hybrid}:{version:1,attemptId:b.attemptId,request:input};
    const headers=new Headers(request.headers);headers.delete('content-length');
    const preparedResponse=await handlePublicExplore(new Request(request.url,{method:'POST',headers,signal:request.signal,body:JSON.stringify(oldWire)}),deps,{...social,prepareReview:async(prepared,resume)=>{
     request.signal.throwIfAborted();entry.prepared=prepared;entry.resume=resume;entry.expires=Date.now()+TTL;entry.state='pending';
     entry.draft={version:1,kind:'assumption-review',draftId,token:entry.token,attemptId:b.attemptId,contextKey:entry.contextKey,expiresAt:new Date(entry.expires).toISOString(),question:input.question,description:prepared.plan.draft.description,assumptions:reviewableAssumptions(prepared.plan)};
     return json(entry.draft);
    }});
    if(entry.state==='preparing')entry.state='failed';return preparedResponse;
   }catch(error){entry.state='failed';delete entry.prepared;delete entry.resume;throw error;}
  }
  object(b,b.operation==='start'?['version','operation','draftId','token','contextKey','decisions']:['version','operation','draftId','token']);ensure(['start','discard','status'].includes(b.operation),'ASSUMPTION_REVIEW_INVALID');
  const e=authorised(b.draftId,b.token);
  if(b.operation==='status'){
   if(e.runId)return json(await readReviewedPublicSnapshot(e.runId,e.contextKey,social));
   if(e.result)return new Response(e.result.body,{status:e.result.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
   return json({kind:'assumption-review-status',state:e.state});
  }
  if(b.operation==='discard'){if(e.state==='pending'){e.state='discarded';delete e.prepared;delete e.resume;delete e.draft;}return json({kind:'assumption-review-status',state:e.state});}
  ensure(b.contextKey===e.contextKey,'ASSUMPTION_REVIEW_STALE');
  if(e.state==='done'&&e.runId)return json(await readReviewedPublicSnapshot(e.runId,e.contextKey,social));
  if(e.state==='done'&&e.result)return new Response(e.result.body,{status:e.result.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  if(e.state==='starting')return json({kind:'assumption-review-status',state:'starting'},202);
  ensure(e.state==='pending'&&Date.now()<e.expires&&e.prepared&&e.resume,'ASSUMPTION_REVIEW_GONE');
  const decisions=parseAssumptionDecisions(b.decisions,reviewableAssumptions(e.prepared.plan));
  // Consume before asynchronous plan derivation so a double click can never execute twice.
  e.state='starting';const prepared=e.prepared,resume=e.resume;delete e.draft;
  const controller=new AbortController(),cancel=()=>controller.abort();request.signal.addEventListener('abort',cancel,{once:true});if(request.signal.aborted)cancel();const timer=setTimeout(cancel,230000);
  try{
   const effective=await applyAssumptionDecisions(prepared.plan,decisions,e.contextKey);controller.signal.throwIfAborted();
   const result=await resume(effective,controller.signal),content=await result.text();const returned=JSON.parse(content);if(result.ok&&returned.kind==='summary-execution'&&typeof returned.runId==='string')e.runId=returned.runId;else if(content.length<=4096)e.result={status:result.status,body:content};e.state='done';
   return new Response(content,{status:result.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }catch{e.state='failed';return failure('ASSUMPTION_REVIEW_EXECUTION_FAILED',503);}finally{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);delete e.prepared;delete e.resume;}
 }catch(error){const code=error instanceof Error?error.message:'';const known=['ASSUMPTION_REVIEW_GONE','ASSUMPTION_REVIEW_ACCESS','ASSUMPTION_REVIEW_USED','ASSUMPTION_REVIEW_CAPACITY','ASSUMPTION_REVIEW_STALE','ASSUMPTION_REVIEW_INCOMPLETE','ASSUMPTION_REVIEW_DECISION','ASSUMPTION_REVIEW_TOO_LARGE'];return failure(known.includes(code)?code:'ASSUMPTION_REVIEW_INVALID',code==='ASSUMPTION_REVIEW_ACCESS'?403:code==='ASSUMPTION_REVIEW_GONE'?410:code==='ASSUMPTION_REVIEW_CAPACITY'?429:code==='ASSUMPTION_REVIEW_TOO_LARGE'?413:code==='ASSUMPTION_REVIEW_USED'||code==='ASSUMPTION_REVIEW_STALE'?409:400);}
}
