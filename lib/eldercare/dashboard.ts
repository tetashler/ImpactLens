import type { EldercareMetric, WeightedMeasure } from '../../prototype/eldercare/types.ts';

export type EldercareDimension = 'ageGroup' | 'sex' | 'planningArea' | 'subzone';
export type EldercareSort = 'group' | 'closer' | 'reduction' | 'unlocated';
const numberFormat=new Intl.NumberFormat('en-SG',{maximumFractionDigits:1});
export function formatPopulation(value:number):string { return numberFormat.format(value); }
export function formatDistance(value:number|null):string { return value===null?'Unknown':`${numberFormat.format(value)} m`; }
export function formatShare(value:number|null):string { return value===null?'Unknown':`${numberFormat.format(value*100)}%`; }
export function formatPercentagePoints(value:number|null):string { return value===null?'Unknown':`${value>0?'+':''}${numberFormat.format(value)} pp`; }
export function metricDimension(metric:EldercareMetric):EldercareDimension|'overall' {
  if(metric.group.subzone!==undefined)return 'subzone';
  if(metric.group.planningArea!==undefined)return 'planningArea';
  if(metric.group.ageGroup!==undefined)return 'ageGroup';
  if(metric.group.sex!==undefined)return 'sex';
  return 'overall';
}
function geographicLabel(value:string):string { return value.split('-').map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(' '); }
export function metricLabel(metric:EldercareMetric):string {
  const {ageGroup,sex,planningArea,subzone}=metric.group;
  if(subzone!==undefined)return `${geographicLabel(subzone)}${planningArea?` · ${geographicLabel(planningArea)}`:''}`;
  if(planningArea!==undefined)return geographicLabel(planningArea);
  if(ageGroup!==undefined)return ageGroup==='90andOver'?'90+ years':`${ageGroup.replace('_','–')} years`;
  if(sex!==undefined)return sex==='female'?'Female':'Male';
  return 'All age-targeted residents';
}
export function overallMetric(metrics:readonly EldercareMetric[]):EldercareMetric|undefined { return metrics.find(metric=>metricDimension(metric)==='overall'); }
export function groupMetrics(metrics:readonly EldercareMetric[],dimension:EldercareDimension,sort:EldercareSort):EldercareMetric[] {
  return metrics.filter(metric=>metricDimension(metric)===dimension).sort((a,b)=>{
    if(sort!=='group') {
      const value=(metric:EldercareMetric)=>sort==='closer'?metric.closerPopulation:sort==='unlocated'?metric.unlocatedPopulation:metric.meanReductionMetres.value;
      const av=value(a),bv=value(b);
      if(av===null && bv!==null)return 1;
      if(bv===null && av!==null)return -1;
      if(av!==null && bv!==null && av!==bv)return bv-av;
    }
    if(dimension==='ageGroup')return parseInt(a.group.ageGroup!,10)-parseInt(b.group.ageGroup!,10);
    return metricLabel(a).localeCompare(metricLabel(b),'en-SG');
  });
}
function denominatorLabel(measure:WeightedMeasure):string { return `${formatPopulation(measure.denominatorPopulation)} ${measure.denominator.replace('-population',' population')}`; }
// Presentation only: read each server measure independently; never infer a gain from two means.
export function presentMetric(metric:EldercareMetric,thresholdMetres:number) {
  return {metric,threshold:metric.thresholds.find(t=>t.metres===thresholdMetres)??null,
    baselineDistance:formatDistance(metric.meanBaselineMetres.value),scenarioDistance:formatDistance(metric.meanScenarioMetres.value),reductionDistance:formatDistance(metric.meanReductionMetres.value),
    baselineDenominator:denominatorLabel(metric.meanBaselineMetres),scenarioDenominator:denominatorLabel(metric.meanScenarioMetres),reductionDenominator:denominatorLabel(metric.meanReductionMetres)};
}
