import test from 'node:test';
import assert from 'node:assert/strict';
import type {Map as LibreMap} from 'maplibre-gl';
import {syncCitizenPath} from '../../citizens/path-overlay.ts';
import {citizenViewPairFixture as pair} from '../../citizens/fixtures.ts';

test('checked illustrative path survives source/style replacement with longitude-first coordinates',()=>{
  const sources=new Map<string,{data:any;setData:(data:any)=>void}>(),layers=new Map<string,any>();let sourceAdds=0;
  const map={getSource:(id:string)=>sources.get(id),getLayer:(id:string)=>layers.get(id),addSource:(id:string,spec:any)=>{sourceAdds++;sources.set(id,{data:spec.data,setData(data:any){this.data=data}})},addLayer:(spec:any)=>layers.set(spec.id,spec)} as unknown as LibreMap;
  const options={pair,view:'baseline' as const,selectedId:pair.baseline.citizens[2].agentId,enabled:true,playing:false,speed:1,resetKey:0,illustrativePedestrians:true,showPath:true,onStats(){}};
  syncCitizenPath(map,options);const initial=sources.get('citizen-path')?.data;
  assert.equal(initial?.features.length,1);const coordinates=initial.features[0].geometry.coordinates;
  assert.ok(coordinates[0][0]>103&&coordinates[0][1]>1);assert.deepEqual(coordinates[0],coordinates.at(-1));
  sources.clear();layers.clear();syncCitizenPath(map,options);assert.deepEqual(sources.get('citizen-path')?.data,initial);assert.equal(sourceAdds,2);
  syncCitizenPath(map,{...options,showPath:false});assert.equal(sources.get('citizen-path')?.data.features.length,0);assert.equal(sourceAdds,2);
  syncCitizenPath(map,{...options,enabled:false});assert.equal(sources.get('citizen-path')?.data.features.length,0);
});
