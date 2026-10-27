'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CitizensPanel from './citizens-panel';
import ImpactPanel from './impact-panel';
import { citizenViewPairFixture } from '../lib/citizens/fixtures';
import type { CitizenView, CitizenViewPair } from '../lib/citizens/data';
import type { CitizenStats } from '../lib/citizens/layer';
import type { NetworkCatalog, SimulationResponse, MapStation } from '../lib/map-contract';
import { draftToIntervention, type EditorDraft, type DraftStop } from '../lib/editor';
import { illustrativeLine } from '../prototype/mrt/examples/illustrative-line';
import { useAacScenario } from './use-aac-scenario';
import { AacEditor,AacResults } from './eldercare-panel';
import type { AacMapOptions } from '../lib/eldercare/map-layer';
import type { OriginReference } from '../prototype/eldercare/types';
const NO_AAC_ORIGINS:OriginReference[]=[];
const SingaporeMap = dynamic(() => import('./singapore-map'), { ssr: false, loading: () => <div className="map-loading"><span className="spinner" /> Preparing map</div> });

function exampleDraft(): EditorDraft {
  return { id: illustrativeLine.id, name: 'Illustrative North Link', waitingTimeSeconds: illustrativeLine.waitingTimeSeconds!,
    stations: illustrativeLine.stations.map((s, i) => ({ ...s, key: `example-${i}` })),
    segments: illustrativeLine.segments.map(s => ({ runSeconds: s.runSeconds, dwellSeconds: s.dwellSeconds })) };
}
const defaultSegment = () => ({ runSeconds: 300, dwellSeconds: 30 });
function Icon({ name, size = 18 }: { name: 'train' | 'pin' | 'layers' | 'arrow' | 'undo' | 'reset' | 'play' | 'chevron' | 'swap'; size?: number }) {
  const paths = {
    train: <><rect x="5" y="3" width="14" height="15" rx="4" /><path d="M5 10h14M9 3v7m6-7v7M8 18l-2 3m10-3 2 3M8 14h.01M16 14h.01" /></>,
    pin: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    undo: <><path d="M3 10h12a6 6 0 0 1 0 12M3 10l6-6m-6 6 6 6" /></>,
    reset: <><path d="M3 10a9 9 0 1 1 1 8M3 4v6h6" /></>,
    play: <path d="m8 4 13 8-13 8V4Z" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    swap: <><path d="M4 7h16l-4-4M20 17H4l4 4" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
function NumberField({ label, value, onChange, step = 1, min = 0 }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  return <label className="number-field"><span>{label}</span><input type="number" aria-label={label} value={Number.isFinite(value) ? value : ''} step={step} min={min} onChange={e => onChange(e.target.value === '' ? NaN : Number(e.target.value))} /></label>;
}

export default function Workspace() {
  const [interventionMode,setInterventionMode]=useState<'mrt'|'aac'>('mrt');
  const aac=useAacScenario(interventionMode==='aac');
  const aacOrigins=aac.report?.result.provenance.originReferences??NO_AAC_ORIGINS;
  const aacOptions=useMemo<AacMapOptions>(()=>({active:interventionMode==='aac',placing:aac.placing,position:aac.draft.position,radiusMetres:aac.draft.thresholdMetres,facilities:aac.facilities,selectedFacility:aac.selectedFacility,origins:aacOrigins,focusKey:aac.focusKey,onPlace:aac.place,onSelect:aac.setSelectedFacility,onDragStart:aac.invalidate,onCancel:aac.cancelPlacement,onStartPlacement:()=>aac.setPlacing(true),onFocus:aac.focus}),[interventionMode,aac.placing,aac.draft.position,aac.draft.thresholdMetres,aac.facilities,aac.selectedFacility,aacOrigins,aac.focusKey,aac.place,aac.setSelectedFacility,aac.invalidate,aac.cancelPlacement,aac.setPlacing,aac.focus]);
  const [inspector,setInspector]=useState<'journey'|'citizens'|'impact'>('journey');
  const [impactWide,setImpactWide]=useState(false);
  const [impactView,setImpactView]=useState<'baseline'|'scenario'>('scenario'),[impactRevision,setImpactRevision]=useState(0);
  const [pair,setPair]=useState<CitizenViewPair>(citizenViewPairFixture),[view,setView]=useState<CitizenView>('baseline');
  const [selectedId,setSelectedId]=useState<string|null>(citizenViewPairFixture.baseline.citizens[0].agentId);
  const [playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[resetKey,setResetKey]=useState(0),[focusKey,setFocusKey]=useState(0),[citizensEnabled,setCitizensEnabled]=useState(true);
  const [citizenStats,setCitizenStats]=useState<CitizenStats>({visible:0,fps:null,drawCalls:0,status:'Zoom in to see citizens',elapsedSeconds:0});
  const focusCitizens=useCallback(()=>{setInspector('citizens');setCitizensEnabled(true);setFocusKey(k=>k+1);},[]);
  const selectCitizen=useCallback((id:string)=>{setSelectedId(id);setInspector('citizens');},[]);
  const togglePlayback=useCallback(()=>setPlaying(p=>!p),[]);
  // Calculated mode has no geographic agents. Fixture mode never overlays the unrelated editable proposal.
  const citizenOptions=useMemo(()=>({pair,view,selectedId,playing,speed,resetKey,focusKey,networkView:inspector==='journey'?'editor' as const:inspector==='impact'?impactView:'baseline' as const,enabled:interventionMode==='mrt'&&inspector==='citizens'&&citizensEnabled,onStats:setCitizenStats,onSelect:selectCitizen,onFocus:focusCitizens,onPlayPause:togglePlayback}),[interventionMode,pair,view,selectedId,playing,speed,resetKey,focusKey,inspector,impactView,citizensEnabled,selectCitizen,focusCitizens,togglePlayback]);
  const loadCitizens=(next:CitizenViewPair)=>{setPair(next);setSelectedId(next.baseline.citizens[0]?.agentId??null);setPlaying(false);setResetKey(k=>k+1);};
  const [catalog, setCatalog] = useState<NetworkCatalog | null>(null), [networkError, setNetworkError] = useState('');
  const [date, setDate] = useState('2026-10-27'), [draft, setDraft] = useState<EditorDraft>(exampleDraft);
  const [mode, setMode] = useState<'anchor' | 'place'>('anchor'), [disabledSegments, setDisabledSegments] = useState<number[]>([]);
  const [history, setHistory] = useState<{ draft: EditorDraft; disabled: number[] }[]>([]), [addId, setAddId] = useState('');
  const [origin, setOrigin] = useState('NS4'), [destination, setDestination] = useState('NE16');
  const [result, setResult] = useState<SimulationResponse | null>(null), [running, setRunning] = useState(false), [error, setError] = useState('');
  const [message, setMessage] = useState('An illustrative line is loaded. Edit it or start a new proposal.');
  const revision = useRef(0), request = useRef<AbortController | null>(null), nextId = useRef(1);
  const invalidate = () => { revision.current++; request.current?.abort(); setImpactRevision(n=>n+1); setResult(null); setRunning(false); setError(''); };
  useEffect(() => {
    const abort = new AbortController(); setCatalog(null); setNetworkError('');
    fetch(`/api/network?date=${encodeURIComponent(date)}`, { signal: abort.signal }).then(async r => {
      const body = await r.json(); if (!r.ok) throw new Error(body.error ?? 'Network could not load'); return body;
    }).then(setCatalog).catch(e => { if (e.name !== 'AbortError') setNetworkError(e.message); });
    return () => abort.abort();
  }, [date]);

  const change = (next: EditorDraft, disabled = disabledSegments) => {
    setHistory(h => [...h.slice(-19), { draft: structuredClone(draft), disabled: [...disabledSegments] }]);
    setDraft(next); setDisabledSegments(disabled); invalidate();
  };
  const stationName = (s: DraftStop) => s.kind === 'new' ? s.name : catalog?.stations.find(p => p.id === s.stationId)?.name ?? s.stationId;
  const patchStop = (key: string, patch: Record<string, unknown>) => change({ ...draft, stations: draft.stations.map(s => s.key === key ? { ...s, ...patch } as DraftStop : s) });
  const reorder = (index: number, offset: number) => {
    const stations = [...draft.stations], target = index + offset;
    if (target < 0 || target >= stations.length) return;
    [stations[index], stations[target]] = [stations[target], stations[index]];
    change({ ...draft, stations, segments: stations.slice(1).map(defaultSegment) }, []);
    setMessage('Station order changed. Connections now use 300 s run + 30 s dwell; review these assumptions.');
  };
  const addExisting = (id: string) => {
    if (draft.stations.some(s => s.kind === 'existing' && s.stationId === id)) { setMessage('That interchange is already in your line. Use the arrows to change its order.'); return; }
    const stations: DraftStop[] = [...draft.stations, { kind: 'existing', stationId: id, key: `anchor-${id}`, transferWalkSeconds: 180 }];
    change({ ...draft, stations, segments: stations.length > 1 ? [...draft.segments, defaultSegment()] : [] });
    setMessage(`${catalog?.stations.find(s => s.id === id)?.name ?? id} added. New segment: 300 s run + 30 s dwell.`); setAddId('');
  };
  const addPoint = (point: { lat: number; lon: number }) => {
    const n = nextId.current++, id = `HYP_CUSTOM_${n}`;
    const stations: DraftStop[] = [...draft.stations, { kind: 'new', id, key: id, name: `Proposed station ${n}`, ...point, locationNote: 'Hypothetical location selected on the map; no site or engineering assessment.' }];
    change({ ...draft, stations, segments: stations.length > 1 ? [...draft.segments, defaultSegment()] : [] });
    setMessage(`Proposed station ${n} placed at ${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}. Drag its marker or edit coordinates.`);
  };
  const allStations: MapStation[] = [...(catalog?.stations ?? []), ...draft.stations.flatMap(s => s.kind === 'new' ? [{ id: s.id, name: s.name, lat: s.lat, lon: s.lon, lines: [draft.id], kind: 'hypothetical' as const }] : [])];
  const comparison = result?.comparisons[0] ?? null;
  const citizenNotice=pair[view].metadata.resultKind==='illustrative'
    ? 'Illustrative miniature-city animation — not observed individual travel. These fixture citizens are independent of the calculated demographic report. The editable MRT proposal is hidden in this demo. Toy sizes are exaggerated; paths are schematic.'
    : `Imported visualisation: ${pair[view].metadata.scenarioId}, service date ${pair[view].metadata.simulationDate}. This is independent of the calculated impact report and editable MRT proposal, which is hidden here. Positions and paths are supplied visual assumptions.`;
  const canRun = !!catalog && draft.stations.length >= 2 && draft.stations.some(s => s.kind === 'existing') && !disabledSegments.length;
  const simulate = async () => {
    if (!canRun) { setError('Add at least two stations, including an existing interchange, and restore missing segments.'); return; }
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    const atRevision = revision.current; setRunning(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/simulate', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceDate: date, intervention: draftToIntervention(draft), journeys: [{ origin, destination }] }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Simulation could not run');
      if (revision.current === atRevision) { setResult(body); setMessage('Comparison updated using the same service date and existing-line costs.'); }
    } catch (e) { if ((e as Error).name !== 'AbortError' && revision.current === atRevision) setError((e as Error).message); }
    finally { if (revision.current === atRevision) setRunning(false); }
  };
  const min = (value: number | null | undefined) => value == null ? '—' : value.toFixed(2);

  return <main className={`workspace-shell ${interventionMode==='aac'?'inspecting-aac':inspector==='citizens'?'inspecting-citizens':inspector==='impact'?'inspecting-impact':''} ${interventionMode==='mrt'&&impactWide?'dashboard-wide':''}`}>
    <header className="app-header"><a href="/" className="brand" aria-label="ImpactLens SG home"><span className="brand-symbol"><Icon name="layers" size={24} /></span><strong>ImpactLens<span>SG</span></strong></a><div className="intervention-selector" role="group" aria-label="Intervention type"><button aria-pressed={interventionMode==='mrt'} onClick={()=>setInterventionMode('mrt')}>MRT Line</button><button aria-pressed={interventionMode==='aac'} onClick={()=>setInterventionMode('aac')}>Active Ageing Centre</button></div><div className="header-end"><span className="prototype-badge">Research prototype</span><span className="local-tag"><span className="live-dot" /> Local workspace</span></div></header>
    <div className="workspace-heading"><div><div className="breadcrumb">Interventions <Icon name="chevron" size={12} /> {interventionMode==='aac'?'New Active Ageing Centre':'New MRT line'}</div><h1>{interventionMode==='aac'?'Bring care closer.':'Explore a better connection.'}</h1></div><div className="network-summary">{interventionMode==='aac'?<><span><strong>{aac.facilities?.summary.corroboratedAac??'—'}</strong> corroborated AAC records</span><span><strong>{aac.facilities?.summary.unknownServicePoints??'—'}</strong> unclassified historical points</span></>:<><span><strong>{catalog?.stations.length ?? '—'}</strong> existing stations</span><span><strong>{catalog?.quarantinedTrips ?? '—'}</strong> trips quarantined</span><span className="model-tag">Static travel-time model</span></>}</div></div>
    <div className="workspace-grid">
      <aside hidden={interventionMode!=='mrt'} className="editor-panel" aria-label="MRT line editor">
        <div className="panel-heading"><div className="panel-title"><span className="small-icon coral"><Icon name="train" /></span><div><h2>Line editor</h2><p>{draft.stations.length} stations · {Math.max(0, draft.stations.length - 1)} segments</p></div></div><div className="icon-actions"><button title="Undo edit" aria-label="Undo edit" disabled={!history.length} onClick={() => { const last = history.at(-1)!; setDraft(last.draft); setDisabledSegments(last.disabled); setHistory(h => h.slice(0, -1)); invalidate(); setMessage('Last edit undone.'); }}><Icon name="undo" size={16} /></button><button title="Reset proposal" aria-label="Reset proposal" onClick={() => { change({ id: 'HYP_USER_LINE', name: 'My proposed line', waitingTimeSeconds: 150, stations: [], segments: [] }, []); setMessage('Start with an existing interchange, then place stations on the map.'); }}><Icon name="reset" size={16} /></button></div></div>
        <div className="editor-scroll">
          <label className="field-label">Line name<input value={draft.name} onChange={e => change({ ...draft, name: e.target.value })} /></label>
          <div className="tool-switch" role="group" aria-label="Map editing mode"><button aria-pressed={mode === 'anchor'} className={mode === 'anchor' ? 'active' : ''} onClick={() => setMode('anchor')}><Icon name="train" size={15} /> Interchange</button><button aria-pressed={mode === 'place'} className={mode === 'place' ? 'active' : ''} onClick={() => setMode('place')}><Icon name="pin" size={15} /> New station</button></div>
          <p className="tool-hint">{mode === 'anchor' ? 'Click an existing station on the map, or select one below.' : 'Click a location on the map. Proposed markers can be dragged.'}</p>
          <label className="field-label">Add existing station<select aria-label="Add existing station" value={addId} onChange={e => { if (e.target.value) addExisting(e.target.value); }} disabled={!catalog}><option value="">Choose an interchange…</option>{catalog?.stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</select></label>
          <div className="section-label">Ordered stations <span>{draft.stations.length}/40</span></div>
          {!draft.stations.length && <div className="empty-editor"><Icon name="pin" size={28} /><strong>Your line starts here</strong><span>Select an existing station to connect your proposal.</span></div>}
          <ol className="station-list">{draft.stations.map((s, i) => <li key={s.key}>
            <div className="station-row"><span className={`station-order ${s.kind}`}>{i + 1}</span><div className="station-title"><strong>{stationName(s)}</strong><span>{s.kind === 'existing' ? `${s.stationId} · Interchange` : `${s.id} · Hypothetical`}</span></div><div className="station-actions"><button aria-label={`Move station ${i + 1} up`} disabled={i === 0} onClick={() => reorder(i, -1)}>↑</button><button aria-label={`Move station ${i + 1} down`} disabled={i === draft.stations.length - 1} onClick={() => reorder(i, 1)}>↓</button><button aria-label={`Remove station ${i + 1}`} onClick={() => { const stations = draft.stations.filter(x => x.key !== s.key); change({ ...draft, stations, segments: stations.slice(1).map(defaultSegment) }, []); setMessage('Station removed. Remaining segment assumptions reset to 300 s run + 30 s dwell; review them.'); }}>×</button></div></div>
            <details className="station-details"><summary>Edit {s.kind === 'existing' ? 'transfer' : 'name & location'}</summary>{s.kind === 'existing' ? <NumberField label={`Station ${i + 1} transfer walk (s)`} value={s.transferWalkSeconds} onChange={v => patchStop(s.key, { transferWalkSeconds: v })} /> : <><label className="field-label">Station {i + 1} name<input value={s.name} onChange={e => patchStop(s.key, { name: e.target.value })} /></label><div className="input-pair"><NumberField label={`Station ${i + 1} latitude`} value={s.lat} min={-90} step={0.00001} onChange={v => patchStop(s.key, { lat: v })} /><NumberField label={`Station ${i + 1} longitude`} value={s.lon} min={-180} step={0.00001} onChange={v => patchStop(s.key, { lon: v })} /></div><p className="microcopy">Moving a station does not recalculate its assumed travel time.</p></>}</details>
            {i < draft.stations.length - 1 && <div className={`segment-editor ${disabledSegments.includes(i) ? 'disconnected' : ''}`}><div className="segment-label"><span>Segment {i + 1} · {i + 1} → {i + 2}</span><button aria-label={`${disabledSegments.includes(i) ? 'Restore' : 'Remove'} segment ${i + 1}`} onClick={() => { change(draft, disabledSegments.includes(i) ? disabledSegments.filter(x => x !== i) : [...disabledSegments, i]); }}>{disabledSegments.includes(i) ? 'Restore' : 'Remove link'}</button></div>{disabledSegments.includes(i) ? <p>Disconnected. Restore this segment before running.</p> : <div className="input-pair"><NumberField label={`Segment ${i + 1} run (s)`} value={draft.segments[i]?.runSeconds ?? 300} onChange={v => change({ ...draft, segments: draft.segments.map((x, n) => n === i ? { ...x, runSeconds: v } : x) })} /><NumberField label={`Segment ${i + 1} dwell (s)`} value={draft.segments[i]?.dwellSeconds ?? 30} onChange={v => change({ ...draft, segments: draft.segments.map((x, n) => n === i ? { ...x, dwellSeconds: v } : x) })} /></div>}</div>}
          </li>)}</ol>
          <div className="service-settings"><h3>Service assumptions</h3><NumberField label="Proposed boarding wait (s)" value={draft.waitingTimeSeconds} onChange={v => change({ ...draft, waitingTimeSeconds: v })} /><p className="microcopy">Symmetric service. Times are entered assumptions, never inferred from map distance.</p></div>
          <button className="text-button" onClick={() => { change(exampleDraft(), []); setOrigin('NS4'); setDestination('NE16'); setMessage('Illustrative North Link loaded. Its new locations and timetable are assumptions.'); }}>Load illustrative example</button>
        </div>
        <div className="editor-footer" role="status">{message}</div>
      </aside>

      <AacEditor state={aac} hidden={interventionMode!=='aac'}/>
      <section className="map-panel" aria-label="Singapore network map">
        {catalog ? <SingaporeMap aac={aacOptions} citizens={citizenOptions} catalog={catalog} draft={draft} disabledSegments={disabledSegments} mode={mode} comparison={comparison}
          onStation={id => { if (mode === 'anchor') addExisting(id); else setMessage('Use Interchange mode to add an existing station. Click an empty map location for a new station.'); }} onPlace={addPoint} onMove={(key, p) => { patchStop(key, p); setMessage('Hypothetical location updated. Review segment times before rerunning.'); }} />
          : <div className="map-loading">{networkError ? <div className="load-error"><strong>Network unavailable</strong><p>{networkError}</p><button onClick={() => location.reload()}>Retry loading</button></div> : <><span className="spinner" /> Loading validated station network</>}</div>}
        <div className="map-bottom-note"><Icon name="layers" size={14} /> Local geographic data · WGS84 coordinates<span>HDB footprints only · no measured building heights</span></div>
      </section>

      <aside hidden={interventionMode!=='mrt'} className="results-panel" aria-label="Journey comparison">
        <div className="inspector-tabs" role="group" aria-label="Inspector"><button aria-pressed={inspector==='journey'} onClick={()=>setInspector('journey')}>MRT journey</button><button aria-pressed={inspector==='impact'} onClick={()=>setInspector('impact')}>Calculated impact</button><button aria-pressed={inspector==='citizens'} onClick={focusCitizens}>Illustrative city</button></div>
        <div className="impact-slot" hidden={inspector!=='impact'}><ImpactPanel intervention={draftToIntervention(draft)} serviceDate={date} proposalRevision={impactRevision} canRun={canRun} view={impactView} onView={setImpactView} expanded={impactWide} onExpand={()=>setImpactWide(v=>!v)}/></div>
        {inspector==='citizens'?<div className="results-scroll citizen-inspector"><p className="citizen-disclaimer">{citizenNotice}</p><CitizensPanel pair={pair} view={view} onView={setView} selectedId={selectedId} onSelect={selectCitizen} playing={playing} onPlayPause={togglePlayback} onReset={()=>{setPlaying(false);setResetKey(k=>k+1);setCitizenStats(s=>({...s,elapsedSeconds:0}));}} speed={speed} onSpeed={setSpeed} elapsedSeconds={citizenStats.elapsedSeconds} enabled={citizensEnabled} onEnabled={setCitizensEnabled} onFocus={focusCitizens} stats={citizenStats} onImport={loadCitizens} onRestoreFixture={()=>loadCitizens(citizenViewPairFixture)} /></div>:inspector==='journey'?<>
        <div className="panel-heading"><div><h2>Journey comparison</h2><p>One journey. Two networks.</p></div><span className="small-icon teal"><Icon name="arrow" /></span></div>
        <div className="results-scroll">
          <label className="field-label">Service date<input type="date" min="2026-01-01" max="2026-12-31" value={date} onChange={e => { invalidate(); setDate(e.target.value); }} /></label>
          <label className="field-label">Origin<select aria-label="Origin station" value={origin} onChange={e => { invalidate(); setOrigin(e.target.value); }}>{!allStations.some(s => s.id === origin) && <option value={origin}>{origin} ? unavailable</option>}{allStations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</select></label>
          <div className="journey-connector"><span /><button aria-label="Swap origin and destination" onClick={() => { setOrigin(destination); setDestination(origin); invalidate(); }}><Icon name="swap" size={14} /></button></div>
          <label className="field-label">Destination<select aria-label="Destination station" value={destination} onChange={e => { invalidate(); setDestination(e.target.value); }}>{!allStations.some(s => s.id === destination) && <option value={destination}>{destination} ? unavailable</option>}{allStations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</select></label>
          <button className="run-button" onClick={simulate} disabled={running || !canRun}>{running ? <span className="spinner" /> : <Icon name="play" size={16} />}{running ? 'Calculating journeys…' : 'Run simulation'}</button>
          {!canRun && catalog && <p className="validation-hint">Add two stations, including an existing interchange. Every segment must be connected.</p>}
          {error && <div className="error-box" role="alert"><strong>Check your proposal</strong><p>{error}</p></div>}
          {comparison ? <div className="comparison-results" aria-live="polite">
            <div className="results-label">Calculated comparison <span>{result?.serviceDate}</span></div>
            <div className="duration-block baseline"><span><i /> Existing network</span><div><strong>{min(comparison.baselineMinutes)}</strong><span>min</span></div><small>{comparison.baselineStatus === 'reachable' ? `${comparison.baselineTransfers} transfers` : comparison.baselineStatus.replaceAll('-', ' ')}</small></div>
            <div className="duration-block scenario"><span><i /> With your proposed line</span><div><strong>{min(comparison.scenarioMinutes)}</strong><span>min</span></div><small>{comparison.scenarioStatus === 'reachable' ? `${comparison.scenarioTransfers} transfers` : comparison.scenarioStatus.replaceAll('-', ' ')}</small></div>
            <div className="savings-card"><span>Modelled time saved</span><div><strong>{min(comparison.minutesSaved)}</strong><span>minutes</span></div><p>{comparison.percentageChange == null ? 'Percentage change is undefined for an unavailable or zero baseline.' : `${Math.abs(comparison.percentageChange).toFixed(1)}% ${comparison.percentageChange <= 0 ? 'shorter' : 'longer'} journey duration`}</p></div>
            <dl className="result-facts"><div><dt>Uses proposed line</dt><dd>{comparison.usedProposedLine == null ? 'Unavailable' : comparison.usedProposedLine ? 'Yes' : 'No'}</dd></div><div><dt>Change in transfers</dt><dd>{comparison.transferChange == null ? 'Undefined' : comparison.transferChange > 0 ? `+${comparison.transferChange}` : comparison.transferChange}</dd></div><div><dt>Journey status</dt><dd>{comparison.status.replaceAll('-', ' ')}</dd></div></dl>
            {comparison.scenarioRoute && <details className="route-details"><summary>View calculated station sequence</summary><ol>{comparison.scenarioRoute.stationIds.map((id, i) => <li key={`${id}-${i}`}><strong>{allStations.find(s => s.id === id)?.name ?? id}</strong><span>{id}</span></li>)}</ol></details>}
          </div> : <div className="result-empty"><span className="empty-route"><Icon name="train" size={24} /><Icon name="arrow" size={20} /><Icon name="pin" size={24} /></span><h3>What changes with your line?</h3><p>Choose a journey and run the simulation to compare routes, travel time and transfers.</p></div>}
          <div className="assumption-note"><strong>Estimates, with context.</strong><p>Static median travel times. Existing boarding wait: 120 s. Existing line changes: 180 s walk + 120 s wait. Your line uses the assumptions in the editor.</p><p>No departure-time timetable or ridership forecast. Calculated impact uses separately declared hypothetical demand.</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Street tiles: © OpenStreetMap contributors</a></div>
        </div>
        </>:null}
      </aside>
      <AacResults state={aac} hidden={interventionMode!=='aac'}/>
    </div>
    <footer className="app-footer"><span><span className="live-dot" /> Evidence-informed scenario modelling</span><span>Pre-hackathon prototype · Proposed infrastructure is hypothetical</span><span>ImpactLens SG / MRT + AAC</span></footer>
  </main>;
}
