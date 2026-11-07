/** Server-only deterministic batches. Raw citizens, graphs and source crosswalks stay inside this module. */
import {createHash} from 'node:crypto';
import {calculateCitizenCommutes,graphCostFingerprint} from '../citizen-grounding/commute.ts';
import type {CitizenCommuteRun} from '../citizen-grounding/contract.ts';
import type {CitizenImpactDependencies} from './citizen-grounding/api.ts';
import {loadTransportData,loadTransportDemandReference,loadStationAccessPoints} from './citizen-grounding/transport-data.ts';
import {getBaseline} from './mrt-service.ts';
import {canonical,ensure,freezeSnapshot} from '../experiments/validation.ts';
import {CONTROLLED_MRT_REQUEST_BYTES,CONTROLLED_MRT_TIE_SECONDS,controlledMrtRequestFingerprint,parseControlledMrtRequest,parseControlledMrtResponse} from '../experiments/controlled-mrt.ts';
import type {ControlledMrtResponse,ControlledMrtOption,ControlledMrtComparison} from '../experiments/controlled-mrt.ts';

const digest=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
const defaults:CitizenImpactDependencies={dataset:async()=>{const {getCitizenDataset}=await import('./citizen-grounding/data.ts');return getCitizenDataset();},baseline:getBaseline,demand:loadTransportDemandReference,access:loadStationAccessPoints};

export async function calculateControlledMrtComparison(input:unknown,dependencies:Partial<CitizenImpactDependencies>={}):Promise<ControlledMrtResponse> {
 const parsed=parseControlledMrtRequest(input),deps={...defaults,...dependencies};
 // Detach each result before awaiting another trusted loader: later caller mutation cannot alter this batch.
 const dataset=freezeSnapshot(await deps.dataset()),baseline=structuredClone(await deps.baseline(parsed.serviceDate));ensure(baseline.date===parsed.serviceDate,'CONTROLLED_MRT_DATE_BINDING');
 const transport=dependencies.demand===undefined&&dependencies.access===undefined?freezeSnapshot(loadTransportData(baseline)):{reference:freezeSnapshot(await deps.demand(baseline)),index:freezeSnapshot(await deps.access(baseline))};
 const baselineGraphHash=graphCostFingerprint(baseline),sourceSnapshotHash=digest({manifest:dataset.manifest,baseSourceHash:dataset.baseSourceHash,demand:transport.reference,access:transport.index});
 const content={populationId:dataset.populationId,datasetId:dataset.id,baselineGraphHash,sourceSnapshotHash,serviceDate:parsed.serviceDate,sources:dataset.manifest.sources.map(({id,title,organisation,referenceYear,publicationUrl,sha256})=>({id,title,organisation,referenceYear,publicationUrl,sha256})),demandSourceHash:transport.reference.sourceHash,accessSourceHash:transport.index.sourceHash};
 const snapshot={id:'mrt-context-'+digest(content),...content};
 const waits=[parsed.intervention.waitingTimeSeconds!,parsed.sensitivity.lowWaitingTimeSeconds,parsed.optionB.waitingTimeSeconds,parsed.sensitivity.highWaitingTimeSeconds],runs=new Map<number,CitizenCommuteRun>();
 for(const waitingTimeSeconds of waits)if(!runs.has(waitingTimeSeconds))runs.set(waitingTimeSeconds,calculateCitizenCommutes(dataset,baseline,{...parsed.intervention,waitingTimeSeconds},{demandReference:transport.reference,stationAccessPoints:transport.index}));
 const ordered=waits.map(waitingTimeSeconds=>runs.get(waitingTimeSeconds)!);
 // Facts are generated/validated against this exact ordered roster; explicitly check every identity before joining.
 const cohort=dataset.records.map((record,index)=>({record,facts:ordered.map(run=>run.facts[index])}));
 for(const {record,facts}of cohort)ensure(facts.every(f=>f&&f.citizenId===record.id&&f.populationId===dataset.populationId&&f.citizenDatasetId===dataset.id),'CONTROLLED_MRT_CITIZEN_BINDING');
 const common=cohort.filter(({facts})=>facts.every(f=>f.baseline.status==='reachable'&&f.intervention.status==='reachable'&&Number.isFinite(f.baseline.totalSeconds)&&Number.isFinite(f.intervention.totalSeconds)));
 const weight=common.reduce((n,{record})=>n+record.weight,0),commonCohort={agents:common.length,weight,excludedAgents:dataset.records.length-common.length,excludedWeight:cohort.filter(row=>!row.facts.every(f=>f.baseline.status==='reachable'&&f.intervention.status==='reachable')).reduce((n,{record})=>n+record.weight,0)};
 const keys=['A','B-low','B-base','B-high'] as const;
 const options:ControlledMrtOption[]=ordered.map((run,i)=>{
  const baseline=weight?common.reduce((n,row)=>n+row.record.weight*row.facts[i].baseline.totalSeconds!,0)/weight/60:null,travel=weight?common.reduce((n,row)=>n+row.record.weight*row.facts[i].intervention.totalSeconds!,0)/weight/60:null;
  return {key:keys[i],waitingTimeSeconds:waits[i],runId:run.id,scenarioFingerprint:run.scenarioFingerprint,summary:run.summary,common:{meanBaselineMinutes:baseline,meanTravelMinutes:travel,meanMinutesSaved:baseline===null||travel===null?null:baseline-travel}};
 });
 const levels=['low','base','high'] as const;
 const comparisons:ControlledMrtComparison[]=levels.map((level,i)=>{
  const difference=weight?options[i+1].common.meanTravelMinutes!-options[0].common.meanTravelMinutes!:null;
  return {level,differenceMinutesBMinusA:difference,preferred:difference===null?'unknown':Math.abs(difference*60)<=CONTROLLED_MRT_TIE_SECONDS?'tie':difference>0?'A':'B'};
 });
 return parseControlledMrtResponse({version:1,policy:'controlled-mrt-wait-v1',requestFingerprint:await controlledMrtRequestFingerprint(parsed),snapshot,commonCohort,options,comparisons,preferenceChanges:weight?new Set(comparisons.map(c=>c.preferred)).size>1:null,
  assumptions:[...ordered[0].assumptions,'Option B duplicates A; only the proposed service waitingTimeSeconds changes. Geometry, running, dwell and transfer-walk seconds remain fixed.','A remains fixed while B uses the declared low/base/high waits. These hypothetical sensitivity assumptions are not calibrated confidence intervals.','Waiting applies to initial boarding and transfers onto the proposed service. Existing-service waits stay fixed.','Lower weighted mean travel time ranks options on the same cohort with finite baseline and scenario journeys across every variant; ties use 1e-6 seconds. Positive B-minus-A minutes means B is slower.'],
  limitations:['Fictional population expansion weights describe synthetic proxy journeys, not observed Singapore residents or unique commuters.','Unknown, unreachable, newly reachable and not applicable populations remain separate in every full coverage table; the common-cohort ranking excludes them.','This travel-time objective does not assess costs, construction, accessibility, crowding, resident preferences or a policy recommendation.','The additive graph retains existing alternatives, so lowering proposed waiting time cannot worsen the best modelled travel time.','Monthly OD counts are a separate source reference; they do not assign individual citizen journeys.','Sensitivity preference changes are conditional model outputs, not confidence intervals for Singapore residents.']});
}

