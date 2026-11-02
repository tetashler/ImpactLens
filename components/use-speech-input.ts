'use client';
import {useEffect,useRef,useState} from 'react';
import {SpeechInputController,appendSpeechTranscript,speechPending,type SpeechState} from '../lib/speech-input/controller';
import {browserSpeechDependencies} from '../lib/speech-input/browser';

export function useSpeechInput({question,onQuestion,active}:{question:string;onQuestion:(text:string)=>void;active:boolean}) {
 const latest=useRef({question,onQuestion,active});latest.current={question,onQuestion,active};
 const mounted=useRef(false);
 const [state,setState]=useState<SpeechState>({status:'idle',message:'',transcript:''});
 const [controller]=useState(()=>new SpeechInputController({...browserSpeechDependencies(),isActive:()=>latest.current.active&&document.visibilityState!=='hidden'},next=>{if(mounted.current)setState(next);},text=>{
  if(!latest.current.active||document.visibilityState==='hidden')return false;
  const combined=appendSpeechTranscript(latest.current.question,text);
  if(combined===null)return false;
  latest.current.question=combined;
  latest.current.onQuestion(combined);return true;
 }));
 useEffect(()=>{
  mounted.current=true;
  const visibility=()=>{if(document.visibilityState==='hidden')controller.cancel();};
  document.addEventListener('visibilitychange',visibility);
  return ()=>{mounted.current=false;document.removeEventListener('visibilitychange',visibility);controller.cancel();};
 },[controller]);
 useEffect(()=>{if(!active)controller.cancel();},[active,controller]);
 return {state,pending:speechPending(state),
  isPending:()=>speechPending(controller.getState()),
  toggle:()=>{if(latest.current.active)void controller.toggle();},
  cancel:()=>controller.cancel(),
  editQuestion:(text:string)=>{latest.current.question=text;latest.current.onQuestion(text);},
  insertRecovered:()=>{if(latest.current.active)controller.insertRecovered();},
 };
}
