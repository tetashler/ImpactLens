import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {freezeSnapshot,ensure} from '../../experiments/validation.ts';
import {geographicKey,insideGeometry,type GeographyIndex,type XY} from '../../society/geography.ts';
let cached:GeographyIndex|undefined;
export function buildSocietyGeography():GeographyIndex{
 if(cached)return cached;const bytes=readFileSync(join(process.cwd(),'data/geography/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson')),raw=JSON.parse(bytes.toString('utf8')),keys=new Set<string>(),anchors:GeographyIndex['anchors']=[];
 for(const f of raw.features){const area=f.properties.PLN_AREA_N,zone=f.properties.SUBZONE_N,id=f.properties.SUBZONE_C;if(typeof area!=='string'||typeof zone!=='string'||typeof id!=='string')continue;const key=geographicKey(area)+'/'+geographicKey(zone);ensure(!keys.has(key),'Ambiguous geographic identity.');keys.add(key);const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[];if(!polygons.length)continue;
  const all=polygons.flatMap((p:number[][][])=>p[0]) as number[][];const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);const candidates:XY[]=[];
  for(let x=0;x<21;x++)for(let y=0;y<21;y++){const p:XY=[loX+(hiX-loX)*(x+0.5)/21,loY+(hiY-loY)*(y+0.5)/21];if(insideGeometry(p,f.geometry))candidates.push(p);}
  candidates.sort((a,b)=>Math.hypot(a[0]-(loX+hiX)/2,a[1]-(loY+hiY)/2)-Math.hypot(b[0]-(loX+hiX)/2,b[1]-(loY+hiY)/2));if(candidates.length<2)continue;
  anchors.push({planningArea:geographicKey(area),subzone:geographicKey(zone),sourceId:id,residential:candidates[0],community:candidates[Math.min(12,candidates.length-1)]});
 }
 return cached=freezeSnapshot({version:1,sourceHash:createHash('sha256').update(bytes).digest('hex'),sourceUrl:'https://data.gov.sg/datasets/d_8594ae9ff96d0c708bc2af633048edfb/view',referenceYear:2019,anchors,limitations:['URA Master Plan 2019 subzone boundaries, existing local source, Singapore Open Data Licence; retain application source/licence restrictions.','Only unambiguous normalised planning-area/subzone name pairs match Census strata. Unmatched or foreign profiles remain unlocated.','Two deterministic polygon-interior grid samples are synthetic residential/community context markers, not actual addresses, buildings, routes or service locations.']});
}
