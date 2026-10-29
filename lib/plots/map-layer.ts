import { Marker, type GeoJSONSource, type Map as LibreMap } from 'maplibre-gl';
import type { FeatureCollection, LineString } from 'geojson';
import { geometryGeoJSON, isPlotPosition, type PlotPosition, type ScenarioGeometry } from './geometry.ts';

export type PlotSelection = { id: string; vertex?: number } | null;
export interface PlotMapOptions {
  active: boolean;
  geometry: ScenarioGeometry;
  mode: 'explore' | 'point' | 'station' | 'line' | 'edit' | 'anchor';
  selection: PlotSelection;
  anchors: Record<string, string>;
  onSelect: (selection: PlotSelection) => void;
  onMovePoint: (id: string, position: PlotPosition) => void;
  onMoveVertex: (id: string, index: number, position: PlotPosition) => void;
  onDragStart: () => void;
}

type Target = NonNullable<PlotSelection>;
interface PlotMarker {
  marker: Marker;
  element: HTMLButtonElement;
  glyph: HTMLSpanElement;
  label: HTMLSpanElement;
  target: Target;
  remove: () => void;
}
interface DragPreview {
  entry: PlotMarker;
  geometry: ScenarioGeometry;
  position: PlotPosition | null;
}

const empty: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] };
const toLngLat = ({ lon, lat }: PlotPosition): [number, number] => [lon, lat];
let nextLayerId = 0;

/** Small, browser-owned overlay on the existing map; no extra map or render loop. */
export class PlotMapLayer {
  private readonly map: LibreMap;
  private options: PlotMapOptions;
  private previous: PlotMapOptions | null = null;
  private disposed = false;
  private readonly sourceId = `impact-plots-${++nextLayerId}`;
  private readonly lineId = `${this.sourceId}-lines`;
  private readonly haloId = `${this.sourceId}-selection`;
  private readonly points = new Map<string, PlotMarker>();
  private readonly vertices = new Map<string, PlotMarker>();
  private drag: DragPreview | null = null;

  private install = () => {
    if (this.disposed) return;
    if (!this.map.getSource(this.sourceId)) this.map.addSource(this.sourceId, { type: 'geojson', data: empty });
    if (!this.map.getLayer(this.haloId)) this.map.addLayer({
      id: this.haloId, type: 'line', source: this.sourceId,
      filter: ['==', ['get', 'selected'], true],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffb07a', 'line-width': 12, 'line-opacity': 0.23 },
    });
    if (!this.map.getLayer(this.lineId)) this.map.addLayer({
      id: this.lineId, type: 'line', source: this.sourceId,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffac79', 'line-width': 3, 'line-opacity': 0.95 },
    });
    this.drawLines();
  };

  constructor(map: LibreMap, options: PlotMapOptions) {
    this.map = map;
    this.options = options;
    this.map.on('style.load', this.install);
    this.install();
    this.update(options);
  }

