/** Browser-only orchestration: one frozen comparison request, one atomic result. */
import type {MrtIntervention} from '../../prototype/mrt/scenario.ts';
import {parseControlledMrtRequest,assertControlledMrtBinding,type ControlledMrtResponse} from './controlled-mrt.ts';
import {freezeSnapshot} from './validation.ts';

export interface ControlledMrtContext {intervention:MrtIntervention;serviceDate:string;revision:number;canRun:boolean}
export interface ControlledMrtClientState {
  contextKey:string;duplicated:boolean;optionA:MrtIntervention|null;
  waits:{low:number;base:number;high:number};
  phase:'idle'|'ready'|'calculating'|'completed'|'cancelled'|'error';
  result:ControlledMrtResponse|null;error:string;
}
export const controlledMrtContextKey=(context:ControlledMrtContext)=>JSON.stringify([context.serviceDate,context.revision,context.canRun,context.intervention]);

export function createControlledMrtClient(initial:ControlledMrtContext,{fetcher=globalThis.fetch}:{fetcher?:typeof fetch}={}){
  let context=freezeSnapshot(initial),generation=0,active:AbortController|null=null,disposed=false;
  const listeners=new Set<()=>void>();
  const empty=(value:ControlledMrtContext):ControlledMrtClientState=>({contextKey:controlledMrtContextKey(value),duplicated:false,optionA:null,waits:{low:0,base:0,high:0},phase:'idle',result:null,error:''});
  let state=empty(context);
  function publish(patch:Partial<ControlledMrtClientState>){if(disposed)return;state=freezeSnapshot({...state,...patch});for(const listener of listeners)listener();}
  function abort(){generation++;active?.abort();active=null;}
  function setContext(next:ControlledMrtContext){if(disposed||controlledMrtContextKey(next)===state.contextKey)return;abort();context=freezeSnapshot(next);publish(empty(context));}
  function duplicate(){
    if(disposed||!context.canRun)return;
    abort();const base=context.intervention.waitingTimeSeconds;
    const waits={low:Math.floor((base??0)/2),base:base??NaN,high:Math.min(3600,(base??0)*2)};
    publish({duplicated:true,optionA:context.intervention,waits,phase:'ready',result:null,error:''});
  }
  function edit(key:'low'|'base'|'high',value:number){if(disposed||!state.duplicated)return;abort();publish({waits:{...state.waits,[key]:value},result:null,error:'',phase:'ready'});}
  function cancel(){abort();if(state.phase==='calculating')publish({phase:'cancelled',result:null,error:''});}
  async function calculate(){
    if(disposed||!context.canRun||!state.optionA||!state.duplicated)return;
    abort();let submitted;
    try{submitted=parseControlledMrtRequest({version:1,serviceDate:context.serviceDate,intervention:state.optionA,optionB:{waitingTimeSeconds:state.waits.base},sensitivity:{lowWaitingTimeSeconds:state.waits.low,highWaitingTimeSeconds:state.waits.high}});}
    catch{publish({phase:'error',result:null,error:'Use whole-second waits from 0 to 3600, with low ≤ B base ≤ high. Option A also needs an explicit whole-second wait.'});return;}
    const controller=new AbortController(),attempt=generation,key=state.contextKey;active=controller;
    const accepts=()=>!disposed&&context.canRun&&generation===attempt&&active===controller&&!controller.signal.aborted&&state.contextKey===key;
    publish({phase:'calculating',result:null,error:''});
    try{
      const response=await fetcher('/api/experiments/mrt-comparison',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(submitted)});
      if(!accepts())return;
      if(!response.ok)throw Error(response.status===409||response.status===429?'The calculator is busy. Try again shortly.':'The controlled calculation could not complete. Check the reviewed proposal and try again.');
      const body=await response.json();if(!accepts())return;
      const result=await assertControlledMrtBinding(body,submitted);
      if(accepts())publish({phase:'completed',result});
    }catch(error){if(accepts())publish({phase:'error',result:null,error:error instanceof Error&&/^(The calculator|The controlled calculation)/.test(error.message)?error.message:'The response could not be verified for these inputs. Calculate again.'});}
    finally{if(active===controller)active=null;}
  }
  return {getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},setContext,duplicate,edit,cancel,calculate,dispose:()=>{abort();disposed=true;listeners.clear();}};
}
