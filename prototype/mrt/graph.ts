import { activeServices, parseTime } from './gtfs.ts';
import type { Feed } from './gtfs.ts';
import type { SourceRow } from './csv.ts';
import { INTERCHANGES, SUSPECT_PAIRS } from './policy.ts';

export interface Station {
  id: string; name: string; lat: number; lon: number;
  parentIds: string[]; stopIds: string[]; sourceRows: number[]; evidence: string[]; lines: string[];
}
export interface State { id: string; stationId: string; line: string }
// Physical line numbers (header is line 1), not array indices.
export type SourceRef = [tripId: string, tripsRow: number, fromStopTimesRow: number, toStopTimesRow: number];
export interface Edge {
  id: string; from: string; to: string; kind: 'travel' | 'transfer';
  seconds: number; runSeconds: number; dwellSeconds: number;
  sourceRefs: SourceRef[]; evidence: string[];
}
export interface Issue { trip: SourceRow; stopTimes: SourceRow[]; reasons: string[]; pairs: { from: string; to: string; fromRow: number; toRow: number }[] }
export interface Options { date: string; mode?: 'raw' | 'baseline'; transferWalkSeconds?: number; waitSeconds?: number; initialWaitSeconds?: number }
export interface Graph {
  date: string; mode: 'raw' | 'baseline';
  costs: { transferWalkSeconds: number; waitSeconds: number; initialWaitSeconds: number };
  stations: Map<string, Station>; states: Map<string, State>; aliases: Map<string, string>;
  edges: Edge[]; adjacency: Map<string, Edge[]>;
  audit: { activeServices: string[]; activeTripCount: number; usedTripCount: number; quarantined: Issue[]; invalid: Issue[] };
}
function index(rows: SourceRow[], key: string): Map<string, SourceRow> {
  const result = new Map<string, SourceRow>();
  for (const row of rows) {
    const id = row.values[key];
    if (!id || result.has(id)) throw new Error(`Missing or duplicate ${key} at row ${row.row}`);
    result.set(id, row);
  }
  return result;
}

