import test from 'node:test';
import assert from 'node:assert/strict';
import { BuildingCatalogueSession } from '../../buildings/session.ts';
import type { BuildingStatus } from '../../buildings/layer.ts';

const source=(id:string)=>({id,datasetId:id,title:id,publisher:id,url:'https://data.gov.sg/',licenceUrl:'https://data.gov.sg/open-data-licence',referenceDate:'2026',accessedDate:'2026-10-28',rawSha256:'a'.repeat(64),attribution:`${id} source`});
const manifest={version:1,source:source('unified'),sources:['hdb','ura','overture'].map(source),distribution:'local-review-only',featureCount:0,minZoom:14,chunks:[],heightPolicy:'Mixed source and illustrative heights'};
function setup(fetcher:typeof fetch=async()=>Response.json(manifest),isCurrent=()=>true,hostname='127.0.0.1'){
  const statuses:BuildingStatus[]=[],visibility:boolean[]=[],layers:{disposed:boolean}[]=[];
  let refreshes=0;
  const session=new BuildingCatalogueSession({fetcher,isCurrent,hostname,onStatus:s=>statuses.push(s),createLayer:(_manifest,onStatus)=>{
    const layer={disposed:false};layers.push(layer);
    return {setVisible(v){visibility.push(v);onStatus({state:v?'ready':'hidden',features:0,chunks:0,message:'Fixture'});},async refresh(){refreshes++;},dispose(){layer.disposed=true;onStatus({state:'disposed',features:0,chunks:0,message:'Fixture'});}};
  }});
  return {session,statuses,visibility,layers,refreshes:()=>refreshes};
}
test('one catalogue layer survives hide/show and retry without duplicate registration',async()=>{
  let calls=0;const s=setup(async()=>{calls++;return Response.json(manifest);});
  await s.session.setVisible(true);await s.session.setVisible(false);await s.session.setVisible(true);await s.session.retry();
  assert.equal(calls,1);assert.equal(s.layers.length,1);assert.deepEqual(s.visibility,[true,false,true]);assert.equal(s.refreshes(),1);assert.equal(s.statuses.at(-1)?.state,'ready');
  s.session.dispose();assert.equal(s.layers[0].disposed,true);
});
test('hide during a manifest request rejects even a fetch that ignores abort',async()=>{
  let release!:(r:Response)=>void;const s=setup(async()=>new Promise(r=>release=r));
  const pending=s.session.setVisible(true);await s.session.setVisible(false);release(Response.json(manifest));await pending;
  assert.equal(s.layers.length,0);assert.equal(s.statuses.at(-1)?.state,'hidden');s.session.dispose();
});
test('rapid unified/HDB/unified changes reject the obsolete first manifest',async()=>{
  const releases:((r:Response)=>void)[]=[];const s=setup(async()=>new Promise(r=>releases.push(r)));
  const old=s.session.setVisible(true);await s.session.setVisible(false);const current=s.session.setVisible(true);
  releases[0](Response.json(manifest));await old;assert.equal(s.layers.length,0);
  releases[1](Response.json(manifest));await current;assert.equal(s.layers.length,1);s.session.dispose();
});
test('disposal before manifest resolution cannot install a layer or publish stale state',async()=>{
  let release!:(r:Response)=>void;const s=setup(async()=>new Promise(r=>release=r));const pending=s.session.setVisible(true);
  s.session.dispose();const count=s.statuses.length;release(Response.json(manifest));await pending;
  assert.equal(s.layers.length,0);assert.equal(s.statuses.length,count);s.session.dispose();
});
test('map identity changes prevent late manifest ownership',async()=>{
  let current=true,release!:(r:Response)=>void;const s=setup(async()=>new Promise(r=>release=r),()=>current);
  const pending=s.session.setVisible(true);current=false;release(Response.json(manifest));await pending;assert.equal(s.layers.length,0);s.session.dispose();
});
test('missing and malformed manifests expose a controlled error and can recover',async()=>{
  for(const bad of [()=>new Response('Missing',{status:404}),()=>new Response('{'),()=>Response.json({...manifest,distribution:undefined})]){
    let valid=false;const s=setup(async()=>valid?Response.json(manifest):bad());await s.session.setVisible(true);
    assert.equal(s.statuses.at(-1)?.state,'error');assert.equal(s.layers.length,0);valid=true;await s.session.retry();assert.equal(s.layers.length,1);s.session.dispose();
  }
});
test('non-loopback preview is rejected before fetching any internal assets',async()=>{
  let calls=0;const s=setup(async()=>{calls++;return Response.json(manifest);},()=>true,'public.example');await s.session.setVisible(true);
  assert.equal(calls,0);assert.equal(s.layers.length,0);assert.equal(s.statuses.at(-1)?.state,'error');s.session.dispose();
});
test('disposed layer status callbacks cannot revive React-facing state',async()=>{
  const s=setup();await s.session.setVisible(true);const count=s.statuses.length;s.session.dispose();assert.equal(s.statuses.length,count);
});
