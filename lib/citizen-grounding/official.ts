/** Local verified official aggregate snapshots. Runtime never downloads data. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {parseCsv} from '../../prototype/mrt/csv.ts';
import {normaliseGeography} from '../../prototype/agents/prepare.ts';
import {ensure,freezeSnapshot} from '../experiments/validation.ts';
import type {AggregateRow,OfficialSource} from './contract.ts';
export interface OfficialTables {sources:OfficialSource[];labour:AggregateRow[];commuting:AggregateRow[];modes:AggregateRow[];occupations:AggregateRow[]}
export const OFFICIAL_PINS=Object.freeze({ct17565:'3608447d9af126ac805edf9f23a371d7e5fb47057bfa64534e203c5fe38d3128',ct17586:'5a2fa157e0dc8d7df17813f0a1baab2be68f9985ed2e0c9badef761aaba33735',ct17594:'1b96701295e296913c98cbe0a6828e0395ab27fb3e18e4e1f7b526ace872a204',ct17582:'28af77107c5294c53de7cb9ea7f2d4c447329bc55101a762a40eaf23eee97da4'});
export type OfficialTableId=keyof typeof OFFICIAL_PINS;
export type OfficialSnapshotReader=(id:OfficialTableId,kind:'metadata'|'csv')=>Uint8Array|string;
/** Eight literal assets let Next trace only the approved public snapshots.
 * Metadata never supplies a filesystem path, and no caller can widen a root. */
function readOfficialSnapshot(id:OfficialTableId,kind:'metadata'|'csv'):Uint8Array{
 switch(id){
  case 'ct17565':return kind==='metadata'?readFileSync(join(process.cwd(),'data/employment/singstat-census2020-ct17565/source-metadata.json')):readFileSync(join(process.cwd(),'data/employment/singstat-census2020-ct17565/original.csv'));
  case 'ct17586':return kind==='metadata'?readFileSync(join(process.cwd(),'data/employment/singstat-census2020-ct17586/source-metadata.json')):readFileSync(join(process.cwd(),'data/employment/singstat-census2020-ct17586/original.csv'));
  case 'ct17594':return kind==='metadata'?readFileSync(join(process.cwd(),'data/employment/singstat-census2020-ct17594/source-metadata.json')):readFileSync(join(process.cwd(),'data/employment/singstat-census2020-ct17594/original.csv'));
  case 'ct17582':return kind==='metadata'?readFileSync(join(process.cwd(),'data/employment/singstat-census2020-ct17582/source-metadata.json')):readFileSync(join(process.cwd(),'data/employment/singstat-census2020-ct17582/original.csv'));
 }
 throw Error('CITIZEN_OFFICIAL_ID');
}
/** Version-one manifests recorded acquisition paths in their content identity.
 * Keep that provenance byte-identical; these strings are never opened as files.
 * Current physical locations live in the strict reader/metadata above. */
