/** Browser-safe HTTP envelope; the citizen schema stays unchanged at v1. */
import { parseCitizenSimulation, parseCitizenProfile } from '../contracts/citizen-simulation.ts';
import type { CitizenSimulationPayload, CitizenProfileResponse } from '../contracts/citizen-simulation.ts';
import type { MrtIntervention } from '../../prototype/mrt/scenario.ts';
import type { ImpactResult, ImpactMetric, PopulationShare } from '../../prototype/agents/impact/types.ts';

export interface ImpactRequest {
  serviceDate: string; intervention: MrtIntervention;
  assumptionSetId: 'illustrative-cck-demand'; participationRate: number;
  population: { size: number; seed: string }; thresholdMinutes: number; renderLimit: number;
}
export interface ImpactResponse {
  version: 1;
  identity: { requestId: string; runId: string; request: ImpactRequest };
  payload: CitizenSimulationPayload;
  metrics: ImpactResult['metrics'];
  distributionalDifferences: ImpactResult['distributionalDifferences'];
  diagnostics: ImpactResult['diagnostics'];
}
export interface ImpactProfileResponse { requestId: string; runId: string; profile: CitizenProfileResponse }

type Obj=Record<string,unknown>;
function ensure(value:unknown,message:string):asserts value {if(!value)throw new Error(`Invalid impact data: ${message}`);}
function object(value:unknown,keys:string[],name:string):Obj {
  ensure(value && typeof value==='object' && !Array.isArray(value),name);
  const v=value as Obj;ensure(Object.keys(v).length===keys.length && keys.every(k=>Object.hasOwn(v,k)),`${name} fields`);return v;
}
function num(value:unknown,min=-Infinity,max=Infinity):number {ensure(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max,'finite number in range');return value;}
function integer(value:unknown,min:number,max:number):number {const n=num(value,min,max);ensure(Number.isSafeInteger(n),'integer');return n;}
function near(a:number,b:number):boolean {return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-6+1e-9*Math.max(Math.abs(a),Math.abs(b));}
function equal(value:unknown,expected:number|null):void {ensure(expected===null?value===null:near(num(value),expected),'consistent metric arithmetic');}
function canonical(value:unknown,depth=0):unknown {
  ensure(depth<30,'JSON nesting');
  if(value===null || typeof value==='string' || typeof value==='boolean')return value;
  if(typeof value==='number')return num(value);
  if(Array.isArray(value))return value.map(v=>canonical(v,depth+1));
  ensure(value && typeof value==='object','JSON values');
  return Object.fromEntries(Object.entries(value as Obj).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,canonical(v,depth+1)]));
}
/** Ordered stations/segments matter; object insertion order does not. */
export function canonicalImpactRequest(value:unknown):string {return JSON.stringify(canonical(value));}
export async function fingerprintImpactRequest(value:ImpactRequest):Promise<string> {
  const bytes=new TextEncoder().encode(canonicalImpactRequest(value));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function parseImpactRequest(value:unknown):ImpactRequest {
  const r=object(value,['serviceDate','intervention','assumptionSetId','participationRate','population','thresholdMinutes','renderLimit'],'request');
  ensure(typeof r.serviceDate==='string' && /^2026-\d{2}-\d{2}$/.test(r.serviceDate),'2026 service date');
  const date=new Date(`${r.serviceDate}T00:00:00Z`);ensure(Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===r.serviceDate,'calendar date');
  ensure(r.assumptionSetId==='illustrative-cck-demand','supported declared demand');num(r.participationRate,0,1);
  const p=object(r.population,['size','seed'],'population');integer(p.size,500,5000);
  ensure(typeof p.seed==='string'&&p.seed.trim().length>0&&p.seed.length<=64,'seed length');
  num(r.thresholdMinutes,0,180);integer(r.renderLimit,0,150);
  ensure(r.intervention && typeof r.intervention==='object' && !Array.isArray(r.intervention),'MRT intervention');
  const intervention=r.intervention as Obj;
  ensure(Array.isArray(intervention.stations)&&intervention.stations.length>=2&&intervention.stations.length<=40,'2–40 proposal stations');
  ensure(Array.isArray(intervention.segments)&&intervention.segments.length===intervention.stations.length-1,'contiguous proposal segment count');
  // Remaining proposal validation belongs to the existing MRT engine, not another schema.
  ensure(new TextEncoder().encode(canonicalImpactRequest(r)).byteLength<=16384,'16 KiB request limit');
  return r as unknown as ImpactRequest;
}
function share(value:unknown,denominator:number,basis:PopulationShare['denominator'],numerator?:number):void {
  const s=object(value,['value','numeratorPopulation','denominatorPopulation','denominator'],'population share');
  ensure(s.denominator===basis,'named share denominator');equal(s.denominatorPopulation,denominator);
  const n=num(s.numeratorPopulation,0);ensure(n<=denominator||near(n,denominator),'share numerator bound');
  if(numerator!==undefined)equal(n,numerator);
  equal(s.value,denominator>0?n/denominator:null);
}
function validateMetric(value:unknown,core:CitizenSimulationPayload['metrics'][number],request:ImpactRequest):ImpactMetric {
  const m=object(value,['group','coverage','outcomes','weightedBenefitingPopulation','benefiting','unchanged','weightedMeanMinutesSaved','weightedTotalMinutesSaved','weightedMeanTransferChange','accessibility'],'metric');
  ensure(canonicalImpactRequest(m.group)===canonicalImpactRequest(core.group)&&canonicalImpactRequest(m.outcomes)===canonicalImpactRequest(core.outcomes),'core metric correspondence');
  const c=object(m.coverage,['agentCount','representedPopulation','assignedPopulation','comparablePopulation','unassignedPopulation','invalidPopulation','newlyReachablePopulation','unreachablePopulation'],'coverage');
  const o=core.outcomes;
  equal(c.agentCount,core.denominator.agentCount);equal(c.representedPopulation,core.denominator.representedPopulation);
  equal(c.unassignedPopulation,o.unassigned.representedPopulation);equal(c.comparablePopulation,o.compared.representedPopulation);
  equal(c.invalidPopulation,o.invalid.representedPopulation);equal(c.newlyReachablePopulation,o['newly-reachable'].representedPopulation);equal(c.unreachablePopulation,o.unreachable.representedPopulation);
  const assigned=o.compared.representedPopulation+o['newly-reachable'].representedPopulation+o.unreachable.representedPopulation+o.invalid.representedPopulation;
  equal(c.assignedPopulation,assigned);
  equal(m.weightedBenefitingPopulation,core.weightedBenefitingPopulation);equal(m.weightedMeanMinutesSaved,core.weightedMeanMinutesSaved);
  const comparable=o.compared.representedPopulation,assessable=assigned-o.invalid.representedPopulation;
  share(m.benefiting,comparable,'comparable-population',core.weightedBenefitingPopulation);share(m.unchanged,comparable,'comparable-population');
  if(comparable>0){equal(m.weightedTotalMinutesSaved,num(m.weightedMeanMinutesSaved)*comparable);num(m.weightedMeanTransferChange);}
  else {ensure(m.weightedTotalMinutesSaved===null&&m.weightedMeanTransferChange===null,'unknown totals');}
  const a=object(m.accessibility,['thresholdMinutes','baseline','scenario','changePercentagePoints'],'accessibility');
  equal(a.thresholdMinutes,request.thresholdMinutes);share(a.baseline,assessable,'assigned-noninvalid-population');share(a.scenario,assessable,'assigned-noninvalid-population');
  const before=(a.baseline as unknown as PopulationShare).value,after=(a.scenario as unknown as PopulationShare).value;
  equal(a.changePercentagePoints,before!==null&&after!==null?100*(after-before):null);
  return m as unknown as ImpactMetric;
}
export async function parseImpactResponse(value:unknown,expectedRequest:ImpactRequest):Promise<ImpactResponse> {
  const r=object(value,['version','identity','payload','metrics','distributionalDifferences','diagnostics'],'response');ensure(r.version===1,'HTTP envelope version');
  const expected=parseImpactRequest(expectedRequest),identity=object(r.identity,['requestId','runId','request'],'identity');
  const submitted=parseImpactRequest(identity.request);
  ensure(canonicalImpactRequest(submitted)===canonicalImpactRequest(expected),'exact submitted proposal/configuration');
  ensure(identity.requestId===await fingerprintImpactRequest(expected),'request fingerprint');
  const p=parseCitizenSimulation(r.payload);
  ensure(identity.runId===p.metadata.scenarioId && /^impact-[a-f0-9]{24}$/.test(String(identity.runId)),'calculated run identity');
  ensure(p.metadata.simulationDate===expected.serviceDate && p.metadata.intervention.id===expected.intervention.id && p.metadata.intervention.type==='mrt-line','proposal/date correspondence');
  ensure(p.metadata.demographicReferenceYear===2020 && p.sources.every(s=>s.kind==='government-statistics'),'Census-grounded source');
  ensure(p.metadata.population.agentCount===expected.population.size&&p.metadata.population.seed===expected.population.seed,'population settings');
  ensure(p.citizens.length<=expected.renderLimit&&p.animations.length===0,'bounded profile-only sample');
  ensure(Array.isArray(r.metrics)&&r.metrics.length===p.metrics.length&&r.metrics.length>0&&r.metrics.length<=80,'metric count');
  const metrics=r.metrics.map((m,i)=>validateMetric(m,p.metrics[i],expected));
  ensure(Object.keys(metrics[0].group).length===0,'overall metric first');
  ensure(Array.isArray(r.distributionalDifferences)&&r.distributionalDifferences.length===metrics.length-1,'distributional comparisons');
  for(let i=0;i<r.distributionalDifferences.length;i++) {
    const d=object(r.distributionalDifferences[i],['group','meanMinutesSavedDifferenceFromOverall','benefitingShareDifferencePercentagePoints','assessment'],'distributional difference');
    const m=metrics[i+1],overall=metrics[0];ensure(canonicalImpactRequest(d.group)===canonicalImpactRequest(m.group),'distributional group');
    equal(d.meanMinutesSavedDifferenceFromOverall,m.weightedMeanMinutesSaved!==null&&overall.weightedMeanMinutesSaved!==null?m.weightedMeanMinutesSaved-overall.weightedMeanMinutesSaved:null);
    equal(d.benefitingShareDifferencePercentagePoints,m.benefiting.value!==null&&overall.benefiting.value!==null?100*(m.benefiting.value-overall.benefiting.value):null);
    const assessment=m.benefiting.value===null?'unknown':m.weightedBenefitingPopulation===0?'no-comparable-benefit':m.weightedBenefitingPopulation===m.coverage.comparablePopulation?'all-comparable-benefit':'some-comparable-benefit';
    ensure(d.assessment===assessment,'benefit assessment');
  }
  const diagnostics=object(r.diagnostics,['uniqueOdPairs','routingCalls','assignmentsByReason'],'diagnostics');
  integer(diagnostics.uniqueOdPairs,0,3);ensure(diagnostics.routingCalls===1,'single deduplicated routing call');
  const reasons=object(diagnostics.assignmentsByReason,['assigned','ineligible','not-specified','not-participating','missing-geography','outside-catchment'],'assignment reasons');
  let count=0,population=0;
  for(const reason of Object.values(reasons)){const bucket=object(reason,['agents','population'],'assignment reason');count+=integer(bucket.agents,0,5000);population+=num(bucket.population,0);}
  ensure(count===p.metadata.population.agentCount,'diagnostic agent total');equal(population,p.metadata.population.representedPopulation);
  return r as unknown as ImpactResponse;
}
export function parseImpactProfileResponse(value:unknown,expected:ImpactResponse):ImpactProfileResponse {
  const p=object(value,['requestId','runId','profile'],'profile response');
  ensure(p.requestId===expected.identity.requestId&&p.runId===expected.identity.runId,'profile run binding');
  const profile=parseCitizenProfile(p.profile);
  ensure(canonicalImpactRequest(profile.metadata)===canonicalImpactRequest(expected.payload.metadata),'profile scenario context');
  ensure(canonicalImpactRequest(profile.sources)===canonicalImpactRequest(expected.payload.sources)&&canonicalImpactRequest(profile.assumptions)===canonicalImpactRequest(expected.payload.assumptions),'profile provenance context');
  ensure(profile.animation===null,'no fabricated profile coordinates');
  return p as unknown as ImpactProfileResponse;
}
