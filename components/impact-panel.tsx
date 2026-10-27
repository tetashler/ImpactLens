'use client';

import { useEffect, useRef, useState } from 'react';
import type { MrtIntervention } from '../prototype/mrt/scenario';
import type { CitizenProfileResponse } from '../lib/contracts/citizen-simulation';
import { parseImpactRequest, parseImpactResponse, parseImpactProfileResponse, canonicalImpactRequest } from '../lib/impact/api-contract';
import type { ImpactRequest, ImpactResponse } from '../lib/impact/api-contract';
import { ImpactRevisionGate, journeySide } from '../lib/impact/lifecycle';
import { CitizenProfile } from './citizens-panel';
import './impact.css';

interface Props { intervention:MrtIntervention; serviceDate:string; proposalRevision:number; canRun:boolean; view:'baseline'|'scenario'; onView:(view:'baseline'|'scenario')=>void }
const number=(n:number|null|undefined,digits=2)=>n==null?'Unknown':n.toLocaleString('en-SG',{maximumFractionDigits:digits});
const percent=(n:number|null)=>n===null?'Unknown':`${number(n*100)}%`;
const age=(s:string)=>s==='90andOver'?'90+':s.replaceAll('_','–');
const title=(s:string)=>s.replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());

export default function ImpactPanel(props:Props) {
  const [size,setSize]=useState(2000),[seed,setSeed]=useState('phase4c-demo'),[participation,setParticipation]=useState(80),[threshold,setThreshold]=useState(30),[sample,setSample]=useState(150);
  const [loaded,setLoaded]=useState<{key:string;data:ImpactResponse}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [selected,setSelected]=useState(''),[lookup,setLookup]=useState(''),[profile,setProfile]=useState<CitizenProfileResponse|null>(null),[profileError,setProfileError]=useState(''),[profileBusy,setProfileBusy]=useState(false);
  const [groupBy,setGroupBy]=useState<'ageGroup'|'sex'|'planningArea'|'subzone'>('ageGroup');
  const gate=useRef(new ImpactRevisionGate()),profileAbort=useRef<AbortController|null>(null);
  const request:ImpactRequest={serviceDate:props.serviceDate,intervention:props.intervention,assumptionSetId:'illustrative-cck-demand',participationRate:participation/100,population:{size,seed},thresholdMinutes:threshold,renderLimit:sample};
  let key:string;
  try{key=`${props.proposalRevision}:${canonicalImpactRequest(request)}`;}catch{key=`${props.proposalRevision}:invalid-settings`;}
  const latest=useRef(key);latest.current=key;
  const active=loaded?.key===key?loaded.data:null;
  const activeProfile=active&&profile?.metadata.scenarioId===active.identity.runId&&profile.citizen.agentId===selected?profile:null;
  useEffect(()=>{
    gate.current.invalidate();profileAbort.current?.abort();setLoaded(null);setBusy(false);setError('');setSelected('');setProfile(null);setProfileError('');setProfileBusy(false);
    const currentGate=gate.current;
    return ()=>{currentGate.invalidate();profileAbort.current?.abort();};
  },[key]);

  async function calculate() {
    let submitted:ImpactRequest;
    try{submitted=parseImpactRequest(structuredClone(request));}
    catch{setError('Use a valid proposal, 500–5,000 representatives, a nonempty seed, participation 0–100%, and threshold 0–180 minutes.');return;}
    const ticket=gate.current.begin(key);profileAbort.current?.abort();setBusy(true);setLoaded(null);setProfile(null);setError('');setProfileError('');
    try{
      const response=await fetch('/api/impact',{method:'POST',signal:ticket.controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(submitted)});
      const body=await response.json();if(!response.ok)throw new Error(typeof body.error==='string'?body.error:'Demographic calculation failed.');
      const data=await parseImpactResponse(body,submitted);
      if(gate.current.accepts(ticket,latest.current)){setLoaded({key:ticket.key,data});setSelected(data.payload.citizens[0]?.agentId??'');setLookup('');}
    }catch(e){if((e as Error).name!=='AbortError'&&gate.current.accepts(ticket,latest.current))setError((e as Error).message);}
    finally{if(gate.current.accepts(ticket,latest.current))setBusy(false);}
  }
  useEffect(()=>{
    setProfile(null);setProfileError('');setProfileBusy(false);
    if(!active||!selected)return;
    const atKey=key,atId=selected,controller=new AbortController();profileAbort.current?.abort();profileAbort.current=controller;setProfileBusy(true);
    const params=new URLSearchParams({runId:active.identity.runId,requestId:active.identity.requestId,agentId:atId});
    fetch(`/api/impact/profile?${params}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{
      const body=await response.json();if(!response.ok)throw new Error(typeof body.error==='string'?body.error:'Profile unavailable.');
      const parsed=parseImpactProfileResponse(body,active);
      if(parsed.profile.citizen.agentId!==atId)throw new Error('Selected citizen does not match this profile.');
      if(!controller.signal.aborted&&latest.current===atKey)setProfile(parsed.profile);
    }).catch(e=>{if(e.name!=='AbortError'&&!controller.signal.aborted&&latest.current===atKey)setProfileError(e.message);})
      .finally(()=>{if(!controller.signal.aborted&&latest.current===atKey)setProfileBusy(false);});
    return ()=>controller.abort();
  },[active?.identity.requestId,selected,key]);

  const overall=active?.metrics[0],side=journeySide(activeProfile?.journey??null,props.view);
  const groups=active?.metrics.filter(m=>m.group[groupBy]!==undefined&&(groupBy==='subzone'||Object.keys(m.group).length===1))??[];
  return <section className="impact-panel" aria-label="Calculated social impact">
    <div className="impact-heading"><h2>Calculated social impact</h2><p>Census-grounded residents. Explicitly assumed trips.</p></div>
    <div className="impact-body">
      <p className="impact-mode-note">Calculated residents are profile-only. No justified individual locations or movement paths are available. The miniature-city animation is a separate illustrative demo.</p>
      <fieldset className="impact-settings"><legend>Travel-demand assumptions</legend>
        <label>Assumption set<select aria-label="Travel-demand assumption set" value="illustrative-cck-demand" onChange={()=>{}}><option value="illustrative-cck-demand">Illustrative Choa Chu Kang demand</option></select></label>
        <p>Assume NS4 origins; destinations NE16 50%, NS4 25%, NS5 25%. These are sensitivity inputs, not observed commuting. All age/sex categories share these assumed probabilities.</p>
        <div className="impact-inputs">
          <label>Representatives<select aria-label="Population representatives" value={size} onChange={e=>setSize(Number(e.target.value))}>{[500,1000,2000,5000].map(n=><option key={n} value={n}>{number(n,0)}</option>)}</select></label>
          <label>Assumed participation (%)<input aria-label="Assumed participation (%)" type="number" min="0" max="100" value={participation} onChange={e=>setParticipation(Number(e.target.value))}/></label>
          <label>Accessibility threshold (min)<input aria-label="Accessibility threshold (min)" type="number" min="0" max="180" value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/></label>
          <label>Sample profiles<select aria-label="Sample profiles" value={sample} onChange={e=>setSample(Number(e.target.value))}>{[30,75,150].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
        </div>
        <label>Reproducible population / demand seed<input aria-label="Population and demand seed" maxLength={64} value={seed} onChange={e=>setSeed(e.target.value)}/></label>
      </fieldset>
      <p className="impact-context">Current proposal: <strong>{props.intervention.name||'Unnamed proposal'}</strong><br/>MRT service date {props.serviceDate} · Census reference year 2020</p>
      <button className="run-button" onClick={calculate} disabled={!props.canRun||busy}>{busy?<><span className="spinner"/> Calculating weighted impacts…</>:'Calculate demographic impact'}</button>
      {!props.canRun&&<p className="validation-hint">Complete a connected MRT proposal and valid service date first.</p>}
      {error&&<p className="impact-error" role="alert">{error}</p>}
      {!active&&!busy&&<p className="impact-empty" role="status">No current demographic result. Proposal or settings edits clear previous results; calculate again for this configuration.</p>}
      {active&&overall&&<div className="impact-report" role="region" aria-label="Current demographic report" data-run-id={active.identity.runId} data-request-id={active.identity.requestId}>
        <p className="impact-result-label">Calculated for {active.identity.request.intervention.name}<br/>{active.payload.metadata.simulationDate} · Census {active.payload.metadata.demographicReferenceYear}</p>
        <div className="citizens-view" role="group" aria-label="Calculated network view">{(['baseline','scenario'] as const).map(view=><button key={view} type="button" aria-pressed={props.view===view} onClick={()=>props.onView(view)}>{view==='baseline'?'Baseline':'Scenario'}</button>)}</div>
        <p className="impact-caption">View switching changes the displayed network and selected duration. The comparison and all group metrics stay the same.</p>
        <dl className="impact-overall">
          <div><dt>Represented population</dt><dd>{number(overall.coverage.representedPopulation)}</dd></div>
          <div><dt>Assigned population</dt><dd>{number(overall.coverage.assignedPopulation)}</dd></div>
          <div><dt>Comparable population</dt><dd>{number(overall.coverage.comparablePopulation)}</dd></div>
          <div><dt>Unassigned / unknown</dt><dd>{number(overall.coverage.unassignedPopulation)}</dd></div>
          <div className="impact-highlight"><dt>Weighted benefiting population</dt><dd>{number(overall.weightedBenefitingPopulation)}</dd></div>
          <div className="impact-highlight"><dt>Benefiting share</dt><dd>{percent(overall.benefiting.value)}</dd></div>
          <div className="impact-highlight"><dt>Mean journey-time saving</dt><dd>{number(overall.weightedMeanMinutesSaved)}{overall.weightedMeanMinutesSaved===null?'':' min'}</dd></div>
          <div><dt>Unreachable / unavailable</dt><dd>{number(overall.coverage.unreachablePopulation)}</dd></div>
          <div><dt>Newly reachable</dt><dd>{number(overall.coverage.newlyReachablePopulation)}</dd></div>
          <div><dt>Invalid assigned journeys</dt><dd>{number(overall.coverage.invalidPopulation)}</dd></div>
        </dl>
        <p className="impact-caption">Benefit share and mean savings use {number(overall.benefiting.denominatorPopulation)} comparable represented residents. Unassigned and unavailable savings are unknown, never zero.</p>
        <section className="impact-access" aria-label="Journey-time threshold accessibility"><h3>Access within {number(overall.accessibility.thresholdMinutes)} minutes</h3><div><span>Baseline <strong>{percent(overall.accessibility.baseline.value)}</strong></span><span>Scenario <strong>{percent(overall.accessibility.scenario.value)}</strong></span></div><p>Change: {number(overall.accessibility.changePercentagePoints)} percentage points</p><p className="impact-caption">Denominator: {number(overall.accessibility.baseline.denominatorPopulation)} assigned non-invalid represented residents. Station-to-station only; no walking access is included.</p></section>
        <section className="impact-groups"><h3>Who benefits under these assumptions?</h3><label>Compare by<select aria-label="Demographic grouping" value={groupBy} onChange={e=>setGroupBy(e.target.value as typeof groupBy)}><option value="ageGroup">Age band</option><option value="sex">Sex category</option><option value="planningArea">Planning area</option><option value="subzone">Subzone</option></select></label>
          <div className="impact-table-scroll" tabIndex={0} aria-label="Demographic comparison table"><table><caption>Benefits among comparable journeys; unknown means no comparable denominator.</caption><thead><tr><th scope="col">Group</th><th scope="col">Comparable weight</th><th scope="col">Benefit</th><th scope="col">Mean saved</th></tr></thead><tbody>{groups.map(m=><tr key={canonicalImpactRequest(m.group)}><th scope="row">{groupBy==='ageGroup'?age(m.group.ageGroup!):title(String(m.group[groupBy]))}</th><td>{number(m.coverage.comparablePopulation)}</td><td>{percent(m.benefiting.value)}</td><td>{m.weightedMeanMinutesSaved===null?'Unknown':`${number(m.weightedMeanMinutesSaved)} min`}</td></tr>)}</tbody></table></div>
          <p className="impact-caption">Differences describe seeded assignments and weights, not evidence of age- or sex-specific commuting behaviour. Geographic and demographic groups overlap.</p>
        </section>
        <section className="impact-profiles"><h3>Calculated synthetic residents</h3><p className="impact-caption">{active.payload.citizens.length} sampled profiles from {number(active.payload.metadata.population.agentCount,0)} representatives. Display sampling never changes the metrics.</p>
          <label>Calculated resident<select aria-label="Calculated synthetic resident" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose a calculated resident</option>{selected&&!active.payload.citizens.some(c=>c.agentId===selected)&&<option value={selected}>{selected}</option>}{active.payload.citizens.map(c=>{const journey=active.payload.journeys.find(j=>j.agentId===c.agentId);return <option key={c.agentId} value={c.agentId}>#{c.agentId.split('-').at(-1)} · {age(c.demographic.ageGroup)} · {c.demographic.sex} · {journey?.comparison?.status??'unassigned'}</option>;})}</select></label>
          <details><summary>Look up another ID in this run</summary><label>Synthetic ID<input aria-label="Full-population synthetic ID" value={lookup} maxLength={80} onChange={e=>setLookup(e.target.value)}/></label><button type="button" className="citizens-button" onClick={()=>{if(lookup.trim()===selected){setProfileError('Select another ID or rerun to refresh this profile.');}else setSelected(lookup.trim());}} disabled={!lookup.trim()}>Look up profile</button></details>
          {profileBusy&&<p role="status">Loading calculated profile…</p>}{profileError&&<p className="impact-error" role="alert">{profileError}</p>}
          {activeProfile&&<><p className="impact-side" aria-live="polite">Selected {props.view} journey: <strong>{side.minutes===null?'Unavailable':`${number(side.minutes)} min`}</strong> · {side.status.replaceAll('-',' ')}</p><CitizenProfile profile={activeProfile}/></>}
        </section>
        <details className="impact-diagnostics"><summary>Run identity, sources & limitations</summary><p>Run: <code>{active.identity.runId}</code></p><p>Request fingerprint: <code>{active.identity.requestId}</code></p><p>{active.payload.metadata.population.seed} · {number(active.diagnostics.uniqueOdPairs,0)} unique OD pairs · one deduplicated MRT engine call</p>{active.payload.sources.map(s=><p key={s.id}>{s.agency} · {s.referenceYear}<br/><a href={s.sourceUrl} target="_blank" rel="noreferrer">Demographic source</a> · <a href={s.licenceUrl} target="_blank" rel="noreferrer">Licence</a><br/>Raw-source fingerprint: <code>{s.rawSha256}</code></p>)}<p>Historical rounded leaf counts are retained: national 4,047,260 versus separately published 4,044,210. No normalisation. Seeded IDs depend on the source bytes.</p><p>One hypothetical trip per assigned representative. No observed commuting, individual locations, walking/rail geometry, crowding, real-time timetable, economic forecast or causal social outcome. The MRT timing model remains uncalibrated.</p></details>
      </div>}
    </div>
  </section>;
}
