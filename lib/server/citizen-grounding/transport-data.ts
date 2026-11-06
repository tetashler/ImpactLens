/** Local immutable transport-reference readers. Never invokes LTA, OneMap, providers or recovery. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {parseCsv} from '../../../prototype/mrt/csv.ts';
import type {Graph} from '../../../prototype/mrt/graph.ts';
import {ensure,freezeSnapshot} from '../../experiments/validation.ts';
import {graphCostFingerprint} from '../../citizen-grounding/commute.ts';
import type {StationAccessIndex} from '../../citizen-grounding/commute.ts';
import type {TransportDemandReference,GeographicProxy} from '../../citizen-grounding/contract.ts';

export const OD_SOURCE_SHA256='29d4552658d1cd4d929e693eea7c8180f6e2c6dc8b2760314420e72fa82b78c5';
export const EXIT_SOURCE_SHA256='7a57cb14cf7c621203938e944f99b41891284e5e67876c43d9f8f3ee3aa88ee6';
export const STOP_CROSSWALK_SHA256='577caf2542dc4ea6ba2a90c3333138c82a8580e6c280c9dfe8ff253faa3453e2';
const hash=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
export interface StationCodeMapping {code:string;stationId:string|null;reason:string}
export type StationCodeResolver=(code:string)=>StationCodeMapping;
type OdCore=Pick<TransportDemandReference,'version'|'policy'|'sourceHash'|'period'|'records'|'totalTrips'|'matchedTrips'|'unmappedTrips'|'stationMappings'|'dayTypes'|'hours'>;

/** Code-to-parent relationships are explicit GTFS records; reviewed graph aliases own consolidation. */
export function buildStationCodeCrosswalk(graph:Graph,stopsCsv:string):StationCodeResolver{
 const parsed=parseCsv(stopsCsv);ensure(['stop_id','stop_code','parent_station'].every(c=>parsed.columns.includes(c)),'CITIZEN_STATION_CODE_SCHEMA');
 const codes=new Map<string,Set<string>>(),served=new Set([...graph.states.values()].map(s=>s.stationId));
 const add=(code:string,parent:string)=>{const canonical=graph.aliases.get(parent)??parent;if(!graph.stations.has(canonical))return;const rows=codes.get(code)??new Set<string>();rows.add(canonical);codes.set(code,rows);};
 for(const [alias,canonical]of graph.aliases)add(alias,canonical);for(const id of graph.stations.keys())add(id,id);
 for(const {values:r}of parsed.rows)if(r.stop_code)add(r.stop_code,r.parent_station||r.stop_id);
 return (code:string):StationCodeMapping=>{
  if(typeof code!=='string'||!/^[A-Z]{1,4}[0-9]{0,3}(?:\/[A-Z]{1,4}[0-9]{0,3}){0,3}$/.test(code))return {code,stationId:null,reason:'Unsupported station-code format; no guessed mapping.'};
  const parts=code.split('/'),resolved=parts.map(part=>codes.get(part));
  if(resolved.some(ids=>!ids))return {code,stationId:null,reason:'Unknown source station code; trip mass retained as unmapped.'};
  if(resolved.some(ids=>ids!.size!==1))return {code,stationId:null,reason:'Ambiguous explicit stop-code parent; no guessed mapping.'};
  const physical=new Set(resolved.map(ids=>[...ids!][0]));if(physical.size!==1)return {code,stationId:null,reason:'Combined codes do not identify one reviewed canonical station.'};
  const stationId=[...physical][0];return served.has(stationId)?{code,stationId,reason:'Explicit GTFS stop-code/parent plus reviewed canonical alias; served on selected date.'}:{code,stationId:null,reason:'Mapped physical station has no accepted service state on selected date.'};
 };
}

