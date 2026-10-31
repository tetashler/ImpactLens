import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {canonical} from '../../experiments/validation.ts';
import type {PopulationView,Resident} from '../../population/contract.ts';
import type {CitizenDataset,CitizenRecord,CitizenCommuteFact,CitizenCommuteRun} from '../../citizen-grounding/contract.ts';
import {mockPersonalityRoster} from '../../citizen-grounding/personality.ts';
import {citizenScheduleSummary} from '../../citizen-grounding/commute-contract.ts';
import {createCitizenGrounding,validateCitizenGrounding,presentCitizenGrounding} from '../../citizen-grounding/social.ts';

/** Declared synthetic capability fixture, not official data or a real DeepSeek response. */
function fixture(total=50,capable=35){
 const populationId='population-'+'a'.repeat(64),datasetId='citizens-'+'b'.repeat(64),baseSourceHash='c'.repeat(64),scenarioFingerprint='d'.repeat(64);
 const activeIds=Array.from({length:total},(_,i)=>'citizen-'+i),capableIds=activeIds.slice(0,capable),backgroundIds=activeIds.slice(capable);
 const records:CitizenRecord[]=activeIds.map((id,i)=>({id,weight:10+i,ageGroup:'30_34',sex:i%2?'male':'female',planningArea:'fixture-area',planningAreaName:'Fixture Area',subzone:'fixture-subzone',subzoneName:'Fixture Subzone',exactAge:32,labourForceStatus:'employed',employmentRelationship:'employee',nature:'full-time',occupationCode:'fixture-professional',jobTitle:i===1?'PRIVATE_OTHER_JOB_SENTINEL':'Fictional technician',workplaceArea:i===1?'PRIVATE_OTHER_WORKPLACE_SENTINEL':'fixture-work-area',workplaceAreaName:i===1?'PRIVATE_OTHER_WORKPLACE_SENTINEL':'Fixture Work Area',homeProxy:{lat:1.3,lon:103.8,basis:'Synthetic fixture proxy',sourceId:'fixture-geography'},workplaceProxy:{lat:1.31,lon:103.81,basis:'Synthetic fixture proxy',sourceId:'fixture-geography'},schedule:{timeZone:'Asia/Singapore',arrangement:'on-site',days:[0,1,2,3,4],startMinute:540,endMinute:1080,breakMinutes:60,overnight:false,weeklyMinutes:2400,templateId:'fixture-office',assumptionIds:['fixture-schedule']},travelMode:'rail',eligibleAccessStationIds:['fixture-origin'],preferredAccessStationId:'fixture-origin',circumstances:[],fieldProvenance:Object.fromEntries(['demographics','exactAge','labourForceStatus','employmentRelationship','nature','occupationCode','jobTitle','workplaceArea','homeProxy','workplaceProxy','schedule','travelMode','accessStations'].map(k=>[k,{basis:k==='demographics'?'source-constrained':'synthetic-assumption',sourceIds:[],assumptionIds:['fixture-assumption']}]))}));
 const base={version:1,id:populationId,seed:'fixture',sampleSize:total,source:{rawSha256:baseSourceHash,datasetId:'fixture-census'},residents:records.map(c=>({id:c.id,label:'Fictional resident',synthetic:true,weight:c.weight,ageGroup:c.ageGroup,sex:c.sex,planningArea:c.planningArea,planningAreaName:c.planningAreaName,subzone:c.subzone,subzoneName:c.subzoneName,householdId:null,organisationId:null,occupation:null,sourceRow:1,socialIdentity:c.id} as Resident))} as PopulationView;
 const manifest={version:1 as const,policy:'citizen-circumstances-v1' as const,populationId,baseSourceHash,generatorVersion:'synthetic-fixture-v1',seed:'fixture',recordCount:total,representedPopulation:records.reduce((n,r)=>n+r.weight,0),sources:[],assumptions:[{id:'fixture-assumption',description:'Synthetic test only'}],conditionalDistributions:[],occupationMapping:'synthetic-fixture',scheduleTemplates:['fixture-office'],travelModeRules:[],missingDataPolicy:'unknown',calibration:[],limitations:['Synthetic capability fixture only.']};
 const dataset:CitizenDataset={version:1,policy:'citizen-circumstances-v1',id:datasetId,populationId,seed:'fixture',baseSourceHash,records,manifest};
 const facts:CitizenCommuteFact[]=records.map((c,i)=>({version:1,policy:'citizen-commute-v1',id:'commute-'+(i+1).toString(16).padStart(64,'0'),citizenId:c.id,citizenDatasetId:datasetId,populationId,scenarioFingerprint,residentialArea:c.planningArea,workplaceArea:c.workplaceArea,scheduleSummary:citizenScheduleSummary(c),mode:'rail',baseline:{status:'reachable',totalSeconds:1200,railSeconds:1000,accessSeconds:100,egressSeconds:100,transfers:1,originStationId:'fixture-origin',destinationStationId:'fixture-destination',stationIds:['fixture-origin','fixture-destination']},intervention:{status:'reachable',totalSeconds:900,railSeconds:700,accessSeconds:100,egressSeconds:100,transfers:0,originStationId:'fixture-origin',destinationStationId:'fixture-destination',stationIds:['fixture-origin','fixture-destination']},status:'improved',minutesSaved:5,transferChange:-1,sourceIds:['fixture-gtfs'],assumptions:['fixture-walking'],unknownReason:null}));
 const commutes={version:1,policy:'citizen-commute-v1',id:'citizen-impact-fixture',citizenDatasetId:datasetId,populationId,scenarioFingerprint,serviceDate:'2026-10-27',facts,summary:{} as CitizenCommuteRun['summary'],diagnostics:{baselineTrees:1,interventionTrees:1,citizens:total,candidateLimit:3},demandReference:null,assumptions:['fixture-walking']} as CitizenCommuteRun;
 return {dataset,commutes,base,activeIds,capableIds,backgroundIds};
}
const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const built=async(total=50,capable=35)=>{const f=fixture(total,capable),roster=await mockPersonalityRoster({runId:'run-social-fixture',seed:'fixture-personality',capableIds:f.capableIds,backgroundIds:f.backgroundIds});return {...f,roster,grounding:await createCitizenGrounding(f.dataset,f.commutes,roster,f.activeIds,f.capableIds)};};

