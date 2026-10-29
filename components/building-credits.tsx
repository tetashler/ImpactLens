'use client';
import { useEffect,useRef } from 'react';
import type { BuildingManifest } from '../lib/buildings/contract';
import './building-controls.css';

export const HDB_SOURCE_URL='https://data.gov.sg/datasets/d_16b157c52ed637edd6ba1232e026258d/view';
export const SODL_URL='https://data.gov.sg/open-data-licence';
const URA_BOUNDARY_URL='https://data.gov.sg/datasets/d_8594ae9ff96d0c708bc2af633048edfb/view';
const URA_BUILDING_URL='https://data.gov.sg/datasets/d_ee3bd86e1334fbc58b520cd987090e54/view';
const OVERTURE_URL='https://docs.overturemaps.org/guides/buildings/';
export type BuildingView='unified'|'hdb';
export default function BuildingCredits({view,manifest,problem,onRetry}:{view:BuildingView;manifest:BuildingManifest|null;problem?:string;onRetry?:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  const strip=useRef<HTMLDivElement>(null);
  useEffect(()=>{const element=strip.current,parent=element?.parentElement;if(!element||!parent)return;const resize=()=>parent.style.setProperty('--building-credit-height',`${element.getBoundingClientRect().height}px`);resize();const observer=new ResizeObserver(resize);observer.observe(element);return()=>{observer.disconnect();parent.style.removeProperty('--building-credit-height');};},[]);
  const registry=manifest?.sources??(manifest?[manifest.source]:[]);
  const sources=view==='unified'?registry:registry.filter(s=>s.id==='hdb'||s.id==='hdb-local');
  return <div ref={strip} className="building-credit-strip" role="region" aria-label="Map sources and licences">
    <div className="building-credit-links">
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      <span className="building-credit-data"><a href={URA_BOUNDARY_URL} target="_blank" rel="noreferrer">URA boundaries</a><span aria-hidden="true"> · </span><a href={SODL_URL} target="_blank" rel="noreferrer" aria-label="Singapore Open Data Licence">SODL</a></span>
      <span className="building-credit-data">Buildings: {sources.length?sources.map((source,i)=><span key={source.id}>{i>0?' / ':''}<a href={source.url} target="_blank" rel="noreferrer">{source.id==='overture'?'Overture':source.id.toUpperCase()}</a></span>):<><a href={HDB_SOURCE_URL} target="_blank" rel="noreferrer">HDB</a>{view==='unified'&&<> / <a href={URA_BUILDING_URL} target="_blank" rel="noreferrer">URA</a> / <a href={OVERTURE_URL} target="_blank" rel="noreferrer">Overture</a></>}</>}</span>
      {view==='hdb'&&<span className="building-credit-limit">HDB · illustrative 12 m</span>}
      <button type="button" aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}>Sources & licences</button>
    </div>
    {problem&&<p className="building-credit-error" role="alert">{problem} {onRetry&&<button type="button" onClick={onRetry}>Retry buildings</button>}</p>}
    <dialog ref={dialog} className="building-source-dialog" aria-labelledby="building-source-title" onKeyDown={event=>{if(event.key==='Escape')event.stopPropagation();}}>
      <div className="building-source-heading"><h2 id="building-source-title">Map sources & licences</h2><button type="button" aria-label="Close map sources and licences" onClick={()=>dialog.current?.close()}>Close</button></div>
      {view==='unified'?<><p className="building-local-review">Internal review only. The combined catalogue is not cleared for public demonstration, hosting or redistribution. Serving a public presentation from localhost does not resolve its licensing review.</p><p>HDB, URA and Overture footprints; coverage incomplete and some source overlaps remain. This is not a certified city model or evidence of where synthetic residents live.</p><p>Heights use direct source attributes where available, an assumed 3 m per sourced floor, or an illustrative 12 m fallback. Direct-source height does not mean independently surveyed.</p></>:<p>Supplied HDB footprints cover only part of the built environment, all displayed at illustrative 12 m. The original acquisition receipt is unavailable; this fallback needs its own provenance and licence review.</p>}
      {view==='unified'&&<p>Combined-database licence compatibility remains unresolved. The conflation may be a Derivative Database under ODbL; separating source files does not settle this. Public use requires review of compatibility, notices and a machine-readable database or alteration offer under ODbL section 4.6. The supplied HDB acquisition receipt is unavailable; its local access date does not establish its original download date.</p>}
      {sources?.map(source=><section key={source.id}><h3>{source.title}</h3><p>{source.attribution}</p><p>{source.publisher} · reference {source.referenceDate} · accessed {source.accessedDate}</p><a href={source.url} target="_blank" rel="noreferrer">Source catalogue</a>{' · '}<a href={source.licenceUrl} target="_blank" rel="noreferrer">Source licence</a></section>)}
      {!sources?.length&&<p><a href={HDB_SOURCE_URL} target="_blank" rel="noreferrer">HDB catalogue</a>{' · '}<a href={SODL_URL} target="_blank" rel="noreferrer">Singapore Open Data Licence</a>{view==='unified'?' · Unified source metadata is available when the catalogue loads.':''}</p>}
      {view==='unified'&&<section><h3>Overture upstream credits</h3><p>© OpenStreetMap contributors, Overture Maps Foundation; Microsoft ML Buildings (ODbL); Google Open Buildings (CC BY 4.0). The local manifest records these sources, not a complete upstream rights audit.</p><a href="https://docs.overturemaps.org/attribution/#buildings" target="_blank" rel="noreferrer">Overture attribution and licensing</a>{' · '}<a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">ODbL 1.0</a>{' · '}<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></section>}
      <section><h3>Base geography and streets</h3><p>Contains information from URA Master Plan 2019 Subzone Boundary (No Sea), supplied locally in WGS84 coordinates. The original boundary acquisition URL, access date and licence receipt were not supplied or independently verified. The linked current catalogue is a reference, not proof of this file’s acquisition.</p><a href={URA_BOUNDARY_URL} target="_blank" rel="noreferrer">URA boundary catalogue</a>{' · '}<a href={SODL_URL} target="_blank" rel="noreferrer">Singapore Open Data Licence</a><p>Optional street tiles: © OpenStreetMap contributors, available under ODbL. Online tiles are served separately by OpenStreetMap; availability is best effort.</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap copyright and licence</a>{' · '}<a href="https://operations.osmfoundation.org/policies/tiles/" target="_blank" rel="noreferrer">Tile usage policy</a></section>
      <form method="dialog"><button type="submit">Return to map</button></form>
    </dialog>
  </div>;
}