/** Source is a simple seven-column CSV. Reject quoting/width changes rather than reinterpret a new format. */
export function parseOdReference(csv:string,resolveCode:StationCodeResolver):OdCore{
 ensure(typeof csv==='string'&&csv.length<=60000000,'CITIZEN_OD_BYTES');const expected='YEAR_MONTH,DAY_TYPE,TIME_PER_HOUR,PT_TYPE,ORIGIN_PT_CODE,DESTINATION_PT_CODE,TOTAL_TRIPS',seen=new Set<string>(),codes=new Map<string,StationCodeMapping>(),days=new Set<string>(),hours=new Set<number>();let line=0,records=0,totalTrips=0,matchedTrips=0,period:string|null=null;
 let start=0;while(start<csv.length){let end=csv.indexOf('\n',start);if(end<0)end=csv.length;let row=csv.slice(start,end).replace(/\r$/,'');start=end+1;line++;
  if(line===1){ensure(row.replace(/^\uFEFF/,'')===expected,'CITIZEN_OD_SCHEMA');continue;}
  ensure(row.length>0&&!row.includes('"'),'CITIZEN_OD_ROW');const cells=row.split(',');ensure(cells.length===7&&cells.every(c=>c.length>0),'CITIZEN_OD_MISSING');const [month,day,hour,type,origin,destination,count]=cells;
  ensure(/^\d{4}-(0[1-9]|1[0-2])$/.test(month)&&(period===null||period===month),'CITIZEN_OD_PERIOD');period=month;
  ensure(['WEEKDAY','WEEKENDS/HOLIDAY'].includes(day)&&type==='TRAIN'&&/^\d{1,2}$/.test(hour)&&Number(hour)<=23&&/^\d+$/.test(count),'CITIZEN_OD_VALUE');const trips=Number(count);ensure(Number.isSafeInteger(trips)&&trips>=0,'CITIZEN_OD_VALUE');
  const key=cells.slice(0,6).join(',');ensure(!seen.has(key),'CITIZEN_OD_DUPLICATE');seen.add(key);
  for(const code of [origin,destination])if(!codes.has(code))codes.set(code,resolveCode(code));
  records++;totalTrips+=trips;if(codes.get(origin)!.stationId&&codes.get(destination)!.stationId)matchedTrips+=trips;ensure(Number.isSafeInteger(totalTrips),'CITIZEN_OD_OVERFLOW');days.add(day);hours.add(Number(hour));
 }
 ensure(records>0&&period,'CITIZEN_OD_EMPTY');return freezeSnapshot({version:1,policy:'od-reference-v1',sourceHash:hash(csv),period,records,totalTrips,matchedTrips,unmappedTrips:totalTrips-matchedTrips,stationMappings:[...codes.values()].sort((a,b)=>a.code.localeCompare(b.code)),dayTypes:[...days].sort(),hours:[...hours].sort((a,b)=>a-b)});
}

const stationName=(s:string)=>s.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+(?:mrt(?:\s*\/\s*lrt)?|lrt)\s+station\s*$/,'').replace(/[^\p{L}\p{N}]+/gu,'');
export function parseStationAccessPoints(value:unknown,graph:Graph,sourceHash:string):{index:StationAccessIndex;totalExits:number;matchedExits:number}{
 ensure(/^[a-f0-9]{64}$/.test(sourceHash),'CITIZEN_EXIT_HASH');const data=value as {type:string;features:unknown[]};ensure(data&&data.type==='FeatureCollection'&&Array.isArray(data.features)&&data.features.length<=10000,'CITIZEN_EXIT_SCHEMA');
 const names=new Map<string,Set<string>>(),served=new Set([...graph.states.values()].map(s=>s.stationId)),points:Record<string,GeographicProxy[]>={},seen=new Set<string>();let matchedExits=0;
 for(const station of graph.stations.values())if(served.has(station.id)){const key=stationName(station.name),ids=names.get(key)??new Set<string>();ids.add(station.id);names.set(key,ids);}
 for(const unknownFeature of data.features){const f=unknownFeature as {type:string;geometry:{type:string;coordinates:unknown[]};properties:{OBJECTID:unknown;STATION_NA:unknown;EXIT_CODE:unknown}};ensure(f&&f.type==='Feature'&&f.geometry?.type==='Point'&&Array.isArray(f.geometry.coordinates)&&f.geometry.coordinates.length===2&&f.properties,'CITIZEN_EXIT_FEATURE');
  const [lon,lat]=f.geometry.coordinates;ensure(typeof lon==='number'&&Number.isFinite(lon)&&Math.abs(lon)<=180&&typeof lat==='number'&&Number.isFinite(lat)&&Math.abs(lat)<=90,'CITIZEN_EXIT_COORDINATES');const p=f.properties;ensure((typeof p.OBJECTID==='string'||typeof p.OBJECTID==='number')&&typeof p.STATION_NA==='string'&&p.STATION_NA.trim().length>0&&typeof p.EXIT_CODE==='string','CITIZEN_EXIT_PROPERTIES');const sourceId=String(p.OBJECTID);ensure(sourceId.length>0&&!seen.has(sourceId),'CITIZEN_EXIT_DUPLICATE');seen.add(sourceId);
  const candidates=names.get(stationName(p.STATION_NA));if(candidates?.size!==1)continue;const id=[...candidates][0];(points[id]??=[]).push({lat,lon,basis:'Source exit coordinate used as an assumed access proxy, not a measured pedestrian or exit-to-platform route.',sourceId:'lta-exit:'+sourceId});matchedExits++;
 }
 for(const rows of Object.values(points))rows.sort((a,b)=>a.sourceId.localeCompare(b.sourceId));return freezeSnapshot({index:{sourceHash,points},totalExits:data.features.length,matchedExits});
}

