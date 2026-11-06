import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveInput} from '../../stakeholder-simulation/inference-input.ts';
import {runStakeholderSimulation,deterministicTurn} from '../../stakeholder-simulation/engine.ts';
import {parseInferenceCallRecord,parseInferenceDiagnostics,parseInferenceStatus,INFERENCE_LIMITS} from '../../stakeholder-simulation/inference-contract.ts';
import {buildPersonalityRequest,acceptProviderPersonalities,validatePersonalityRoster} from '../../citizen-grounding/personality.ts';

const claude={model:'claude-haiku-5-5',provider:'anthropic',gateway:'Anthropic',servingProvider:'Anthropic',executionProvider:'anthropic'};
const legacy={model:'deepseek/deepseek-v4-flash-0731',provider:'digitalocean',gateway:'OpenRouter',servingProvider:'DigitalOcean',executionProvider:'openrouter'};
function call(identity=claude){return {requestedModel:identity.model,requestedProvider:identity.provider,servingModel:identity.model,servingProvider:identity.servingProvider,identityVerification:'completion',generationId:'fixture-1',inputTokens:10,outputTokens:5,totalTokens:15,costUsd:null,status:'accepted',errorCode:null,durationMs:1};}
function status(identity=claude){return {version:1,model:identity.model,provider:identity.provider,gateway:identity.gateway,fallback:false,connection:'configured',enabled:true,servingIdentityVerified:false,limits:INFERENCE_LIMITS};}
async function fixture(identity=claude){
 const input=createLiveInput('mrt','What if a new MRT line opened in Singapore?');
 const run=await runStakeholderSimulation(input,{attemptId:'identity-contract',provider:identity.executionProvider,model:identity.model,generateTurn:async context=>deterministicTurn(context)});
 const records=run.events.map(()=>call(identity));
 const inference={version:1,requestedModel:identity.model,requestedProvider:identity.provider,allowFallbacks:false,successfulCalls:records.length,failedCalls:0,retries:0,inputTokens:records.length*10,outputTokens:records.length*5,totalTokens:records.length*15,costUsd:null,reservedTokens:10000,reservationBasis:'Conservative UTF-8 bytes plus bounded output; not billed usage.',durationMs:1,roundsCompleted:2,activeAgents:4,records,limits:INFERENCE_LIMITS};
 return {run,inference};
}
test('browser diagnostics retain actual Anthropic execution and legacy DigitalOcean saved runs',async()=>{
 for(const identity of [claude,legacy]){
  const {run,inference}=await fixture(identity);
  assert.equal(parseInferenceStatus(status(identity)).gateway,identity.gateway);
  assert.equal(parseInferenceCallRecord(call(identity)).servingProvider,identity.servingProvider);
  assert.equal(parseInferenceDiagnostics(inference,run).requestedModel,identity.model);
 }
});
test('connection identity rejects crossed model/provider pairs and gateways',()=>{
 for(const identity of [claude,legacy])for(const other of [claude,legacy].filter(value=>value!==identity)){
  assert.throws(()=>parseInferenceStatus({...status(identity),provider:other.provider}));
  assert.throws(()=>parseInferenceStatus({...status(identity),gateway:other.gateway}));
 }
});
test('call identity rejects crossed requested and serving identities, including failed unverified metadata',()=>{
 for(const identity of [claude,legacy])for(const other of [claude,legacy].filter(value=>value!==identity)){
  for(const change of [{requestedProvider:other.provider},{servingModel:other.model},{servingProvider:other.servingProvider}]){
   assert.throws(()=>parseInferenceCallRecord({...call(identity),...change}));
   assert.throws(()=>parseInferenceCallRecord({...call(identity),status:'failed',errorCode:'AI_PROVIDER_IDENTITY',identityVerification:'unverified',...change}));
  }
 }
 assert.equal(parseInferenceCallRecord({...call(),status:'failed',errorCode:'AI_UPSTREAM',identityVerification:'unverified',servingModel:null,servingProvider:null}).inputTokens,10);
});
test('diagnostics reject truthful individual records spliced into a different model execution',async()=>{
 const {run,inference}=await fixture(legacy);
 const records=structuredClone(inference.records);records[0]=call(claude);
 assert.throws(()=>parseInferenceDiagnostics({...inference,records},run));
 const altered=structuredClone(run);altered.execution.provider='anthropic';
 assert.throws(()=>parseInferenceDiagnostics(inference,altered));
});
test('real personality provenance retains the verified Anthropic identity and rejects crossed serving pairs',async()=>{
 const request=await buildPersonalityRequest({runId:'personality-identity',seed:'identity-test',capableIds:['citizen-1'],backgroundIds:[]});
 const output={profiles:[{slotId:'profile-1',style:'direct',c:1,i:2,d:3,k:4,u:0}]};
 const provenance={id:'msg-fixture',inputTokens:100,outputTokens:50,costUsd:0,requestedModel:'claude-haiku-5-5',servingModel:'claude-haiku-5-5',servingProvider:'Anthropic'};
 const roster=await acceptProviderPersonalities(request,output,provenance);
 assert.equal(roster.generation.requestedModel,'claude-haiku-5-5');
 assert.equal(roster.generation.servingProvider,'Anthropic');
 await validatePersonalityRoster(roster,request.capableIds);
 await assert.rejects(acceptProviderPersonalities(request,output,{...provenance,servingProvider:'DigitalOcean'}));
 const unknown=await acceptProviderPersonalities(request,output,{...provenance,costUsd:null,wireRequestDigest:'a'.repeat(64)});
 assert.equal(unknown.generation.costUsd,null);
 assert.equal(unknown.generation.usageBasis,'provider-reported-tokens-cost-unknown');
 assert.equal(unknown.generation.wireRequestDigest,'a'.repeat(64));
 await validatePersonalityRoster(unknown,request.capableIds);
 await assert.rejects(acceptProviderPersonalities(request,output,{id:'legacy',inputTokens:100,outputTokens:50,costUsd:null}));
});
