import type { AGE_GROUPS } from './prepare.ts';
import type { JourneyComparison } from '../mrt/simulation.ts';

export type AgeGroup = typeof AGE_GROUPS[number];
export interface SourceMetadata {
  kind: 'government-statistics' | 'synthetic-fixture';
  datasetId: string; agency: string; referenceYear: number; updated: string;
  sourceUrl: string; licenceUrl: string;
}
export interface Provenance extends SourceMetadata {
  rawSha256: string; assumptionIds: string[];
}
export interface DemographicCell {
  planningArea: string; planningAreaName: string; subzone: string; subzoneName: string;
  ageGroup: AgeGroup; sex: 'male' | 'female'; count: number; sourceRow: number;
}
export interface TotalDiscrepancy {
  row: number; column: string; published: number; calculated: number; difference: number; tolerance: number;
}
export interface DemographicDistribution {
  schemaVersion: 1; source: Provenance; cells: DemographicCell[]; population: number;
  audit: {
    rawRows: number; columns: string[]; planningAreas: number; subzones: number;
    nilOrNegligibleCells: number; missingValues: number; zeroJointCells: number;
    publishedNationalTotal: number; discrepancies: TotalDiscrepancy[];
  };
}
export interface AssumedProperties {
  status: 'unassigned' | 'hypothetical'; assumptionIds: string[];
  mobility?: { description: string; walkingMetresPerSecond?: number };
  destinationCategories?: string[]; transportPreferences?: string[];
  startingLocation?: { lat: number; lon: number; basis: string };
}
export interface SyntheticCitizen {
  id: string; synthetic: true; weight: number;
  observed: Omit<DemographicCell, 'count' | 'sourceRow'>;
  assumed: AssumedProperties;
  provenance: Provenance & { sourceRow: number };
}
export interface PopulationOptions { size: number; seed: string; planningAreas?: string[]; subzones?: string[] }
export interface SyntheticPopulation {
  schemaVersion: 1; seed: string; representedPopulation: number; source: Provenance;
  method: 'minimum-one-largest-remainder-v1'; citizens: SyntheticCitizen[];
}
// Assignments must be justified by a future geographic/activity model, not inferred demand.
export interface AgentAccessibility {
  agentId: string; assumptionIds: string[];
  origin: { stationId?: string; catchmentId?: string };
  destination: { stationId?: string; activityCategory?: string };
  journey?: JourneyComparison; // Includes both outcomes, minutesSaved and all unreachable statuses.
  accessibilityChange?: { metric: string; baseline: number; scenario: number; unit: string; method: string };
}
export interface RenderAgent {
  agentId: string; origin: { planningArea: string; subzone: string };
  demographic: { ageGroup: AgeGroup; sex: 'male' | 'female' }; weight: number;
  displayLocation?: { lat: number; lon: number; assumptionId: string };
  movementState?: 'idle' | 'walking' | 'travelling'; destinationReference?: string;
}
