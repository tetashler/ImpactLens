'use client';
import {readSummaryHistory,rememberSummary,restoreSummaryHistory} from '../lib/question-simulation/summary-history';
import {resetRecordedRunStorage} from '../lib/question-simulation/recorded-runs-reset';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {createQuestionSimulation} from '../lib/question-simulation/client';
import type {ScenarioGeometry} from '../lib/plots/geometry';
export function useQuestionSimulation(question:string,geometry:ScenarioGeometry,geometryRevision:number){
 const [controller]=useState(()=>createQuestionSimulation({execution:'dynamic',publicOnly:true,onPublicRunAccepted:value=>rememberSummary(localStorage,value)}));
 const [historyRestore,setHistoryRestore]=useState({loading:true,error:''}),[historyRetry,setHistoryRetry]=useState(0);
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 useEffect(()=>{controller.invalidate({question,geometry,geometryRevision});},[controller,question,geometry,geometryRevision]);
 useEffect(()=>{
  const abort=new AbortController();setHistoryRestore({loading:true,error:''});
  void(async()=>{try{
   const reset=process.env.NEXT_PUBLIC_RECORDED_RUNS_RESET;
   if(reset&&[localStorage,sessionStorage].map(storage=>resetRecordedRunStorage(storage,reset)).some(Boolean)){window.location.reload();return;}
   controller.restorePublicHistory(readSummaryHistory(localStorage));
   let unavailable=0;const values=await restoreSummaryHistory(localStorage,fetch,abort.signal,count=>{unavailable=count;});
   if(abort.signal.aborted)return;
   controller.restorePublicHistory(values);
   setHistoryRestore({loading:false,error:unavailable?'Some saved reports could not be loaded. Their saved references are retained.':''});
  }catch{if(!abort.signal.aborted)setHistoryRestore({loading:false,error:'Saved reports could not be loaded from this browser.'});}})();
  return()=>abort.abort();
 },[controller,historyRetry]);
 useEffect(()=>{void controller.refreshInferenceStatus();},[controller]);
 useEffect(()=>()=>controller.dispose(),[controller]);
 return {controller,state,historyRestore,retryHistory:()=>setHistoryRetry(value=>value+1)};
}
