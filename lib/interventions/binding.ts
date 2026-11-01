/** Immutable accepted hybrid inputs. Browser replay uses frozen proofs and SHA-256; no catalogue lookup or IO. */
import { assertJsonData, canonical, digest, ensure, freezeSnapshot, hash, object, text } from '../experiments/validation.ts';
import { isPlotPosition, parseScenarioGeometry } from '../plots/geometry.ts';
import type { PlotLine, PlotPoint, PlotPosition, ScenarioGeometry } from '../plots/geometry.ts';
import { buildPlottedMrt } from '../plots/adapters.ts';
import { draftToIntervention } from '../editor.ts';
import type { MrtIntervention } from '../../prototype/mrt/scenario.ts';
import type { HybridContext, HybridIntent, HybridIntentWire } from './hybrid.ts';
import {parseAcceptedHandoff,validateAcceptedHandoff,type AcceptedHandoff} from './handoff-contract.ts';

export const HYBRID_BINDING_LIMITS = Object.freeze({ bytes: 40_000, anchors: 40, reservedIds: 1100, seconds: 86_400 });
export interface HybridBindingV1 {
  version: 1; policy: 'hybrid-citizen-explore-v1'; fingerprint: string;
  question: string; geometry: ScenarioGeometry; revision: number; anchors: Record<string, string>;
  intent: HybridIntentWire; intervention: MrtIntervention | null;
  catalogue: { serviceDate: string; fingerprint: string; reservedIds: string[];
    anchorStations: { id: string; lat: number; lon: number; lines: string[] }[] };
  contextBindingKey: string; scenarioFingerprint: string;
  provenance: { classificationSource: HybridIntent['classificationSource']; geometrySource: 'deterministic-geometry';
    adapter: 'buildPlottedMrt/draftToIntervention-v1' | 'none' };
}
export interface HybridBindingV2 extends Omit<HybridBindingV1,'version'> {version:2;interpretation:AcceptedHandoff}
export type HybridBinding=HybridBindingV1|HybridBindingV2;
function originalBinding(value:HybridBindingV2):HybridBindingV1 {
  const {interpretation,...body}=value;
  return {...body,version:1,fingerprint:interpretation.legacyFingerprint};
}
const types = ['new_mrt_line', 'new_mrt_station', 'new_polyclinic', 'new_eldercare', 'new_school', 'new_community_centre', 'context-only'];
const enginePattern = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/u;
function id(value: unknown): string {
  const parsed = text(value, 128);
  ensure(parsed === parsed.trim() && !/[\u0000-\u001f\u007f]/u.test(parsed), 'Hybrid binding identifier');
  return parsed;
}
function engineId(value: unknown): string { const parsed = id(value); ensure(enginePattern.test(parsed), 'Hybrid binding engine identifier'); return parsed; }
function ids(value: unknown, maximum: number, engine = false): string[] {
  ensure(Array.isArray(value) && value.length <= maximum, 'Hybrid binding bounded ID array');
  const parsed = value.map(engine ? engineId : id);
  ensure(new Set(parsed).size === parsed.length, 'Hybrid binding duplicate ID'); return parsed;
}
function date(value: unknown): string {
  const parsed = text(value, 10), d = new Date(`${parsed}T00:00:00Z`);
  ensure(/^\d{4}-\d{2}-\d{2}$/u.test(parsed) && Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === parsed, 'Hybrid binding service date');
  return parsed;
}
function seconds(value: unknown, positive = false): number {
  ensure(typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= HYBRID_BINDING_LIMITS.seconds && (!positive || value > 0), 'Hybrid binding bounded timing seconds');
  return value;
}
function wire(value: unknown, contextKey: string): HybridIntentWire {
  const r = object(value, ['version', 'bindingKey', 'type', 'routeId', 'stationPointIds', 'sitePointIds', 'clarification']);
  ensure(r.version === 'hybrid-map-v1' && r.bindingKey === contextKey && types.includes(r.type as string), 'Hybrid binding accepted intent');
  const stationPointIds = ids(r.stationPointIds, 40), sitePointIds = ids(r.sitePointIds, 100);
  const routeId = r.routeId === null ? null : id(r.routeId);
  ensure(r.clarification === null, 'Hybrid binding unresolved clarification');
  if (r.type === 'new_mrt_line') ensure(routeId !== null && stationPointIds.length >= 2 && sitePointIds.length === 0, 'Hybrid binding MRT station selection');
  else ensure(routeId === null && stationPointIds.length === 0 && (r.type === 'context-only' || sitePointIds.length > 0), 'Hybrid binding independent site selection');
  return { version: 'hybrid-map-v1', bindingKey: contextKey, type: r.type as HybridIntentWire['type'], routeId, stationPointIds, sitePointIds, clarification: null };
}
const radians = Math.PI / 180, radius = 6_371_008.8;
function groundDistance(a: PlotPosition, b: PlotPosition): number {
  const la = a.lat * radians, lb = b.lat * radians;
  const h = Math.sin((lb - la) / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin((b.lon - a.lon) * radians / 2) ** 2;
  return radius * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
/** Recheck the accepted dot projection using original alignment order; vertices never create stops. */
function orderedPoints(route: PlotLine, points: PlotPoint[]): string[] {
  ensure(route.coordinates.length >= 2, 'Hybrid binding incomplete route');
  const attached: { point: PlotPoint; along: number }[] = [];
  for (const point of points) {
    let along = 0;
    const projections: { distance: number; along: number }[] = [];
    for (let i = 1; i < route.coordinates.length; i++) {
      const a = route.coordinates[i - 1], b = route.coordinates[i];
      const sx = radius * radians * Math.cos((a.lat + b.lat + point.coordinate.lat) / 3 * radians), sy = radius * radians;
      const bx = (b.lon - a.lon) * sx, by = (b.lat - a.lat) * sy;
      const px = (point.coordinate.lon - a.lon) * sx, py = (point.coordinate.lat - a.lat) * sy;
      const length = Math.hypot(bx, by), t = length === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / (length * length)));
      if (length > 0.001) projections.push({ distance: Math.hypot(px - t * bx, py - t * by), along: along + t * length });
      along += groundDistance(a, b);
    }
    projections.sort((a, b) => a.distance - b.distance || a.along - b.along);
    const first = projections[0];
    if (!first || first.distance > 25) continue;
    ensure(!projections.some(p => p.distance <= first.distance + 0.1 && Math.abs(p.along - first.along) > 1), 'Hybrid binding ambiguous station projection');
    attached.push({ point, along: first.along });
  }
  attached.sort((a, b) => a.along - b.along || a.point.id.localeCompare(b.point.id));
  for (let i = 0; i < attached.length; i++) for (let j = i + 1; j < attached.length; j++) {
    ensure(Math.abs(attached[i].along - attached[j].along) > 1 && groundDistance(attached[i].point.coordinate, attached[j].point.coordinate) > 1,
      'Hybrid binding coincident station points');
  }
  return attached.map(a => a.point.id);
}
/** Mirrors the adapter namespace rule only; this creates no service records, stations or network edges. */
function generatedId(kind: 'LINE' | 'STATION', source: string, reserved: Set<string>): string {
  let value = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) value = Math.imul(value ^ source.charCodeAt(i), 0x01000193);
  const stem = source.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 34);
  const base = `PLOT_${kind}_${stem}_${(value >>> 0).toString(16).padStart(8, '0')}`;
  let candidate = base, suffix = 1;
  while (reserved.has(candidate)) { const end = `_${suffix++}`; candidate = `${base.slice(0, 64 - end.length)}${end}`; }
  reserved.add(candidate); return candidate;
}
function validateIntervention(value: unknown, intent: HybridIntentWire, geometry: ScenarioGeometry, anchors: Record<string, string>, reservedIds: string[]): void {
  if (value === null) {
    ensure(intent.type !== 'new_mrt_line' || !intent.stationPointIds.some(point => Object.hasOwn(anchors, point)), 'Hybrid binding connected MRT requires accepted intervention');
    return;
  }
  ensure(intent.type === 'new_mrt_line' && intent.routeId !== null, 'Hybrid binding facility cannot carry MRT intervention');
  const r = object(value, ['schemaVersion', 'id', 'name', 'direction', 'stations', 'segments', 'waitingTimeSeconds', 'assumptions']);
  ensure(r.schemaVersion === 1 && r.direction === 'bidirectional', 'Hybrid binding MRT version');
  seconds(r.waitingTimeSeconds);
  const route = geometry.features.find(f => f.id === intent.routeId)! as PlotLine;
  const points = new Map(geometry.features.filter((f): f is PlotPoint => f.kind === 'point').map(p => [p.id, p]));
  const reserved = new Set(reservedIds), expectedLineId = generatedId('LINE', route.id, reserved);
  ensure(r.id === expectedLineId && r.name === route.label, 'Hybrid binding deterministic adapter line identity');
  ensure(Array.isArray(r.stations) && r.stations.length === intent.stationPointIds.length, 'Hybrid binding MRT stations');
  const stationIds: string[] = [], transfers: number[] = [];
  for (const [index, value] of r.stations.entries()) {
    const point = points.get(intent.stationPointIds[index])!, stationId = Object.hasOwn(anchors, point.id) ? anchors[point.id] : undefined;
    if (stationId !== undefined) {
      const stop = object(value, ['kind', 'stationId', 'transferWalkSeconds']);
      ensure(stop.kind === 'existing' && stop.stationId === stationId, 'Hybrid binding exact explicit station anchor');
      transfers.push(seconds(stop.transferWalkSeconds)); stationIds.push(stationId);
    } else {
      const stop = object(value, ['kind', 'id', 'name', 'lat', 'lon', 'locationNote']);
      const expected = generatedId('STATION', point.id, reserved);
      ensure(stop.kind === 'new' && stop.id === expected && stop.name === point.label && stop.lat === point.coordinate.lat && stop.lon === point.coordinate.lon,
        'Hybrid binding plotted station coordinate or identity mismatch');
      text(stop.locationNote, 2000); stationIds.push(expected);
    }
  }
  ensure(transfers.length > 0 && transfers.every(value => value === transfers[0]), 'Hybrid binding unresolved connection or non-adapter interchange timing');
  ensure(Array.isArray(r.segments) && r.segments.length === stationIds.length - 1, 'Hybrid binding ordered segments');
  let prior: { run: number; dwell: number } | null = null;
  for (const [index, value] of r.segments.entries()) {
    const segment = object(value, ['from', 'to', 'runSeconds', 'dwellSeconds']);
    const run = seconds(segment.runSeconds, true), dwell = seconds(segment.dwellSeconds);
    ensure(segment.from === stationIds[index] && segment.to === stationIds[index + 1], 'Hybrid binding disconnected or reordered segment');
    ensure(!prior || prior.run === run && prior.dwell === dwell, 'Hybrid binding non-adapter segment timing'); prior = { run, dwell };
  }
  const assumptions = object(r.assumptions, ['timingBasis', 'opening', 'construction', 'rationale']);
  ensure(assumptions.timingBasis === 'explicit-seconds' && assumptions.opening === 'assumed-open-on-service-date' && assumptions.construction === 'not-modelled', 'Hybrid binding MRT assumptions');
  text(assumptions.rationale, 2000);
}

