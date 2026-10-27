import type { CitizenAnimation, Wgs84Position } from '../contracts/citizen-simulation.ts';

export interface AnimationSample {
  position:Wgs84Position|null;
  /** Radians counterclockwise from geographic east towards north. */
  headingRadians:number;
  state:'unassigned'|'idle'|'walking'|'travelling'|'arriving'|'paused';
  progress:number;
  limbPhase:number;
}
export interface AnimationOptions {durationSeconds?:number;offsetSeconds?:number;playing?:boolean}

/** Supplied schematic geometry only. Segment lengths set visual pacing, never journey minutes. */
export function sampleCitizenAnimation(animation:CitizenAnimation,elapsedSeconds:number,options:AnimationOptions={}):AnimationSample {
  const duration=options.durationSeconds??90;
  if (!Number.isFinite(duration) || duration<=5 || !Number.isFinite(elapsedSeconds) || !Number.isFinite(options.offsetSeconds??0)) throw new Error('Invalid animation clock');
  const elapsed=Math.max(0,elapsedSeconds-(options.offsetSeconds??0));
  const moving=animation.state==='walking'||animation.state==='travelling';
  const base:AnimationSample={position:animation.position?{...animation.position}:null,headingRadians:0,state:animation.state==='unassigned'?'unassigned':'idle',progress:0,limbPhase:0};
  if (!moving || !animation.position || animation.waypoints.length<2) return base;
  const path=animation.waypoints;
  const lengths=path.slice(1).map((point,i)=>Math.hypot((point.lon-path[i].lon)*Math.cos((point.lat+path[i].lat)*Math.PI/360),point.lat-path[i].lat));
  const total=lengths.reduce((a,b)=>a+b,0);
  const progress=Math.max(0,Math.min(1,(elapsed-2)/(duration-5)));
  let distance=progress*total;
  let index=lengths.findIndex(length=>{if (length>0 && distance<=length) return true;distance-=length;return false;});
  if (index<0) index=lengths.length-1;
  const from=path[index],to=path[index+1], fraction=lengths[index]>0?Math.min(1,Math.max(0,distance/lengths[index])):1;
  const position=total===0?{...path[path.length-1]}:{lon:from.lon+(to.lon-from.lon)*fraction,lat:from.lat+(to.lat-from.lat)*fraction};
  const active=elapsed>=2 && elapsed<duration;
  return {position,headingRadians:Math.atan2(to.lat-from.lat,(to.lon-from.lon)*Math.cos((from.lat+to.lat)*Math.PI/360)),progress,
    state:!active?'idle':options.playing===false?'paused':elapsed>=duration-3?'arriving':animation.state,
    limbPhase:active && options.playing!==false?(elapsed*2*Math.PI*1.5)%(2*Math.PI):0};
}

export class PlaybackClock {
  private elapsed=0;
  private playing=false;
  private speed=1;
  private last:number|null=null;
  private disposed=false;
  /** Gaps over 250ms are clamped, preventing hidden-tab jumps. Backwards timestamps cannot rewind time. */
  tick(nowMs:number):{elapsedSeconds:number;playing:boolean;speed:number} {
    if (!Number.isFinite(nowMs)) throw new Error('Invalid playback timestamp');
    if (!this.disposed) {
      if (this.last!==null && this.playing) this.elapsed+=Math.max(0,Math.min(250,nowMs-this.last))/1000*this.speed;
      this.last=Math.max(this.last??nowMs,nowMs);
    }
    return {elapsedSeconds:this.elapsed,playing:this.playing,speed:this.speed};
  }
  play(nowMs:number):void {this.tick(nowMs);if(!this.disposed)this.playing=true;}
  pause(nowMs:number):void {this.tick(nowMs);this.playing=false;}
  reset(nowMs:number):void {this.tick(nowMs);if(!this.disposed){this.elapsed=0;this.playing=false;}}
  setSpeed(speed:number,nowMs:number):void {if(!Number.isFinite(speed)||speed<=0)throw new Error('Invalid playback speed');this.tick(nowMs);if(!this.disposed)this.speed=speed;}
  dispose():void {this.playing=false;this.disposed=true;}
}
