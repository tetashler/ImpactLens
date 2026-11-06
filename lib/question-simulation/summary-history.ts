import {parsePublicExplore} from './public-session.ts';
import type {PublicExplore} from '../society/public-contract.ts';
const prefix='impactlens:summary-run:',indexKey='impactlens:summary-history:v1';
type HistoryStorage=Pick<Storage,'getItem'|'setItem'|'key'|'length'>;
function readIndex(storage:HistoryStorage):Record<string,number>{try{const raw=JSON.parse(storage.getItem(indexKey)??'{}');return Object.fromEntries(Object.entries(raw).filter(([id,time])=>/^run-[A-Za-z0-9._:-]{1,150}$/.test(id)&&typeof time==='number'&&Number.isFinite(time)&&time>=0).slice(0,64)) as Record<string,number>;}catch{return {};}}
export function rankSummaryHistory<T extends {runId:string;sources:{retrievedAt:string}[]}>(values:readonly T[],saved:Record<string,number>):T[]{const time=(v:T)=>saved[v.runId]??Math.max(0,...v.sources.map(s=>Date.parse(s.retrievedAt)).filter(Number.isFinite));return [...values].sort((a,b)=>time(b)-time(a)||a.runId.localeCompare(b.runId)).slice(0,4);}
/** Recency metadata is outside the immutable DTO; no existing summary is deleted or rewritten on read. */
export function rememberSummary(storage:HistoryStorage,value:PublicExplore,now=Date.now()){
 storage.setItem(prefix+value.runId,JSON.stringify(value.job&&value.session?{version:1,kind:'summary-reference',runId:value.runId,token:value.session.token}:value));const index=readIndex(storage);index[value.runId]??=now;storage.setItem(indexKey,JSON.stringify(Object.fromEntries(Object.entries(index).sort((a,b)=>b[1]-a[1]).slice(0,64))));
}
export function readSummaryHistory(storage:HistoryStorage):PublicExplore[]{const values:PublicExplore[]=[];for(let i=0;i<Math.min(storage.length,256);i++){const key=storage.key(i);if(!key?.startsWith(prefix))continue;try{const raw=storage.getItem(key);if(raw&&raw.length<=3_000_000){const value=parsePublicExplore(JSON.parse(raw));if(key===prefix+value.runId)values.push(value);}}catch{/* One invalid saved entry cannot hide valid completed runs. */}}return rankSummaryHistory(values,readIndex(storage));}
export interface SummaryReference {version:1;kind:'summary-reference';runId:string;token:string}
export function readSummaryReferences(storage:HistoryStorage):SummaryReference[]{const result:SummaryReference[]=[];for(let i=0;i<Math.min(storage.length,256);i++){const key=storage.key(i);if(!key?.startsWith(prefix))continue;try{const text=storage.getItem(key);if(!text||text.length>512)continue;const v=JSON.parse(text);if(Object.keys(v).sort().join(',')==='kind,runId,token,version'&&v.version===1&&v.kind==='summary-reference'&&typeof v.runId==='string'&&key===prefix+v.runId&&/^run-[A-Za-z0-9._:-]{1,150}$/.test(v.runId)&&typeof v.token==='string'&&/^[a-f0-9]{64}$/.test(v.token))result.push(v);}catch{}}return result.sort((a,b)=>(readIndex(storage)[b.runId]??0)-(readIndex(storage)[a.runId]??0)||a.runId.localeCompare(b.runId)).slice(0,4);}
/** Compact references restore through passive, authenticated projections only. */
export async function restoreSummaryHistory(storage:HistoryStorage,fetcher:typeof fetch=fetch,signal?:AbortSignal,onUnavailable?:(count:number)=>void):Promise<PublicExplore[]>{
 const result=readSummaryHistory(storage);let unavailable=0;
 for(const ref of readSummaryReferences(storage)){
  if(signal?.aborted)break;
  try{
   const r=await fetcher('/api/social-simulate?runId='+encodeURIComponent(ref.runId)+'&token='+ref.token,{cache:'no-store',signal});
   if(!r.ok)throw new Error('Saved report unavailable');
   const v=parsePublicExplore(await r.json());signal?.throwIfAborted();
   if(v.runId!==ref.runId||v.session?.token!==ref.token)throw new Error('Saved report identity mismatch');
   result.push(v);
  }catch{if(signal?.aborted)break;unavailable++;/* References remain intact for an explicit passive retry. */}
 }
 if(!signal?.aborted)onUnavailable?.(unavailable);
 return rankSummaryHistory(result,readIndex(storage));
}
