import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { prepareCensus, AGE_GROUPS } from '../../../prototype/agents/prepare.ts';
import { generatePopulation } from '../../../prototype/agents/generate.ts';
import { runMapSimulation } from '../../server/mrt-service.ts';
import { illustrativeLine } from '../../../prototype/mrt/examples/illustrative-line.ts';
import * as contract from '../citizen-simulation.ts';
import * as fixtures from '../citizen-simulation.fixtures.ts';

function sample(): any {
  return structuredClone(fixtures.illustrativeCitizenSimulation);
}
function profile(): any { return structuredClone(fixtures.illustrativeCitizenProfile); }
function rejects(change: (p: any) => void): void {
  const value = sample(); change(value);
  assert.throws(() => contract.parseCitizenSimulation(value));
}

test('illustrative improved, unchanged, unassigned and unavailable cases survive JSON round trip', () => {
  const parsed = contract.parseCitizenSimulation(JSON.parse(JSON.stringify(sample())));
  assert.equal(parsed.citizens.length, 4);
  assert.equal(parsed.journeys[0].comparison?.minutesSaved, 10);
  assert.equal(parsed.journeys[1].comparison?.minutesSaved, 0);
  assert.equal(parsed.journeys[2].comparison, null);
  assert.equal(parsed.journeys[3].comparison?.scenarioMinutes, null);
  assert.equal(parsed.metrics[0].weightedBenefitingPopulation, 100);
  assert.equal(parsed.metrics[0].validJourneyAgents, 2);
  assert.equal(parsed.metadata.resultKind, 'illustrative');
});

test('unsupported versions, nonobjects and undeclared fields fail closed', () => {
  for (const input of [null, [], 'payload', {}, {schemaVersion: 2}]) {
    assert.throws(() => contract.parseCitizenSimulation(input));
  }
  rejects(p => { p.schemaVersion = 2; });
  rejects(p => { p.citizens[0].income = 1000; });
  rejects(p => { p.metadata.simulationDate = '2026-02-30'; });
});

test('synthetic identity rejects malformed and duplicate IDs and broken references', () => {
  for (const id of ['', 'real-person-1', 'syn-abc-1', 'syn-0123456789abcdef-0']) {
    rejects(p => { p.citizens[0].agentId = id; });
  }
  rejects(p => { p.citizens[1].agentId = p.citizens[0].agentId; });
  rejects(p => { p.journeys[0].agentId = 'syn-0123456789abcdef-99'; });
  rejects(p => { p.animations[0].journeyId = 'missing-journey'; });
  rejects(p => { p.citizens[0].sourceId = 'missing-source'; });
});

test('population weights must be positive and finite, including after JSON conversion', () => {
  for (const weight of [-1, 0, NaN, Infinity, -Infinity, null, '100']) {
    rejects(p => { p.citizens[0].weight = weight; });
  }
  rejects(p => { p.metadata.population.representedPopulation = Infinity; });
});

test('fractional expansion weights and more agents than residents are supported', () => {
  const p = sample();
  p.citizens = [p.citizens[0]]; p.citizens[0].weight = 0.25;
  p.journeys = []; p.animations = []; p.metrics = [];
  p.metadata.population.agentCount = 4;
  p.metadata.population.representedPopulation = 1;
  assert.doesNotThrow(() => contract.assertCitizenSimulation(p));
});

test('all generator age bands are supported while malformed demographics are rejected', () => {
  for (const ageGroup of AGE_GROUPS) {
    const p = sample(); p.citizens[0].demographic.ageGroup = ageGroup;
    assert.doesNotThrow(() => contract.parseCitizenSimulation(p));
  }
  rejects(p => { p.citizens[0].demographic.ageGroup = 'elderly'; });
  rejects(p => { p.citizens[0].demographic.sex = 'unknown'; });
  rejects(p => { p.citizens[0].demographic.subzone = 'Cheng San'; });
  rejects(p => { p.citizens[0].demographic.planningArea = 'uncovered-area'; });
});

