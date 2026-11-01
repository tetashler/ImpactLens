import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {canonical} from '../../experiments/validation.ts';
import {mockPersonalityRoster} from '../../citizen-grounding/personality.ts';
import * as social from '../../citizen-grounding/social.ts';
import {buildHybridContext,deterministicHybridIntent} from '../../interventions/hybrid.ts';
import type {PopulationView} from '../../population/contract.ts';
import type {CitizenRecord} from '../../citizen-grounding/contract.ts';

const fingerprint='d'.repeat(64),active=['citizen-fixture'];
const clone=<T>(value:T):T=>structuredClone(value);
async function fixture(){
 const citizen:CitizenRecord={id:active[0],weight:1,ageGroup:'90andOver',sex:'female',planningArea:'fixture-area',planningAreaName:'Fixture Area',subzone:'fixture-subzone',subzoneName:'Fixture Subzone',exactAge:null,labourForceStatus:'outside-labour-force',employmentRelationship:null,nature:null,occupationCode:null,jobTitle:null,workplaceArea:null,workplaceAreaName:null,homeProxy:null,workplaceProxy:null,schedule:null,travelMode:'no-work-trip',eligibleAccessStationIds:[],preferredAccessStationId:null,circumstances:[],fieldProvenance:Object.fromEntries(['demographics','exactAge','labourForceStatus','employmentRelationship','nature','occupationCode','jobTitle','workplaceArea','homeProxy','workplaceProxy','schedule','travelMode','accessStations'].map(k=>[k,{basis:k==='demographics'?'source-constrained':'synthetic-assumption',sourceIds:[],assumptionIds:['fixture-assumption']}]))};
 const personalities=await mockPersonalityRoster({runId:'run-hybrid-fixture',seed:'fixture',capableIds:active,backgroundIds:[]});
 const grounding={version:1 as const,policy:'citizen-grounded-v1' as const,populationId:'population-'+'a'.repeat(64),datasetId:'citizens-'+'b'.repeat(64),scenarioFingerprint:fingerprint,profiles:[{citizen,commute:null}],personalities,sourceManifest:{baseSourceHash:'c'.repeat(64),generatorVersion:'fixture-v1',sourceIds:[],assumptionIds:['fixture-assumption']}};
 const base={id:grounding.populationId,source:{rawSha256:grounding.sourceManifest.baseSourceHash},residents:[clone(citizen)]} as unknown as PopulationView;
 social.validateCitizenGrounding(grounding,base,active,active);return {grounding,base};
}
async function binding(scenarioFingerprint=fingerprint){
 const api=await import('../../interventions/binding.ts');
 const context=buildHybridContext('Add a community centre here',{version:1,scenarioId:'hybrid-fixture',features:[{kind:'point',id:'site',label:'Site',coordinate:{lat:1.3,lon:103.8},role:'unassigned',provenance:'user-drawn'}]},4,{}, {serviceDate:'2026-11-01',quarantinedTrips:0,stations:[{id:'NS2',name:'Bukit Batok',lat:1.34899665,lon:103.749541,lines:['NS']}],lines:[{id:'NS',name:'North South Line',color:'#f00'}],connections:[]});
 const intent=deterministicHybridIntent(context)!;return api.createHybridBinding(context,intent,null,scenarioFingerprint);
}

test('explicit hybrid grounding helper exists without changing the legacy grounding factory',()=>{
 assert.equal(typeof (social as any).withHybridBinding,'function','Explicit hybrid binding is required');
 assert.equal(typeof (social as any).validateCitizenGroundingAsync,'function');
});

