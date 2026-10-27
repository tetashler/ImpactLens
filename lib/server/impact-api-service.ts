// Node-only adapter. Keep the full population/profile closure and all input data server-side.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prepareCensus } from '../../prototype/agents/prepare.ts';
import type { DemographicDistribution } from '../../prototype/agents/types.ts';
import { generatePopulation } from '../../prototype/agents/generate.ts';
import { runPopulationImpact } from '../../prototype/agents/impact/simulation.ts';
import type { ImpactResult } from '../../prototype/agents/impact/types.ts';
import { illustrativeDemand } from '../../prototype/agents/impact/example.ts';
import { getBaseline, runMapSimulation, MapInputError } from './mrt-service.ts';
import { parseImpactRequest, parseImpactResponse, fingerprintImpactRequest, parseImpactProfileResponse } from '../impact/api-contract.ts';
import type { ImpactResponse, ImpactProfileResponse } from '../impact/api-contract.ts';

export class ImpactApiError extends Error {status:number;constructor(message:string,status=400){super(message);this.status=status;}}
type Entry={response:ImpactResponse;getProfile:ImpactResult['getProfile'];expires:number};
/** Bounded local prototype cache; expiration applies even when no new calculation arrives. */
export class ImpactRunCache {
  private entries=new Map<string,Entry>();
  private maximum:number;private ttl:number;private now:()=>number;
  constructor(maximum=2,ttl=10*60*1000,now=()=>Date.now()){this.maximum=maximum;this.ttl=ttl;this.now=now;}
  private prune(){for(const [id,entry] of this.entries)if(entry.expires<=this.now())this.entries.delete(id);}
  get size(){this.prune();return this.entries.size;}
  put(response:ImpactResponse,getProfile:ImpactResult['getProfile']):void {
    this.prune();this.entries.delete(response.identity.requestId);
    this.entries.set(response.identity.requestId,{response:structuredClone(response),getProfile,expires:this.now()+this.ttl});
    while(this.entries.size>this.maximum)this.entries.delete(this.entries.keys().next().value!);
  }
  find(requestId:string):Entry|undefined {this.prune();return this.entries.get(requestId);}
  get(runId:string,requestId:string):Entry {
    this.prune();const entry=this.entries.get(requestId);
    if(!entry){
      if([...this.entries.values()].some(e=>e.response.identity.runId===runId))throw new ImpactApiError('This request does not match the calculated run. Recalculate for the current proposal.',409);
      throw new ImpactApiError('This calculated run is unavailable or expired. Run the calculation again.',410);
    }
    if(entry.response.identity.runId!==runId)throw new ImpactApiError('Run and request identifiers do not match.',409);
    return entry;
  }
}
// Route bundles and development reloads must share the same bounded local run store.
const processState=globalThis as typeof globalThis & {__impactLensRunsV1?:ImpactRunCache};
const cache=processState.__impactLensRunsV1??=new ImpactRunCache();
let demographics:DemographicDistribution|undefined;

export async function calculateImpact(value:unknown):Promise<ImpactResponse> {
  let request;
  try{request=parseImpactRequest(value);}catch{throw new ImpactApiError('Check the service date, proposal and supported population/demand settings.');}
  const requestId=await fingerprintImpactRequest(request),existing=cache.find(requestId);
  if(existing)return structuredClone(existing.response);
  // Reuse authoritative proposal/date validation and the same cached baseline as the map.
  try{runMapSimulation({serviceDate:request.serviceDate,intervention:request.intervention,journeys:[]});}
  catch(error){if(error instanceof MapInputError)throw new ImpactApiError(error.message);throw error;}
  demographics??=prepareCensus(readFileSync(join(process.cwd(),'data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv'),'utf8'));
  let population;
  try{population=generatePopulation(demographics,{size:request.population.size,seed:request.population.seed,planningAreas:['Choa Chu Kang']});}
  catch{throw new ImpactApiError('Population sample cannot cover the selected Census groups. Increase the sample size.');}
  const assumptions=structuredClone(illustrativeDemand);
  assumptions.referenceDate=request.serviceDate;assumptions.seed=request.population.seed;
  assumptions.description=`Illustrative Choa Chu Kang sensitivity: ${request.participationRate*100}% participation; NS4 origins; destination shares NE16 50%, NS4 25%, NS5 25%. Equal assumed probabilities across age/sex categories. Not observed commuting or individual home locations.`;
  if(assumptions.travel.method!=='destination-distribution')throw new Error('Unsupported configured demand preset');
  assumptions.travel.participationRate=request.participationRate;
  const result=runPopulationImpact(population,getBaseline(request.serviceDate),request.intervention,{assumptions,thresholdMinutes:request.thresholdMinutes,renderLimit:request.renderLimit});
  const response=await parseImpactResponse({version:1,identity:{requestId,runId:result.payload.metadata.scenarioId,request},payload:result.payload,metrics:result.metrics,distributionalDifferences:result.distributionalDifferences,diagnostics:result.diagnostics},request);
  if(new TextEncoder().encode(JSON.stringify(response)).byteLength>1024*1024)throw new Error('Impact response exceeds bounded display budget');
  cache.put(response,result.getProfile);return structuredClone(response);
}
export function getImpactProfile(runId:string,requestId:string,agentId:string):ImpactProfileResponse {
  if(!/^impact-[a-f0-9]{24}$/.test(runId)||!/^[a-f0-9]{64}$/.test(requestId)||!/^syn-[a-f0-9]{16}-[1-9]\d*$/.test(agentId)||agentId.length>80)throw new ImpactApiError('Invalid run or synthetic citizen identifier.');
  const entry=cache.get(runId,requestId),profile=entry.getProfile(agentId);
  if(!profile)throw new ImpactApiError('Synthetic citizen not found in this calculated population.',404);
  return parseImpactProfileResponse({requestId,runId,profile},entry.response);
}
/** Read-only authoritative handoff for optional AI; does not extend cache lifetime. */
export function getImpactRun(runId:string,requestId:string):ImpactResponse {
  if(!/^impact-[a-f0-9]{24}$/.test(runId)||!/^[a-f0-9]{64}$/.test(requestId))throw new ImpactApiError('Invalid calculated run identifier.');
  return structuredClone(cache.get(runId,requestId).response);
}
export async function readImpactBody(request:Request):Promise<unknown> {
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new ImpactApiError('Send JSON for the calculation request.',415);
  if(Number(request.headers.get('content-length'))>16384)throw new ImpactApiError('Request exceeds 16 KiB.',413);
  const reader=request.body?.getReader();if(!reader)throw new ImpactApiError('Request body must be valid JSON.');
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw new ImpactApiError('Request exceeds 16 KiB.',413);}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new ImpactApiError('Request body must be valid JSON.');}
}
export function impactError(error:unknown):Response {
  return Response.json({error:error instanceof ImpactApiError?error.message:'Unable to calculate demographic impact. Check the local data and retry.'},{status:error instanceof ImpactApiError?error.status:500,headers:{'Cache-Control':'no-store'}});
}
