import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createExperiment} from '../../experiments/contract.ts';
import {createDefaultConfiguration, type AseanConfigurationV1} from '../../experiments/configuration.ts';
import {createScenarioExperimentInput} from '../../experiments/handoff.ts';
import {deterministicTurn,runStakeholderSimulation} from '../../stakeholder-simulation/engine.ts';
import type {SimulationOptionsV1} from '../../stakeholder-simulation/contract.ts';

const bridge = await import('../../stakeholder-simulation/experiment-bridge.ts').catch(() => null);
const simulationOptions: SimulationOptionsV1 = {mode:'deterministic-demo',rounds:2,seed:'integrated-asean',memoryEvents:6};
const options = {stakeholderRoleIds:['small-business','household'],simulationOptions};
async function source(configuration: Partial<AseanConfigurationV1> = {}) {
  const question = 'What if Singapore leaves ASEAN?';
  return createScenarioExperimentInput(await createExperiment({question,
    configuration:{...createDefaultConfiguration(question),...configuration} as AseanConfigurationV1,evidence:null}));
}
async function fixture() {
  return JSON.parse(await readFile(new URL('../../experiments/fixtures/asean-phase7d-input.json',import.meta.url),'utf8'));
}

test('actual Phase 7E fixture retains full immutable source identities and complete evidence beside an explicit D projection',async()=>{
  assert.ok(bridge,'explicit experiment bridge is required');
  const original=await fixture(), before=JSON.stringify(original);
  const converted=await bridge.convertScenarioExperimentInput(original,options);
  assert.equal(JSON.stringify(original),before);
  assert.deepEqual(converted.source,original);
  assert.equal(converted.input.experimentId,'experiment-phase7d-fixture-1');
  assert.equal(converted.input.scenarioIdentity,'scenario-7b6a342d4cb9be44d7668387bdd0baaa7299f353a18f541c90a96c063566b2de');
  assert.equal(converted.input.configurationIdentity,'config-ff210eb2fab03a8fad94e3b5856c9316e162314ae0d14b69b15dbf6576a9ba9c');
  assert.equal(converted.source.executionInputIdentity,'input-aca8f02e3e5a7c4b1bbf11ffe38668157beb6d6378b5bded5414da0f2ecbae7a');
  assert.equal(converted.input.evidence?.id,'evidence-61e30b88875dd7b8eb6d1a56d5678e3b7eec0fa30b31188a6323eccd395ff70f');
  assert.equal(converted.input.horizonYears,5);
  assert.equal(converted.source.execution.status,'not-executed');
  assert.ok(Object.isFrozen(converted.source.evidence?.findings[0].limitations));
  assert.ok(Object.isFrozen(converted.input.assumptions));
  assert.match(converted.input.evidence!.sources[0].referenceDate,/unknown.*2026-10-28/);
  assert.match(converted.input.evidence!.sources[1].referenceDate,/2026-08-21.*2026-10-28/);
  assert.match(converted.input.evidence!.findings[0].statement,/^\[directly-supported\]/);
  assert.deepEqual(converted.input.evidence!.findings[0].sourceIds,['asean-summit-official-20261028']);
  for(const gap of original.evidence.unknowns)assert.ok(converted.input.evidence!.gaps.includes(gap));
  for(const limitation of original.limitations)assert.ok(converted.input.evidence!.gaps.includes(limitation));
  assert.ok(converted.input.evidence!.gaps.some(gap=>gap.includes('does not establish a withdrawal procedure')));
});

test('no-evidence Phase E inputs run sequentially with honest disclosure and stay separate from execution records',async()=>{
  assert.ok(bridge);
  const original=await source({notes:'Explicit hypothetical setup',horizonYears:10});
  const converted=await bridge.convertScenarioExperimentInput(original,options);
  assert.equal(converted.input.evidence,null);
  assert.equal(converted.input.horizonYears,10);
  assert.ok(converted.input.assumptions.some(a=>a.id==='notes'&&a.value==='Explicit hypothetical setup'));
  const run=await runStakeholderSimulation(converted.input,{attemptId:'integration-a'});
  assert.equal(run.status,'completed');
  assert.equal(run.events.length,4);
  assert.ok(run.events.slice(2).every(event=>event.previousEventIds.length>0));
  assert.ok(run.events.every(event=>event.sourceIds.length===0&&event.grounding==='no-evidence'));
  assert.ok(run.limitations.some(value=>/No evidence bundle/.test(value)));
  const linked=await bridge.linkStakeholderRun(original,run);
  assert.equal(linked.source.execution.status,'not-executed');
  assert.equal(linked.run.status,'completed');
  assert.ok(Object.isFrozen(linked.run.events));
  assert.deepEqual(await bridge.verifyLinkedStakeholderRun(JSON.parse(JSON.stringify(linked))),linked);
});

