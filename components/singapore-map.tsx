'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as LibreMap, StyleSpecification } from 'maplibre-gl';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import type { NetworkCatalog, CompactComparison } from '../lib/map-contract';
import type { EditorDraft } from '../lib/editor';
import { CitizenLayer, type CitizenLayerOptions } from '../lib/citizens/layer';

interface Props {
  citizens: CitizenLayerOptions & { focusKey:number; networkView:'editor'|'baseline'|'scenario'; onSelect:(id:string)=>void; onFocus:()=>void; onPlayPause:()=>void };
  catalog: NetworkCatalog; draft: EditorDraft; mode: 'anchor' | 'place';
  disabledSegments: number[]; comparison: CompactComparison | null;
  onStation: (id: string) => void; onPlace: (point: { lat: number; lon: number }) => void;
  onMove: (key: string, point: { lat: number; lon: number }) => void;
}
const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
const point = (coordinates: [number, number], properties: Record<string, unknown>): Feature => ({ type: 'Feature', properties, geometry: { type: 'Point', coordinates } });
const line = (coordinates: [number, number][], properties: Record<string, unknown> = {}): Feature => ({ type: 'Feature', properties, geometry: { type: 'LineString', coordinates } });
function position(stop: EditorDraft['stations'][number], catalog: NetworkCatalog): [number, number] | null {
  const s = stop.kind === 'new' ? stop : catalog.stations.find(s => s.id === stop.stationId);
  return s && Number.isFinite(s.lat) && Number.isFinite(s.lon) && Math.abs(s.lat) <= 90 && Math.abs(s.lon) <= 180 ? [s.lon, s.lat] : null;
}

