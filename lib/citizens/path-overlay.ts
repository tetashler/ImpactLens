import type {Map as LibreMap,GeoJSONSource} from 'maplibre-gl';
import type {FeatureCollection} from 'geojson';
import type {CitizenLayerOptions} from './layer.ts';
import {illustrativePedestrianActors,illustrativePedestrianPaths} from './pedestrians.ts';

/** Shared install/update path so a style reload restores the current checked overlay. */
export function syncCitizenPath(map:Pick<LibreMap,'getSource'|'getLayer'|'addSource'|'addLayer'>,options:CitizenLayerOptions):void {
  const actor=options.illustrativePedestrians?illustrativePedestrianActors.find(a=>a.agentId===options.selectedId):null;
  const animation=options.pair[options.view].animations.find(a=>a.agentId===options.selectedId);
  const waypoints=actor?illustrativePedestrianPaths.find(p=>p.id===actor.pathId)?.waypoints:animation?.waypoints;
  const path=actor&&waypoints?[...waypoints,waypoints[0]]:waypoints;
  const data:FeatureCollection={type:'FeatureCollection',features:options.enabled&&options.showPath!==false&&path&&path.length>1?[{type:'Feature',properties:{agentId:options.selectedId,basis:'schematic-visual-only'},geometry:{type:'LineString',coordinates:path.map(p=>[p.lon,p.lat])}}]:[]};
  const source=map.getSource('citizen-path') as GeoJSONSource|undefined;
  if(source)source.setData(data);else map.addSource('citizen-path',{type:'geojson',data});
  if(!map.getLayer('citizen-path'))map.addLayer({id:'citizen-path',type:'line',source:'citizen-path',paint:{'line-color':'#f9e4a4','line-width':2,'line-dasharray':[2,2]}});
}
