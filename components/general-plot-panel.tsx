'use client';

import { useState } from 'react';
import type { ScenarioPlannerState } from './use-scenario-planner';
import type { useScenarioPlot } from './use-scenario-plot';
import type { AacScenario } from './use-aac-scenario';
import type { NetworkCatalog } from '../lib/map-contract';
import type { ScenarioResponse } from '../lib/scenarios/contract';
import { PLOT_LIMITS, type PlotFeature, type PlotPoint } from '../lib/plots/geometry';
import { buildPlottedMrt, suggestedStations, type MrtPlotSettings } from '../lib/plots/adapters';
import './general-plot-panel.css';

type Plot = ReturnType<typeof useScenarioPlot>;

export interface GeneralPlotPanelProps {
  planner: ScenarioPlannerState;
  plot: Plot;
  hidden: boolean;
  catalog: NetworkCatalog | null;
  anchors: Record<string, string>;
  pendingAnchor: { stationId: string; pointId?: string } | null;
  onEdit: (action: () => unknown) => void;
  onInvalidate: () => void;
  onRequestAnchor: (stationId: string, pointId?: string) => void;
  onConfirmAnchor: () => void;
  onDisconnect: (pointId: string) => void;
  onRunMrt: (settings: MrtPlotSettings) => void;
  onAdvancedMrt: () => void;
  aac: AacScenario;
  aacBound: boolean;
  onConfirmAac: (pointId: string) => void;
  onRunAac: () => void;
  onAdvancedAac: () => void;
  onShowResults: () => void;
  hasResults: boolean;
  error: string;
  onResetSimulation: () => void;
  onUsePlan: (mode: 'mrt' | 'aac', response: ScenarioResponse) => void;
}

function FeatureEditor({ feature, plot, onEdit, disabled }: {
  feature: PlotFeature; plot: Plot; onEdit: GeneralPlotPanelProps['onEdit']; disabled: boolean;
}) {
  const [label, setLabel] = useState(feature.label);
  const pointIndex = plot.geometry.features.filter(f => f.kind === 'point').findIndex(f => f.id === feature.id);
  const pointCount = plot.geometry.features.filter(f => f.kind === 'point').length;
  const vertex = feature.kind === 'line' ? plot.selection?.vertex : undefined;
  return <div className="plot-feature-editor">
    <form onSubmit={event => { event.preventDefault(); onEdit(() => plot.updateLabel(feature.id, label)); }}>
      <label>Selected {feature.kind} label<input value={label} required maxLength={PLOT_LIMITS.maxLabelLength} disabled={disabled} onChange={event => setLabel(event.target.value)} /></label>
      <button type="submit" disabled={disabled || !label.trim() || label === feature.label}>Save label</button>
    </form>
    {feature.kind === 'point' ? <>
      <p className="plot-help">Use Edit drawing to drag this point on the map.</p>
      <label>Point role<select value={feature.role} disabled={disabled} onChange={event => onEdit(() => plot.setPointRole(feature.id, event.target.value as PlotPoint['role']))}>
        <option value="unassigned">General point</option><option value="station">Proposed station</option><option value="site">Proposed site</option>
      </select></label>
      <div className="plot-action-row"><button type="button" disabled={disabled || pointIndex <= 0} onClick={() => onEdit(() => plot.reorderPoint(feature.id, -1))}>Move earlier</button><button type="button" disabled={disabled || pointIndex >= pointCount - 1} onClick={() => onEdit(() => plot.reorderPoint(feature.id, 1))}>Move later</button></div>
    </> : <>
      <p className="plot-help">Use Edit drawing to drag vertices on the map. Their order describes the line.</p>
      <ol className="plot-vertex-list">{feature.coordinates.map((_, index) => <li key={index}>
        <button type="button" className="plot-vertex-select" aria-pressed={vertex === index} onClick={() => plot.select({ id: feature.id, vertex: index })}><strong>Vertex {index + 1}</strong></button>
        <div className="plot-order-actions"><button type="button" aria-label={`Move vertex ${index + 1} earlier`} disabled={disabled || index === 0} onClick={() => onEdit(() => plot.reorderVertex(feature.id, index, -1))}>↑</button><button type="button" aria-label={`Move vertex ${index + 1} later`} disabled={disabled || index === feature.coordinates.length - 1} onClick={() => onEdit(() => plot.reorderVertex(feature.id, index, 1))}>↓</button><button type="button" aria-label={`Remove vertex ${index + 1}`} disabled={disabled} onClick={() => onEdit(() => plot.removeVertex(feature.id, index))}>×</button></div>
      </li>)}</ol>
      {feature.coordinates.length <= 2 && <p className="plot-help">Removing a vertex from a two-vertex line removes that line.</p>}
    </>}
    <button type="button" className="plot-delete" disabled={disabled} onClick={() => onEdit(() => plot.removeFeature(feature.id))}>Remove {feature.kind}</button>
  </div>;
}

