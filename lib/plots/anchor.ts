/** An explicit anchor may move the one route vertex already coincident with its dot. Proximity is insufficient. */
import {parseScenarioGeometry,type ScenarioGeometry} from './geometry.ts';
export function confirmedAnchorVertex(value:ScenarioGeometry,pointId:string):{routeId:string;vertex:number}|null {
 const geometry=parseScenarioGeometry(value),point=geometry.features.find(f=>f.id===pointId);
 if(!point||point.kind!=='point')throw Error('Select an existing station dot before confirming an interchange.');
 const matches:{routeId:string;vertex:number}[]=[];
 for(const line of geometry.features)if(line.kind==='line')line.coordinates.forEach((coordinate,vertex)=>{if(coordinate.lat===point.coordinate.lat&&coordinate.lon===point.coordinate.lon)matches.push({routeId:line.id,vertex});});
 return matches.length===1?Object.freeze(matches[0]):null;
}
