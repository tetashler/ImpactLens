/** Browser-only input adapters. Geometry supplies intent; the existing engines own calculation. */
import type { EditorDraft } from '../editor.ts';
import type { MapStation, NetworkCatalog } from '../map-contract.ts';
import { buildAacRequest } from '../eldercare/editor.ts';
import type { AacDraft } from '../eldercare/editor.ts';
import { parseEldercareApiRequest } from '../eldercare/api-contract.ts';
import type { EldercareApiRequest } from '../eldercare/api-contract.ts';
import { isPlotPosition, parseScenarioGeometry } from './geometry.ts';
import type { PlotPoint, PlotPosition, ScenarioGeometry } from './geometry.ts';

export interface MrtPlotSettings {
  /** Selected drawn line. Its vertices describe a visual alignment, not station locations. */
  routeId: string;
  /** Explicit station order, independent of the number or ordering of line vertices. */
  pointIds: string[];
  /** An explicit point-to-existing-station connection; proximity never creates one. */
  anchors: Record<string, string>;
  geometryConfirmed: boolean;
  assumptionsConfirmed: boolean;
  runSeconds: number;
  dwellSeconds: number;
  waitingTimeSeconds: number;
  transferWalkSeconds: number;
}

const ENGINE_ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const EARTH_RADIUS_METRES = 6_371_008.8;
const ANCHOR_COORDINATE_TOLERANCE = 1e-10;

function seconds(value: number, name: string, positive = false): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (positive && value === 0))
    throw new Error(`${name} must be finite ${positive ? 'positive' : 'nonnegative'} seconds`);
}

function catalogueIndex(catalog: NetworkCatalog): { stations: Map<string, MapStation>; reserved: Set<string> } {
  if (!catalog || !Array.isArray(catalog.stations) || !Array.isArray(catalog.lines)) throw new Error('A valid network catalogue is required');
  const stations = new Map<string, MapStation>(), lines = new Set<string>();
  for (const line of catalog.lines) {
    if (!line || typeof line.id !== 'string' || !ENGINE_ID.test(line.id) || lines.has(line.id)) throw new Error('Invalid or duplicate catalogue line ID');
    lines.add(line.id);
  }
  for (const station of catalog.stations) {
    if (!station || typeof station.id !== 'string' || !ENGINE_ID.test(station.id) || stations.has(station.id)
      || !isPlotPosition({ lat: station.lat, lon: station.lon }) || !Array.isArray(station.lines)) throw new Error('Invalid or duplicate catalogue station');
    if (station.lines.some(line => typeof line !== 'string' || !lines.has(line))) throw new Error('Catalogue station references an unknown service line');
    stations.set(station.id, station);
  }
  return { stations, reserved: new Set([...stations.keys(), ...lines]) };
}

/** A compact deterministic stem plus collision checks keeps arbitrary plot IDs out of the engine namespace. */
function engineIdentifier(kind: 'LINE' | 'STATION', source: string, reserved: Set<string>): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 0x01000193);
  const stem = source.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 34);
  const base = `PLOT_${kind}_${stem}_${(hash >>> 0).toString(16).padStart(8, '0')}`;
  let candidate = base, suffix = 1;
  while (reserved.has(candidate)) {
    const ending = `_${suffix++}`;
    candidate = `${base.slice(0, 64 - ending.length)}${ending}`;
  }
  reserved.add(candidate);
  return candidate;
}

/**
 * Confirmed selected dots become stations. Point roles remain a visual authoring aid.
 * Timing is supplied in seconds: line distance, curvature and vertex count never set it.
 * The caller can pass this draft through the unchanged draftToIntervention adapter.
 */
