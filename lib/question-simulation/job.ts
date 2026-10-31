import {object,ensure} from '../experiments/validation.ts';
import {parsePublicExplore,parseSocietyJob} from './public-session.ts';
import type {PublicExplore} from '../society/public-contract.ts';

async function wait(ms:number,signal:AbortSignal){signal.throwIfAborted();if(ms<=0)return;await new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(signal.reason??new DOMException('Aborted','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});}

/** Observe an already-authorised local job. No request here can start, resume,
 * extend, or cancel inference. Closing the page only stops this observer. */
export async function observePublicSociety(initial:PublicExplore,{signal,accept,fetcher=fetch,intervalMs=750,projectionIntervalMs=1500}:{signal:AbortSignal;accept:(value:PublicExplore)=>void;fetcher?:typeof fetch;intervalMs?:number;projectionIntervalMs?:number}):Promise<PublicExplore>{
 let current=parsePublicExplore(initial);if(!current.job||!current.session)return current;
 const session=current.session,prefix='/api/social-simulate?',identity='runId='+encodeURIComponent(current.runId)+'&token='+encodeURIComponent(session.token);
 const interval=Math.max(0,Math.min(5000,intervalMs)),projectionInterval=Math.max(0,Math.min(10_000,projectionIntervalMs));let lastProjection=0;
 while(current.job?.status==='running'){
  signal.throwIfAborted();const response=await fetcher(prefix+'operation=status&'+identity,{signal,cache:'no-store'});ensure(response.ok,'SOCIETY_JOB_HTTP');const envelope=object(await response.json(),['version','kind','runId','job']);ensure(envelope.version===1&&envelope.kind==='society-job-status'&&envelope.runId===initial.runId,'SOCIETY_JOB_IDENTITY');const job=parseSocietyJob(envelope.job);ensure(job.id===initial.job!.id&&job.revision>=(current.job?.revision??0),'SOCIETY_JOB_STALE');signal.throwIfAborted();current={...current,job};accept(current);
  if(job.status!=='running'||job.revision>session.revision&&Date.now()-lastProjection>=projectionInterval){
   const projection=await fetcher(prefix+identity,{signal,cache:'no-store'});ensure(projection.ok,'SOCIETY_JOB_HTTP');const next=parsePublicExplore(await projection.json());ensure(next.runId===initial.runId&&next.session?.id===session.id&&next.session?.token===session.token&&next.job?.id===job.id,'SOCIETY_JOB_IDENTITY');signal.throwIfAborted();current=next;lastProjection=Date.now();accept(next);
  }
  if(current.job?.status==='running')await wait(interval,signal);
 }
 return current;
}

export async function controlPublicSociety(current:PublicExplore,operation:'pause'|'resume'|'cancel',signal?:AbortSignal,fetcher:typeof fetch=fetch):Promise<PublicExplore>{ensure(current.session&&current.job,'SOCIETY_JOB_SESSION');const r=await fetcher('/api/social-simulate',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({operation,runId:current.runId,token:current.session.token,revision:current.session.revision})});ensure(r.ok,'SOCIETY_JOB_HTTP');const next=parsePublicExplore(await r.json());ensure(next.runId===current.runId&&next.job?.id===current.job.id,'SOCIETY_JOB_IDENTITY');return next;}

/** Bind controls to the currently displayed run both before dispatch and after
 * awaiting the response. An old response cannot replace a newly selected run. */
export async function controlSelectedPublicSociety(current:PublicExplore|null,runId:string|null,operation:'pause'|'cancel',{isCurrent,signal,fetcher=fetch}:{isCurrent:()=>boolean;signal?:AbortSignal;fetcher?:typeof fetch}):Promise<PublicExplore|null>{if(!current?.job||current.runId!==runId||!isCurrent())return null;const next=await controlPublicSociety(current,operation,signal,fetcher);return isCurrent()?next:null;}
