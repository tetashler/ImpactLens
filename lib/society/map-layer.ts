import type {Map as LibreMap,GeoJSONSource,MapMouseEvent} from 'maplibre-gl';
import type {SocietyWorld} from './contract.ts';
import {societyMapSnapshot} from './geography.ts';
export interface SocietyMapOptions {world:SocietyWorld|null;selected:string|null;visible:boolean;onSelect:(id:string)=>void}
const sourceId='society-context-people',layerId='society-context-dots';
/** A single batched/clipped MapLibre source: maximum 64 context markers, no per-person Three objects. */
export class SocietyMapLayer{
 private map:LibreMap;private options:SocietyMapOptions;private focused:string|null=null;
 constructor(map:LibreMap,options:SocietyMapOptions){this.map=map;this.options=options;map.addSource(sourceId,{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:layerId,type:'circle',source:sourceId,paint:{'circle-radius':5,'circle-color':'#82dbc5','circle-stroke-width':1.5,'circle-stroke-color':'#102834','circle-opacity':0.9}});map.on('click',layerId,this.click);map.on('style.load',this.refresh);this.update(options);}
 private refresh=()=>this.update(this.options);
 private click=(e:MapMouseEvent)=>{const id=this.map.queryRenderedFeatures(e.point,{layers:[layerId]})[0]?.properties?.agentId;if(typeof id==='string')this.options.onSelect(id);};
 update(options:SocietyMapOptions){this.options=options;if(!this.map.getSource(sourceId))this.map.addSource(sourceId,{type:'geojson',data:{type:'FeatureCollection',features:[]}});if(!this.map.getLayer(layerId))this.map.addLayer({id:layerId,type:'circle',source:sourceId,paint:{'circle-radius':5,'circle-color':'#82dbc5','circle-stroke-width':1.5,'circle-stroke-color':'#102834'}});const w=options.world;const data=w?societyMapSnapshot(w).features:{type:'FeatureCollection' as const,features:[]};(this.map.getSource(sourceId) as GeoJSONSource|undefined)?.setData(data);this.map.setLayoutProperty(layerId,'visibility',options.visible?'visible':'none');this.map.setPaintProperty(layerId,'circle-radius',['case',['==',['get','agentId'],options.selected??''],9,5]);if(options.visible&&options.selected&&options.selected!==this.focused){const feature=data.features.find(f=>f.properties.agentId===options.selected);if(feature){this.focused=options.selected;this.map.easeTo({center:feature.geometry.coordinates as [number,number],zoom:Math.max(this.map.getZoom(),12),duration:400});}}}
 dispose(){this.map.off('style.load',this.refresh);this.map.off('click',layerId,this.click);if(this.map.getLayer(layerId))this.map.removeLayer(layerId);if(this.map.getSource(sourceId))this.map.removeSource(sourceId);}
}
