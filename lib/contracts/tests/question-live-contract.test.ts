import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLiveInput} from '../../stakeholder-simulation/inference-input.ts';
import {runStakeholderSimulation,deterministicTurn} from '../../stakeholder-simulation/engine.ts';

const MODEL='deepseek/deepseek-v4-flash-0731';
const limits={agents:4,rounds:2,calls:8,outputTokens:800,reservedTokens:214400,runTimeoutMs:120000,costUsd:0.05};
async function api(){const value=await import('../../stakeholder-simulation/inference-contract.ts').catch(()=>null);assert.ok(value,'Browser-safe live inference contract must exist');return value;}
async function fixture(partial=false){
 const input=createLiveInput('mrt','What if a new MRT line opened in Singapore?');
 const run=await runStakeholderSimulation(input,{attemptId:'contract-test',provider:'openrouter',model:MODEL,generateTurn:async c=>{if(partial&&c.turnIndex===2)throw new Error('Mock interruption');return deterministicTurn(c);}});
 const records=run.events.map((_,i)=>({requestedModel:MODEL,requestedProvider:'digitalocean',servingModel:MODEL,servingProvider:'DigitalOcean',identityVerification:'completion',generationId:`gen-${i}`,inputTokens:100,outputTokens:50,totalTokens:150,costUsd:0.001,status:'accepted',errorCode:null,durationMs:5}));
 return {input,body:{version:2,attemptId:run.attemptId,run,inference:{version:1,requestedModel:MODEL,requestedProvider:'digitalocean',allowFallbacks:false,successfulCalls:records.length,failedCalls:0,retries:0,inputTokens:records.length*100,outputTokens:records.length*50,totalTokens:records.length*150,costUsd:records.reduce((sum,r)=>sum+r.costUsd,0),reservedTokens:10000,durationMs:100,roundsCompleted:Math.floor(run.events.length/4),activeAgents:4,reservationBasis:'Conservative UTF-8 bytes plus bounded output; not billed usage.',records,limits}}};
}

test('live envelope validates exact run and submitted input while retaining immutable diagnostics',async()=>{
 const {validateInferenceResponse}=await api(),{input,body}=await fixture();
 const accepted=await validateInferenceResponse(body,{attemptId:body.attemptId,input});
 assert.equal(accepted.run.status,'completed');assert.equal(accepted.inference.records.length,8);
 assert.ok(Object.isFrozen(accepted));assert.ok(Object.isFrozen(accepted.inference.records[0]));
 body.run.events[0].statement='Later mutation';assert.notEqual(accepted.run.events[0].statement,body.run.events[0].statement);
});

test('live envelope rejects obsolete versions, foreign attempts and altered submitted input',async()=>{
 const {validateInferenceResponse}=await api(),{input,body}=await fixture();
 for(const change of [{version:1},{attemptId:'foreign'},{extra:true}])await assert.rejects(validateInferenceResponse({...body,...change},{attemptId:body.attemptId,input}));
 const changed=structuredClone(input);changed.assumptions[0].value='Changed assumptions';
 await assert.rejects(validateInferenceResponse(body,{attemptId:body.attemptId,input:changed}));
 const wrong=structuredClone(body);wrong.run.execution.provider='other';
 await assert.rejects(validateInferenceResponse(wrong,{attemptId:body.attemptId,input}));
});

test('diagnostics fail closed on provider identity, fallback, count and unknown metadata',async()=>{
 const {parseInferenceDiagnostics}=await api(),{body}=await fixture();
 for(const change of [{requestedProvider:'other'},{requestedModel:'other/model'},{allowFallbacks:true},{successfulCalls:7},{failedCalls:1},{retries:1},{roundsCompleted:1},{activeAgents:3},{extra:true}])assert.throws(()=>parseInferenceDiagnostics({...body.inference,...change},body.run));
 for(const change of [{servingProvider:'Other'},{servingModel:'other/model'},{identityVerification:'unverified'},{errorCode:'AI_UPSTREAM'},{generationId:'bad id'},{inputTokens:-1},{costUsd:Infinity}]){
  const changed=structuredClone(body.inference);Object.assign(changed.records[0],change);assert.throws(()=>parseInferenceDiagnostics(changed,body.run));
 }
});

