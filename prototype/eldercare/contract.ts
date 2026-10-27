/** Browser-safe eldercare boundary; separate from MRT/citizen simulation schema v1. */
import type { EldercareResponse, WeightedMeasure, WeightedShare } from './types.ts';
import { ensure, object, nonnegative, near, id, source, validateFacility, validateCorroboration, date, url, text, geography } from './validation.ts';
import { parseEldercareIntervention, validateOptions, validateOrigin } from './scenario.ts';
import type { AgeGroup } from '../agents/types.ts';
const TARGET_AGE_GROUPS=['60_64','65_69','70_74','75_79','80_84','85_89','90andOver'] as const satisfies readonly AgeGroup[];
export type * from './types.ts';
export const ELDERCARE_SCHEMA_VERSION=1 as const;

function measure(m:WeightedMeasure,denominator:number,label:string):void {
  object(m,['value','denominatorPopulation','denominator'],'weighted measure');nonnegative(m.denominatorPopulation,'measure denominator');ensure(near(m.denominatorPopulation,denominator) && m.denominator===label,'Inconsistent measure denominator');
  if(denominator===0)ensure(m.value===null,'Empty denominator requires null value');else nonnegative(m.value,'weighted measure value');
}
function share(s:WeightedShare,n:number,d:number,label:string):void {
  object(s,['value','numeratorPopulation','denominatorPopulation','denominator'],'share');nonnegative(s.numeratorPopulation,'share numerator');
  ensure(n<=d || near(n,d),'Share numerator exceeds denominator');
  measure({value:s.value,denominatorPopulation:s.denominatorPopulation,denominator:s.denominator},d,label);
  ensure(near(s.numeratorPopulation,n) && (d===0?s.value===null:s.value!==null && near(s.value,n/d)),'Inconsistent weighted share');
}
export function assertEldercareResponse(value:unknown):asserts value is EldercareResponse {
  object(value,['schemaVersion','engineVersion','resultKind','scenarioId','intervention','options','provenance','baselineFacilities','comparisons','metrics','unlocatedGeographies','capacity','diagnostics'],'eldercare response');
  ensure(value.schemaVersion===1 && value.engineVersion==='aac-haversine-v1' && value.resultKind==='illustrative-geographic-accessibility','Unsupported eldercare response version/basis');id(value.scenarioId,'scenario ID');
  const r=value as unknown as EldercareResponse;parseEldercareIntervention(r.intervention);validateOptions(r.options);
  const p=r.provenance;object(p,['facilitySource','corroborations','population','populationSeed','populationMethod','inputAgentCount','representedPopulation','originReferences','distanceMethod','coverage','eligibility'],'provenance');source(p.facilitySource);
  ensure(/^[a-f0-9]{64}$/.test(p.facilitySource.rawSha256),'Missing facility checksum');
  ensure(p.facilitySource.catalogueUpdated<=r.options.referenceDate && p.facilitySource.accessedDate<=r.options.referenceDate,'Reference date precedes facility snapshot');
  ensure(p.distanceMethod==='WGS84-haversine-metres' && p.coverage==='limited-corroborated-subset-not-complete' && p.eligibility==='age-target-only-not-confirmed-service-eligibility','Unsupported provenance interpretation');
  ensure(Number.isSafeInteger(p.inputAgentCount) && p.inputAgentCount>=0,'Invalid input agent count');nonnegative(p.representedPopulation,'represented population');text(p.populationSeed,'population seed');ensure(p.populationMethod==='minimum-one-largest-remainder-v1','Unsupported population method');
  ensure(p.population && ['government-statistics','synthetic-fixture'].includes(p.population.kind) && /^[a-f0-9]{64}$/.test(p.population.rawSha256),'Invalid population source');
  ensure(Number.isInteger(p.population.referenceYear) && p.population.referenceYear>=1900 && p.population.referenceYear<=Number(r.options.referenceDate.slice(0,4)),'Invalid demographic year');url(p.population.sourceUrl);url(p.population.licenceUrl);date(p.population.updated);text(p.population.datasetId,'population dataset');text(p.population.agency,'population agency');ensure(Array.isArray(p.population.assumptionIds) && p.population.assumptionIds.every(x=>typeof x==='string'),'Invalid population assumptions');
  ensure(Array.isArray(p.originReferences) && Array.isArray(p.corroborations),'Invalid provenance arrays');const origins=new Map<string,string>();
  const corroborations=new Map<string,string>();
  for(const c of p.corroborations){validateCorroboration(c);ensure(!corroborations.has(c.sourceFeatureId) && c.checkedDate<=r.options.referenceDate,'Duplicate/future corroboration');corroborations.set(c.sourceFeatureId,JSON.stringify(c));}
  for(const o of p.originReferences){validateOrigin(o);ensure(!origins.has(o.id),'Duplicate origin reference');origins.set(o.id,JSON.stringify(o));}
  ensure(Array.isArray(r.baselineFacilities) && Array.isArray(r.comparisons) && Array.isArray(r.metrics) && r.metrics.length>0 && Array.isArray(r.unlocatedGeographies),'Missing result arrays');
  const facilities=new Set<string>();
  for(const f of r.baselineFacilities){validateFacility(f);ensure(f.serviceType==='aac' && !facilities.has(f.id),'Incompatible/duplicate baseline facility');ensure(r.options.existingAvailability==='assume-listed-available' && f.operationStatus==='listed-unconfirmed','Baseline facility conflicts with availability policy');ensure(corroborations.get(f.id)===JSON.stringify(f.corroboration),'Baseline corroboration missing from provenance');facilities.add(f.id);}
  const comparisons=new Set<string>();
  for(const c of r.comparisons){
    object(c,['origin','status','baseline','scenario','distanceToProposedMetres','reductionMetres','nearestChanged','distanceImproved','assumedStraightLineWalkingMinutes'],'comparison');validateOrigin(c.origin);ensure(origins.get(c.origin.id)===JSON.stringify(c.origin) && !comparisons.has(c.origin.id),'Unknown/duplicate comparison origin');comparisons.add(c.origin.id);nonnegative(c.distanceToProposedMetres,'proposed distance');
    for(const [which,n] of [['baseline',c.baseline],['scenario',c.scenario]] as const)if(n!==null){object(n,['facilityId','distanceMetres'],'nearest facility');nonnegative(n.distanceMetres,'nearest distance');ensure(facilities.has(n.facilityId) || (which==='scenario' && n.facilityId===r.intervention.id && r.intervention.availability==='assumed-available'),'Unknown nearest facility');}
    const comparable=c.baseline!==null && c.scenario!==null;
    ensure((c.baseline!==null)===(facilities.size>0) && (c.scenario!==null)===(facilities.size>0 || r.intervention.availability==='assumed-available'),'Nearest facility existence conflicts with available facilities');
    ensure(c.status===(comparable?'compared':c.scenario?'baseline-unavailable':'no-facilities'),'Inconsistent accessibility status');
    if(comparable){ensure(c.scenario!.distanceMetres<=c.baseline!.distanceMetres || near(c.scenario!.distanceMetres,c.baseline!.distanceMetres),'Additive scenario worsened distance');ensure(c.reductionMetres!==null && near(c.reductionMetres,c.baseline!.distanceMetres-c.scenario!.distanceMetres) && c.distanceImproved===(c.scenario!.distanceMetres<c.baseline!.distanceMetres),'Inconsistent distance reduction');}
    else ensure(c.reductionMetres===null && c.distanceImproved===null,'Unavailable comparison must retain nulls');
    ensure(c.nearestChanged===(c.baseline?.facilityId!==c.scenario?.facilityId),'Inconsistent nearest facility change');
    const speed=r.options.straightLineWalkingMetresPerSecond,w=c.assumedStraightLineWalkingMinutes;
    if(speed===undefined)ensure(w===null,'Unexpected walking conversion');
    else {object(w,['baseline','scenario'],'walking approximation');for(const side of ['baseline','scenario'] as const){if(c[side]===null)ensure(w[side]===null,'Unavailable walking conversion');else ensure(typeof w[side]==='number' && near(w[side],c[side]!.distanceMetres/speed/60),'Inconsistent straight-line walking approximation');}}
  }
  const groups=new Set<string>();
  for(const m of r.metrics){
    object(m,['group','agentCount','population','locatedPopulation','unlocatedPopulation','comparablePopulation','existingFacilityPopulation','scenarioFacilityPopulation','baselineUnavailablePopulation','closerPopulation','noImprovementPopulation','meanBaselineMetres','meanScenarioMetres','meanReductionMetres','thresholds'],'metric');
    object(m.group,['ageGroup','sex','planningArea','subzone'],'group');
    const groupKey=JSON.stringify(Object.entries(m.group).sort(([a],[b])=>a<b?-1:1));ensure(!groups.has(groupKey),'Duplicate metric group');groups.add(groupKey);
    if(m.group.ageGroup!==undefined)ensure((TARGET_AGE_GROUPS as readonly string[]).includes(m.group.ageGroup),'Invalid group age');if(m.group.sex!==undefined)ensure(['male','female'].includes(m.group.sex),'Invalid group sex');ensure(m.group.subzone===undefined || typeof m.group.planningArea==='string','Subzone requires area');
    if(m.group.planningArea!==undefined)geography(m.group.planningArea);if(m.group.subzone!==undefined)geography(m.group.subzone);
    ensure(Number.isSafeInteger(m.agentCount) && m.agentCount>=0 && m.agentCount<=p.inputAgentCount,'Invalid group agent count');
    for(const key of ['population','locatedPopulation','unlocatedPopulation','comparablePopulation','existingFacilityPopulation','scenarioFacilityPopulation','baselineUnavailablePopulation','closerPopulation','noImprovementPopulation'] as const)nonnegative(m[key],`metric ${key}`);
    ensure((m.agentCount===0)===(m.population===0),'Empty group count/weight mismatch');
    ensure(m.population<=p.representedPopulation || near(m.population,p.representedPopulation),'Group exceeds represented population');
    ensure(near(m.population,m.locatedPopulation+m.unlocatedPopulation) && near(m.locatedPopulation,m.existingFacilityPopulation+m.baselineUnavailablePopulation) && near(m.comparablePopulation,m.closerPopulation+m.noImprovementPopulation) && near(m.comparablePopulation,m.existingFacilityPopulation),'Metric partition mismatch');
    ensure(m.scenarioFacilityPopulation<=m.locatedPopulation || near(m.scenarioFacilityPopulation,m.locatedPopulation),'Scenario denominator exceeds located population');
    measure(m.meanBaselineMetres,m.existingFacilityPopulation,'baseline-assessable-population');measure(m.meanScenarioMetres,m.scenarioFacilityPopulation,'scenario-assessable-population');measure(m.meanReductionMetres,m.comparablePopulation,'comparable-population');
    if(m.comparablePopulation>0){ensure(m.meanReductionMetres.value!<=m.meanBaselineMetres.value! || near(m.meanReductionMetres.value!,m.meanBaselineMetres.value!),'Distance reduction exceeds baseline mean');if(near(m.scenarioFacilityPopulation,m.comparablePopulation))ensure(near(m.meanBaselineMetres.value!-m.meanScenarioMetres.value!,m.meanReductionMetres.value!),'Inconsistent weighted distance means');}
    ensure(Array.isArray(m.thresholds) && m.thresholds.length===r.options.thresholdsMetres.length,'Threshold count mismatch');
    for(const [i,t] of m.thresholds.entries()){
      object(t,['metres','baselinePopulation','scenarioPopulation','newlyWithinPopulation','scenarioAccessWithoutBaselinePopulation','baselineShare','scenarioShare','pairedBaselineShare','pairedScenarioShare','changePercentagePoints'],'threshold metric');ensure(t.metres===r.options.thresholdsMetres[i],'Threshold order mismatch');
      for(const n of [t.baselinePopulation,t.scenarioPopulation,t.newlyWithinPopulation,t.scenarioAccessWithoutBaselinePopulation])nonnegative(n,'threshold population');
      share(t.baselineShare,t.baselinePopulation,m.existingFacilityPopulation,'baseline-assessable-population');share(t.scenarioShare,t.scenarioPopulation,m.scenarioFacilityPopulation,'scenario-assessable-population');
      share(t.pairedBaselineShare,t.baselinePopulation,m.comparablePopulation,'comparable-population');share(t.pairedScenarioShare,t.scenarioPopulation-t.scenarioAccessWithoutBaselinePopulation,m.comparablePopulation,'comparable-population');
      const delta=t.pairedScenarioShare.numeratorPopulation-t.pairedBaselineShare.numeratorPopulation;
      ensure(near(delta,t.newlyWithinPopulation),'New threshold coverage mismatch');
      ensure(m.comparablePopulation===0?t.changePercentagePoints===null:t.changePercentagePoints!==null && near(t.changePercentagePoints,100*delta/m.comparablePopulation),'Coverage change denominator mismatch');
    }
  }
  const overall=r.metrics[0];ensure(Object.keys(overall.group).length===0,'First metric must be overall');
  const d=r.diagnostics;object(d,['inputFacilities','compatibleFacilities','excludedByType','excludedByAvailability','ageIneligibleAgents','ageIneligiblePopulation','distanceCalculations'],'diagnostics');
  for(const key of ['inputFacilities','compatibleFacilities','excludedByType','excludedByAvailability','ageIneligibleAgents','distanceCalculations'] as const)ensure(Number.isSafeInteger(d[key]) && d[key]>=0,'Invalid diagnostic count');nonnegative(d.ageIneligiblePopulation,'age-ineligible population');
  ensure(d.compatibleFacilities===facilities.size && d.inputFacilities===d.compatibleFacilities+d.excludedByType+d.excludedByAvailability && overall.agentCount+d.ageIneligibleAgents===p.inputAgentCount && near(overall.population+d.ageIneligiblePopulation,p.representedPopulation),'Overall conservation mismatch');
  let missing=0;for(const z of r.unlocatedGeographies){text(z.planningArea,'unlocated area');text(z.subzone,'unlocated subzone');nonnegative(z.population,'unlocated population');ensure(Number.isSafeInteger(z.agents) && z.agents>0,'Unlocated agent count');missing+=z.population;}ensure(near(missing,overall.unlocatedPopulation),'Unlocated population mismatch');
  object(r.capacity,['existingTotal','existingUnknownCount','proposedAssumedUsers','serviceAllocation'],'capacity result');ensure(r.capacity.existingTotal===null && r.capacity.existingUnknownCount===facilities.size && r.capacity.proposedAssumedUsers===(r.intervention.capacity?.users??null) && r.capacity.serviceAllocation==='not-modelled','Capacity must remain separate from geographic access');
}
export function parseEldercareResponse(value:unknown):EldercareResponse {assertEldercareResponse(value);return value;}
