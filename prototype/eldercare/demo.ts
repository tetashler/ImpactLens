import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseCsv } from '../mrt/csv.ts';
import { prepareCensus, normaliseGeography } from '../agents/prepare.ts';
import { generatePopulation } from '../agents/generate.ts';
import type { SyntheticPopulation } from '../agents/types.ts';
import type { OriginReference, EldercareIntervention } from './types.ts';
import { ensure } from './validation.ts';

const root=new URL('../../',import.meta.url);
type Ring=number[][];
function inside(lon:number,lat:number,ring:Ring):boolean {
  let result=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];if((a[1]>lat)!==(b[1]>lat) && lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])result=!result;
  }
  return result;
}
export function createDemonstrationPopulation(size=2000,seed='eldercare-demo'): {population:SyntheticPopulation;origins:OriginReference[]} {
  const d=prepareCensus(readFileSync(new URL('data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv',root),'utf8'));
  const population=generatePopulation(d,{size,seed,planningAreas:['Bukit Merah']});
  const stopsRaw=readFileSync(new URL('data/transport/mrt-network/stops.txt',root),'utf8'),stops=parseCsv(stopsRaw).rows;
  const zonesRaw=readFileSync(new URL('data/geography/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson',root),'utf8');
  const zones=JSON.parse(zonesRaw).features as {properties:{PLN_AREA_N:string;SUBZONE_N:string};geometry:{type:string;coordinates:unknown}}[];
  const hashes=[stopsRaw,zonesRaw].map(raw=>createHash('sha256').update(raw).digest('hex'));
  const origins:OriginReference[]=[['EW18','redhill'],['EW17','tiong-bahru-station']].map(([id,expectedSubzone])=>{
    const s=stops.find(s=>s.values.stop_id===id)?.values;ensure(s,'Missing demonstration landmark station');
    const lat=Number(s.stop_lat),lon=Number(s.stop_lon);
    const matches=zones.filter(f=>{
      const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates as Ring[]]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates as Ring[][]:[];
      return polygons.some(p=>inside(lon,lat,p[0]) && !p.slice(1).some(hole=>inside(lon,lat,hole)));
    });
    ensure(matches.length===1 && normaliseGeography(matches[0].properties.PLN_AREA_N)==='bukit-merah' && normaliseGeography(matches[0].properties.SUBZONE_N)===expectedSubzone,'Demonstration landmark does not match expected Census subzone');
    return {id:`landmark-${id}`,planningArea:'bukit-merah',subzone:expectedSubzone,position:{lat,lon},provenance:{method:'explicit-geographic-proxy',description:`Repository GTFS ${id} public-station reference, not a home or residential centroid. Entire subzone cell weight assigned here only as an illustrative spatial sensitivity assumption. Membership checked in supplied MP2019 polygons, including holes. stops.txt SHA256 ${hashes[0]}; MP2019 geometry SHA256 ${hashes[1]}. These local coordinate sources are not independently surveyed residential data.`,sourceUrl:'https://github.com/tetashler/ImpactLens',referenceDate:'2026-10-27',assumptionId:`landmark-proxy-${id}`}};
  });
  return {population,origins};
}
export const demonstrationIntervention:EldercareIntervention={schemaVersion:1,id:'HYP_AAC_BUKIT_MERAH',name:'Illustrative Bukit Merah AAC',serviceType:'aac',status:'hypothetical',position:{lat:1.287,lon:103.824},availability:'assumed-available',capacity:null,eligibility:'age-only-other-criteria-unknown',rationale:'Reproducible illustrative point in the demonstration neighbourhood; no site, engineering, service-boundary or operating approval is asserted.',assumptions:[{id:'illustrative-aac-site',description:'Unsurveyed hypothetical centre position, chosen for a reproducible neighbourhood example, not to optimise reported gains.'},{id:'age-only-aac-target',description:'Target Census age bands 60+ only; actual citizenship/PR, service boundaries, interest, enrolment and availability remain unverified.'}]};
