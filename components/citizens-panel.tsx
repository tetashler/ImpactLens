'use client';

import { useId, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { getCitizenProfile, parseCitizenViewPair, type CitizenViewPair, type CitizenView } from '../lib/citizens/data';
import { parseCitizenProfile, type CitizenProfileResponse } from '../lib/contracts/citizen-simulation';
import {illustrativePedestrianPaths} from '../lib/citizens/pedestrians';
import type {CitizenPosition} from '../lib/citizens/layer';
import './citizens.css';

interface CitizensPanelProps {
  pair: CitizenViewPair;
  view: CitizenView;
  onView: (v: CitizenView) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  playing: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  speed: number;
  onSpeed: (n: number) => void;
  elapsedSeconds: number;
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  onFocus: () => void;
  stats: { visible: number; fps: number | null; drawCalls: number; status: string; selected?:CitizenPosition|null };
  pedestrianArea?:{id:string;onChange:(id:string)=>void};
  showPath?:{value:boolean;onChange:(enabled:boolean)=>void};
  onImport: (pair: CitizenViewPair) => void;
  onRestoreFixture: () => void;
}

const number = (value: number | null, unit = '') => value === null ? 'Unavailable' : `${value.toLocaleString('en-SG', { maximumFractionDigits: 2 })}${unit}`;
const words = (value: string) => value.replaceAll('-', ' ');
const ageLabel = (value: string) => value.replaceAll('_', '–');
const shortId = (value: string) => value.split('-').at(-1);

function visualClock(seconds: number) {
  const whole = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return [Math.floor(whole / 3600), Math.floor(whole / 60) % 60, whole % 60].map(n => String(n).padStart(2, '0')).join(':');
}

export function CitizenProfile({ profile, conversation }: { profile: CitizenProfileResponse; conversation?:ReactNode }) {
  const geminiNoteId = useId();
  const { citizen, metadata, journey, animation, activity, sources, assumptions } = profile;
  const source = sources.find(item => item.id === citizen.sourceId);
  const comparison = journey?.comparison;
  const outcome = !journey ? 'Outcome unavailable' : journey.assignment === 'unassigned' ? 'No assigned journey'
    : comparison?.status === 'compared' && comparison.minutesSaved !== null ? comparison.minutesSaved > 0 ? 'Improved' : comparison.minutesSaved === 0 ? 'Unchanged' : 'Longer journey'
    : comparison?.status === 'newly-reachable' ? 'Newly reachable' : 'Journey unavailable';

  return <section className="citizens-profile" aria-label="Selected synthetic citizen">
    <div className="citizens-profile-heading"><h3>Citizen {shortId(citizen.agentId)}</h3><span className="citizens-badge">Synthetic</span></div>
    <p className="citizens-id">{citizen.agentId}</p>
    <p className="citizens-caption">A generated representative, never an identifiable person.</p>
    <dl className="citizens-facts">
      <div><dt>Age category</dt><dd>{ageLabel(citizen.demographic.ageGroup)}</dd></div>
      <div><dt>Sex category</dt><dd>{citizen.demographic.sex}</dd></div>
      <div><dt>Planning area</dt><dd>{citizen.demographic.planningAreaName}</dd></div>
      <div><dt>Subzone</dt><dd>{citizen.demographic.subzoneName}</dd></div>
      <div><dt>Expansion weight</dt><dd>{number(citizen.weight)}</dd></div>
    </dl>
    <p className="citizens-caption">Source-derived categories assigned to a synthetic representative. Weight is represented population, not a count of visible characters.</p>
    {source?.kind === 'synthetic-fixture' && <p className="citizens-notice">Invented fixture: categories, counts, weights and journey outcomes are illustrative.</p>}
    <div className="citizens-outcome"><span className="citizens-eyebrow">{metadata.resultKind} journey outcome</span><strong>{outcome}</strong></div>
    {comparison ? <>
      <p className="citizens-caption">Hypothetical assignment · {comparison.origin} → {comparison.destination}</p>
      <dl className="citizens-facts">
        <div><dt>Baseline duration</dt><dd>{number(comparison.baselineMinutes, ' min')}</dd></div>
        <div><dt>Scenario duration</dt><dd>{number(comparison.scenarioMinutes, ' min')}</dd></div>
        <div><dt>Time saved</dt><dd>{number(comparison.minutesSaved, ' min')}</dd></div>
        <div><dt>Duration change</dt><dd>{number(comparison.percentageChange, '%')}</dd></div>
        <div><dt>Baseline transfers</dt><dd>{number(comparison.baselineTransfers)}</dd></div>
        <div><dt>Scenario transfers</dt><dd>{number(comparison.scenarioTransfers)}</dd></div>
        <div><dt>Transfer change</dt><dd>{number(comparison.transferChange)}</dd></div>
        <div><dt>Uses proposed line</dt><dd>{comparison.usedProposedLine === null ? 'Unavailable' : comparison.usedProposedLine ? 'Yes' : 'No'}</dd></div>
        <div><dt>Baseline status</dt><dd>{words(comparison.baselineStatus)}</dd></div>
        <div><dt>Scenario status</dt><dd>{words(comparison.scenarioStatus)}</dd></div>
      </dl>
      {comparison.percentageChange === null && <p className="citizens-caption">Percentage change is unavailable for a zero or unavailable baseline.</p>}
    </> : <p className="citizens-caption">{journey?.assignment === 'unassigned' ? 'No trip has been assigned. Travel times and savings are unavailable.' : 'No journey outcome was supplied for this citizen.'}</p>}
    <details className="citizens-details">
      <summary>Assumptions & provenance</summary>
      <dl className="citizens-facts">
        <div><dt>Demographic year</dt><dd>{metadata.demographicReferenceYear}</dd></div>
        <div><dt>Service date</dt><dd>{metadata.simulationDate}</dd></div>
        <div><dt>Activity</dt><dd>{activity.status}</dd></div>
        <div><dt>Visual state</dt><dd>{animation?.state ?? 'Unavailable'}</dd></div>
        <div><dt>Visual geometry</dt><dd>{animation?.visualisation.geometry ?? 'Unavailable'}</dd></div>
      </dl>
      <p>Assignment context: {activity.description ?? 'No assignment context supplied.'}</p>
      {activity.destinationCategories.length > 0 && <p>Assumed destinations: {activity.destinationCategories.join(', ')}</p>}
      {activity.transportPreferences.length > 0 && <p>Assumed transport: {activity.transportPreferences.join(', ')}</p>}
      <p>Animation is visual only. Its clock, speed and schematic paths do not calculate travel outcomes.</p>
      {source && <div className="citizens-source"><strong>{source.agency}</strong><p>{source.datasetId} · {source.kind === 'synthetic-fixture' ? 'Invented fixture' : 'Aggregate government statistics'} · row {citizen.sourceRow}</p><p>Reference year {source.referenceYear} · updated {source.updated}</p><p><a href={source.sourceUrl} target="_blank" rel="noreferrer">Source reference</a> · <a href={source.licenceUrl} target="_blank" rel="noreferrer">Licence reference</a></p><p className="citizens-hash">SHA-256: {source.rawSha256}</p></div>}
      <ul className="citizens-assumptions">{assumptions.map(assumption => <li key={assumption.id}><strong>{assumption.kind}</strong><p>{assumption.description}</p></li>)}</ul>
    </details>
    {conversation??<p className="citizens-caption" id={geminiNoteId}>Fictional profile metadata. Recorded communication is available as summaries in Knowledge Graph and Report.</p>}
  </section>;
}

export default function CitizensPanel(props: CitizensPanelProps) {
  const { pair, view, selectedId, onSelect, enabled, stats } = props;
  const [search, setSearch] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState(false);
  const id = useId();
  const payload = pair[view];
  const selected = useMemo(() => {
    if (!selectedId) return null;
    const profile = getCitizenProfile(payload, selectedId);
    return profile ? parseCitizenProfile(profile) : null;
  }, [payload, selectedId]);
  const query = search.trim().toLocaleLowerCase();
  const filtered = payload.citizens.filter(citizen => [citizen.agentId, citizen.demographic.ageGroup, ageLabel(citizen.demographic.ageGroup), citizen.demographic.subzoneName, citizen.demographic.planningAreaName].some(text => text.toLocaleLowerCase().includes(query)));

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    try {
      if(file.size>5*1024*1024)throw new Error('Import a visual sample smaller than 5 MB; keep the full population server-side.');
      const imported = parseCitizenViewPair(JSON.parse(await file.text()));
      props.onImport(imported);
      setImportError(false);
      setImportMessage('Validated baseline and scenario pair loaded.');
    } catch (error) {
      setImportError(true);
      setImportMessage(error instanceof Error ? error.message : 'Unable to read a valid citizen payload pair.');
    }
  }

  return <details className="citizens-panel" open>
    <summary className="citizens-panel-heading"><span>Synthetic citizens</span><span className="citizens-badge">{payload.metadata.resultKind}</span></summary>
    <div className="citizens-body">
      <p className="citizens-caption">{props.pedestrianArea?'Illustrative pedestrians — visual movement is not a calculated journey forecast.':'Inspect supplied synthetic profiles and supplied visual geometry.'}</p>
      <div className="citizens-view" role="group" aria-label="Citizen network view">{(['baseline', 'scenario'] as const).map(option => <button type="button" key={option} aria-pressed={view === option} onClick={() => props.onView(option)}>{option === 'baseline' ? 'Baseline' : 'Scenario'}</button>)}</div>
      <div className="citizens-row"><label className="citizens-checkbox"><input type="checkbox" checked={enabled} onChange={event => props.onEnabled(event.target.checked)} />Show citizens</label><button className="citizens-button" type="button" onClick={props.onFocus} disabled={!enabled}>Focus citizens</button></div>
      {props.pedestrianArea&&<label className="citizens-area">Explore pedestrians in<select aria-label="Pedestrian neighbourhood" value={props.pedestrianArea.id} onChange={event=>props.pedestrianArea!.onChange(event.target.value)}>{illustrativePedestrianPaths.filter((p,index,all)=>all.findIndex(other=>other.areaId===p.areaId)===index).map(p=><option key={p.areaId} value={p.areaId}>{p.areaLabel}</option>)}</select></label>}
      {props.showPath&&<label className="citizens-checkbox"><input type="checkbox" checked={props.showPath.value} onChange={event=>props.showPath!.onChange(event.target.checked)}/>Show selected illustrative path</label>}
      <div className="citizens-clock"><span>Illustrative time</span><output>{visualClock(props.elapsedSeconds)}</output></div>
      <p className="citizens-caption">Visual time only; supplied journey durations stay unchanged.</p>
      <div className="citizens-playback"><button className="citizens-button citizens-primary" type="button" disabled={!enabled||stats.status.includes('unavailable')} onClick={props.onPlayPause}>{props.playing ? 'Pause' : 'Play'}</button><button className="citizens-button" type="button" onClick={props.onReset}>Reset</button><label className="citizens-speed">Speed<select aria-label="Animation speed" value={props.speed} onChange={event => props.onSpeed(Number(event.target.value))}>{[1, 2, 4].map(speed => <option key={speed} value={speed}>{speed}×</option>)}</select></label></div>
      <dl className="citizens-stats"><div><dt>Sample drawn</dt><dd>{stats.visible}</dd></div><div><dt>FPS</dt><dd>{stats.fps === null ? '—' : number(stats.fps)}</dd></div><div><dt>Draw calls</dt><dd>{stats.drawCalls}</dd></div></dl>
      <p className="citizens-caption">{stats.status} · Visible sample is not weighted population.</p>
      {stats.selected?.agentId===selectedId&&<div className="citizens-motion-meta"><strong>{stats.selected.areaLabel??'Supplied visual position'}</strong><output aria-label="Selected pedestrian position" data-pedestrian-position={JSON.stringify(stats.selected)}>{stats.selected.position.lat.toFixed(6)}, {stats.selected.position.lon.toFixed(6)}</output><p>{stats.selected.rendered?'Selected actor is in the viewport.':'Selected actor is hidden or outside the viewport.'} {props.pedestrianArea?'This visual location is independent of the invented demographic and journey examples below. It is not a home or measured trip.':'Only supplied coordinates are shown.'}</p></div>}
      <div className="citizens-selection"><label htmlFor={`${id}-search`}>Find a citizen</label><input id={`${id}-search`} type="search" placeholder="ID, age category or area" value={search} onChange={event => setSearch(event.target.value)} /><label htmlFor={`${id}-select`}>Sample citizens ({filtered.length})</label><select id={`${id}-select`} size={Math.min(4, Math.max(2, filtered.length))} value={filtered.some(citizen => citizen.agentId === selectedId) ? selectedId! : ''} onChange={event => onSelect(event.target.value)}><option disabled value="">{filtered.length ? 'Choose a synthetic citizen' : 'No matching citizens'}</option>{filtered.map(citizen => <option key={citizen.agentId} value={citizen.agentId} title={citizen.agentId}>#{shortId(citizen.agentId)} · {ageLabel(citizen.demographic.ageGroup)} · {citizen.demographic.subzoneName}</option>)}</select></div>
      {selected ? <CitizenProfile profile={selected} /> : <p className="citizens-empty">Select a citizen in the sample or on the map to inspect their supplied profile.</p>}
      <details className="citizens-details citizens-import"><summary>Load simulation data</summary><p>Import JSON containing a <code>{'{baseline, scenario}'}</code> pair of version 1 citizen simulation payloads. Phase 4C can supply these files; no endpoint is required.</p><label className="citizens-file">Choose payload pair<input type="file" accept="application/json,.json" onChange={importFile} /></label><button type="button" className="citizens-button" onClick={() => { props.onRestoreFixture(); setImportMessage('Invented illustrative fixture restored.'); setImportError(false); }}>Restore illustrative fixture</button>{importMessage && <p className={importError ? 'citizens-error' : 'citizens-caption'} role={importError ? 'alert' : 'status'}>{importMessage}</p>}</details>
    </div>
  </details>;
}