for(const [total,capable]of [[50,35],[100,70]])test(`${total}/${capable} citizen grounding freezes matching facts and presents only each actor's bounded context`,async()=>{
 const f=await built(total,capable);validateCitizenGrounding(f.grounding,f.base,f.activeIds,f.capableIds);
 assert.equal(f.grounding.profiles.length,total);assert.equal(f.grounding.personalities.profiles.length,total);assert.ok(Object.isFrozen(f.grounding.profiles[0].citizen.schedule));
 for(const id of f.activeIds){const c=presentCitizenGrounding(f.grounding,id);assert.equal(c.citizenId,id);assert.ok(Buffer.byteLength(canonical(c))<=4096);assert.equal(c.facts.length,10);assert.ok(!JSON.stringify(c).includes('"profiles"'));}
 const own=presentCitizenGrounding(f.grounding,f.activeIds[0]);assert.ok(!JSON.stringify(own).includes('PRIVATE_OTHER_'));assert.equal(own.commute?.minutesSaved,5);assert.equal(own.personality.origin,'offline-mock');
 assert.deepEqual(own.facts.map(f=>f.id),['fact-home','fact-employment','fact-occupation','fact-workplace','fact-schedule','fact-mode','fact-baseline','fact-intervention','fact-saving','fact-transfer-change']);
 assert.ok(own.subjects.some(s=>s.id==='commute'&&s.criterion?.id==='criterion-commute-improves'));
 assert.ok(presentCitizenGrounding(f.grounding,f.backgroundIds[0]).personality.origin==='deterministic-rule');
});

test('accepted grounding does not change when caller dataset, route or persona references mutate',async()=>{
 const f=await built(),before=canonical(f.grounding);f.dataset.records[0].jobTitle='Changed outside';f.commutes.facts[0].minutesSaved=999;
 assert.equal(canonical(f.grounding),before);assert.throws(()=>{f.grounding.profiles[0].citizen.exactAge=70;});
});

test('unknown/non-MRT commuters expose no numerical benefits or deterministic satisfaction criterion',async()=>{
 const f=fixture(),none={status:'not-applicable' as const,totalSeconds:null,railSeconds:null,accessSeconds:null,egressSeconds:null,transfers:null,originStationId:null,destinationStationId:null,stationIds:[]};
 f.dataset.records[0].travelMode='car-taxi';Object.assign(f.commutes.facts[0],{mode:'car-taxi',status:'not-applicable',baseline:none,intervention:none,minutesSaved:null,transferChange:null,unknownReason:'No road mode comparison is implemented.'});
 const roster=await mockPersonalityRoster({runId:'run-social-fixture',seed:'fixture',capableIds:f.capableIds,backgroundIds:f.backgroundIds});
 const g=await createCitizenGrounding(f.dataset,f.commutes,roster,f.activeIds,f.capableIds),c=presentCitizenGrounding(g,f.activeIds[0]);
 assert.equal(c.commute?.minutesSaved,null);assert.equal(c.facts.find(f=>f.id==='fact-saving')?.value,null);assert.ok(!c.subjects.some(s=>s.criterion));
});

