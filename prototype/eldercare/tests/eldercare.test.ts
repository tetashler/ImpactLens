import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareFacilityCatalogue } from '../prepare.ts';
import { haversineMetres, simulateEldercareIntervention } from '../accessibility.ts';
import { parseEldercareResponse } from '../contract.ts';
import type { FacilityCatalogue, EldercareIntervention, OriginReference, AccessibilityOptions } from '../types.ts';
import { illustrativeCitizenSimulation } from '../../../lib/contracts/citizen-simulation.fixtures.ts';
import type { SyntheticPopulation } from '../../agents/types.ts';

const source={id:'fixture',agency:'Synthetic test fixture',url:'https://example.invalid/fixture',catalogueUpdated:'2024-06-06',accessedDate:'2026-10-27',licenceUrl:'https://example.invalid/licence',scope:'Synthetic fixture, not observed government facilities.'};
function geo(name='Fixture AAC',coordinates:unknown=[103.8,1.3,0]) {
  return {type:'FeatureCollection',crs:{type:'name',properties:{name:'urn:ogc:def:crs:OGC:1.3:CRS84'}},features:[{type:'Feature',properties:{Name:'f1',Description:`<table><tr><th>NAME</th><td>${name}</td></tr><tr><th>ADDRESSPOSTALCODE</th><td>123456</td></tr><tr><th>ADDRESSSTREETNAME</th><td>1 Test Road #01-01</td></tr><tr><th>FMEL_UPD_D</th><td>20160728192327</td></tr></table>`},geometry:{type:'Point',coordinates}}]};
}
const evidence=[{sourceFeatureId:'f1',expectedSourceName:'Fixture AAC',postalCode:'123456',name:'Fixture AAC',serviceType:'aac' as const,listedAddress:'1 Test Road #01-01',evidenceUrl:'https://example.invalid/listing',checkedDate:'2026-10-27'}];
const catalogue=()=>prepareFacilityCatalogue(JSON.stringify(geo()),evidence,source);
const proposal=():EldercareIntervention=>({schemaVersion:1,id:'HYP_AAC',name:'Hypothetical fixture AAC',serviceType:'aac',status:'hypothetical',position:{lat:1.3,lon:103.801},availability:'assumed-available',capacity:null,eligibility:'age-only-other-criteria-unknown',rationale:'Invented test site, not real infrastructure.',assumptions:[{id:'fixture-site',description:'Fixture coordinates only.'}]});
const options:AccessibilityOptions={referenceDate:'2026-10-27',minimumAge:60,thresholdsMetres:[100,500],existingAvailability:'assume-listed-available',eligibility:'age-only-other-criteria-unknown'};
function population():SyntheticPopulation {
  const {id:_id,...source}=illustrativeCitizenSimulation.sources[0];
  return {schemaVersion:1,seed:'eldercare-fixture',source,method:'minimum-one-largest-remainder-v1',representedPopulation:4,citizens:illustrativeCitizenSimulation.citizens.map((c,i)=>({id:c.agentId,synthetic:true,weight:[1.5,0.5,1,1][i],observed:{...c.demographic,ageGroup:i===3?'0_4':'65_69'},assumed:{status:'unassigned',assumptionIds:[]},provenance:{...source,sourceRow:c.sourceRow}}))};
}
const refs=():OriginReference[]=>[{id:'proxy',planningArea:'ang-mo-kio',subzone:'cheng-san',position:{lat:1.3,lon:103.801},provenance:{method:'explicit-geographic-proxy',description:'Synthetic unit reference, not a home.',sourceUrl:'https://example.invalid/proxy',referenceDate:'2026-10-27',assumptionId:'proxy-fixture'}}];