export function citizenManifestSourcesV1(sources:readonly OfficialSource[]):OfficialSource[]{
 return sources.map(source=>{
  const recorded=structuredClone(source);
  if(Object.hasOwn(OFFICIAL_PINS,source.id)&&source.path==='data/employment/singstat-census2020-'+source.id+'/original.csv'){
   ensure(source.sha256===OFFICIAL_PINS[source.id as OfficialTableId],'CITIZEN_OFFICIAL_HASH');
   recorded.path='docs/datasets/singstat-census2020-'+source.id+'/original.csv';
  }
  return recorded;
 });
}
const DATASET_IDS:Record<string,string>={ct17565:'d_e9b1f437263fceebc0c1f0e60cd7b0f0',ct17586:'d_5b38192e9c6f8d2c5f38c70939c76e71',ct17594:'d_1f8f5ec7201964e365c77551cab99503',ct17582:'d_a9c214d2534f2da9587ae3bb481f3b85'};
const occupations:Record<string,string>={Legislators_SeniorOfficialsandManagers:'managers',Professionals:'professionals',AssociateProfessionalsandTechnicians:'technicians',ClericalSupportWorkers:'clerical',ServiceandSalesWorkers:'service-sales',CraftsmenandRelatedTradesWorkers:'craft',PlantandMachineOperatorsandAssemblers:'plant-machine',Cleaners_LabourersandRelatedWorkers:'elementary',Others1:'other'};
const modes:Record<string,string>={PublicBusOnly:'bus',Rail_MRT_LRT_Only:'rail',Rail_MRT_LRT_andPublicBusOnly:'rail-bus',CombinationofRail_MRT_LRT_and_orPublicBus_withOtherModes:'other',Taxi_PrivateHireCarOnly:'car-taxi',CarOnly:'car-taxi',PrivateCharteredBus_VanOnly:'other',Lorry_PickupOnly:'other',Motorcycle_ScooterOnly:'other',Others:'other',NoTransportRequired:'no-transport-required'};
const unknown=(value:string)=>value===''||value==='-'||/^n\/?a$/i.test(value);
function count(value:string){const v=value.trim();if(unknown(v))return null;ensure(/^\d+$/.test(v)&&Number.isSafeInteger(Number(v)),'CITIZEN_OFFICIAL_COUNT');return Number(v);}
export function parseOfficialTable(source:OfficialSource,bytes:Uint8Array|string):AggregateRow[]{
 const raw=typeof bytes==='string'?Buffer.from(bytes):Buffer.from(bytes);ensure(createHash('sha256').update(raw).digest('hex')===source.sha256,'CITIZEN_OFFICIAL_HASH');
 ensure(Object.hasOwn(OFFICIAL_PINS,source.id),'CITIZEN_OFFICIAL_ID');const parsed=parseCsv(raw.toString('utf8'));ensure(parsed.columns.includes('Number')&&parsed.rows.length===source.rows&&JSON.stringify(parsed.columns)===JSON.stringify(source.columns),'CITIZEN_OFFICIAL_SCHEMA');
 const result:AggregateRow[]=[],areas=new Set<string>();
 const push=(r:typeof parsed.rows[number],column:string,category:string,sex?:'male'|'female',region?:string)=>{if(!Object.hasOwn(r.values,column))return;const n=count(r.values[column]);result.push({area:normaliseGeography(r.values.Number),...(sex?{sex}:{}),...(region?{region}:{}),category,count:n,sourceId:source.id,sourceRow:r.row,...(n===null?{missingReason:'Source marker is missing/nil-negligible; no measured zero inferred.'}:{})});};
 for(const r of parsed.rows){const area=normaliseGeography(r.values.Number);ensure(area.length>0&&!areas.has(area),'CITIZEN_OFFICIAL_DUPLICATE');areas.add(area);for(const column of parsed.columns.slice(1))count(r.values[column]);
  if(source.id==='ct17565'){
   for(const [suffix,sex] of [['Males','male'],['Females','female']] as const)for(const [prefix,category] of [['LabourForce_Employed','employed'],['LabourForce_Unemployed','unemployed'],['OutsidetheLabourForce','outside-labour-force']])push(r,prefix+'_'+suffix,category,sex);
  }else if(source.id==='ct17594')for(const [column,category] of Object.entries(modes))push(r,column,category);
  else if(source.id==='ct17582')for(const [column,category] of Object.entries(occupations))push(r,column,category);
  else for(const column of parsed.columns.slice(1)){
   const region=column.startsWith('North_EastRegion_')?'north-east-region':column.startsWith('CentralRegion_')?'central-region':column.startsWith('EastRegion_')?'east-region':column.startsWith('NorthRegion_')?'north-region':column.startsWith('WestRegion_')?'west-region':column.startsWith('Total_')?'total':null;
   ensure(region,'CITIZEN_OFFICIAL_REGION');const category=column.endsWith('_Total')?'total':column.includes('CombinationsofRail')?'public-transport':column.includes('CarorTaxi')?'car-taxi':column.endsWith('_OtherModes')?'other':column.endsWith('_NoTransportRequired')?'no-transport-required':null;
   ensure(category,'CITIZEN_OFFICIAL_MODE');push(r,column,category,undefined,region);
  }
 }
 ensure(result.length>0,'CITIZEN_OFFICIAL_EMPTY');return result;
}
export function loadOfficialTables(read:OfficialSnapshotReader=readOfficialSnapshot):OfficialTables{
 const tables:OfficialTables={sources:[],labour:[],commuting:[],modes:[],occupations:[]};
 for(const id of Object.keys(OFFICIAL_PINS) as OfficialTableId[]){
  const pin=OFFICIAL_PINS[id],meta=JSON.parse(Buffer.from(read(id,'metadata')).toString('utf8'));
  ensure(meta.id===id&&meta.sha256===pin&&meta.referenceYear===2020&&meta.licenceUrl==='https://data.gov.sg/open-data-licence'&&meta.publicationUrl==='https://data.gov.sg/datasets/'+DATASET_IDS[id]+'/view'&&meta.datasetId===DATASET_IDS[id]&&meta.organisation==='Singapore Department of Statistics (SingStat)'&&typeof meta.title==='string'&&meta.title.length>0&&typeof meta.acquiredAt==='string'&&Number.isFinite(Date.parse(meta.acquiredAt))&&typeof meta.downloadUrl==='string'&&meta.downloadUrl.startsWith('https://s3.ap-southeast-1.amazonaws.com/table-downloads-ingest.data.gov.sg/'+DATASET_IDS[id]+'/')&&!meta.downloadUrl.includes('?')&&meta.path==='data/employment/singstat-census2020-'+id+'/original.csv','CITIZEN_OFFICIAL_METADATA');
  const source:OfficialSource=Object.fromEntries(['id','title','organisation','referenceYear','publicationUrl','downloadUrl','acquiredAt','sha256','path','rows','columns','licenceUrl','exclusions','missingValuePolicy'].map(k=>[k,meta[k]])) as unknown as OfficialSource;
  const rows=parseOfficialTable(source,read(id,'csv'));tables.sources.push(source);tables[id==='ct17565'?'labour':id==='ct17586'?'commuting':id==='ct17594'?'modes':'occupations'].push(...rows);
 }
 return freezeSnapshot(tables);
}