export interface TransportData {reference:TransportDemandReference;index:StationAccessIndex}
const cache=new Map<string,TransportData>();
/** Verify current source bytes once, then return both graph-bound reference snapshots. */
export function loadTransportData(graph:Graph):TransportData{
 const key=graphCostFingerprint(graph);
 const root=process.cwd(),od=readFileSync(join(root,'data/transport/origin_destination_train_202609.csv')),exits=readFileSync(join(root,'data/transport/LTAMRTStationExitGEOJSON.geojson')),stopsBytes=readFileSync(join(root,'data/transport/mrt-network/stops.txt'));ensure(hash(od)===OD_SOURCE_SHA256&&hash(exits)===EXIT_SOURCE_SHA256&&hash(stopsBytes)===STOP_CROSSWALK_SHA256,'CITIZEN_TRANSPORT_SOURCE_CHANGED');
 const prior=cache.get(key);if(prior)return prior;
 const crosswalk=buildStationCodeCrosswalk(graph,stopsBytes.toString('utf8')),core=parseOdReference(od.toString('utf8'),crosswalk),mapped=parseStationAccessPoints(JSON.parse(exits.toString('utf8')),graph,EXIT_SOURCE_SHA256);ensure(core.period==='2026-09'&&core.records===887478&&core.sourceHash===OD_SOURCE_SHA256&&mapped.totalExits===613,'CITIZEN_TRANSPORT_REFERENCE_IDENTITY');
 const reference:TransportDemandReference={...core,exitSourceHash:EXIT_SOURCE_SHA256,exitFeatures:mapped.totalExits,matchedExits:mapped.matchedExits,limitations:['The existing files are source-byte pinned; original acquisition receipts and local GTFS provenance remain unauthenticated.','OD period September 2026 is separate from Census 2020 employment/residence aggregates and the selected service date.','Monthly station-pair trips are not unique commuters, resident-to-work journeys or demographic observations; counts do not assign citizen trips or calculate their travel times.','Mappings use explicit GTFS code/parent relationships and reviewed canonical aliases. Unsupported/ambiguous codes retain all associated unmapped trip mass.','Exact normalized unique station-name matching links exit points; unmatched exits remain counted, and no fuzzy geographic association is inferred.','Exit coordinates do not establish pedestrian connectivity, accessibility, opening status or exit-to-platform travel time.']};
 const result=freezeSnapshot({reference,index:mapped.index});if(cache.size>=8)cache.delete(cache.keys().next().value!);cache.set(key,result);return result;
}
export function loadTransportDemandReference(graph:Graph):TransportDemandReference{return loadTransportData(graph).reference;}
export function loadStationAccessPoints(graph:Graph):StationAccessIndex{return loadTransportData(graph).index;}
