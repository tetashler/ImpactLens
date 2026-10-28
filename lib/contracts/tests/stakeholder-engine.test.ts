import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoInput} from '../../stakeholder-simulation/roles.ts';
import {parseStakeholderInput,parseStakeholderRun} from '../../stakeholder-simulation/contract.ts';
import {runStakeholderSimulation,deterministicTurn} from '../../stakeholder-simulation/engine.ts';
import {verifyStakeholderRun} from '../../stakeholder-simulation/identities.ts';
import {compareStakeholderRuns} from '../../stakeholder-simulation/comparison.ts';
import {convertExperimentSnapshot} from '../../stakeholder-simulation/compatibility.ts';

test('sequential deterministic run preserves snapshot, earlier references and bounded participant memory',async()=>{
  const input=createDemoInput(),before=structuredClone(input);
  const run=await runStakeholderSimulation(input,{attemptId:'attempt-1'});
  assert.equal(run.status,'completed');assert.equal(run.events.length,18);assert.deepEqual(input,before);
  assert.equal(run.events[0].turnIndex,0);
  const accepted=new Set<string>();
  for(const e of run.events){for(const id of e.previousEventIds)assert.ok(accepted.has(id));accepted.add(e.id);assert.equal(e.provenance,'synthetic-stakeholder-statement');assert.deepEqual(e.evidenceFindingIds,[]);}
  assert.ok(run.events.slice(6).every(e=>e.previousEventIds.length>0));
  assert.ok(run.memories.every(m=>m.eventIds.length<=input.simulationOptions.memoryEvents));
  assert.deepEqual(await verifyStakeholderRun(run),run);
});

