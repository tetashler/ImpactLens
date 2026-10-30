import type {PublicExplore} from '../society/public-contract.ts';
import {parsePublicExplore} from './public-session.ts';

/** One request can accept a decision without advancing the clock. Legacy runs
 * retain their existing cap; swarm runs also allow their remaining decisions. */
export function societyContinuationLimit(value:PublicExplore):number{
 const s=value.society;if(!s?.swarm)return 100;
 const bounded=(n:number,max:number)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.ceil(n))):0;
 return Math.max(1,Math.min(272,bounded(s.totalSteps-s.tick,144)+bounded(s.swarm.maxCalls-s.swarm.opportunities,128)));
}

async function pause(ms:number,signal:AbortSignal):Promise<void>{
 signal.throwIfAborted();if(ms<=0)return;
 await new Promise<void>((resolve,reject)=>{
  const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(signal.reason??new DOMException('Cancelled','AbortError'));};
  const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
 });
}

/** Only a newly accepted Explore or explicit resume calls this helper. Passive
 * reads and navigation remain owned by the hook and never enter this loop. */
export async function continuePublicSociety(initial:PublicExplore,{signal,accept,fetcher=fetch,intervalMs=120}:{signal:AbortSignal;accept:(value:PublicExplore)=>void;fetcher?:typeof fetch;intervalMs?:number}):Promise<PublicExplore>{
 let next=parsePublicExplore(initial);const limit=societyContinuationLimit(next),interval=Number.isFinite(intervalMs)?Math.max(0,Math.min(1000,intervalMs)):120;
 for(let batch=0;batch<limit&&next.session&&next.society?.phase==='simulating';batch++){
  signal.throwIfAborted();const previous=next,session=next.session;
  if(!Number.isSafeInteger(session.revision)||session.revision<0)throw Error('SOCIETY_CONTINUATION_SESSION');
  const response=await fetcher('/api/social-simulate',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({operation:'continue',runId:next.runId,token:session.token,revision:session.revision})});
  if(!response.ok)throw Error('SOCIETY_CONTINUATION_HTTP');
  const value=parsePublicExplore(await response.json());signal.throwIfAborted();
  if(value.runId!==initial.runId||value.session&&(value.session.id!==session.id||value.session.token!==session.token))throw Error('SOCIETY_CONTINUATION_IDENTITY');
  if(value.society?.phase!=='completed'&&(!value.session||!Number.isSafeInteger(value.session.revision)||value.session.revision<=session.revision))throw Error('SOCIETY_CONTINUATION_STALE');
  if(value.society&&(value.society.tick<(previous.society?.tick??0)))throw Error('SOCIETY_CONTINUATION_STALE');
  accept(value);next=value;
  if(next.society?.phase!=='simulating')return next;
  if(batch+1<limit)await pause(interval,signal);
 }
 if(next.society?.phase==='simulating'&&next.session){
  // Preserve the accepted revision/accounting while honestly exposing that the
  // client stopped. This does not advance or alter the server checkpoint.
  accept(parsePublicExplore({...next,society:{...next.society,phase:'partial'}}));
  throw Error('SOCIETY_CONTINUATION_BOUND');
 }
 return next;
}