export default function SingaporeMap(props: Props) {
  const container = useRef<HTMLDivElement>(null), mapRef = useRef<LibreMap | null>(null), latest = useRef(props);
  const citizensRef = useRef<CitizenLayer | null>(null);
  latest.current = props;
  const [ready, setReady] = useState(false), [fatal, setFatal] = useState(false);
  const [streets, setStreets] = useState(false), [buildings, setBuildings] = useState(true), [notice, setNotice] = useState('Loading local geography…');
  const [pitch, setPitch] = useState(true);
  const [neighbourhood, setNeighbourhood] = useState(false);
  const [buildingStatus, setBuildingStatus] = useState('Zoom in for buildings · illustrative 12 m height');

  useEffect(() => {
    if (!container.current) return;
    let map!: LibreMap;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    let observer: ResizeObserver | undefined;
    try {
      maplibregl.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');
      maplibregl.setWorkerCount(2);
      const style: StyleSpecification = {
        version: 8,
        sources: {
          land: { type: 'geojson', data: '/geography/subzones.geojson', attribution: 'URA Master Plan 2019 boundaries · local HDB footprints' },
          streets: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256,
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>', maxzoom: 19 },
          network: { type: 'geojson', data: empty }, stations: { type: 'geojson', data: empty },
          proposal: { type: 'geojson', data: empty }, before: { type: 'geojson', data: empty }, after: { type: 'geojson', data: empty },
        },
        layers: [
          { id: 'water', type: 'background', paint: { 'background-color': '#0b1c26' } },
          { id: 'street-detail', type: 'raster', source: 'streets', layout: { visibility: 'none' }, paint: { 'raster-saturation': -0.8, 'raster-brightness-max': 0.34, 'raster-contrast': 0.15, 'raster-opacity': 0.7 } },
          { id: 'land-fill', type: 'fill', source: 'land', paint: { 'fill-color': '#243c45', 'fill-opacity': 0.85 } },
          { id: 'subzones', type: 'line', source: 'land', paint: { 'line-color': '#4c6970', 'line-width': 0.7, 'line-opacity': 0.3 } },
          { id: 'network-lines', type: 'line', source: 'network', paint: { 'line-color': ['get', 'color'], 'line-width': 1.7, 'line-opacity': 0.56, 'line-dasharray': [3, 2] } },
          { id: 'before-route', type: 'line', source: 'before', paint: { 'line-color': '#99bcee', 'line-width': 5, 'line-opacity': 0.8, 'line-dasharray': [2, 1] } },
          { id: 'after-route', type: 'line', source: 'after', paint: { 'line-color': '#ffbd8c', 'line-width': 5, 'line-opacity': 0.85 } },
          { id: 'proposal-halo', type: 'line', source: 'proposal', paint: { 'line-color': '#ffac79', 'line-width': 12, 'line-opacity': 0.09 } },
          { id: 'proposal-lines', type: 'line', source: 'proposal', paint: { 'line-color': '#ffac79', 'line-width': 3, 'line-dasharray': [2, 1] } },
          { id: 'station-circles', type: 'circle', source: 'stations', paint: {
            'circle-color': ['get', 'color'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2.4, 12, 4, 15, 6],
            'circle-stroke-width': 1.5, 'circle-stroke-color': '#10232c', 'circle-opacity': 0.96,
          } },
        ],
      };
      map = new maplibregl.Map({ container: container.current, style, center: [103.827, 1.354], zoom: 10.8, pitch: 36, bearing: -9,
        minZoom: 9, maxZoom: 18, maxBounds: [[103.50, 1.12], [104.25, 1.62]], attributionControl: { compact: false } });
      mapRef.current = map;
      observer = new ResizeObserver(() => map.resize());
      observer.observe(container.current);
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
      loadTimer = setTimeout(() => { setFatal(true); setNotice('Map could not initialise. Use the geographic plan view and station editor.'); }, 20000);
      map.on('load', () => {
        clearTimeout(loadTimer);
        map.fitBounds([[103.62, 1.235], [104.03, 1.465]], { padding: { top: 90, bottom: 125, left: 30, right: 30 }, duration: 0 });
        const citizens = new CitizenLayer(latest.current.citizens);
        try { map.addLayer(citizens); citizensRef.current=citizens; }
        catch { citizens.onRemove(); latest.current.citizens.onStats({visible:0,fps:null,drawCalls:0,elapsedSeconds:0,status:'3D citizens unavailable; profiles remain usable'}); }
        map.addSource('citizen-path',{type:'geojson',data:empty});
        map.addLayer({id:'citizen-path',type:'line',source:'citizen-path',paint:{'line-color':'#f9e4a4','line-width':2,'line-dasharray':[2,2]}});
        setReady(true); setNotice(citizensRef.current?'Local geography ready':'Citizen rendering unavailable. MRT editing and profiles remain usable.'); setNeighbourhood(map.getZoom() >= 11.5);
      });
      map.on('zoomend', () => setNeighbourhood(map.getZoom() >= 11.5));
      map.on('sourcedata', e => { if (e.sourceId === 'hdb' && e.isSourceLoaded) setBuildingStatus('HDB footprints ready · illustrative 12 m height'); });
      map.on('error', e => {
        const sourceId = (e as { sourceId?: string }).sourceId;
        if (sourceId === 'streets') setNotice('Street tiles unavailable. Local geography is still usable.');
        else if (sourceId === 'hdb') setNotice('Building layer unavailable. Station editing still works.');
        else setNotice('Some map data could not load. Use station selectors if needed.');
      });
      map.on('click', e => {
        const citizen = latest.current.mode==='anchor' ? citizensRef.current?.pick(e.point) : null;
        if(citizen){latest.current.citizens.onSelect(citizen);return;}
        const hits = map.queryRenderedFeatures(e.point, { layers: ['station-circles'] });
        if (hits[0]?.properties?.id) latest.current.onStation(String(hits[0].properties.id));
        else if (latest.current.mode === 'place') latest.current.onPlace({ lat: Number(e.lngLat.lat.toFixed(6)), lon: Number(e.lngLat.lng.toFixed(6)) });
      });
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 14 });
      map.on('mouseenter', 'station-circles', e => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0]; if (!f || f.geometry.type !== 'Point') return;
        const content = document.createElement('div'), name = document.createElement('strong'), detail = document.createElement('span');
        name.textContent = String(f.properties?.name); detail.textContent = `${f.properties?.id} · ${f.properties?.lines}`;
        content.append(name, detail); popup.setLngLat(f.geometry.coordinates as [number, number]).setDOMContent(content).addTo(map);
      });
      map.on('mouseleave', 'station-circles', () => { map.getCanvas().style.cursor = ''; popup.remove(); });
    } catch { setFatal(true); setNotice('WebGL unavailable. Use the geographic plan view and station editor.'); }
    return () => { clearTimeout(loadTimer); observer?.disconnect(); mapRef.current = null; map?.remove(); citizensRef.current=null; };
  }, []);

  useEffect(()=>{
    if(!ready)return;
    citizensRef.current?.update(props.citizens);
    const networkView=props.citizens.networkView, map=mapRef.current;
    for(const id of ['proposal-lines','proposal-halo'])map?.setLayoutProperty(id,'visibility',networkView==='baseline'?'none':'visible');
    for(const id of ['before-route','after-route'])map?.setLayoutProperty(id,'visibility',networkView==='editor'?'visible':'none');
    const animation=props.citizens.pair[props.citizens.view].animations.find(a=>a.agentId===props.citizens.selectedId);
    (mapRef.current?.getSource('citizen-path') as GeoJSONSource | undefined)?.setData({type:'FeatureCollection',features:props.citizens.enabled&&animation&&animation.waypoints.length>1?[line(animation.waypoints.map(p=>[p.lon,p.lat]))]:[]});
  },[props.citizens,ready]);
  useEffect(()=>{if(ready&&props.citizens.focusKey)citizensRef.current?.focus();},[props.citizens.focusKey,ready]);

  useEffect(() => {
    const map = mapRef.current; if (!ready || !map) return;
    const { catalog, draft, comparison, disabledSegments } = props;
    const colors = new Map(catalog.lines.map(l => [l.id, l.color]));
    const byId = new Map(catalog.stations.map(s => [s.id, s]));
    const set = (id: string, features: Feature[]) => (map.getSource(id) as GeoJSONSource).setData({ type: 'FeatureCollection', features });
    set('stations', catalog.stations.map(s => point([s.lon, s.lat], { id: s.id, name: s.name, lines: s.lines.join(' / '), color: colors.get(s.lines[0]) ?? '#71d6d0' })));
    set('network', catalog.connections.flatMap(c => {
      const a = byId.get(c.from), b = byId.get(c.to);
      return a && b ? [line([[a.lon, a.lat], [b.lon, b.lat]], { color: colors.get(c.line) ?? '#7fa8ac' })] : [];
    }));
    set('proposal', draft.stations.slice(1).flatMap((s, i) => {
      const a = position(draft.stations[i], catalog), b = position(s, catalog);
      return a && b && draft.segments[i] && !disabledSegments.includes(i) ? [line([a, b])] : [];
    }));
    set('before', comparison?.baselineRoute && comparison.baselineRoute.coordinates.length > 1 ? [line(comparison.baselineRoute.coordinates)] : []);
    set('after', comparison?.scenarioRoute && comparison.scenarioRoute.coordinates.length > 1 ? [line(comparison.scenarioRoute.coordinates)] : []);
    const markers = draft.stations.flatMap((s, i) => {
      const p = position(s, catalog); if (!p) return [];
      const el = document.createElement('button'); el.className = `proposal-pin ${s.kind}`;
      el.textContent = String(i + 1); el.title = s.kind === 'new' ? `${s.name} — drag to move` : byId.get(s.stationId)?.name ?? s.stationId;
      el.setAttribute('aria-label', s.kind === 'new' ? `Move hypothetical station ${s.name}` : `Interchange ${el.title}`);
      el.addEventListener('click', e => e.stopPropagation());
      const marker = new maplibregl.Marker({ element: el, draggable: s.kind === 'new' }).setLngLat(p).addTo(map);
      if (s.kind === 'new') marker.on('dragend', () => { const p = marker.getLngLat(); latest.current.onMove(s.key, { lat: Number(p.lat.toFixed(6)), lon: Number(p.lng.toFixed(6)) }); });
      return [marker];
    });
    return () => markers.forEach(marker => marker.remove());
  }, [props.catalog, props.draft, props.comparison, props.disabledSegments, ready]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    map.setLayoutProperty('street-detail', 'visibility', streets ? 'visible' : 'none');
    map.setPaintProperty('land-fill', 'fill-opacity', streets ? 0.12 : 0.85);
    if (!streets) setNotice(current => current.startsWith('Street tiles') ? 'Local geography ready' : current);
  }, [streets, ready]);
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    if (buildings && neighbourhood && !map.getSource('hdb')) {
      setBuildingStatus('Loading local HDB footprints…');
      map.addSource('hdb', { type: 'geojson', data: '/geography/buildings.geojson' });
      map.addLayer({ id: 'hdb-buildings', type: 'fill-extrusion', source: 'hdb', minzoom: 11.5,
        paint: { 'fill-extrusion-color': '#69858b', 'fill-extrusion-height': 12, 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.72 } }, 'network-lines');
    }
    if (map.getLayer('hdb-buildings')) map.setLayoutProperty('hdb-buildings', 'visibility', buildings ? 'visible' : 'none');
  }, [buildings, ready, neighbourhood]);

  return <div className={`map-frame ${props.mode === 'place' ? 'placing' : ''} ${props.citizens.networkView==='baseline'?'citizen-baseline':''}`}>
    <div ref={container} className="map-canvas" role="region" aria-label="Interactive geographic Singapore map" />
    {fatal && <PlanFallback {...props} />}
    <div className="map-top-card"><span className="live-dot" /><div><strong>Singapore</strong><span>{props.mode === 'place' ? 'Click the map to place a hypothetical station' : 'Click an existing station to add an interchange'}</span></div></div>
    <div className="map-toolbar">
      <button onClick={() => { mapRef.current?.easeTo({ pitch: pitch ? 0 : 48, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500 }); setPitch(!pitch); }} aria-pressed={pitch}>▱ {pitch ? '3D view' : 'Plan view'}</button>
      <button onClick={() => mapRef.current?.fitBounds([[103.62, 1.235], [104.03, 1.465]], { padding: 35, duration: 500 })}>Fit Singapore</button>
      <button onClick={() => mapRef.current?.easeTo({ center: [103.85, 1.35], zoom: 14, pitch: 48, duration: 600 })}>Neighbourhood</button>
      <button onClick={props.citizens.onFocus}>Citizens</button>
      {props.citizens.enabled&&props.citizens.networkView!=='editor'&&<button onClick={props.citizens.onPlayPause} aria-label={props.citizens.playing?'Pause citizen animation':'Play citizen animation'}>{props.citizens.playing?'Pause':'Play'}</button>}
    </div>
    <div className="map-layers"><label><input type="checkbox" checked={buildings} onChange={e => setBuildings(e.target.checked)} /> Miniature HDB buildings</label><label><input type="checkbox" checked={streets} onChange={e => setStreets(e.target.checked)} /> Street detail <span>online</span></label><small role="status">{buildingStatus}</small></div>
    <div className="map-legend"><span><i className="legend-line existing" /> Existing connections</span><span><i className="legend-line proposed" /> Proposed line</span><strong>All links are schematic, not track alignments</strong></div>
    {!ready && !fatal && <div className="map-loading"><span className="spinner" /> Loading geographic canvas</div>}
    <span className="sr-only" role="status">{notice}</span>
    {(notice.includes('unavailable') || notice.includes('could not')) && <div className="map-notice">{notice}</div>}
  </div>;
}