test('WGS84 named coordinates reject bad axes, out-of-range and nonfinite numbers', () => {
  for (const position of [{lat: 103.8, lon: 1.3}, {lat: 91, lon: 0}, {lat: 0, lon: -181}, {lat: NaN, lon: 103}, {lat: 1.3}, [103.8, 1.3]]) {
    rejects(p => { p.animations[0].position = position; });
  }
  rejects(p => { p.animations[0].waypoints[0].lon = Infinity; });
});

test('source provenance and reference year cannot be missing or relabelled as observed citizens', () => {
  rejects(p => { delete p.sources[0].rawSha256; });
  rejects(p => { delete p.sources[0].licenceUrl; });
  rejects(p => { p.sources[0].referenceYear = 2026; });
  rejects(p => { p.metadata.resultKind = 'observed'; });
  rejects(p => { p.metadata.resultKind = 'modelled'; }); // synthetic-fixture source
  rejects(p => { p.citizens[0].synthetic = false; });
  rejects(p => { p.journeys[0].assignment = 'observed'; });
});

test('assumption references must be declared and appropriate for journeys or visuals', () => {
  rejects(p => { p.journeys[0].assumptionIds = []; });
  rejects(p => { p.journeys[0].assumptionIds = ['missing']; });
  rejects(p => { p.journeys[0].assumptionIds = ['schematic-map']; });
  rejects(p => { p.animations[0].visualisation.assumptionIds = ['assigned-od']; });
});

test('nullable results follow reachable and unavailable route statuses, never invented zeroes', () => {
  rejects(p => { p.journeys[3].comparison.scenarioMinutes = 0; });
  rejects(p => { p.journeys[0].comparison.baselineMinutes = null; });
  rejects(p => { p.journeys[0].comparison.scenarioMinutes = NaN; });
  rejects(p => { p.journeys[0].comparison.baselineTransfers = -1; });
  rejects(p => { p.journeys[0].comparison.status = 'complete'; });
  rejects(p => { p.journeys[0].comparison.minutesSaved = -10; });
  rejects(p => { p.journeys[0].comparison.transferChange = 2; });
});

test('unassigned journeys cannot carry a computed comparison or animation travel', () => {
  rejects(p => { p.journeys[2].comparison = p.journeys[0].comparison; });
  rejects(p => { p.journeys[2].assumptionIds = ['assigned-od']; });
  rejects(p => { p.animations[0].agentId = p.citizens[2].agentId; p.animations[0].journeyId = p.journeys[2].id; });
});

test('newly reachable and baseline-reachable scenario-unreachable comparisons retain engine semantics', () => {
  const p = sample(); const c = p.journeys[3].comparison;
  Object.assign(c, {status:'newly-reachable', baselineStatus:'station-unavailable', scenarioStatus:'reachable', scenarioMinutes:12, scenarioTransfers:0, usedProposedLine:true});
  assert.doesNotThrow(() => contract.parseCitizenSimulation(p));
  Object.assign(c, {status:'unreachable', baselineStatus:'reachable', baselineMinutes:20, baselineTransfers:1, scenarioStatus:'unreachable', scenarioMinutes:null, scenarioTransfers:null, usedProposedLine:null});
  assert.doesNotThrow(() => contract.parseCitizenSimulation(p));
  c.status = 'compared';
  assert.throws(() => contract.parseCitizenSimulation(p));
});

test('zero-duration and negative-saving comparisons preserve signs and null percentage', () => {
  const p = sample(); const c = p.journeys[0].comparison;
  Object.assign(c, {baselineMinutes:0, scenarioMinutes:0, minutesSaved:0, percentageChange:null, baselineTransfers:0, scenarioTransfers:0, transferChange:0});
  assert.doesNotThrow(() => contract.parseCitizenSimulation(p));
  c.percentageChange = 0;
  assert.throws(() => contract.parseCitizenSimulation(p));
  Object.assign(c, {baselineMinutes:10, scenarioMinutes:15, minutesSaved:-5, percentageChange:50});
  assert.doesNotThrow(() => contract.parseCitizenSimulation(p));
});

