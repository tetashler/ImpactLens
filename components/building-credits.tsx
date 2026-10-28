'use client';
import { useEffect,useRef } from 'react';
import type { BuildingManifest } from '../lib/buildings/contract';
import './building-controls.css';

export const HDB_SOURCE_URL='https://data.gov.sg/datasets/d_16b157c52ed637edd6ba1232e026258d/view';
export const SODL_URL='https://data.gov.sg/open-data-licence';
export type BuildingView='unified'|'hdb';
export default function BuildingCredits({view,manifest,problem,onRetry}:{view:BuildingView;manifest:BuildingManifest|null;problem?:string;onRetry?:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  const strip=useRef<HTMLDivElement>(null);
  useEffect(()=>{const element=strip.current,parent=element?.parentElement;if(!element||!parent)return;const resize=()=>parent.style.setProperty('--building-credit-height',`${element.getBoundingClientRect().height}px`);resize();const observer=new ResizeObserver(resize);observer.observe(element);return()=>{observer.disconnect();parent.style.removeProperty('--building-credit-height');};},[]);
  const sources=view==='unified'?manifest?.sources:manifest?.sources?.filter(s=>s.id==='hdb');
  return <div ref={strip} className="building-credit-strip">
    <div className="building-credit-links"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a><span> · Buildings: </span>{sources?.length?sources.map((source,i)=><span key={source.id}>{i>0?' · ':''}<a href={source.url} target="_blank" rel="noreferrer">{source.id==='overture'?'Overture':source.id.toUpperCase()}</a></span>):view==='hdb'?<a href={HDB_SOURCE_URL} target="_blank" rel="noreferrer">HDB</a>:<span>{problem?'catalogue unavailable':'catalogue loading'}</span>}<button type="button" onClick={()=>dialog.current?.showModal()}>Sources & licences</button></div>
    {problem&&<p className="building-credit-error" role="alert">{problem} {onRetry&&<button type="button" onClick={onRetry}>Retry buildings</button>}</p>}
    <p>{view==='unified'?'Internal local review only · public demonstration not cleared.':'Existing HDB · limited coverage · illustrative 12 m heights.'}</p>
    <dialog ref={dialog} className="building-source-dialog" aria-labelledby="building-source-title" onKeyDown={event=>{if(event.key==='Escape')event.stopPropagation();}}>
      <div className="building-source-heading"><h2 id="building-source-title">Building sources & height limits</h2><button type="button" aria-label="Close building sources" onClick={()=>dialog.current?.close()}>Close</button></div>
      {view==='unified'?<><p className="building-local-review">Internal review only. The combined catalogue is not cleared for public demonstration, hosting or redistribution. Serving a public presentation from localhost does not resolve its licensing review.</p><p>HDB, URA and Overture footprints; coverage incomplete and some source overlaps remain. This is not a certified city model or evidence of where synthetic residents live.</p><p>Heights use direct source attributes where available, an assumed 3 m per sourced floor, or an illustrative 12 m fallback. Direct-source height does not mean independently surveyed.</p></>:<p>Supplied HDB footprints cover only part of the built environment, all displayed at illustrative 12 m. The original acquisition receipt is unavailable; this fallback needs its own provenance and licence review.</p>}
      {sources?.map(source=><section key={source.id}><h3>{source.title}</h3><p>{source.attribution}</p><p>{source.publisher} · reference {source.referenceDate} · accessed {source.accessedDate}</p><a href={source.url} target="_blank" rel="noreferrer">Source catalogue</a>{' · '}<a href={source.licenceUrl} target="_blank" rel="noreferrer">Source licence</a></section>)}
      {!sources?.length&&<p><a href={HDB_SOURCE_URL} target="_blank" rel="noreferrer">HDB catalogue</a>{' · '}<a href={SODL_URL} target="_blank" rel="noreferrer">Singapore Open Data Licence</a>{view==='unified'?' · Unified source metadata is available when the catalogue loads.':''}</p>}
      <section><h3>Base geography and streets</h3><p>URA Master Plan 2019 subzone boundaries; WGS84 coordinates. Optional street tiles are a separate online source.</p><a href={SODL_URL} target="_blank" rel="noreferrer">Singapore Open Data Licence</a>{' · '}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap copyright</a></section>
      <form method="dialog"><button type="submit">Return to map</button></form>
    </dialog>
  </div>;
}
