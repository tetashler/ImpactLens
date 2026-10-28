import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBuildingManifest,validateBuilding} from '../../buildings/contract.ts';
import {prepareBuildings} from '../../buildings/prepare.ts';
const source={id:'unified',datasetId:'local-conflation-v1',title:'Local unified view',publisher:'ImpactLens',url:'https://docs.overturemaps.org/guides/buildings/',licenceUrl:'https://opendatacommons.org/licenses/odbl/1-0/',referenceDate:'2026-10-21.0',accessedDate:'2026-10-28',rawSha256:'a'.repeat(64),attribution:'Local review only; source licences remain separate.'};
const overture={...source,id:'overture',title:'Overture',publisher:'Overture Maps Foundation'};
const base={version:1,source,featureCount:0,minZoom:14,chunks:[],heightPolicy:'Sourced or illustrative'};

test('mixed-source manifest preserves individual source licences and local-only restriction',()=>{
  const m=parseBuildingManifest({...base,sources:[overture],distribution:'local-review-only'});
  assert.equal(m.sources?.[0].id,'overture');assert.equal(m.distribution,'local-review-only');
});
test('mixed source registry rejects duplicate or malformed identities and distribution policies',()=>{
  assert.throws(()=>parseBuildingManifest({...base,sources:[overture,overture]}));
  assert.throws(()=>parseBuildingManifest({...base,sources:[]}));
  assert.throws(()=>parseBuildingManifest({...base,sources:[{...overture,rawSha256:'wrong'}]}));
  assert.throws(()=>parseBuildingManifest({...base,distribution:'public-approved'}));
});
test('declared bounds must remain within Singapore and reject reversed or unbounded chunks',()=>{
  const c={id:'c1',url:'/geography/buildings-v1/c1.geojson',bytes:1,featureCount:1,sha256:'b'.repeat(64)};
  for(const bounds of [[1.3,103.8,1.4,103.9],[0,0,180,90],[103.9,1.3,103.8,1.4]])assert.throws(()=>parseBuildingManifest({...base,featureCount:1,chunks:[{...c,bounds}]}));
});
test('source references and optional elevated bases validate without inferring roof shape',()=>{
  const f=prepareBuildings({type:'FeatureCollection',features:[{type:'Feature',properties:{OBJECTID:1},geometry:{type:'Polygon',coordinates:[[[103.8,1.3],[103.801,1.3],[103.801,1.301],[103.8,1.3]]]}}]},overture).collection.features[0];
  validateBuilding({...f,properties:{...f.properties,baseMetres:2}});
  assert.throws(()=>validateBuilding({...f,properties:{...f.properties,baseMetres:NaN}}));
  assert.throws(()=>validateBuilding({...f,properties:{...f.properties,baseMetres:-1}}));
});