  private drawLines() {
    const source = this.map.getSource(this.sourceId) as GeoJSONSource | undefined;
    if (!source) return;
    if (!this.options.active) { source.setData(empty); return; }
    const data = geometryGeoJSON(this.options.geometry);
    const lines: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: data.features.flatMap((feature) => {
        if (feature.geometry.type !== 'LineString') return [];
        const coordinates = feature.geometry.coordinates;
        const preview = this.drag;
        if (preview?.position && preview.entry.target.id === feature.properties?.id && preview.entry.target.vertex !== undefined)
          coordinates[preview.entry.target.vertex] = toLngLat(preview.position);
        return [{ ...feature, geometry: { type: 'LineString' as const, coordinates },
          properties: { ...feature.properties, selected: feature.properties?.id === this.options.selection?.id } }];
      }),
    };
    source.setData(lines);
  }

  private coordinate(target: Target): PlotPosition | null {
    const feature = this.options.geometry.features.find((feature) => feature.id === target.id);
    if (!feature) return null;
    return target.vertex === undefined
      ? feature.kind === 'point' ? feature.coordinate : null
      : feature.kind === 'line' ? feature.coordinates[target.vertex] ?? null : null;
  }

  private markerPosition(entry: PlotMarker): PlotPosition {
    const { lat, lng } = entry.marker.getLngLat();
    return { lat: Number(lat.toFixed(6)), lon: Number(lng.toFixed(6)) };
  }

  private startDrag(entry: PlotMarker) {
    if (!this.options.active || this.options.mode !== 'edit' || !this.coordinate(entry.target)) return;
    this.drag = { entry, geometry: this.options.geometry, position: null };
    this.options.onDragStart();
  }

  private previewDrag(entry: PlotMarker) {
    if (this.drag?.entry !== entry) return;
    const position = this.markerPosition(entry);
    this.drag.position = isPlotPosition(position) ? position : null;
    this.drawLines();
  }

  private finishDrag(entry: PlotMarker) {
    if (this.drag?.entry !== entry) return;
    this.drag = null;
    const position = this.markerPosition(entry), target = entry.target;
    if (this.options.active && this.options.mode === 'edit' && this.coordinate(target) && isPlotPosition(position)) {
      if (target.vertex === undefined) this.options.onMovePoint(target.id, position);
      else this.options.onMoveVertex(target.id, target.vertex, position);
    }
    // Parent state remains canonical, including when a callback rejects a move.
    const committed = this.coordinate(target);
    if (!this.disposed && committed) entry.marker.setLngLat(toLngLat(committed));
    if (!this.disposed) this.drawLines();
  }

  private createMarker(target: Target, coordinate: PlotPosition): PlotMarker {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `plot-map-marker ${target.vertex === undefined ? 'plot-point-marker' : 'plot-vertex-marker'}`;
    element.dataset.plotId = target.id;
    if (target.vertex !== undefined) element.dataset.plotVertex = String(target.vertex);
    Object.assign(element.style, {
      width: '32px', height: '32px', padding: '3px', border: '0', background: 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible',
      color: '#142b32', font: '700 12px/1 system-ui, sans-serif',
    });
    const glyph = document.createElement('span');
    Object.assign(glyph.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
      border: '2px solid #132b34', flexShrink: '0', pointerEvents: 'none',
      boxShadow: '0 2px 7px #07151f80',
    });
    const label = document.createElement('span');
    Object.assign(label.style, {
      position: 'absolute', top: '31px', left: '50%', transform: 'translateX(-50%)', maxWidth: '160px',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none',
      color: '#e7f0ed', background: '#10242ce8', borderRadius: '4px', padding: '3px 5px',
      font: '500 10px/1.2 system-ui, sans-serif',
    });
    element.append(glyph, label);
    const marker = new Marker({ element, draggable: this.options.mode === 'edit' })
      .setLngLat(toLngLat(coordinate)).addTo(this.map);
    const click = (event: Event) => {
      event.stopPropagation();
      if (this.options.active && !this.disposed) this.options.onSelect(target);
    };
    const entry: PlotMarker = { marker, element, glyph, label, target, remove: () => {
      marker.off('dragstart', start); marker.off('drag', drag); marker.off('dragend', end);
      element.removeEventListener('click', click); marker.remove();
    } };
    const start = () => this.startDrag(entry), drag = () => this.previewDrag(entry), end = () => this.finishDrag(entry);
    element.addEventListener('click', click);
    marker.on('dragstart', start); marker.on('drag', drag); marker.on('dragend', end);
    return entry;
  }

  private styleMarker(entry: PlotMarker, title: string, label: string, glyph: string, anchored: boolean) {
    const selected = this.options.selection?.id === entry.target.id && this.options.selection.vertex === entry.target.vertex;
    const vertex = entry.target.vertex !== undefined, editable = this.options.mode === 'edit';
    entry.element.title = title;
    entry.element.setAttribute('aria-label', title);
    entry.element.setAttribute('aria-pressed', String(selected));
    entry.element.setAttribute('aria-description', editable ? 'Drag to move this plot. Select it to edit its label and order.' : 'Select this plot. Use Edit mode to move it.');
    entry.element.classList.toggle('selected', selected);
    entry.element.style.cursor = editable ? 'grab' : 'pointer';
    entry.element.style.zIndex = selected ? '6' : vertex ? '4' : '5';
    entry.glyph.textContent = glyph;
    entry.glyph.style.width = vertex ? '12px' : '26px';
    entry.glyph.style.height = vertex ? '12px' : '26px';
    entry.glyph.style.borderRadius = vertex ? '3px' : '50%';
    entry.glyph.style.background = anchored ? '#6ed9c5' : '#ffad7b';
    entry.glyph.style.outline = selected ? '2px solid #f2f6e9' : 'none';
    entry.glyph.style.outlineOffset = '2px';
    entry.label.textContent = label;
    entry.label.style.display = vertex ? 'none' : 'block';
    entry.marker.setDraggable(editable);
  }

  private syncMarkers() {
    const pointIds = new Set<string>(), vertexIds = new Set<string>();
    let stationNumber = 0;
    for (const feature of this.options.geometry.features) {
      if (feature.kind === 'point') {
        pointIds.add(feature.id);
        let entry = this.points.get(feature.id);
        if (!entry) { entry = this.createMarker({ id: feature.id }, feature.coordinate); this.points.set(feature.id, entry); }
        if (this.drag?.entry !== entry) entry.marker.setLngLat(toLngLat(feature.coordinate));
        const station = feature.role === 'station';
        const anchor = Object.hasOwn(this.options.anchors, feature.id) ? this.options.anchors[feature.id] : undefined;
        const number = station ? ++stationNumber : null;
        this.styleMarker(entry,
          `${station ? `Station ${number}` : 'Point'}: ${feature.label} · ${feature.id}${anchor ? ` · anchored to ${anchor}` : ''}`,
          `${feature.label}${anchor ? ` · ${anchor}` : ''}`, station ? String(number) : 'P', Boolean(anchor));
      } else if (this.options.mode === 'edit' || this.options.mode === 'line') {
        feature.coordinates.forEach((coordinate, vertex) => {
          const key = JSON.stringify([feature.id, vertex]);
          vertexIds.add(key);
          let entry = this.vertices.get(key);
          if (!entry) { entry = this.createMarker({ id: feature.id, vertex }, coordinate); this.vertices.set(key, entry); }
          if (this.drag?.entry !== entry) entry.marker.setLngLat(toLngLat(coordinate));
          this.styleMarker(entry, `${feature.label} · vertex ${vertex + 1} · ${feature.id}`, '', '', false);
        });
      }
    }
    for (const [id, entry] of this.points) if (!pointIds.has(id)) { entry.remove(); this.points.delete(id); }
    for (const [id, entry] of this.vertices) if (!vertexIds.has(id)) { entry.remove(); this.vertices.delete(id); }
  }

  update(options: PlotMapOptions) {
    if (this.disposed) return;
    const previous = this.previous;
    this.options = options;
    const cancelledDrag = this.drag !== null && (!options.active || options.mode !== 'edit' || options.geometry !== this.drag.geometry);
    if (cancelledDrag) this.drag = null;
    if (!options.active) {
      this.clearMarkers();
    } else if (!previous?.active || previous.geometry !== options.geometry || previous.mode !== options.mode
      || previous.anchors !== options.anchors || previous.selection?.id !== options.selection?.id
      || previous.selection?.vertex !== options.selection?.vertex) this.syncMarkers();
    if (!previous || cancelledDrag || previous.active !== options.active || previous.geometry !== options.geometry
      || previous.selection?.id !== options.selection?.id) this.drawLines();
    this.previous = options;
  }

  /** Parent decides click priority; this controller never registers a map click handler. */
  pickLine(point: { x: number; y: number }): { id: string } | null {
    if (this.disposed || !this.options.active || !this.map.getLayer(this.lineId)) return null;
    const hits = this.map.queryRenderedFeatures([[point.x - 6, point.y - 6], [point.x + 6, point.y + 6]], { layers: [this.lineId] });
    for (const hit of hits) {
      const id = hit.properties?.id;
      if (typeof id === 'string' && this.options.geometry.features.some((feature) => feature.kind === 'line' && feature.id === id)) return { id };
    }
    return null;
  }

  private clearMarkers() {
    this.drag = null;
    for (const entry of this.points.values()) entry.remove();
    for (const entry of this.vertices.values()) entry.remove();
    this.points.clear(); this.vertices.clear();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.map.off('style.load', this.install);
    this.clearMarkers();
    for (const id of [this.lineId, this.haloId]) if (this.map.getLayer(id)) this.map.removeLayer(id);
    if (this.map.getSource(this.sourceId)) this.map.removeSource(this.sourceId);
  }
}