test('wrong population, base source, active roster or scenario identities fail closed',async()=>{
 const f=await built();
 for(const mutate of [
  (g:any)=>{g.populationId='population-'+'0'.repeat(64);},
  (g:any)=>{g.sourceManifest.baseSourceHash='0'.repeat(64);},
  (g:any)=>{g.profiles[0].citizen.id='another-citizen';},
  (g:any)=>{g.profiles[0].commute.scenarioFingerprint='e'.repeat(64);},
  (g:any)=>{g.profiles[0].commute.citizenDatasetId='citizens-other';},
 ]){const g=copy(f.grounding);mutate(g);assert.throws(()=>validateCitizenGrounding(g,f.base,f.activeIds,f.capableIds));}
 assert.throws(()=>presentCitizenGrounding(f.grounding,'unknown-actor'),/CITIZEN_GROUNDING_ACTOR/);
});

test('source-derived strata and original expansion weight cannot be rewritten by a profile',async()=>{
 const f=await built();for(const [key,value]of [['ageGroup','70_74'],['sex','male'],['planningArea','other'],['subzone','other'],['weight',999]] as const){const g=copy(f.grounding);(g.profiles[0].citizen as any)[key]=value;assert.throws(()=>validateCitizenGrounding(g,f.base,f.activeIds,f.capableIds),/CITIZEN_GROUNDING_(SOURCE|RECORD)/);}
});

test('calculated commute deltas cannot contradict their underlying times and transfer counts',async()=>{
 const f=await built();const g=copy(f.grounding);g.profiles[0].commute!.minutesSaved=100;assert.throws(()=>validateCitizenGrounding(g,f.base,f.activeIds,f.capableIds),/COMMUTE|CITIZEN_GROUNDING/);
});

test('missing or unrecognised field provenance cannot enter an immutable grounded profile',async()=>{
 const f=await built();
 for(const mutate of [(g:any)=>{delete g.profiles[0].citizen.fieldProvenance.schedule;},(g:any)=>{g.profiles[0].citizen.fieldProvenance.hiddenOtherActor={basis:'synthetic-assumption',sourceIds:[],assumptionIds:[]};}]){const g=copy(f.grounding);mutate(g);assert.throws(()=>validateCitizenGrounding(g,f.base,f.activeIds,f.capableIds),/CITIZEN_GROUNDING_RECORD/);}
});

test('malformed source identifiers and unsupported schedule combinations fail safely',async()=>{
 const f=await built();
 for(const mutate of [(g:any)=>{g.profiles[0].citizen.fieldProvenance.schedule.sourceIds=['https://private.invalid/raw'];},(g:any)=>{g.profiles[0].citizen.schedule.weeklyMinutes=999;},(g:any)=>{g.profiles[0].citizen.fieldProvenance.schedule={basis:'unknown',sourceIds:[],assumptionIds:[]};}]){const g=copy(f.grounding);mutate(g);assert.throws(()=>validateCitizenGrounding(g,f.base,f.activeIds,f.capableIds),/CITIZEN_GROUNDING_RECORD/);}
});

test('calculated commuting sources identify the graph rather than an unrelated demographic aggregate',async()=>{
 const f=fixture(),graphSource='graph-topology:'+'e'.repeat(64);for(const fact of f.commutes.facts)fact.sourceIds=['ct17565',graphSource];
 const roster=await mockPersonalityRoster({runId:'run-source-fixture',seed:'fixture',capableIds:f.capableIds,backgroundIds:f.backgroundIds}),g=await createCitizenGrounding(f.dataset,f.commutes,roster,f.activeIds,f.capableIds);
 const c=presentCitizenGrounding(g,f.activeIds[0]);assert.ok(c.facts.filter(f=>f.basis==='calculated').every(f=>f.sourceIds[0]===graphSource));
 assert.ok(g.sourceManifest.sourceIds.includes(graphSource));assert.ok(g.sourceManifest.assumptionIds.includes('fixture-walking'));
});

test('strict grounding schema rejects cross-agent extras and oversized private input',async()=>{
 const f=await built(),g=copy(f.grounding) as any;g.profiles[0].otherCitizens=f.dataset.records;
 assert.throws(()=>validateCitizenGrounding(g,f.base,f.activeIds,f.capableIds),/CITIZEN_GROUNDING/);
 const x=copy(f.grounding) as any;x.hidden='PRIVATE'.repeat(100000);assert.throws(()=>validateCitizenGrounding(x,f.base,f.activeIds,f.capableIds),/CITIZEN_GROUNDING/);
});

test('genesis facts are not claimed as recorded experiences, and restoration invokes no provider',async()=>{
 const f=await built(),wire=JSON.stringify(presentCitizenGrounding(f.grounding,f.activeIds[0]));assert.ok(!wire.includes('"memories"')&&!wire.includes('"episodes"'));
 assert.ok(wire.includes('not recorded experiences'));let calls=0;const original=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw Error('UNEXPECTED_FETCH');};
 try{validateCitizenGrounding(copy(f.grounding),f.base,f.activeIds,f.capableIds);presentCitizenGrounding(copy(f.grounding),f.activeIds[0]);}finally{globalThis.fetch=original;}
 assert.equal(calls,0);
});
