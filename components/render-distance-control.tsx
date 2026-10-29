'use client';
import {RENDER_DISTANCE,renderDistanceLabel} from '../lib/buildings/display-policy';

export default function RenderDistanceControl({value,onChange,disabled=false}:{value:number;onChange:(value:number)=>void;disabled?:boolean}){
 const label=renderDistanceLabel(value);
 return <label className="render-distance-control" htmlFor="building-render-distance">
  <span className="render-distance-heading"><span>Render Distance</span><span className="render-distance-value" aria-hidden="true">{label}</span></span>
  <span className="render-distance-track"><span aria-hidden="true">Near</span><input id="building-render-distance" type="range" min={RENDER_DISTANCE.min} max={RENDER_DISTANCE.max} step={RENDER_DISTANCE.step} value={value} onChange={event=>onChange(Number(event.target.value))} disabled={disabled} aria-label="Render Distance" aria-valuetext={`${label}, ${value+1} of ${RENDER_DISTANCE.max+1}`} aria-describedby="building-render-distance-help"/><span aria-hidden="true">Far</span></span>
  <span id="building-render-distance-help" className="sr-only">Controls when building detail appears. Does not move the map or set a distance in metres.</span>
 </label>;
}
