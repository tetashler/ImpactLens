'use client';
import {rememberSummary} from '../lib/question-simulation/summary-history';
import {useEffect,useRef,useState} from 'react';
import type {PublicExplore} from '../lib/society/public-contract';
import {parsePublicExplore} from '../lib/question-simulation/public-session';
import {continuePublicSociety} from '../lib/question-simulation/continuation';
/** Browser holds only allowlisted summaries. Continuation is owned by a newly accepted Explore, never navigation. */
export function useSociety(run:PublicExplore|null|undefined,currentRunId:string|null,archived=false){
 const [result,setResult]=useState<PublicExplore|null>(null),[error,setError]=useState(''),[selected,setSelected]=useState<string|null>(null);const started=useRef(new Set<string>()),latest=useRef<PublicExplore|null>(null),explicitResume=useRef<string|null>(null),[resumeNonce,setResumeNonce]=useState(0),id=run?.runId??null;
 useEffect(()=>{let stopped=false;const abort=new AbortController();const forced=explicitResume.current===id;explicitResume.current=null;const value=forced&&latest.current?.runId===id?latest.current:run;const prepared=value&&forced&&value.society?{...value,society:{...value.society,phase:'simulating' as const}}:value;setResult(prepared??null);setError('');if(!prepared)return;const initial:PublicExplore=prepared;
 const accept=(value:unknown)=>{const next=parsePublicExplore(value);if(stopped||next.runId!==initial.runId)return;latest.current=next;setResult(next);try{rememberSummary(localStorage,next);}catch{setError('Browser summary persistence is unavailable; server records remain retained.');}};
 async function load(){
  if(!initial.session)return;const fresh=forced||!archived&&currentRunId===initial.runId&&!started.current.has(initial.runId);if(!fresh){const r=await fetch('/api/social-simulate?runId='+encodeURIComponent(initial.runId)+'&token='+initial.session.token,{signal:abort.signal,cache:'no-store'});if(r.ok)accept(await r.json());return;}started.current.add(initial.runId);
  await continuePublicSociety(initial,{signal:abort.signal,accept});
 }
 void load().catch(()=>{if(!stopped){setResult(previous=>previous?.society?{...previous,society:{...previous.society,phase:'partial'}}:previous);setError('Background communication is partial. Accepted records are retained; no model retry was started.');}});return()=>{stopped=true;abort.abort();};
 // The accepted run owns work. Switching ordinary tabs cannot restart it.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[id,resumeNonce]);
 useEffect(()=>{const abort=new AbortController();void(async()=>{for(const key of Object.keys(localStorage).filter(k=>k.startsWith('impactlens:society:'))){const world=localStorage.getItem(key);if(!world)continue;try{const r=await fetch('/api/social-simulate',{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.signal,body:JSON.stringify({operation:'import-legacy',world})});if(r.ok){const v=await r.json();if(v.imported){localStorage.setItem('impactlens:summary-run:'+v.result.runId,JSON.stringify(v.result));localStorage.removeItem(key);}}}catch{setError('A historical browser world needs server migration. It was retained unchanged.');}}})();return()=>abort.abort();},[]);
 return {result:result?.runId===id?result:null,error,selected,setSelected,resume:()=>{if(run?.runId&&latest.current?.society?.usage.failed===0){explicitResume.current=run.runId;setResumeNonce(n=>n+1);}}};
}
