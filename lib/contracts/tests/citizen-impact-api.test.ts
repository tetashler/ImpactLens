import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateCitizenImpact,getPrivateCitizenImpact,citizenImpactResponse} from '../../server/citizen-grounding/api.ts';
import {parseCitizenImpactPublic,parseCitizenImpactRequest,citizenImpactRequestFingerprint,assertCitizenImpactBinding} from '../../citizen-grounding/public-contract.ts';
import {transportCitizen,transportDataset,transportReference} from './citizen-transport-fixture.ts';
import {baselineFixture,proposalFixture} from '../../../prototype/mrt/tests/scenario-fixtures.ts';
const request=()=>({serviceDate:'2026-10-27',intervention:proposalFixture()});
const dependencies=()=>({dataset:()=>transportDataset(),baseline:()=>baselineFixture(),demand:()=>transportReference,access:()=>({sourceHash:'e'.repeat(64),points:{}})});

test('citizen impact uses the shared dataset identity and returns an allowlisted aggregate/sample projection',async()=>{
 const result=await calculateCitizenImpact(request(),dependencies()),p=parseCitizenImpactPublic(result.publicResult);
 assert.equal(p.datasetId,result.dataset.id);assert.equal(p.populationId,result.dataset.populationId);assert.equal(p.runId,result.run.id);assert.equal(p.sample.length,1);assert.equal(p.summary.representedPopulation,10);assert.ok(p.sample[0].minutesSaved!>0);
 const encoded=JSON.stringify(p);for(const forbidden of ['PRIVATE_JOB_SENTINEL','PRIVATE_SCHEDULE_SENTINEL','UNKNOWN_PRIVATE_CODE','homeProxy','workplaceProxy','fieldProvenance','stationMappings','exactAge','issueHistory'])assert.ok(!encoded.includes(forbidden),forbidden);
 assert.equal(p.demandReference?.unmappedTrips,4);assert.equal(getPrivateCitizenImpact(p.runId)?.dataset.records[0].jobTitle,'PRIVATE_JOB_SENTINEL');assert.equal(getPrivateCitizenImpact('unknown'),null);
});
test('public sample is bounded independently of full weighted calculations and cannot contain private fields',async()=>{
 const d=transportDataset(Array.from({length:100},(_,i)=>transportCitizen('citizen-'+i))),result=await calculateCitizenImpact(request(),{...dependencies(),dataset:()=>d});
 assert.equal(result.run.facts.length,100);assert.equal(result.publicResult.sample.length,32);assert.equal(result.publicResult.summary.representedAgents,100);assert.equal(result.publicResult.summary.representedPopulation,1000);
 const bad=structuredClone(result.publicResult) as any;bad.sample[0].jobTitle='PRIVATE';assert.throws(()=>parseCitizenImpactPublic(bad));delete bad.sample[0].jobTitle;bad.summary.coverage.improved.weight+=1;assert.throws(()=>parseCitizenImpactPublic(bad));
});
test('large private population arrays are validated without weakening bounded public JSON parsing',async()=>{
 const dataset=transportDataset(Array.from({length:2001},(_,i)=>transportCitizen('citizen-large-'+i,{travelMode:'bus'})));
 const result=await calculateCitizenImpact(request(),{...dependencies(),dataset:()=>dataset});assert.equal(result.run.facts.length,2001);assert.equal(result.publicResult.summary.representedAgents,2001);assert.equal(result.publicResult.sample.length,32);assert.equal(result.publicResult.summary.coverage['not-applicable'].agents,2001);
});
test('request validation rejects browser paths, datasets, grants, oversized bodies and unsupported proposal fields',()=>{
 for(const value of [{...request(),datasetPath:'private'},{...request(),providerGrant:1000},{...request(),profiles:[]},{...request(),serviceDate:'2026-02-30'},null])assert.throws(()=>parseCitizenImpactRequest(value));
 const extra=request() as any;extra.intervention.secret='private';assert.throws(()=>parseCitizenImpactRequest(extra));const oversized=request();oversized.intervention.name='x'.repeat(17000);assert.throws(()=>parseCitizenImpactRequest(oversized));
});
test('public results bind the exact canonical date and intervention rather than merely the current browser revision',async()=>{
 const input=request(),{publicResult}=await calculateCitizenImpact(input,dependencies());assert.equal(publicResult.requestFingerprint,await citizenImpactRequestFingerprint(input));assert.deepEqual(await assertCitizenImpactBinding(publicResult,input),publicResult);
 const reordered={intervention:input.intervention,serviceDate:input.serviceDate};assert.equal(await citizenImpactRequestFingerprint(reordered),publicResult.requestFingerprint);
 const changed=request();changed.intervention.name='Different proposal';await assert.rejects(()=>assertCitizenImpactBinding(publicResult,changed));const wrongDate=structuredClone(publicResult);wrongDate.serviceDate='2026-10-28';await assert.rejects(()=>assertCitizenImpactBinding(wrongDate,input));const wrongHash=structuredClone(publicResult);wrongHash.requestFingerprint='0'.repeat(64);await assert.rejects(()=>assertCitizenImpactBinding(wrongHash,input));const malformed=structuredClone(publicResult);malformed.requestFingerprint='invalid';assert.throws(()=>parseCitizenImpactPublic(malformed));
});
test('public contract rejects nonfinite, inconsistent, duplicate, transcript and unsupported fields',async()=>{
 const {publicResult:p}=await calculateCitizenImpact(request(),dependencies());
 for(const mutate of [(v:any)=>v.world={},(v:any)=>v.sample[0].minutesSaved=Infinity,(v:any)=>v.sample.push(v.sample[0]),(v:any)=>v.sample[0].baselineMinutes=-1,(v:any)=>v.summary.meanMinutesSaved=900,(v:any)=>v.demandReference.stationMappings=[]]){const bad=structuredClone(p);mutate(bad);assert.throws(()=>parseCitizenImpactPublic(bad));}
});
test('HTTP response never dispatches providers or echoes private diagnostics on malformed input',async()=>{
 let reads=0;const deps={...dependencies(),dataset:()=>{reads++;return transportDataset();}};
 const bad=await citizenImpactResponse(new Request('http://localhost/api/citizen-impact',{method:'POST',body:JSON.stringify({...request(),secret:'PRIVATE_ERROR_SENTINEL'})}),deps);assert.equal(bad.status,400);assert.equal(reads,0);assert.ok(!(await bad.text()).includes('PRIVATE_ERROR_SENTINEL'));
 const ok=await citizenImpactResponse(new Request('http://localhost/api/citizen-impact',{method:'POST',body:JSON.stringify(request())}),deps);assert.equal(ok.status,200);parseCitizenImpactPublic(await ok.json());assert.equal(ok.headers.get('Cache-Control'),'no-store');
 const failure=await citizenImpactResponse(new Request('http://localhost/api/citizen-impact',{method:'POST',body:JSON.stringify(request())}),{...deps,dataset:()=>{throw Error('PRIVATE_STORAGE_DETAIL');}});assert.equal(failure.status,503);assert.ok(!(await failure.text()).includes('PRIVATE_STORAGE_DETAIL'));
});
test('private impact cache retains only two completed runs and exposes no enumeration HTTP method',async()=>{
 const ids=[];for(let i=0;i<3;i++){const q=request();q.intervention.id='FIXTURE_API_'+i;ids.push((await calculateCitizenImpact(q,dependencies())).publicResult.runId);}assert.equal(getPrivateCitizenImpact(ids[0]),null);assert.ok(getPrivateCitizenImpact(ids[2]));
 const method=await citizenImpactResponse(new Request('http://localhost/api/citizen-impact',{method:'GET'}),dependencies());assert.equal(method.status,405);
});
