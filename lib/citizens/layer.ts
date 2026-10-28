import * as THREE from 'three';
import { MercatorCoordinate, type Map as LibreMap, type CustomLayerInterface, type CustomRenderMethodInput } from 'maplibre-gl';
import { createCitizenScene, mercatorUnitsPerMetre, rayFromProjection } from './scene.ts';
import { PlaybackClock, sampleCitizenAnimation, type AnimationSample } from './playback.ts';
import { selectCitizenSample, type CitizenView, type CitizenViewPair } from './data.ts';
import { compilePedestrianPath, illustrativePedestrianPaths, illustrativePedestrianActors, samplePedestrianMotion } from './pedestrians.ts';
import type { CitizenAnimation, Wgs84Position } from '../contracts/citizen-simulation.ts';

const paths=new Map(illustrativePedestrianPaths.map(path=>[path.id,compilePedestrianPath(path)]));
const actors=new Map(illustrativePedestrianActors.map(actor=>[actor.agentId,actor]));
export interface CitizenPosition {agentId:string;position:Wgs84Position;headingRadians:number;areaLabel:string|null;rendered:boolean}
export interface CitizenStats {visible:number;fps:number|null;drawCalls:number;status:string;elapsedSeconds:number;selected?:CitizenPosition|null}
export interface CitizenLayerOptions {
  pair:CitizenViewPair;view:CitizenView;selectedId:string|null;playing:boolean;speed:number;resetKey:number;enabled:boolean;
  /** Only the locally authored demo opts in. Imported payload geometry is never overridden. */
  illustrativePedestrians?:boolean;areaId?:string;showPath?:boolean;onStats:(stats:CitizenStats)=>void;
}
/** One shared-context custom layer, one clock, bounded instanced actors. */
export class CitizenLayer implements CustomLayerInterface {
  id='miniature-citizens';type='custom' as const;renderingMode='3d' as const;
  private map?:LibreMap;private renderer?:THREE.WebGLRenderer;private rig?:ReturnType<typeof createCitizenScene>;
  private camera=new THREE.Camera();private clock=new PlaybackClock();private removed=false;private prepared=false;
  private pendingOptions?:CitizenLayerOptions;
  private ids:string[]=[];private renderIds:string[]=[];private drawn:string[]=[];
  private animations=new Map<string,CitizenAnimation>();private origin={lon:103.85,lat:1.37};private frame=new THREE.Matrix4();
  private lastReport=0;private frames=0;private reportRequested=true;private reduced=false;private media?:MediaQueryList;
  private displayed=new Map<string,AnimationSample>();private transitionFrom=new Map<string,AnimationSample>();private transitionStart=-Infinity;
  private onMotion=()=>{if(this.removed)return;this.reduced=this.media?.matches??false;this.syncClock(performance.now());this.repaint();};
  private onMapIdle=()=>{if(!this.removed)this.repaint();};
  private onVisibility=()=>{if(this.removed)return;this.syncClock(performance.now());this.repaint();};
  constructor(private options:CitizenLayerOptions) {}
  private repaint(){this.reportRequested=true;this.map?.triggerRepaint();}
  private syncClock(now:number){
    if(this.options.playing&&this.options.enabled&&!this.reduced&&!document.hidden&&(this.map?.getZoom()??0)>=13.5)this.clock.play(now);
    else this.clock.pause(now);
  }
  onAdd(map:LibreMap,gl:WebGL2RenderingContext){
    if(this.renderer)throw new Error('Citizen renderer is already attached');
    this.map=map;this.removed=false;this.rig=createCitizenScene(300);
    this.renderer=new THREE.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:true});this.renderer.autoClear=false;
    this.media=matchMedia('(prefers-reduced-motion: reduce)');this.reduced=this.media.matches;
    this.media.addEventListener('change',this.onMotion);map.on('moveend',this.onMapIdle);document.addEventListener('visibilitychange',this.onVisibility);
    const next=this.pendingOptions??this.options;this.pendingOptions=undefined;
    this.update(next,!this.prepared);this.prepared=true;
  }
  update(next:CitizenLayerOptions,initial=false){
    if(this.removed){this.pendingOptions=next;return;}
    const previous=this.options;this.options=next;const now=performance.now();this.reportRequested=true;
    if(previous.playing!==next.playing){this.lastReport=now;this.frames=0;}
    if(previous.view!==next.view&&!this.reduced){this.transitionFrom=new Map(this.displayed);this.transitionStart=now;}
    if(initial||previous.pair!==next.pair){
      // A new imported population must not retain unbounded old appearance IDs.
      if(previous.pair!==next.pair&&this.rig){this.rig.dispose();this.rig=createCitizenScene(300);}
      this.ids=selectCitizenSample(next.pair,300);
      this.origin=next.pair.baseline.animations.find(a=>a.agentId===this.ids[0])?.position??{lon:103.85,lat:1.37};
      const anchor=MercatorCoordinate.fromLngLat([this.origin.lon,this.origin.lat]),scale=mercatorUnitsPerMetre(this.origin.lat);
      this.frame.makeTranslation(anchor.x,anchor.y,anchor.z).scale(new THREE.Vector3(scale,-scale,scale));this.clock.reset(now);
      this.displayed.clear();this.transitionFrom.clear();this.transitionStart=-Infinity;
    }
    if(initial||previous.pair!==next.pair||previous.view!==next.view)this.animations=new Map(next.pair[next.view].animations.map(a=>[a.agentId,a]));
    if(initial||previous.pair!==next.pair||previous.selectedId!==next.selectedId)this.renderIds=next.selectedId&&this.ids.includes(next.selectedId)?[next.selectedId,...this.ids.filter(id=>id!==next.selectedId)]:this.ids;
    if(previous.resetKey!==next.resetKey)this.clock.reset(now);
    this.clock.setSpeed(next.speed,now);this.syncClock(now);this.map?.triggerRepaint();
  }
  private sample(id:string,elapsed:number,playing:boolean):AnimationSample|null {
    if(this.options.illustrativePedestrians){const actor=actors.get(id),path=actor&&paths.get(actor.pathId);if(actor&&path)return samplePedestrianMotion(path,actor,elapsed,{playing});}
    const animation=this.animations.get(id);return animation?sampleCitizenAnimation(animation,elapsed,{playing}):null;
  }
  render(_gl:WebGL2RenderingContext,args:CustomRenderMethodInput){
    const map=this.map,rig=this.rig,renderer=this.renderer;if(!map||!rig||!renderer||this.removed)return;
    const now=performance.now(),active=this.options.enabled&&map.getZoom()>=13.5&&!document.hidden;
    this.syncClock(now);const clock=this.clock.tick(now),detailed=map.getZoom()>=16.2,blend=this.reduced?1:Math.min(1,(now-this.transitionStart)/450);
    const limit=detailed?(window.innerWidth<900?100:300):60,canvas=map.getCanvas();this.drawn.length=0;rig.ring.visible=false;
    if(active)for(const id of this.renderIds){
      const sample=this.sample(id,clock.elapsedSeconds,clock.playing);if(!sample?.position)continue;
      const from=this.transitionFrom.get(id)?.position;
      if(blend<1&&from)sample.position={lon:from.lon+(sample.position.lon-from.lon)*blend,lat:from.lat+(sample.position.lat-from.lat)*blend};
      this.displayed.set(id,sample);const pixel=map.project([sample.position.lon,sample.position.lat]);
      if(!Number.isFinite(pixel.x)||!Number.isFinite(pixel.y)||pixel.x< -30||pixel.y< -30||pixel.x>canvas.clientWidth+30||pixel.y>canvas.clientHeight+30)continue;
      const index=this.drawn.length;this.drawn.push(id);rig.setCitizen(index,id,sample,this.origin,clock.elapsedSeconds,this.options.selectedId===id,clock.playing);
      if(this.drawn.length>=limit)break;
    }
    rig.finish(this.drawn.length,detailed);this.camera.projectionMatrix.fromArray(args.defaultProjectionData.mainMatrix).multiply(this.frame);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();renderer.resetState();renderer.render(rig.scene,this.camera);
    const calls=renderer.info.render.calls;renderer.resetState();this.frames++;
    if(this.reportRequested||now-this.lastReport>=1000){
      const fps=!this.reportRequested&&this.lastReport&&clock.playing&&this.drawn.length?this.frames*1000/(now-this.lastReport):null;
      const id=this.options.selectedId,sample=id?this.displayed.get(id):null,actor=id&&this.options.illustrativePedestrians?actors.get(id):null;
      const selected:CitizenPosition|null=id&&sample?.position?{agentId:id,position:{...sample.position},headingRadians:sample.headingRadians,areaLabel:actor?paths.get(actor.pathId)?.areaLabel??null:null,rendered:this.drawn.includes(id)}:null;
      this.options.onStats({visible:this.drawn.length,fps,drawCalls:calls,elapsedSeconds:clock.elapsedSeconds,selected,status:!this.options.enabled?'Hidden':!this.ids.length?'No map-compatible positions supplied':!active?'Zoom in to see citizens':this.reduced?'Reduced motion: static poses':clock.playing?'Playing illustrative geographic movement':'Paused'});
      this.frames=0;this.lastReport=now;this.reportRequested=false;
    }
    if(active&&(clock.playing||blend<1)&&this.drawn.length)map.triggerRepaint();
  }
  pick(point:{x:number;y:number}):string|null {
    if(!this.rig||!this.map||!this.drawn.length||!this.options.enabled||this.removed)return null;
    const canvas=this.map.getCanvas(),ray=rayFromProjection(point.x/canvas.clientWidth*2-1,1-point.y/canvas.clientHeight*2,this.camera.projectionMatrixInverse);
    const hits=ray.intersectObjects([this.rig.parts[0].mesh,this.rig.parts[2].mesh],false);
    return hits[0]?.instanceId===undefined?null:this.drawn[hits[0].instanceId]??null;
  }
  focus(){
    if(!this.map||this.removed)return;
    let position:Wgs84Position|undefined;
    if(this.options.illustrativePedestrians){const path=illustrativePedestrianPaths.find(p=>p.areaId===this.options.areaId)??illustrativePedestrianPaths[0];position=path?.focus;}
    else position=this.options.pair[this.options.view].animations.find(a=>a.agentId===this.options.selectedId)?.position??this.options.pair[this.options.view].animations.find(a=>a.position)?.position??this.origin;
    if(position)this.map.easeTo({center:[position.lon,position.lat],zoom:19.6,pitch:55,duration:this.reduced?0:650});
  }
  onRemove(){
    if(this.removed)return;this.removed=true;this.clock.pause(performance.now());
    this.media?.removeEventListener('change',this.onMotion);this.map?.off('moveend',this.onMapIdle);document.removeEventListener('visibilitychange',this.onVisibility);
    this.rig?.dispose();this.renderer?.dispose();this.rig=undefined;this.renderer=undefined;this.displayed.clear();this.transitionFrom.clear();this.transitionStart=-Infinity;this.drawn.length=0;
  }
}
