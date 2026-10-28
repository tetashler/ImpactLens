import type { BuildingSource,BuildingCollection,BuildingFeature,Bounds } from './contract.ts';
import { ensure,validateSource,validateGeometry,validateBuilding,polygons,geometryBounds,ringArea,heightPolicy,areaMetres } from './contract.ts';

/** Canonical exact-geometry key ignores ring start/winding and polygon/hole order. */
function key(f:BuildingFeature):string {
  const rings=(r:number[][])=>{const a=r.slice(0,-1).map(c=>c.join(','));const rotate=(v:string[])=>{let at=0;for(let i=1;i<v.length;i++)if(v[i]<v[at])at=i;return [...v.slice(at),...v.slice(0,at)].join(';');};return [rotate(a),rotate([...a].reverse())].sort()[0];};
  return polygons(f.geometry).map(p=>`${rings(p[0])}|${p.slice(1).map(rings).sort().join('|')}`).sort().join('||');
}
export function prepareBuildings(value:unknown,source:BuildingSource) {
  validateSource(source);ensure(value!==null&&typeof value==='object');const raw=value as {type:string;features:unknown[]};ensure(raw.type==='FeatureCollection'&&Array.isArray(raw.features));
  const collection:BuildingCollection={type:'FeatureCollection',features:[]},seen=new Map<string,BuildingFeature>(),rounded=new Map<string,string>(),ids=new Set<string>();
  const audit={inputCount:raw.features.length,excluded:[] as {index:number;reason:string}[],duplicates:[] as {id:string;retainedId:string;category:string|null;retainedCategory:string|null}[],roundingCollisions:[] as {id:string;otherId:string}[],windingReversals:0,precisionFallbacks:0,maxRelativeAreaChange:0,sourceFields:[] as string[],dates:[] as string[],geometryTypes:{} as Record<string,number>,areaSquareMetres:{min:0,median:0,p95:0,max:0},bounds:[Infinity,Infinity,-Infinity,-Infinity] as Bounds};
  const fields=new Set<string>(),dates=new Set<string>(),areas:number[]=[];
  for(const [index,value] of raw.features.entries())try {
    const input=value as {type:string;properties:Record<string,unknown>;geometry:unknown};ensure(input.type==='Feature'&&input.properties&&typeof input.properties==='object');
    Object.keys(input.properties).forEach(k=>fields.add(k));if(input.properties.FMEL_UPD_D)dates.add(String(input.properties.FMEL_UPD_D));
    const objectId=String(input.properties.OBJECTID);ensure(/^[a-zA-Z0-9_-]{1,80}$/.test(objectId)&&input.properties.OBJECTID!==undefined,'Missing source OBJECTID');
    validateGeometry(input.geometry);const originalArea=areaMetres(input.geometry);let geometry=structuredClone(input.geometry);
    for(const precision of [6,7,15]){
      geometry=structuredClone(input.geometry);
      for(const p of polygons(geometry))for(const r of p)for(const c of r){c[0]=Number(c[0].toFixed(precision));c[1]=Number(c[1].toFixed(precision));}
      try{validateGeometry(geometry);ensure(Math.abs(areaMetres(geometry)-originalArea)/originalArea<=.01,'Rounding exceeds area tolerance');if(precision>6)audit.precisionFallbacks++;break;}catch{if(precision===15)throw new Error('Unable to preserve geometry while rounding');}
    }
    for(const p of polygons(geometry))for(const [i,r] of p.entries()){
      if((ringArea(r)>0)!==(i===0)){r.reverse();audit.windingReversals++;}
    }
    validateGeometry(geometry);const area=areaMetres(geometry);audit.maxRelativeAreaChange=Math.max(audit.maxRelativeAreaChange,Math.abs(area-originalArea)/originalArea);
    const id=`${source.id}:${objectId}`;
    const f:BuildingFeature={type:'Feature',id,geometry,properties:{id,sourceId:source.id,sourceObjectId:objectId,category:typeof input.properties.BLDG_TYPE==='string'?input.properties.BLDG_TYPE:null,...heightPolicy(),attributionId:source.id}};
    validateBuilding(f);
    const originalKey=key({...f,geometry:input.geometry}),duplicate=seen.get(originalKey);if(duplicate){audit.duplicates.push({id,retainedId:duplicate.id,category:f.properties.category,retainedCategory:duplicate.properties.category});continue;}
    const roundedKey=key(f),collision=rounded.get(roundedKey);if(collision)audit.roundingCollisions.push({id,otherId:collision});rounded.set(roundedKey,id);
    ensure(!ids.has(id),'Conflicting repeated OBJECTID');ids.add(id);seen.set(originalKey,f);collection.features.push(f);areas.push(area);
    audit.geometryTypes[geometry.type]=(audit.geometryTypes[geometry.type]??0)+1;
    const b=geometryBounds(geometry);for(let i=0;i<4;i++)audit.bounds[i]=i<2?Math.min(audit.bounds[i],b[i]):Math.max(audit.bounds[i],b[i]);
  }catch(error){audit.excluded.push({index,reason:error instanceof Error?error.message:'Invalid feature'});}
  areas.sort((a,b)=>a-b);audit.areaSquareMetres={min:areas[0]??0,median:areas[Math.floor(areas.length*.5)]??0,p95:areas[Math.floor(areas.length*.95)]??0,max:areas.at(-1)??0};audit.sourceFields=[...fields].sort();audit.dates=[...dates].sort();
  return {source:structuredClone(source),collection,audit};
}
export function partitionBuildings(collection:BuildingCollection,cellDegrees=0.02){
  ensure(Number.isFinite(cellDegrees)&&cellDegrees>0&&cellDegrees<=.1);const groups=new Map<string,{id:string;bounds:Bounds;collection:BuildingCollection}>();
  for(const f of collection.features){const b=geometryBounds(f.geometry),id=`x${Math.floor((b[0]+b[2])/2/cellDegrees)}-y${Math.floor((b[1]+b[3])/2/cellDegrees)}`;
    let group=groups.get(id);if(!group){group={id,bounds:[...b],collection:{type:'FeatureCollection',features:[]}};groups.set(id,group);}
    group.collection.features.push(f);for(let i=0;i<4;i++)group.bounds[i]=i<2?Math.min(group.bounds[i],b[i]):Math.max(group.bounds[i],b[i]);
  }
  return [...groups.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
