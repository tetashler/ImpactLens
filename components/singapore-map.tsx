'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as LibreMap, StyleSpecification } from 'maplibre-gl';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import type { NetworkCatalog, CompactComparison } from '../lib/map-contract';
import type { EditorDraft } from '../lib/editor';
import { CitizenLayer, type CitizenLayerOptions } from '../lib/citizens/layer';
import {BUILDING_DISPLAY_LIMITS,RENDER_DISTANCE,renderDistanceMinZoom} from '../lib/buildings/display-policy';
import RenderDistanceControl from './render-distance-control';
import {syncCitizenPath} from '../lib/citizens/path-overlay';
import { AacMapLayer,type AacMapOptions } from '../lib/eldercare/map-layer';
import { PlotMapLayer,type PlotMapOptions } from '../lib/plots/map-layer';
import {CameraCoordinator,fitSingapore,LANDING_CAMERA,type CameraCommand} from '../lib/map-camera';
import type {PlotPosition} from '../lib/plots/geometry';
import { BuildingLayer,type BuildingStatus } from '../lib/buildings/layer';
import { BuildingCatalogueSession } from '../lib/buildings/session';
import type { BuildingManifest } from '../lib/buildings/contract';
import BuildingCredits,{HDB_SOURCE_URL,SODL_URL,type BuildingView} from './building-credits';

interface Props {
  exploring:boolean;
  editing:boolean;
  focusKey:number;
  cameraCommand?:CameraCommand;
  visible?:boolean;
  plotting?:PlotMapOptions&{onMapClick:(position:PlotPosition)=>void;onAnchorPick:(stationId:string)=>void};
  aac:AacMapOptions;
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
  const loadedMap=useRef<LibreMap|null>(null);
  const plotRef=useRef<PlotMapLayer|null>(null),camera=useRef(new CameraCoordinator());
  const buildingSession=useRef<BuildingCatalogueSession|null>(null);
  if(props.cameraCommand)camera.current.request(props.cameraCommand);
  const citizensRef = useRef<CitizenLayer | null>(null);
  const aacRef=useRef<AacMapLayer|null>(null),stationPopup=useRef<maplibregl.Popup|null>(null);
  latest.current = props;
  const [ready, setReady] = useState(false), [fatal, setFatal] = useState(false);
  const [streets, setStreets] = useState(true), [buildings, setBuildings] = useState(true), [notice, setNotice] = useState('Loading local geography…');
  const [pitch, setPitch] = useState(true);
  const [renderDistance,setRenderDistance]=useState<number>(RENDER_DISTANCE.defaultValue);
  const [buildingMinZoom,setBuildingMinZoom]=useState<number>(BUILDING_DISPLAY_LIMITS.minZoom);
  useEffect(()=>{const timer=setTimeout(()=>setBuildingMinZoom(renderDistanceMinZoom(renderDistance)),RENDER_DISTANCE.debounceMs);return()=>clearTimeout(timer);},[renderDistance]);
  const [neighbourhood, setNeighbourhood] = useState(false);
  const [hdbStatus,setHdbStatus]=useState('Zoom in for limited HDB footprints · illustrative 12 m height');
  const [buildingView,setBuildingView]=useState<BuildingView>('unified'),[buildingManifest,setBuildingManifest]=useState<BuildingManifest|null>(null);
  const [unifiedStatus,setUnifiedStatus]=useState<BuildingStatus>({state:'waiting-for-map',features:0,chunks:0,message:'Waiting for the geographic map.'});
  const buildingChoice=useRef({view:buildingView,enabled:buildings});buildingChoice.current={view:buildingView,enabled:buildings};

