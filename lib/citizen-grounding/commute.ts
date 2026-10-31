/** Pure, versioned synthetic home/work-proxy comparison. No provider, storage or HTTP access. */
import {createHash} from 'node:crypto';
import {canonical,ensure,object,assertJsonData,freezeSnapshot} from '../experiments/validation.ts';
import {haversineMetres} from '../../prototype/eldercare/accessibility.ts';
import {shortestPathsFrom,validateCosts} from '../../prototype/mrt/routing.ts';
import {commuteFactStatus as expectedStatus,validateCitizenCommuteFact,citizenScheduleSummary} from './commute-contract.ts';
import {addHypotheticalLine} from '../../prototype/mrt/scenario.ts';
import type {MrtIntervention} from '../../prototype/mrt/scenario.ts';
import type {Graph,Edge} from '../../prototype/mrt/graph.ts';
import type {CitizenDataset,CitizenRecord,GeographicProxy,CommuteSide,CitizenCommuteFact,CitizenCommuteRun,CitizenCommuteSummary,TransportDemandReference} from './contract.ts';

export interface StationAccessIndex {sourceHash:string;points:Record<string,GeographicProxy[]>}
export interface CitizenCommuteOptions {candidateLimit?:number;walkingMetresPerSecond?:number;detourFactor?:number;maxAccessMetres?:number;demandReference?:TransportDemandReference;stationAccessPoints?:StationAccessIndex}
const digest=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
const near=(a:number,b:number)=>Math.abs(a-b)<=1e-6;
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const modes=['rail','rail-bus','bus','car-taxi','other','no-work-trip','unknown'];
const statuses=['improved','unchanged','worse','newly-reachable','unreachable','unknown','not-applicable'] as const;
const assumptionIds=['walking-proxy','bounded-access','exit-or-station-proxy','static-rail-costs','mode-and-schedule','separate-od-reference','coincident-proxy'].map(id=>'citizen-commute-v1:'+id);
const suppliedText=(s:unknown)=>typeof s==='string'&&s.length>0&&s.length<=2000;
const proxy=(p:GeographicProxy|null)=>{if(p!==null)ensure(p&&finite(Math.abs(p.lat))&&Math.abs(p.lat)<=90&&finite(Math.abs(p.lon))&&Math.abs(p.lon)<=180&&suppliedText(p.basis)&&suppliedText(p.sourceId),'CITIZEN_COMMUTE_PROXY');};
export function graphCostFingerprint(g:Graph){return digest({date:g.date,mode:g.mode,costs:g.costs,stations:[...g.stations.values()].map(s=>({id:s.id,name:s.name,lat:s.lat,lon:s.lon})).sort((a,b)=>a.id.localeCompare(b.id)),aliases:[...g.aliases].sort(([a],[b])=>a.localeCompare(b)),states:[...g.states.values()].sort((a,b)=>a.id.localeCompare(b.id)),edges:g.edges.map(e=>({id:e.id,from:e.from,to:e.to,kind:e.kind,seconds:e.seconds})).sort((a,b)=>a.id.localeCompare(b.id))});}
function inputCheck(d:CitizenDataset){
 object(d,['version','policy','id','populationId','seed','baseSourceHash','records','manifest']);const {records,...metadata}=d;assertJsonData(metadata);privateRows(records);
 ensure(d?.version===1&&d.policy==='citizen-circumstances-v1'&&/^citizens-[a-f0-9]{64}$/.test(d.id)&&/^population-[a-f0-9]{64}$/.test(d.populationId),'CITIZEN_COMMUTE_DATASET');
 ensure(d.manifest.populationId===d.populationId&&d.manifest.recordCount===d.records.length,'CITIZEN_COMMUTE_DATASET');
 const ids=new Set<string>();for(const c of d.records){assertJsonData(c);ensure(suppliedText(c.id)&&!ids.has(c.id)&&finite(c.weight)&&c.weight>0&&modes.includes(c.travelMode),'CITIZEN_COMMUTE_CITIZEN');ids.add(c.id);proxy(c.homeProxy);proxy(c.workplaceProxy);}
 ensure(near(d.records.reduce((n,c)=>n+c.weight,0),d.manifest.representedPopulation),'CITIZEN_COMMUTE_WEIGHT');
}
/** Large private rosters are bounded separately; individual rows still use the strict public-safe JSON validator. */
function privateRows(value:unknown):asserts value is unknown[]{ensure(Array.isArray(value)&&Object.getPrototypeOf(value)===Array.prototype&&value.length>0&&value.length<=30000&&Reflect.ownKeys(value).length===value.length+1,'CITIZEN_COMMUTE_ROWS');for(let i=0;i<value.length;i++){const descriptor=Object.getOwnPropertyDescriptor(value,String(i));ensure(descriptor&&Object.hasOwn(descriptor,'value'),'CITIZEN_COMMUTE_ROW_ACCESSOR');}}
const absent=(status:'unknown'|'unreachable'|'not-applicable'):CommuteSide=>({status,totalSeconds:null,railSeconds:null,accessSeconds:null,egressSeconds:null,transfers:null,originStationId:null,destinationStationId:null,stationIds:[]});
interface Candidate {stationId:string;walkSeconds:number}
interface CachedRoute {seconds:number;transfers:number;stationIds:string[]}
function routeCache(graph:Graph){
 const trees=new Map<string,ReturnType<typeof shortestPathsFrom>>(),routes=new Map<string,CachedRoute|null>();
 return {get count(){return trees.size;},route(origin:string,destination:string):CachedRoute|null{
  if(origin===destination)return {seconds:0,transfers:0,stationIds:[origin]};
  const key=origin+'|'+destination;if(routes.has(key))return routes.get(key)!;
  let tree=trees.get(origin);if(!tree){tree=shortestPathsFrom(graph,origin);trees.set(origin,tree);}
  const targets=[...graph.states.values()].filter(s=>s.stationId===destination).sort((a,b)=>tree!.distances.get(a.id)!-tree!.distances.get(b.id)!);
  const target=targets[0];if(!target||!Number.isFinite(tree.distances.get(target.id))){routes.set(key,null);return null;}
  // Reconstruct the existing router's selected shortest-path tree; no alternate routing algorithm.
  const edges:Edge[]=[],visited=new Set<string>();let at=target.id;
  while(tree.previous.has(at)){ensure(!visited.has(at),'CITIZEN_ROUTE_CYCLE');visited.add(at);const edge=tree.previous.get(at)!;edges.unshift(edge);at=edge.from;}
  const stationIds=[origin];for(const e of edges){const id=graph.states.get(e.to)!.stationId;if(id!==stationIds.at(-1))stationIds.push(id);}
  const result={seconds:tree.distances.get(target.id)!,transfers:edges.filter(e=>e.kind==='transfer').length,stationIds};routes.set(key,result);return result;
 }};
}
function aggregate(facts:CitizenCommuteFact[],records:CitizenRecord[]):CitizenCommuteSummary{
 const coverage=Object.fromEntries(statuses.map(s=>[s,{agents:0,weight:0}])) as CitizenCommuteSummary['coverage'];let comparableWeight=0,saved=0,benefiting=0;
 for(const [i,f]of facts.entries()){const weight=records[i].weight;coverage[f.status].agents++;coverage[f.status].weight+=weight;if(['improved','unchanged','worse'].includes(f.status)){comparableWeight+=weight;saved+=weight*f.minutesSaved!;if(f.status==='improved')benefiting+=weight;}}
 return {representedPopulation:records.reduce((n,c)=>n+c.weight,0),representedAgents:records.length,coverage,comparableWeight,weightedMinutesSaved:comparableWeight?saved:null,meanMinutesSaved:comparableWeight?saved/comparableWeight:null,benefitingShare:comparableWeight?benefiting/comparableWeight:null,interpretation:'Weighted fictional proxy-to-proxy comparisons for one assumed work trip on the selected service date. Comparable rail population is the saving/share denominator; unknown and non-rail residents remain separate. Not observed commuting, ridership, crowding or exact shift feasibility.'};
}
const recordDigest=(d:CitizenDataset)=>digest(d.records.map(c=>({id:c.id,weight:c.weight,homeProxy:c.homeProxy,workplaceProxy:c.workplaceProxy,workplaceArea:c.workplaceArea,labourForceStatus:c.labourForceStatus,schedule:c.schedule,mode:c.travelMode})));
const factDigest=(f:Omit<CitizenCommuteFact,'id'>)=>'commute-'+digest(f);
const runDigest=(r:Omit<CitizenCommuteRun,'id'>,d:CitizenDataset)=>'citizen-impact-'+digest({run:r,recordDigest:recordDigest(d)});