export function buildGraph(feed: Feed, options: Options): Graph {
  const mode = options.mode ?? 'baseline';
  if (!['raw', 'baseline'].includes(mode)) throw new Error('Unknown graph mode');
  const costs = { transferWalkSeconds: options.transferWalkSeconds ?? 180, waitSeconds: options.waitSeconds ?? 120, initialWaitSeconds: options.initialWaitSeconds ?? 120 };
  for (const [key, value] of Object.entries(costs)) if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid cost: ${key}`);
  const services = activeServices(feed.tables.calendar, feed.tables.calendar_dates, options.date);
  if (!services.size) throw new Error(`No active service on ${options.date}`);
  const stops = index(feed.tables.stops, 'stop_id'), routes = index(feed.tables.routes, 'route_id');
  const trips = index(feed.tables.trips, 'trip_id'), agencies = index(feed.tables.agency, 'agency_id');
  index(feed.tables.calendar, 'service_id');
  const definedServices = new Set([...feed.tables.calendar, ...feed.tables.calendar_dates].map(r => r.values.service_id));
  for (const agency of agencies.values()) if (agency.values.agency_timezone !== 'Asia/Singapore') throw new Error('Only Asia/Singapore feeds supported');
  for (const route of routes.values()) {
    if (!agencies.has(route.values.agency_id) || !route.values.route_short_name || !['0', '1'].includes(route.values.route_type)) throw new Error(`Invalid rail route at row ${route.row}`);
  }
  const aliases = new Map<string, string>(), stations = new Map<string, Station>();
  for (const [id, row] of stops) {
    const r = row.values, lat = Number(r.stop_lat), lon = Number(r.stop_lon);
    if (!r.stop_name || !r.stop_lat || !r.stop_lon || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error(`Invalid stop ${id}`);
    if (!['0', '1', '2'].includes(r.location_type)) throw new Error(`Unsupported stop type: ${id}`);
    if (r.location_type === '1') {
      if (r.parent_station) throw new Error(`Station has parent: ${id}`);
      aliases.set(id, id);
    } else if (stops.get(r.parent_station)?.values.location_type !== '1') throw new Error(`Invalid station parent: ${id}`);
  }
  if (mode === 'baseline') for (const rule of INTERCHANGES) {
    if (!aliases.has(rule.alias)) continue;
    if (!aliases.has(rule.canonical) || stops.get(rule.alias)!.values.stop_name !== rule.name || stops.get(rule.canonical)!.values.stop_name !== rule.name) throw new Error(`Interchange evidence mismatch: ${rule.alias}`);
    aliases.set(rule.alias, rule.canonical);
  }
  for (const [parentId, canonical] of aliases) {
    if (!stations.has(canonical)) {
      const r = stops.get(canonical)!.values;
      stations.set(canonical, { id: canonical, name: r.stop_name, lat: Number(r.stop_lat), lon: Number(r.stop_lon), parentIds: [], stopIds: [], sourceRows: [], evidence: [], lines: [] });
    }
    const station = stations.get(canonical)!;
    station.parentIds.push(parentId); station.sourceRows.push(stops.get(parentId)!.row);
    if (parentId !== canonical) station.evidence.push(INTERCHANGES.find(r => r.alias === parentId)!.source);
  }
  for (const [id, row] of stops) if (row.values.location_type !== '1') stations.get(aliases.get(row.values.parent_station)!)!.stopIds.push(id);
  const states = new Map<string, State>(), edges: Edge[] = [], adjacency = new Map<string, Edge[]>();
  const graph: Graph = { date: options.date, mode, costs, stations, states, aliases, edges, adjacency,
    audit: { activeServices: [...services], activeTripCount: 0, usedTripCount: 0, quarantined: [], invalid: [] } };
  const byTrip = new Map<string, SourceRow[]>();
  for (const row of feed.tables.stop_times) {
    if (!trips.has(row.values.trip_id)) throw new Error(`Orphan stop_times trip at row ${row.row}`);
    const group = byTrip.get(row.values.trip_id) ?? [];
    group.push(row); byTrip.set(row.values.trip_id, group);
  }
  const state = (stationId: string, line: string) => {
    const id = `${stationId}|${line}`;
    if (!states.has(id)) {
      states.set(id, { id, stationId, line });
      stations.get(stationId)!.lines.push(line);
    }
    return id;
  };
  type Observation = { seconds: number; run: number; dwell: number; ref: SourceRef };
  const observations = new Map<string, { from: string; to: string; samples: Observation[] }>();
  for (const [tripId, trip] of trips) {
    const t = trip.values, rows = [...(byTrip.get(tripId) ?? [])];
    const active = services.has(t.service_id);
    if (active) graph.audit.activeTripCount++;
    const reasons: string[] = [], pairs: Issue['pairs'] = [];
    if (!routes.has(t.route_id)) reasons.push('Missing route reference');
    if (!definedServices.has(t.service_id)) reasons.push('Missing service reference');
    if (rows.length < 2) reasons.push('Fewer than two stop times');
    const parsed: { row: SourceRow; sequence: number; arrival: number; departure: number; parent: string }[] = [];
    for (const row of rows) {
      try {
        const r = row.values, stop = stops.get(r.stop_id);
        if (!stop || stop.values.location_type !== '0') throw new Error('Missing or non-platform stop');
        if (!/^\d+$/.test(r.stop_sequence) || !Number.isSafeInteger(Number(r.stop_sequence))) throw new Error('Invalid stop sequence');
        const arrival = parseTime(r.arrival_time), departure = parseTime(r.departure_time);
        if (departure < arrival) throw new Error('Departure before arrival');
        parsed.push({ row, sequence: Number(r.stop_sequence), arrival, departure, parent: stop.values.parent_station });
      } catch (error) { reasons.push(`stop_times.txt:${row.row}: ${(error as Error).message}`); }
    }
    parsed.sort((a, b) => a.sequence - b.sequence);
    for (let i = 1; i < parsed.length; i++) {
      const a = parsed[i - 1], b = parsed[i];
      if (a.sequence === b.sequence) reasons.push(`Duplicate stop sequence ${a.sequence}`);
      if (b.arrival <= a.departure) reasons.push(`Nonpositive run time at rows ${a.row.row}/${b.row.row}`);
      const rule = SUSPECT_PAIRS.find(r => r.from === a.parent && r.to === b.parent);
      if (rule) pairs.push({ from: a.parent, to: b.parent, fromRow: a.row.row, toRow: b.row.row });
    }
    if (reasons.length) { graph.audit.invalid.push({ trip, stopTimes: rows, reasons, pairs }); continue; }
    if (pairs.length) {
      graph.audit.quarantined.push({ trip, stopTimes: rows, reasons: pairs.map(pair => SUSPECT_PAIRS.find(r => r.from === pair.from && r.to === pair.to)!.reason), pairs });
      if (mode === 'baseline') continue;
    }
    if (!active) continue;
    graph.audit.usedTripCount++;
    const line = routes.get(t.route_id)!.values.route_short_name;
    for (let i = 1; i < parsed.length; i++) {
      const a = parsed[i - 1], b = parsed[i];
      const from = state(aliases.get(a.parent)!, line), to = state(aliases.get(b.parent)!, line);
      if (from === to) continue; // Dwell at one physical station, not a transport connection.
      const key = `${from}>${to}`, group = observations.get(key) ?? { from, to, samples: [] };
      group.samples.push({ seconds: b.arrival - a.arrival, run: b.arrival - a.departure, dwell: a.departure - a.arrival, ref: [tripId, trip.row, a.row.row, b.row.row] });
      observations.set(key, group);
    }
  }
  const add = (edge: Edge) => {
    edges.push(edge); const outgoing = adjacency.get(edge.from) ?? [];
    outgoing.push(edge); adjacency.set(edge.from, outgoing);
  };
  for (const [key, { from, to, samples }] of observations) {
    const sorted = [...samples].sort((a, b) => a.seconds - b.seconds);
    const low = sorted[Math.floor((sorted.length - 1) / 2)], high = sorted[Math.floor(sorted.length / 2)];
    add({ id: `ride:${key}`, from, to, kind: 'travel', seconds: (low.seconds + high.seconds) / 2,
      runSeconds: (low.run + high.run) / 2, dwellSeconds: (low.dwell + high.dwell) / 2,
      sourceRefs: samples.map(s => s.ref), evidence: ['GTFS consecutive arrival times; median over active accepted trips'] });
  }
  if (mode === 'baseline') for (const station of stations.values()) {
    station.lines.sort();
    for (const fromLine of station.lines) for (const toLine of station.lines) {
      if (fromLine === toLine) continue;
      const from = `${station.id}|${fromLine}`, to = `${station.id}|${toLine}`;
      add({ id: `transfer:${from}>${to}`, from, to, kind: 'transfer', seconds: costs.transferWalkSeconds + costs.waitSeconds,
        runSeconds: 0, dwellSeconds: 0, sourceRefs: [],
        evidence: [...station.evidence, `GTFS shared station hierarchy: stops.txt lines ${station.sourceRows.join(',')}`, 'Unmeasured transfer walk and reboarding wait; configurable assumptions'] });
    }
  }
  return graph;
}