test('new hybrid grounding freezes its accepted binding and preserves the complete legacy actor projection',async()=>{
 const {grounding,base}=await fixture(),before=canonical(grounding),accepted=await binding();
 const next=await (social as any).withHybridBinding(grounding,accepted);
 assert.equal(next.version,2);assert.equal(next.policy,'citizen-grounded-v1');assert.equal(next.executionBundle,'hybrid-citizen-explore-v1');assert.deepEqual(next.hybridBinding,accepted);
 assert.ok(Object.isFrozen(next)&&Object.isFrozen(next.hybridBinding)&&Object.isFrozen(next.hybridBinding.geometry.features));
 assert.equal(canonical(grounding),before);assert.equal(grounding.version,1);assert.ok(!Object.hasOwn(grounding,'executionBundle'));
 social.validateCitizenGrounding(next,base,active,active);
 assert.deepEqual(social.presentCitizenGrounding(next,active[0]),social.presentCitizenGrounding(grounding,active[0]));
 assert.ok(Buffer.byteLength(canonical(social.presentCitizenGrounding(next,active[0])))<=4096);
 assert.ok(!JSON.stringify(social.presentCitizenGrounding(next,active[0])).includes('hybridBinding'));
});

test('version one remains strict and version two requires its exact bundle and binding',async()=>{
 const {grounding,base}=await fixture(),accepted=await binding(),next=await (social as any).withHybridBinding(grounding,accepted);
 for(const extra of [{executionBundle:'hybrid-citizen-explore-v1'},{hybridBinding:accepted}])assert.throws(()=>social.validateCitizenGrounding({...grounding,...extra},base,active,active),/CITIZEN_GROUNDING/);
 for(const mutate of [
  (v:any)=>{delete v.executionBundle;},(v:any)=>{delete v.hybridBinding;},
  (v:any)=>{v.executionBundle='other-bundle';},(v:any)=>{v.version=3;},
  (v:any)=>{v.hybridBinding.extra='PRIVATE_BINDING_SENTINEL';},
  (v:any)=>{v.hybridBinding.scenarioFingerprint='e'.repeat(64);},
 ]){const changed=clone(next);mutate(changed);assert.throws(()=>social.validateCitizenGrounding(changed,base,active,active),/CITIZEN_GROUNDING/);}
});

test('async grounding validation checks both accepted binding and personality hashes without fetching',async()=>{
 const {grounding,base}=await fixture(),next=await (social as any).withHybridBinding(grounding,await binding()),original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('REPLAY_MUST_NOT_FETCH');};
 try{
  assert.deepEqual(await (social as any).validateCitizenGroundingAsync(clone(grounding),base,active,active),grounding);
  const replay=await (social as any).validateCitizenGroundingAsync(clone(next),base,active,active);assert.deepEqual(replay,next);assert.ok(Object.isFrozen(replay));
  const badBinding=clone(next);badBinding.hybridBinding.fingerprint='0'.repeat(64);await assert.rejects((social as any).validateCitizenGroundingAsync(badBinding,base,active,active));
  const badPersona=clone(next);badPersona.personalities.generation.inputDigest='0'.repeat(64);await assert.rejects((social as any).validateCitizenGroundingAsync(badPersona,base,active,active),/PERSONALITY_DIGEST/);
  social.validateCitizenGrounding(clone(next),base,active,active);
 }finally{globalThis.fetch=original;}
 assert.equal(calls,0);
});

test('hybrid binding cannot replace a frozen binding or attach to another commute scenario',async()=>{
 const {grounding}=await fixture(),next=await (social as any).withHybridBinding(grounding,await binding());
 await assert.rejects((social as any).withHybridBinding(next,await binding()),/CITIZEN_GROUNDING/);
 await assert.rejects((social as any).withHybridBinding(grounding,await binding('e'.repeat(64))),/CITIZEN_GROUNDING/);
});

test('the existing private input byte bound also applies to hybrid grounding',async()=>{
 const {grounding,base}=await fixture(),next=clone(await (social as any).withHybridBinding(grounding,await binding()));
 next.profiles[0].citizen.jobTitle='x'.repeat(500001);assert.throws(()=>social.validateCitizenGrounding(next,base,active,active),/CITIZEN_GROUNDING_BOUND/);
});
