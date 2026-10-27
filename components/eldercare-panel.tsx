'use client';
import type { AacScenario } from './use-aac-scenario';
import EldercareDashboard from './eldercare-dashboard';
import './eldercare-ui.css';

function Numeric({label,value,onChange,min,max,step=1}:{label:string;value:number;onChange:(n:number)=>void;min:number;max:number;step?:number}){
  return <label>{label}<input type="number" aria-label={label} value={Number.isFinite(value)?value:''} min={min} max={max} step={step} onChange={e=>onChange(e.target.value===''?NaN:Number(e.target.value))}/></label>;
}
export function AacEditor({state:s,hidden}:{state:AacScenario;hidden:boolean}){
  const d=s.draft,selected=s.facilities?.facilities.find(f=>f.id===s.selectedFacility);
  return <aside hidden={hidden} className="editor-panel aac-controls-panel" aria-label="Active Ageing Centre editor">
    <div className="panel-heading"><div><h2>Active Ageing Centre</h2><p>Hypothetical geographic access</p></div><span className="aac-service-symbol" aria-hidden="true">+</span></div>
    <div className="editor-scroll aac-controls">
      <p className="aac-ui-notice">{s.facilities?`${s.facilities.summary.corroboratedAac} corroborated AACs; ${s.facilities.summary.unknownServicePoints} historical points unclassified. Limited subset, not the complete AAC network. `:s.facilityError?'Catalogue unavailable; no existing AAC markers are shown. ':'Only corroborated records are shown; the catalogue is loading. '}Bukit Merah preset only. Census 2020 age bands, two landmark proxies; no individual home locations.</p>
      {s.facilityError&&<div><p className="aac-error" role="alert">{s.facilityError}</p><button onClick={s.retryFacilities}>Retry AAC catalogue</button></div>}
      <label>Proposed centre name<input aria-label="Proposed centre name" maxLength={160} value={d.name} onChange={e=>s.update({name:e.target.value})}/></label>
      <div className="aac-place-actions"><button className="aac-primary" onClick={()=>s.setPlacing(true)} aria-pressed={s.placing}>{d.position?'Reposition centre':'Place New Centre'}</button>{s.placing&&<button onClick={s.cancelPlacement}>Cancel placement</button>}</div>
      <p className="aac-control-hint">{s.placing?'Click an empty map location. Escape cancels placement.':d.position?'Drag the HYP marker, click Reposition, or edit coordinates.':'Choose a position on the map, enter coordinates, or load the demonstration.'}</p>
      <div className="aac-coordinate-inputs"><Numeric label="AAC latitude" value={d.position?.lat??NaN} min={1.15} max={1.5} step={.00001} onChange={lat=>s.update({position:{lat,lon:d.position?.lon??NaN}})}/><Numeric label="AAC longitude" value={d.position?.lon??NaN} min={103.6} max={104.1} step={.00001} onChange={lon=>s.update({position:{lon,lat:d.position?.lat??NaN}})}/></div>
      <p className="aac-site-label">Hypothetical — not a confirmed development site.</p>
      <Numeric label="Straight-line accessibility radius (m)" value={d.thresholdMetres} min={0} max={5000} step={50} onChange={thresholdMetres=>s.update({thresholdMetres})}/>
      <p className="aac-control-hint">Assumed geographic distance to a compatible AAC. Not a pedestrian route or verified catchment.</p>
      <label className="aac-checkbox"><input type="checkbox" checked={d.comparisonThresholdsMetres.includes(1000)} onChange={e=>s.update({comparisonThresholdsMetres:e.target.checked?[1000]:[]})}/>Also compare 1,000 m (unique thresholds only)</label>
      <label>Modelled age cutoff<select aria-label="AAC modelled age cutoff" value={d.minimumAge} onChange={e=>s.update({minimumAge:Number(e.target.value)})}>{[60,65,70,75,80,85,90].map(a=><option key={a} value={a}>{a}+ in Census 2020</option>)}</select></label>
      <label>Existing facility availability<select aria-label="Existing AAC availability" value={d.existingAvailability} onChange={e=>s.update({existingAvailability:e.target.value as typeof d.existingAvailability})}><option value="assume-listed-available">Assume listed centres available</option><option value="exclude-unconfirmed">Exclude unconfirmed centres</option></select></label>
      <p className="aac-control-hint">Historical records do not confirm present-day opening. Excluding unconfirmed centres may leave no baseline facility.</p>
      <details className="aac-advanced"><summary>Advanced assumptions</summary>
        <label className="aac-checkbox"><input type="checkbox" checked={d.capacityUsers!==null} onChange={e=>s.update({capacityUsers:e.target.checked?100:null})}/>Record an illustrative capacity</label>
        {d.capacityUsers!==null&&<Numeric label="Assumed AAC capacity (users)" value={d.capacityUsers} min={1} max={10000} onChange={capacityUsers=>s.update({capacityUsers})}/>}
        <p className="aac-control-hint">Capacity is unknown by default. This optional assumption does not model enrolment, allocate services or cap geographic access.</p>
        <label className="aac-checkbox"><input type="checkbox" checked={d.walkingMetresPerSecond!==null} onChange={e=>s.update({walkingMetresPerSecond:e.target.checked?1:null})}/>Show assumed straight-line time conversions</label>
        {d.walkingMetresPerSecond!==null&&<Numeric label="Assumed speed (m/s)" value={d.walkingMetresPerSecond} min={.1} max={2.5} step={.1} onChange={walkingMetresPerSecond=>s.update({walkingMetresPerSecond})}/>}
        <label>Population representatives<select aria-label="AAC population representatives" value={d.size} onChange={e=>s.update({size:Number(e.target.value)})}>{[1000,2000,5000].map(n=><option key={n} value={n}>{n.toLocaleString()}</option>)}</select></label>
        <label>Population seed<input aria-label="AAC population seed" maxLength={80} value={d.seed} onChange={e=>s.update({seed:e.target.value})}/></label>
        <label>Model reference date<input aria-label="AAC reference date" type="date" min="2026-10-27" max="2030-12-31" value={d.referenceDate} onChange={e=>s.update({referenceDate:e.target.value})}/></label><p className="aac-control-hint">A later reference date does not update or age-forward Census 2020 residents, or confirm facility opening.</p>
      </details>
      <div className="aac-edit-actions"><button onClick={s.loadDemo}>Load Bukit Merah demo</button><button onClick={s.reset}>Reset AAC proposal</button></div>
      <section className="aac-catalogue"><h3>Known AAC records</h3>{s.facilityBusy&&<p role="status">Loading corroborated catalogue…</p>}
        {s.facilities&&<><p className="aac-ui-notice">{s.facilities.summary.corroboratedAac} corroborated AACs from {s.facilities.summary.historicalPoints} historical points; {s.facilities.summary.unknownServicePoints} remain unclassified. This is not Singapore’s complete AAC network.</p><label>Inspect existing AAC<select aria-label="Inspect existing AAC" value={s.selectedFacility??''} onChange={e=>s.setSelectedFacility(e.target.value||null)}><option value="">Choose a corroborated record</option>{s.facilities.facilities.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label></>}
        {selected&&<div className="aac-facility-detail" aria-label="Selected AAC record"><h4>{selected.name}</h4><p>{selected.address??selected.corroboration?.listedAddress??'Address unavailable'}</p><dl><div><dt>Classification</dt><dd>Corroborated AAC</dd></div><div><dt>Operation</dt><dd>Listed, unconfirmed</dd></div><div><dt>Capacity / opening date</dt><dd>Unknown</dd></div><div><dt>Historical point updated</dt><dd>{selected.recordUpdated??'Not supplied'}</dd></div></dl><p>Historical coordinates, not a present-day opening confirmation.</p><a href={selected.corroboration!.evidenceUrl} target="_blank" rel="noreferrer">Operator evidence · checked {selected.corroboration!.checkedDate}</a><a href={s.facilities!.source.url} target="_blank" rel="noreferrer">{s.facilities!.source.agency} historical source</a></div>}
      </section>
    </div>
    <div className="editor-footer"><button className="run-button" onClick={s.calculate} disabled={!!s.validation||s.busy}>{s.busy?<><span className="spinner"/> Calculating geographic access…</>:'Calculate AAC Impact'}</button>{s.validation&&<p className="aac-control-hint">{s.validation}</p>}</div>
  </aside>;
}
export function AacResults({state:s,hidden}:{state:AacScenario;hidden:boolean}){
  return <aside hidden={hidden} className="results-panel aac-results" aria-label="AAC accessibility results"><div className="panel-heading"><div><h2>AAC accessibility</h2><p>Closer access, with coverage in context.</p></div></div><div className="results-scroll aac-results-scroll">
    {s.error&&<p className="aac-error" role="alert">{s.error}</p>}{s.busy&&<p role="status"><span className="spinner"/> Calculating the current centre and assumptions…</p>}
    {!s.report&&!s.busy&&<div className="aac-empty" role="status"><span className="aac-service-symbol" aria-hidden="true">+</span><h3>{s.draft.position?'Ready to compare geographic access':'Place a possible connection to care.'}</h3><p>Position a hypothetical AAC and calculate. Proximity may improve even when no additional residents cross an access threshold.</p><p>Outcomes apply only to the limited catalogue and supported Bukit Merah proxies. Unlocated residents remain unassessed.</p></div>}
    {s.report&&<div className="aac-current-report" data-scenario-id={s.report.identity.scenarioId} data-request-fingerprint={s.report.identity.requestFingerprint} data-client-request-id={s.report.identity.clientRequestId}>
      <p className="aac-current-site"><strong>{s.report.request.intervention.name}</strong><br/>{s.report.request.intervention.position.lat.toFixed(5)}, {s.report.request.intervention.position.lon.toFixed(5)} · hypothetical</p>
      <EldercareDashboard report={s.report} selectedThresholdMetres={s.draft.thresholdMetres}/>
      <details className="aac-model-origins"><summary>Geographic proxy points & optional times</summary>{s.report.result.comparisons.map(c=><div key={c.origin.id}><strong>{c.origin.subzone.replaceAll('-',' ')}</strong><p>{c.origin.provenance.description}</p><p>{c.origin.position.lat.toFixed(5)}, {c.origin.position.lon.toFixed(5)}. This is a public landmark reference, not a home or a cluster of residents.</p>{c.assumedStraightLineWalkingMinutes&&<p>Assumed straight-line conversion: {c.assumedStraightLineWalkingMinutes.baseline?.toFixed(2)??'Unknown'} → {c.assumedStraightLineWalkingMinutes.scenario?.toFixed(2)??'Unknown'} minutes. Not a walking-route time.</p>}<a href={c.origin.provenance.sourceUrl} target="_blank" rel="noreferrer">Proxy source</a></div>)}</details>
      <details className="aac-identities"><summary>Calculation identity</summary><p>Attempt: {s.report.identity.clientRequestId}</p><p>Request: {s.report.identity.requestFingerprint}</p><p>Scenario: {s.report.identity.scenarioId}</p></details>
    </div>}
  </div></aside>;
}
