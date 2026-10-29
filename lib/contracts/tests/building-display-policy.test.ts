import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDING_DISPLAY_LIMITS,selectBuildingChunks} from '../../buildings/display-policy.ts';
import type {BuildingChunk,Bounds} from '../../buildings/contract.ts';
const bounds:Bounds=[103.7,1.2,104,1.4];
const chunk=(id:string,x:number,bytes=100):BuildingChunk=>({id,url:`/geography/buildings-v1/${id}.geojson`,bounds:[x,1.28,x+.001,1.281],bytes,featureCount:1,sha256:'a'.repeat(64)});
test('bounded view selection uses real intersecting chunks and retains every chunk in a small view',()=>{
 const inside=chunk('near',103.8),outside=chunk('outside',104.05),result=selectBuildingChunks([outside,inside],bounds);assert.deepEqual(result.chunks,[inside]);assert.equal(result.limited,false);assert.equal(result.candidateChunks,1);
});
test('selection retains the same byte cap, prioritises camera target and is independent of catalogue order',()=>{
 const a=chunk('near',103.8,7_000_000),b=chunk('next',103.81,7_000_000),c=chunk('small',103.82,1_000_000),input=[b,c,a],center={lng:103.8,lat:1.28};
 const result=selectBuildingChunks(input,bounds,center);assert.deepEqual(result.chunks.map(c=>c.id),['near','small']);assert.equal(result.bytes,8_000_000);assert.ok(result.bytes<=BUILDING_DISPLAY_LIMITS.maxBytes);assert.equal(result.limited,true);assert.deepEqual(selectBuildingChunks([...input].reverse(),bounds,center),result);assert.deepEqual(input,[b,c,a]);
});
test('chunk count is bounded, repeatable and source geometry/provenance metadata is not rewritten',()=>{
 const input=Array.from({length:100},(_,i)=>chunk(`c${i}`,103.75+i*.001)),original=structuredClone(input);const result=selectBuildingChunks(input,bounds,{lng:103.8,lat:1.28});assert.equal(result.chunks.length,64);assert.equal(result.candidateChunks,100);assert.equal(result.limited,true);assert.deepEqual(input,original);for(const selected of result.chunks)assert.equal(selected,input.find(c=>c.id===selected.id));
});
