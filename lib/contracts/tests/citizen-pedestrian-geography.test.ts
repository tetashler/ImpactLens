import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { illustrativePedestrianPaths } from '../../citizens/pedestrians.ts';

type Point=readonly [number,number];
type Polygon=Point[][];
type Geometry={type:string;coordinates:unknown};
type Collection={features:{geometry:Geometry;properties:Record<string,unknown>}[]};
const read=(relative:string)=>JSON.parse(readFileSync(new URL(`../../../public/${relative}`,import.meta.url),'utf8'));
const polygons=(geometry:Geometry):Polygon[]=>geometry.type==='Polygon'?[geometry.coordinates as Polygon]:geometry.type==='MultiPolygon'?geometry.coordinates as Polygon[]:[];
const insideRing=(point:Point,ring:Point[])=>{
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [x,y]=point,[ax,ay]=ring[i],[bx,by]=ring[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
};
const insidePolygon=(point:Point,polygon:Polygon)=>insideRing(point,polygon[0])&&!polygon.slice(1).some(ring=>insideRing(point,ring));
const pointSegmentDistance=(point:Point,a:Point,b:Point)=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],lengthSquared=dx*dx+dy*dy;
  const t=lengthSquared===0?0:Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/lengthSquared));
  return Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy);
};

const hasLocalSnapshot=existsSync(new URL('../../../public/geography/buildings-v1/unified-manifest.json',import.meta.url));
test('authored pedestrian loops stay within selected subzones and clear local building footprints',{
  skip:hasLocalSnapshot?false:'local-review building snapshot not present; prepare permitted assets before clearance verification',
},()=>{
  // These local snapshots establish containment/footprint clearance only. They
  // cannot establish pavement access, a safe crossing or an observed activity.
  const zones=read('geography/subzones.geojson') as Collection;
  const manifest=read('geography/buildings-v1/unified-manifest.json') as {chunks:{url:string;bounds:number[]}[]};
  const names:Record<string,string[]>={'tiong-bahru':['TIONG BAHRU'],sengkang:['SENGKANG TOWN CENTRE','ANCHORVALE'],tampines:['TAMPINES EAST','TAMPINES NORTH'],downtown:['CITY HALL'],'ang-mo-kio':['CHENG SAN']};
  const cache=new Map<string,Collection>();
  let checkedFootprints=0;
  for(const path of illustrativePedestrianPaths){
    const land=zones.features.filter(feature=>names[path.areaId].includes(feature.properties.name as string)).flatMap(feature=>polygons(feature.geometry));
    assert.ok(land.length>0,`${path.id}: expected selected local subzone`);
    const longitudeScale=111195.0802335329*Math.cos(path.focus.lat*Math.PI/180),latitudeScale=111195.0802335329;
    const local=(point:Point):Point=>[(point[0]-path.focus.lon)*longitudeScale,(point[1]-path.focus.lat)*latitudeScale];
    const bounds=[Math.min(...path.waypoints.map(p=>p.lon))-.00003,Math.min(...path.waypoints.map(p=>p.lat))-.00003,Math.max(...path.waypoints.map(p=>p.lon))+.00003,Math.max(...path.waypoints.map(p=>p.lat))+.00003];
    const buildings:Polygon[]=[];
    for(const chunk of manifest.chunks){
      const b=chunk.bounds;
      if(b[0]>bounds[2]||b[2]<bounds[0]||b[1]>bounds[3]||b[3]<bounds[1])continue;
      let collection=cache.get(chunk.url);
      if(!collection){collection=read(chunk.url.replace(/^\//,'')) as Collection;cache.set(chunk.url,collection);}
      for(const feature of collection.features)for(const polygon of polygons(feature.geometry)){
        const ring=polygon[0];
        if(Math.min(...ring.map(p=>p[0]))>bounds[2]||Math.max(...ring.map(p=>p[0]))<bounds[0]||Math.min(...ring.map(p=>p[1]))>bounds[3]||Math.max(...ring.map(p=>p[1]))<bounds[1])continue;
        buildings.push(polygon.map(r=>r.map(local)));
      }
    }
    checkedFootprints+=buildings.length;
    for(let index=0;index<path.waypoints.length;index++){
      const from=path.waypoints[index],to=path.waypoints[(index+1)%path.waypoints.length];
      const length=Math.hypot((to.lon-from.lon)*longitudeScale,(to.lat-from.lat)*latitudeScale);
      // At most .5m between probes. A 2.5m probe clearance guarantees at least
      // 2.25m along every intervening segment (distance is 1-Lipschitz).
      const probes=Math.max(1,Math.ceil(length/.5));
      for(let step=0;step<=probes;step++){
        const point:Point=[from.lon+(to.lon-from.lon)*step/probes,from.lat+(to.lat-from.lat)*step/probes];
        assert.ok(land.some(polygon=>insidePolygon(point,polygon)),`${path.id}: outside selected subzone`);
        const p=local(point);
        for(const polygon of buildings){
          assert.ok(!insidePolygon(p,polygon),`${path.id}: enters a building footprint`);
          for(const ring of polygon)for(let edge=0;edge<ring.length-1;edge++)assert.ok(pointSegmentDistance(p,ring[edge],ring[edge+1])>=2.5,`${path.id}: lacks building clearance`);
        }
      }
    }
  }
  assert.ok(checkedFootprints>0,'geographic review must actually inspect nearby footprints');
});