function MrtControls(props: GeneralPlotPanelProps) {
  const { plot, catalog, anchors, pendingAnchor, onEdit, onInvalidate, onRequestAnchor, onConfirmAnchor, onDisconnect, onRunMrt, onAdvancedMrt } = props;
  const points = plot.geometry.features.filter((feature): feature is PlotPoint => feature.kind === 'point');
  const lines = plot.geometry.features.filter(feature => feature.kind === 'line' && feature.coordinates.length >= 2);
  const [routeId, setRouteId] = useState('');
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [times, setTimes] = useState({ runSeconds: 300, dwellSeconds: 30, waitingTimeSeconds: 150, transferWalkSeconds: 180 });
  const [confirmation, setConfirmation] = useState({ revision: -1, geometry: false, assumptions: false });
  const contextMatches = confirmation.revision === plot.revision;
  const geometryConfirmed = contextMatches && confirmation.geometry;
  const assumptionsConfirmed = contextMatches && confirmation.assumptions;
  const disabled = plot.activeLineId !== null;
  const chosen = points.filter(point => included[point.id] ?? point.role === 'station');
  const selected = points.find(point => point.id === plot.selection?.id);
  const selectedRoute = lines.some(line => line.id === routeId) ? routeId : lines[0]?.id ?? '';
  const activeAnchors = Object.fromEntries(chosen.flatMap(point => Object.hasOwn(anchors, point.id) ? [[point.id, anchors[point.id]]] : []));
  const settings: MrtPlotSettings = { routeId: selectedRoute, pointIds: chosen.map(point => point.id), anchors: activeAnchors, geometryConfirmed, assumptionsConfirmed, ...times };
  function editSettings(action: () => void) {
    onInvalidate(); setConfirmation({ revision: plot.revision, geometry: false, assumptions: false }); action();
  }
  function confirm(field: 'geometry' | 'assumptions', checked: boolean) {
    onInvalidate();
    setConfirmation({ revision: plot.revision, geometry: geometryConfirmed, assumptions: assumptionsConfirmed, [field]: checked });
  }
  let nearby: ReturnType<typeof suggestedStations> = [];
  if (selected && catalog) { try { nearby = suggestedStations(selected, catalog); } catch { /* The readiness check explains catalogue errors. */ } }
  const query = search.trim().toLocaleLowerCase();
  const matches = query && catalog ? catalog.stations.filter(station => station.lines.length && station.kind !== 'hypothetical' && `${station.id} ${station.name}`.toLocaleLowerCase().includes(query)).slice(0, 6) : [];
  let readiness = '';
  if (disabled) readiness = 'Finish or cancel the active line before calculating.';
  else if (!catalog) readiness = 'The MRT station catalogue must load before you can connect a station.';
  else if (!selectedRoute) readiness = 'Draw a route line with at least two vertices.';
  else if (chosen.length < 2) readiness = 'Choose at least two points as stations in their travel order.';
  else if (!Object.keys(activeAnchors).length) readiness = 'Confirm an interchange with at least one served existing MRT station.';
  else if (!geometryConfirmed) readiness = 'Review and confirm the route and ordered stations below.';
  else if (!assumptionsConfirmed) readiness = 'Acknowledge the illustrative timing assumptions before calculating.';
  else { try { buildPlottedMrt(plot.geometry, settings, catalog); } catch (error) { readiness = error instanceof Error ? error.message : 'Review the plotted MRT settings.'; } }
  const pendingStation = catalog?.stations.find(station => station.id === pendingAnchor?.stationId);
  const pendingPoint = points.find(point => point.id === pendingAnchor?.pointId);

  return <section className="plot-analysis" aria-labelledby="plot-mrt-heading">
    <div className="plot-section-heading"><span className="plot-step">02</span><div><h2 id="plot-mrt-heading">Review your MRT line</h2><p>Connect your drawing to the existing network.</p></div></div>
    <label>Drawn route<select value={selectedRoute} disabled={disabled || !lines.length} onChange={event => editSettings(() => setRouteId(event.target.value))}><option value="" disabled>Draw a line on the map</option>{lines.map(line => <option key={line.id} value={line.id}>{line.label}</option>)}</select></label>
    <p className="plot-help">Check the dots that should be stations. Their order below sets the route; bends in the line stay visual.</p>
    {points.length ? <ol className="plot-stop-list">{points.map((point, index) => {
      const checked = included[point.id] ?? point.role === 'station';
      const stationId = Object.hasOwn(anchors, point.id) ? anchors[point.id] : undefined;
      return <li key={point.id}>
        <div className="plot-stop-row"><label className="plot-check"><input type="checkbox" checked={checked} disabled={disabled} onChange={event => editSettings(() => setIncluded(current => ({ ...current, [point.id]: event.target.checked })))} /><span>{point.label}{stationId && <small>Interchange: {catalog?.stations.find(station => station.id === stationId)?.name ?? stationId}</small>}</span></label>
          <div className="plot-order-actions"><button type="button" disabled={disabled || index === 0} aria-label={`Move ${point.label} earlier in station order`} onClick={() => onEdit(() => plot.reorderPoint(point.id, -1))}>↑</button><button type="button" disabled={disabled || index === points.length - 1} aria-label={`Move ${point.label} later in station order`} onClick={() => onEdit(() => plot.reorderPoint(point.id, 1))}>↓</button></div></div>
        <div className="plot-stop-secondary"><button type="button" aria-pressed={selected?.id === point.id} onClick={() => plot.select({ id: point.id })}>Select on map</button>{stationId && <button type="button" disabled={disabled} onClick={() => onDisconnect(point.id)}>Disconnect</button>}</div>
      </li>;
    })}</ol> : <p className="plot-empty">Add station dots with the map toolbar.</p>}

    <details className="plot-disclosure" open={Object.keys(activeAnchors).length === 0 || pendingAnchor !== null}>
      <summary>Connect an existing MRT station</summary>
      <div className="plot-disclosure-content"><p className="plot-help">{selected ? `Selected point: ${selected.label}.` : 'Select a point first, or choose a station to add an interchange point.'} A nearby marker does not connect automatically.</p>
        <label>Find an existing station<input type="search" value={search} disabled={disabled || !catalog} placeholder="Station name or ID" onChange={event => setSearch(event.target.value)} /></label>
        {query && <div className="plot-search-results" aria-live="polite">{matches.length ? matches.map(station => <button type="button" key={station.id} disabled={disabled} onClick={() => onRequestAnchor(station.id, selected?.id)}><span>{station.name}</span><small>{station.id}</small></button>) : <p className="plot-help">No matching served MRT stations.</p>}</div>}
        {selected && nearby.length > 0 && <div className="plot-nearby"><h3>Nearby suggestions</h3>{nearby.map(({ station, distanceMetres }) => <button type="button" key={station.id} disabled={disabled} onClick={() => onRequestAnchor(station.id, selected.id)}><span>{station.name}</span><small>{Math.round(distanceMetres).toLocaleString()} m</small></button>)}<p className="plot-help">Distance is straight line. Choosing a suggestion still needs confirmation.</p></div>}
        {pendingAnchor && <div className="plot-confirm-anchor"><strong>{pendingStation?.name ?? pendingAnchor.stationId}</strong><p>{pendingPoint ? `Confirming moves “${pendingPoint.label}” to this station.` : 'Confirming adds a point at this station.'} This explicitly creates an interchange.</p><button type="button" disabled={disabled || !pendingStation} onClick={onConfirmAnchor}>Confirm interchange</button></div>}
      </div>
    </details>

    <label className="plot-check plot-ack"><input type="checkbox" disabled={disabled} checked={geometryConfirmed} onChange={event => confirm('geometry', event.target.checked)} /><span>These selected dots are stations in this order, and the line is an illustrative alignment.</span></label>
    <label className="plot-check plot-ack"><input type="checkbox" disabled={disabled} checked={assumptionsConfirmed} onChange={event => confirm('assumptions', event.target.checked)} /><span>I accept illustrative travel and transfer times. This comparison does not assess construction or prove feasibility.</span></label>
    <details className="plot-disclosure"><summary>Travel assumptions and advanced editor</summary><div className="plot-disclosure-content">
      <p className="plot-help">Defaults assume 5 minutes running and 30 seconds dwell per segment, 2.5 minutes waiting, and 3 minutes walking at an interchange. Times are entered assumptions; distance and curves do not determine them.</p>
      <div className="plot-input-pair">{([
        ['runSeconds', 'Running per segment (s)'], ['dwellSeconds', 'Dwell per segment (s)'], ['waitingTimeSeconds', 'Waiting (s)'], ['transferWalkSeconds', 'Interchange walking (s)'],
      ] as const).map(([key, label]) => <label key={key}>{label}<input type="number" min={key === 'runSeconds' ? 0.001 : 0} step="any" disabled={disabled} value={Number.isFinite(times[key]) ? times[key] : ''} onChange={event => editSettings(() => setTimes(current => ({ ...current, [key]: event.target.valueAsNumber })))} /></label>)}</div>
      <button type="button" disabled={disabled} onClick={onAdvancedMrt}>Open advanced MRT editor</button>
    </div></details>
    <p className="plot-readiness" aria-live="polite">{readiness || 'Ready for an illustrative MRT accessibility comparison.'}</p>
    <button type="button" className="plot-primary" disabled={Boolean(readiness)} onClick={() => onRunMrt(settings)}>Calculate MRT impact</button>
  </section>;
}