export function calculateCitizenCommutes(dataset:CitizenDataset,baseline:Graph,proposal:MrtIntervention,options:CitizenCommuteOptions={}):CitizenCommuteRun{
 inputCheck(dataset);object(options,['candidateLimit','walkingMetresPerSecond','detourFactor','maxAccessMetres','demandReference','stationAccessPoints'],[]);validateCosts(baseline);
 const candidateLimit=options.candidateLimit??3,speed=options.walkingMetresPerSecond??1.2,detour=options.detourFactor??1.25,maximum=options.maxAccessMetres??2500;
 ensure(Number.isSafeInteger(candidateLimit)&&candidateLimit>=1&&candidateLimit<=5&&finite(speed)&&speed>=0.5&&speed<=2.5&&finite(detour)&&detour>=1&&detour<=3&&finite(maximum)&&maximum<=20000,'CITIZEN_COMMUTE_OPTIONS');
 const access=options.stationAccessPoints;if(access){ensure(/^[a-f0-9]{64}$/.test(access.sourceHash)&&access.points&&typeof access.points==='object'&&!Array.isArray(access.points),'CITIZEN_STATION_ACCESS');for(const [id,points]of Object.entries(access.points)){ensure(baseline.stations.has(id)&&Array.isArray(points)&&points.length>0&&points.length<=40,'CITIZEN_STATION_ACCESS');for(const p of points)proxy(p);}}
 const scenario=addHypotheticalLine(baseline,proposal),baselineHash=graphCostFingerprint(baseline),scenarioFingerprint=digest({version:1,baseline:baselineHash,proposal:scenario.intervention,candidateLimit,speed,detour,maximum,exitHash:access?.sourceHash??null}),baseRoutes=routeCache(baseline),scenarioRoutes=routeCache(scenario.graph);
 const assumptions=[`Access and egress are WGS84 haversine distance x detour ${detour} / assumed walking speed ${speed}m/s; this is not a measured pedestrian route.`,`Candidate limit ${candidateLimit} per endpoint plus retained baseline alternatives; assumed maximum straight-line access distance ${maximum}m.`,access?'Reviewed source exit points are access proxies, not measured exit-to-platform paths; stations without mapped exits and hypothetical stations use the station-coordinate fallback.':'Station-coordinate fallback is used for all access/egress; exits and platform paths are not inferred.','Rail seconds include the existing router boarding waits and transfer costs. Existing static GTFS medians and explicit waits remain uncalibrated; departure-clock service, capacity, crowding and exact shift feasibility are not modelled.','Usual-mode and work schedules are synthetic circumstances. Rail-plus-bus feeder time is unavailable and stays unknown; non-rail modes do not receive rail savings.','Monthly OD is a separate reference, not unique commuters, a residential/workplace matrix or a source of individual travel times.','Coincident home/work proxies have zero modelled distance; this does not establish a real shared building or observed no-travel arrangement.'];
 const candidateCaches=[new Map<string,Candidate[]>(),new Map<string,Candidate[]>()];
 const candidate=(graph:Graph,p:GeographicProxy,which:0|1):Candidate[]=>{
  const key=p.lat+'|'+p.lon,cached=candidateCaches[which].get(key);if(cached)return cached;
  const served=new Set([...graph.states.values()].map(s=>s.stationId));const rows=[...graph.stations.values()].filter(s=>served.has(s.id)).map(s=>{
   const points=access?.points[s.id]??[{lat:s.lat,lon:s.lon,basis:'Station coordinate fallback',sourceId:'graph:'+baselineHash}],distance=Math.min(...points.map(point=>haversineMetres({lat:p.lat,lon:p.lon},{lat:point.lat,lon:point.lon})));
   return {stationId:s.id,distance,walkSeconds:distance*detour/speed};
  }).filter(s=>s.distance<=maximum).sort((a,b)=>a.distance-b.distance||a.stationId.localeCompare(b.stationId)).slice(0,candidateLimit).map(({stationId,walkSeconds})=>({stationId,walkSeconds}));candidateCaches[which].set(key,rows);return rows;
 };
 const combine=(a:Candidate[],b:Candidate[])=>[...new Map([...a,...b].map(c=>[c.stationId,c])).values()];
 const best=(origins:Candidate[],destinations:Candidate[],cache:ReturnType<typeof routeCache>):CommuteSide=>{
  let selected:CommuteSide|null=null;
  for(const origin of origins)for(const destination of destinations){const route=cache.route(origin.stationId,destination.stationId);if(!route)continue;const total=origin.walkSeconds+route.seconds+destination.walkSeconds;if(!selected||total<selected.totalSeconds!-1e-9||near(total,selected.totalSeconds!)&&(origin.stationId+'|'+destination.stationId).localeCompare(selected.originStationId+'|'+selected.destinationStationId)<0)selected={status:'reachable',totalSeconds:total,railSeconds:route.seconds,accessSeconds:origin.walkSeconds,egressSeconds:destination.walkSeconds,transfers:route.transfers,originStationId:origin.stationId,destinationStationId:destination.stationId,stationIds:route.stationIds};}
  return selected??absent('unreachable');
 };
 const workday=(new Date(baseline.date+'T00:00:00Z').getUTCDay()+6)%7;
 const facts=dataset.records.map(c=>{
  let b:CommuteSide,s:CommuteSide,reason:string|null=null;
  if(c.labourForceStatus==='unemployed'||c.labourForceStatus==='outside-labour-force'||c.travelMode==='no-work-trip'||c.schedule?.arrangement==='remote'||c.schedule&&!c.schedule.days.includes(workday)){b=absent('not-applicable');s=absent('not-applicable');reason='No work-related trip on the selected assumed schedule/date.';}
  else if(['bus','car-taxi','other'].includes(c.travelMode)){b=absent('not-applicable');s=absent('not-applicable');reason='Non-rail mode; no mode-switch model is authorised.';}
  else if(c.travelMode==='rail-bus'){b=absent('unknown');s=absent('unknown');reason='Rail-plus-bus feeder travel is not modelled; no complete journey saving is asserted.';}
  else if(c.labourForceStatus!=='employed'||c.travelMode!=='rail'||!c.homeProxy||!c.workplaceProxy||!c.workplaceArea||!c.schedule){b=absent('unknown');s=absent('unknown');reason='Employment, workplace, mode, schedule or geographic proxy is unknown.';}
  else {
   const bo=candidate(baseline,c.homeProxy,0),bd=candidate(baseline,c.workplaceProxy,0),so=combine(bo,candidate(scenario.graph,c.homeProxy,1)),sd=combine(bd,candidate(scenario.graph,c.workplaceProxy,1));
   if(c.homeProxy.lat===c.workplaceProxy.lat&&c.homeProxy.lon===c.workplaceProxy.lon){const zero=(rows:Candidate[]):CommuteSide=>({status:'reachable',totalSeconds:0,railSeconds:0,accessSeconds:0,egressSeconds:0,transfers:0,originStationId:rows[0]?.stationId??null,destinationStationId:rows[0]?.stationId??null,stationIds:rows[0]?[rows[0].stationId]:[]});b=zero(bo);s=zero(so);}
   else {b=best(bo,bd,baseRoutes);s=best(so,sd,scenarioRoutes);}
   if(b.status!=='reachable'||s.status!=='reachable')reason='Unreachable under the declared access bound and static graph; not a statement of real-world inaccessibility.';
   if(b.status==='reachable')ensure(s.status==='reachable'&&s.totalSeconds!<=b.totalSeconds!+1e-6,'CITIZEN_ADDITIVE_WORSENING');
  }
  const status=expectedStatus(b,s),comparable=b.status==='reachable'&&s.status==='reachable',delta=comparable?(near(b.totalSeconds!,s.totalSeconds!)?0:(b.totalSeconds!-s.totalSeconds!)/60):null;
  const fact:Omit<CitizenCommuteFact,'id'>={version:1,policy:'citizen-commute-v1',citizenId:c.id,citizenDatasetId:dataset.id,populationId:dataset.populationId,scenarioFingerprint,residentialArea:c.planningArea,workplaceArea:c.workplaceArea,scheduleSummary:citizenScheduleSummary(c),mode:c.travelMode,baseline:b,intervention:s,status,minutesSaved:delta,transferChange:comparable?s.transfers!-b.transfers!:null,sourceIds:[...new Set([...dataset.manifest.sources.map(source=>source.id),'graph-topology:'+baselineHash,...(access?['station-exits:'+access.sourceHash]:[])])],assumptions:[...assumptionIds],unknownReason:reason};
  return {...fact,id:factDigest(fact)};
 });
 const body:Omit<CitizenCommuteRun,'id'>={version:1,policy:'citizen-commute-v1',citizenDatasetId:dataset.id,populationId:dataset.populationId,scenarioFingerprint,serviceDate:baseline.date,facts,summary:aggregate(facts,dataset.records),diagnostics:{baselineTrees:baseRoutes.count,interventionTrees:scenarioRoutes.count,citizens:dataset.records.length,candidateLimit},demandReference:options.demandReference??null,assumptions};
 const result={...body,id:runDigest(body,dataset)};validateCitizenCommuteRun(result,dataset);return freezeSnapshot(result);
}