test('demographic outcome buckets reconcile counts and weights to group denominator', () => {
  rejects(p => { p.metrics[0].denominator.agentCount = 5; });
  rejects(p => { p.metrics[0].denominator.representedPopulation = 201; });
  rejects(p => { p.metrics[0].outcomes.compared.agents = 1; });
  rejects(p => { p.metrics[0].outcomes.invalid.agents = -1; });
  rejects(p => { p.metrics[0].outcomes.invalid.representedPopulation = 1; });
  rejects(p => { p.metrics[0].validJourneyAgents = 3; });
  rejects(p => { p.metrics[0].group = {subzone:'cheng-san'}; });
});

test('benefit and mean use only finite comparable weighted journeys', () => {
  rejects(p => { p.metrics[0].weightedBenefitingPopulation = 151; });
  rejects(p => { p.metrics[0].weightedMeanMinutesSaved = null; });
  rejects(p => { p.metrics[0].weightedMeanMinutesSaved = Infinity; });
  const p = sample(); const m = p.metrics[0];
  m.outcomes.unassigned = {agents:3, representedPopulation:170};
  m.outcomes.compared = {agents:0, representedPopulation:0};
  m.validJourneyAgents = 0; m.weightedBenefitingPopulation = 0; m.weightedMeanMinutesSaved = null;
  assert.doesNotThrow(() => contract.parseCitizenSimulation(p));
});

test('empty group has null mean, while overlapping groups are independent and render samples are subsets', () => {
  const p = sample(); p.citizens = p.citizens.slice(0,1); p.journeys = p.journeys.slice(0,1);
  p.metrics.push({...structuredClone(p.metrics[0]), id:'overlapping-age-group', group:{ageGroup:'65_69'}});
  assert.doesNotThrow(() => contract.parseCitizenSimulation(p));
  const m = p.metrics[0]; m.denominator = {agentCount:0, representedPopulation:0};
  for (const key of Object.keys(m.outcomes)) m.outcomes[key] = {agents:0, representedPopulation:0};
  m.validJourneyAgents = 0; m.weightedBenefitingPopulation = 0; m.weightedMeanMinutesSaved = null;
  assert.doesNotThrow(() => contract.parseCitizenSimulation(p));
});

test('full-coverage metric denominators must match population metadata, including empty claims', () => {
  rejects(p => {
    const m=p.metrics[0]; m.group={}; m.denominator={agentCount:0,representedPopulation:0};
    for (const key of Object.keys(m.outcomes)) m.outcomes[key]={agents:0,representedPopulation:0};
    m.validJourneyAgents=0; m.weightedBenefitingPopulation=0; m.weightedMeanMinutesSaved=null;
  });
  rejects(p => { p.metrics[0].group={}; p.metadata.population.agentCount=5; });
});

test('a complete returned population must conserve its full expansion weight', () => {
  rejects(p => { p.citizens[0].weight=1; });
  const p=sample(); p.citizens=p.citizens.slice(0,1); p.journeys=p.journeys.slice(0,1);
  assert.doesNotThrow(() => contract.parseCitizenSimulation(p));
});

test('weighted mean signs cannot contradict zero or universal beneficiaries', () => {
  rejects(p => { p.metrics[0].weightedBenefitingPopulation=0; });
  rejects(p => { p.metrics[0].weightedBenefitingPopulation=150; p.metrics[0].weightedMeanMinutesSaved=0; });
  rejects(p => { p.metrics[0].weightedBenefitingPopulation=150; p.metrics[0].weightedMeanMinutesSaved=-1; });
});

test('schematic visual state cannot masquerade as observed travel or carry unrelated results', () => {
  rejects(p => { p.animations[0].visualisation.kind = 'observed'; });
  rejects(p => { p.animations[0].visualisation.geometry = 'rail-alignment'; });
  rejects(p => { p.animations[0].visualisation.geometry = 'none'; });
  rejects(p => { p.animations[0].minutesSaved = 999; });
  rejects(p => { p.animations[0].state = 'teleporting'; });
  rejects(p => { p.animations[0].waypoints = [p.animations[0].waypoints[0]]; });
});