function AacControls({ plot, aac, aacBound, onInvalidate, onConfirmAac, onRunAac, onAdvancedAac }: GeneralPlotPanelProps) {
  const points = plot.geometry.features.filter((feature): feature is PlotPoint => feature.kind === 'point');
  const [pointId, setPointId] = useState('');
  const [acknowledgedRevision, setAcknowledgedRevision] = useState(-1);
  const [confirmedPoint, setConfirmedPoint] = useState<{ id: string; revision: number } | null>(null);
  const selected = points.find(point => point.id === pointId);
  const acknowledged = acknowledgedRevision === plot.revision;
  const disabled = plot.activeLineId !== null;
  const bound = aacBound && selected && confirmedPoint?.id === selected.id && confirmedPoint.revision === plot.revision;
  const readiness = disabled ? 'Finish or cancel the active line first.' : !selected ? 'Choose one plotted point for the hypothetical centre.' : !acknowledged ? 'Review and acknowledge the limited evidence below.' : !bound ? 'Confirm the centre location before calculating.' : aac.validation;
  return <section className="plot-analysis" aria-labelledby="plot-aac-heading">
    <div className="plot-section-heading"><span className="plot-step">02</span><div><h2 id="plot-aac-heading">Review your AAC site</h2><p>Compare limited geographic access from one point.</p></div></div>
    <label>Proposed centre point<select value={selected ? pointId : ''} disabled={disabled} onChange={event => { onInvalidate(); setPointId(event.target.value); setConfirmedPoint(null); setAcknowledgedRevision(-1); }}><option value="">Choose one plotted point</option>{points.map(point => <option key={point.id} value={point.id}>{point.label}</option>)}</select></label>
    <label>Straight-line comparison radius (metres)<input type="number" min={0} max={5000} step={50} value={Number.isFinite(aac.draft.thresholdMetres) ? aac.draft.thresholdMetres : ''} disabled={disabled || aac.busy} onChange={event => { onInvalidate(); aac.update({ thresholdMetres: event.target.valueAsNumber }); }} /></label>
    <div className="plot-evidence-note"><strong>Limited AAC evidence</strong><p>{aac.facilities?.summary.corroboratedAac??4} corroborated AACs from {aac.facilities?.summary.historicalPoints??133} historical points; {aac.facilities?.summary.unknownServicePoints??129} remain unclassified. This is not a full AAC network. Census 2020 age bands and two public landmark origins represent an illustrative population. Unlocated residents and other origins remain unknown.</p><p>The radius measures straight-line geographic access, not walking routes, service eligibility, attendance or care outcomes.</p></div>
    <label className="plot-check plot-ack"><input type="checkbox" disabled={disabled} checked={acknowledged} onChange={event => { onInvalidate(); setAcknowledgedRevision(event.target.checked ? plot.revision : -1); }} /><span>I understand the limited catalogue, Census 2020 assumptions and two-origin coverage. This point is an unsurveyed hypothetical site.</span></label>
    <button type="button" disabled={disabled || !selected || !acknowledged} onClick={() => { if (selected) { onConfirmAac(selected.id); setConfirmedPoint({ id: selected.id, revision: plot.revision }); } }}>{bound ? 'Centre location confirmed' : 'Confirm centre location'}</button>
    <details className="plot-disclosure"><summary>Advanced AAC settings</summary><div className="plot-disclosure-content"><p className="plot-help">Review population, age, availability, optional capacity and walking-speed assumptions in the detailed editor.</p><button type="button" disabled={disabled} onClick={onAdvancedAac}>Open advanced AAC editor</button></div></details>
    {(aac.error || aac.facilityError) && <p className="plot-error" role="alert">{aac.error || aac.facilityError}</p>}
    <p className="plot-readiness" aria-live="polite">{readiness || 'Ready for a limited AAC geographic-access comparison.'}</p>
    <button type="button" className="plot-primary" disabled={Boolean(readiness) || aac.busy} onClick={onRunAac}>{aac.busy ? 'Calculating AAC impact…' : 'Calculate AAC impact'}</button>
  </section>;
}

