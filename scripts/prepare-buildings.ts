/** Offline by default. --download is the sole network step; raw bytes stay separate. */
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { prepareBuildings,partitionBuildings } from '../lib/buildings/prepare.ts';
import { geometryBounds,intersects,areaMetres,parseBuildingManifest,type BuildingSource,type BuildingManifest } from '../lib/buildings/contract.ts';
const dataset='d_ee3bd86e1334fbc58b520cd987090e54',dir='tmp/phase7c/raw',path=`${dir}/ura-buildings.geojson`,out='public/geography/buildings-v1';
const digest=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
const expectedRawSha='ab97c16df4a76456c8551cc34b28f8ff0ec0285b6b5bb8487bb001e2434c691c';
if(process.argv.includes('--download')){
  await mkdir(dir,{recursive:true});
  const response=await fetch(`https://api-open.data.gov.sg/v1/public/api/datasets/${dataset}/poll-download`);if(!response.ok)throw new Error('Dataset download discovery unavailable');
  const poll=await response.json();if(poll.code!==0||!poll.data?.url)throw new Error('Dataset not ready for download');
  const result=await fetch(poll.data.url);if(!result.ok)throw new Error('Dataset download unavailable');const bytes=new Uint8Array(await result.arrayBuffer());
  await writeFile(`${dir}/ura-${digest(bytes)}.geojson`,bytes,{flag:'wx'}).catch((e:NodeJS.ErrnoException)=>{if(e.code!=='EEXIST')throw e;});
  if(digest(bytes)!==expectedRawSha)throw new Error('Source release changed. Download preserved by checksum; review metadata/date/licence before updating the pinned snapshot.');
  await writeFile(path,bytes,{flag:'wx'}).catch((e:NodeJS.ErrnoException)=>{if(e.code!=='EEXIST')throw e;});
  // Public download links expire. Persist no signed URL, only stable acquisition identity.
  await writeFile(`${dir}/retrieval.json`,JSON.stringify({dataset,endpoint:`https://api-open.data.gov.sg/v1/public/api/datasets/${dataset}/poll-download`,accessedDate:new Date().toISOString().slice(0,10)},null,2));
}
const start=performance.now(),raw=await readFile(path);
if(digest(raw)!==expectedRawSha)throw new Error('Unexpected source bytes; review provenance before preparing a new release.');
const receipt=JSON.parse(await readFile(`${dir}/retrieval.json`,'utf8'));
if(receipt.dataset!==dataset||typeof receipt.accessedDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(receipt.accessedDate)||new Date(receipt.accessedDate).toISOString().slice(0,10)!==receipt.accessedDate)throw new Error('A valid acquisition receipt is required');
const source:BuildingSource={id:'ura-mp2019',datasetId:dataset,title:'Amendment to Master Plan 2019 Building layer',publisher:'Urban Redevelopment Authority',url:`https://data.gov.sg/datasets/${dataset}/view`,licenceUrl:'https://data.gov.sg/open-data-licence',referenceDate:'2025-09',accessedDate:receipt.accessedDate,rawSha256:digest(raw),attribution:`URA indicative building footprints (Sep 2025), accessed ${receipt.accessedDate}; incomplete coverage. Heights illustrative, not surveyed.`};
const prepared=prepareBuildings(JSON.parse(raw.toString()),source);
await mkdir(out,{recursive:true});const chunks:BuildingManifest['chunks']=[];
for(const group of partitionBuildings(prepared.collection)){
  const text=JSON.stringify(group.collection),sha256=digest(text),id=`${group.id}-${sha256.slice(0,16)}`;
  await writeFile(`${out}/${id}.geojson`,text);chunks.push({id,url:`/geography/buildings-v1/${id}.geojson`,bounds:group.bounds,featureCount:group.collection.features.length,bytes:Buffer.byteLength(text),sha256});
}
const manifest=parseBuildingManifest({version:1,source,featureCount:prepared.collection.features.length,minZoom:14,chunks,heightPolicy:'All 12 m illustrative fallbacks. Source contains no measured height/floor attribute. BLDG_TYPE is retained as an untranslated source code.'});
await writeFile(`${out}/manifest.json`,JSON.stringify(manifest));
const hdbBytes=await readFile('data/buildings/HDBExistingBuilding.geojson'),hdb=prepareBuildings(JSON.parse(hdbBytes.toString()),{...source,id:'hdb-local',datasetId:'local-hdb-supplied',publisher:'Housing & Development Board',url:'https://data.gov.sg/datasets/d_16b157c52ed637edd6ba1232e026258d/view',referenceDate:'Supplied snapshot; acquisition date unknown',title:'Supplied HDB Existing Building',rawSha256:digest(hdbBytes),attribution:'Supplied local HDB footprints; source acquisition provenance remains unverified.'});
const regions:Record<string,[number,number]>={'tiong-bahru':[103.827,1.286],sengkang:[103.895,1.391],tampines:[103.945,1.354],orchard:[103.834,1.304],downtown:[103.851,1.283],jurong:[103.742,1.333],industrial:[103.705,1.322]};
const coverage=Object.entries(regions).map(([name,[lon,lat]])=>{const box:[number,number,number,number]=[lon-.01,lat-.01,lon+.01,lat+.01];return {name,bounds:box,...Object.fromEntries([['hdb',hdb],['ura',prepared]].map(([key,p])=>{const list=(p as typeof prepared).collection.features.filter(f=>intersects(geometryBounds(f.geometry),box));return [key,{featuresIntersectingBox:list.length,footprintAreaSquareMetres:list.reduce((s,f)=>s+areaMetres(f.geometry),0)}];}))};});
const report={source,rawBytes:raw.length,hdbRawSha256:digest(hdbBytes),hdbAudit:hdb.audit,uraAudit:prepared.audit,coverage,chunkCount:chunks.length,derivedBytes:chunks.reduce((s,c)=>s+c.bytes,0),largestChunkBytes:Math.max(...chunks.map(c=>c.bytes)),manifestBytes:Buffer.byteLength(JSON.stringify(manifest)),preparationMs:performance.now()-start,processPeakRssBytes:process.resourceUsage().maxRSS*1024};
await mkdir('tmp/phase7c',{recursive:true});await writeFile('tmp/phase7c/audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,hdbAudit:undefined,uraAudit:undefined,coverage:undefined,validatedFeatures:manifest.featureCount,excluded:prepared.audit.excluded.length,duplicates:prepared.audit.duplicates.length},null,2));
