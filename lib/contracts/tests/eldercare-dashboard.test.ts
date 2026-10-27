import test from 'node:test';
import assert from 'node:assert/strict';
import type { EldercareMetric } from '../../../prototype/eldercare/types.ts';
import { formatPopulation,formatDistance,formatShare,formatPercentagePoints,metricDimension,metricLabel,overallMetric,groupMetrics,presentMetric } from '../../eldercare/dashboard.ts';

// Hand-authored weights deliberately differ between baseline, scenario and paired populations.
const metric:EldercareMetric={group:{},agentCount:10,population:120,locatedPopulation:90,unlocatedPopulation:30,comparablePopulation:60,existingFacilityPopulation:60,scenarioFacilityPopulation:90,baselineUnavailablePopulation:30,closerPopulation:20,noImprovementPopulation:40,
  meanBaselineMetres:{value:640,denominatorPopulation:60,denominator:'baseline-assessable-population'},
  meanScenarioMetres:{value:390,denominatorPopulation:90,denominator:'scenario-assessable-population'},
  meanReductionMetres:{value:80,denominatorPopulation:60,denominator:'comparable-population'},
  thresholds:[{metres:500,baselinePopulation:15,scenarioPopulation:60,newlyWithinPopulation:20,scenarioAccessWithoutBaselinePopulation:25,baselineShare:{value:.25,numeratorPopulation:15,denominatorPopulation:60,denominator:'baseline-assessable-population'},scenarioShare:{value:2/3,numeratorPopulation:60,denominatorPopulation:90,denominator:'scenario-assessable-population'},pairedBaselineShare:{value:.25,numeratorPopulation:15,denominatorPopulation:60,denominator:'comparable-population'},pairedScenarioShare:{value:35/60,numeratorPopulation:35,denominatorPopulation:60,denominator:'comparable-population'},changePercentagePoints:33.333333333333336}]};

