import test from 'node:test';
import assert from 'node:assert/strict';
import {baselineFixture,proposalFixture} from '../../../prototype/mrt/tests/scenario-fixtures.ts';
import {calculateControlledMrtComparison} from '../../server/controlled-mrt.ts';
import {transportDataset,transportReference} from './citizen-transport-fixture.ts';
import {parseControlledMrtRequest} from '../../experiments/controlled-mrt.ts';

// The controller must own immutable copies and reject stale HTTP completions.
const client=await import('../../experiments/controlled-mrt-client.ts');
const context=()=>({intervention:proposalFixture(),serviceDate:'2026-10-27',revision:1,canRun:true});

test('duplicating A freezes the reviewed proposal and editing B cannot change A',()=>{
  assert.equal(typeof client?.createControlledMrtClient,'function','controlled MRT client is available');
  const input=context(),controller=client!.createControlledMrtClient(input);
  assert.equal(controller.getSnapshot().duplicated,false);
  controller.duplicate();controller.edit('base',60);
  input.intervention.stations[0]={kind:'existing',stationId:'changed',transferWalkSeconds:999};
  assert.equal(controller.getSnapshot().optionA?.waitingTimeSeconds,30);
  assert.deepEqual(controller.getSnapshot().optionA?.stations[0],{kind:'existing',stationId:'NS4',transferWalkSeconds:10});
  assert.equal(controller.getSnapshot().waits.base,60);
  controller.dispose();
});

test('invalid waits, fractions and reversed ranges never dispatch a calculation',async()=>{
  assert.equal(typeof client?.createControlledMrtClient,'function');
  let calls=0;
  const controller=client!.createControlledMrtClient(context(),{fetcher:async()=>{calls++;throw Error('Should not dispatch');}});
  controller.duplicate();
  for(const [key,value] of [['low',-1],['low',1.5],['high',3601],['base',NaN],['low',100]] as const){
    controller.duplicate();controller.edit(key,value);await controller.calculate();
    assert.equal(controller.getSnapshot().phase,'error');assert.equal(calls,0);
  }
  controller.dispose();
});

test('cancel and binding revocation ignore late responses even when fetch ignores abort',async()=>{
  assert.equal(typeof client?.createControlledMrtClient,'function');
  const pending:((response:Response)=>void)[]=[],signals:AbortSignal[]=[];
  const controller=client!.createControlledMrtClient(context(),{fetcher:async(_url,init)=>{signals.push(init!.signal as AbortSignal);return new Promise(resolve=>pending.push(resolve));}});
  controller.duplicate();const first=controller.calculate();controller.cancel();
  assert.equal(signals[0].aborted,true);pending[0](new Response('{}'));await first;
  assert.equal(controller.getSnapshot().result,null);assert.equal(controller.getSnapshot().phase,'cancelled');
  const second=controller.calculate();controller.setContext({...context(),canRun:false});
  assert.equal(signals[1].aborted,true);pending[1](new Response('{}'));await second;
  assert.equal(controller.getSnapshot().result,null);assert.equal(controller.getSnapshot().duplicated,false);
  controller.dispose();
});

test('changing waiting inputs or geometry invalidates an entire in-flight batch',async()=>{
  assert.equal(typeof client?.createControlledMrtClient,'function');
  let finish!:(response:Response)=>void;
  const controller=client!.createControlledMrtClient(context(),{fetcher:async()=>new Promise(resolve=>{finish=resolve;})});
  controller.duplicate();const first=controller.calculate();controller.edit('base',35);
  finish(new Response('{}'));await first;assert.equal(controller.getSnapshot().result,null);assert.equal(controller.getSnapshot().phase,'ready');
  const second=controller.calculate();controller.setContext({...context(),revision:2});
  finish(new Response('{}'));await second;
  assert.equal(controller.getSnapshot().result,null);assert.equal(controller.getSnapshot().duplicated,false);
  controller.dispose();
});

test('a complete response is published atomically only after exact request binding is verified',async()=>{
  let submitted:unknown,finish!:(response:Response)=>void;
  const controller=client.createControlledMrtClient(context(),{fetcher:async(url,init)=>{assert.equal(url,'/api/experiments/mrt-comparison');submitted=JSON.parse(String(init?.body));return new Promise(resolve=>{finish=resolve;});}});
  controller.duplicate();const pending=controller.calculate();
  assert.equal(controller.getSnapshot().phase,'calculating');assert.equal(controller.getSnapshot().result,null);
  const response=await calculateControlledMrtComparison(parseControlledMrtRequest(submitted),{dataset:()=>transportDataset(),baseline:()=>baselineFixture(),demand:()=>transportReference,access:()=>({sourceHash:'e'.repeat(64),points:{}})});
  finish(Response.json(response));await pending;
  assert.equal(controller.getSnapshot().phase,'completed');
  assert.deepEqual(controller.getSnapshot().result?.options.map(option=>option.waitingTimeSeconds),[30,15,30,60]);
  assert.ok(Object.isFrozen(controller.getSnapshot().result?.commonCohort));
  controller.dispose();
});

test('mismatched response fingerprints and private server errors never become displayed results',async()=>{
  const response=await calculateControlledMrtComparison({version:1,serviceDate:'2026-10-27',intervention:proposalFixture(),optionB:{waitingTimeSeconds:30},sensitivity:{lowWaitingTimeSeconds:15,highWaitingTimeSeconds:60}},{dataset:()=>transportDataset(),baseline:()=>baselineFixture(),demand:()=>transportReference,access:()=>({sourceHash:'e'.repeat(64),points:{}})});
  const wrong=structuredClone(response);wrong.requestFingerprint='0'.repeat(64);
  for(const reply of [()=>Response.json(wrong),()=>Response.json({error:'PRIVATE_PROFILE_SENTINEL'},{status:503})]){
    const controller=client.createControlledMrtClient(context(),{fetcher:async()=>reply()});controller.duplicate();await controller.calculate();
    assert.equal(controller.getSnapshot().phase,'error');assert.equal(controller.getSnapshot().result,null);
    assert.doesNotMatch(controller.getSnapshot().error,/PRIVATE_PROFILE_SENTINEL/);controller.dispose();
  }
});
