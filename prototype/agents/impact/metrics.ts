import type { CitizenReference, CitizenJourneyOutcome, ImpactMetric, MetricGroup, PopulationShare } from './types.ts';

function finite(value:number):number {if (!Number.isFinite(value)) throw new Error('Nonfinite aggregate arithmetic'); return value;}
export function aggregateImpact(citizens: CitizenReference[], journeys: CitizenJourneyOutcome[], group: MetricGroup, thresholdMinutes: number): ImpactMetric {
  if (!Number.isFinite(thresholdMinutes) || thresholdMinutes<0) throw new Error('Invalid journey-time threshold');
  const known=new Set<string>();
  for (const c of citizens) {if (known.has(c.agentId)) throw new Error('Duplicate agent identifier');known.add(c.agentId);if (!Number.isFinite(c.weight) || c.weight<=0) throw new Error('Population weight must be finite and positive');}
  const byId=new Map<string,CitizenJourneyOutcome>();
  for (const j of journeys) {
    if (!known.has(j.agentId) || byId.has(j.agentId)) throw new Error('Unknown/duplicate journey agent');
    if (j.assignment==='hypothetical') {
      const c=j.comparison;
      if (!c || !['compared','newly-reachable','unreachable','invalid'].includes(c.status)) throw new Error('Invalid journey comparison');
      const routeStatuses=['reachable','unreachable','station-unavailable','invalid'];
      if (!routeStatuses.includes(c.baselineStatus) || !routeStatuses.includes(c.scenarioStatus)) throw new Error('Invalid route status');
      const invalid=c.baselineStatus==='invalid' || c.scenarioStatus==='invalid';
      const comparable=c.baselineStatus==='reachable' && c.scenarioStatus==='reachable';
      const expected=invalid?'invalid':comparable?'compared':c.scenarioStatus==='reachable'?'newly-reachable':'unreachable';
      if (c.status!==expected || (invalid && !(c.baselineStatus==='invalid' && c.scenarioStatus==='invalid'))) throw new Error('Inconsistent route/comparison status');
      for (const [status,minutes,transfers] of [[c.baselineStatus,c.baselineMinutes,c.baselineTransfers],[c.scenarioStatus,c.scenarioMinutes,c.scenarioTransfers]] as const) {
        if (status==='reachable' && (minutes===null || !Number.isFinite(minutes) || minutes<0 || transfers===null || !Number.isSafeInteger(transfers) || transfers<0)) throw new Error('Reachable duration/transfer values must be finite and nonnegative');
        if (status!=='reachable' && (minutes!==null || transfers!==null)) throw new Error('Unavailable duration/transfer values must be null');
      }
      const equal=(actual:number|null,expected:number|null)=>actual===null || expected===null?actual===expected:Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual-expected)<=1e-6+1e-9*Math.max(Math.abs(actual),Math.abs(expected));
      const saved=comparable?c.baselineMinutes!-c.scenarioMinutes!:null;
      const percentage=comparable && c.baselineMinutes!>0?(c.scenarioMinutes!-c.baselineMinutes!)/c.baselineMinutes!*100:null;
      const transferChange=comparable?c.scenarioTransfers!-c.baselineTransfers!:null;
      if (!equal(c.minutesSaved,saved) || !equal(c.percentageChange,percentage) || c.transferChange!==transferChange) throw new Error('Inconsistent journey delta');
    } else if (j.assignment!=='unassigned' || j.comparison!==null) throw new Error('Invalid unassigned journey');
    byId.set(j.agentId,j);
  }
  const outcomes: ImpactMetric['outcomes']={unassigned:{agents:0,representedPopulation:0},compared:{agents:0,representedPopulation:0},'newly-reachable':{agents:0,representedPopulation:0},unreachable:{agents:0,representedPopulation:0},invalid:{agents:0,representedPopulation:0}};
  let agents=0,population=0,benefit=0,unchanged=0,total=0,transfers=0,before=0,after=0;
  for (const c of citizens) {
    if (!Object.entries(group).every(([key,value])=>c.demographic[key as keyof typeof c.demographic]===value)) continue;
    const j=byId.get(c.agentId); if (!j) throw new Error('Missing journey: supply explicit unassigned outcome');
    const comparison=j.assignment==='hypothetical'?j.comparison:null;
    const status=comparison?.status??'unassigned';
    const bucket=outcomes[status]; if (!bucket) throw new Error('Invalid journey status');
    agents++;population+=c.weight;bucket.agents++;bucket.representedPopulation+=c.weight;
    if (comparison?.status==='compared') {
      const saved=comparison.minutesSaved,change=comparison.transferChange;
      if (saved===null || change===null || !Number.isFinite(saved) || !Number.isFinite(change)) throw new Error('Nonfinite comparable journey metrics');
      if (saved>0) benefit+=c.weight;
      if (saved===0) unchanged+=c.weight;
      total+=saved*c.weight;transfers+=change*c.weight;
    }
    if (comparison && comparison.status!=='invalid') {
      if (comparison.baselineStatus==='reachable' && comparison.baselineMinutes!==null && comparison.baselineMinutes<=thresholdMinutes) before+=c.weight;
      if (comparison.scenarioStatus==='reachable' && comparison.scenarioMinutes!==null && comparison.scenarioMinutes<=thresholdMinutes) after+=c.weight;
    }
  }
  for (const n of [population,benefit,unchanged,total,transfers,before,after,...Object.values(outcomes).map(x=>x.representedPopulation)]) finite(n);
  const compared=outcomes.compared.representedPopulation;
  const assigned=outcomes.compared.representedPopulation+outcomes['newly-reachable'].representedPopulation+outcomes.unreachable.representedPopulation+outcomes.invalid.representedPopulation;
  const assessable=outcomes.compared.representedPopulation+outcomes['newly-reachable'].representedPopulation+outcomes.unreachable.representedPopulation;
  const share=(numerator:number,denominator:number,basis:PopulationShare['denominator']):PopulationShare=>({value:denominator>0?finite(numerator/denominator):null,numeratorPopulation:numerator,denominatorPopulation:denominator,denominator:basis});
  const baseline=share(before,assessable,'assigned-noninvalid-population'),scenario=share(after,assessable,'assigned-noninvalid-population');
  return {group:{...group},coverage:{agentCount:agents,representedPopulation:population,assignedPopulation:assigned,comparablePopulation:compared,unassignedPopulation:outcomes.unassigned.representedPopulation,invalidPopulation:outcomes.invalid.representedPopulation,newlyReachablePopulation:outcomes['newly-reachable'].representedPopulation,unreachablePopulation:outcomes.unreachable.representedPopulation},outcomes,
    weightedBenefitingPopulation:benefit,benefiting:share(benefit,compared,'comparable-population'),unchanged:share(unchanged,compared,'comparable-population'),weightedMeanMinutesSaved:compared>0?finite(total/compared):null,weightedTotalMinutesSaved:compared>0?total:null,weightedMeanTransferChange:compared>0?finite(transfers/compared):null,
    accessibility:{thresholdMinutes,baseline,scenario,changePercentagePoints:baseline.value!==null && scenario.value!==null?100*(scenario.value-baseline.value):null}};
}
