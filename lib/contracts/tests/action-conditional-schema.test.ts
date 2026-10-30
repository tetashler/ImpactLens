import test from 'node:test';
import assert from 'node:assert/strict';
import {createDeepseekTransport,MODEL} from '../../server/inference/deepseek.ts';
import {runStakeholderSimulation,deterministicTurn} from '../../stakeholder-simulation/engine.ts';
import {createLiveInput} from '../../stakeholder-simulation/inference-input.ts';
import {parseInferenceCallRecord} from '../../stakeholder-simulation/inference-contract.ts';
import {actionValidationRule} from '../../stakeholder-simulation/inference-errors.ts';
test('partial provider objects produce finite missing-field diagnostics, never provider text',()=>{
 assert.equal(actionValidationRule(new Error('opaque'),{type:'response',position:'conditional'}),'shape.missing_addressedRoleId');assert.equal(actionValidationRule(new Error('private provider text'),null),'shape.invalid');
});
test('conditional action schema encodes existing other-event, own-revision and unchanged-position constraints',async()=>{
 const input=createLiveInput('asean','What if Singapore leaves ASEAN?');let checks=0;
 const transport=createDeepseekTransport({key:'mock',fetcher:async(_u,i)=>{const b=JSON.parse(String(i?.body)),c=JSON.parse(b.messages[1].content),schema=b.response_format.json_schema.schema;
  if(c.round>1){checks++;assert.deepEqual(schema.properties.previousEventIds.contains.enum,c.interactionRequirements.availableOtherEventIds);const branches=schema.anyOf;assert.deepEqual(branches[0].properties.position.enum,[c.memory.position]);for(const branch of branches){assert.deepEqual(branch.required,schema.required);assert.equal(branch.additionalProperties,false);assert.deepEqual(Object.keys(branch.properties),Object.keys(schema.properties));}assert.ok(!branches[0].properties.type.enum.includes('revision'));assert.deepEqual(branches[1].properties.previousEventIds.contains.enum,c.interactionRequirements.ownPriorEventIds);}
  return Response.json({model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(deterministicTurn(c))}}]});
 }});const run=await runStakeholderSimulation(input,{attemptId:'conditional-schema',provider:'openrouter',model:MODEL,generateTurn:async(c)=>(await transport.generate(c)).value});assert.equal(run.status,'completed');assert.equal(checks,4);
});
test('a rejected action retains the exact safe rule without output prose or relaxed validation',async()=>{
 const input=createLiveInput('asean','What if Singapore leaves ASEAN?');
 const transport=createDeepseekTransport({key:'mock',fetcher:async(_u,i)=>{const b=JSON.parse(String(i?.body)),c=JSON.parse(b.messages[1].content),v=deterministicTurn(c);if(c.round>1){v.position=c.memory.position==='conditional'?'concerned':'conditional';v.type='response';}return Response.json({model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(v)}}]});}});
 const run=await runStakeholderSimulation(input,{attemptId:'invalid-position-diagnostic',provider:'openrouter',model:MODEL,generateTurn:async(c)=>(await transport.generate(c)).value});assert.equal(run.status,'partial');const r=transport.records.at(-1)!;assert.equal(r.actionValidationRule,'position.revision_required');assert.equal(r.errorCode,'AI_ACTION_SEMANTICS');assert.doesNotThrow(()=>parseInferenceCallRecord(r));assert.throws(()=>parseInferenceCallRecord({...r,actionValidationRule:'private-untrusted-text'}));
});