class BoundaryError extends Error {status:number;constructor(code:string,status:number){super(code);this.status=status;}}
const state=globalThis as typeof globalThis&{__controlledMrtPendingV1?:{active:boolean}};
const pending=state.__controlledMrtPendingV1??={active:false};
const json=(value:unknown,status=200,extra:Record<string,string>={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store',...extra}});
async function body(request:Request):Promise<unknown> {
 const length=request.headers.get('content-length');if(length!==null){if(!/^\d+$/.test(length))throw new BoundaryError('INVALID_CONTROLLED_MRT_REQUEST',400);if(Number(length)>CONTROLLED_MRT_REQUEST_BYTES)throw new BoundaryError('CONTROLLED_MRT_REQUEST_TOO_LARGE',413);}
 if(!request.body)throw new BoundaryError('INVALID_CONTROLLED_MRT_REQUEST',400);
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let total=0;
 const cancelled=()=>{void reader.cancel().catch(()=>{});};request.signal.addEventListener('abort',cancelled,{once:true});
 try{
  for(;;){if(request.signal.aborted)throw new BoundaryError('CONTROLLED_MRT_CANCELLED',499);const item=await reader.read();if(item.done)break;total+=item.value.byteLength;if(total>CONTROLLED_MRT_REQUEST_BYTES)throw new BoundaryError('CONTROLLED_MRT_REQUEST_TOO_LARGE',413);chunks.push(item.value);}
  if(request.signal.aborted)throw new BoundaryError('CONTROLLED_MRT_CANCELLED',499);
  const bytes=new Uint8Array(total);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new BoundaryError('INVALID_CONTROLLED_MRT_REQUEST',400);}
 }catch(error){void reader.cancel().catch(()=>{});throw error;}finally{request.signal.removeEventListener('abort',cancelled);reader.releaseLock();}
}
export async function controlledMrtResponse(request:Request,dependencies:Partial<CitizenImpactDependencies>={}):Promise<Response> {
 if(request.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405,{Allow:'POST'});let held=false;
 try{
  const url=new URL(request.url),origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site'),localOrigin=new URL(`${url.protocol}//${request.headers.get('host')??url.host}`).origin;
  if(origin&&origin!==localOrigin||site!==null&&site!=='same-origin'&&site!=='none')throw new BoundaryError('CONTROLLED_MRT_ORIGIN',403);
  if(url.search)throw new BoundaryError('INVALID_CONTROLLED_MRT_REQUEST',400);
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new BoundaryError('CONTROLLED_MRT_CONTENT_TYPE',415);
  let input;try{input=parseControlledMrtRequest(await body(request));}catch(error){if(error instanceof BoundaryError)throw error;throw new BoundaryError('INVALID_CONTROLLED_MRT_REQUEST',400);}
  if(pending.active)throw new BoundaryError('CONTROLLED_MRT_BUSY',429);pending.active=true;held=true;
  const result=await calculateControlledMrtComparison(input,dependencies);if(request.signal.aborted)throw new BoundaryError('CONTROLLED_MRT_CANCELLED',499);return json(result);
 }catch(error){return json({error:error instanceof BoundaryError?error.message:'CONTROLLED_MRT_UNAVAILABLE'},error instanceof BoundaryError?error.status:503);}
 finally{if(held)pending.active=false;}
}
