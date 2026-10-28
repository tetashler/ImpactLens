import { Marker,Popup,type Map as LibreMap,type GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { Position,OriginReference } from '../../prototype/eldercare/types';
import type { FacilitiesResponse } from './api-contract';
import { geodesicCircle,toLngLat } from './geometry';
import { validAacPosition,demonstrationAacDraft } from './editor';
export interface AacMapOptions {active:boolean;placing:boolean;position:Position|null;radiusMetres:number;facilities:FacilitiesResponse|null;selectedFacility:string|null;origins:OriginReference[];focusKey:number;proposedMarker?:boolean;autoFocus?:boolean;onPlace:(position:Position)=>void;onSelect:(id:string)=>void;onDragStart:()=>void;onCancel:()=>void;onStartPlacement:()=>void;onFocus:()=>void}
const empty:FeatureCollection={type:'FeatureCollection',features:[]};
const sourceId='aac-access-radius',fillId='aac-radius-fill',lineId='aac-radius-line';
function pin(kind:string,label:string,title:string){const b=document.createElement('button');b.type='button';b.className=`aac-map-pin ${kind}`;b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.addEventListener('click',e=>e.stopPropagation());return b;}
function popupContent(heading:string,lines:string[]){const div=document.createElement('div');div.className='aac-popup';const h=document.createElement('strong');h.textContent=heading;div.append(h);for(const line of lines){const p=document.createElement('p');p.textContent=line;div.append(p);}return div;}

/** DOM markers and one geographic overlay on the existing map; no second canvas. */
export class AacMapLayer {
  private options:AacMapOptions;private previous:AacMapOptions|null=null;
  private facilities:Marker[]=[];private proxies:Marker[]=[];private proposed:Marker|null=null;private popup:Popup;private popupKind:'facility'|'proxy'|null=null;private disposed=false;
  private install=()=>{
    if(this.disposed)return;
    if(!this.map.getSource(sourceId))this.map.addSource(sourceId,{type:'geojson',data:empty});
    if(!this.map.getLayer(fillId))this.map.addLayer({id:fillId,type:'fill',source:sourceId,paint:{'fill-color':'#8bd3ac','fill-opacity':.12}});
    if(!this.map.getLayer(lineId))this.map.addLayer({id:lineId,type:'line',source:sourceId,paint:{'line-color':'#a1dfb8','line-width':2,'line-dasharray':[2,2]}});
    this.drawCircle(this.options.position);
  };
  constructor(private map:LibreMap,options:AacMapOptions){this.options=options;this.popup=new Popup({className:'aac-map-popup',maxWidth:'260px',offset:22,closeOnClick:true});this.install();map.on('style.load',this.install);this.update(options);}
  private drawCircle(position:Position|null){
    const o=this.options,valid=o.active&&validAacPosition(position)&&Number.isFinite(o.radiusMetres)&&o.radiusMetres>0&&o.radiusMetres<=5000;
    (this.map.getSource(sourceId) as GeoJSONSource|undefined)?.setData(valid?{type:'FeatureCollection',features:[geodesicCircle(position!,o.radiusMetres)]}:empty);
  }
  private showFacility(id:string|null){
    const f=this.options.facilities?.facilities.find(f=>f.id===id);
    if(f){this.popupKind='facility';this.popup.setLngLat(toLngLat(f.position)).setDOMContent(popupContent(f.name,[f.address??f.corroboration!.listedAddress,'Corroborated Active Ageing Centre; operation listed, unconfirmed.',`Historical coordinate record: ${f.recordUpdated??'date unavailable'}. Capacity and opening date unknown.`,`Operator evidence checked ${f.corroboration!.checkedDate}. Limited subset, not the entire AAC network.`])).addTo(this.map);}else if(this.popupKind==='facility'){this.popup.remove();this.popupKind=null;}
  }
  update(options:AacMapOptions){
    if(this.disposed)return;const prev=this.previous;this.options=options;
    if(!options.active){this.facilities.forEach(m=>m.remove());this.facilities=[];this.proxies.forEach(m=>m.remove());this.proxies=[];this.proposed?.remove();this.proposed=null;this.popup.remove();this.popupKind=null;this.drawCircle(null);this.previous=options;return;}
    if(!prev?.active||prev.facilities!==options.facilities){
      this.facilities.forEach(m=>m.remove());this.facilities=(options.facilities?.facilities??[]).map(f=>{
        const element=pin('existing','AAC',`Inspect AAC: ${f.name}`);
        element.addEventListener('click',()=>{if(this.options.active){this.options.onSelect(f.id);this.showFacility(f.id);}});
        return new Marker({element}).setLngLat(toLngLat(f.position)).addTo(this.map);
      });
    }
    const data=options.facilities?.facilities??[];
    this.facilities.forEach((m,i)=>m.getElement().classList.toggle('selected',data[i]?.id===options.selectedFacility));
    if(options.proposedMarker!==false&&validAacPosition(options.position)){
      if(!this.proposed){
        const element=pin('proposed','HYP','Hypothetical AAC — drag to reposition');
        this.proposed=new Marker({element,draggable:true}).setLngLat(toLngLat(options.position)).addTo(this.map);
        this.proposed.on('dragstart',()=>{if(this.options.active)this.options.onDragStart();});
        this.proposed.on('drag',()=>{const p=this.proposed?.getLngLat();if(p)this.drawCircle({lat:p.lat,lon:p.lng});});
        this.proposed.on('dragend',()=>{const p=this.proposed?.getLngLat();if(p&&this.options.active){const point={lat:Number(p.lat.toFixed(6)),lon:Number(p.lng.toFixed(6))};if(!validAacPosition(point)&&validAacPosition(this.options.position)){this.proposed!.setLngLat(toLngLat(this.options.position));this.drawCircle(this.options.position);}this.options.onPlace(point);}});
      }else this.proposed.setLngLat(toLngLat(options.position));
    }else{this.proposed?.remove();this.proposed=null;}
    if(!prev?.active||prev.origins!==options.origins){
      this.proxies.forEach(m=>m.remove());if(this.popupKind==='proxy')this.popup.remove();
      this.proxies=options.origins.map(origin=>{
        const element=pin('proxy','P',`Geographic proxy: ${origin.subzone.replaceAll('-',' ')} — not homes`);
        element.addEventListener('click',()=>{this.popupKind='proxy';this.popup.setLngLat(toLngLat(origin.position)).setDOMContent(popupContent('Modelled landmark proxy',[origin.subzone.replaceAll('-',' '),origin.provenance.description,'Aggregation reference only. No residents are physically located or animated at this point.'])).addTo(this.map);});
        return new Marker({element}).setLngLat(toLngLat(origin.position)).addTo(this.map);
      });
    }
    if(!prev?.active||prev.selectedFacility!==options.selectedFacility||prev.facilities!==options.facilities){
      this.showFacility(options.selectedFacility);
    }
    this.drawCircle(options.position);
    if((!prev?.active&&options.autoFocus!==false)||(prev?.active&&prev.focusKey!==options.focusKey))this.focus();
    this.previous=options;
  }
  handleClick(position:Position){if(this.options.active&&this.options.placing)this.options.onPlace(position);}
  focus(){
    const o=this.options,points=[...(o.facilities?.facilities.map(f=>f.position)??[]),...(validAacPosition(o.position)?[o.position]:[]),...o.origins.map(p=>p.position)];
    const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:500;
    if(!points.length){const p=demonstrationAacDraft().position!;this.map.easeTo({center:toLngLat(p),zoom:14,pitch:20,duration});return;}
    this.map.fitBounds([[Math.min(...points.map(p=>p.lon)),Math.min(...points.map(p=>p.lat))],[Math.max(...points.map(p=>p.lon)),Math.max(...points.map(p=>p.lat))]],{padding:65,maxZoom:15,pitch:20,duration});
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.map.off('style.load',this.install);this.popup.remove();this.facilities.forEach(m=>m.remove());this.proxies.forEach(m=>m.remove());this.proposed?.remove();this.facilities=[];this.proxies=[];this.proposed=null;for(const id of [lineId,fillId])if(this.map.getLayer(id))this.map.removeLayer(id);if(this.map.getSource(sourceId))this.map.removeSource(sourceId);}
}