export default function GeneralPlotPanel(props: GeneralPlotPanelProps) {
  const { planner, plot, hidden, onEdit, hasResults, onShowResults, onResetSimulation, error } = props;
  const plan = planner.response?.plan;
  const selected = plot.geometry.features.find(feature => feature.id === plot.selection?.id);
  const disabled = plot.activeLineId !== null;
  const mrt = plan?.execution === 'calculated' && plan.capabilityId === 'mrt-accessibility-v1';
  const aac = plan?.execution === 'calculated' && plan.capabilityId === 'aac-accessibility-v1';
  const points = plot.geometry.features.filter(feature => feature.kind === 'point');
  const lines = plot.geometry.features.filter(feature => feature.kind === 'line');
  return <aside className="editor-panel general-plot-panel" hidden={hidden} aria-label="General scenario inspector">
    <div className="general-plot-scroll">
      <section className="plot-geometry" aria-labelledby="plot-geometry-heading">
        <div className="plot-section-heading"><span className="plot-step">01</span><div><h2 id="plot-geometry-heading">Your map drawings</h2><p>{points.length} {points.length === 1 ? 'point' : 'points'} · {lines.length} {lines.length === 1 ? 'line' : 'lines'}</p></div></div>
        {disabled && <p className="plot-draft-warning" role="status">A line is in progress. Use Finish or Cancel on the map toolbar before editing other drawings.</p>}
        {plot.geometry.features.length ? <details className="plot-disclosure" open><summary>Select or edit a drawing</summary><div className="plot-disclosure-content">
          <ul className="plot-feature-list">{plot.geometry.features.map(feature => <li key={feature.id}><button type="button" aria-pressed={selected?.id === feature.id} onClick={() => plot.select({ id: feature.id })}><span className={`plot-feature-symbol ${feature.kind}`} aria-hidden="true" /><span><strong>{feature.label}</strong><small>{feature.kind === 'point' ? feature.role === 'station' ? 'Station point' : feature.role === 'site' ? 'Site point' : 'Point' : `Line · ${feature.coordinates.length} vertices`}</small></span></button></li>)}</ul>
          {selected && <FeatureEditor key={`${selected.id}:${plot.revision}:${plot.selection?.vertex ?? 'feature'}`} feature={selected} plot={plot} onEdit={onEdit} disabled={disabled} />}
        </div></details> : <p className="plot-empty">Choose a drawing tool on the map. Add station dots separately from a route line.</p>}
      </section>

      {mrt && <MrtControls key={plan.planId} {...props} />}
      {aac && <AacControls key={plan.planId} {...props} />}
      {error && <p className="plot-error" role="alert">{error}</p>}
      {hasResults && <div className="plot-result-actions"><button type="button" className="plot-primary" onClick={onShowResults}>Show results</button><button type="button" onClick={onResetSimulation}>Reset simulation</button></div>}
    </div>
  </aside>;
}
