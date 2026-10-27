import { createHash } from 'node:crypto';
import type { SyntheticPopulation } from '../types.ts';
import { AGE_GROUPS } from '../prepare.ts';
import type { Graph } from '../../mrt/graph.ts';
import { simulateIntervention } from '../../mrt/simulation.ts';
import { parseCitizenSimulation, parseCitizenProfile } from '../../../lib/contracts/citizen-simulation.ts';
import type { CitizenSimulationContext, CitizenSimulationPayload, CitizenJourneyComparison, CitizenReference, CitizenJourneyOutcome, ModellingAssumption } from '../../../lib/contracts/citizen-simulation.ts';
import { assignJourneys } from './assignment.ts';
import { aggregateImpact } from './metrics.ts';
import type { ImpactOptions, ImpactResult, MetricGroup } from './types.ts';

const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function runPopulationImpact(input: SyntheticPopulation, baseline: Graph, intervention: unknown, options: ImpactOptions): ImpactResult {
  if (!input || input.schemaVersion!==1 || !Array.isArray(input.citizens) || input.citizens.length===0) throw new Error('Empty or invalid population');
  if (!Number.isFinite(options.thresholdMinutes) || options.thresholdMinutes<0) throw new Error('Invalid accessibility threshold');
  const limit=options.renderLimit??150;
  if (!Number.isSafeInteger(limit) || limit<0) throw new Error('Invalid render limit');
  const population=structuredClone(input), c=structuredClone(options.assumptions);
  const identities=new Set<string>();
  let total=0;
  for (const p of population.citizens) {
    if (identities.has(p.id)) throw new Error('Duplicate synthetic agent identifier'); identities.add(p.id);
    if (!Number.isFinite(p.weight) || p.weight<=0) throw new Error('Invalid population weight');total+=p.weight;
    const {sourceRow:_row,...source}=p.provenance;
    const fields=Object.keys(source).sort();
    if (JSON.stringify(fields)!==JSON.stringify(Object.keys(population.source).sort()) || fields.some(key=>JSON.stringify(source[key as keyof typeof source])!==JSON.stringify(population.source[key as keyof typeof source]))) throw new Error('Citizen provenance differs from population source');
  }
  if (!Number.isFinite(total) || !Number.isFinite(population.representedPopulation) || Math.abs(total-population.representedPopulation)>1e-6+1e-9*Math.abs(total)) throw new Error('Population weights do not conserve represented population');
  const assignments=assignJourneys(population.citizens,baseline,c);
  // Validate even the non-rendered demographics before route work; all assignment assumptions are catalogued below.
  const sourceId='demographic-source';
  const citizens: CitizenReference[]=population.citizens.map(p=>({agentId:p.id,synthetic:p.synthetic,demographic:p.observed,weight:p.weight,sourceId,sourceRow:p.provenance.sourceRow}));
  const assignmentId=`${c.id}:assignment`, routingId=`${c.id}:routing`, aggregationId=`${c.id}:aggregation`;
  const assumptions: ModellingAssumption[]=population.source.assumptionIds.map(id=>({id,kind:'population',description:id==='nil-negligible-as-zero'?'Census nil/negligible markers approximated as zero. Rounded leaf total 4,047,260 differs from published 4,044,210 by 3,050; no renormalisation.':`Population source assumption ${id}; ${population.source.kind} from ${population.source.sourceUrl}.`}));
  assumptions.push(
    {id:assignmentId,kind:'journey-assignment',description:`Hypothetical trips, not observed commuters. Assumption set: ${JSON.stringify(c)}. Reference points represent geographic units, not homes; straight-line catchments do not establish walking access or station usage. One assumed trip per assigned representative; full weight is assigned as a unit.`},
    {id:routingId,kind:'routing',description:`Existing static-median MRT engine, baseline costs in seconds ${JSON.stringify(baseline.costs)}; intervention ${JSON.stringify(intervention)}. Additive alternatives only; crowding, service reductions, induced demand, access/egress, construction disruption and departure clock not modelled.`},
    {id:aggregationId,kind:'aggregation',description:`Full weighted population, not display subset. Savings and transfer means use compared population only. Accessibility is duration <= ${options.thresholdMinutes} minutes among assigned non-invalid outcomes; unreachable/unavailable is not accessible, invalid endpoints excluded. Unknown/unassigned savings remain null.`},
  );
  const zones=[...new Map(citizens.map(p=>[`${p.demographic.planningArea}/${p.demographic.subzone}`,{planningArea:p.demographic.planningArea,subzone:p.demographic.subzone}])).values()].sort((a,b)=>JSON.stringify(a)<JSON.stringify(b)?-1:1);
  const context: CitizenSimulationContext={schemaVersion:1,metadata:{scenarioId:`impact-${hash([population.seed,population.source, citizens,c,intervention,baseline.date,baseline.costs,baseline.edges.map(e=>[e.id,e.seconds]),options.thresholdMinutes]).slice(0,24)}`,
    intervention:{id:'pending',type:'mrt-line'},simulationDate:baseline.date,demographicReferenceYear:population.source.referenceYear,coverage:{planningAreas:[...new Set(zones.map(z=>z.planningArea))].sort(),subzones:zones},assumptionIds:assumptions.map(a=>a.id),resultKind:'illustrative',population:{seed:population.seed,method:population.method,agentCount:citizens.length,representedPopulation:population.representedPopulation}},sources:[{id:sourceId,...population.source}],assumptions};
  parseCitizenSimulation({...context,citizens,journeys:[],animations:[],metrics:[]});
  const pairs=[...new Map(assignments.filter(a=>a.pair!==null).map(a=>[JSON.stringify(a.pair),a.pair!])).values()];
  // Exactly one engine call. It constructs one scenario and routes each unique pair once per side.
  const simulation=simulateIntervention(baseline,intervention,pairs);
  context.metadata.intervention.id=simulation.scenario.intervention.id;
  const comparisons=new Map<string,CitizenJourneyComparison>();
  for (const raw of simulation.comparisons) {
    const {baseline:before,scenario:after,...scalars}=raw;
    comparisons.set(JSON.stringify({origin:raw.origin,destination:raw.destination}),{...scalars,baselineStatus:before.status,scenarioStatus:after.status});
    if (raw.status==='compared' && raw.minutesSaved! < -1e-9) throw new Error('Additive MRT scenario unexpectedly worsened a compared journey');
  }
  const journeys: CitizenJourneyOutcome[]=assignments.map((a,i)=>a.pair?{id:`journey-${i+1}`,agentId:a.agentId,assignment:'hypothetical',assumptionIds:[assignmentId,routingId],comparison:comparisons.get(JSON.stringify(a.pair))!}:{id:`journey-${i+1}`,agentId:a.agentId,assignment:'unassigned',assumptionIds:[],comparison:null});
  const groups: MetricGroup[]=[{},...AGE_GROUPS.map(ageGroup=>({ageGroup})),...(['male','female'] as const).map(sex=>({sex})),...context.metadata.coverage.planningAreas.map(planningArea=>({planningArea})),...zones];
  const metrics=groups.map(group=>aggregateImpact(citizens,journeys,group,options.thresholdMinutes));
  const overall=metrics[0];
  const distributionalDifferences: ImpactResult['distributionalDifferences']=metrics.slice(1).map(m=>({group:{...m.group},
    meanMinutesSavedDifferenceFromOverall:m.weightedMeanMinutesSaved!==null && overall.weightedMeanMinutesSaved!==null?m.weightedMeanMinutesSaved-overall.weightedMeanMinutesSaved:null,
    benefitingShareDifferencePercentagePoints:m.benefiting.value!==null && overall.benefiting.value!==null?100*(m.benefiting.value-overall.benefiting.value):null,
    assessment:m.benefiting.value===null?'unknown':m.weightedBenefitingPopulation===0?'no-comparable-benefit':m.weightedBenefitingPopulation===m.coverage.comparablePopulation?'all-comparable-benefit':'some-comparable-benefit'}));
  const full: CitizenSimulationPayload={...context,citizens,journeys,animations:[],metrics:metrics.map((m,i)=>({id:`impact-group-${i}`,group:m.group,sourceId,basis:context.metadata.resultKind,assumptionIds:[assignmentId,routingId,aggregationId],denominator:{agentCount:m.coverage.agentCount,representedPopulation:m.coverage.representedPopulation},outcomes:m.outcomes,validJourneyAgents:m.outcomes.compared.agents,weightedBenefitingPopulation:m.weightedBenefitingPopulation,weightedMeanMinutesSaved:m.weightedMeanMinutesSaved}))};
  parseCitizenSimulation(full);
  const byCitizen=new Map(citizens.map(p=>[p.agentId,p])),byJourney=new Map(journeys.map(j=>[j.agentId,j]));
  const reasonByCitizen=new Map(assignments.map(a=>[a.agentId,a.reason]));
  const sample=[...citizens].sort((a,b)=>{const x=hash([c.seed,a.agentId]),y=hash([c.seed,b.agentId]);return x<y?-1:x>y?1:0;}).slice(0,limit);
  const sampleIds=new Set(sample.map(p=>p.agentId));
  const payload=parseCitizenSimulation(structuredClone({...full,citizens:sample,journeys:journeys.filter(j=>sampleIds.has(j.agentId))}));
  const assignmentsByReason: ImpactResult['diagnostics']['assignmentsByReason']={assigned:{agents:0,population:0},ineligible:{agents:0,population:0},'not-specified':{agents:0,population:0},'not-participating':{agents:0,population:0},'missing-geography':{agents:0,population:0},'outside-catchment':{agents:0,population:0}};
  for (const p of citizens) {const bucket=assignmentsByReason[reasonByCitizen.get(p.agentId)!];bucket.agents++;bucket.population+=p.weight;}
  return {payload,metrics,distributionalDifferences,diagnostics:{uniqueOdPairs:pairs.length,routingCalls:1,assignmentsByReason},getProfile(agentId){
    const citizen=byCitizen.get(agentId);if (!citizen) return null;
    const journey=byJourney.get(agentId)!,assigned=journey.assignment==='hypothetical';
    return parseCitizenProfile(structuredClone({...context,citizen,journey,animation:null,activity:{status:assigned?'hypothetical':'unassigned',assumptionIds:assigned?[assignmentId]:[],description:assigned?`One illustrative MRT trip under ${c.id} v${c.version}; not an observed commute.`:null,destinationCategories:[],transportPreferences:[]}}));
  }};
}
