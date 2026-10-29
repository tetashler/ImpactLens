import {selectBuildingChunks} from './display-policy.ts';
import type { Map as LibreMap, GeoJSONSource, FillExtrusionLayerSpecification } from 'maplibre-gl';
import { parseBuildingManifest,validateBuilding,intersects,geometryBounds,ensure,type BuildingManifest,type BuildingCollection,type BuildingChunk,type Bounds } from './contract.ts';
export interface BuildingStatus {state:'waiting-for-map'|'loading'|'ready'|'hidden'|'overview'|'error'|'disposed';features:number;chunks:number;message:string;limited?:boolean;candidateChunks?:number}
export interface BuildingLayerOptions { minZoom?:number; beforeId?:string; fetcher?:typeof fetch; onStatus?:(status:BuildingStatus)=>void }
const SOURCE='sg-buildings',LAYER='sg-buildings-extrusion';
const empty=():BuildingCollection=>({type:'FeatureCollection',features:[]});
export function buildingLayerStyle():FillExtrusionLayerSpecification{return {id:LAYER,type:'fill-extrusion',source:SOURCE,minzoom:14,layout:{visibility:'visible'},paint:{'fill-extrusion-height':['get','heightMetres'],'fill-extrusion-base':['coalesce',['get','baseMetres'],0],'fill-extrusion-color':['match',['get','heightBasis'],'verified','#8ba9ad','derived','#7f999c','#71888c'],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':true}};}
/** One source/layer; bounded viewport loading and a byte-bounded process-local LRU.
 * Instantiate once per map. It owns no camera, control or animation state. */
export class BuildingLayer {
  private map:LibreMap;private manifest:BuildingManifest;private options:BuildingLayerOptions;private minZoom:number;
  private visible=true;private disposed=false;private revision=0;private abort?:AbortController;private owned=false;private waiting=false;
  private cache=new Map<string,{data:BuildingCollection;bytes:number}>();private cachedBytes=0;
  private changed=()=>{void this.refresh();};
  private readyChanged=()=>{if(this.waiting&&this.map.isStyleLoaded()){this.waiting=false;void this.refresh();}};
  constructor(map:LibreMap,manifest:BuildingManifest,options:BuildingLayerOptions={}){
    this.map=map;this.manifest=parseBuildingManifest(manifest);this.options=options;this.minZoom=options.minZoom??this.manifest.minZoom;
    // Preserve legacy display overrides; a stricter camera gate may exceed preparation metadata.
    ensure(Number.isFinite(this.minZoom)&&this.minZoom>=12.5&&this.minZoom<=20,'Invalid building display zoom');
    // A technical preview guard, not a legal clearance for public localhost demos.
    if(this.manifest.distribution==='local-review-only'&&typeof location!=='undefined')ensure(['localhost','127.0.0.1','[::1]'].includes(location.hostname),'Combined building licence review required before public use');
    ensure(!map.getSource(SOURCE)&&!map.getLayer(LAYER),'A building adapter is already registered');
    map.on('moveend',this.changed);map.on('load',this.changed);map.on('style.load',this.changed);map.on('idle',this.readyChanged);
  }
  private status(state:BuildingStatus['state'],features=0,chunks=0,message='',display?:{limited:boolean;candidateChunks:number}) {if(!this.disposed||state==='disposed')this.options.onStatus?.({state,features,chunks,message:message||this.manifest.source.attribution,...display});}
  private addExtrusion(){const style=buildingLayerStyle();style.minzoom=this.minZoom;this.map.addLayer(style,this.options.beforeId&&this.map.getLayer(this.options.beforeId)?this.options.beforeId:undefined);}
  private register(){
    if(this.map.getSource(SOURCE)){ensure(this.owned,'Source ID collision');if(!this.map.getLayer(LAYER))this.addExtrusion();return;}
    const s=this.manifest.source;
    // Source strings are treated as text; links are emitted only from validated HTTPS metadata.
    const escape=(t:string)=>t.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    const attribution=(this.manifest.sources??[s]).map(src=>`${escape(src.attribution)} &middot; <a href="${escape(src.url)}">Source</a> &middot; <a href="${escape(src.licenceUrl)}">${src.licenceUrl.includes('opendatacommons')?'ODbL':'Singapore Open Data Licence'}</a>`).join(' | ');
    this.map.addSource(SOURCE,{type:'geojson',data:empty(),maxzoom:16,tolerance:.1,attribution});
    this.owned=true;
    try {this.addExtrusion();}
    catch(error){this.map.removeSource(SOURCE);this.owned=false;throw error;}
  }
  private async load(chunk:BuildingChunk,signal:AbortSignal):Promise<BuildingCollection>{
    const cached=this.cache.get(chunk.id);if(cached){this.cache.delete(chunk.id);this.cache.set(chunk.id,cached);return cached.data;}
    const r=await(this.options.fetcher??fetch)(chunk.url,{signal,cache:'force-cache'});ensure(r.ok,'Building asset unavailable');
    const declared=Number(r.headers.get('content-length'));ensure(!declared||declared<=8_000_000,'Oversized building chunk');
    const bytes=await r.arrayBuffer();ensure(bytes.byteLength===chunk.bytes&&bytes.byteLength<=8_000_000,'Invalid chunk size');
    const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');ensure(sha===chunk.sha256,'Building checksum mismatch');
    const d=JSON.parse(new TextDecoder().decode(bytes)) as BuildingCollection;ensure(d.type==='FeatureCollection'&&Array.isArray(d.features)&&d.features.length===chunk.featureCount,'Invalid chunk');
    const allowed=new Set((this.manifest.sources??[this.manifest.source]).map(s=>s.id));
    const ids=new Set<string>();for(const f of d.features){validateBuilding(f);ensure(allowed.has(f.properties.sourceId)&&!ids.has(String(f.id)),'Invalid chunk provenance/ID');ids.add(String(f.id));}
    if(!signal.aborted&&!this.disposed){this.cache.set(chunk.id,{data:d,bytes:chunk.bytes});this.cachedBytes+=chunk.bytes;while(this.cachedBytes>12_000_000&&this.cache.size>1){const id=this.cache.keys().next().value!,old=this.cache.get(id)!;this.cache.delete(id);this.cachedBytes-=old.bytes;}}
    return d;
  }
  async refresh():Promise<void>{
    if(this.disposed)return;
    const revision=++this.revision;this.abort?.abort();this.abort=new AbortController();const signal=this.abort.signal;
    if(!this.map.isStyleLoaded()){this.waiting=true;this.status('waiting-for-map');return;}
    this.waiting=false;
    if(!this.visible){this.status('hidden');return;}
    try {
      this.register();
      if(this.map.getZoom()<this.minZoom){(this.map.getSource(SOURCE) as GeoJSONSource).setData(empty());this.status('overview',0,0,`Zoom to ${this.minZoom} for sourced building footprints.`);return;}
      const b=this.map.getBounds(),bounds:Bounds=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()];
      const selection=selectBuildingChunks(this.manifest.chunks,bounds,this.map.getCenter?.()),chunks=selection.chunks;
      this.status('loading',0,chunks.length);
      let next=0,failed=0;const loaded:BuildingCollection[]=[];
      await Promise.all(Array.from({length:Math.min(3,chunks.length)},async()=>{while(next<chunks.length&&!signal.aborted){const chunk=chunks[next++];try{loaded.push(await this.load(chunk,signal));}catch{if(!signal.aborted)failed++;}}}));
      if(this.disposed||signal.aborted||revision!==this.revision)return;
      const seen=new Set<string>(),data=empty();for(const d of loaded)for(const f of d.features)if(!seen.has(String(f.id))&&intersects(bounds,geometryBounds(f.geometry))){seen.add(String(f.id));data.features.push(f);}
      data.features.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
      (this.map.getSource(SOURCE) as GeoJSONSource).setData(data);
      const message=selection.limited?`Display budget: ${chunks.length} of ${selection.candidateChunks} viewport chunks selected; zoom in for detail. Coverage is incomplete.${failed?' Some selected chunks are unavailable.':''}`:failed?'Some building chunks are unavailable; coverage is incomplete.':undefined;
      this.status(failed?'error':'ready',data.features.length,chunks.length,message,{limited:selection.limited,candidateChunks:selection.candidateChunks});
    }catch{if(!this.disposed&&!signal.aborted)this.status('error',0,0,'Building layer unavailable; other map tools remain usable.');}
  }
  setVisible(visible:boolean):void {if(this.disposed)return;this.visible=visible;this.abort?.abort();if(this.map.getLayer(LAYER))this.map.setLayoutProperty(LAYER,'visibility',visible?'visible':'none');void this.refresh();}
  dispose():void {if(this.disposed)return;this.disposed=true;this.revision++;this.abort?.abort();this.map.off('moveend',this.changed);this.map.off('load',this.changed);this.map.off('style.load',this.changed);this.map.off('idle',this.readyChanged);this.cache.clear();this.cachedBytes=0;if(this.owned){if(this.map.getLayer(LAYER))this.map.removeLayer(LAYER);if(this.map.getSource(SOURCE))this.map.removeSource(SOURCE);}this.status('disposed');}
}