export function buildPlottedMrt(geometry: ScenarioGeometry, settings: MrtPlotSettings, catalog: NetworkCatalog): EditorDraft {
  const parsed = parseScenarioGeometry(geometry);
  if (!settings || settings.geometryConfirmed !== true || settings.assumptionsConfirmed !== true)
    throw new Error('Confirm the ordered station geometry and illustrative timing assumptions before running MRT analysis');
  const route = parsed.features.find(feature => feature.id === settings.routeId);
  if (!route || route.kind !== 'line' || route.coordinates.length < 2) throw new Error('Choose a drawn route line with at least two vertices');
  if (!Array.isArray(settings.pointIds) || settings.pointIds.length < 2 || settings.pointIds.length > 40)
    throw new Error('Choose 2–40 station points in an explicit order');
  if (new Set(settings.pointIds).size !== settings.pointIds.length) throw new Error('Station point IDs must be unique');
  if (!settings.anchors || typeof settings.anchors !== 'object' || Array.isArray(settings.anchors)) throw new Error('Explicit station anchors are required');
  seconds(settings.runSeconds, 'Running time', true);
  seconds(settings.dwellSeconds, 'Dwell time');
  seconds(settings.waitingTimeSeconds, 'Waiting time');
  seconds(settings.transferWalkSeconds, 'Interchange walking time');
  if (!Number.isFinite(settings.runSeconds + settings.dwellSeconds)) throw new Error('Combined running and dwell time must be finite');
  if (!Number.isFinite(settings.waitingTimeSeconds + settings.transferWalkSeconds)) throw new Error('Combined interchange walking and waiting time must be finite');
  const points = new Map(parsed.features.filter((feature): feature is PlotPoint => feature.kind === 'point').map(point => [point.id, point]));
  for (const id of settings.pointIds) if (typeof id !== 'string' || !points.has(id)) throw new Error('Every ordered station must reference a drawn point');
  const { stations: existing, reserved } = catalogueIndex(catalog);
  const anchors = new Map(Object.entries(settings.anchors));
  if (!anchors.size) throw new Error('Disconnected proposal: explicitly anchor at least one point to a served existing station');
  const seenAnchors = new Set<string>();
  for (const [pointId, stationId] of anchors) {
    if (!settings.pointIds.includes(pointId)) throw new Error('Every anchor must reference a selected station point');
    const station = existing.get(stationId);
    if (!station || !station.lines.length || station.kind === 'hypothetical') throw new Error('An anchor must reference a served existing catalogue station');
    if (seenAnchors.has(stationId)) throw new Error('Duplicate existing station anchors are not allowed');
    seenAnchors.add(stationId);
    const position = points.get(pointId)!.coordinate;
    if (Math.abs(position.lat - station.lat) > ANCHOR_COORDINATE_TOLERANCE || Math.abs(position.lon - station.lon) > ANCHOR_COORDINATE_TOLERANCE)
      throw new Error('Explicitly snap the anchor point coordinate to its actual catalogue station position');
  }
  const id = engineIdentifier('LINE', route.id, reserved);
  return {
    id, name: route.label, waitingTimeSeconds: settings.waitingTimeSeconds,
    stations: settings.pointIds.map(pointId => {
      const point = points.get(pointId)!;
      const stationId = anchors.get(pointId);
      if (stationId !== undefined) return { key: point.id, kind: 'existing', stationId, transferWalkSeconds: settings.transferWalkSeconds };
      return {
        key: point.id, kind: 'new', id: engineIdentifier('STATION', point.id, reserved), name: point.label,
        lat: point.coordinate.lat, lon: point.coordinate.lon,
        locationNote: `Unsurveyed hypothetical station from user-drawn scenario ${JSON.stringify(parsed.scenarioId)}, route ${JSON.stringify(route.id)}, point ${JSON.stringify(point.id)}. Route curvature is visual only; station order and assumed running/dwell/walking/waiting seconds are explicitly confirmed, not inferred from distance.`,
      };
    }),
    segments: settings.pointIds.slice(1).map(() => ({ runSeconds: settings.runSeconds, dwellSeconds: settings.dwellSeconds })),
  };
}

function groundDistance(a: PlotPosition, b: PlotPosition): number {
  const radians = Math.PI / 180;
  const latA = a.lat * radians, latB = b.lat * radians;
  const haversine = Math.sin((latB - latA) / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin((b.lon - a.lon) * radians / 2) ** 2;
  return EARTH_RADIUS_METRES * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
}

/** Suggestions are informational; an explicit anchor and coordinate snap are still required. */
export function suggestedStations(point: PlotPoint | PlotPosition, catalog: NetworkCatalog, maxDistanceMetres = 1000, limit = 4): { station: MapStation; distanceMetres: number }[] {
  const position = point && 'coordinate' in point ? point.coordinate : point;
  if (!isPlotPosition(position)) throw new Error('Station suggestions need a valid Singapore point');
  if (typeof maxDistanceMetres !== 'number' || !Number.isFinite(maxDistanceMetres) || maxDistanceMetres < 0
    || !Number.isSafeInteger(limit) || limit < 0) throw new Error('Suggestion radius and limit must be finite nonnegative values');
  const { stations } = catalogueIndex(catalog);
  return [...stations.values()].filter(station => station.lines.length && station.kind !== 'hypothetical')
    .map(station => ({ station: { ...station, lines: [...station.lines] }, distanceMetres: groundDistance(position, station) }))
    .filter(suggestion => suggestion.distanceMetres <= maxDistanceMetres)
    .sort((a, b) => a.distanceMetres - b.distanceMetres || a.station.id.localeCompare(b.station.id))
    .slice(0, limit);
}

/** One explicit confirmed point feeds the existing AAC request builder; it does no engine work. */
export function buildPlottedAac(geometry: ScenarioGeometry, pointId: string, draft: AacDraft, token: string, confirmed: boolean): EldercareApiRequest {
  const parsed = parseScenarioGeometry(geometry);
  if (confirmed !== true) throw new Error('Confirm the selected plotted AAC site before running analysis');
  const point = parsed.features.find(feature => feature.id === pointId);
  if (!point || point.kind !== 'point') throw new Error('Choose one drawn point for the proposed AAC site');
  const request = buildAacRequest({ ...draft, position: { ...point.coordinate } }, token);
  request.intervention.rationale += ` Source: user-drawn scenario ${parsed.scenarioId}, point ${point.id}; explicitly confirmed hypothetical site.`;
  return parseEldercareApiRequest(request);
}
