import type { Polygon, MultiPolygon, Feature, FeatureCollection, Position } from 'geojson';
export type BuildingGeometry = Polygon | MultiPolygon;
export type Bounds = [number,number,number,number];
export interface BuildingProperties { id:string; sourceId:string; sourceObjectId:string; category:string|null; heightMetres:number; baseMetres?:number; heightBasis:'verified'|'derived'|'illustrative'; heightNote:string; attributionId:string }
export type BuildingFeature = Feature<BuildingGeometry,BuildingProperties> & {id:string};
export type BuildingCollection = FeatureCollection<BuildingGeometry,BuildingProperties>;
export interface BuildingSource { id:string; datasetId:string; title:string; publisher:string; url:string; licenceUrl:string; referenceDate:string; accessedDate:string; rawSha256:string; attribution:string }
export interface BuildingChunk { id:string; url:string; bounds:Bounds; featureCount:number; bytes:number; sha256:string }
export interface BuildingManifest { version:1; source:BuildingSource; sources?:BuildingSource[]; distribution?:'local-review-only'; featureCount:number; minZoom:number; chunks:BuildingChunk[]; heightPolicy:string }
export function ensure(ok:unknown,message='Invalid building data'):asserts ok {if(!ok)throw new Error(message);}
export function polygons(g:BuildingGeometry):Position[][][] {return g.type==='Polygon'?[g.coordinates]:g.coordinates;}
export function geometryBounds(g:BuildingGeometry):Bounds {const b:Bounds=[Infinity,Infinity,-Infinity,-Infinity];for(const p of polygons(g))for(const r of p)for(const [x,y] of r){b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}return b;}
export function intersects(a:Bounds,b:Bounds):boolean{return a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];}
export function ringArea(r:Position[]):number {const [ox,oy]=r[0];let a=0;for(let i=0;i<r.length-1;i++)a+=(r[i][0]-ox)*(r[i+1][1]-oy)-(r[i+1][0]-ox)*(r[i][1]-oy);return a/2;}
export function areaMetres(g:BuildingGeometry):number {const b=geometryBounds(g);return polygons(g).reduce((s,p)=>s+Math.abs(ringArea(p[0]))-p.slice(1).reduce((a,r)=>a+Math.abs(ringArea(r)),0),0)*111195.0802335329**2*Math.cos((b[1]+b[3])/2*Math.PI/180);}
function crosses(a:Position,b:Position,c:Position,d:Position):boolean {
  if(Math.max(a[0],b[0])<Math.min(c[0],d[0])||Math.max(c[0],d[0])<Math.min(a[0],b[0])||Math.max(a[1],b[1])<Math.min(c[1],d[1])||Math.max(c[1],d[1])<Math.min(a[1],b[1]))return false;
  const side=(p:Position,q:Position,r:Position)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  return side(a,b,c)*side(a,b,d)<0&&side(c,d,a)*side(c,d,b)<0;
}
/** Structural + proper self-crossing checks, not a complete OGC topology validator. */
export function validateGeometry(value:unknown):asserts value is BuildingGeometry {
  ensure(value!==null&&typeof value==='object');const g=value as BuildingGeometry;
  ensure(['Polygon','MultiPolygon'].includes(g.type)&&Array.isArray(g.coordinates)&&g.coordinates.length>0,'Empty or unsupported geometry');
  for(const p of polygons(g)){
    ensure(Array.isArray(p)&&p.length>0,'Empty polygon');
    for(const r of p){
      ensure(Array.isArray(r)&&r.length>=4,'Invalid ring');
      for(const c of r)ensure(Array.isArray(c)&&c.length===2&&c.every(Number.isFinite)&&c[0]>=103.55&&c[0]<=104.15&&c[1]>=1.12&&c[1]<=1.5,'Invalid Singapore lon/lat');
      ensure(r[0][0]===r.at(-1)![0]&&r[0][1]===r.at(-1)![1]&&Math.abs(ringArea(r))>1e-15,'Unclosed or degenerate ring');
      for(let i=0;i<r.length-1;i++)for(let j=i+2;j<r.length-1;j++)if(!(i===0&&j===r.length-2))ensure(!crosses(r[i],r[i+1],r[j],r[j+1]),'Self-crossing ring');
    }
    ensure(areaMetres({type:'Polygon',coordinates:p})>0,'Invalid hole area');
  }
}
export function heightPolicy(evidence?:{height?:number;heightReference?:string;floors?:number;floorReference?:string}) {
  if(evidence?.height!==undefined){ensure(Number.isFinite(evidence.height)&&evidence.height>0&&evidence.height<=1000&&typeof evidence.heightReference==='string'&&evidence.heightReference.trim().length>0,'Invalid sourced height');return {heightMetres:evidence.height,heightBasis:'verified' as const,heightNote:evidence.heightReference};}
  if(evidence?.floors!==undefined){ensure(Number.isInteger(evidence.floors)&&evidence.floors>0&&evidence.floors<=200&&!!evidence.floorReference?.trim(),'Invalid floor evidence');return {heightMetres:evidence.floors*3,heightBasis:'derived' as const,heightNote:`${evidence.floorReference}; assumed 3 metres per floor, not surveyed.`};}
  return {heightMetres:12,heightBasis:'illustrative' as const,heightNote:'Display fallback; no source height or floor count.'};
}
export function validateSource(s:BuildingSource):void {
  for(const v of [s.id,s.datasetId,s.title,s.publisher,s.attribution,s.referenceDate,s.accessedDate])ensure(typeof v==='string'&&v.length>0&&v.length<=1000&&!/[<>]/.test(v),'Invalid provenance');
  ensure(/^[a-z0-9-]+$/.test(s.id)&&/^[a-f0-9]{64}$/.test(s.rawSha256),'Invalid source identity');
  for(const u of [s.url,s.licenceUrl])ensure(typeof u==='string'&&new URL(u).protocol==='https:','Invalid source URL');
}
export function validateBuilding(value:unknown):asserts value is BuildingFeature {
  ensure(value!==null&&typeof value==='object');const f=value as BuildingFeature,p=f.properties;
  ensure(f.type==='Feature'&&p&&typeof p==='object');validateGeometry(f.geometry);
  ensure(typeof f.id==='string'&&f.id===p.id&&f.id===`${p.sourceId}:${p.sourceObjectId}`&&f.id.length<=180,'Invalid feature ID');
  ensure(typeof p.sourceId==='string'&&/^[a-z0-9-]+$/.test(p.sourceId)&&typeof p.sourceObjectId==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(p.sourceObjectId),'Invalid source ID');
  ensure(p.attributionId===p.sourceId&&(p.category===null||typeof p.category==='string'&&p.category.length<=128),'Invalid building metadata');
  ensure(Number.isFinite(p.heightMetres)&&p.heightMetres>0&&p.heightMetres<=1000&&['verified','derived','illustrative'].includes(p.heightBasis)&&typeof p.heightNote==='string'&&p.heightNote.length>0&&p.heightNote.length<=1000,'Invalid height');
  if(p.baseMetres!==undefined)ensure(Number.isFinite(p.baseMetres)&&p.baseMetres>=0&&p.baseMetres<p.heightMetres,'Invalid extrusion base');
}
export function parseBuildingManifest(value:unknown):BuildingManifest {
  ensure(value!==null&&typeof value==='object');const m=value as BuildingManifest;ensure(m.version===1&&m.source);validateSource(m.source);
  if(m.sources!==undefined){ensure(Array.isArray(m.sources)&&m.sources.length>0&&m.sources.length<=16,'Invalid source registry');const seen=new Set<string>();for(const s of m.sources){validateSource(s);ensure(!seen.has(s.id),'Duplicate source registry ID');seen.add(s.id);}}
  ensure(m.distribution===undefined||m.distribution==='local-review-only','Invalid distribution policy');
  ensure(Number.isSafeInteger(m.featureCount)&&m.featureCount>=0&&typeof m.minZoom==='number'&&Number.isFinite(m.minZoom)&&m.minZoom>=14&&m.minZoom<=17&&typeof m.heightPolicy==='string');
  ensure(Array.isArray(m.chunks)&&m.chunks.length<=2048);const ids=new Set<string>();
  for(const c of m.chunks){ensure(/^[a-z0-9-]+$/.test(c.id)&&!ids.has(c.id));ids.add(c.id);ensure(c.url===`/geography/buildings-v1/${c.id}.geojson`&&/^[a-f0-9]{64}$/.test(c.sha256));ensure(Number.isSafeInteger(c.featureCount)&&c.featureCount>0&&Number.isSafeInteger(c.bytes)&&c.bytes>0&&c.bytes<=8_000_000);ensure(Array.isArray(c.bounds)&&c.bounds.length===4&&c.bounds.every(Number.isFinite)&&103.55<=c.bounds[0]&&c.bounds[0]<=c.bounds[2]&&c.bounds[2]<=104.15&&1.12<=c.bounds[1]&&c.bounds[1]<=c.bounds[3]&&c.bounds[3]<=1.5);}
  ensure(m.featureCount===m.chunks.reduce((s,c)=>s+c.featureCount,0));return structuredClone(m);
}
