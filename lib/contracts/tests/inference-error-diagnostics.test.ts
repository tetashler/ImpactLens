import test from 'node:test';
import assert from 'node:assert/strict';
import {createDeepseekTransport,MODEL} from '../../server/inference/deepseek.ts';
import {createDemoInput} from '../../stakeholder-simulation/roles.ts';
import {deterministicTurn,runStakeholderSimulation,type TurnContext} from '../../stakeholder-simulation/engine.ts';
import {questionRunErrorMessage} from '../../question-simulation/errors.ts';
import {executeLiveRun} from '../../server/inference/service.ts';
import {validateInferenceResponse} from '../../stakeholder-simulation/inference-contract.ts';

const input=()=>{const i=createDemoInput();i.simulationOptions={...i.simulationOptions,mode:'llm-assisted',rounds:2};i.stakeholderRoles=i.stakeholderRoles.slice(0,2);return i;};
test('distinct rejected completions retain finite safe diagnostics without bodies or retries',async()=>{
 const i=input(),c:TurnContext={input:i,role:i.stakeholderRoles[0],turnIndex:0,round:1,checkpointYear:0,previousEvents:[],memory:{roleId:i.stakeholderRoles[0].id,eventIds:[],position:null,citedFindingIds:[],concerns:[],uncertainties:[]}};
 const valid=deterministicTurn(c);
 for(const [value,finish,expected]of [
  ['not JSON private-content','stop','AI_RESPONSE_JSON'],
  [JSON.stringify({...valid,extra:'private-content'}),'stop','AI_ACTION_SCHEMA'],
  [JSON.stringify({...valid,previousEventIds:['unknown']}),'stop','AI_ACTION_REFERENCE'],
  [JSON.stringify({...valid,statement:'A 20% effect is guaranteed.'}),'stop','AI_ACTION_SEMANTICS'],
  [JSON.stringify(valid),'length','AI_RESPONSE_INCOMPLETE'],
 ]as const){let calls=0;const t=createDeepseekTransport({key:'private-test-key',fetcher:async()=>{calls++;return Response.json({model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:finish,message:{content:value}}]});}});
  await assert.rejects(t.generate(c),e=>(e as {code:string}).code===expected);
  assert.equal(calls,1);assert.equal(t.records[0].errorCode,expected);assert.equal(t.records[0].identityVerification,'completion');
  assert.doesNotMatch(JSON.stringify(t.records),/private-content|private-test-key|guaranteed/);
 }
});
test('a rejected later reference preserves accepted turns and categories through live API validation and UI',async()=>{
 const i=input();let n=0;const transport=createDeepseekTransport({key:'mock-only',fetcher:async(_url,init)=>{
  const c=JSON.parse(JSON.parse(String(init?.body)).messages[1].content)as TurnContext;
  const value=deterministicTurn(c);if(n++===1)value.evidenceFindingIds=['nonexistent'];
  return Response.json({model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]});
 }});
 const response=await executeLiveRun(i,'diagnostics-partial',{enabled:true,key:'mock-only',transport});
 const parsed=await validateInferenceResponse({version:2,attemptId:'diagnostics-partial',...response},{attemptId:'diagnostics-partial',input:i});
 assert.equal(parsed.run.status,'partial');assert.equal(parsed.run.events.length,1);assert.equal(parsed.run.error?.code,'AI_ACTION_REFERENCE');
 assert.match(questionRunErrorMessage(parsed.run)??'',/reference/i);assert.equal(n,2);
});
test('provider identity failure is separate from action rejection and remains fail closed',async()=>{
 const i=input();const run=await runStakeholderSimulation(i,{attemptId:'identity-diagnostic',provider:'openrouter',model:MODEL,generateTurn:async c=>{
  const t=createDeepseekTransport({key:'mock-only',fetcher:async()=>Response.json({model:MODEL,provider:'WrongProvider'})});return(await t.generate(c)).value;
 }});assert.equal(run.error?.code,'AI_PROVIDER_IDENTITY');assert.equal(run.events.length,0);
});

test('gateway JSON/envelope and generation-metadata rejection have separate safe codes',async()=>{
 for(const metadata of [false,true]){
  const i=input();const run=await runStakeholderSimulation(i,{attemptId:`wire-${metadata}`,provider:'openrouter',model:MODEL,generateTurn:async c=>{
   const t=createDeepseekTransport({key:'mock-only',fetcher:async url=>metadata&&!String(url).includes('/generation?')?Response.json({model:MODEL,id:'gen-test'}):new Response('private malformed gateway body',{headers:{'Content-Type':'application/json'}})});
   try{return(await t.generate(c)).value;}finally{assert.equal(t.records[0].errorCode,metadata?'AI_PROVIDER_IDENTITY':'AI_RESPONSE_ENVELOPE');assert.doesNotMatch(JSON.stringify(t.records),/private malformed/);}
  }});assert.equal(run.error?.code,metadata?'AI_PROVIDER_IDENTITY':'AI_RESPONSE_ENVELOPE');assert.equal(run.events.length,0);
 }
});

test('safe termination metadata explains reasoning-only exhaustion without retaining reasoning text',async()=>{
 const i=input();const t=createDeepseekTransport({key:'mock',fetcher:async()=>Response.json({model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'length',native_finish_reason:'length',message:{content:null,reasoning:'private reasoning never retained'}}],usage:{completion_tokens:800,completion_tokens_details:{reasoning_tokens:800}}})});
 await runStakeholderSimulation(i,{attemptId:'termination-regression',provider:'openrouter',model:MODEL,generateTurn:async c=>(await t.generate(c)).value});
 const info=t.records[0].termination;
 assert.ok(info);assert.equal(info.httpStatus,200);assert.equal(info.finishReason,'length');assert.equal(info.reasoningTokens,800);assert.equal(info.requestedOutputTokens,1000);assert.equal(info.jsonValid,false);
 assert.doesNotMatch(JSON.stringify(t.records),/private reasoning/);
});

test('oversized participant context stays a distinct local rejection without a paid call',async()=>{
 const i=input();i.scenarioIdentity='oversized-'+ 'x'.repeat(25000);let calls=0;
 const t=createDeepseekTransport({key:'mock',fetcher:async()=>{calls++;throw Error('Must not request');}});
 const run=await runStakeholderSimulation(i,{attemptId:'oversized-context',provider:'openrouter',model:MODEL,generateTurn:async c=>(await t.generate(c)).value});
 assert.equal(calls,0);assert.equal(run.error?.code,'AI_REQUEST_TOO_LARGE');assert.match(questionRunErrorMessage(run)??'',/input-size/);
});