test('negotiated replacement is mapped to the existing D rules and receives a distinct bound run',async()=>{
  assert.ok(bridge);
  const immediate=await bridge.convertScenarioExperimentInput(await source(),options);
  const negotiated=await bridge.convertScenarioExperimentInput(await source({withdrawalTiming:'negotiated',transitionMonths:null,tradeArrangements:'hypothetical-replacement'}),options);
  assert.equal(negotiated.input.assumptions.find(a=>a.id==='trade-arrangements')?.value,'replacement-agreements');
  assert.equal(negotiated.input.assumptions.find(a=>a.id==='transition-months')?.value,'unspecified');
  const a=await runStakeholderSimulation(immediate.input,{attemptId:'immediate'});
  const b=await runStakeholderSimulation(negotiated.input,{attemptId:'negotiated'});
  assert.notEqual(a.inputFingerprint,b.inputFingerprint);
  assert.match(a.events[0].statement,/immediate withdrawal.*unresolved/);
  assert.match(b.events[0].statement,/negotiated transition.*hypothetical replacement/);
  await assert.rejects(bridge.linkStakeholderRun(immediate.source,b),/match|differ/i);
});

test('linked imports reject corrupt evidence references, full hashes and forged lineage',async()=>{
  assert.ok(bridge);
  const converted=await bridge.convertScenarioExperimentInput(await fixture(),options);
  const run=await runStakeholderSimulation(converted.input,{attemptId:'linked-integrity'});
  const linked=await bridge.linkStakeholderRun(converted.source,run);
  const invalidHash=structuredClone(linked);invalidHash.run.inputFingerprint='0'.repeat(64);
  await assert.rejects(bridge.verifyLinkedStakeholderRun(invalidHash));
  const invalidReference=structuredClone(linked);invalidReference.run.events[0].evidenceFindingIds=['absent'];
  await assert.rejects(bridge.verifyLinkedStakeholderRun(invalidReference));
  const invalidSource={...linked,source:{...linked.source,executionInputIdentity:`input-${'0'.repeat(64)}`}};
  await assert.rejects(bridge.verifyLinkedStakeholderRun(invalidSource));
  const forged={...linked,source:{...linked.source,execution:{...linked.source.execution,status:'completed'}}};
  await assert.rejects(bridge.verifyLinkedStakeholderRun(forged));
  await assert.rejects(bridge.verifyLinkedStakeholderRun({...linked,extra:true}));
});

test('registered role selection stays inside the explicit Phase E focus with at least two participants',async()=>{
  assert.ok(bridge);
  assert.deepEqual(bridge.allowedStakeholderRoleIds(['businesses-trade']),['small-business','supply-chain']);
  assert.deepEqual(bridge.allowedStakeholderRoleIds(['workers-households']),['export-worker','household']);
  assert.deepEqual(bridge.allowedStakeholderRoleIds(['government-diplomacy']),['policy-analyst','regional-cooperation']);
  const business=await source({stakeholderFocus:['businesses-trade']});
  await bridge.convertScenarioExperimentInput(business,{...options,stakeholderRoleIds:['small-business','supply-chain']});
  for(const ids of [['small-business'],['small-business','household'],['small-business','small-business'],['missing','small-business']]){
    await assert.rejects(bridge.convertScenarioExperimentInput(business,{...options,stakeholderRoleIds:ids}),/role|participant|focus/i);
  }
});

test('unsupported configuration semantics and nonrepresentable text reject instead of silently truncating',async()=>{
  assert.ok(bridge);
  await assert.rejects(bridge.convertScenarioExperimentInput(await source({withdrawalTiming:'custom',transitionMonths:12}),options),/custom|unsupported/i);
  await assert.rejects(bridge.convertScenarioExperimentInput(await source({tradeArrangements:'hypothetical-continuity'}),options),/continuity|unsupported/i);
  const generic=await createScenarioExperimentInput(await createExperiment({question:'A general question',configuration:createDefaultConfiguration('A general question'),evidence:null}));
  await assert.rejects(bridge.convertScenarioExperimentInput(generic,options),/ASEAN|unsupported/i);
  await assert.rejects(bridge.convertScenarioExperimentInput(await source({notes:'n'.repeat(501)}),options),/notes|500/i);
  await assert.rejects(bridge.convertScenarioExperimentInput(await source({notes:' '.repeat(20)}),options),/notes/i);
});

