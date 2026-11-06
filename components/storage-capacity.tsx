'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {readStorageCapacityStatus,unavailableStorageCapacity,type StorageCapacityStatus} from '../lib/society/storage-status';
import './storage-capacity.css';

function capacityMessage(status:Readonly<StorageCapacityStatus>|null,loading:boolean):string {
 if(loading)return 'Checking local simulation storage…';
 if(!status)return 'Local storage capacity is unavailable. Refresh before starting another exploration.';
 if(status.status==='full')return 'Local simulation storage is full. Stop the app and use the local archive instructions below.';
 if(status.status==='ready')return `${status.available} available for new attempts.`;
 switch(status.reason){
  case 'maintenance':return 'Local storage maintenance blocks new attempts. Stop the app and inspect storage status in the terminal.';
  case 'history-limit':return 'The retained archive limit blocks new attempts. Review local storage status before proceeding.';
  case 'storage-limit':return 'A local storage limit blocks new attempts. Review local storage status before proceeding.';
  default:return 'Local storage capacity is unavailable. Check local storage status before starting another exploration.';
 }
}
export function StorageCapacityView({status,loading,onRefresh}:{status:Readonly<StorageCapacityStatus>|null;loading:boolean;onRefresh:()=>void}){
 const showCounts=!loading&&status?.used!==null&&status?.used!==undefined;
 return <aside className="storage-capacity" aria-label="Local simulation storage">
  <div className="storage-capacity-heading"><span>Local simulation storage{showCounts?`: ${status.used} of ${status.capacity} slots used`:''}</span><button type="button" disabled={loading} onClick={onRefresh}>Refresh capacity</button></div>
  <p role="status" aria-live="polite" data-storage-status={loading?'loading':status?.status??'unavailable'}>{capacityMessage(status,loading)}</p>
  <details><summary>Local archive instructions</summary>
   <p>Slots count consumed attempts, including failed attempts. This capacity is separate from the recorded explorations shown in this browser. The server checks admission again before starting work.</p>
   <ol><li>Stop every running ImpactLens app process.</li><li>Check storage: <code>npm run storage:status</code></li><li>Archive and rotate the active period: <code>npm run storage:rotate -- --confirm</code></li><li>Verify the archive ID printed by rotation: <code>npm run storage:verify -- &lt;archive-id&gt;</code></li><li>Restart the app and refresh capacity.</li></ol>
   <p>If storage status reports interrupted maintenance, keep the app stopped and finish it explicitly: <code>npm run storage:rotate -- --confirm --complete</code>. Then verify the archive before restarting.</p>
   <p>Archived runs remain read-only. Rotation preserves retained evidence and does not resume interrupted simulations. Archives are bounded to sixteen periods; nothing is deleted automatically.</p>
   {status?.archivedPeriods!==null&&status?.archivedPeriods!==undefined&&<p>{status.archivedPeriods} of {status.archiveLimit} archive periods retained. At the archive limit, active slots can still be used; another rotation will be refused.</p>}
  </details>
 </aside>;
}
/** Capacity is advisory and refreshed only on mount or explicit request. Never polls or starts work. */
export default function StorageCapacity(){
 const [status,setStatus]=useState<Readonly<StorageCapacityStatus>|null>(null),[loading,setLoading]=useState(true);
 const epoch=useRef(0),controller=useRef<AbortController|null>(null);
 const refresh=useCallback(async()=>{
  controller.current?.abort();const current=++epoch.current,abort=new AbortController();controller.current=abort;setLoading(true);
  const timer=setTimeout(()=>abort.abort(),8000);
  try{const value=await readStorageCapacityStatus(fetch,abort.signal);if(current===epoch.current)setStatus(value);}
  catch{if(current===epoch.current)setStatus(unavailableStorageCapacity());}
  finally{clearTimeout(timer);if(current===epoch.current){setLoading(false);controller.current=null;}}
 },[]);
 useEffect(()=>{void refresh();return()=>{epoch.current++;controller.current?.abort();};},[refresh]);
 return <StorageCapacityView status={status} loading={loading} onRefresh={()=>void refresh()}/>;
}
