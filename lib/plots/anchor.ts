/** Explicit interchange snap planning, without network connections or mutations to caller-owned geometry. */
import {isPlotPosition,parseScenarioGeometry,type PlotLine,type PlotPoint,type PlotPosition,type ScenarioGeometry} from './geometry.ts';
import {groundDistance} from './adapters.ts';
import {attachRouteStations,projectStationOnSegment,ROUTE_STATION_LIMITS} from './route-stations.ts';
/** Legacy exact-coincidence lookup; proximity alone never selects a vertex. */
export function confirmedAnchorVertex(value:ScenarioGeometry,pointId:string):{routeId:string;vertex:number}|null {
 const geometry=parseScenarioGeometry(value),point=geometry.features.find(f=>f.id===pointId);
 if(!point||point.kind!=='point')throw Error('Select an existing station dot before confirming an interchange.');
 const matches:{routeId:string;vertex:number}[]=[];
 for(const line of geometry.features)if(line.kind==='line')line.coordinates.forEach((coordinate,vertex)=>{if(coordinate.lat===point.coordinate.lat&&coordinate.lon===point.coordinate.lon)matches.push({routeId:line.id,vertex});});
 return matches.length===1?Object.freeze(matches[0]):null;
}

type StationProjection={segment:number;fraction:number;distanceMetres:number;alongMetres:number};
function stationProjection(line:PlotLine,position:PlotPosition):StationProjection {
 const projections:StationProjection[]=[];let along=0;
 for(let segment=1;segment<line.coordinates.length;segment++){
  const a=line.coordinates[segment-1],b=line.coordinates[segment],projection=projectStationOnSegment(position,a,b);
  if(projection.length>0.001)projections.push({segment,fraction:projection.fraction,distanceMetres:projection.distanceMetres,alongMetres:along+projection.fraction*projection.length});
  along+=groundDistance(a,b);
 }
 projections.sort((a,b)=>a.distanceMetres-b.distanceMetres||a.alongMetres-b.alongMetres||a.segment-b.segment);
 const nearest=projections[0];
 if(!nearest)throw Error('Complete the selected route with at least two distinct vertices before confirming an interchange.');
 if(projections.some(p=>p.distanceMetres<=nearest.distanceMetres+0.1&&Math.abs(p.alongMetres-nearest.alongMetres)>ROUTE_STATION_LIMITS.coincidentMetres))
  throw Error('The station dot has an ambiguous nearest projection on this route. Move it or choose a simpler alignment.');
 return nearest;
}

/** Plans one explicit interchange confirmation; callers apply the validated geometry as one undoable edit. */
export function planConfirmedAnchor(value:ScenarioGeometry,pointId:string,stationPosition:PlotPosition,routeId?:string):{geometry:ScenarioGeometry;routeId:string|null;alignmentChanged:boolean} {
 const geometry=parseScenarioGeometry(value),point=geometry.features.find(f=>f.id===pointId);
 if(!point||point.kind!=='point')throw Error('Select an existing station dot before confirming an interchange.');
 if(!isPlotPosition(stationPosition))throw Error('The catalogue station position must be a valid Singapore coordinate.');
 const points=geometry.features.filter((f):f is PlotPoint=>f.kind==='point'),lines=geometry.features.filter((f):f is PlotLine=>f.kind==='line');
 let route:PlotLine|undefined;
 if(routeId!==undefined){
  route=lines.find(line=>line.id===routeId);
  if(!route)throw Error('Choose an existing drawn route before confirming this interchange.');
 }else{
  const attachedRoutes=lines.filter(line=>attachRouteStations(line,[point]).orderedPointIds.includes(pointId));
  if(attachedRoutes.length>1)throw Error('This dot attaches to multiple routes. Choose one route before confirming the interchange.');
  route=attachedRoutes[0];
 }
 if(!route){
  point.coordinate={...stationPosition};
  return {geometry:parseScenarioGeometry(geometry),routeId:null,alignmentChanged:false};
 }
 const original=attachRouteStations(route,points);
 if(original.ambiguousPointIds.length)throw Error('An attached station dot has an ambiguous projection on this route.');
 if(original.coincidentPointIds.length)throw Error('Separate coincident station dots before confirming an interchange.');
 const stationIds=new Set([...original.orderedPointIds,pointId]);
 const stations=points.filter(p=>stationIds.has(p.id)).map(p=>({point:p,projection:stationProjection(route,p.coordinate)}))
  .sort((a,b)=>a.projection.alongMetres-b.projection.alongMetres||a.point.id.localeCompare(b.point.id));
 for(let i=1;i<stations.length;i++)if(Math.abs(stations[i].projection.alongMetres-stations[i-1].projection.alongMetres)<=ROUTE_STATION_LIMITS.coincidentMetres
  ||groundDistance(stations[i].point.coordinate,stations[i-1].point.coordinate)<=ROUTE_STATION_LIMITS.coincidentMetres)
  throw Error('The selected dot has a coincident or ambiguous station order on this route.');
 const expected=stations.map(s=>s.point.id),replacements=new Map<number,PlotPosition>();
 const insertions=new Map<number,{fraction:number;coordinate:PlotPosition;pointId:string}[]>();
 for(const station of stations){
  const selected=station.point.id===pointId,coordinate=selected?stationPosition:station.point.coordinate;
  const vertex=route.coordinates.findIndex(p=>selected?groundDistance(p,station.point.coordinate)<=ROUTE_STATION_LIMITS.coincidentMetres:
   p.lat===station.point.coordinate.lat&&p.lon===station.point.coordinate.lon);
  if(vertex>=0){replacements.set(vertex,{...coordinate});continue;}
  const entries=insertions.get(station.projection.segment)??[];
  entries.push({fraction:station.projection.fraction,coordinate:{...coordinate},pointId:station.point.id});
  insertions.set(station.projection.segment,entries);
 }
 const originalCoordinates=route.coordinates,coordinates:PlotPosition[]=[];
 for(let vertex=0;vertex<originalCoordinates.length;vertex++){
  if(vertex>0)for(const insertion of (insertions.get(vertex)??[]).sort((a,b)=>a.fraction-b.fraction||a.pointId.localeCompare(b.pointId)))coordinates.push(insertion.coordinate);
  coordinates.push(replacements.get(vertex)??{...originalCoordinates[vertex]});
 }
 point.coordinate={...stationPosition};route.coordinates=coordinates;
 const parsed=parseScenarioGeometry(geometry),revised=attachRouteStations(route,points);
 if(revised.ambiguousPointIds.length||revised.coincidentPointIds.length||JSON.stringify(revised.orderedPointIds)!==JSON.stringify(expected))
  throw Error('This interchange would create an ambiguous or coincident station order. Adjust the route or station dots before confirming.');
 return {geometry:parsed,routeId:route.id,alignmentChanged:JSON.stringify(originalCoordinates)!==JSON.stringify(coordinates)};
}
