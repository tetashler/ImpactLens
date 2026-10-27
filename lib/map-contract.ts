/** Browser-safe map DTOs. Coordinates are schematic station connections, not rail alignments. */
export interface MapStation {
  id: string; name: string; lat: number; lon: number; lines: string[];
  kind?: 'existing' | 'hypothetical';
}
export interface NetworkCatalog {
  serviceDate: string;
  stations: MapStation[];
  lines: { id: string; name: string; color: string }[];
  connections: { from: string; to: string; line: string }[];
  quarantinedTrips: number;
}
export interface CompactRoute { stationIds: string[]; lines: string[]; coordinates: [number, number][] }
export type RouteStatus = 'reachable' | 'unreachable' | 'station-unavailable' | 'invalid';
export interface CompactComparison {
  origin: string; destination: string;
  status: 'compared' | 'newly-reachable' | 'unreachable' | 'invalid';
  baselineMinutes: number | null; scenarioMinutes: number | null;
  minutesSaved: number | null; percentageChange: number | null;
  usedProposedLine: boolean | null;
  baselineTransfers: number | null; scenarioTransfers: number | null; transferChange: number | null;
  baselineStatus: RouteStatus; scenarioStatus: RouteStatus;
  baselineRoute: CompactRoute | null; scenarioRoute: CompactRoute | null;
}
export interface SimulationRequest {
  serviceDate: string; intervention: unknown; journeys: { origin: string; destination: string }[];
}
export interface SimulationResponse {
  serviceDate: string; model: 'static-median-travel-time'; comparisons: CompactComparison[];
}