test('unknown assumptions are not silently turned into a negotiated transition or replacement agreements',async()=>{
  const input=createDemoInput();input.assumptions=[{id:'research',label:'Open question',value:'Unspecified arrangements',provenance:'user-authored'}];
  const run=await runStakeholderSimulation(input,{attemptId:'unknown-assumptions'});
  assert.equal(run.status,'completed');
  assert.doesNotMatch(run.events.map(e=>e.statement).join(' '),/negotiated transition|hypothetical replacement arrangements/);
});
test('model turns cannot insert invented approval percentages or source URLs',async()=>{
  const input=createDemoInput();input.simulationOptions.mode='llm-assisted';
  const run=await runStakeholderSimulation(input,{attemptId:'false-numbers',provider:'mock',model:'structured-mock',generateTurn:async()=>({type:'argument',addressedRoleId:null,statement:'Public approval will be 83%. See https://made-up.example/',previousEventIds:[],evidenceFindingIds:[],assumptionIds:['withdrawal'],reasoningSummary:'Invented statistical forecast.',uncertainties:['Uncertain'],position:'conditional',topics:['policy']})});
  assert.equal(run.status,'failed');assert.equal(run.events.length,0);
});
test('input parsing rejects fabricated role setup, malformed evidence and unknown fields',()=>{
  const input=createDemoInput();
  const bad=structuredClone(input);bad.stakeholderRoles[0].title='Named actual public official';assert.throws(()=>parseStakeholderInput(bad));
  assert.throws(()=>parseStakeholderInput({...input,secret:'not allowed'}));
  assert.throws(()=>parseStakeholderInput({...input,evidence:{version:1,id:'evidence',sources:[],findings:[{id:'f',sourceIds:['missing'],statement:'Unsupported source'}],gaps:[]}}));
});
test('same seed repeats the semantic sequence and changed assumptions change recorded concerns',async()=>{
  const input=createDemoInput();
  const a=await runStakeholderSimulation(input,{attemptId:'a'}),b=await runStakeholderSimulation(input,{attemptId:'b'});
  const semantic=(run:typeof a)=>run.events.map(e=>({role:e.roleId,type:e.type,statement:e.statement,position:e.position,topics:e.topics}));
  assert.deepEqual(semantic(a),semantic(b));assert.notEqual(a.runId,b.runId);
  const changed=structuredClone(input);changed.assumptions[0].value='negotiated';changed.assumptions[1].value='replacement-agreements';
  const c=await runStakeholderSimulation(changed,{attemptId:'c'});
  assert.notDeepEqual(semantic(a),semantic(c));assert.notEqual(a.inputFingerprint,c.inputFingerprint);
  const comparison=compareStakeholderRuns(a,c);assert.equal(comparison.changedAssumptions.length,2);assert.match(comparison.interpretation,/not changes in real/);
  assert.ok(comparison.topics.some(t=>t.difference!==0));
});
test('evidence citations resolve source lineage and missing evidence never invents URLs',async()=>{
  const input=createDemoInput();input.evidence={version:1,id:'bundle-1',sources:[{id:'source-1',title:'Illustrative supplied test source',url:'https://example.gov.sg/evidence',referenceDate:'2020'}],findings:[{id:'finding-1',sourceIds:['source-1'],statement:'Synthetic test fixture background; not retrieved government evidence.'}],gaps:['Agreement-specific evidence is missing.']};
  const run=await runStakeholderSimulation(input,{attemptId:'grounded'});assert.ok(run.events.every(e=>e.evidenceFindingIds[0]==='finding-1'&&e.sourceIds[0]==='source-1'));assert.ok(run.events.every(e=>e.grounding==='evidence-informed-interpretation'));
  const changed=structuredClone(run);changed.events[0].evidenceFindingIds=['invented'];assert.throws(()=>parseStakeholderRun(changed));
  const bad=structuredClone(input);bad.evidence!.sources[0].url='javascript:alert(1)';assert.throws(()=>parseStakeholderInput(bad));
});
test('cancelled and failed executions remain inspectable and incomplete runs cannot compare',async()=>{
  const input=createDemoInput();const controller=new AbortController();controller.abort();
  const cancelled=await runStakeholderSimulation(input,{attemptId:'cancelled',signal:controller.signal});assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.events.length,0);
  const llm=structuredClone(input);llm.simulationOptions.mode='llm-assisted';
  const unavailable=await runStakeholderSimulation(llm,{attemptId:'unavailable'});assert.equal(unavailable.status,'failed');assert.equal(unavailable.error?.code,'LLM_UNAVAILABLE');
  const completed=await runStakeholderSimulation(input,{attemptId:'completed'});assert.throws(()=>compareStakeholderRuns(completed,cancelled));
});
test('separate LLM turn calls receive frozen bounded prior contexts and commit actual state changes',async()=>{
  const input=createDemoInput();input.simulationOptions.mode='llm-assisted';input.simulationOptions.rounds=2;input.simulationOptions.memoryEvents=1;
  const contexts:unknown[]=[];
  const run=await runStakeholderSimulation(input,{attemptId:'per-turn',provider:'mock',model:'structured-mock',generateTurn:async context=>{
    contexts.push(context);assert.ok(Object.isFrozen(context)&&Object.isFrozen(context.input));if(context.turnIndex>0)assert.ok(context.previousEvents.length>0);
    return {type:context.round===1?'argument':'response',addressedRoleId:context.previousEvents.at(-1)?.roleId??null,statement:'A qualitative hypothetical concern; no outcome is established.',previousEventIds:context.previousEvents.at(-1)?[context.previousEvents.at(-1)!.id]:[],evidenceFindingIds:[],assumptionIds:['withdrawal'],reasoningSummary:'This fictional role responds to supplied context.',uncertainties:['No future outcome is known.'],position:'conditional',topics:['planning']};
  }});
  assert.equal(run.status,'completed');assert.equal(contexts.length,12);assert.ok(run.memories.every(m=>m.eventIds.length===1));
});
test('partial provider failure preserves accepted events and redacts thrown provider details',async()=>{
  const input=createDemoInput();input.simulationOptions.mode='llm-assisted';let calls=0;
  const run=await runStakeholderSimulation(input,{attemptId:'partial',provider:'mock',model:'structured-mock',generateTurn:async()=>{if(++calls===2)throw new Error('private-secret-upstream-body');return {type:'argument',addressedRoleId:null,statement:'An explicitly hypothetical opening argument.',previousEventIds:[],evidenceFindingIds:[],assumptionIds:['withdrawal'],reasoningSummary:'Role assumption only.',uncertainties:['Evidence missing.'],position:'conditional',topics:['planning']};}});
  assert.equal(run.status,'partial');assert.equal(run.events.length,1);assert.doesNotMatch(JSON.stringify(run),/private-secret/);
});
test('strict run import rejects reordering, altered memories and mismatched source snapshots',async()=>{
  const run=await runStakeholderSimulation(createDemoInput(),{attemptId:'validation'});
  const reordered=structuredClone(run);[reordered.events[0],reordered.events[1]]=[reordered.events[1],reordered.events[0]];assert.throws(()=>parseStakeholderRun(reordered));
  const memories=structuredClone(run);memories.memories[0].position='information-seeking';assert.throws(()=>parseStakeholderRun(memories));
  const changed=structuredClone(run);changed.inputSnapshot.assumptions[0].value='negotiated';await assert.rejects(()=>verifyStakeholderRun(changed));
  assert.throws(()=>parseStakeholderInput({...createDemoInput(),stakeholderRoles:[]}));
});
test('Phase 7E compatibility uses one explicit independent shape and preserves detached evidence/assumptions',()=>{
  const input=createDemoInput();const source={version:1,experimentId:'experiment-compatible',scenarioIdentity:'scenario-compatible',configurationIdentity:'configuration-compatible',configuration:{question:input.question,assumptions:input.assumptions,horizonYears:input.horizonYears},evidence:null};
  const converted=convertExperimentSnapshot(source,{stakeholderRoleIds:['small-business','household'],simulationOptions:input.simulationOptions});assert.equal(converted.stakeholderRoles.length,2);assert.equal(converted.experimentId,source.experimentId);converted.assumptions[0].value='changed';assert.equal(source.configuration.assumptions[0].value,'immediate');
  assert.throws(()=>convertExperimentSnapshot({...source,version:2},{stakeholderRoleIds:['household'],simulationOptions:input.simulationOptions}));
});
test('later model turns must react to another recorded participant instead of unrelated monologues',async()=>{
  const input=createDemoInput();input.simulationOptions.mode='llm-assisted';input.simulationOptions.rounds=2;
  const run=await runStakeholderSimulation(input,{attemptId:'non-responsive',provider:'mock',model:'structured-mock',generateTurn:async()=>({type:'argument',addressedRoleId:null,statement:'An independent opening statement only.',previousEventIds:[],evidenceFindingIds:[],assumptionIds:['withdrawal'],reasoningSummary:'No prior context used.',uncertainties:['Unknown evidence.'],position:'conditional',topics:['planning']})});
  assert.equal(run.status,'partial');assert.equal(run.events.length,input.stakeholderRoles.length);
});
test('known provider failures preserve safe explicit codes without upstream text',async()=>{
  const input=createDemoInput();input.simulationOptions.mode='llm-assisted';
  const error=Object.assign(new Error('private upstream body'),{code:'AI_TIMEOUT'});
  const run=await runStakeholderSimulation(input,{attemptId:'timeout',provider:'mock',model:'structured-mock',generateTurn:async()=>{throw error;}});
  assert.equal(run.status,'failed');assert.equal(run.error?.code,'AI_TIMEOUT');assert.doesNotMatch(JSON.stringify(run),/private upstream/);
});
test('LLM attempts with missing provider or model metadata fail before calling a participant',async()=>{
  const input=createDemoInput();input.simulationOptions.mode='llm-assisted';input.simulationOptions.rounds=1;
  for(const metadata of [{},{provider:'mock'},{model:'structured-mock'},{provider:'mock',model:' '}]){
    let calls=0;
    const run=await runStakeholderSimulation(input,{attemptId:'missing-attribution',...metadata,generateTurn:async context=>{calls++;return deterministicTurn(context);}});
    assert.equal(run.status,'failed');assert.equal(run.events.length,0);assert.equal(calls,0);assert.equal(run.error?.code,'AI_CONFIG');
  }
});
test('imported LLM records with accepted turns require both provider and model attribution',async()=>{
  const input=createDemoInput();input.simulationOptions.mode='llm-assisted';input.simulationOptions.rounds=1;
  const completed=await runStakeholderSimulation(input,{attemptId:'attributed',provider:'mock',model:'structured-mock',generateTurn:async context=>deterministicTurn(context)});
  assert.equal(completed.status,'completed');
  let calls=0;
  const partial=await runStakeholderSimulation(input,{attemptId:'partial-attributed',provider:'mock',model:'structured-mock',generateTurn:async context=>{if(calls++)throw new Error('fixture failure');return deterministicTurn(context);}});
  assert.equal(partial.status,'partial');
  for(const run of [completed,partial])for(const key of ['provider','model'] as const){
    const imported=structuredClone(run);imported.execution[key]=null;
    assert.throws(()=>parseStakeholderRun(imported));
    await assert.rejects(()=>verifyStakeholderRun(imported));
  }
});
