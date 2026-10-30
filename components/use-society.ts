'use client';
import {useEffect,useRef,useState} from 'react';
import type {StakeholderSimulationRunV1} from '../lib/stakeholder-simulation/contract';
import {createSociety,advanceSociety,stepSociety,saveSociety,restoreSocietyForInput,restoreSociety,type SocietyWorld} from '../lib/society/engine';
import type {Platform} from '../lib/society/contract';
import type {GeographyIndex} from '../lib/society/geography';
import type {PopulationView} from '../lib/population/contract';
export function useSociety(run:StakeholderSimulationRunV1|null|undefined){
 const [world,setWorld]=useState<SocietyWorld|null>(null),[playing,setPlaying]=useState(false),[error,setError]=useState(''),[speed,setSpeed]=useState(1),[selected,setSelected]=useState<string|null>(null);const initial=useRef<SocietyWorld|null>(null);
 const [busy,setBusy]=useState(false),[platform,setPlatform]=useState<Platform>('reddit'),[threadId,setThreadId]=useState<string|null>(null);const session=useRef<{id:string;revision:number}|null>(null),pending=useRef<AbortController|null>(null),working=useRef(false),current=useRef(run);current.current=run;
 const id=run?.runId??null;
 useEffect(()=>{const abort=new AbortController();setWorld(null);setPlaying(false);setSelected(null);setError('');initial.current=null;session.current=null;pending.current?.abort();setBusy(false);working.current=false;setThreadId(null);if(!run||run.inputSnapshot.version!==2)return;const plan=run.inputSnapshot.scenarioPlan;
 async function load(){
  const status=await(await fetch('/api/social-simulate',{signal:abort.signal})).json();
  if(status.enabled&&status.configured){const response=await fetch('/api/social-simulate',{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.signal,body:JSON.stringify({operation:'start',run})});if(!response.ok)throw Error('The authoritative social session could not start.');const result=await response.json();if(abort.signal.aborted)return;session.current={id:result.sessionId,revision:result.revision};initial.current=result.world;setWorld(result.world);return;}
  const r=await fetch('/api/population?size=10000&seed=impactlens-society-v1',{signal:abort.signal});if(!r.ok)throw Error('The local synthetic population could not be loaded.');const population=await r.json() as PopulationView;
  const location=await fetch('/api/population/locations',{signal:abort.signal});if(!location.ok)throw Error('Source geography is unavailable.');const geography=await location.json() as GeographyIndex;
  const created=createSociety({runId:run!.runId,question:plan.request.question,seed:plan.requestIdentity.slice(-32),population,geography,sharePolicy:'source-position-v1',socialPolicy:'memory-aware-v1',roles:plan.draft.agents,jurisdictions:plan.draft.jurisdictions,acceptedActions:run!.events.map(e=>({id:e.id,roleId:e.roleId,statement:e.statement,position:e.position}))});initial.current=created;
  let saved:string|null=null;try{saved=localStorage.getItem('impactlens:society:'+run!.runId);}catch{}
  let next;if(saved&&JSON.parse(saved).genesis?.input?.hybrid){next=restoreSociety(saved);setError('Saved model world is read-only while social inference is disabled.');}else next=saved?restoreSocietyForInput(saved,created.genesis):advanceSociety(created,8);
  if(next.genesis.version<4)setError('Historical social policy retained. Reset social run to start the current policy.');else if(!saved)setError('Social model decisions are disabled on this server; this world uses simulation rules.');if(!abort.signal.aborted)setWorld(next);
 }
 void load().catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Social world could not load.');});return()=>{abort.abort();pending.current?.abort();};

 // Accepted run identity owns all async work; navigation cannot create a second world.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[id]);
 useEffect(()=>{if(!world)return;const timer=setTimeout(()=>{try{localStorage.setItem('impactlens:society:'+world.genesis.input.runId,saveSociety(world));}catch{setError('Browser persistence is unavailable; the current in-memory simulation is retained.');}},350);return()=>clearTimeout(timer);},[world]);
 const tick=useRef<()=>void>(()=>{});tick.current=()=>{void step();};
 useEffect(()=>{if(!playing)return;const timer=setInterval(()=>tick.current(),600/speed);return()=>clearInterval(timer);},[playing,speed]);
 useEffect(()=>{if(world?.status!=='ready')setPlaying(false);},[world?.status]);
 async function step(){if(working.current||!world)return;if(world.hybrid&&!session.current){setPlaying(false);return;}if(!session.current){setWorld(w=>w?stepSociety(w):w);return;}
  const owner=world.genesis.input.runId,controller=new AbortController();pending.current=controller;working.current=true;setBusy(true);
  try{const state=session.current;const response=await fetch('/api/social-simulate',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({operation:'step',sessionId:state.id,revision:state.revision})});if(!response.ok)throw Error('Social operation stopped. Reopen this recorded run to recover the authoritative session; no automatic model retry.');const result=await response.json();if(!controller.signal.aborted&&current.current?.runId===owner){session.current={id:result.sessionId,revision:result.revision};setWorld(result.world);setError('');}}
  catch(e){if(current.current?.runId===owner){setPlaying(false);setError(controller.signal.aborted?'Social decision cancelled. Accepted events are retained; recover the session before continuing.':e instanceof Error?e.message:'Social decision failed.');}}
  finally{if(pending.current===controller){pending.current=null;working.current=false;setBusy(false);}}
 }
 // Pause stops scheduling. An already dispatched bounded request finishes once; run changes still abort.
 const toggle=(value:boolean)=>{setPlaying(value);};
 return {world:world?.genesis.input.runId===id?world:null,playing,error,speed,selected,busy,platform,threadId,setPlatform,setThreadId,setSelected,setPlaying:toggle,setSpeed,step:()=>void step(),reset:async()=>{toggle(false);if(world?.hybrid){try{const response=await fetch('/api/social-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'start',run:current.current})});if(!response.ok)throw Error();const r=await response.json();if(r.world.genesis.input.runId===current.current?.runId){session.current={id:r.sessionId,revision:r.revision};setWorld(restoreSociety(JSON.stringify(r.world)));setError('Saved decisions replayed and verified. No inference was repeated.');}}catch{setError('Session recovery unavailable. The saved world remains inspectable.');}}else{setError('');if(initial.current)setWorld(advanceSociety(initial.current,8));}}};
}
