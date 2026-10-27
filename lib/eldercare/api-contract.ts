/** Browser-safe HTTP boundary; Phase 6A owns all accessibility metric structures. */
import { parseEldercareResponse } from '../../prototype/eldercare/contract.ts';
import type { EldercareResponse, EldercareIntervention, AccessibilityOptions, Facility, FacilityCatalogue } from '../../prototype/eldercare/types.ts';
import { parseEldercareIntervention, validateOptions } from '../../prototype/eldercare/scenario.ts';
import { ensure, object, text, id, source, validateFacility } from '../../prototype/eldercare/validation.ts';
import { demonstrationIntervention } from '../../prototype/eldercare/preset.ts';

export const ELDERCARE_API_LIMITS={requestBytes:16384,responseBytes:524288,facilitiesBytes:65536,minPopulation:1000,maxPopulation:5000,maxThresholds:8,maxMetres:5000,minWalkingSpeed:0.1,maxWalkingSpeed:2.5,maxCapacity:10000} as const;
export const ELDERCARE_LIMITATIONS=[
  'Limited corroborated AAC subset based on historical MOH coordinates and operator listings; not all AACs in Bukit Merah or Singapore.',
  'Historical coordinates and unconfirmed current opening status; existing capacity is unknown.',
  'Census 2020 age bands and two public landmark proxies, not observed homes or confirmed service eligibility; unlocated residents remain unknown.',
  'Straight-line geographic access, not pedestrian routes, attendance, care placement or health/social outcomes.',
] as const;
export interface EldercareApiRequest {
  version:1;clientRequestId:string;preset:'bukit-merah-landmarks-v1';
  population:{size:number;seed:string};intervention:EldercareIntervention;options:AccessibilityOptions;
}
export interface FacilitiesResponse {
  version:1;source:FacilityCatalogue['source'];coverage:'limited-corroborated-aac-subset';
  summary:{historicalPoints:number;corroboratedAac:number;unknownServicePoints:number;aacCareIncluded:number;invalidExcluded:number};
  facilities:Facility[];limitations:string[];
}
export interface EldercareApiResponse {
  version:1;identity:{clientRequestId:string;requestFingerprint:string;scenarioId:string};request:EldercareApiRequest;result:EldercareResponse;limitations:string[];
}
function boundedText(v:unknown,max:number,label:string):asserts v is string {text(v,label);ensure(v.length<=max,`${label} exceeds limit`);}
function token(v:unknown):asserts v is string {id(v,'request identifier');ensure(v.length<=64,'Request identifier too long');}
export function validateJsonBudget(value:unknown):void {
  let nodes=0;
  function visit(v:unknown,depth:number):void {
    ensure(depth<=12 && ++nodes<=512,'JSON nesting/shape exceeds limit');
    if(typeof v==='string')ensure(v.length<=1000,'Text exceeds JSON budget');
    if(v!==null && typeof v==='object')for(const child of Object.values(v))visit(child,depth+1);
  }
  visit(value,0);
}
export function createDefaultEldercareRequest(clientRequestId:string):EldercareApiRequest {
  token(clientRequestId);
  return {version:1,clientRequestId,preset:'bukit-merah-landmarks-v1',population:{size:2000,seed:'eldercare-demo'},intervention:structuredClone(demonstrationIntervention),options:{referenceDate:'2026-10-27',minimumAge:60,thresholdsMetres:[500,1000],existingAvailability:'assume-listed-available',eligibility:'age-only-other-criteria-unknown'}};
}
export function parseEldercareApiRequest(value:unknown):EldercareApiRequest {
  validateJsonBudget(value);object(value,['version','clientRequestId','preset','population','intervention','options'],'API request');
  ensure(value.version===1 && value.preset==='bukit-merah-landmarks-v1','Unsupported API version/preset');token(value.clientRequestId);
  object(value.population,['size','seed'],'population settings');const population=value.population;
  ensure(typeof population.size==='number' && Number.isSafeInteger(population.size) && population.size>=ELDERCARE_API_LIMITS.minPopulation && population.size<=ELDERCARE_API_LIMITS.maxPopulation,'Population size outside supported bounds');boundedText(population.seed,80,'population seed');
  const intervention=parseEldercareIntervention(value.intervention);
  ensure(intervention.id.length<=64,'Intervention ID exceeds limit');boundedText(intervention.name,160,'centre name');boundedText(intervention.rationale,1000,'rationale');
  ensure(intervention.assumptions.length<=8,'Too many assumptions');for(const a of intervention.assumptions){ensure(a.id.length<=64,'Assumption ID exceeds limit');boundedText(a.description,1000,'assumption description');}
  if(intervention.capacity){ensure(intervention.capacity.users<=ELDERCARE_API_LIMITS.maxCapacity,'Illustrative capacity exceeds limit');boundedText(intervention.capacity.rationale,1000,'capacity rationale');}
  const options=value.options as AccessibilityOptions;validateOptions(options);
  ensure(options.referenceDate>='2026-10-27' && options.referenceDate<='2030-12-31','Reference date outside supported preset range');
  ensure(options.thresholdsMetres.length<=ELDERCARE_API_LIMITS.maxThresholds && options.thresholdsMetres.every(t=>t<=ELDERCARE_API_LIMITS.maxMetres),'Distance thresholds exceed bounds');
  if(options.straightLineWalkingMetresPerSecond!==undefined)ensure(options.straightLineWalkingMetresPerSecond>=ELDERCARE_API_LIMITS.minWalkingSpeed && options.straightLineWalkingMetresPerSecond<=ELDERCARE_API_LIMITS.maxWalkingSpeed,'Walking-speed assumption outside bounds');
  // Stable field order preserves the existing engine's JSON identity and CLI parity.
  const p:EldercareIntervention={schemaVersion:1,id:intervention.id,name:intervention.name,serviceType:'aac',status:'hypothetical',position:{lat:intervention.position.lat,lon:intervention.position.lon},availability:intervention.availability,capacity:intervention.capacity?{users:intervention.capacity.users,basis:'illustrative-assumption',rationale:intervention.capacity.rationale}:null,eligibility:intervention.eligibility,rationale:intervention.rationale,assumptions:intervention.assumptions.map(a=>({id:a.id,description:a.description}))};
  return {version:1,clientRequestId:value.clientRequestId,preset:'bukit-merah-landmarks-v1',population:{size:population.size,seed:population.seed},intervention:p,options:{referenceDate:options.referenceDate,minimumAge:options.minimumAge,thresholdsMetres:[...options.thresholdsMetres].sort((a,b)=>a-b),existingAvailability:options.existingAvailability,eligibility:options.eligibility,...(options.straightLineWalkingMetresPerSecond===undefined?{}:{straightLineWalkingMetresPerSecond:options.straightLineWalkingMetresPerSecond})}};
}
function canonical(value:unknown):unknown {
  if(Array.isArray(value))return value.map(canonical);
  if(value!==null && typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,canonical(v)]));
  return value;
}
function same(a:unknown,b:unknown):boolean{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}
export async function fingerprintEldercareRequest(value:unknown):Promise<string> {
  const {clientRequestId:_token,...calculation}=parseEldercareApiRequest(value);
  const bytes=new TextEncoder().encode(JSON.stringify(canonical(calculation)));
  return [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function limitations(v:unknown):asserts v is string[]{ensure(same(v,ELDERCARE_LIMITATIONS),'Missing/altered model limitations');}
export function parseFacilitiesResponse(value:unknown):FacilitiesResponse {
  object(value,['version','source','coverage','summary','facilities','limitations'],'facilities response');const p=value as unknown as FacilitiesResponse;
  ensure(p.version===1 && p.coverage==='limited-corroborated-aac-subset','Unsupported facilities API version/coverage');source(p.source);ensure(/^[a-f0-9]{64}$/.test(p.source.rawSha256),'Missing source checksum');limitations(p.limitations);
  object(p.summary,['historicalPoints','corroboratedAac','unknownServicePoints','aacCareIncluded','invalidExcluded'],'facility summary');
  for(const n of Object.values(p.summary))ensure(Number.isSafeInteger(n) && n>=0,'Invalid facility count');
  ensure(Array.isArray(p.facilities) && p.facilities.length<=32 && p.summary.corroboratedAac===p.facilities.length && p.summary.aacCareIncluded===0,'Invalid supported catalogue counts');
  ensure(p.summary.historicalPoints>=p.summary.corroboratedAac+p.summary.unknownServicePoints+p.summary.invalidExcluded,'Inconsistent historical counts');
  const ids=new Set<string>();for(const f of p.facilities){validateFacility(f);ensure(f.serviceType==='aac' && f.corroboration!==null && !ids.has(f.id) && f.operationStatus==='listed-unconfirmed','Unsupported/duplicate AAC marker');ids.add(f.id);}
  return p;
}
export async function parseEldercareApiResponse(value:unknown,expected?:unknown):Promise<EldercareApiResponse> {
  object(value,['version','identity','request','result','limitations'],'simulation envelope');const p=value as unknown as EldercareApiResponse;
  ensure(p.version===1,'Unsupported eldercare API version');object(p.identity,['clientRequestId','requestFingerprint','scenarioId'],'response identity');token(p.identity.clientRequestId);
  const request=parseEldercareApiRequest(p.request);parseEldercareResponse(p.result);limitations(p.limitations);
  ensure(p.identity.clientRequestId===request.clientRequestId && p.identity.requestFingerprint===await fingerprintEldercareRequest(request) && p.identity.scenarioId===p.result.scenarioId,'Response request/scenario identity mismatch');
  if(expected!==undefined)ensure(same(request,parseEldercareApiRequest(expected)),'Response does not match current client request');
  ensure(same(request.intervention,p.result.intervention) && same(request.options,p.result.options),'Response calculation settings mismatch');
  const provenance=p.result.provenance;
  ensure(provenance.inputAgentCount===request.population.size && provenance.populationSeed===request.population.seed && provenance.population.referenceYear===2020,'Response population settings mismatch');
  ensure(provenance.originReferences.length===2 && provenance.originReferences.every(o=>o.planningArea==='bukit-merah') && new Set(provenance.originReferences.map(o=>o.subzone)).size===2 && provenance.originReferences.some(o=>o.subzone==='redhill') && provenance.originReferences.some(o=>o.subzone==='tiong-bahru-station'),'Unexpected origin preset');
  return p;
}