test('formats null as unknown and preserves valid zero results',()=>{
  assert.equal(formatPopulation(44520),'44,520');
  assert.equal(formatDistance(null),'Unknown');
  assert.equal(formatDistance(0),'0 m');
  assert.equal(formatDistance(410.442),'410.4 m');
  assert.equal(formatShare(null),'Unknown');
  assert.equal(formatShare(0),'0%');
  assert.equal(formatShare(.375602),'37.6%');
  assert.equal(formatPercentagePoints(null),'Unknown');
  assert.equal(formatPercentagePoints(0),'0 pp');
  assert.equal(formatPercentagePoints(33.3333),'+33.3 pp');
});
test('presents stored means with their actual denominators without subtracting unlike means',()=>{
  const view=presentMetric(metric,500);
  assert.equal(view.baselineDistance,'640 m');
  assert.equal(view.scenarioDistance,'390 m');
  assert.equal(view.reductionDistance,'80 m');
  assert.equal(view.baselineDenominator,'60 baseline-assessable population');
  assert.equal(view.scenarioDenominator,'90 scenario-assessable population');
  assert.equal(view.reductionDenominator,'60 comparable population');
  assert.equal(view.threshold?.baselineShare.denominatorPopulation,60);
  assert.equal(view.threshold?.scenarioShare.denominatorPopulation,90);
  assert.equal(view.threshold?.pairedScenarioShare.denominatorPopulation,60);
  assert.equal(view.threshold?.newlyWithinPopulation,20);
  assert.equal(view.threshold?.scenarioAccessWithoutBaselinePopulation,25);
  assert.equal(view.metric.unlocatedPopulation,30);
});
test('does not substitute a threshold when the selected threshold is absent',()=>{
  assert.equal(presentMetric(metric,400).threshold,null);
});
test('keeps no-baseline distance and paired gain unknown, distinct from scenario access',()=>{
  const noBaseline:EldercareMetric={...metric,comparablePopulation:0,existingFacilityPopulation:0,baselineUnavailablePopulation:90,closerPopulation:0,noImprovementPopulation:0,meanBaselineMetres:{value:null,denominatorPopulation:0,denominator:'baseline-assessable-population'},meanReductionMetres:{value:null,denominatorPopulation:0,denominator:'comparable-population'},thresholds:[{metres:500,baselinePopulation:0,scenarioPopulation:60,newlyWithinPopulation:0,scenarioAccessWithoutBaselinePopulation:60,baselineShare:{value:null,numeratorPopulation:0,denominatorPopulation:0,denominator:'baseline-assessable-population'},scenarioShare:{value:2/3,numeratorPopulation:60,denominatorPopulation:90,denominator:'scenario-assessable-population'},pairedBaselineShare:{value:null,numeratorPopulation:0,denominatorPopulation:0,denominator:'comparable-population'},pairedScenarioShare:{value:null,numeratorPopulation:0,denominatorPopulation:0,denominator:'comparable-population'},changePercentagePoints:null}]};
  const view=presentMetric(noBaseline,500);
  assert.equal(view.baselineDistance,'Unknown');
  assert.equal(view.reductionDistance,'Unknown');
  assert.equal(view.scenarioDistance,'390 m');
  assert.equal(view.metric.baselineUnavailablePopulation,90);
  assert.equal(view.metric.unlocatedPopulation,30);
  assert.equal(view.threshold?.changePercentagePoints,null);
  assert.equal(view.threshold?.newlyWithinPopulation,0);
  assert.equal(view.threshold?.scenarioAccessWithoutBaselinePopulation,60);
});
test('preserves zero paired gain even when some population has a closer AAC',()=>{
  const zeroGain={...metric,thresholds:[{...metric.thresholds[0],newlyWithinPopulation:0,changePercentagePoints:0}]};
  const view=presentMetric(zeroGain,500);
  assert.equal(view.reductionDistance,'80 m');
  assert.equal(view.metric.closerPopulation,20);
  assert.equal(view.threshold?.newlyWithinPopulation,0);
  assert.equal(formatPercentagePoints(view.threshold?.changePercentagePoints??null),'0 pp');
});
test('selects authoritative single-dimension metrics without summing overlapping groups',()=>{
  const age90={...metric,group:{ageGroup:'90andOver' as const}};
  const age60={...metric,group:{ageGroup:'60_64' as const}};
  const area={...metric,group:{planningArea:'bukit-merah'}};
  const zone={...metric,group:{planningArea:'bukit-merah',subzone:'tiong-bahru-station'}};
  const sex={...metric,group:{sex:'female' as const}};
  const metrics=[age90,zone,metric,sex,area,age60];
  assert.equal(overallMetric(metrics),metric);
  assert.equal(metricDimension(zone),'subzone');
  assert.equal(metricDimension(area),'planningArea');
  assert.equal(metricLabel(age90),'90+ years');
  assert.equal(metricLabel(age60),'60–64 years');
  assert.equal(metricLabel(zone),'Tiong Bahru Station · Bukit Merah');
  assert.deepEqual(groupMetrics(metrics,'ageGroup','group'),[age60,age90]);
  assert.deepEqual(groupMetrics(metrics,'planningArea','group'),[area]);
  assert.deepEqual(groupMetrics(metrics,'sex','group'),[sex]);
  assert.equal(overallMetric([area]),undefined);
});
test('sorts stored measures descending, keeps null last and leaves server order untouched',()=>{
  const low={...metric,group:{sex:'male' as const},closerPopulation:0,meanReductionMetres:{...metric.meanReductionMetres,value:0},unlocatedPopulation:100};
  const high={...metric,group:{sex:'female' as const},closerPopulation:20};
  const missing={...metric,group:{sex:'male' as const},meanReductionMetres:{...metric.meanReductionMetres,value:null}};
  const metrics=[low,high];
  assert.deepEqual(groupMetrics(metrics,'sex','closer'),[high,low]);
  assert.deepEqual(groupMetrics(metrics,'sex','unlocated'),[low,high]);
  assert.deepEqual(groupMetrics([missing,low,high],'sex','reduction'),[high,low,missing]);
  assert.deepEqual(metrics,[low,high]);
});
