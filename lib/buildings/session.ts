import { parseBuildingManifest, type BuildingManifest } from './contract.ts';
import type { BuildingStatus } from './layer.ts';

export interface BuildingHandle { setVisible(visible:boolean):void; refresh():Promise<void>; dispose():void }
interface Options {
  createLayer:(manifest:BuildingManifest,onStatus:(status:BuildingStatus)=>void)=>BuildingHandle;
  onStatus?:(status:BuildingStatus)=>void;
  onManifest?:(manifest:BuildingManifest)=>void;
  fetcher?:typeof fetch;
  isCurrent?:()=>boolean;
  hostname?:string;
}
/** Owns the manifest boundary only; BuildingLayer owns chunks, camera refresh and cache. */
export class BuildingCatalogueSession {
  private visible=false;private disposed=false;private revision=0;
  private controller?:AbortController;private pending?:Promise<void>;private layer?:BuildingHandle;
  private options:Options;
  constructor(options:Options){this.options=options;}
  private current(){return !this.disposed&&(this.options.isCurrent?.()??true);}
  private emit(status:BuildingStatus){if(this.current())this.options.onStatus?.(status);}
  setVisible(visible:boolean):Promise<void>{
    if(!this.current())return Promise.resolve();this.visible=visible;
    if(!visible){this.revision++;this.controller?.abort();this.pending=undefined;this.layer?.setVisible(false);this.emit({state:'hidden',features:0,chunks:0,message:'3D buildings are off.'});return Promise.resolve();}
    if(this.layer){this.layer.setVisible(true);return Promise.resolve();}
    return this.pending??this.load();
  }
  retry():Promise<void>{if(!this.current()||!this.visible)return Promise.resolve();return this.layer?this.layer.refresh():this.pending??this.load();}
  private load():Promise<void>{
    const hostname=this.options.hostname??(typeof location==='undefined'?'':location.hostname);
    if(!['localhost','127.0.0.1','[::1]'].includes(hostname)){
      this.emit({state:'error',features:0,chunks:0,message:'Unified buildings require internal loopback review. Public demonstration is not cleared.'});return Promise.resolve();
    }
    const revision=++this.revision,controller=new AbortController();this.controller=controller;
    const accepts=()=>this.current()&&this.visible&&revision===this.revision&&!controller.signal.aborted;
    this.emit({state:'loading',features:0,chunks:0,message:'Loading the internal unified building catalogue…'});
    this.pending=(async()=>{
      try {
        const response=await(this.options.fetcher??fetch)('/geography/buildings-v1/unified-manifest.json',{signal:controller.signal,cache:'no-store'});
        if(!accepts())return;if(!response.ok)throw new Error('Unavailable manifest');
        const bytes=await response.arrayBuffer();if(!accepts())return;if(bytes.byteLength>1_000_000)throw new Error('Manifest budget');
        const manifest=parseBuildingManifest(JSON.parse(new TextDecoder().decode(bytes)));
        if(manifest.distribution!=='local-review-only'||!['hdb','ura','overture'].every(id=>manifest.sources?.some(s=>s.id===id)))throw new Error('Not the reviewed unified source');
        if(!accepts())return;
        let owned:BuildingHandle|undefined;
        const handle=this.options.createLayer(manifest,status=>{
          if(!this.current()||status.state==='disposed'||(owned&&this.layer!==owned)||(!this.visible&&status.state!=='hidden'))return;
          this.emit(status);
        });
        owned=handle;this.layer=handle;this.options.onManifest?.(manifest);handle.setVisible(this.visible);
      }catch{
        if(accepts())this.emit({state:'error',features:0,chunks:0,message:'Unified buildings unavailable. Retry or select Existing HDB; map tools remain usable.'});
      }finally{if(this.controller===controller)this.pending=undefined;}
    })();
    return this.pending;
  }
  dispose():void{if(this.disposed)return;this.disposed=true;this.visible=false;this.revision++;this.controller?.abort();this.pending=undefined;const layer=this.layer;this.layer=undefined;layer?.dispose();}
}
