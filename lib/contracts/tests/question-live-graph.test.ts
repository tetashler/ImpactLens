import test from 'node:test';
import assert from 'node:assert/strict';
import {createExperiment} from '../../experiments/contract.ts';
import {createDefaultConfiguration} from '../../experiments/configuration.ts';
import {classifyQuestionContext} from '../../question-simulation/context.ts';
import {createGeometryContext} from '../../experiments/identity.ts';
import {createReplayEvidence} from '../../evidence/replay.ts';
import {runStakeholderSimulation,deterministicTurn} from '../../stakeholder-simulation/engine.ts';
import {INFERENCE_MODEL,INFERENCE_PROVIDER,INFERENCE_LIMITS,type InferenceResponseV2,type InferenceCallRecordV1} from '../../stakeholder-simulation/inference-contract.ts';
async function api(){const value=await import('../../question-simulation/live.ts');assert.equal(typeof value.createQuestionLiveExecution,'function','A verified live execution wrapper must exist');return value;}
async function fixture(question:string,evidence=false,partial=false){
 const value=await api(),context=classifyQuestionContext(question),geometryContext=await createGeometryContext({version:1,scenarioId:'live-graph',features:[]},1);
 let experiment=await createExperiment({question,geometryContext,configuration:createDefaultConfiguration(question,context.intent==='mrt'?'mrt-line':undefined),evidence:null});
 if(evidence)experiment=await createExperiment({question,geometryContext,configuration:experiment.configuration,evidence:await createReplayEvidence({question,scenarioIdentity:experiment.scenarioIdentity,researchAttemptId:'live-graph-evidence',topic:'asean'})});
 const prepared=await value.prepareQuestionLiveInput(experiment,context),records:InferenceCallRecordV1[]=[];
 // In-memory generation fixture. No provider, transport or network is invoked.
 const attemptId=`graph-${crypto.randomUUID()}`;
 const run=await runStakeholderSimulation(prepared.input,{attemptId,provider:'openrouter',model:INFERENCE_MODEL,generateTurn:async c=>{
  const failed=partial&&records.length===2;
  records.push({requestedModel:INFERENCE_MODEL,requestedProvider:INFERENCE_PROVIDER,servingModel:failed?null:INFERENCE_MODEL,servingProvider:failed?null:'DigitalOcean',identityVerification:failed?'unverified':'completion',generationId:null,inputTokens:null,outputTokens:null,totalTokens:null,costUsd:null,status:failed?'failed':'accepted',errorCode:failed?'AI_UPSTREAM':null,durationMs:0});
  if(failed)throw new Error('Test-only failed turn');return deterministicTurn(c);
 }});
 const response:InferenceResponseV2={version:2,attemptId,run,inference:{version:1,requestedModel:INFERENCE_MODEL,requestedProvider:INFERENCE_PROVIDER,allowFallbacks:false,successfulCalls:run.events.length,failedCalls:partial?1:0,retries:0,inputTokens:null,outputTokens:null,totalTokens:null,costUsd:null,reservedTokens:10000,reservationBasis:'Conservative UTF-8 bytes plus bounded output; not billed usage.',durationMs:1,roundsCompleted:Math.floor(run.events.length/4),activeAgents:4,records,limits:INFERENCE_LIMITS}};
 return {...value,experiment,context,response,prepared};
}
test('live wrapper binds whole submitted projection and preserves partial events and diagnostics immutably',async()=>{
 const f=await fixture('What if Singapore increases tax on imported goods?',false,true);
 const execution=await f.createQuestionLiveExecution(f.experiment,f.context,f.response);
 assert.equal(execution.response.run.status,'partial');assert.equal(execution.response.run.events.length,2);assert.equal(execution.response.inference.failedCalls,1);
 assert.deepEqual(await f.verifyQuestionLiveExecution(execution),execution);assert.ok(Object.isFrozen(execution.response.inference.records));
 const stale=await createExperiment({question:f.experiment.question,configuration:f.experiment.configuration,evidence:null,geometryContext:await createGeometryContext({version:1,scenarioId:'changed-geometry',features:[]},2)});
 await assert.rejects(f.createQuestionLiveExecution(stale,f.context,f.response));
 const altered={...structuredClone(execution),source:{...execution.source,executionInputIdentity:`input-${'a'.repeat(64)}`}};
 await assert.rejects(f.verifyQuestionLiveExecution(altered));
});
test('ASEAN live graph keeps source evidence lineage and historical saved status using the exact bridge',async()=>{
 const f=await fixture('What if Singapore leaves ASEAN?',true),execution=await f.createQuestionLiveExecution(f.experiment,f.context,f.response),graph=await f.projectQuestionLiveGraph(execution);
 assert.equal(graph.scenarioIdentity,f.experiment.scenarioIdentity);assert.equal(graph.executionIdentity,f.response.run.runId);
 const saved=graph.nodes.find(n=>n.properties.experimentId===f.experiment.experimentId&&n.properties.archived===true&&n.properties.recordType!=='run');
 assert.equal(saved?.properties.executionStatus,'not-executed');assert.equal(graph.nodes.filter(n=>n.properties.recordType==='event').length,8);
 for(const source of f.experiment.evidence!.sources)assert.equal(graph.nodes.filter(n=>n.properties.sourceId===source.id&&!n.properties.findingId).length,1);
});
test('non-ASEAN live graph retains actual saved input and partial synthetic events without unrelated calculator data',async()=>{
 const f=await fixture('What if Singapore increases tax on imported goods?',false,true),execution=await f.createQuestionLiveExecution(f.experiment,f.context,f.response),graph=await f.projectQuestionLiveGraph(execution);
 assert.equal(graph.scenarioIdentity,f.experiment.scenarioIdentity);assert.equal(graph.executionIdentity,f.response.run.runId);
 assert.equal(graph.nodes.filter(n=>n.properties.recordType==='event').length,2);
 assert.ok(graph.nodes.some(n=>n.properties.recordType==='run'&&n.properties.status==='partial'));
 assert.ok(graph.nodes.some(n=>n.properties.experimentId===f.experiment.experimentId&&n.properties.executionStatus==='not-executed'));
 assert.ok(!graph.nodes.some(n=>n.properties.recordType==='mrt-result'||n.properties.recordType==='aac-result'));
 const altered=structuredClone(execution);altered.domain='mrt';await assert.rejects(f.projectQuestionLiveGraph(altered));
});
