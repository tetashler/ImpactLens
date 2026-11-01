import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {selectCitizenCohort,selectionDisclosure,validateCitizenSelection} from '../../citizen-grounding/selection.ts';
import {transportCitizen,transportDataset} from './citizen-transport-fixture.ts';
import type {CitizenCommuteRun} from '../../citizen-grounding/contract.ts';
const fp='b'.repeat(64);
// Synthetic ranking controls only; not fabricated real DeepSeek responses or government journeys.
function fixture(){
 const records=Array.from({length:240},(_,i)=>transportCitizen('citizen-'+String(i).padStart(3,'0'),{planningArea:'area-'+i%24,ageGroup:i%3?'30_34':'50_54',sex:i%2?'male':'female',labourForceStatus:i%4?'employed':'outside-labour-force',homeProxy:i<50?{lat:1.38,lon:103.74,basis:'Synthetic test proxy',sourceId:'fixture'}:i<220?{lat:1.31,lon:103.99,basis:'Synthetic test proxy',sourceId:'fixture'}:null,workplaceProxy:null}));
 const dataset=transportDataset(records);
 const run={version:1,policy:'citizen-commute-v1',populationId:dataset.populationId,citizenDatasetId:dataset.id,scenarioFingerprint:fp,facts:records.map((r,i)=>({citizenId:r.id,citizenDatasetId:dataset.id,populationId:dataset.populationId,scenarioFingerprint:fp,status:i===0?'improved':i===1?'worse':i===2?'newly-reachable':i%5?'unchanged':'unknown',minutesSaved:i===0?5:i===1?-5:null})),summary:{representedAgents:records.length,representedPopulation:2400}} as CitizenCommuteRun;
 const binding={fingerprint:'c'.repeat(64),scenarioFingerprint:fp,intent:{type:'new_mrt_line',routeId:'route',stationPointIds:['a','b']},intervention:{schemaVersion:1},geometry:{features:[{kind:'point',id:'a',role:'station',coordinate:{lat:1.38,lon:103.74}},{kind:'point',id:'b',role:'station',coordinate:{lat:1.39,lon:103.76}}]}} as any;
 return {dataset,run,binding};
}
test('v2 selects exact distinct capacities reproducibly, regardless of source ordering',()=>{
 for(const n of [50,100]){const {dataset,run,binding}=fixture(),before=JSON.stringify({dataset,run});const a=selectCitizenCohort(dataset,run,binding,n,'seed');assert.equal(a.policy,'citizen-selection-v2');assert.equal(a.members.length,n);assert.equal(new Set(a.members.map(m=>m.id)).size,n);assert.deepEqual(a,selectCitizenCohort({...dataset,records:[...dataset.records].reverse()},{...run,facts:[...run.facts].reverse()},binding,n,'seed'));assert.equal(JSON.stringify({dataset,run}),before);assert.ok(Object.isFrozen(a));}
});
test('rare improved, worse and newly reachable citizens get priority without relabelling',()=>{
 const f=fixture(),s=selectCitizenCohort(f.dataset,f.run,f.binding,50,'seed');assert.deepEqual(new Set(s.members.filter(m=>m.bucket==='impact').map(m=>m.status)),new Set(['improved','worse','newly-reachable']));assert.equal(s.members.find(m=>m.id==='citizen-001')?.status,'worse');assert.ok(s.members.some(m=>m.bucket==='geography'&&m.status==='unchanged'));
});
test('comparison retains broader areas and missing-location uncertainty; overlap never duplicates',()=>{
 const f=fixture(),s=selectCitizenCohort(f.dataset,f.run,f.binding,50,'seed'),comparison=s.members.filter(m=>m.bucket==='comparison');assert.ok(comparison.length>=25);assert.ok(new Set(comparison.map(m=>f.dataset.records.find(c=>c.id===m.id)!.planningArea)).size>=20);for(const m of s.members){const c=f.dataset.records.find(c=>c.id===m.id)!;if(!c.homeProxy&&!c.workplaceProxy)assert.equal(m.distanceMetres,null);if(m.bucket==='geography')assert.ok(m.distanceMetres!==null&&m.distanceMetres<=2500);}assert.doesNotMatch(selectionDisclosure(s),/citizen-\d|"(?:lat|lon)"\s*:|PRIVATE_JOB|PRIVATE_SCHEDULE/);
});
test('no effects or no usable coordinates still fills an honest cohort',()=>{
 const f=fixture();f.run.facts.forEach(x=>{x.status='unknown';x.minutesSaved=null;});f.dataset.records.forEach(c=>{c.homeProxy=null;c.workplaceProxy=null;});const s=selectCitizenCohort(f.dataset,f.run,f.binding,50,'seed');assert.equal(s.members.filter(m=>m.bucket==='impact'||m.bucket==='geography').length,0);assert.equal(s.members.filter(m=>m.bucket==='comparison').length,50);assert.ok(s.members.every(m=>m.status==='unknown'&&m.distanceMetres===null));
});
test('different validated station geometry can produce a different relevant cohort',()=>{
 const f=fixture(),a=selectCitizenCohort(f.dataset,f.run,f.binding,50,'seed');const b=structuredClone(f.binding);b.geometry.features.forEach((p:any)=>p.coordinate={lat:1.31,lon:103.99});const other=selectCitizenCohort(f.dataset,f.run,b,50,'seed');assert.notDeepEqual(a.members.map(m=>m.id),other.members.map(m=>m.id));
});
test('confirmed station selection uses accepted IDs even when original drawing roles remain unassigned',()=>{
 const f=fixture(),expected=selectCitizenCohort(f.dataset,f.run,f.binding,50,'seed');f.binding.geometry.features.forEach((p:any)=>p.role='unassigned');assert.deepEqual(selectCitizenCohort(f.dataset,f.run,f.binding,50,'seed'),expected);
});
test('missing facts, duplicate identities, unsupported markers and insufficient adults fail closed',()=>{
 for(const mutate of [(f:ReturnType<typeof fixture>)=>f.run.facts.pop(),(f:ReturnType<typeof fixture>)=>f.dataset.records[1].id=f.dataset.records[0].id,(f:ReturnType<typeof fixture>)=>f.binding.intervention=null,(f:ReturnType<typeof fixture>)=>f.binding.intent.type='new_polyclinic',(f:ReturnType<typeof fixture>)=>f.binding.intent.stationPointIds=['invented'],(f:ReturnType<typeof fixture>)=>f.dataset.records.forEach(c=>c.ageGroup='10_14')]){const f=fixture();mutate(f);assert.throws(()=>selectCitizenCohort(f.dataset,f.run,f.binding,50,'seed'));}
});
test('saved policy metadata rejects malformed or mismatched roster instead of changing old meaning',()=>{
 const f=fixture(),s=selectCitizenCohort(f.dataset,f.run,f.binding,50,'seed');const view:any={id:f.dataset.populationId,residents:s.members.map(m=>f.dataset.records.find(c=>c.id===m.id))};assert.doesNotThrow(()=>validateCitizenSelection(s,view,50,'seed'));for(const mutate of [(v:any)=>v.policy='citizen-selection-v1',(v:any)=>v.members[1].id=v.members[0].id,(v:any)=>v.members[0].bucket='fabricated',(v:any)=>v.members[0].distanceMetres=-1,(v:any)=>v.availableImpacts=0,(v:any)=>v.availableNear=0]){const v=structuredClone(s);mutate(v);assert.throws(()=>validateCitizenSelection(v,view,50,'seed'));}
});
test('disclosure labels selection reasons separately from outcome counts when pools overlap',()=>{
 const f=fixture();f.run.facts.slice(0,50).forEach(x=>{x.status='improved';x.minutesSaved=1;});const s=selectCitizenCohort(f.dataset,f.run,f.binding,50,'seed');assert.equal(s.members.filter(m=>m.bucket==='impact').length,12);assert.equal(s.members.filter(m=>m.status==='improved').length,24);assert.ok(s.members.filter(m=>m.bucket==='comparison').length>=25);assert.match(selectionDisclosure(s),/by selection reason/);assert.match(selectionDisclosure(s),/impact-priority/);
});
