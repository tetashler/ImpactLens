/** Server-only bounded citizen impact calculation. No inference, paid admission or browser-owned data sources. */
import {ensure,freezeSnapshot} from '../../experiments/validation.ts';
import {calculateCitizenCommutes} from '../../citizen-grounding/commute.ts';
import type {StationAccessIndex} from '../../citizen-grounding/commute.ts';
import {parseCitizenImpactRequest,parseCitizenImpactPublic,citizenImpactRequestFingerprint} from '../../citizen-grounding/public-contract.ts';
import type {CitizenImpactPublic} from '../../citizen-grounding/public-contract.ts';
import type {CitizenDataset,CitizenCommuteRun,TransportDemandReference} from '../../citizen-grounding/contract.ts';
import type {Graph} from '../../../prototype/mrt/graph.ts';
import {getBaseline} from '../mrt-service.ts';
import {loadTransportData,loadTransportDemandReference,loadStationAccessPoints} from './transport-data.ts';

type MaybePromise<T>=T|Promise<T>;
export interface CitizenImpactDependencies {dataset:()=>MaybePromise<CitizenDataset>;baseline:(date:string)=>MaybePromise<Graph>;demand:(graph:Graph)=>MaybePromise<TransportDemandReference>;access:(graph:Graph)=>MaybePromise<StationAccessIndex>}
export interface PrivateCitizenImpact {publicResult:CitizenImpactPublic;run:CitizenCommuteRun;dataset:CitizenDataset}
const completed=new Map<string,PrivateCitizenImpact>();
export function getPrivateCitizenImpact(runId:string):PrivateCitizenImpact|null {return completed.get(runId)??null;}
const defaults:CitizenImpactDependencies={dataset:async()=>{const {getCitizenDataset}=await import('./data.ts');return getCitizenDataset();},baseline:getBaseline,demand:loadTransportDemandReference,access:loadStationAccessPoints};

/** Dependencies are trusted server/test functions, never selected from request data. */
export async function calculateCitizenImpact(input:unknown,dependencies:Partial<CitizenImpactDependencies>={}):Promise<PrivateCitizenImpact>{
 const parsed=parseCitizenImpactRequest(input),deps={...defaults,...dependencies};
 const dataset=await deps.dataset(),baseline=await deps.baseline(parsed.serviceDate);ensure(baseline.date===parsed.serviceDate,'CITIZEN_DATE_BINDING');
 // Keep individual overrides in their existing order; default readers share one verified snapshot.
 const transport=dependencies.demand===undefined&&dependencies.access===undefined?loadTransportData(baseline):{reference:await deps.demand(baseline),index:await deps.access(baseline)};
 const run=calculateCitizenCommutes(dataset,baseline,parsed.intervention,{demandReference:transport.reference,stationAccessPoints:transport.index});
 const reference=run.demandReference,publicResult=parseCitizenImpactPublic({version:1,policy:'citizen-commute-v1',runId:run.id,datasetId:dataset.id,populationId:dataset.populationId,scenarioFingerprint:run.scenarioFingerprint,requestFingerprint:await citizenImpactRequestFingerprint(parsed),serviceDate:run.serviceDate,summary:run.summary,diagnostics:run.diagnostics,
  sources:dataset.manifest.sources.map(({id,title,organisation,referenceYear,publicationUrl,sha256})=>({id,title,organisation,referenceYear,publicationUrl,sha256})),
  demandReference:reference?{version:reference.version,policy:reference.policy,sourceHash:reference.sourceHash,period:reference.period,records:reference.records,totalTrips:reference.totalTrips,matchedTrips:reference.matchedTrips,unmappedTrips:reference.unmappedTrips,stationCodes:reference.stationMappings.length,mappedStationCodes:reference.stationMappings.filter(s=>s.stationId!==null).length,dayTypes:reference.dayTypes,hours:reference.hours,exitSourceHash:reference.exitSourceHash,exitFeatures:reference.exitFeatures,matchedExits:reference.matchedExits,limitations:reference.limitations}:null,
  sample:run.facts.slice(0,32).map(f=>({citizenId:f.citizenId,status:f.status,baselineMinutes:f.baseline.totalSeconds===null?null:f.baseline.totalSeconds/60,interventionMinutes:f.intervention.totalSeconds===null?null:f.intervention.totalSeconds/60,minutesSaved:f.minutesSaved,baselineTransfers:f.baseline.transfers,interventionTransfers:f.intervention.transfers})),assumptions:run.assumptions});
 // Snapshot trusted injected data too: caller mutation cannot alter a frozen selected identity after acceptance.
 const result=Object.freeze({publicResult,run,dataset:Object.isFrozen(dataset)?dataset:freezeSnapshot(dataset)});
 completed.delete(run.id);if(completed.size>=2)completed.delete(completed.keys().next().value!);completed.set(run.id,result);return result;
}

async function boundedBody(request:Request):Promise<unknown>{
 const size=request.headers.get('content-length');if(size!==null)ensure(/^\d+$/.test(size)&&Number(size)<=16384,'CITIZEN_REQUEST_BYTES');
 ensure(request.body,'CITIZEN_REQUEST_BODY');const reader=request.body.getReader(),chunks:Uint8Array[]=[];let total=0;
 try{for(;;){const item=await reader.read();if(item.done)break;total+=item.value.byteLength;ensure(total<=16384,'CITIZEN_REQUEST_BYTES');chunks.push(item.value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export async function citizenImpactResponse(request:Request,dependencies:Partial<CitizenImpactDependencies>={}):Promise<Response>{
 const headers={'Cache-Control':'no-store','Content-Type':'application/json'};
 if(request.method!=='POST')return Response.json({error:'METHOD_NOT_ALLOWED'},{status:405,headers:{...headers,Allow:'POST'}});
 let input:unknown;try{input=parseCitizenImpactRequest(await boundedBody(request));}catch{return Response.json({error:'INVALID_CITIZEN_IMPACT_REQUEST'},{status:400,headers});}
 try{return Response.json((await calculateCitizenImpact(input,dependencies)).publicResult,{status:200,headers});}catch{return Response.json({error:'CITIZEN_IMPACT_UNAVAILABLE'},{status:503,headers});}
}
