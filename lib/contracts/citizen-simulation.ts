/** Browser-safe v1 exchange contract. No citizen behaviour is an observed record. */
import type { AgeGroup, Provenance, SyntheticCitizen, SyntheticPopulation, AssumedProperties } from '../../prototype/agents/types.ts';
import type { CompactComparison, MapStation } from '../map-contract.ts';

export const CITIZEN_SIMULATION_SCHEMA_VERSION = 1 as const;
export type { AgeGroup };
/** Named WGS84 degrees; convert to MapLibre/GeoJSON as [lon, lat]. */
export type Wgs84Position = Pick<MapStation, 'lat' | 'lon'>;
export interface ModellingAssumption {
  id: string;
  kind: 'population' | 'journey-assignment' | 'routing' | 'visualisation' | 'aggregation';
  description: string;
}
/** Deduplicated aggregate input provenance, never individual observed behaviour. */
export interface PopulationSource extends Provenance { id: string }
export interface GeographicCoverage {
  planningAreas: string[];
  /** Omit for all subzones in the selected areas; pairs avoid ambiguous labels. */
  subzones?: { planningArea: string; subzone: string }[];
}
export interface SimulationMetadata {
  scenarioId: string;
  intervention: { id: string; type: 'mrt-line' | 'eldercare-centre' | 'active-ageing-centre' };
  simulationDate: string;
  demographicReferenceYear: number;
  coverage: GeographicCoverage;
  assumptionIds: string[];
  /** Aggregate sources may be observed; synthetic results cannot be observed. */
  resultKind: 'modelled' | 'illustrative';
  population: {
    seed: string;
    method: SyntheticPopulation['method'];
    agentCount: number;
    representedPopulation: number;
  };
}
export interface CitizenReference {
  agentId: SyntheticCitizen['id'];
  synthetic: true;
  /** Source-derived categories assigned to a synthetic representative, not a person. */
  demographic: SyntheticCitizen['observed'];
  weight: SyntheticCitizen['weight'];
  sourceId: string;
  sourceRow: number;
}
/** Existing compact MRT semantics, without duplicating route arrays or raw graphs. */
export type CitizenJourneyComparison = Pick<CompactComparison,
  'origin' | 'destination' | 'status' | 'baselineStatus' | 'scenarioStatus' |
  'baselineMinutes' | 'scenarioMinutes' | 'minutesSaved' | 'percentageChange' |
  'baselineTransfers' | 'scenarioTransfers' | 'transferChange' | 'usedProposedLine'>;
export type CitizenJourneyOutcome = { id: string; agentId: string } & (
  | { assignment: 'unassigned'; assumptionIds: []; comparison: null }
  | { assignment: 'hypothetical'; assumptionIds: string[]; comparison: CitizenJourneyComparison }
);
export interface CitizenAnimation {
  agentId: string;
  position: Wgs84Position | null;
  waypoints: Wgs84Position[];
  state: 'unassigned' | 'idle' | 'walking' | 'travelling';
  journeyId: string | null;
  visualisation: {
    kind: 'visual-only';
    /** No claim to pedestrian, road or rail geometry is supported in v1. */
    geometry: 'none' | 'schematic';
    assumptionIds: string[];
  };
}
export type CitizenCalculationStatus = 'unassigned' | CitizenJourneyComparison['status'];
export interface WeightedCount { agents: number; representedPopulation: number }
export interface DemographicImpactMetric {
  id: string;
  /** Independent filters; groups may overlap. Empty object means full coverage. */
  group: { ageGroup?: AgeGroup; sex?: SyntheticCitizen['observed']['sex']; planningArea?: string; subzone?: string };
  sourceId: string;
  basis: 'modelled' | 'illustrative';
  assumptionIds: string[];
  denominator: { agentCount: number; representedPopulation: number };
  /** Partitions the full group, NOT the render sample. Accessible scenario = compared + newly-reachable. */
  outcomes: Record<CitizenCalculationStatus, WeightedCount>;
  validJourneyAgents: number; // outcomes.compared.agents: both journeys finite
  weightedBenefitingPopulation: number; // compared agents with minutesSaved > 0 only
  weightedMeanMinutesSaved: number | null; // compared weighted denominator; baseline - scenario
  sensitivity?: { description: string; assumptionIds: string[] }; // not a statistical confidence interval
}
export interface CitizenSimulationContext {
  schemaVersion: typeof CITIZEN_SIMULATION_SCHEMA_VERSION;
  metadata: SimulationMetadata;
  sources: PopulationSource[];
  assumptions: ModellingAssumption[];
}
export interface CitizenSimulationPayload extends CitizenSimulationContext {
  /** A subset for inspection/rendering; never use this array as a metrics denominator. */
  citizens: CitizenReference[];
  journeys: CitizenJourneyOutcome[];
  animations: CitizenAnimation[];
  metrics: DemographicImpactMetric[];
}
export interface CitizenActivity extends Pick<AssumedProperties, 'status' | 'assumptionIds'> {
  description: string | null;
  destinationCategories: string[];
  transportPreferences: string[];
}
/** Same data for profile inspection and future grounded Gemini input; not a real person. */
export interface CitizenProfileResponse extends CitizenSimulationContext {
  citizen: CitizenReference;
  activity: CitizenActivity;
  journey: CitizenJourneyOutcome | null;
  animation: CitizenAnimation | null;
}

export { parseCitizenSimulation, assertCitizenSimulation, parseCitizenProfile, assertCitizenProfile } from './citizen-simulation-validation.ts';