test('linked envelopes retain cancelled, partial and failed runs without converting them to completed',async()=>{
  assert.ok(bridge);
  const converted=await bridge.convertScenarioExperimentInput(await source(),options);
  const controller=new AbortController();controller.abort();
  const cancelled=await runStakeholderSimulation(converted.input,{attemptId:'cancelled-linked',signal:controller.signal});
  assert.equal((await bridge.linkStakeholderRun(converted.source,cancelled)).run.status,'cancelled');
  const llm=await bridge.convertScenarioExperimentInput(converted.source,{...options,simulationOptions:{...simulationOptions,mode:'llm-assisted'}});
  const failed=await runStakeholderSimulation(llm.input,{attemptId:'failed-linked'});
  assert.equal((await bridge.linkStakeholderRun(llm.source,failed)).run.status,'failed');
  let turns=0;
  const partial=await runStakeholderSimulation(llm.input,{attemptId:'partial-linked',provider:'in-process-test',model:'scripted-test',generateTurn:async context=>{
    if(turns++)throw new Error('Explicit in-process test failure');
    return deterministicTurn(context);
  }});
  assert.equal(partial.status,'partial');
  const linked=await bridge.linkStakeholderRun(llm.source,partial);
  assert.equal((await bridge.verifyLinkedStakeholderRun(JSON.parse(JSON.stringify(linked)))).run.status,'partial');
});

test('an optional actual experiment record is validated and must reproduce the entire linked source',async()=>{
  assert.ok(bridge);
  const question='What if Singapore leaves ASEAN?';
  const record=await createExperiment({question,configuration:createDefaultConfiguration(question),evidence:null});
  const original=await createScenarioExperimentInput(record);
  const converted=await bridge.convertScenarioExperimentInput(original,options);
  const run=await runStakeholderSimulation(converted.input,{attemptId:'actual-record'});
  const linked=await bridge.linkStakeholderRun(original,run,record);
  assert.deepEqual(linked.experiment,record);
  assert.deepEqual(await bridge.verifyLinkedStakeholderRun(JSON.parse(JSON.stringify(linked))),linked);
  const unrelated=await createExperiment({question,configuration:createDefaultConfiguration(question),evidence:null});
  await assert.rejects(bridge.linkStakeholderRun(original,run,unrelated),/experiment|source|match/i);
  const corrupt=structuredClone(linked);corrupt.experiment!.configurationIdentity=`config-${'0'.repeat(64)}`;
  await assert.rejects(bridge.verifyLinkedStakeholderRun(corrupt));
});

test('linked history rejects changed immutable record metadata before replacing an existing run or experiment',async()=>{
  assert.ok(bridge);
  const question='What if Singapore leaves ASEAN?';
  const record=await createExperiment({question,configuration:createDefaultConfiguration(question),evidence:null,
    experimentId:'experiment-immutable-history',createdAt:'2026-10-28T10:00:00.000Z'});
  const original=await createScenarioExperimentInput(record);
  const converted=await bridge.convertScenarioExperimentInput(original,options);
  const run=await runStakeholderSimulation(converted.input,{attemptId:'immutable-first'});
  const first=await bridge.linkStakeholderRun(original,run,record);
  // Record time is deliberately outside the Phase E execution identity: both envelopes validate.
  const changedRecord={...record,createdAt:'2026-10-28T11:00:00.000Z'};
  const changed=await bridge.linkStakeholderRun(original,run,changedRecord);
  const existing=Object.freeze([first]),before=JSON.stringify(existing);
  assert.doesNotThrow(()=>bridge.assertLinkedHistoryCompatible(existing,first,[record]));
  assert.throws(()=>bridge.assertLinkedHistoryCompatible(existing,changed),/immutable|conflict/i);
  assert.equal(JSON.stringify(existing),before);
  const secondRun=await runStakeholderSimulation(converted.input,{attemptId:'immutable-second'});
  const second=await bridge.linkStakeholderRun(original,secondRun,changedRecord);
  assert.notEqual(second.run.runId,first.run.runId);
  assert.throws(()=>bridge.assertLinkedHistoryCompatible(existing,second),/experiment|immutable|conflict/i);
  assert.throws(()=>bridge.assertLinkedHistoryCompatible([],second,[record]),/experiment|immutable|conflict/i);
  assert.equal(JSON.stringify(existing),before);
  assert.doesNotThrow(()=>bridge.assertLinkedHistoryCompatible([],first,[record]));
});
