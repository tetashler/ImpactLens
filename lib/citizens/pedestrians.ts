/**
 * Independent illustrative pedestrians, not a journey model. Manually selected
 * land-area loops are checked against the local subzones and building snapshot.
 * They do not identify pavements, crossings, homes, activities or observed people.
 * Baseline and scenario deliberately share the same motion.
 */
import type { Wgs84Position } from '../contracts/citizen-simulation.ts';
import type { AnimationSample } from './playback.ts';

const radius=6371008.8,rad=Math.PI/180,tau=Math.PI*2;
export interface PedestrianPath {
  readonly id:string;
  readonly areaId:string;
  readonly areaLabel:string;
  readonly focus:Readonly<Wgs84Position>;
  readonly waypoints:readonly Readonly<Wgs84Position>[];
}
interface PathSegment {
  readonly from:Readonly<Wgs84Position>;
  readonly to:Readonly<Wgs84Position>;
  readonly startDistanceMetres:number;
  readonly lengthMetres:number;
  readonly headingRadians:number;
}
export interface CompiledPedestrianPath extends PedestrianPath {
  readonly totalLengthMetres:number;
  readonly segments:readonly PathSegment[];
}
export interface PedestrianActor {
  readonly agentId:string;
  readonly pathId:string;
  readonly speedMetresPerSecond:number;
  readonly startDistanceMetres:number;
  readonly direction:1|-1;
}

/** Copy and precompute metre arc lengths once, including the closing segment. */
export function compilePedestrianPath(path:PedestrianPath):CompiledPedestrianPath {
  const points=path.waypoints.map(p=>{
    if(!Number.isFinite(p.lon)||!Number.isFinite(p.lat)||Math.abs(p.lon)>180||Math.abs(p.lat)>90)throw new Error('Invalid pedestrian path coordinate');
    return Object.freeze({...p});
  });
  if(points.length<2)throw new Error('Pedestrian path needs at least two coordinates');
  let total=0;
  const segments:PathSegment[]=[];
  for(let index=0;index<points.length;index++){
    const from=points[index],to=points[(index+1)%points.length];
    const east=radius*(to.lon-from.lon)*rad*Math.cos((from.lat+to.lat)*rad/2),north=radius*(to.lat-from.lat)*rad;
    const lengthMetres=Math.hypot(east,north);
    if(lengthMetres===0)continue;
    segments.push(Object.freeze({from,to,lengthMetres,startDistanceMetres:total,headingRadians:Math.atan2(north,east)}));
    total+=lengthMetres;
  }
  if(!Number.isFinite(total)||total<=0)throw new Error('Pedestrian path needs a finite positive length');
  return Object.freeze({...path,focus:Object.freeze({...path.focus}),waypoints:Object.freeze(points),segments:Object.freeze(segments),totalLengthMetres:total});
}

function modulo(value:number,period:number):number {const result=value%period;return result<0?result+period:result;}

/**
 * Sample absolute simulation time, never integrate distance from render frames.
 * A pause changes the state only: the supplied clock time preserves the pose.
 */
export function samplePedestrianMotion(path:CompiledPedestrianPath,actor:PedestrianActor,elapsedSeconds:number,options:{playing?:boolean}={}):AnimationSample {
  if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0)throw new Error('Invalid pedestrian clock');
  if(actor.pathId!==path.id||!Number.isFinite(actor.speedMetresPerSecond)||actor.speedMetresPerSecond<=0||!Number.isFinite(actor.startDistanceMetres)||(actor.direction!==1&&actor.direction!==-1))throw new Error('Invalid pedestrian actor');
  const period=path.totalLengthMetres/actor.speedMetresPerSecond;
  if(!Number.isFinite(period)||period<=0)throw new Error('Invalid pedestrian actor period');
  // Reduce time before multiplying so finite extreme clocks cannot overflow.
  const distance=modulo(modulo(actor.startDistanceMetres,path.totalLengthMetres)+actor.direction*(elapsedSeconds%period)*actor.speedMetresPerSecond,path.totalLengthMetres);
  // Binary search avoids scanning every waypoint for every actor every frame.
  let low=0,high=path.segments.length-1;
  while(low<high){const middle=Math.ceil((low+high)/2);if(path.segments[middle].startDistanceMetres<=distance)low=middle;else high=middle-1;}
  const segment=path.segments[low],fraction=(distance-segment.startDistanceMetres)/segment.lengthMetres;
  const position={lon:segment.from.lon+(segment.to.lon-segment.from.lon)*fraction,lat:segment.from.lat+(segment.to.lat-segment.from.lat)*fraction};
  // A 1.35 m full gait cycle changes cadence with the actor's walking speed.
  const stridePeriod=1.35/actor.speedMetresPerSecond;
  const limbPhase=modulo((elapsedSeconds%stridePeriod)/stridePeriod*tau+modulo(actor.startDistanceMetres,1.35)/1.35*tau,tau);
  return {position,headingRadians:Math.atan2(Math.sin(segment.headingRadians+(actor.direction===-1?Math.PI:0)),Math.cos(segment.headingRadians+(actor.direction===-1?Math.PI:0))),state:options.playing===false?'paused':'walking',progress:distance/path.totalLengthMetres,limbPhase};
}

/**
 * Two separately authored parallel loops per area, with opposite directions.
 * The selected centres/axes are schematic visual geometry, never mapped paths.
 * Their 96 short segments limit visible corner changes at the loop seam.
 */
const areas=[
  {id:'tiong-bahru',label:'Tiong Bahru',lon:103.83063,lat:1.28336,axes:[[14,16],[9,11]]},
  {id:'sengkang',label:'Sengkang',lon:103.89404,lat:1.39404,axes:[[10,42],[5,34]]},
  {id:'tampines',label:'Tampines',lon:103.9427,lat:1.3605,axes:[[42,34],[34,26]]},
  {id:'downtown',label:'Downtown',lon:103.8528,lat:1.2905,axes:[[42,34],[34,26]]},
  {id:'ang-mo-kio',label:'Ang Mo Kio',lon:103.85086,lat:1.3738,axes:[[26,24],[20,18]]},
] as const;

export const illustrativePedestrianPaths:readonly PedestrianPath[]=Object.freeze(areas.flatMap(area=>area.axes.map(([eastRadius,northRadius],lane)=>{
  const focus=Object.freeze({lon:area.lon,lat:area.lat});
  const waypoints=Array.from({length:96},(_,index)=>{
    const angle=index/96*tau;
    return Object.freeze({lon:area.lon+eastRadius*Math.cos(angle)/(radius*rad*Math.cos(area.lat*rad)),lat:area.lat+northRadius*Math.sin(angle)/(radius*rad)});
  });
  return Object.freeze({id:`${area.id}-${lane+1}`,areaId:area.id,areaLabel:area.label,focus,waypoints:Object.freeze(waypoints)});
})));

// Round-robin area ordering keeps bounded render samples spread geographically.
const compiled=illustrativePedestrianPaths.map(compilePedestrianPath);
export const illustrativePedestrianActors:readonly PedestrianActor[]=Object.freeze(Array.from({length:180},(_,index)=>{
  const area=index%5,lane=Math.floor(index/5)%2,slot=Math.floor(index/10),path=compiled[area*2+lane];
  return Object.freeze({agentId:`syn-a4b1800000000000-${index+1}`,pathId:path.id,speedMetresPerSecond:.95+((index*37)%61)/100,
    startDistanceMetres:path.totalLengthMetres*(slot+(lane===0?.15:.65))/18,direction:lane===0?1 as const:-1 as const});
}));