/** Strict, detached and immutable replay shape. Async validateHybridBinding additionally checks the full content SHA. */
export function parseHybridBinding(value: unknown): HybridBinding {
  assertJsonData(value);
  ensure(new TextEncoder().encode(canonical(value)).length <= HYBRID_BINDING_LIMITS.bytes, 'Hybrid binding exceeds bounded 40000 bytes');
  if ((value as {version?:unknown})?.version === 2) {
    const r=object(value,['version','policy','fingerprint','question','geometry','revision','anchors','intent','intervention','catalogue','contextBindingKey','scenarioFingerprint','provenance','interpretation']);
    const proof=object(r.interpretation,['legacyFingerprint','context','result','source','generation']);hash(proof.legacyFingerprint,'');
    const legacy=parseHybridBinding(originalBinding(value as HybridBindingV2));
    ensure(legacy.version===1,'HYBRID_HANDOFF_LEGACY');parseAcceptedHandoff(r.interpretation,legacy);
    hash(r.fingerprint,'');return freezeSnapshot(value as HybridBindingV2);
  }
  const r = object(value, ['version', 'policy', 'fingerprint', 'question', 'geometry', 'revision', 'anchors', 'intent', 'intervention', 'catalogue',
    'contextBindingKey', 'scenarioFingerprint', 'provenance']);
  ensure(r.version === 1 && r.policy === 'hybrid-citizen-explore-v1', 'Hybrid binding policy');
  hash(r.fingerprint, ''); hash(r.scenarioFingerprint, ''); const contextKey = hash(r.contextBindingKey, '');
  text(r.question, 4000);
  ensure(Number.isSafeInteger(r.revision) && (r.revision as number) >= 0, 'Hybrid binding revision');
  const geometry = parseScenarioGeometry(r.geometry); id(geometry.scenarioId); geometry.features.forEach(feature => id(feature.id));
  const intent = wire(r.intent, contextKey), points = geometry.features.filter((f): f is PlotPoint => f.kind === 'point');
  const pointIndex = new Map(points.map(point => [point.id, point]));
  ensure(intent.sitePointIds.every(point => pointIndex.has(point)), 'Hybrid binding unknown site ID');
  if (intent.type === 'new_mrt_line') {
    const route = geometry.features.find(f => f.id === intent.routeId);
    ensure(route?.kind === 'line', 'Hybrid binding unknown route ID');
    ensure(canonical(intent.stationPointIds) === canonical(orderedPoints(route, points)), 'Hybrid binding stale or unordered station point IDs');
  }
  const catalogue = object(r.catalogue, ['serviceDate', 'fingerprint', 'reservedIds', 'anchorStations']);
  date(catalogue.serviceDate); hash(catalogue.fingerprint, '');
  const reservedIds = ids(catalogue.reservedIds, HYBRID_BINDING_LIMITS.reservedIds, true);
  ensure(canonical(reservedIds) === canonical([...reservedIds].sort()), 'Hybrid binding reserved namespace order');
  ensure(Array.isArray(catalogue.anchorStations) && catalogue.anchorStations.length <= HYBRID_BINDING_LIMITS.anchors, 'Hybrid binding anchor proof bound');
  const proofs = new Map<string, { lat: number; lon: number; lines: string[] }>();
  for (const value of catalogue.anchorStations) {
    const station = object(value, ['id', 'lat', 'lon', 'lines']), stationId = engineId(station.id), lines = ids(station.lines, 100, true);
    ensure(!proofs.has(stationId) && reservedIds.includes(stationId) && isPlotPosition({ lat: station.lat, lon: station.lon })
      && lines.length > 0 && lines.every(line => reservedIds.includes(line)), 'Hybrid binding invalid served catalogue anchor proof');
    proofs.set(stationId, { lat: station.lat as number, lon: station.lon as number, lines });
  }
  ensure(r.anchors !== null && typeof r.anchors === 'object' && !Array.isArray(r.anchors), 'Hybrid binding explicit anchors');
  const anchorKeys = Object.keys(r.anchors); ensure(anchorKeys.length <= HYBRID_BINDING_LIMITS.anchors, 'Hybrid binding anchor bound');
  const anchors = object(r.anchors, anchorKeys) as Record<string, string>, used = new Set<string>();
  for (const pointId of anchorKeys) {
    id(pointId); const stationId = engineId(anchors[pointId]), point = pointIndex.get(pointId), proof = proofs.get(stationId);
    ensure(point && proof && !used.has(stationId), 'Hybrid binding missing or duplicate anchor proof');
    ensure(Math.abs(point.coordinate.lat - proof.lat) <= 1e-10 && Math.abs(point.coordinate.lon - proof.lon) <= 1e-10, 'Hybrid binding anchor coordinate mismatch');
    used.add(stationId);
  }
  ensure(used.size === proofs.size, 'Hybrid binding unreferenced anchor proof');
  validateIntervention(r.intervention, intent, geometry, anchors, reservedIds);
  const provenance = object(r.provenance, ['classificationSource', 'geometrySource', 'adapter']);
  ensure(['explicit-question', 'model-inference', 'context-only'].includes(provenance.classificationSource as string)
    && provenance.geometrySource === 'deterministic-geometry' && provenance.adapter === (r.intervention === null ? 'none' : 'buildPlottedMrt/draftToIntervention-v1'),
    'Hybrid binding accepted result provenance');
  return freezeSnapshot(value as HybridBindingV1);
}

