import test from 'node:test';
import assert from 'node:assert/strict';
import { BuildingLayer,buildingLayerStyle } from '../../buildings/layer.ts';
import type { Map as LibreMap } from 'maplibre-gl';
import { createHash } from 'node:crypto';
import { prepareBuildings } from '../../buildings/prepare.ts';
const raw={type:'FeatureCollection',features:[{type:'Feature',properties:{OBJECTID:1},geometry:{type:'Polygon',coordinates:[[[103.8,1.3],[103.801,1.3],[103.801,1.301],[103.8,1.3]]]}}]};
const source={id:'ura-mp2019',datasetId:'d_test',title:'Test source',publisher:'URA',url:'https://data.gov.sg/',licenceUrl:'https://data.gov.sg/open-data-licence',referenceDate:'2025-09',accessedDate:'2026-10-28',rawSha256:'a'.repeat(64),attribution:'Test source; illustrative heights.'};
const data=prepareBuildings(raw,source).collection,text=JSON.stringify(data),sha256=createHash('sha256').update(text).digest('hex');
const manifest={version:1 as const,source,featureCount:1,minZoom:14,chunks:[{id:'test',url:'/geography/buildings-v1/test.geojson',bounds:[103.8,1.3,103.801,1.301],featureCount:1,bytes:Buffer.byteLength(text),sha256}],heightPolicy:'Illustrative 12m'};
function mock(){
  const sources=new Map<string,any>(),layers=new Map<string,any>(),events=new Map<string,Set<()=>void>>();let zoom=16,ready=true;
  const map={isStyleLoaded:()=>ready,getZoom:()=>zoom,getBounds:()=>({getWest:()=>103.79,getSouth:()=>1.29,getEast:()=>103.81,getNorth:()=>1.31}),getSource:(id:string)=>sources.get(id),getLayer:(id:string)=>layers.get(id),addSource:(id:string,s:any)=>sources.set(id,{...s,setData(d:any){this.data=d;}}),addLayer:(l:any)=>layers.set(l.id,l),removeLayer:(id:string)=>layers.delete(id),removeSource:(id:string)=>sources.delete(id),setLayoutProperty:(id:string,_k:string,v:string)=>layers.get(id).layout.visibility=v,on:(e:string,f:()=>void)=>{if(!events.has(e))events.set(e,new Set());events.get(e)!.add(f);},off:(e:string,f:()=>void)=>events.get(e)?.delete(f)};
  return {map:map as unknown as LibreMap,sources,layers,events,setZoom:(z:number)=>{zoom=z;},setReady:(v:boolean)=>{ready=v;}};
}
test('layer registers once, uses attributed height properties and cleans only owned resources',async()=>{
  const m=mock();let calls=0;
  const layer=new BuildingLayer(m.map,manifest as any,{fetcher:async()=>{calls++;return new Response(text);}});
  await layer.refresh();await layer.refresh();assert.equal(calls,1);assert.equal(m.sources.size,1);assert.equal(m.layers.size,1);
  assert.deepEqual(m.layers.get('sg-buildings-extrusion').paint['fill-extrusion-height'],['get','heightMetres']);
  assert.match(m.sources.get('sg-buildings').attribution,/data.gov.sg\/open-data-licence/);
  layer.setVisible(false);assert.equal(m.layers.get('sg-buildings-extrusion').layout.visibility,'none');
  layer.dispose();layer.dispose();assert.equal(m.sources.size,0);assert.equal(m.layers.size,0);
});
test('map readiness and overview defer loading without creating duplicate sources',async()=>{
  const m=mock();let calls=0;m.setReady(false);
  const layer=new BuildingLayer(m.map,manifest as any,{fetcher:async()=>{calls++;return new Response(text);}});
  await layer.refresh();assert.equal(m.sources.size,0);assert.equal(calls,0);
  m.setReady(true);m.setZoom(10);await layer.refresh();assert.equal(calls,0);
  m.setZoom(16);await layer.refresh();assert.equal(calls,1);layer.dispose();
});