function PlanFallback(props: Props) {
  const [features, setFeatures] = useState<Feature[]>([]);
  useEffect(() => { fetch('/geography/subzones.geojson').then(r => r.json()).then(d => setFeatures(d.features)).catch(() => {}); }, []);
  const xy = ([lon, lat]: number[]) => [(lon - 103.55) / 0.6 * 1000, (1.5 - lat) / 0.32 * 650];
  const path = (g: Geometry) => {
    const polygons = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    return polygons.flatMap(p => p.map(r => r.map((pos, i) => `${i ? 'L' : 'M'}${xy(pos).join(',')}`).join(' ') + 'Z')).join(' ');
  };
  return <svg className="fallback-map" viewBox="0 0 1000 650" aria-label="Singapore geographic fallback plan" onClick={e => {
    if (props.mode !== 'place') return;
    const svg = e.currentTarget, p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const at = p.matrixTransform(svg.getScreenCTM()!.inverse());
    props.onPlace({ lon: Number((103.55 + at.x / 1000 * 0.6).toFixed(6)), lat: Number((1.5 - at.y / 650 * 0.32).toFixed(6)) });
  }}>
    {features.map((f, i) => <path key={i} d={path(f.geometry)} fill="#243c45" stroke="#48656b" strokeWidth="0.6" />)}
    {props.catalog.stations.map(s => { const [x, y] = xy([s.lon, s.lat]); return <circle key={s.id} cx={x} cy={y} r="4" fill="#71d6d0" onClick={e => { e.stopPropagation(); props.onStation(s.id); }}><title>{s.name} ({s.id})</title></circle>; })}
    {props.draft.stations.slice(1).map((s, i) => { const a = position(props.draft.stations[i], props.catalog), b = position(s, props.catalog); if (!a || !b || props.disabledSegments.includes(i)) return null;
      const [x1, y1] = xy(a), [x2, y2] = xy(b); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffac79" strokeWidth="4" />; })}
  </svg>;
}