test('selected citizen profile validates provenance, assumed activity and matching outcome', () => {
  const selected = profile();
  const parsed = contract.parseCitizenProfile(JSON.parse(JSON.stringify(selected)));
  assert.equal(parsed.citizen.synthetic, true);
  assert.equal(parsed.journey?.comparison?.minutesSaved, 10);
  selected.activity.status = 'observed';
  assert.throws(() => contract.parseCitizenProfile(selected));
  const other = profile();
  other.journey.agentId = 'syn-0123456789abcdef-2';
  assert.throws(() => contract.parseCitizenProfile(other));
});

test('unassigned profile contains no invented daily routine or quantitative effects', () => {
  const p = profile();
  const fixture = sample(); p.citizen = fixture.citizens[2]; p.journey = fixture.journeys[2]; p.animation = null;
  p.activity = {status:'unassigned', assumptionIds:[], description:null, destinationCategories:[], transportPreferences:[]};
  assert.doesNotThrow(() => contract.assertCitizenProfile(p));
  p.activity.description = 'Observed commuter';
  assert.throws(() => contract.parseCitizenProfile(p));
});

test('real generator identities and provenance fit the shared citizen reference without changing weights', () => {
  const csv = readFileSync(new URL('../../../data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv', import.meta.url), 'utf8');
  const population = generatePopulation(prepareCensus(csv), {size:500, seed:'contract-test', planningAreas:['Ang Mo Kio']});
  const p = sample(); const citizen = population.citizens[0];
  p.metadata.resultKind = 'modelled';
  p.metadata.population = {seed:population.seed, method:population.method, agentCount:population.citizens.length, representedPopulation:population.representedPopulation};
  p.sources = [{id:'census', ...population.source}];
  p.assumptions.push({id:'nil-negligible-as-zero',kind:'population',description:'Nil/negligible source markers approximated as zero.'});
  p.metadata.assumptionIds.push('nil-negligible-as-zero');
  p.citizens = [{agentId:citizen.id, synthetic:true, demographic:citizen.observed, weight:citizen.weight, sourceId:'census', sourceRow:citizen.provenance.sourceRow}];
  p.journeys=[]; p.animations=[]; p.metrics=[];
  assert.doesNotThrow(() => contract.parseCitizenSimulation(p));
  assert.equal(contract.parseCitizenSimulation(p).citizens[0].weight,citizen.weight);
});

test('real compact MRT results retain existing values when route geometry is projected separately', () => {
  const result=runMapSimulation({serviceDate:'2026-10-27',intervention:illustrativeLine,journeys:[{origin:'NS4',destination:'NE16'}]});
  const {baselineRoute,scenarioRoute,...comparison}=result.comparisons[0];
  const p=sample(); p.journeys[0].comparison=comparison; p.metrics=[];
  const parsed=contract.parseCitizenSimulation(p);
  assert.equal(parsed.journeys[0].comparison?.scenarioMinutes,20);
  assert.equal(Number(parsed.journeys[0].comparison?.baselineMinutes?.toFixed(2)),62.77);
  // Independent source: stops.txt physical row 18, canonical NS4 parent.
  assert.deepEqual(baselineRoute?.coordinates[0],[103.744369,1.38517205]);
  assert.ok(scenarioRoute && scenarioRoute.coordinates.length>2);
});

test('public contract imports successfully when Node-only modules are unavailable', () => {
  const url=new URL('../citizen-simulation.ts',import.meta.url).href;
  const code=`import {registerHooks,builtinModules} from 'node:module';
    registerHooks({resolve(specifier,context,next) {
      if(specifier.startsWith('node:') || builtinModules.includes(specifier)) throw new Error('Node import at browser boundary');
      return next(specifier,context);
    }});
    const contract=await import(${JSON.stringify(url)});
    if(typeof contract.parseCitizenSimulation!=='function') throw new Error('Missing parser');`;
  const result=spawnSync(process.execPath,['--input-type=module','--eval',code],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
