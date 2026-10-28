'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {createExperimentLab,experimentContextKey,type ExperimentContext} from '../lib/experiments/client.ts';

export function useExperimentLab(context:ExperimentContext){
  const [lab]=useState(()=>{let storage:Storage|undefined;try{if(typeof window!=='undefined')storage=window.localStorage;}catch{}return createExperimentLab({storage});});
  const state=useSyncExternalStore(lab.subscribe,lab.getSnapshot,lab.getSnapshot);
  const key=experimentContextKey(context);
  useEffect(()=>{void lab.setContext(context);},[lab,key]);
  useEffect(()=>{void lab.loadSaved();return()=>lab.dispose();},[lab]);
  return {lab,state,contextCurrent:state.contextKey===key};
}
