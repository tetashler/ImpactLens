import * as THREE from 'three';
import { MercatorCoordinate, type Map as LibreMap, type CustomLayerInterface, type CustomRenderMethodInput } from 'maplibre-gl';
import { createCitizenScene, mercatorUnitsPerMetre, rayFromProjection } from './scene';
import { PlaybackClock, sampleCitizenAnimation, type AnimationSample } from './playback';
import { selectCitizenSample, type CitizenView, type CitizenViewPair } from './data';
export interface CitizenStats {visible:number;fps:number|null;drawCalls:number;status:string;elapsedSeconds:number}
export interface CitizenLayerOptions {pair:CitizenViewPair;view:CitizenView;selectedId:string|null;playing:boolean;speed:number;resetKey:number;enabled:boolean;onStats:(stats:CitizenStats)=>void}
/** One shared-context layer, one visual clock, twelve instanced body-part batches. */
export class CitizenLayer implements CustomLayerInterface {
  id='miniature-citizens'; type='custom' as const; renderingMode='3d' as const;
  private map!:LibreMap;
  private renderer?:THREE.WebGLRenderer;
  private rig?:ReturnType<typeof createCitizenScene>;
  private camera=new THREE.Camera(); private clock=new PlaybackClock();
  private ids:string[]=[]; private drawn:string[]=[];
  private origin={lon:103.85,lat:1.37}; private frame=new THREE.Matrix4();
  private lastReport=0; private frames=0; private reportRequested=true; private reduced=false; private media?:MediaQueryList;
  private displayed=new Map<string,AnimationSample>(); private transitionFrom=new Map<string,AnimationSample>(); private transitionStart=-Infinity;
  private onMotion=()=>{this.reduced=this.media?.matches??false;this.reportRequested=true;this.map?.triggerRepaint();};
  private onMapIdle=()=>{this.reportRequested=true;this.map?.triggerRepaint();};
  constructor(private options:CitizenLayerOptions) {}
  onAdd(map:LibreMap,gl:WebGL2RenderingContext) {
    this.map=map;this.rig=createCitizenScene(300);
    this.renderer=new THREE.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:true});this.renderer.autoClear=false;
    this.media=matchMedia('(prefers-reduced-motion: reduce)');this.onMotion();this.media.addEventListener('change',this.onMotion);
    map.on('moveend',this.onMapIdle);document.addEventListener('visibilitychange',this.onMapIdle);
    this.update(this.options,true);
  }
  update(next:CitizenLayerOptions,initial=false) {
    const previous=this.options;this.options=next;const now=performance.now();
    this.reportRequested=true;
    if(previous.playing!==next.playing){this.lastReport=now;this.frames=0;}
    if(previous.view!==next.view&&!this.reduced){this.transitionFrom=new Map(this.displayed);this.transitionStart=now;}
    if(initial||previous.pair!==next.pair){
      this.ids=selectCitizenSample(next.pair,300);
      this.origin=next.pair.baseline.animations.find(a=>a.agentId===this.ids[0])?.position??{lon:103.85,lat:1.37};
      const anchor=MercatorCoordinate.fromLngLat([this.origin.lon,this.origin.lat]);
      const scale=mercatorUnitsPerMetre(this.origin.lat);
      this.frame.makeTranslation(anchor.x,anchor.y,anchor.z).scale(new THREE.Vector3(scale,-scale,scale));this.clock.reset(now);
      this.displayed.clear();this.transitionFrom.clear();this.transitionStart=-Infinity;
    }
    if(previous.resetKey!==next.resetKey)this.clock.reset(now);
    this.clock.setSpeed(next.speed,now);
    if(next.playing&&next.enabled&&!this.reduced)this.clock.play(now);else this.clock.pause(now);
    this.map?.triggerRepaint();
  }
  render(_gl:WebGL2RenderingContext,args:CustomRenderMethodInput) {
    if(!this.rig||!this.renderer)return;
    const now=performance.now(), active=this.options.enabled&&this.map.getZoom()>=13.5&&!document.hidden;
    if(!active||this.reduced)this.clock.pause(now);else if(this.options.playing)this.clock.play(now);
    const clock=this.clock.tick(now), detailed=this.map.getZoom()>=16.2;
    const blend=this.reduced?1:Math.min(1,(now-this.transitionStart)/450);
    const animations=new Map(this.options.pair[this.options.view].animations.map(a=>[a.agentId,a]));
    const limit=detailed?(window.innerWidth<900?100:300):60;
    this.drawn=[];this.rig.ring.visible=false;
    const selected=this.options.selectedId;
    const renderIds=selected&&this.ids.includes(selected)?[selected,...this.ids.filter(id=>id!==selected)]:this.ids;
    if(active)for(const id of renderIds){
      const a=animations.get(id);if(!a)continue;
      const sample=sampleCitizenAnimation(a,clock.elapsedSeconds,{playing:clock.playing});if(!sample.position)continue;
      const from=this.transitionFrom.get(id)?.position;
      if(blend<1&&from)sample.position={lon:from.lon+(sample.position.lon-from.lon)*blend,lat:from.lat+(sample.position.lat-from.lat)*blend};
      this.displayed.set(id,sample);
      const pixel=this.map.project([sample.position.lon,sample.position.lat]), canvas=this.map.getCanvas();
      if(pixel.x< -30||pixel.y< -30||pixel.x>canvas.clientWidth+30||pixel.y>canvas.clientHeight+30)continue;
      const index=this.drawn.length;this.drawn.push(id);
      this.rig.setCitizen(index,id,sample,this.origin,clock.elapsedSeconds,this.options.selectedId===id,clock.playing);
      if(this.drawn.length>=limit)break;
    }
    this.rig.finish(this.drawn.length,detailed);
    this.camera.projectionMatrix.fromArray(args.defaultProjectionData.mainMatrix).multiply(this.frame);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    this.renderer.resetState();this.renderer.render(this.rig.scene,this.camera);
    const calls=this.renderer.info.render.calls;this.renderer.resetState();this.frames++;
    if(this.reportRequested||now-this.lastReport>=1000){
      const fps=!this.reportRequested&&this.lastReport&&clock.playing&&this.drawn.length?this.frames*1000/(now-this.lastReport):null;
      this.options.onStats({visible:this.drawn.length,fps,drawCalls:calls,elapsedSeconds:clock.elapsedSeconds,status:!this.options.enabled?'Hidden':!this.ids.length?'No map-compatible positions supplied':!active?'Zoom in to see citizens':this.reduced?'Reduced motion: static poses':clock.playing?'Playing visual-only movement':'Paused'});
      this.frames=0;this.lastReport=now;this.reportRequested=false;
    }
    if(active&&(clock.playing||blend<1)&&this.drawn.length)this.map.triggerRepaint();
  }
  pick(point:{x:number;y:number}):string|null {
    if(!this.rig||!this.drawn.length||!this.options.enabled)return null;
    const canvas=this.map.getCanvas(), x=point.x/canvas.clientWidth*2-1,y=1-point.y/canvas.clientHeight*2;
    const inverse=this.camera.projectionMatrixInverse;
    // A midpoint avoids unprojecting an infinite far plane to nonfinite coordinates.
    const ray=rayFromProjection(x,y,inverse);
    const hits=ray.intersectObjects([this.rig.parts[0].mesh,this.rig.parts[2].mesh],false);
    return hits[0]?.instanceId===undefined?null:this.drawn[hits[0].instanceId]??null;
  }
  focus(){const positions=this.options.pair[this.options.view].animations.filter(a=>this.ids.includes(a.agentId)&&a.position).map(a=>a.position!);
    const p=positions.length?{lon:positions.reduce((s,p)=>s+p.lon,0)/positions.length,lat:positions.reduce((s,p)=>s+p.lat,0)/positions.length}:this.origin;
    this.map.easeTo({center:[p.lon,p.lat],zoom:17.5,pitch:55,duration:this.reduced?0:650});}
  onRemove(){this.media?.removeEventListener('change',this.onMotion);this.map.off('moveend',this.onMapIdle);document.removeEventListener('visibilitychange',this.onMapIdle);this.clock.dispose();this.rig?.dispose();this.renderer?.dispose();this.rig=undefined;this.renderer=undefined;this.displayed.clear();this.transitionFrom.clear();}
}
