'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { createAacDraft,demonstrationAacDraft,buildAacRequest,draftKey,validAacPosition,type AacDraft } from '../lib/eldercare/editor';
import { parseFacilitiesResponse,parseEldercareApiRequest,type FacilitiesResponse,type EldercareApiRequest,type EldercareApiResponse } from '../lib/eldercare/api-contract';
import { AacRequestSession } from '../lib/eldercare/session';
import type { Position } from '../prototype/eldercare/types';

export function useAacScenario(enabled:boolean){
  const [draft,setDraft]=useState<AacDraft>(createAacDraft),[placing,setPlacing]=useState(false),[focusKey,setFocusKey]=useState(0);
  const [facilities,setFacilities]=useState<FacilitiesResponse|null>(null),[facilityError,setFacilityError]=useState(''),[facilityBusy,setFacilityBusy]=useState(false),[retry,setRetry]=useState(0),[selectedFacility,setSelectedFacility]=useState<string|null>(null);
  const [loaded,setLoaded]=useState<{key:string;data:EldercareApiResponse}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const session=useRef(new AacRequestSession()),key=draftKey(draft),latest=useRef({key,enabled}),attempt=useRef(0);
  latest.current={key,enabled};session.current.setContext(enabled,key);
  const invalidate=useCallback(()=>{attempt.current++;session.current.cancel();setLoaded(null);setBusy(false);setError('');},[]);
  const update=useCallback((patch:Partial<AacDraft>)=>{invalidate();setDraft(d=>({...d,...patch}));},[invalidate]);
  const place=useCallback((position:Position)=>{
    if(!validAacPosition(position)){setError('Choose a location within the supported Singapore map area. The point is not a site approval.');return;}
    update({position:{...position}});setPlacing(false);
  },[update]);
  const reset=useCallback(()=>{invalidate();setDraft(createAacDraft());setPlacing(false);setSelectedFacility(null);},[invalidate]);
  const loadDemo=useCallback(()=>{invalidate();setDraft(demonstrationAacDraft());setPlacing(false);setFocusKey(k=>k+1);},[invalidate]);
  const focus=useCallback(()=>setFocusKey(k=>k+1),[]);
  const cancelPlacement=useCallback(()=>setPlacing(false),[]);
  const retryFacilities=useCallback(()=>{setFacilities(null);setRetry(k=>k+1);},[]);
  useEffect(()=>{session.current.cancel();attempt.current++;setBusy(false);setPlacing(false);return ()=>session.current.cancel();},[enabled,key]);
  useEffect(()=>{
    if(!enabled||facilities)return;
    const controller=new AbortController();setFacilityBusy(true);setFacilityError('');
    fetch('/api/eldercare/facilities',{signal:controller.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error();return parseFacilitiesResponse(await r.json());})
      .then(data=>{if(!controller.signal.aborted)setFacilities(data);})
      .catch(()=>{if(!controller.signal.aborted)setFacilityError('AAC records could not load. Retry the catalogue; the MRT workspace remains usable.');})
      .finally(()=>{if(!controller.signal.aborted)setFacilityBusy(false);});
    return ()=>controller.abort();
  },[enabled,retry]);
  useEffect(()=>{if(!enabled)return;const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setPlacing(false);};window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey);},[enabled]);
  let validation='';try{buildAacRequest(draft,'aac-preview');}catch{validation=!draft.position?'Place a hypothetical centre or load the labelled demonstration.':'Check the name, map location, radius and advanced assumptions before calculating.';}
  async function calculate(request?:EldercareApiRequest){
    if(!enabled||busy)return;
    let submitted;try{submitted=request?parseEldercareApiRequest(request):buildAacRequest(draft,`aac-${crypto.randomUUID()}`);}catch{setError(validation||'Check the current centre and settings before calculating.');return;}
    const atKey=key,atAttempt=++attempt.current;setBusy(true);setError('');setLoaded(null);
    try{const data=await session.current.calculate(submitted,atKey);if(data&&latest.current.enabled&&latest.current.key===atKey&&attempt.current===atAttempt)setLoaded({key:atKey,data});}
    catch(e){if(latest.current.enabled&&latest.current.key===atKey&&attempt.current===atAttempt)setError((e as Error).message);}
    finally{if(latest.current.enabled&&latest.current.key===atKey&&attempt.current===atAttempt)setBusy(false);}
  }
  const report=enabled&&loaded?.key===key?loaded.data:null;
  return {draft,update,placing,setPlacing,cancelPlacement,place,reset,loadDemo,focus,focusKey,facilities,facilityError,facilityBusy,retryFacilities,selectedFacility,setSelectedFacility,report,busy,error,validation,calculate,invalidate};
}
export type AacScenario=ReturnType<typeof useAacScenario>;
