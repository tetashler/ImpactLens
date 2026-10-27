/** Entirely invented contract examples, never Singapore government observations. */
import type { CitizenSimulationPayload, CitizenProfileResponse, CitizenJourneyComparison } from './citizen-simulation.ts';

const assumptions: CitizenSimulationPayload['assumptions'] = [
  {id:'fixture-demographics', kind:'population', description:'Invented counts/categories for contract examples only; not Census observations.'},
  {id:'assigned-od', kind:'journey-assignment', description:'Illustrative station endpoints; not observed commuting behaviour.'},
  {id:'static-routing', kind:'routing', description:'Invented example durations, not a router execution or calibrated timetable.'},
  {id:'schematic-map', kind:'visualisation', description:'Illustrative straight station connections; no physical walking or railway alignment.'},
  {id:'grouping', kind:'aggregation', description:'Hand-calculated fixture weights; finite comparable journeys only in mean savings.'},
];
const id = (n: number) => `syn-0123456789abcdef-${n}`;
const compared: CitizenJourneyComparison = {
  origin:'NS4', destination:'NE16', status:'compared', baselineStatus:'reachable', scenarioStatus:'reachable',
  baselineMinutes:30, scenarioMinutes:20, minutesSaved:10, percentageChange:-100/3,
  baselineTransfers:2, scenarioTransfers:0, transferChange:-2, usedProposedLine:true,
};
export const illustrativeCitizenSimulation: CitizenSimulationPayload = {
  schemaVersion:1,
  metadata: {
    scenarioId:'illustrative-citizen-scenario', intervention:{id:'ILLUSTRATIVE_LINE', type:'mrt-line'},
    simulationDate:'2026-10-27', demographicReferenceYear:2020,
    coverage:{planningAreas:['ang-mo-kio']}, assumptionIds:assumptions.map(a=>a.id), resultKind:'illustrative',
    population:{seed:'illustrative-only', method:'minimum-one-largest-remainder-v1', agentCount:4, representedPopulation:200},
  },
  sources:[{
    id:'fixture', kind:'synthetic-fixture', datasetId:'illustrative-citizen-fixture', agency:'ImpactLens invented fixture',
    referenceYear:2020, updated:'2026-10-27', sourceUrl:'https://example.invalid/illustrative-fixture',
    licenceUrl:'https://example.invalid/illustrative-fixture/licence', rawSha256:'0'.repeat(64), assumptionIds:['fixture-demographics'],
  }],
  assumptions,
  citizens:[100,50,20,30].map((weight,i)=>({
    agentId:id(i+1), synthetic:true, weight, sourceId:'fixture', sourceRow:i+2,
    demographic:{planningArea:'ang-mo-kio', planningAreaName:'Ang Mo Kio', subzone:'cheng-san', subzoneName:'Cheng San', ageGroup:'65_69', sex:i%2 ? 'female' : 'male'},
  })),
  journeys:[
    {id:'journey-improved', agentId:id(1), assignment:'hypothetical', assumptionIds:['assigned-od','static-routing'], comparison:compared},
    {id:'journey-unchanged', agentId:id(2), assignment:'hypothetical', assumptionIds:['assigned-od','static-routing'], comparison:{...compared, origin:'EW1', destination:'EW3', baselineMinutes:10, scenarioMinutes:10, minutesSaved:0, percentageChange:0, baselineTransfers:0, transferChange:0, usedProposedLine:false}},
    {id:'journey-unassigned', agentId:id(3), assignment:'unassigned', assumptionIds:[], comparison:null},
    {id:'journey-unreachable', agentId:id(4), assignment:'hypothetical', assumptionIds:['assigned-od','static-routing'], comparison:{...compared, status:'unreachable', baselineStatus:'unreachable', scenarioStatus:'unreachable', baselineMinutes:null, scenarioMinutes:null, minutesSaved:null, percentageChange:null, baselineTransfers:null, scenarioTransfers:null, transferChange:null, usedProposedLine:null}},
  ],
  animations:[{
    agentId:id(1), position:{lat:1.38,lon:103.8}, waypoints:[{lat:1.38,lon:103.8},{lat:1.39,lon:103.85}],
    state:'travelling', journeyId:'journey-improved', visualisation:{kind:'visual-only', geometry:'schematic', assumptionIds:['schematic-map']},
  }],
  metrics:[{
    id:'illustrative-older-residents', group:{ageGroup:'65_69',planningArea:'ang-mo-kio'}, sourceId:'fixture', basis:'illustrative',
    assumptionIds:['assigned-od','static-routing','grouping'], denominator:{agentCount:4,representedPopulation:200},
    outcomes:{
      unassigned:{agents:1,representedPopulation:20}, compared:{agents:2,representedPopulation:150},
      'newly-reachable':{agents:0,representedPopulation:0}, unreachable:{agents:1,representedPopulation:30}, invalid:{agents:0,representedPopulation:0},
    }, validJourneyAgents:2, weightedBenefitingPopulation:100, weightedMeanMinutesSaved:1000/150,
  }],
};
export const illustrativeCitizenProfile: CitizenProfileResponse = {
  schemaVersion:1, metadata:illustrativeCitizenSimulation.metadata, sources:illustrativeCitizenSimulation.sources, assumptions,
  citizen:illustrativeCitizenSimulation.citizens[0], journey:illustrativeCitizenSimulation.journeys[0], animation:illustrativeCitizenSimulation.animations[0],
  activity:{status:'hypothetical', assumptionIds:['assigned-od'], description:'Invented trip for the contract demonstration only.', destinationCategories:['illustrative-activity'], transportPreferences:['mrt']},
};
