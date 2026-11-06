type RunStorage=Pick<Storage,'length'|'key'|'getItem'|'setItem'|'removeItem'>;
const marker='impactlens:recorded-runs-reset:v1';
const prefixes=['impactlens:summary-run:','impactlens:society:','impactlens:auto-report:v1:','impactlens:auto-report-deferred:v1:','impactlens:auto-graph-summary:v1:'];
/** A deployment-selected reset clears recorded runs once while keeping user configuration. */
export function resetRecordedRunStorage(storage:RunStorage,resetId?:string):boolean {
 if(!resetId||storage.getItem(marker)===resetId)return false;
 const keys=Array.from({length:storage.length},(_,index)=>storage.key(index));
 let removed=false;
 for(const key of keys)if(key&&(key==='impactlens:summary-history:v1'||prefixes.some(prefix=>key.startsWith(prefix)))){
  storage.removeItem(key);removed=true;
 }
 storage.setItem(marker,resetId);
 return removed;
}