/** Structural, arithmetic and immutable identity validation; routing authenticity comes from the producer. */
export function validateCitizenCommuteRun(run:CitizenCommuteRun,dataset:CitizenDataset):void{
 inputCheck(dataset);object(run,['version','policy','id','citizenDatasetId','populationId','scenarioFingerprint','serviceDate','facts','summary','diagnostics','demandReference','assumptions']);const {facts,...metadata}=run;assertJsonData(metadata);privateRows(facts);ensure(run.version===1&&run.policy==='citizen-commute-v1'&&run.citizenDatasetId===dataset.id&&run.populationId===dataset.populationId&&/^[a-f0-9]{64}$/.test(run.scenarioFingerprint)&&run.facts.length===dataset.records.length,'CITIZEN_COMMUTE_RUN');
 for(const [i,f]of run.facts.entries()){validateCitizenCommuteFact(f,dataset.records[i],dataset.id,dataset.populationId,run.scenarioFingerprint);const {id,...body}=f;ensure(id===factDigest(body),'CITIZEN_COMMUTE_FACT_DIGEST');}
 ensure(canonical(run.summary)===canonical(aggregate(run.facts,dataset.records)),'CITIZEN_COMMUTE_AGGREGATION');const {id,...body}=run;ensure(id===runDigest(body,dataset),'CITIZEN_COMMUTE_RUN_DIGEST');
}
