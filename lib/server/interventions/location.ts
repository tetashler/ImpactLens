/** Deterministic user-marker context from the existing official boundary snapshot. No facility outcome model. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {insideGeometry} from '../../society/geography.ts';
import {parseScenarioGeometry,type ScenarioGeometry} from '../../plots/geometry.ts';
import type {HybridLocation} from '../../interventions/explore-contract.ts';
let cached:{sha256:string;features:{properties:Record<string,unknown>;geometry:Parameters<typeof insideGeometry>[1]}[]}|undefined;
export function locatePlottedSites(value:ScenarioGeometry):HybridLocation[]{
 const geometry=parseScenarioGeometry(value);if(!cached){const bytes=readFileSync(join(process.cwd(),'data/geography/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson'));cached={sha256:createHash('sha256').update(bytes).digest('hex'),features:JSON.parse(bytes.toString('utf8')).features};}
 return geometry.features.filter(f=>f.kind==='point').slice(0,32).map(point=>{
  const matches=cached!.features.filter(f=>insideGeometry([point.coordinate.lon,point.coordinate.lat],f.geometry));const p=matches.length===1?matches[0].properties:null;
  return {pointId:point.id,coordinate:point.coordinate,planningArea:typeof p?.PLN_AREA_N==='string'?p.PLN_AREA_N:null,subzone:typeof p?.SUBZONE_N==='string'?p.SUBZONE_N:null,sourceId:typeof p?.SUBZONE_C==='string'?p.SUBZONE_C:null,sourceSha256:cached!.sha256,referenceYear:2019};
 });
}
