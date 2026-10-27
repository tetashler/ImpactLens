import type { Provenance, AgeGroup } from '../agents/types.ts';

export interface Position { lat:number; lon:number }
export type FacilityType='aac'|'aac-care'|'nursing-home'|'day-care'|'rehabilitation'|'unknown';
export interface FacilitySource {
  id:string; agency:string; url:string; catalogueUpdated:string; accessedDate:string; licenceUrl:string; scope:string;
}
export interface Corroboration {
  sourceFeatureId:string; expectedSourceName:string; postalCode:string; name:string; serviceType:Exclude<FacilityType,'unknown'>;
  listedAddress:string; evidenceUrl:string; checkedDate:string;
}
export interface Facility {
  id:string; sourceName:string; name:string; postalCode:string|null; address:string|null; position:Position;
  serviceType:FacilityType; capacity:null; openedOn:null;
  operationStatus:'listed-unconfirmed'|'historical-unknown'|'closed'; recordUpdated:string|null;
  sourceRecord:number; corroboration:Corroboration|null;
}
export interface FacilityCatalogue {
  schemaVersion:1; source:FacilitySource & {rawSha256:string}; facilities:Facility[];
  audit:{rawRecords:number; sourceCrs:string; excluded:{record:number;reason:string}[]; verificationConflicts:string[]; coLocatedGroups:string[][]; unknownClassifications:number; recordUpdateValues:string[]; missingPostalCodes:number; missingAddresses:number;unsupportedCapacityFields:string[]};
}
export interface EldercareIntervention {
  schemaVersion:1; id:string; name:string; serviceType:'aac'; status:'hypothetical'; position:Position;
  availability:'assumed-available'|'assumed-unavailable';
  capacity:{users:number;basis:'illustrative-assumption';rationale:string}|null;
  eligibility:'age-only-other-criteria-unknown'; rationale:string; assumptions:{id:string;description:string}[];
}
export interface OriginReference {
  id:string; planningArea:string; subzone:string; position:Position;
  provenance:{method:'explicit-geographic-proxy';description:string;sourceUrl:string;referenceDate:string;assumptionId:string};
}
export interface AccessibilityOptions {
  referenceDate:string; minimumAge:number; thresholdsMetres:number[];
  existingAvailability:'assume-listed-available'|'exclude-unconfirmed';
  eligibility:'age-only-other-criteria-unknown'; straightLineWalkingMetresPerSecond?:number;
}
export interface NearestFacility {facilityId:string;distanceMetres:number}
export interface OriginComparison {
  origin:OriginReference; status:'compared'|'baseline-unavailable'|'no-facilities';
  baseline:NearestFacility|null; scenario:NearestFacility|null; distanceToProposedMetres:number;
  reductionMetres:number|null; nearestChanged:boolean; distanceImproved:boolean|null;
  assumedStraightLineWalkingMinutes:{baseline:number|null;scenario:number|null}|null;
}
export interface WeightedMeasure {value:number|null;denominatorPopulation:number;denominator:string}
export interface WeightedShare extends WeightedMeasure {numeratorPopulation:number}
export interface EldercareMetric {
  group:{ageGroup?:AgeGroup;sex?:'male'|'female';planningArea?:string;subzone?:string};
  agentCount:number;population:number;locatedPopulation:number;unlocatedPopulation:number;comparablePopulation:number;
  existingFacilityPopulation:number;scenarioFacilityPopulation:number;baselineUnavailablePopulation:number;
  closerPopulation:number;noImprovementPopulation:number;
  meanBaselineMetres:WeightedMeasure;meanScenarioMetres:WeightedMeasure;meanReductionMetres:WeightedMeasure;
  thresholds:{metres:number;baselinePopulation:number;scenarioPopulation:number;newlyWithinPopulation:number;scenarioAccessWithoutBaselinePopulation:number;baselineShare:WeightedShare;scenarioShare:WeightedShare;pairedBaselineShare:WeightedShare;pairedScenarioShare:WeightedShare;changePercentagePoints:number|null}[];
}
export interface EldercareResponse {
  schemaVersion:1; engineVersion:'aac-haversine-v1';resultKind:'illustrative-geographic-accessibility';scenarioId:string;
  intervention:EldercareIntervention;options:AccessibilityOptions;
  provenance:{facilitySource:FacilityCatalogue['source'];corroborations:Corroboration[];population:Provenance;populationSeed:string;populationMethod:string;inputAgentCount:number;representedPopulation:number;originReferences:OriginReference[];distanceMethod:'WGS84-haversine-metres';coverage:'limited-corroborated-subset-not-complete';eligibility:'age-target-only-not-confirmed-service-eligibility'};
  baselineFacilities:Facility[]; comparisons:OriginComparison[];metrics:EldercareMetric[];
  unlocatedGeographies:{planningArea:string;subzone:string;agents:number;population:number}[];
  capacity:{existingTotal:null;existingUnknownCount:number;proposedAssumedUsers:number|null;serviceAllocation:'not-modelled'};
  diagnostics:{inputFacilities:number;compatibleFacilities:number;excludedByType:number;excludedByAvailability:number;ageIneligibleAgents:number;ageIneligiblePopulation:number;distanceCalculations:number};
}
