import type { MrtIntervention } from '../scenario.ts';
import type { JourneyPair } from '../simulation.ts';

// Neither the locations nor timetable describe an approved/planned Singapore line.
export const illustrativeLine: MrtIntervention = {
  schemaVersion: 1, id: 'HYP_NORTH_LINK', name: 'Illustrative North Link (hypothetical)', direction: 'bidirectional',
  waitingTimeSeconds: 150,
  stations: [
    { kind: 'existing', stationId: 'NS4', transferWalkSeconds: 180 },
    { kind: 'new', id: 'HYP_WEST', name: 'Illustrative West', lat: 1.3800, lon: 103.7900,
      locationNote: 'Illustrative WGS84 point only; no surveyed site, catchment, alignment or buildability assessment.' },
    { kind: 'new', id: 'HYP_CENTRAL', name: 'Illustrative Central', lat: 1.3850, lon: 103.8450,
      locationNote: 'Illustrative WGS84 point only; no surveyed site, catchment, alignment or buildability assessment.' },
    { kind: 'existing', stationId: 'NE16', transferWalkSeconds: 240 },
  ],
  segments: [
    { from: 'NS4', to: 'HYP_WEST', runSeconds: 300, dwellSeconds: 30 },
    { from: 'HYP_WEST', to: 'HYP_CENTRAL', runSeconds: 360, dwellSeconds: 30 },
    { from: 'HYP_CENTRAL', to: 'NE16', runSeconds: 300, dwellSeconds: 30 },
  ],
  assumptions: {
    timingBasis: 'explicit-seconds', opening: 'assumed-open-on-service-date', construction: 'not-modelled',
    rationale: 'Illustrative symmetric 5/6/5-minute running segments, each with 30-second origin dwell, and 150-second fixed boarding wait. Explicit sensitivity inputs, not values derived from distance, operating speeds, measured frequencies or actual timetables.',
  },
};
export const illustrativeJourneys: JourneyPair[] = [
  { origin: 'NS4', destination: 'NE16' },
  { origin: 'NE16', destination: 'NS4' },
  { origin: 'BP2', destination: 'SE1' },
  { origin: 'EW1', destination: 'EW3' },
  { origin: 'HYP_WEST', destination: 'NE16' },
  { origin: 'NS4', destination: 'NS4' },
];
