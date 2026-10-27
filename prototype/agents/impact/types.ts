import type { AgeGroup, SyntheticCitizen } from '../types.ts';
import type { CitizenReference, CitizenJourneyOutcome, CitizenProfileResponse, CitizenSimulationPayload, DemographicImpactMetric } from '../../../lib/contracts/citizen-simulation.ts';
import type { JourneyPair } from '../../mrt/simulation.ts';

export type MetricGroup = DemographicImpactMetric['group'];
export type OriginMethod =
  | { method: 'explicit-stations'; rules: { planningArea: string; subzone?: string; stationId: string }[] }
  | { method: 'reference-point-nearest'; maxDistanceMetres: number; points: { planningArea: string; subzone: string; lat: number; lon: number; basis: string }[] };
export interface ImpactAssumptions {
  id: string; version: 1; description: string; referenceDate: string; seed: string;
  unassigned: 'retain-unknown';
  eligible?: { ageGroups?: AgeGroup[]; sexes?: SyntheticCitizen['observed']['sex'][]; planningAreas?: string[] };
  travel:
    | { method: 'explicit-od'; pairs: ({ agentId: string } & JourneyPair)[] }
    | { method: 'destination-distribution'; participationRate: number; origins: OriginMethod; destinations: { stationId: string; share: number }[] };
}
export interface AssignedJourney {
  agentId: string; pair: JourneyPair | null;
  reason: 'assigned' | 'ineligible' | 'not-specified' | 'not-participating' | 'missing-geography' | 'outside-catchment';
}
export interface PopulationShare {
  value: number | null; numeratorPopulation: number; denominatorPopulation: number;
  denominator: 'comparable-population' | 'assigned-noninvalid-population';
}
export interface ImpactMetric {
  group: MetricGroup;
  coverage: { agentCount: number; representedPopulation: number; assignedPopulation: number; comparablePopulation: number; unassignedPopulation: number; invalidPopulation: number; newlyReachablePopulation: number; unreachablePopulation: number };
  outcomes: DemographicImpactMetric['outcomes'];
  weightedBenefitingPopulation: number; benefiting: PopulationShare; unchanged: PopulationShare;
  weightedMeanMinutesSaved: number | null; weightedTotalMinutesSaved: number | null;
  weightedMeanTransferChange: number | null;
  accessibility: { thresholdMinutes: number; baseline: PopulationShare; scenario: PopulationShare; changePercentagePoints: number | null };
}
export interface ImpactOptions { assumptions: ImpactAssumptions; thresholdMinutes: number; renderLimit?: number }
export interface ImpactResult {
  payload: CitizenSimulationPayload; metrics: ImpactMetric[];
  distributionalDifferences: {group: MetricGroup; meanMinutesSavedDifferenceFromOverall: number | null; benefitingShareDifferencePercentagePoints: number | null; assessment: 'unknown' | 'no-comparable-benefit' | 'some-comparable-benefit' | 'all-comparable-benefit'}[];
  diagnostics: { uniqueOdPairs: number; routingCalls: number; assignmentsByReason: Record<AssignedJourney['reason'], { agents: number; population: number }> };
  getProfile(agentId: string): CitizenProfileResponse | null;
}
export type { CitizenReference, CitizenJourneyOutcome };