  useEffect(() => {
    if (!container.current) return;
    setReady(false);loadedMap.current=null;
    let map!: LibreMap;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    let observer: ResizeObserver | undefined;
    try {
      maplibregl.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');
      maplibregl.setWorkerCount(2);
      const style: StyleSpecification = {
        version: 8,
        sources: {
          land: { type: 'geojson', data: '/geography/subzones.geojson', attribution: `URA Master Plan 2019 boundaries · <a href="${SODL_URL}">Singapore Open Data Licence</a>` },
          streets: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256,
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>', maxzoom: 19 },
          network: { type: 'geojson', data: empty }, stations: { type: 'geojson', data: empty },
          proposal: { type: 'geojson', data: empty }, before: { type: 'geojson', data: empty }, after: { type: 'geojson', data: empty },
        },
        layers: [
          { id: 'water', type: 'background', paint: { 'background-color': '#0b1c26' } },
          { id: 'street-detail', type: 'raster', source: 'streets', layout: { visibility: streets?'visible':'none' }, paint: { 'raster-saturation': -0.8, 'raster-brightness-max': 0.34, 'raster-contrast': 0.15, 'raster-opacity': 0.7 } },
          { id: 'land-fill', type: 'fill', source: 'land', paint: { 'fill-color': '#243c45', 'fill-opacity': streets?0.12:0.85 } },
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
      // Supplied HDB footprints form a dense Tiong Bahru cluster here. Heights remain illustrative.
      map = new maplibregl.Map({ container: container.current, style,...LANDING_CAMERA,
        // Close inspection of metre-scale illustrative pedestrians; opening camera is unchanged.
        minZoom: 9, maxZoom: 20, maxBounds: [[103.50, 1.12], [104.25, 1.62]], attributionControl: false });
      mapRef.current = map;
      observer = new ResizeObserver(() => {map.resize();container.current?.parentElement?.style.setProperty('--geographic-canvas-height',`${container.current.clientHeight}px`);});
      observer.observe(container.current);
      loadTimer = setTimeout(() => { setFatal(true); setNotice('Map could not initialise. Use the geographic plan view and station editor.'); }, 20000);
      map.on('load', () => {
        clearTimeout(loadTimer);
        // Slow online tiles may finish after the 20-second plan fallback appears.
        setFatal(false);
        loadedMap.current=map;
        const citizens = new CitizenLayer(latest.current.citizens);
        try { map.addLayer(citizens); citizensRef.current=citizens; }
        catch { citizens.onRemove(); latest.current.citizens.onStats({visible:0,fps:null,drawCalls:0,elapsedSeconds:0,status:'3D citizens unavailable; profiles remain usable'}); }
        syncCitizenPath(map,latest.current.citizens);
        aacRef.current=new AacMapLayer(map,latest.current.aac);
        if(latest.current.plotting)plotRef.current=new PlotMapLayer(map,latest.current.plotting);
        setReady(true); setNotice(citizensRef.current?'Local geography ready':'Citizen rendering unavailable. MRT editing and profiles remain usable.'); setNeighbourhood(map.getZoom() >= 11.5);
      });
      map.on('zoomend', () => setNeighbourhood(map.getZoom() >= 11.5));
      map.on('style.load',()=>{
        // Reattach the same citizen owner after style replacement; its paused
        // clock survives, while onRemove/onAdd dispose/rebuild GPU resources.
        if(loadedMap.current!==map)return;
        const citizens=citizensRef.current;
        if(citizens&&!map.getLayer(citizens.id)){try{map.addLayer(citizens);}catch{latest.current.citizens.onStats({visible:0,fps:null,drawCalls:0,elapsedSeconds:0,status:'3D citizens unavailable; profiles remain usable'});}}
        syncCitizenPath(map,latest.current.citizens);
      });
      map.on('idle',()=>{
        // Geographic diagnostics for acceptance checks; not population or impact estimates.
        const target=container.current;if(!target)return;
        const layer=buildingChoice.current.view==='unified'?'sg-buildings-extrusion':'hdb-buildings';
        target.dataset.visibleBuildingFeatures=String(map.getLayer(layer)?map.queryRenderedFeatures({layers:[layer]}).length:0);
        target.dataset.mapCamera=JSON.stringify({lon:map.getCenter().lng,lat:map.getCenter().lat,zoom:map.getZoom(),pitch:map.getPitch()});
      });
      map.on('sourcedata', e => { if (e.sourceId === 'hdb' && e.isSourceLoaded) setHdbStatus('Limited HDB footprints ready · illustrative 12 m height'); });
      map.on('error', e => {
        const sourceId = (e as { sourceId?: string }).sourceId;
        if (sourceId === 'streets') {setNotice('Street tiles unavailable. Local geography is still usable.');if(map.getLayer('land-fill'))map.setPaintProperty('land-fill','fill-opacity',.85);}
        else if (sourceId === 'hdb') {setHdbStatus('HDB footprints unavailable. Other map tools remain usable.');}
        else if(sourceId==='sg-buildings')setUnifiedStatus({state:'error',features:0,chunks:0,message:'Building renderer unavailable; other map tools remain usable.'});
        else setNotice('Some map data could not load. Use station selectors if needed.');
      });
      map.on('click', e => {
        if(e.originalEvent.target instanceof Element&&e.originalEvent.target.closest('.maplibregl-popup,.maplibregl-control-container'))return;
        if(latest.current.exploring)return;
        const plotting=latest.current.plotting;
        if(plotting?.active){
          if(['point','station','line'].includes(plotting.mode)){plotting.onMapClick({lat:Number(e.lngLat.lat.toFixed(6)),lon:Number(e.lngLat.lng.toFixed(6))});return;}
          if(plotting.mode==='anchor'){const hit=map.queryRenderedFeatures(e.point,{layers:['station-circles']})[0];if(hit?.properties?.id)plotting.onAnchorPick(String(hit.properties.id));return;}
          const line=plotRef.current?.pickLine(e.point);plotting.onSelect(line?{id:line.id}:null);return;
        }
        if(latest.current.aac.active){aacRef.current?.handleClick({lat:Number(e.lngLat.lat.toFixed(6)),lon:Number(e.lngLat.lng.toFixed(6))});return;}
        const citizen = latest.current.mode==='anchor' ? citizensRef.current?.pick(e.point) : null;
        if(citizen){latest.current.citizens.onSelect(citizen);return;}
        if(!latest.current.editing)return;
        const hits = map.queryRenderedFeatures(e.point, { layers: ['station-circles'] });
        if (hits[0]?.properties?.id) latest.current.onStation(String(hits[0].properties.id));
        else if (latest.current.mode === 'place') latest.current.onPlace({ lat: Number(e.lngLat.lat.toFixed(6)), lon: Number(e.lngLat.lng.toFixed(6)) });
      });
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 14 });
      stationPopup.current=popup;
      map.on('mouseenter', 'station-circles', e => {
        if(latest.current.aac.active)return;
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0]; if (!f || f.geometry.type !== 'Point') return;
        const content = document.createElement('div'), name = document.createElement('strong'), detail = document.createElement('span');
        name.textContent = String(f.properties?.name); detail.textContent = `${f.properties?.id} · ${f.properties?.lines}`;
        content.append(name, detail); popup.setLngLat(f.geometry.coordinates as [number, number]).setDOMContent(content).addTo(map);
      });
      map.on('mouseleave', 'station-circles', () => { map.getCanvas().style.cursor = ''; popup.remove(); });
    } catch { setFatal(true); setNotice('WebGL unavailable. Use the geographic plan view and station editor.');latest.current.citizens.onStats({visible:0,fps:null,drawCalls:0,elapsedSeconds:0,status:'3D citizens unavailable; profiles remain usable'}); }
    return () => { clearTimeout(loadTimer); observer?.disconnect();loadedMap.current=null;mapRef.current=null;buildingSession.current?.dispose();buildingSession.current=null;plotRef.current?.dispose();plotRef.current=null; aacRef.current?.dispose();aacRef.current=null;stationPopup.current?.remove();stationPopup.current=null;map?.remove(); citizensRef.current=null; };
  }, []);

  useEffect(()=>{
    if(!ready||!mapRef.current||loadedMap.current!==mapRef.current)return;
    citizensRef.current?.update(props.citizens);
    const networkView=props.citizens.networkView, map=mapRef.current;
    for(const id of ['proposal-lines','proposal-halo'])map?.setLayoutProperty(id,'visibility',props.exploring||props.plotting?.active||props.aac.active||networkView==='baseline'?'none':'visible');
    for(const id of ['before-route','after-route'])map?.setLayoutProperty(id,'visibility',!props.exploring&&!props.aac.active&&networkView==='editor'?'visible':'none');
    syncCitizenPath(map,props.citizens);
  },[props.citizens,props.aac.active,props.exploring,props.plotting?.active,ready]);
  useEffect(()=>{if(!props.cameraCommand&&ready&&mapRef.current&&loadedMap.current===mapRef.current&&props.focusKey)fitSingapore(mapRef.current,matchMedia('(prefers-reduced-motion: reduce)').matches);},[props.focusKey,props.cameraCommand,ready]);
  useEffect(()=>{camera.current.apply(mapRef.current,ready&&loadedMap.current===mapRef.current,matchMedia('(prefers-reduced-motion: reduce)').matches);},[props.cameraCommand,ready]);
  useEffect(()=>{const map=mapRef.current;if(!ready||!map||loadedMap.current!==map||!props.plotting)return;if(!plotRef.current)plotRef.current=new PlotMapLayer(map,props.plotting);else plotRef.current.update(props.plotting);},[props.plotting,ready]);
  useEffect(()=>{if(props.visible!==false&&ready&&loadedMap.current===mapRef.current)mapRef.current?.resize();},[props.visible,ready]);
  useEffect(()=>{const map=mapRef.current;if(!ready||!map||loadedMap.current!==map)return;aacRef.current?.update(props.aac);for(const id of ['network-lines','station-circles'])map.setLayoutProperty(id,'visibility',props.aac.active?'none':'visible');if(props.aac.active)stationPopup.current?.remove();},[props.aac,ready]);
  useEffect(()=>{if(ready&&loadedMap.current===mapRef.current&&props.citizens.focusKey)citizensRef.current?.focus();},[props.citizens.focusKey,ready]);

  useEffect(() => {
    const map = mapRef.current; if (!ready || !map||loadedMap.current!==map) return;
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
      const marker = new maplibregl.Marker({ element: el, draggable: props.editing&&s.kind === 'new' }).setLngLat(p).addTo(map);
      if (s.kind === 'new') marker.on('dragend', () => { const p = marker.getLngLat(); latest.current.onMove(s.key, { lat: Number(p.lat.toFixed(6)), lon: Number(p.lng.toFixed(6)) }); });
      return [marker];
    });
    return () => markers.forEach(marker => marker.remove());
  }, [props.catalog, props.draft, props.comparison, props.disabledSegments,props.editing, ready]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !ready||loadedMap.current!==map) return;
    map.setLayoutProperty('street-detail', 'visibility', streets ? 'visible' : 'none');
    map.setPaintProperty('land-fill', 'fill-opacity', streets ? 0.12 : 0.85);
    if (!streets) setNotice(current => current.startsWith('Street tiles') ? 'Local geography ready' : current);
  }, [streets, ready]);
  useEffect(()=>{
    const map=mapRef.current;if(!ready||!map||loadedMap.current!==map)return;
    let current=true;const isCurrent=()=>current&&mapRef.current===map&&loadedMap.current===map;
    const session=new BuildingCatalogueSession({isCurrent,minZoom:buildingMinZoom,onStatus:setUnifiedStatus,onManifest:setBuildingManifest,
      createLayer:(manifest,onStatus,minZoom)=>new BuildingLayer(map,manifest,{minZoom,beforeId:'network-lines',onStatus})});
    buildingSession.current=session;void session.setVisible(buildingChoice.current.enabled&&buildingChoice.current.view==='unified');
    return()=>{current=false;if(buildingSession.current===session)buildingSession.current=null;session.dispose();};
  },[ready]);
  useEffect(()=>{
    const map=mapRef.current;if(!ready||!map||loadedMap.current!==map)return;
    void buildingSession.current?.setMinZoom(buildingMinZoom);
    const hdb=map.getLayer('hdb-buildings');if(hdb)map.setLayerZoomRange('hdb-buildings',buildingMinZoom,hdb.maxzoom??24);
  },[buildingMinZoom,ready]);
  useEffect(()=>{
    const map=mapRef.current;if(!ready||!map||loadedMap.current!==map)return;
    if(buildingView==='unified'&&map.getLayer('hdb-buildings'))map.setLayoutProperty('hdb-buildings','visibility','none');
    void buildingSession.current?.setVisible(buildings&&buildingView==='unified');
  },[buildingView,buildings,ready]);
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready||loadedMap.current!==map) return;
    const visible=buildings&&buildingView==='hdb';
    if (visible && neighbourhood && !map.getSource('hdb')) {
      setHdbStatus('Loading limited HDB footprints…');
      map.addSource('hdb', { type: 'geojson', data: '/geography/buildings.geojson',attribution:`HDB supplied footprints · <a href="${HDB_SOURCE_URL}">Source</a> · <a href="${SODL_URL}">Singapore Open Data Licence</a>` });
      map.addLayer({ id: 'hdb-buildings', type: 'fill-extrusion', source: 'hdb', minzoom: buildingMinZoom,
        paint: { 'fill-extrusion-color': '#69858b', 'fill-extrusion-height': 12, 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.72 } }, 'network-lines');
    }
    if (map.getLayer('hdb-buildings')) map.setLayoutProperty('hdb-buildings', 'visibility', visible ? 'visible' : 'none');
  }, [buildings, buildingView, ready, neighbourhood]);

  const buildingStatus=fatal?'3D buildings require WebGL; the geographic plan remains usable.':!buildings?'3D buildings are off.':buildingView==='hdb'?hdbStatus:unifiedStatus.state==='ready'?`${unifiedStatus.features.toLocaleString()} selected footprints in ${unifiedStatus.chunks} viewport chunks. ${unifiedStatus.limited?unifiedStatus.message:'Coverage incomplete.'}`:unifiedStatus.message;
  function changeBuildingView(view:BuildingView){void buildingSession.current?.setVisible(false);const map=mapRef.current;if(map?.getLayer('hdb-buildings'))map.setLayoutProperty('hdb-buildings','visibility','none');setBuildingView(view);}

  return <><div data-building-view={buildingView} data-building-state={buildingView==='unified'?unifiedStatus.state:buildings?'legacy':'hidden'} className={`map-frame ${!props.exploring&&(props.plotting?.active?['point','station','line','anchor'].includes(props.plotting.mode):props.aac.active?props.aac.placing:props.editing&&props.mode==='place')?'placing':''} ${props.plotting?.active?'universal-plotting':''} ${props.exploring?'map-exploring':''} ${props.aac.active?'aac-mode':''} ${props.citizens.networkView==='baseline'?'citizen-baseline':''}`}>
    <div ref={container} className="map-canvas" role="region" aria-label="Interactive geographic Singapore map" />
    {fatal && <PlanFallback {...props} />}
    <div className="map-toolbar">
      <button onClick={() => { mapRef.current?.easeTo({ pitch: pitch ? 0 : 48, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500 }); setPitch(!pitch); }} aria-pressed={pitch}>▱ {pitch ? '3D view' : 'Plan view'}</button>
      <button onClick={() => {if(mapRef.current)fitSingapore(mapRef.current,matchMedia('(prefers-reduced-motion: reduce)').matches);}}>Fit Singapore</button>
      <RenderDistanceControl value={renderDistance} onChange={setRenderDistance} disabled={fatal}/>
      {props.exploring&&<button onClick={()=>mapRef.current?.easeTo({...LANDING_CAMERA,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:650})}>Reset view</button>}
      {!props.exploring&&props.aac.active&&<><button onClick={props.aac.onFocus}>Focus AAC area</button>{!props.plotting?.active&&<button onClick={props.aac.placing?props.aac.onCancel:props.aac.onStartPlacement}>{props.aac.placing?'Cancel placement':'Place centre'}</button>}</>}
    </div>
    <details className="map-layers"><summary>Map layers{buildingView==='unified'&&buildings&&unifiedStatus.limited&&<span className="building-detail-limit"> · limited detail</span>}</summary><div><label><input type="checkbox" checked={buildings} disabled={fatal} onChange={e=>setBuildings(e.target.checked)}/> 3D Buildings</label><label className="building-source-select">Building source<select aria-label="Building source" disabled={fatal} value={buildingView} onChange={e=>changeBuildingView(e.target.value as BuildingView)}><option value="unified">Unified Singapore — internal review only</option><option value="hdb">Existing HDB — limited footprint coverage</option></select></label><label><input type="checkbox" checked={streets} onChange={e => setStreets(e.target.checked)} /> Street detail <span>online</span></label><small className="building-status" role="status">{buildingStatus}</small>{buildingView==='unified'&&buildings&&unifiedStatus.state==='error'&&<button type="button" className="building-retry" onClick={()=>void buildingSession.current?.retry()}>Retry unified buildings</button>}<small>{buildingView==='unified'?'Mixed source heights, assumed 3 m per floor or illustrative 12 m. Internal review only.':'Limited HDB footprints; all heights illustrative 12 m.'}</small></div></details>
    {buildings&&buildingView==='unified'&&unifiedStatus.state==='loading'&&<p className="building-load-status" role="status"><span className="spinner"/> Loading sourced building footprints…</p>}
    {props.aac.active?<div className="map-legend aac-map-legend"><span>AAC · historical, corroborated records</span><span>HYP · hypothetical centre · P · landmark proxy</span><strong>Assumed straight-line accessibility radius — not a walking-network catchment.</strong></div>:<div className="map-legend"><span><i className="legend-line existing" /> Existing connections</span><span><i className="legend-line proposed" /> Proposed line</span><strong>All links are schematic, not track alignments</strong></div>}
    {!ready && !fatal && <div className="map-loading"><span className="spinner" /> Loading geographic canvas</div>}
    <span className="sr-only" role="status">{notice}</span>
    {(notice.includes('unavailable') || notice.includes('could not')) && <div className="map-notice">{notice}</div>}
  </div><BuildingCredits view={buildingView} manifest={buildingManifest} problem={fatal?buildingStatus:buildingView==='unified'&&buildings&&unifiedStatus.state==='error'?unifiedStatus.message:undefined} onRetry={!fatal?()=>void buildingSession.current?.retry():undefined}/></>;
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
    if(props.exploring)return;
    if (!props.plotting?.active&&(!props.editing||(props.aac.active?!props.aac.placing:props.mode !== 'place'))) return;
    const svg = e.currentTarget, p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const at = p.matrixTransform(svg.getScreenCTM()!.inverse());
    const coordinate={lon:Number((103.55+at.x/1000*.6).toFixed(6)),lat:Number((1.5-at.y/650*.32).toFixed(6))};if(props.plotting?.active){if(['point','station','line'].includes(props.plotting.mode))props.plotting.onMapClick(coordinate);return;}if(props.aac.active)props.aac.onPlace(coordinate);else props.onPlace(coordinate);
  }}>
    {features.map((f, i) => <path key={i} d={path(f.geometry)} fill="#243c45" stroke="#48656b" strokeWidth="0.6" />)}
    {!props.aac.active&&props.catalog.stations.map(s => { const [x, y] = xy([s.lon, s.lat]); return <circle key={s.id} cx={x} cy={y} r="4" fill="#71d6d0" onClick={e => {if(props.plotting?.active&&['point','station','line'].includes(props.plotting.mode))return;e.stopPropagation();if(props.plotting?.active&&props.plotting.mode==='anchor')props.plotting.onAnchorPick(s.id);else if(!props.exploring&&props.editing)props.onStation(s.id); }}><title>{s.name} ({s.id})</title></circle>; })}
    {props.plotting?.active&&props.plotting.geometry.features.map(feature=>feature.kind==='line'?<polyline key={feature.id} points={feature.coordinates.map(p=>xy([p.lon,p.lat]).join(',')).join(' ')} fill="none" stroke="#ffb17b" strokeWidth="4"/>:(()=>{const [x,y]=xy([feature.coordinate.lon,feature.coordinate.lat]);return <circle key={feature.id} className="fallback-plot-point" cx={x} cy={y} r="7" fill="#ffb17b" onClick={e=>{e.stopPropagation();props.plotting!.onSelect({id:feature.id});}}><title>{feature.label} · user drawn</title></circle>;})())}
    {props.aac.active&&props.aac.facilities?.facilities.map(f=>{const [x,y]=xy([f.position.lon,f.position.lat]);return <rect key={f.id} x={x-4} y={y-4} width="8" height="8" fill="#a1dfb8" onClick={e=>{e.stopPropagation();props.aac.onSelect(f.id);}}><title>{f.name} · historical AAC</title></rect>;})}
    {props.aac.active&&props.aac.proposedMarker!==false&&props.aac.position&&Number.isFinite(props.aac.position.lat)&&Number.isFinite(props.aac.position.lon)&&(()=>{const [x,y]=xy([props.aac.position!.lon,props.aac.position!.lat]);return <circle cx={x} cy={y} r="6" fill="#ffac79"><title>Hypothetical AAC</title></circle>;})()}
    {!props.exploring&&!props.aac.active&&props.draft.stations.slice(1).map((s, i) => { const a = position(props.draft.stations[i], props.catalog), b = position(s, props.catalog); if (!a || !b || props.disabledSegments.includes(i)) return null;
      const [x1, y1] = xy(a), [x2, y2] = xy(b); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffac79" strokeWidth="4" />; })}
  </svg>;
}
