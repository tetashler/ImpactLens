import type { MrtIntervention } from '../prototype/mrt/scenario.ts';

export type DraftStop =
  | { key: string; kind: 'existing'; stationId: string; transferWalkSeconds: number }
  | { key: string; kind: 'new'; id: string; name: string; lat: number; lon: number; locationNote: string };
export interface EditorDraft {
  id: string; name: string; waitingTimeSeconds: number; stations: DraftStop[];
  segments: { runSeconds: number; dwellSeconds: number }[];
}
export function toLngLat(point: { lat: number; lon: number }): [number, number] { return [point.lon, point.lat]; }
export function fromLngLat(point: readonly [number, number]): { lat: number; lon: number } { return { lat: point[1], lon: point[0] }; }
/** Preserve input costs so the engine can report invalid assumptions instead of silently changing them. */
export function draftToIntervention(draft: EditorDraft): MrtIntervention {
  const ids = draft.stations.map(stop => stop.kind === 'existing' ? stop.stationId : stop.id);
  return {
    schemaVersion: 1, id: draft.id, name: draft.name, direction: 'bidirectional', waitingTimeSeconds: draft.waitingTimeSeconds,
    stations: draft.stations.map(({ key: _key, ...stop }) => stop),
    segments: draft.segments.map((segment, index) => ({ from: ids[index], to: ids[index + 1], ...segment })),
    assumptions: {
      timingBasis: 'explicit-seconds', opening: 'assumed-open-on-service-date', construction: 'not-modelled',
      rationale: 'Illustrative map editor proposal with explicitly entered running, dwell, walking and waiting seconds.',
    },
  };
}
