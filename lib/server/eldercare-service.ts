// Node-only local-source adapter. Never import into a client component.
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { prepareFacilityCatalogue } from '../../prototype/eldercare/prepare.ts';
import { deriveDemonstrationOrigins } from '../../prototype/eldercare/demo-origins.ts';
import { simulateEldercareIntervention } from '../../prototype/eldercare/accessibility.ts';
import { parseEldercareResponse } from '../../prototype/eldercare/contract.ts';
import { prepareCensus } from '../../prototype/agents/prepare.ts';
import { generatePopulation } from '../../prototype/agents/generate.ts';
import type { DemographicDistribution } from '../../prototype/agents/types.ts';
import type { FacilityCatalogue, OriginReference } from '../../prototype/eldercare/types.ts';
import { ELDERCARE_API_LIMITS, ELDERCARE_LIMITATIONS, parseEldercareApiRequest, parseEldercareApiResponse, parseFacilitiesResponse, fingerprintEldercareRequest, validateJsonBudget } from '../eldercare/api-contract.ts';
import type { EldercareApiResponse, FacilitiesResponse } from '../eldercare/api-contract.ts';

export class EldercareApiError extends Error {
  status:number;code:string;
  constructor(message:string,status=400,code='INVALID_REQUEST'){super(message);this.status=status;this.code=code;}
}
export const ELDERCARE_SOURCE_CACHE_MS=60000;
type Sources={catalogue:FacilityCatalogue;demographics:DemographicDistribution;origins:OriginReference[]};
let cache:{signature:string;expires:number;data:Sources}|undefined;
function getSources():Sources {
  // Keep literal filesystem targets visible to Next/Turbopack's production tracer.
  const stats=[
    statSync(join(process.cwd(),'data/facilities/EldercareServices.geojson')),
    statSync(join(process.cwd(),'data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv')),
    statSync(join(process.cwd(),'data/transport/mrt-network/stops.txt')),
    statSync(join(process.cwd(),'data/geography/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson')),
  ];
  const signature=JSON.stringify([process.cwd(),stats.map(s=>[s.size,s.mtimeMs,s.ctimeMs])]);
  const now=Date.now();if(cache && cache.signature===signature && now<cache.expires)return cache.data;
  const data:Sources={
    catalogue:prepareFacilityCatalogue(readFileSync(join(process.cwd(),'data/facilities/EldercareServices.geojson'),'utf8')),
    demographics:prepareCensus(readFileSync(join(process.cwd(),'data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv'),'utf8')),
    origins:deriveDemonstrationOrigins(readFileSync(join(process.cwd(),'data/transport/mrt-network/stops.txt'),'utf8'),readFileSync(join(process.cwd(),'data/geography/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson'),'utf8')),
  };
  cache={signature,expires:now+ELDERCARE_SOURCE_CACHE_MS,data};return data;
}
function bounded(value:unknown,maximum:number):void {
  if(new TextEncoder().encode(JSON.stringify(value)).byteLength>maximum)throw new EldercareApiError('The calculated response exceeds the supported display budget.',500,'RESPONSE_LIMIT');
}
export function getEldercareFacilities():FacilitiesResponse {
  const {catalogue}=getSources();
  const facilities=catalogue.facilities.filter(f=>f.serviceType==='aac' && f.corroboration!==null);
  const response=parseFacilitiesResponse(structuredClone({version:1,source:catalogue.source,coverage:'limited-corroborated-aac-subset',summary:{historicalPoints:catalogue.audit.rawRecords,corroboratedAac:facilities.length,unknownServicePoints:catalogue.audit.unknownClassifications,aacCareIncluded:facilities.filter(f=>f.serviceType==='aac-care').length,invalidExcluded:catalogue.audit.excluded.length},facilities,limitations:[...ELDERCARE_LIMITATIONS]}));
  bounded(response,ELDERCARE_API_LIMITS.facilitiesBytes);return response;
}
export async function calculateEldercare(value:unknown):Promise<EldercareApiResponse> {
  let request;
  try{request=parseEldercareApiRequest(value);}catch{throw new EldercareApiError('Check the supported AAC proposal, Bukit Merah preset and bounded population/accessibility settings.');}
  const sources=getSources();
  if(sources.catalogue.facilities.some(f=>f.id===request.intervention.id))throw new EldercareApiError('Choose a hypothetical centre identifier that does not collide with a known source location.');
  const positiveCells=sources.demographics.cells.filter(c=>c.planningArea==='bukit-merah' && c.count>0).length;
  if(request.population.size<positiveCells)throw new EldercareApiError('Increase the population sample to cover the selected Census categories.');
  const population=generatePopulation(sources.demographics,{size:request.population.size,seed:request.population.seed,planningAreas:['Bukit Merah']});
  const result=parseEldercareResponse(simulateEldercareIntervention(sources.catalogue,request.intervention,population,sources.origins,request.options));
  const response=await parseEldercareApiResponse({version:1,identity:{clientRequestId:request.clientRequestId,requestFingerprint:await fingerprintEldercareRequest(request),scenarioId:result.scenarioId},request,result,limitations:[...ELDERCARE_LIMITATIONS]},request);
  bounded(response,ELDERCARE_API_LIMITS.responseBytes);return response;
}
export async function readEldercareBody(request:Request):Promise<unknown> {
  const media=request.headers.get('content-type')??'';
  if(!/^application\/json\s*(?:;\s*charset\s*=\s*(?:utf-8|"utf-8")\s*)?$/i.test(media))throw new EldercareApiError('Send application/json with UTF-8 JSON.',415,'UNSUPPORTED_MEDIA_TYPE');
  const length=request.headers.get('content-length');
  if(length!==null){if(!/^\d+$/.test(length))throw new EldercareApiError('Invalid request length.');if(Number(length)>ELDERCARE_API_LIMITS.requestBytes)throw new EldercareApiError('Request exceeds 16 KiB.',413,'REQUEST_TOO_LARGE');}
  const reader=request.body?.getReader();if(!reader)throw new EldercareApiError('Request body must be valid JSON.');
  const chunks:Uint8Array[]=[];let size=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>ELDERCARE_API_LIMITS.requestBytes){await reader.cancel().catch(()=>{});throw new EldercareApiError('Request exceeds 16 KiB.',413,'REQUEST_TOO_LARGE');}chunks.push(value);
    }
  }catch(error){if(error instanceof EldercareApiError)throw error;throw new EldercareApiError('Unable to read JSON request.');}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));validateJsonBudget(value);return value;}
  catch{throw new EldercareApiError('Request must contain bounded, valid UTF-8 JSON.');}
}
export function eldercareError(error:unknown):Response {
  const known=error instanceof EldercareApiError;
  return Response.json({version:1,error:{code:known?error.code:'CALCULATION_FAILED',message:known?error.message:'Unable to calculate eldercare accessibility. Check the local data and retry.'}},{status:known?error.status:500,headers:{'Cache-Control':'no-store'}});
}
