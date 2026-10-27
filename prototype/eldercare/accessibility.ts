import { createHash } from 'node:crypto';
import { AGE_GROUPS } from '../agents/prepare.ts';
import type { SyntheticPopulation } from '../agents/types.ts';
import type { Position, FacilityCatalogue, EldercareIntervention, OriginReference, AccessibilityOptions, OriginComparison, EldercareMetric, WeightedShare, EldercareResponse, NearestFacility } from './types.ts';
import { ensure, position, validateFacility, source, near, nonnegative, geography, text } from './validation.ts';
import { parseEldercareIntervention, validateOptions, validateOrigin } from './scenario.ts';
import { parseEldercareResponse } from './contract.ts';

export function haversineMetres(a:Position,b:Position):number {
  position(a,false);position(b,false);const rad=Math.PI/180;
  const h=Math.sin((b.lat-a.lat)*rad/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lon-a.lon)*rad/2)**2;
  return 6371008.8*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}
function finite(n:number):number {ensure(Number.isFinite(n),'Nonfinite weighted accessibility calculation');return n;}
const share=(n:number,d:number,denominator:string):WeightedShare=>({value:d>0?finite(n/d):null,numeratorPopulation:n,denominatorPopulation:d,denominator});

export function simulateEldercareIntervention(catalogueInput:FacilityCatalogue,proposed: EldercareIntervention,populationInput:SyntheticPopulation,originInput:OriginReference[],optionInput:AccessibilityOptions):EldercareResponse {
  const catalogue=structuredClone(catalogueInput),intervention=structuredClone(parseEldercareIntervention(proposed)),population=structuredClone(populationInput),origins=structuredClone(originInput),options=structuredClone(optionInput);
  validateOptions(options);options.thresholdsMetres.sort((a,b)=>a-b);
  ensure(catalogue?.schemaVersion===1 && Array.isArray(catalogue.facilities),'Invalid facility catalogue');source(catalogue.source);ensure(/^[a-f0-9]{64}$/.test(catalogue.source.rawSha256),'Invalid facility checksum');
  ensure(options.referenceDate>=catalogue.source.catalogueUpdated && options.referenceDate>=catalogue.source.accessedDate,'Model reference date precedes facility snapshot');
  const facilityIds=new Set<string>();
  for(const f of catalogue.facilities){validateFacility(f);ensure(!facilityIds.has(f.id),'Duplicate facility ID');facilityIds.add(f.id);if(f.corroboration)ensure(f.corroboration.checkedDate<=options.referenceDate,'Future facility corroboration');}
  ensure(!facilityIds.has(intervention.id),'Hypothetical facility ID collides with baseline');
  ensure(population?.schemaVersion===1 && Array.isArray(population.citizens),'Invalid synthetic population');
  ensure(population.source && /^[a-f0-9]{64}$/.test(population.source.rawSha256) && Number.isInteger(population.source.referenceYear) && population.source.referenceYear>=1900 && population.source.referenceYear<=Number(options.referenceDate.slice(0,4)),'Invalid population provenance/year');
  text(population.seed,'population seed');ensure(population.method==='minimum-one-largest-remainder-v1','Unsupported population method');
  const ids=new Set<string>();let fullPopulation=0;
  for(const c of population.citizens){
    ensure(c.synthetic===true && /^syn-[a-f0-9]{16}-[1-9]\d*$/.test(c.id) && !ids.has(c.id),'Invalid/duplicate synthetic ID');ids.add(c.id);
    ensure(Number.isFinite(c.weight) && c.weight>0,'Invalid population weight');fullPopulation+=c.weight;
    ensure(AGE_GROUPS.includes(c.observed.ageGroup) && ['male','female'].includes(c.observed.sex),'Invalid demographic category');geography(c.observed.planningArea);geography(c.observed.subzone);text(c.observed.planningAreaName,'planning area name');text(c.observed.subzoneName,'subzone name');
    const {sourceRow,...p}=c.provenance;ensure(Number.isInteger(sourceRow) && sourceRow>0 && Object.keys(population.source).every(k=>JSON.stringify(p[k as keyof typeof p])===JSON.stringify(population.source[k as keyof typeof p])),'Inconsistent citizen source provenance');
  }
  nonnegative(population.representedPopulation,'represented population');ensure(near(fullPopulation,population.representedPopulation),'Population weights not conserved');
  const originIds=new Set<string>(),byGeography=new Map<string,OriginReference>();
  ensure(Array.isArray(origins),'Invalid origin references');
  for(const o of origins){validateOrigin(o);ensure(o.provenance.referenceDate<=options.referenceDate,'Future geographic reference');const key=`${o.planningArea}/${o.subzone}`;ensure(!originIds.has(o.id) && !byGeography.has(key),'Duplicate origin ID/geography');originIds.add(o.id);byGeography.set(key,o);}
  origins.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);population.citizens.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const typed=catalogue.facilities.filter(f=>f.serviceType==='aac');
  const facilities=typed.filter(f=>options.existingAvailability==='assume-listed-available' && f.operationStatus==='listed-unconfirmed').sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  let calculations=0;
  const cache=new Map<string,OriginComparison>();
  const rows=population.citizens.filter(c=>Number(c.observed.ageGroup.split('_')[0].replace('andOver',''))>=options.minimumAge).map(c=>{
    const origin=byGeography.get(`${c.observed.planningArea}/${c.observed.subzone}`);
    if(origin && !cache.has(origin.id)){
      let baseline:NearestFacility|null=null;
      for(const f of facilities){const d=haversineMetres(origin.position,f.position);calculations++;if(baseline===null || d<baseline.distanceMetres)baseline={facilityId:f.id,distanceMetres:d};}
      const proposedDistance=haversineMetres(origin.position,intervention.position);calculations++;
      let scenario=baseline;
      if(intervention.availability==='assumed-available' && (scenario===null || proposedDistance<scenario.distanceMetres))scenario={facilityId:intervention.id,distanceMetres:proposedDistance};
      const comparable=baseline!==null && scenario!==null;
      const speed=options.straightLineWalkingMetresPerSecond;
      cache.set(origin.id,{origin,status:comparable?'compared':scenario?'baseline-unavailable':'no-facilities',baseline,scenario,distanceToProposedMetres:proposedDistance,reductionMetres:comparable?finite(baseline!.distanceMetres-scenario!.distanceMetres):null,nearestChanged:baseline?.facilityId!==scenario?.facilityId,distanceImproved:comparable?scenario!.distanceMetres<baseline!.distanceMetres:null,
        assumedStraightLineWalkingMinutes:speed===undefined?null:{baseline:baseline?finite(baseline.distanceMetres/speed/60):null,scenario:scenario?finite(scenario.distanceMetres/speed/60):null}});
    }
    return {citizen:c,comparison:origin?cache.get(origin.id)!:null};
  });
  const zones=[...new Map(population.citizens.map(c=>[`${c.observed.planningArea}/${c.observed.subzone}`,{planningArea:c.observed.planningArea,subzone:c.observed.subzone}])).values()];
  const groups:EldercareMetric['group'][]=[{},...AGE_GROUPS.filter(a=>Number(a.split('_')[0].replace('andOver',''))>=options.minimumAge).map(ageGroup=>({ageGroup})),{sex:'male'},{sex:'female'},...[...new Set(zones.map(z=>z.planningArea))].sort().map(planningArea=>({planningArea})),...zones];
  const metrics=groups.map(group=>{
    const subset=rows.filter(r=>Object.entries(group).every(([key,value])=>r.citizen.observed[key as keyof typeof r.citizen.observed]===value));
    const sum=(predicate:(r:typeof rows[number])=>boolean)=>finite(subset.filter(predicate).reduce((s,r)=>s+r.citizen.weight,0));
    const located=sum(r=>r.comparison!==null),total=sum(()=>true),base=sum(r=>r.comparison?.baseline!=null),scenario=sum(r=>r.comparison?.scenario!=null),comparable=sum(r=>r.comparison?.status==='compared');
    const mean=(which:'baseline'|'scenario'|'reduction',denominator:number,label:string)=>({value:denominator>0?finite(subset.reduce((s,r)=>{const c=r.comparison;const v=which==='reduction'?c?.reductionMetres:c?.[which]?.distanceMetres;return s+(v==null?0:v*r.citizen.weight);},0)/denominator):null,denominatorPopulation:denominator,denominator:label});
    return {group,agentCount:subset.length,population:total,locatedPopulation:located,unlocatedPopulation:sum(r=>r.comparison===null),comparablePopulation:comparable,existingFacilityPopulation:base,scenarioFacilityPopulation:scenario,baselineUnavailablePopulation:sum(r=>r.comparison!==null && r.comparison.baseline===null),closerPopulation:sum(r=>r.comparison?.distanceImproved===true),noImprovementPopulation:sum(r=>r.comparison?.distanceImproved===false),
      meanBaselineMetres:mean('baseline',base,'baseline-assessable-population'),meanScenarioMetres:mean('scenario',scenario,'scenario-assessable-population'),meanReductionMetres:mean('reduction',comparable,'comparable-population'),
      thresholds:options.thresholdsMetres.map(metres=>{
        const before=sum(r=>r.comparison?.baseline!=null && r.comparison.baseline.distanceMetres<=metres),after=sum(r=>r.comparison?.scenario!=null && r.comparison.scenario.distanceMetres<=metres);
        const pairedBefore=sum(r=>r.comparison?.status==='compared' && r.comparison.baseline!.distanceMetres<=metres),pairedAfter=sum(r=>r.comparison?.status==='compared' && r.comparison.scenario!.distanceMetres<=metres);
        return {metres,baselinePopulation:before,scenarioPopulation:after,newlyWithinPopulation:sum(r=>r.comparison?.status==='compared' && r.comparison.baseline!.distanceMetres>metres && r.comparison.scenario!.distanceMetres<=metres),scenarioAccessWithoutBaselinePopulation:sum(r=>r.comparison?.baseline===null && r.comparison.scenario!==null && r.comparison.scenario.distanceMetres<=metres),baselineShare:share(before,base,'baseline-assessable-population'),scenarioShare:share(after,scenario,'scenario-assessable-population'),pairedBaselineShare:share(pairedBefore,comparable,'comparable-population'),pairedScenarioShare:share(pairedAfter,comparable,'comparable-population'),changePercentagePoints:comparable>0?finite(100*(pairedAfter-pairedBefore)/comparable):null};
      })};
  });
  const missing=new Map<string,EldercareResponse['unlocatedGeographies'][number]>();
  for(const r of rows)if(!r.comparison){const d=r.citizen.observed,key=`${d.planningArea}/${d.subzone}`,m=missing.get(key)??{planningArea:d.planningArea,subzone:d.subzone,agents:0,population:0};m.agents++;m.population+=r.citizen.weight;missing.set(key,m);}
  const identity=JSON.stringify({version:'aac-haversine-v1',catalogue,intervention,population,origins,options});
  const targetedIds=new Set(rows.map(r=>r.citizen.id));
  const response:EldercareResponse={schemaVersion:1,engineVersion:'aac-haversine-v1',resultKind:'illustrative-geographic-accessibility',scenarioId:`eldercare-${createHash('sha256').update(identity).digest('hex').slice(0,24)}`,intervention,options,
    provenance:{facilitySource:catalogue.source,corroborations:catalogue.facilities.flatMap(f=>f.corroboration?[f.corroboration]:[]),population:population.source,populationSeed:population.seed,populationMethod:population.method,inputAgentCount:population.citizens.length,representedPopulation:population.representedPopulation,originReferences:origins,distanceMethod:'WGS84-haversine-metres',coverage:'limited-corroborated-subset-not-complete',eligibility:'age-target-only-not-confirmed-service-eligibility'},baselineFacilities:facilities,comparisons:[...cache.values()],metrics,unlocatedGeographies:[...missing.values()],capacity:{existingTotal:null,existingUnknownCount:facilities.length,proposedAssumedUsers:intervention.capacity?.users??null,serviceAllocation:'not-modelled'},diagnostics:{inputFacilities:catalogue.facilities.length,compatibleFacilities:facilities.length,excludedByType:catalogue.facilities.length-typed.length,excludedByAvailability:typed.length-facilities.length,ageIneligibleAgents:population.citizens.length-rows.length,ageIneligiblePopulation:finite(population.citizens.filter(c=>!targetedIds.has(c.id)).reduce((s,c)=>s+c.weight,0)),distanceCalculations:calculations}};
  return parseEldercareResponse(response);
}
