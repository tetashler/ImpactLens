import type { Feature, FeatureCollection, LineString, Point } from 'geojson';

export type PlotPosition = { lat: number; lon: number };
export type PlotPointRole = 'unassigned' | 'station' | 'site';
export type PlotPoint = {
  kind: 'point'; id: string; label: string; coordinate: PlotPosition;
  role: PlotPointRole; provenance: 'user-drawn';
};
export type PlotLine = {
  kind: 'line'; id: string; label: string; coordinates: PlotPosition[]; provenance: 'user-drawn';
};
export type PlotFeature = PlotPoint | PlotLine;
export type ScenarioGeometry = { version: 1; scenarioId: string; features: PlotFeature[] };

export const PLOT_LIMITS = Object.freeze({
  minLat: 1.15, maxLat: 1.5, minLon: 103.6, maxLon: 104.1,
  maxFeatures: 100, maxVerticesPerLine: 200, maxTotalVertices: 1_000,
  maxLabelLength: 120, maxIdLength: 128, historySize: 50,
});

function record(value: unknown, fields: readonly string[], name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object`);
  const object = value as Record<string, unknown>;
  if (Object.keys(object).some((key) => !fields.includes(key))) throw new Error(`${name} contains an unknown field`);
  return object;
}

function text(value: unknown, maximum: number, name: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw new Error(`${name} must contain 1–${maximum} characters`);
  return value;
}

function position(value: unknown): PlotPosition {
  const object = record(value, ['lat', 'lon'], 'Coordinate');
  const { lat, lon } = object;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)
    || lat < PLOT_LIMITS.minLat || lat > PLOT_LIMITS.maxLat || lon < PLOT_LIMITS.minLon || lon > PLOT_LIMITS.maxLon)
    throw new Error('Coordinate must be within Singapore plotting bounds');
  return { lat, lon };
}

export function isPlotPosition(value: unknown): value is PlotPosition {
  try { position(value); return true; } catch { return false; }
}

/** Validates the browser-owned plot contract and returns values detached from its input. */
export function parseScenarioGeometry(value: unknown): ScenarioGeometry {
  const object = record(value, ['version', 'scenarioId', 'features'], 'Scenario geometry');
  if (object.version !== 1) throw new Error('Unsupported scenario geometry version');
  const scenarioId = text(object.scenarioId, PLOT_LIMITS.maxIdLength, 'Scenario ID');
  if (!Array.isArray(object.features) || object.features.length > PLOT_LIMITS.maxFeatures) throw new Error(`Use at most ${PLOT_LIMITS.maxFeatures} plot features`);
  const ids = new Set<string>();
  let vertexCount = 0;
  const features = Array.from(object.features, (value): PlotFeature => {
    const base = record(value, ['kind', 'id', 'label', 'coordinate', 'coordinates', 'role', 'provenance'], 'Feature');
    const id = text(base.id, PLOT_LIMITS.maxIdLength, 'Feature ID');
    if (ids.has(id)) throw new Error('Feature IDs must be unique');
    ids.add(id);
    const label = text(base.label, PLOT_LIMITS.maxLabelLength, 'Feature label');
    if (base.provenance !== 'user-drawn') throw new Error('Plot provenance must be user-drawn');
    if (base.kind === 'point') {
      record(base, ['kind', 'id', 'label', 'coordinate', 'role', 'provenance'], 'Point');
      if (base.role !== 'unassigned' && base.role !== 'station' && base.role !== 'site') throw new Error('Unsupported point role');
      vertexCount++;
      return { kind: 'point', id, label, coordinate: position(base.coordinate), role: base.role, provenance: 'user-drawn' };
    }
    if (base.kind === 'line') {
      record(base, ['kind', 'id', 'label', 'coordinates', 'provenance'], 'Line');
      if (!Array.isArray(base.coordinates) || base.coordinates.length < 1 || base.coordinates.length > PLOT_LIMITS.maxVerticesPerLine)
        throw new Error(`A line requires 1–${PLOT_LIMITS.maxVerticesPerLine} vertices`);
      vertexCount += base.coordinates.length;
      return { kind: 'line', id, label, coordinates: Array.from(base.coordinates, position), provenance: 'user-drawn' };
    }
    throw new Error('Unsupported plot feature kind');
  });
  if (vertexCount > PLOT_LIMITS.maxTotalVertices) throw new Error(`Use at most ${PLOT_LIMITS.maxTotalVertices} total plot vertices`);
  return { version: 1, scenarioId, features };
}

/** Full canonical serialization; identity is not a hash or a security boundary. */
export function geometryKey(geometry: ScenarioGeometry): string {
  return JSON.stringify(parseScenarioGeometry(geometry));
}

/** One-vertex drafts stay in the contract but cannot form a rendered LineString. */
export function geometryGeoJSON(geometry: ScenarioGeometry): FeatureCollection<Point | LineString> {
  const parsed = parseScenarioGeometry(geometry);
  return {
    type: 'FeatureCollection',
    features: parsed.features.flatMap<Feature<Point | LineString>>((feature) => {
      const properties = { id: feature.id, kind: feature.kind, label: feature.label, provenance: feature.provenance,
        ...(feature.kind === 'point' ? { role: feature.role } : {}) };
      if (feature.kind === 'point') return [{ type: 'Feature' as const, id: feature.id, properties,
        geometry: { type: 'Point' as const, coordinates: [feature.coordinate.lon, feature.coordinate.lat] } }];
      if (feature.coordinates.length < 2) return [];
      return [{ type: 'Feature' as const, id: feature.id, properties,
        geometry: { type: 'LineString' as const, coordinates: feature.coordinates.map(({ lat, lon }) => [lon, lat]) } }];
    }),
  };
}