test('an owned source with a missing extrusion layer recovers without adding a second source',async()=>{
  const m=mock();const layer=new BuildingLayer(m.map,manifest as any,{fetcher:async()=>new Response(text)});
  await layer.refresh();m.layers.delete('sg-buildings-extrusion');await layer.refresh();
  assert.equal(m.sources.size,1);assert.ok(m.layers.has('sg-buildings-extrusion'));layer.dispose();
});
test('missing, corrupt and failed chunks produce controlled error status',async()=>{
  for(const response of [()=>new Response('missing',{status:404}),()=>new Response('{}'),()=>new Response(text.replace('12','13'))]){
    const m=mock(),statuses:string[]=[];const layer=new BuildingLayer(m.map,manifest as any,{fetcher:async()=>response(),onStatus:s=>statuses.push(s.state)});
    await layer.refresh();assert.equal(statuses.at(-1),'error');assert.equal(m.sources.get('sg-buildings').data.features.length,0);layer.dispose();
  }
});
test('late asynchronous work cannot register after disposal or replace a newer camera result',async()=>{
  const m=mock();let done!:(r:Response)=>void;
  const layer=new BuildingLayer(m.map,manifest as any,{fetcher:()=>new Promise<Response>(r=>{done=r;})});
  const pending=layer.refresh();await Promise.resolve();layer.dispose();done(new Response(text));await pending;
  assert.equal(m.sources.size,0);assert.equal(m.layers.size,0);
});
test('rapid camera change aborts old fetch and allows the newest refresh to win',async()=>{
  const m=mock();let done!:(r:Response)=>void,calls=0,aborted=false;
  const layer=new BuildingLayer(m.map,manifest as any,{fetcher:(_url,init)=>{calls++;if(calls===1){init?.signal?.addEventListener('abort',()=>{aborted=true;});return new Promise<Response>(r=>{done=r;});}return Promise.resolve(new Response(text));}});
  const first=layer.refresh();await Promise.resolve();await layer.refresh();done(new Response(text));await first;
  assert.ok(aborted);assert.equal(m.sources.get('sg-buildings').data.features.length,1);layer.dispose();
});
test('initially unready map automatically resumes at idle without an infinite refresh loop',async()=>{
  const m=mock();m.setReady(false);let calls=0;
  const layer=new BuildingLayer(m.map,manifest as any,{fetcher:async()=>{calls++;return new Response(text);}});
  await layer.refresh();m.setReady(true);for(const f of m.events.get('idle')??[])f();
  for(let i=0;i<10&&!calls;i++)await new Promise(r=>setTimeout(r,5));
  assert.equal(calls,1);for(const f of m.events.get('idle')??[])f();assert.equal(calls,1);layer.dispose();
});

test('unified layer accepts only registered sources and attributes their actual licences',async()=>{
  for(const registered of [true,false]){
    const m=mock(),statuses:string[]=[];
    const combined={...manifest,source:{...source,id:'unified'},sources:[{...source,id:registered?source.id:'other',licenceUrl:'https://opendatacommons.org/licenses/odbl/1-0/'}]};
    const layer=new BuildingLayer(m.map,combined as any,{fetcher:async()=>new Response(text),onStatus:s=>statuses.push(s.state)});
    await layer.refresh();assert.equal(statuses.at(-1),registered?'ready':'error');
    assert.match(m.sources.get('sg-buildings').attribution,/opendatacommons/);layer.dispose();
  }
});
test('style reset re-registers one owned layer and preserves visibility',async()=>{
  const m=mock();const layer=new BuildingLayer(m.map,manifest as any,{fetcher:async()=>new Response(text)});
  await layer.refresh();m.sources.clear();m.layers.clear();await layer.refresh();assert.equal(m.layers.size,1);
  layer.setVisible(false);m.sources.clear();m.layers.clear();await layer.refresh();assert.equal(m.layers.size,0);
  layer.setVisible(true);await layer.refresh();assert.equal(m.layers.size,1);layer.dispose();
});
test('mixed available and missing chunks report partial coverage and keep valid geometry',async()=>{
  const m=mock(),statuses:string[]=[];
  const partial={...manifest,featureCount:2,chunks:[...manifest.chunks,{...manifest.chunks[0],id:'missing',url:'/geography/buildings-v1/missing.geojson'}]};
  const layer=new BuildingLayer(m.map,partial as any,{fetcher:async url=>String(url).includes('missing')?new Response('',{status:404}):new Response(text),onStatus:s=>statuses.push(s.state)});
  await layer.refresh();assert.equal(statuses.at(-1),'error');assert.equal(m.sources.get('sg-buildings').data.features.length,1);layer.dispose();
});
test('opaque extrusions avoid compounded alpha darkness at retained shared roof overlaps',()=>{
  assert.equal(buildingLayerStyle().paint?.['fill-extrusion-opacity'],1);
});
