import {intersects,type Bounds,type BuildingChunk} from './contract.ts';

/** Render budgets only; this is never an inventory or a population coverage model. */
export const BUILDING_DISPLAY_LIMITS=Object.freeze({minZoom:14.5,maxChunks:64,maxBytes:12_000_000});

/** Rightward steps increase visible range; these are zoom gates, never metre radii. */
export const RENDER_DISTANCE=Object.freeze({min:0,max:7,step:1,defaultValue:3,debounceMs:180});
export function renderDistanceMinZoom(value:number):number {
 if(!Number.isInteger(value)||value<RENDER_DISTANCE.min||value>RENDER_DISTANCE.max)throw new RangeError('Invalid render distance');
 return 16-value/2;
}
export function renderDistanceLabel(value:number):'Near'|'Default'|'Far' {
 renderDistanceMinZoom(value);
 return value===RENDER_DISTANCE.defaultValue?'Default':value<RENDER_DISTANCE.defaultValue?'Near':'Far';
}
export function validateBuildingDisplayZoom(value:number):void {
 if(!Number.isFinite(value)||value<12.5||value>20)throw new RangeError('Invalid building display zoom');
}

export function selectBuildingChunks(chunks:readonly BuildingChunk[],bounds:Bounds,center?:{lng:number;lat:number}){
 const candidates=chunks.filter(c=>intersects(bounds,c.bounds));
 const x=center?.lng??(bounds[0]+bounds[2])/2,y=center?.lat??(bounds[1]+bounds[3])/2;
 // Squared coordinate distance is only a deterministic display priority, not ground metres.
 const rank=(c:BuildingChunk)=>((c.bounds[0]+c.bounds[2])/2-x)**2+((c.bounds[1]+c.bounds[3])/2-y)**2;
 const ordered=[...candidates].sort((a,b)=>rank(a)-rank(b)||a.id.localeCompare(b.id));
 const selected:BuildingChunk[]=[];let bytes=0;
 for(const chunk of ordered){if(selected.length>=BUILDING_DISPLAY_LIMITS.maxChunks)break;if(bytes+chunk.bytes>BUILDING_DISPLAY_LIMITS.maxBytes)continue;selected.push(chunk);bytes+=chunk.bytes;}
 return {chunks:selected,bytes,candidateChunks:candidates.length,limited:selected.length<candidates.length};
}
