import {intersects,type Bounds,type BuildingChunk} from './contract.ts';

/** Render budgets only; this is never an inventory or a population coverage model. */
export const BUILDING_DISPLAY_LIMITS=Object.freeze({minZoom:14.5,maxChunks:64,maxBytes:12_000_000});

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