const rawSha = async (value: string): Promise<string> => [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(byte => byte.toString(16).padStart(2, '0')).join('');
/** Call at the trusted admission/persistence boundary. A digest is identity/integrity, not a server signature. */
export async function validateHybridBinding(value: unknown): Promise<HybridBinding> {
  const accepted = parseHybridBinding(value), { fingerprint, ...body } = accepted;
  ensure(fingerprint === await digest('', body), 'Hybrid binding SHA digest mismatch');
  if(accepted.version===2){await validateHybridBinding(originalBinding(accepted));await validateAcceptedHandoff(accepted.interpretation);}
  return accepted;
}

/** Creation rechecks the actual supplied catalogue and exact existing adapter result; replay never reloads either. */
export async function createHybridBinding(context: HybridContext, intent: HybridIntent, intervention: MrtIntervention | null, scenarioFingerprint: string): Promise<HybridBindingV1> {
  hash(scenarioFingerprint, '');
  const contextKey = await rawSha(JSON.stringify([context.version, context.question, context.revision, context.geometry, context.anchors, context.catalog]));
  ensure(context.version === 'hybrid-map-v1' && context.bindingKey === contextKey && intent.bindingKey === contextKey, 'Hybrid binding stale original context or intent');
  const selected: HybridIntentWire = { version: intent.version, bindingKey: intent.bindingKey, type: intent.type, routeId: intent.routeId,
    stationPointIds: [...intent.stationPointIds], sitePointIds: [...intent.sitePointIds], clarification: intent.clarification };
  if (intervention !== null) {
    ensure(selected.type === 'new_mrt_line' && selected.routeId !== null && intervention.segments.length > 0, 'Hybrid binding MRT intervention required');
    const first = intervention.segments[0], existing = intervention.stations.find(station => station.kind === 'existing');
    ensure(existing?.kind === 'existing' && intervention.waitingTimeSeconds !== undefined, 'Hybrid binding explicit MRT connection and timing');
    const expected = draftToIntervention(buildPlottedMrt(context.geometry, { routeId: selected.routeId, pointIds: selected.stationPointIds,
      anchors: Object.fromEntries(Object.entries(context.anchors).filter(([pointId]) => selected.stationPointIds.includes(pointId))),
      geometryConfirmed: true, assumptionsConfirmed: true, runSeconds: first.runSeconds, dwellSeconds: first.dwellSeconds,
      waitingTimeSeconds: intervention.waitingTimeSeconds, transferWalkSeconds: existing.transferWalkSeconds }, context.catalog));
    ensure(canonical(intervention) === canonical(expected), 'Hybrid binding intervention differs from deterministic validated plot adapter');
  }
  const catalogue = { serviceDate: context.catalog.serviceDate, fingerprint: await digest('', context.catalog),
    reservedIds: [...new Set([...context.catalog.stations.map(s => s.id), ...context.catalog.lines.map(line => line.id)])].sort(),
    anchorStations: Object.values(context.anchors).map(stationId => {
      const station = context.catalog.stations.find(s => s.id === stationId);
      ensure(station && station.kind !== 'hypothetical' && station.lines.length > 0, 'Hybrid binding existing served anchor required');
      return { id: station.id, lat: station.lat, lon: station.lon, lines: [...station.lines] };
    }) };
  const body = { version: 1 as const, policy: 'hybrid-citizen-explore-v1' as const, question: context.question, geometry: context.geometry,
    revision: context.revision, anchors: context.anchors, intent: selected, intervention, catalogue, contextBindingKey: contextKey,
    scenarioFingerprint, provenance: { classificationSource: intent.classificationSource, geometrySource: 'deterministic-geometry' as const,
      adapter: intervention === null ? 'none' as const : 'buildPlottedMrt/draftToIntervention-v1' as const } };
  return await validateHybridBinding({ ...body, fingerprint: await digest('', body) }) as HybridBindingV1;
}

export async function createHandoffBinding(legacy:HybridBindingV1,interpretation:Omit<AcceptedHandoff,'legacyFingerprint'>):Promise<HybridBindingV2>{
  const {fingerprint,...body}=legacy;
  const next={...body,version:2 as const,interpretation:{...interpretation,legacyFingerprint:fingerprint}};
  return await validateHybridBinding({...next,fingerprint:await digest('',next)}) as HybridBindingV2;
}
