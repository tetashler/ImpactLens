import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseControlledMrtRequest,controlledMrtRequestFingerprint,parseControlledMrtResponse,assertControlledMrtBinding} from '../../experiments/controlled-mrt.ts';
import {calculateControlledMrtComparison} from '../../server/controlled-mrt.ts';
import {baselineFixture,proposalFixture} from '../../../prototype/mrt/tests/scenario-fixtures.ts';
import {transportDataset,transportReference} from './citizen-transport-fixture.ts';

const request=()=>({version:1 as const,serviceDate:'2026-10-27',intervention:proposalFixture(),optionB:{waitingTimeSeconds:60},sensitivity:{lowWaitingTimeSeconds:0,highWaitingTimeSeconds:120}});
const deps=()=>({dataset:()=>transportDataset(),baseline:()=>baselineFixture(),demand:()=>transportReference,access:()=>({sourceHash:'e'.repeat(64),points:{}})});

test('controlled input permits exactly one changed wait and bounded ordered sensitivity assumptions',async()=>{
 const parsed=parseControlledMrtRequest(request());assert.equal(parsed.optionB.waitingTimeSeconds,60);assert.ok(Object.isFrozen(parsed.intervention.stations));
 for(const mutate of [(v:any)=>v.version=2,(v:any)=>v.population={},(v:any)=>v.optionB.stations=[],(v:any)=>delete v.intervention.waitingTimeSeconds,(v:any)=>v.intervention.waitingTimeSeconds=3601,(v:any)=>v.optionB.waitingTimeSeconds=0.5,(v:any)=>v.sensitivity.lowWaitingTimeSeconds=61,(v:any)=>v.sensitivity.highWaitingTimeSeconds=59,(v:any)=>v.optionB.waitingTimeSeconds='60',(v:any)=>v.sensitivity.highWaitingTimeSeconds=Infinity,(v:any)=>v.serviceDate='2026-02-30']){const bad=request();mutate(bad);assert.throws(()=>parseControlledMrtRequest(bad));}
 const original=request(),hash=await controlledMrtRequestFingerprint(original);assert.match(hash,/^[a-f0-9]{64}$/);
 assert.equal(await controlledMrtRequestFingerprint({...original,optionB:{waitingTimeSeconds:60}}),hash);
 const changed=request();changed.sensitivity.highWaitingTimeSeconds=121;assert.notEqual(await controlledMrtRequestFingerprint(changed),hash);
});

test('controlled browser binding rejects stale waits, dates, snapshots and inconsistent aggregates',async()=>{
 const input=request(),response=await calculateControlledMrtComparison(input,deps());assert.deepEqual(await assertControlledMrtBinding(response,input),response);
 const changed=request();changed.optionB.waitingTimeSeconds=61;await assert.rejects(()=>assertControlledMrtBinding(response,changed));
 for(const mutate of [(v:any)=>v.privateRows=[],(v:any)=>v.options[0].common.meanTravelMinutes=999,(v:any)=>v.commonCohort.weight=0,(v:any)=>v.options[0].summary.coverage.improved.weight+=1,(v:any)=>v.comparisons[0].preferred='A',(v:any)=>v.preferenceChanges=false,(v:any)=>v.options[0].waitingTimeSeconds=1.5,(v:any)=>v.options.reverse(),(v:any)=>v.snapshot.sources.push({id:'secret',homeProxy:{lat:1,lon:1}})]){const bad=structuredClone(response);mutate(bad);assert.throws(()=>parseControlledMrtResponse(bad));}
 const badSnapshot=structuredClone(response);badSnapshot.snapshot.baselineGraphHash='0'.repeat(64);await assert.rejects(()=>assertControlledMrtBinding(badSnapshot,input));
 const badWait=structuredClone(response);badWait.options[0].waitingTimeSeconds=31;await assert.rejects(()=>assertControlledMrtBinding(badWait,input));
 const badDate=structuredClone(response);badDate.snapshot.serviceDate='2026-10-28';await assert.rejects(()=>assertControlledMrtBinding(badDate,input));
});
