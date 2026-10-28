import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGeometry, validateBuilding, heightPolicy } from '../../buildings/contract.ts';
import { prepareBuildings, partitionBuildings } from '../../buildings/prepare.ts';
import { readFileSync } from 'node:fs';
const ring = [[103.8,1.3],[103.801,1.3],[103.801,1.301],[103.8,1.301],[103.8,1.3]];
const feature = (id=1) => ({type:'Feature',properties:{OBJECTID:id,BLDG_TYPE:'test-source-code'},geometry:{type:'Polygon',coordinates:[structuredClone(ring)]}});
const meta = {id:'ura-mp2019',datasetId:'d_ee3bd86e1334fbc58b520cd987090e54',title:'URA indicative buildings',publisher:'URA',url:'https://data.gov.sg/datasets/d_ee3bd86e1334fbc58b520cd987090e54/view',licenceUrl:'https://data.gov.sg/open-data-licence',referenceDate:'2025-09',accessedDate:'2026-10-28',rawSha256:'a'.repeat(64),attribution:'URA indicative buildings; not complete; illustrative height.'};

test('building geometry retains polygons, multipolygons and holes in lon/lat order', () => {
  const p = {type:'Polygon',coordinates:[ring]};validateGeometry(p);
  validateGeometry({type:'MultiPolygon',coordinates:[[ring]]});
  const hole=[[103.8002,1.3002],[103.8002,1.3004],[103.8004,1.3004],[103.8004,1.3002],[103.8002,1.3002]];
  validateGeometry({type:'Polygon',coordinates:[ring,hole]});
  for(const geometry of [null,{type:'Polygon',coordinates:[]},{type:'Polygon',coordinates:[ring.slice(0,-1)]},{type:'Polygon',coordinates:[ring.map(([a,b])=>[b,a])]},{type:'Polygon',coordinates:[[[NaN,1.3],...ring.slice(1)]]},{type:'Polygon',coordinates:[[[103.8,1.3],[103.801,1.301],[103.8,1.301],[103.801,1.3],[103.8,1.3]]]}])assert.throws(()=>validateGeometry(geometry));
});
test('height evidence is explicit and never inferred from footprint area',()=>{
  assert.deepEqual(heightPolicy(),{heightMetres:12,heightBasis:'illustrative',heightNote:'Display fallback; no source height or floor count.'});
  assert.equal(heightPolicy({height:30,heightReference:'source roof height'}).heightBasis,'verified');
  assert.equal(heightPolicy({floors:10,floorReference:'source floor count'}).heightMetres,30);
  for(const height of [NaN,-1,Infinity,2000])assert.throws(()=>heightPolicy({height,heightReference:'source'}));
});
test('deterministic preparation preserves provenance and records duplicate/excluded features',()=>{
  const a=feature(),b=feature(2);b.geometry.coordinates[0].reverse();
  const raw={type:'FeatureCollection',features:[a,b,{...feature(3),geometry:null}]};
  const before=JSON.stringify(raw),one=prepareBuildings(raw,meta),two=prepareBuildings(raw,meta);
  assert.deepEqual(one,two);assert.equal(JSON.stringify(raw),before);
  assert.equal(one.collection.features.length,1);assert.equal(one.audit.duplicates.length,1);assert.equal(one.audit.excluded.length,1);
  const f=one.collection.features[0];validateBuilding(f);assert.equal(f.properties.sourceId,meta.id);assert.equal(f.id,'ura-mp2019:1');assert.equal(f.properties.heightBasis,'illustrative');
  assert.throws(()=>validateBuilding({...f,properties:{...f.properties,heightMetres:NaN}}));
});
test('partitions assign each footprint once and bounds retain cross-boundary polygons',()=>{
  const result=prepareBuildings({type:'FeatureCollection',features:[feature()]},meta);
  const parts=partitionBuildings(result.collection,0.0005);
  assert.equal(parts.length,1);assert.equal(parts[0].collection.features.length,1);
  assert.deepEqual(parts[0].bounds,[103.8,1.3,103.801,1.301]);
  assert.equal(new Set(parts.flatMap(p=>p.collection.features.map(f=>f.id))).size,1);
});
test('actual attributed URA source fixtures preserve categories and multipolygon parts',()=>{
  const raw=JSON.parse(readFileSync(new URL('./fixtures/ura-buildings.json',import.meta.url),'utf8'));
  assert.equal(raw.licence,meta.licenceUrl);const result=prepareBuildings(raw,meta);
  assert.equal(result.collection.features.length,3);assert.equal(result.audit.excluded.length,0);
  assert.ok(result.collection.features.some(f=>f.geometry.type==='MultiPolygon'));
  assert.ok(result.collection.features.some(f=>f.properties.category==='LANDMARK'));
});
test('duplicate IDs, malformed metadata and disjoint polygons remain explicit',()=>{
  const a=feature(),b=feature();b.geometry.coordinates=b.geometry.coordinates.map(r=>r.map(([x,y])=>[x+.01,y]));
  const result=prepareBuildings({type:'FeatureCollection',features:[a,b]},meta);assert.equal(result.audit.excluded.length,1);
  assert.throws(()=>prepareBuildings({type:'FeatureCollection',features:[]},{...meta,rawSha256:'invalid'}));
  const empty=prepareBuildings({type:'FeatureCollection',features:[]},meta);assert.equal(empty.collection.features.length,0);
});
test('rounding collisions preserve distinct original footprints and exact category conflicts are reported',()=>{
  const a=feature(),b=feature(2),c=feature(3);b.geometry.coordinates[0][1][0]+=.0000001;c.properties.BLDG_TYPE='different-source-code';
  const result=prepareBuildings({type:'FeatureCollection',features:[a,b,c]},meta);
  assert.equal(result.collection.features.length,2);assert.equal(result.audit.roundingCollisions.length,1);
  assert.equal(result.audit.duplicates[0].category,'different-source-code');assert.equal(result.audit.duplicates[0].retainedCategory,'test-source-code');
});