test('unknown usage remains null and aggregate fields must match recorded values',async()=>{
 const {parseInferenceDiagnostics}=await api(),{body}=await fixture();
 const changed=structuredClone(body.inference);Object.assign(changed.records[0],{inputTokens:null,costUsd:null});Object.assign(changed,{inputTokens:null,costUsd:null});
 assert.equal(parseInferenceDiagnostics(changed,body.run).costUsd,null);
 assert.throws(()=>parseInferenceDiagnostics({...changed,costUsd:0},body.run));
 assert.throws(()=>parseInferenceDiagnostics({...body.inference,totalTokens:1},body.run));
});

test('partial records and the one accepted-but-cancelled turn remain truthful',async()=>{
 const {parseInferenceDiagnostics}=await api(),{body}=await fixture(true);
 assert.equal(body.run.status,'partial');assert.equal(parseInferenceDiagnostics(body.inference,body.run).successfulCalls,2);
 const cancelled=structuredClone(body.run);cancelled.status='cancelled';cancelled.error={code:'CANCELLED',message:'Cancelled mock'};
 const diagnostics=structuredClone(body.inference);diagnostics.records.push({...diagnostics.records[0],generationId:'late'});Object.assign(diagnostics,{successfulCalls:3,inputTokens:300,outputTokens:150,totalTokens:450,costUsd:diagnostics.records.reduce((sum,r)=>sum+r.costUsd,0)});
 assert.equal(parseInferenceDiagnostics(diagnostics,cancelled).successfulCalls,3);
 assert.throws(()=>parseInferenceDiagnostics(diagnostics,body.run));
 diagnostics.records.push({...diagnostics.records[0],generationId:'later'});diagnostics.successfulCalls++;
 assert.throws(()=>parseInferenceDiagnostics(diagnostics,cancelled));
});

test('safe status exposes configuration without claiming serving verification',async()=>{
 const {parseInferenceStatus}=await api();
 const status={version:1,model:MODEL,gateway:'OpenRouter',provider:'digitalocean',fallback:false,connection:'configured',enabled:true,servingIdentityVerified:false,limits};
 assert.equal(parseInferenceStatus(status).servingIdentityVerified,false);
 for(const change of [{provider:'other'},{servingIdentityVerified:true},{fallback:true},{version:2},{key:'private'},{limits:{...limits,calls:9}}])assert.throws(()=>parseInferenceStatus({...status,...change}));
 let accessed=false;assert.throws(()=>parseInferenceStatus({...status,get model(){accessed=true;return MODEL;}}));assert.equal(accessed,false);
 assert.throws(()=>parseInferenceStatus(Object.assign(Object.create({}),status)));
 const source=readFileSync(new URL('../../stakeholder-simulation/inference-contract.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/from\s+['"][^'"]*(?:server\/|node:)|process\.env|\bBuffer\b/);
});

test('failed call diagnostics preserve known billed usage and must be the final call',async()=>{
 const {parseInferenceDiagnostics}=await api(),{body}=await fixture(true);
 const diagnostics=structuredClone(body.inference);
 diagnostics.records.push({...diagnostics.records[0],status:'failed',errorCode:'AI_INVALID_RESPONSE'} as any);
 Object.assign(diagnostics,{failedCalls:1,inputTokens:300,outputTokens:150,totalTokens:450,costUsd:diagnostics.records.reduce((sum,r)=>sum+r.costUsd,0)});
 assert.equal(parseInferenceDiagnostics(diagnostics,body.run).failedCalls,1);
 diagnostics.records.reverse();assert.throws(()=>parseInferenceDiagnostics(diagnostics,body.run));
});


test('legacy reservation records remain inspectable and optional termination metadata is strictly bounded',async()=>{
 const {parseInferenceDiagnostics}=await api(),{body}=await fixture();
 const legacy=structuredClone(body.inference);legacy.limits.reservedTokens=120000;
 assert.equal(parseInferenceDiagnostics(legacy,body.run).limits.reservedTokens,120000);
 assert.throws(()=>parseInferenceDiagnostics({...legacy,reservedTokens:120001},body.run));
 const termination={httpStatus:200,finishReason:'stop',nativeFinishReason:'stop',reasoningTokens:0,requestedOutputTokens:800,jsonValid:true,actionValid:true};
 const current=structuredClone(body.inference) as any;current.records[0].termination=termination;
 assert.equal(parseInferenceDiagnostics(current,body.run).records[0].termination?.reasoningTokens,0);
 for(const change of [{privateBody:'secret'},{finishReason:'secret'},{reasoningTokens:-1},{requestedOutputTokens:0},{jsonValid:false}]){
  const invalid=structuredClone(current);Object.assign(invalid.records[0].termination,change);assert.throws(()=>parseInferenceDiagnostics(invalid,body.run));
 }
});
