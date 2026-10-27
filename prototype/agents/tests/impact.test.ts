import test from 'node:test';
import assert from 'node:assert/strict';
import { illustrativeCitizenSimulation as fixture } from '../../../lib/contracts/citizen-simulation.fixtures.ts';
import { parseCitizenSimulation, parseCitizenProfile } from '../../../lib/contracts/citizen-simulation.ts';
import type { SyntheticPopulation } from '../types.ts';
import { baselineFixture, proposalFixture } from '../../mrt/tests/scenario-fixtures.ts';
import { aggregateImpact } from '../impact/metrics.ts';
import { assignJourneys } from '../impact/assignment.ts';
import { runPopulationImpact } from '../impact/simulation.ts';
import type { ImpactAssumptions } from '../impact/types.ts';

function population(): SyntheticPopulation {
  const {id:_id,...source}=fixture.sources[0];
  return {schemaVersion:1,seed:'fixture',method:'minimum-one-largest-remainder-v1',source,representedPopulation:200,
    citizens:fixture.citizens.map(c=>({id:c.agentId,synthetic:true,weight:c.weight,observed:{...c.demographic},assumed:{status:'unassigned',assumptionIds:[]},provenance:{...source,sourceRow:c.sourceRow}}))};
}
function config(): ImpactAssumptions {
  return {id:'test-demand',version:1,description:'Invented OD fixture, not observed travel.',referenceDate:'2026-10-27',seed:'test',unassigned:'retain-unknown',
    travel:{method:'explicit-od',pairs:[{agentId:fixture.citizens[0].agentId,origin:'NS4',destination:'X'},{agentId:fixture.citizens[1].agentId,origin:'NS4',destination:'Y'},{agentId:fixture.citizens[3].agentId,origin:'NS4',destination:'MISSING'}]}};
}
test('hand-calculated weighted mean and denominators keep unassigned/unreachable unknown',()=>{
  const m=aggregateImpact(fixture.citizens,fixture.journeys,{},20);
  assert.equal(m.coverage.representedPopulation,200); assert.equal(m.coverage.assignedPopulation,180);
  assert.equal(m.coverage.comparablePopulation,150); assert.equal(m.coverage.unassignedPopulation,20);
  assert.equal(m.weightedTotalMinutesSaved,1000); assert.equal(m.weightedMeanMinutesSaved,1000/150);
  assert.equal(m.benefiting.denominatorPopulation,150); assert.equal(m.benefiting.value,100/150);
  assert.equal(m.unchanged.value,50/150); assert.equal(m.weightedMeanTransferChange,-200/150);
  assert.equal(m.accessibility.baseline.value,50/180); assert.equal(m.accessibility.scenario.value,150/180);
  assert.equal(m.accessibility.changePercentagePoints,100*(150/180-50/180));
});
test('empty group metrics use zero counts and null means/shares',()=>{
  const m=aggregateImpact(fixture.citizens,fixture.journeys,{ageGroup:'0_4'},20);
  assert.equal(m.coverage.representedPopulation,0); assert.equal(m.weightedMeanMinutesSaved,null);
  assert.equal(m.benefiting.value,null); assert.equal(m.accessibility.changePercentagePoints,null);
});
test('sex groups independently reconcile weights and preserve their own denominators',()=>{
  const male=aggregateImpact(fixture.citizens,fixture.journeys,{sex:'male'},20);
  const female=aggregateImpact(fixture.citizens,fixture.journeys,{sex:'female'},20);
  assert.equal(male.coverage.representedPopulation,120);assert.equal(female.coverage.representedPopulation,80);
  assert.equal(male.benefiting.denominatorPopulation,100);assert.equal(female.benefiting.denominatorPopulation,50);
  assert.equal(male.weightedMeanMinutesSaved,10);assert.equal(female.weightedMeanMinutesSaved,0);
});
test('fractional weights conserve totals and invalid/zero-weight inputs fail',()=>{
  const c=fixture.citizens.map(c=>({...c,weight:c.weight/100}));
  assert.equal(aggregateImpact(c,fixture.journeys,{},20).coverage.representedPopulation,2);
  for(const weight of [0,-1,NaN,Infinity]) assert.throws(()=>aggregateImpact([{...c[0],weight}],[],{},20),/weight/i);
  assert.throws(()=>aggregateImpact(c,fixture.journeys,{},NaN),/threshold/i);
});
test('real engine outcomes form valid payload and profiles beyond render subset',()=>{
  const p=population(), before=structuredClone(p), baseline=baselineFixture(), graphBefore=structuredClone(baseline);
  const result=runPopulationImpact(p,baseline,proposalFixture(),{assumptions:config(),thresholdMinutes:4,renderLimit:1});
  parseCitizenSimulation(JSON.parse(JSON.stringify(result.payload)));
  assert.equal(result.payload.citizens.length,1); assert.equal(result.payload.metadata.population.agentCount,4);
  assert.equal(result.metrics[0].coverage.assignedPopulation,180); assert.equal(result.metrics[0].coverage.comparablePopulation,150);
  assert.equal(result.metrics[0].weightedTotalMinutesSaved,350); assert.equal(result.metrics[0].weightedMeanMinutesSaved,350/150);
  assert.equal(result.metrics[0].benefiting.value,100/150); assert.equal(result.diagnostics.uniqueOdPairs,3);
  const profile=result.getProfile(p.citizens[2].id)!;
  parseCitizenProfile(profile); assert.equal(profile.activity.status,'unassigned'); assert.equal(profile.journey?.assignment,'unassigned');
  assert.match(profile.activity.description??'',/^$/); assert.equal(result.getProfile('missing'),null);
  assert.deepEqual(p,before); assert.deepEqual(baseline,graphBefore);
});
test('duplicate pairs computed once, alias-normalised, deterministic replay',()=>{
  const c=config(); c.travel={method:'explicit-od',pairs:population().citizens.slice(0,2).map((p,i)=>({agentId:p.id,origin:i?'BP1':'NS4',destination:'X'}))};
  const run=()=>runPopulationImpact(population(),baselineFixture(),proposalFixture(),{assumptions:c,thresholdMinutes:4,renderLimit:0});
  const a=run(),b=run(); assert.equal(a.diagnostics.uniqueOdPairs,1); assert.equal(a.diagnostics.routingCalls,1);
  assert.deepEqual(a.payload,b.payload); assert.deepEqual(a.metrics,b.metrics);
  assert.equal(a.metrics[0].weightedBenefitingPopulation,150);
});
test('unknown, newly reachable and station unavailable statuses remain distinct',()=>{
  const p=population(), c=config(); c.travel={method:'explicit-od',pairs:[{agentId:p.citizens[0].id,origin:'X',destination:'NS4'},{agentId:p.citizens[1].id,origin:'NS4',destination:'HYP_M'}]};
  const r=runPopulationImpact(p,baselineFixture(),proposalFixture(),{assumptions:c,thresholdMinutes:10});
  assert.equal(r.metrics[0].coverage.newlyReachablePopulation,150); assert.equal(r.metrics[0].weightedMeanMinutesSaved,null);
  assert.equal(r.metrics[0].accessibility.baseline.value,0);assert.equal(r.metrics[0].accessibility.scenario.value,1);
  assert.equal(r.getProfile(p.citizens[1].id)?.journey?.comparison?.baselineStatus,'station-unavailable');
});
test('distributional differences compare groups to full comparable population',()=>{
  const r=runPopulationImpact(population(),baselineFixture(),proposalFixture(),{assumptions:config(),thresholdMinutes:4});
  const age=r.distributionalDifferences.find(d=>d.group.ageGroup==='0_4')!;
  assert.equal(age.meanMinutesSavedDifferenceFromOverall,null);assert.equal(age.assessment,'unknown');
  const male=r.distributionalDifferences.find(d=>d.group.sex==='male')!;
  assert.equal(male.meanMinutesSavedDifferenceFromOverall,3.5-350/150);
  assert.equal(male.benefitingShareDifferencePercentagePoints,100*(1-100/150));
});
test('same station is valid unchanged; additive spur preserves unreachable status',()=>{
  const p=population(),c=config(); c.travel={method:'explicit-od',pairs:[{agentId:p.citizens[0].id,origin:'NS4',destination:'NS4'},{agentId:p.citizens[1].id,origin:'X',destination:'NS4'}]};
  const proposal=proposalFixture(); proposal.stations.pop();proposal.segments.pop();
  const r=runPopulationImpact(p,baselineFixture(),proposal,{assumptions:c,thresholdMinutes:0});
  assert.equal(r.metrics[0].coverage.unreachablePopulation,50); assert.equal(r.metrics[0].unchanged.value,1);
  assert.equal(r.getProfile(p.citizens[0].id)?.journey?.comparison?.percentageChange,null);
});
test('seeded destination distributions and eligibility are explicit, stable and variable',()=>{
  const p=population(), c=config();
  c.travel={method:'destination-distribution',participationRate:1,origins:{method:'explicit-stations',rules:[{planningArea:'ang-mo-kio',stationId:'NS4'}]},destinations:[{stationId:'X',share:1},{stationId:'Y',share:1}]};
  const a=assignJourneys(p.citizens,baselineFixture(),c);
  assert.deepEqual(a,assignJourneys([...p.citizens].reverse(),baselineFixture(),c).reverse());
  const alternatives=new Set(Array.from({length:20},(_,i)=>JSON.stringify(assignJourneys(p.citizens,baselineFixture(),{...c,seed:String(i)}))));
  assert.ok(alternatives.size>1);
  const none=assignJourneys(p.citizens,baselineFixture(),{...c,eligible:{ageGroups:['0_4']}});
  assert.ok(none.every(x=>x.pair===null && x.reason==='ineligible'));
  c.travel.participationRate=0; assert.ok(assignJourneys(p.citizens,baselineFixture(),c).every(x=>x.pair===null));
});
test('nearest station reference point uses distance cap, absent units stay unassigned',()=>{
  const p=population(),c=config(); c.travel={method:'destination-distribution',participationRate:1,destinations:[{stationId:'X',share:1}],
    origins:{method:'reference-point-nearest',maxDistanceMetres:100,points:[{planningArea:'ang-mo-kio',subzone:'cheng-san',lat:1.38,lon:103.74,basis:'Test unit reference point; not home location.'}]}};
  assert.equal(assignJourneys(p.citizens,baselineFixture(),c)[0].pair?.origin,'NS4');
  if (c.travel.origins.method!=='reference-point-nearest') throw new Error('Expected point origin fixture');
  c.travel.origins.points[0].lat=1.2; assert.equal(assignJourneys(p.citizens,baselineFixture(),c)[0].reason,'outside-catchment');
  c.travel.origins.points=[]; assert.equal(assignJourneys(p.citizens,baselineFixture(),c)[0].reason,'missing-geography');
});
test('full metrics do not depend on render limit; all unassigned stays unknown',()=>{
  const p=population(),baseline=baselineFixture(),proposal=proposalFixture(),c=config();
  const a=runPopulationImpact(p,baseline,proposal,{assumptions:c,thresholdMinutes:4,renderLimit:0});
  const b=runPopulationImpact(p,baseline,proposal,{assumptions:c,thresholdMinutes:4,renderLimit:4});
  assert.deepEqual(a.metrics,b.metrics);
  c.travel={method:'explicit-od',pairs:[]};
  const r=runPopulationImpact(p,baseline,proposal,{assumptions:c,thresholdMinutes:4});
  assert.equal(r.metrics[0].coverage.unassignedPopulation,200); assert.equal(r.metrics[0].weightedTotalMinutesSaved,null);
  assert.equal(r.metrics[0].accessibility.baseline.value,null); assert.equal(r.diagnostics.uniqueOdPairs,0);
});
test('different documented destinations change outcomes and malformed assumptions fail',()=>{
  const p=population(),baseline=baselineFixture(),proposal=proposalFixture(),c=config();
  const before=runPopulationImpact(p,baseline,proposal,{assumptions:c,thresholdMinutes:4});
  if(c.travel.method!=='explicit-od') throw new Error('Expected explicit fixture');
  c.travel.pairs[0].destination='NS4';
  const after=runPopulationImpact(p,baseline,proposal,{assumptions:c,thresholdMinutes:4});
  assert.equal(before.metrics[0].weightedBenefitingPopulation,100);assert.equal(after.metrics[0].weightedBenefitingPopulation,0);
  for(const travel of [
    {method:'destination-distribution',participationRate:2,origins:{method:'explicit-stations',rules:[]},destinations:[{stationId:'X',share:1}]},
    {method:'destination-distribution',participationRate:1,origins:{method:'reference-point-nearest',maxDistanceMetres:-1,points:[]},destinations:[{stationId:'X',share:1}]},
    {method:'destination-distribution',participationRate:1,origins:{method:'explicit-stations',rules:[]},destinations:[{stationId:'X',share:0}]},
  ]) assert.throws(()=>assignJourneys(p.citizens,baseline,{...c,travel} as ImpactAssumptions));
});
test('nonfinite route values are rejected instead of entering accessibility shares',()=>{
  const journeys=structuredClone(fixture.journeys);
  const j=journeys[0]; if(j.assignment!=='hypothetical') throw new Error('Expected hypothetical fixture');
  j.comparison.scenarioMinutes=Infinity;
  assert.throws(()=>aggregateImpact(fixture.citizens,journeys,{},20),/finite|duration/i);
});
test('aggregation rejects finite contradictory savings and status fields',()=>{
  for (const mutation of [{minutesSaved:999},{transferChange:99},{percentageChange:10},{status:'unreachable'},{scenarioStatus:'invalid'}]) {
    const journeys=structuredClone(fixture.journeys),j=journeys[0];
    if(j.assignment!=='hypothetical') throw new Error('Expected hypothetical fixture');
    Object.assign(j.comparison,mutation);
    assert.throws(()=>aggregateImpact(fixture.citizens,journeys,{},20),/inconsistent|status|delta/i);
  }
});
test('report identity includes accessibility threshold but excludes render subset size',()=>{
  const p=population(),b=baselineFixture(),i=proposalFixture();
  const a=runPopulationImpact(p,b,i,{assumptions:config(),thresholdMinutes:4,renderLimit:0});
  const changed=runPopulationImpact(p,b,i,{assumptions:config(),thresholdMinutes:10,renderLimit:0});
  const display=runPopulationImpact(p,b,i,{assumptions:config(),thresholdMinutes:4,renderLimit:4});
  assert.notEqual(a.payload.metadata.scenarioId,changed.payload.metadata.scenarioId);
  assert.equal(a.payload.metadata.scenarioId,display.payload.metadata.scenarioId);
});
test('semantically identical provenance property order is accepted',()=>{
  const p=population();p.source=Object.fromEntries(Object.entries(p.source).reverse()) as typeof p.source;
  assert.doesNotThrow(()=>runPopulationImpact(p,baselineFixture(),proposalFixture(),{assumptions:config(),thresholdMinutes:4}));
});
test('invalid configurations and malformed full populations cannot hide outside sample',()=>{
  const p=population(), c=config(),run=(p: SyntheticPopulation,c:ImpactAssumptions)=>runPopulationImpact(p,baselineFixture(),proposalFixture(),{assumptions:c,thresholdMinutes:20,renderLimit:0});
  assert.throws(()=>run({...p,citizens:[...p.citizens,p.citizens[0]]},c),/duplicate/i);
  assert.throws(()=>run({...p,representedPopulation:1},c),/population/i);
  assert.throws(()=>run({...p,citizens:[]},c),/empty|population/i);
  assert.throws(()=>run(p,{...c,referenceDate:'2026-10-28'}),/date/i);
  c.travel={method:'explicit-od',pairs:[{agentId:'missing',origin:'NS4',destination:'X'}]}; assert.throws(()=>run(p,c),/agent/i);
});
