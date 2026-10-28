'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {createQuestionSimulation} from '../lib/question-simulation/client';
import type {ScenarioGeometry} from '../lib/plots/geometry';
export function useQuestionSimulation(question:string,geometry:ScenarioGeometry,geometryRevision:number){
 const [controller]=useState(()=>createQuestionSimulation({execution:'live'}));
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 useEffect(()=>{controller.invalidate({question,geometry,geometryRevision});},[controller,question,geometry,geometryRevision]);
 useEffect(()=>{void controller.refreshInferenceStatus();},[controller]);
 useEffect(()=>()=>controller.dispose(),[controller]);
 return {controller,state};
}
