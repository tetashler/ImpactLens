import { fixture } from './fixtures.ts';
import { parseCsv } from '../csv.ts';
import { buildGraph } from '../graph.ts';
import type { MrtIntervention } from '../scenario.ts';

export function baselineFixture() {
  const feed = fixture();
  feed.tables.trips.push(...parseCsv('trip_id,route_id,service_id\nRETURN,B,WD').rows);
  feed.tables.stop_times.push(...parseCsv('trip_id,arrival_time,departure_time,stop_id,stop_sequence\nRETURN,5:00:00,5:00:00,Y_A,1\nRETURN,5:01:00,5:01:00,BP1_A,2').rows);
  return buildGraph(feed, { date: '2026-10-27' });
}
export function proposalFixture(): MrtIntervention {
  return {
    schemaVersion: 1, id: 'HYP_TEST', name: 'Illustrative test line', direction: 'bidirectional', waitingTimeSeconds: 30,
    stations: [
      { kind: 'existing', stationId: 'NS4', transferWalkSeconds: 10 },
      { kind: 'new', id: 'HYP_M', name: 'Illustrative midpoint', lat: 1.39, lon: 103.77, locationNote: 'Hand-calculated fixture only' },
      { kind: 'existing', stationId: 'X', transferWalkSeconds: 20 },
    ],
    segments: [{ from: 'NS4', to: 'HYP_M', runSeconds: 20, dwellSeconds: 5 }, { from: 'HYP_M', to: 'X', runSeconds: 30, dwellSeconds: 5 }],
    assumptions: { timingBasis: 'explicit-seconds', opening: 'assumed-open-on-service-date', construction: 'not-modelled', rationale: 'Small fixture with independently calculated costs, not a Singapore train proposal.' },
  };
}