test('KML fields parsed; corroboration required, capacity and opening date remain unknown',()=>{
  const c=catalogue();assert.equal(c.facilities.length,1);assert.equal(c.facilities[0].serviceType,'aac');
  assert.equal(c.facilities[0].capacity,null);assert.equal(c.facilities[0].openedOn,null);assert.equal(c.facilities[0].operationStatus,'listed-unconfirmed');
  assert.equal(c.facilities[0].position.lon,103.8);assert.equal(c.facilities[0].recordUpdated,'20160728192327');
  assert.equal(prepareFacilityCatalogue(JSON.stringify(geo()),[],source).facilities[0].serviceType,'unknown');
  assert.equal(c.source.rawSha256.length,64);
});
test('malformed source structure/CRS rejected; invalid records excluded without repairs',()=>{
  assert.throws(()=>prepareFacilityCatalogue('{}',[],source),/collection/i);
  const bad=geo();bad.crs.properties.name='EPSG:3414';assert.throws(()=>prepareFacilityCatalogue(JSON.stringify(bad),[],source),/CRS/i);
  for(const coordinates of [null,[],[1.3,103.8],[103.8,NaN],[200,1.3]]) {
    const c=prepareFacilityCatalogue(JSON.stringify(geo('Fixture AAC',coordinates)),[],source);
    assert.equal(c.facilities.length,0);assert.equal(c.audit.excluded.length,1);
  }
  assert.equal(prepareFacilityCatalogue(JSON.stringify(geo('')),[],source).audit.excluded.length,1);
});
test('duplicate facility records excluded; co-location of different services remains flagged',()=>{
  const g=geo();g.features.push(structuredClone(g.features[0]));
  assert.equal(prepareFacilityCatalogue(JSON.stringify(g),evidence,source).audit.excluded.length,1);
  g.features[1].properties.Name='f2';g.features[1].properties.Description=g.features[1].properties.Description.replace('Fixture AAC','Another service');
  const c=prepareFacilityCatalogue(JSON.stringify(g),evidence,source);assert.equal(c.facilities.length,2);assert.equal(c.audit.coLocatedGroups.length,1);
});
test('conflicting verification cannot relabel a different source facility',()=>{
  const c=prepareFacilityCatalogue(JSON.stringify(geo()),[{...evidence[0],postalCode:'999999'}],source);
  assert.equal(c.facilities[0].serviceType,'unknown');assert.equal(c.audit.verificationConflicts.length,1);
});
test('independent great circle value, coordinate order, symmetry and zero distance',()=>{
  // One degree on a spherical equator: R*pi/180, independently 111195.0802335329 m.
  assert.ok(Math.abs(haversineMetres({lat:0,lon:0},{lat:0,lon:1})-111195.0802335329)<1e-7);
  const a={lat:1.3,lon:103.8},b={lat:1.31,lon:103.82};
  assert.equal(haversineMetres(a,b),haversineMetres(b,a));assert.equal(haversineMetres(a,a),0);
});
test('weighted before/after reductions preserve population and age/geographic groups',()=>{
  const r=simulateEldercareIntervention(catalogue(),proposal(),population(),refs(),options);
  const m=r.metrics[0];assert.equal(m.population,3);assert.equal(m.locatedPopulation,3);assert.equal(m.comparablePopulation,3);
  assert.equal(m.closerPopulation,3);assert.equal(m.noImprovementPopulation,0);
  assert.equal(m.meanScenarioMetres.value,0);assert.equal(m.meanReductionMetres.value,m.meanBaselineMetres.value);
  assert.equal(m.thresholds[0].newlyWithinPopulation,3);assert.equal(m.thresholds[0].changePercentagePoints,100);
  assert.equal(r.metrics.find(m=>m.group.sex==='female')?.population,0.5);
  assert.equal(r.metrics.find(m=>m.group.planningArea==='ang-mo-kio' && !m.group.subzone)?.population,3);
  assert.equal(parseEldercareResponse(JSON.parse(JSON.stringify(r))).scenarioId,r.scenarioId);
});
test('unlocated residents stay explicit and are excluded from distance/coverage denominators',()=>{
  const p=population();p.citizens[2].observed.subzone='unsupported';
  const r=simulateEldercareIntervention(catalogue(),proposal(),p,refs(),options),m=r.metrics[0];
  assert.equal(m.population,3);assert.equal(m.locatedPopulation,2);assert.equal(m.unlocatedPopulation,1);
  assert.equal(m.thresholds[0].scenarioShare.denominatorPopulation,2);assert.equal(m.noImprovementPopulation,0);
  assert.equal(r.unlocatedGeographies[0].population,1);
});
test('heterogeneous fractional weights use independently calculated distance means',()=>{
  const p=population();p.citizens[1].observed.subzone='second';p.citizens[2].observed.subzone='unlocated';
  const o=refs();o.push({...structuredClone(o[0]),id:'second-proxy',subzone:'second',position:{lat:1.3,lon:103.8}});
  const m=simulateEldercareIntervention(catalogue(),proposal(),p,o,options).metrics[0];
  // Independent spherical parallel formula: 2R asin(cos(1.3 degrees)*sin(.001 degrees/2)).
  // First proxy weight 1.5 at 111.1664596565m; second weight .5 at zero; one unlocated.
  assert.ok(Math.abs(m.meanBaselineMetres.value!-83.37484474238872)<1e-6);
  assert.equal(m.locatedPopulation,2);assert.equal(m.unlocatedPopulation,1);
  assert.equal(m.thresholds[0].baselineShare.value,0.25);assert.equal(m.thresholds[0].scenarioShare.value,1);
  assert.equal(m.thresholds[0].newlyWithinPopulation,1.5);assert.equal(m.thresholds[0].changePercentagePoints,75);
});
test('age boundary and straight-line walking conversion retain their explicit assumptions',()=>{
  const p=population();p.citizens[0].observed.ageGroup='60_64';
  const r=simulateEldercareIntervention(catalogue(),proposal(),p,refs(),{...options,straightLineWalkingMetresPerSecond:1});
  assert.equal(r.metrics[0].population,3);
  assert.equal(r.comparisons[0].assumedStraightLineWalkingMinutes?.baseline,r.comparisons[0].baseline!.distanceMetres/60);
  assert.equal(simulateEldercareIntervention(catalogue(),proposal(),p,refs(),{...options,minimumAge:65}).metrics[0].population,1.5);
});
test('excluding unconfirmed operations does not pretend the incomplete baseline is accessible',()=>{
  const r=simulateEldercareIntervention(catalogue(),proposal(),population(),refs(),{...options,existingAvailability:'exclude-unconfirmed'});
  assert.equal(r.baselineFacilities.length,0);assert.equal(r.metrics[0].baselineUnavailablePopulation,3);
  assert.equal(r.metrics[0].thresholds[0].baselineShare.value,null);
});
test('response validator rejects forged partitions, means, duplicate groups and capacity claims',()=>{
  const result=simulateEldercareIntervention(catalogue(),proposal(),population(),refs(),options);
  for(const mutate of [
    (r:typeof result)=>{r.metrics[0].unlocatedPopulation=1;},
    (r:typeof result)=>{r.metrics[0].meanReductionMetres.value=999;},
    (r:typeof result)=>{r.metrics.push(structuredClone(r.metrics[0]));},
    (r:typeof result)=>{(r.capacity as unknown as {servedPopulation:number}).servedPopulation=100;},
  ]) {const bad=structuredClone(result);mutate(bad);assert.throws(()=>parseEldercareResponse(bad));}
});
test('response boundary validates nested corroboration, availability and nearest existence',()=>{
  const result=simulateEldercareIntervention(catalogue(),proposal(),population(),refs(),options);
  const mutations:((r:typeof result)=>void)[]=[
    r=>{r.provenance.corroborations=[null as never];},
    r=>{r.baselineFacilities[0].corroboration!.name={} as never;},
    r=>{r.metrics[1].group={planningArea:37 as never};},
    r=>{r.baselineFacilities[0].operationStatus='closed';},
    r=>{r.baselineFacilities[0].recordUpdated=20160728192327 as never;},
    r=>{Object.assign(r.comparisons[0],{baseline:null,scenario:null,status:'no-facilities',reductionMetres:null,distanceImproved:null,nearestChanged:false});},
  ];
  for(const mutate of mutations){const bad=structuredClone(result);mutate(bad);assert.throws(()=>parseEldercareResponse(bad));}
});
test('unknown source capacity attributes are audited and never become official capacities',()=>{
  const g=geo();g.features[0].properties.Description=g.features[0].properties.Description.replace('</table>','<tr><th>CAPACITY</th><td>42</td></tr></table>');
  const c=prepareFacilityCatalogue(JSON.stringify(g),evidence,source);
  assert.equal(c.facilities[0].capacity,null);assert.deepEqual(c.audit.unsupportedCapacityFields,['CAPACITY']);
});
test('no compatible baseline preserves null comparisons and does not invent new coverage gains',()=>{
  const c=prepareFacilityCatalogue(JSON.stringify(geo()),[{...evidence[0],serviceType:'aac-care'}],source);
  const r=simulateEldercareIntervention(c,proposal(),population(),refs(),options),m=r.metrics[0];
  assert.equal(m.comparablePopulation,0);assert.equal(m.meanBaselineMetres.value,null);
  assert.equal(m.meanScenarioMetres.value,0);assert.equal(m.thresholds[0].newlyWithinPopulation,0);
  assert.equal(m.thresholds[0].changePercentagePoints,null);assert.equal(m.thresholds[0].scenarioAccessWithoutBaselinePopulation,3);
  assert.equal(r.comparisons[0].status,'baseline-unavailable');
});
test('exact threshold boundary, unavailable proposal and equal-distance tie do not worsen access',()=>{
  const c=catalogue(),p=proposal();p.position={...c.facilities[0].position};
  const o=refs();o[0].position={...p.position};
  const r=simulateEldercareIntervention(c,p,population(),o,{...options,thresholdsMetres:[0]});
  assert.equal(r.metrics[0].noImprovementPopulation,3);assert.equal(r.metrics[0].thresholds[0].baselinePopulation,3);
  assert.equal(r.comparisons[0].nearestChanged,false);
  p.availability='assumed-unavailable';assert.equal(simulateEldercareIntervention(c,p,population(),refs(),options).metrics[0].closerPopulation,0);
});
test('unknown existing capacity and illustrative proposed capacity never limit geographic counts',()=>{
  const p=proposal();p.capacity={users:1,basis:'illustrative-assumption',rationale:'Test capacity only.'};
  const r=simulateEldercareIntervention(catalogue(),p,population(),refs(),options);
  assert.equal(r.capacity.proposedAssumedUsers,1);assert.equal(r.capacity.existingTotal,null);
  assert.equal(r.metrics[0].closerPopulation,3);assert.equal(r.capacity.serviceAllocation,'not-modelled');
});
test('empty and zero age-targeted cohorts give null means and no division by zero',()=>{
  const p=population();p.citizens.forEach(c=>c.observed.ageGroup='0_4');
  const m=simulateEldercareIntervention(catalogue(),proposal(),p,refs(),options).metrics[0];
  assert.equal(m.population,0);assert.equal(m.meanScenarioMetres.value,null);assert.equal(m.thresholds[0].scenarioShare.value,null);
  p.citizens=[];p.representedPopulation=0;assert.equal(simulateEldercareIntervention(catalogue(),proposal(),p,refs(),options).metrics[0].population,0);
});
test('identity changes with coordinates/threshold/capacity and inputs stay immutable',()=>{
  const c=catalogue(),p=proposal(),pop=population(),o=refs(),before=structuredClone([c,p,pop,o]);
  const run=()=>simulateEldercareIntervention(c,p,pop,o,options),r=run();assert.deepEqual(run(),r);assert.deepEqual([c,p,pop,o],before);
  p.position.lon+=0.001;assert.notEqual(run().scenarioId,r.scenarioId);
  assert.notEqual(simulateEldercareIntervention(c,proposal(),pop,o,{...options,thresholdsMetres:[1000]}).scenarioId,r.scenarioId);
});
test('invalid type/coordinates/weights/age cutoff and duplicate IDs/origins fail explicitly',()=>{
  const c=catalogue(),p=proposal(),pop=population(),o=refs();
  assert.throws(()=>simulateEldercareIntervention(c,{...p,serviceType:'aac-care'} as never,pop,o,options),/service/i);
  assert.throws(()=>simulateEldercareIntervention(c,{...p,position:{lat:50,lon:1}},pop,o,options),/coordinate|region/i);
  assert.throws(()=>simulateEldercareIntervention(c,p,pop,[...o,o[0]],options),/duplicate/i);
  assert.throws(()=>simulateEldercareIntervention(c,p,pop,o,{...options,minimumAge:62} as never),/age/i);
  pop.citizens[0].weight=NaN;assert.throws(()=>simulateEldercareIntervention(c,p,pop,o,options),/weight/i);
});
test('actual MOH source retains historical unknown classifications without name guessing',()=>{
  const raw=readFileSync('data/facilities/EldercareServices.geojson','utf8');
  const c=prepareFacilityCatalogue(raw);
  assert.equal(c.audit.rawRecords,133);assert.equal(c.facilities.length,133);
  assert.equal(c.facilities.filter(f=>f.serviceType==='aac').length,4);
  assert.equal(c.facilities.filter(f=>f.serviceType==='unknown').length,129);
  assert.equal(c.audit.coLocatedGroups.length,12);
});
