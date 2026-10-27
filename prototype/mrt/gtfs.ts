import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { parseCsv } from './csv.ts';
import type { SourceRow } from './csv.ts';

export const TABLES = ['agency', 'stops', 'routes', 'trips', 'stop_times', 'calendar', 'calendar_dates', 'feed_info'] as const;
export type Table = typeof TABLES[number];
export interface Feed { tables: Record<Table, SourceRow[]>; hashes: Record<string, string>; root: string }

export function parseTime(value: string): number {
  if (!/^\d+:\d{2}:\d{2}$/.test(value)) throw new Error(`Invalid GTFS time: ${value}`);
  const [h, m, s] = value.split(':').map(Number);
  if (!Number.isSafeInteger(h * 3600) || m > 59 || s > 59) throw new Error(`Invalid GTFS time: ${value}`);
  return h * 3600 + m * 60 + s;
}
function dateValue(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid date: ${value}`);
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`Invalid date: ${value}`);
  return date;
}
function compactDate(value: string): string {
  if (!/^\d{8}$/.test(value)) throw new Error(`Invalid GTFS date: ${value}`);
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
  dateValue(iso); return iso;
}
export function activeServices(calendar: SourceRow[], exceptions: SourceRow[], date: string): Set<string> {
  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dateValue(date).getUTCDay()];
  const services = new Set<string>();
  for (const { values: r } of calendar) {
    const start = compactDate(r.start_date), end = compactDate(r.end_date);
    if (start > end) throw new Error(`Reversed calendar dates: ${r.service_id}`);
    for (const day of ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']) {
      if (!['0', '1'].includes(r[day])) throw new Error(`Invalid calendar day flag: ${r.service_id}`);
    }
    if (start <= date && date <= end && r[weekday] === '1') services.add(r.service_id);
  }
  const seen = new Set<string>();
  for (const { values: r } of exceptions) {
    const iso = compactDate(r.date), key = `${r.service_id}/${iso}`;
    if (seen.has(key) || !['1', '2'].includes(r.exception_type)) throw new Error(`Invalid calendar exception: ${key}`);
    seen.add(key);
    if (iso === date) {
      if (r.exception_type === '1') services.add(r.service_id);
      else services.delete(r.service_id);
    }
  }
  return services;
}

export function loadFeed(root: string): Feed {
  const tables = {} as Feed['tables'], hashes: Record<string, string> = {};
  const required: Record<Table, string[]> = {
    agency: ['agency_id', 'agency_name', 'agency_url', 'agency_timezone'],
    stops: ['stop_id', 'stop_name', 'stop_lat', 'stop_lon', 'location_type', 'parent_station'],
    routes: ['route_id', 'agency_id', 'route_short_name', 'route_type'],
    trips: ['trip_id', 'route_id', 'service_id'],
    stop_times: ['trip_id', 'stop_id', 'stop_sequence', 'arrival_time', 'departure_time'],
    calendar: ['service_id', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'start_date', 'end_date'],
    calendar_dates: ['service_id', 'date', 'exception_type'],
    feed_info: ['feed_publisher_name', 'feed_publisher_url', 'feed_lang'],
  };
  for (const table of TABLES) {
    const file = `${table}.txt`, bytes = readFileSync(join(root, file));
    hashes[file] = createHash('sha256').update(bytes).digest('hex');
    const parsed = parseCsv(bytes.toString('utf8'));
    for (const field of required[table]) if (!parsed.columns.includes(field)) throw new Error(`${file}: missing ${field}`);
    tables[table] = parsed.rows;
  }
  return { tables, hashes, root };
}
