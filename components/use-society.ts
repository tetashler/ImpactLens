'use client';
import {useEffect,useRef,useState} from 'react';
import type {StakeholderSimulationRunV1} from '../lib/stakeholder-simulation/contract';
import {createSociety,advanceSociety,stepSociety,saveSociety,restoreSocietyForInput,type SocietyWorld} from '../lib/society/engine';
import type {GeographyIndex} from '../lib/society/geography';
import type {PopulationView} from '../lib/population/contract';
export function useSociety(run:StakeholderSimulationRunV1|null|undefined){
 const [world,setWorld]=useState<SocietyWorld|null>(null),[playing,setPlaying]=useState(false),[error,setError]=useState(''),[speed,setSpeed]=useState(1),[selected,setSelected]=useState<string|null>(null);const initial=useRef<SocietyWorld|null>(null);
 const id=run?.runId??null;
 useEffect(()=>{const abort=new AbortController();setWorld(null);setPlaying(false);setSelected(null);setError('');initial.current=null;if(!run||run.inputSnapshot.version!==2)return;const plan=run.inputSnapshot.scenarioPlan;
 fetch('/api/population?size=10000&seed=impactlens-society-v1',{signal:abort.signal}).then(async r=>{if(!r.ok)throw Error('The local synthetic population could not be loaded. Accepted model actions remain available.');const population=await r.json() as PopulationView;const locationResponse=await fetch('/api/population/locations',{signal:abort.signal});if(!locationResponse.ok)throw Error('Source geography is unavailable; no synthetic location was fabricated.');const geography=await locationResponse.json() as GeographyIndex;if(abort.signal.aborted)return;const created=createSociety({runId:run.runId,question:plan.request.question,seed:plan.requestIdentity.slice(-32),population,geography,sharePolicy:'source-position-v1',roles:plan.draft.agents,jurisdictions:plan.draft.jurisdictions,acceptedActions:run.events.map(e=>({id:e.id,roleId:e.roleId,statement:e.statement,position:e.position}))});initial.current=created;let saved:string|null=null;try{saved=localStorage.getItem('impactlens:society:'+run.runId);}catch{/* Storage can be unavailable without blocking in-memory exploration. */}const next=saved?restoreSocietyForInput(saved,created.genesis):advanceSociety(created,8);if(next.genesis.version<3)setError('This saved world retains the legacy sharing policy. Reset social run to start a new world with source-position sharing.');if(!abort.signal.aborted)setWorld(next);}).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Synthetic society could not load.');});return()=>abort.abort();
 // Accepted run identity owns all async work; navigation cannot create a second world.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[id]);
 useEffect(()=>{if(!world)return;const timer=setTimeout(()=>{try{localStorage.setItem('impactlens:society:'+world.genesis.input.runId,saveSociety(world));}catch{setError('Browser persistence is unavailable; the current in-memory simulation is retained.');}},350);return()=>clearTimeout(timer);},[world]);
 useEffect(()=>{if(!playing)return;const timer=setInterval(()=>setWorld(w=>w?stepSociety(w):w),600/speed);return()=>clearInterval(timer);},[playing,speed]);
 useEffect(()=>{if(world?.status!=='ready')setPlaying(false);},[world?.status]);
 return {world:world?.genesis.input.runId===id?world:null,playing,error,speed,selected,setSelected,setPlaying,setSpeed,step:()=>setWorld(w=>w?stepSociety(w):w),reset:()=>{setPlaying(false);setError('');if(initial.current)setWorld(advanceSociety(initial.current,8));}};
}
