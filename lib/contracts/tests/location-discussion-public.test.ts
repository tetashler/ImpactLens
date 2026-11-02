import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePublicExplore} from '../../question-simulation/public-session.ts';
import type {PublicExplore} from '../../society/public-contract.ts';

function fixture():PublicExplore {
 const question='What if a polyclinic was built at this location?';
 const coordinate={lat:1.35,lon:103.85};
 return {version:3,kind:'summary-execution',attemptId:'attempt-location',requestIdentity:'request-location',runId:'location-test',planId:null,question,status:'completed',
  request:{question,geometryRevision:2,geometry:{version:1,scenarioId:'site',features:[{kind:'point',id:'site-1',label:'Proposed site',coordinate,role:'unassigned',provenance:'user-drawn'}]}},
  graph:{version:1,scenarioIdentity:'site',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:['Fictional discussion only; no healthcare outcomes are calculated.'],sources:[],accounting:{planningCalls:2,actionCalls:8,inputTokens:100,outputTokens:100,costUsd:0},demographics:null,session:null,society:null,
  locationContext:{version:1,kind:'hybrid-map-review',bindingKey:'a'.repeat(64),question,geometryRevision:2,interventionType:'new_polyclinic',analysisMode:'location-context',message:'Plotted location context only.',limitations:['No healthcare outcome model.'],locations:[{pointId:'site-1',coordinate:{...coordinate},planningArea:'Toa Payoh',subzone:null,sourceId:'fixture-boundaries',sourceSha256:'b'.repeat(64),referenceYear:2019}]}};
}

test('public qualitative location context retains its original plotted point and is frozen',()=>{
 const value=fixture(),parsed=parsePublicExplore(value);
 assert.deepEqual(parsed.locationContext,value.locationContext);assert.ok(Object.isFrozen(parsed.locationContext));
 assert.equal(parsed.grounding,undefined);
 const legacy=fixture();delete legacy.locationContext;assert.equal(parsePublicExplore(legacy).locationContext,undefined);
});

test('public location context rejects a stale, unbound, incompatible or injected review',()=>{
 const mutations:Array<(v:PublicExplore)=>void>=[
  v=>{v.locationContext!.question='Another question';},
  v=>{v.locationContext!.geometryRevision=1;},
  v=>{v.locationContext!.analysisMode='clarification';},
  v=>{v.locationContext!.interventionType='new_mrt_line';},
  v=>{v.locationContext!.locations=[];},
  v=>{v.locationContext!.locations![0].pointId='invented';},
  v=>{v.locationContext!.locations![0].coordinate.lat=1.36;},
  v=>{v.locationContext!.locations!.push(structuredClone(v.locationContext!.locations![0]));},
  v=>{(v.locationContext as any).profiles=['PRIVATE_PROFILE'];},
  v=>{v.request=null;},
  v=>{(v as any).grounding={};},
 ];
 for(const mutate of mutations){const value=structuredClone(fixture());mutate(value);assert.throws(()=>parsePublicExplore(value));}
});
