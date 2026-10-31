import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSocialTransport} from '../../server/inference/social.ts';
import {buildDecisionContext,decisionSchema} from '../../society/hybrid.ts';
import {createSociety,act} from '../../society/engine.ts';
import {applyIssue} from '../../society/episodic.ts';
import {QUALITY_POLICY} from '../../society/intelligence.ts';
import {encodeMenuContext} from '../../society/decision-menu.ts';
import type {DecisionContext} from '../../society/decision-contract.ts';
import type {InferenceCallRecord} from '../../server/inference/deepseek.ts';
import {phase4dWorld} from './phase4d-fixture.ts';

function qualityContext(){
 let w=createSociety({...phase4dWorld().genesis.input,intelligence:QUALITY_POLICY});const actorId=w.agents[0].id;
 w=act(w,{actorId,type:'post',platform:'reddit',text:'A synthetic service condition requires a documented response.'});
 w=applyIssue(w,actorId,{kind:'condition',topicId:'topic-1',issueId:null},w.events.at(-1)!.id);
 return buildDecisionContext(w,actorId,'reddit');
}
function response(content:unknown,id='mock-behaviour-transport'){
 return Response.json({id,model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150,cost:0,completion_tokens_details:{reasoning_tokens:0}},choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}]});
}
function ordinary(c:DecisionContext){return {choiceId:c.menu!.find(option=>option.action==='post')!.id,text:'A fictional contextual contribution.',motivation:'Consider the supplied condition.',recallIds:[],stanceId:'keep',discussion:{topicIds:[],argument:'unspecified'},...(c.policy==='conversation-menu-v3'?{issueChoiceId:null}:{issueUpdate:null})};}

test('v3 social transport serializes the scoped system, strict issue-choice schema and exact encoded context',async()=>{
 const c=qualityContext();let calls=0,captured:{url:string;method:string|undefined;body:Record<string,any>}|undefined;
 const transport=createSocialTransport({key:'offline-fixture',fetcher:async(url,init)=>{
  calls++;const body=JSON.parse(String(init?.body));captured={url:String(url),method:init?.method,body};
  const wire=JSON.parse(body.messages[1].content),issue=wire.issueChoices.find((choice:{kind:string})=>choice.kind==='resolve');
  return response({...ordinary(c),discussion:null,issueChoiceId:issue?.id});
 }});
 const result=await transport.generate(c);assert.ok(captured);assert.equal(captured.url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(captured.method,'POST');
 const body=captured.body,wire=JSON.parse(body.messages[1].content),system=body.messages[0].content as string;
  assert.deepEqual(body.provider,{only:['digitalocean'],allow_fallbacks:false,require_parameters:true});assert.equal(body.model,'deepseek/deepseek-v4-flash-0731');
  assert.deepEqual(body.reasoning,{effort:'none',exclude:true});assert.equal(body.max_tokens,600);assert.equal(body.stream,false);
  assert.equal(body.response_format.type,'json_schema');assert.equal(body.response_format.json_schema.name,'social_decision_v1');assert.equal(body.response_format.json_schema.strict,true);
  assert.deepEqual(body.response_format.json_schema.schema,decisionSchema(c));assert.equal(body.messages[1].content,encodeMenuContext(c));assert.ok(Buffer.byteLength(body.messages[1].content)<=24000);
  assert.equal(wire.policy,'conversation-menu-v3');assert.ok(wire.issueChoices.length>0);assert.equal(wire.memoryEvidence.policy,'memory-source-time-v1');
  assert.ok(system.includes('issueChoiceId'),'v3 system must describe the schema field');
  assert.ok(system.includes('discussion:null'),'v3 system must describe the selected issue branch');
  assert.ok(system.includes('Do not output issueUpdate'),'v3 must not ask for legacy generated issue identifiers');
  assert.ok(system.includes('authored time')&&system.includes('encountered time'),'v3 must distinguish source and encounter clocks');
  assert.ok(system.includes('reported claims')&&system.includes('not verified facts'),'source contents must not become verified truth');
  assert.ok(system.includes('optional')&&system.includes('Do not force recall or issue closure'),'v3 must allow nonrecall and open issues');
 assert.equal(calls,1);assert.equal(result.value.issueUpdate?.kind,'resolve');assert.ok(result.value.memoryIds.length>0);assert.equal(transport.records.length,1);assert.equal(transport.records[0].status,'accepted');
});

test('mixed v3 and legacy transport calls retain completion order, callbacks and the exact legacy system',async()=>{
 const v3=qualityContext(),legacy={...v3,policy:'conversation-menu-v2' as const};let calls=0;const observed:InferenceCallRecord[]=[];
 const transport=createSocialTransport({key:'offline-fixture',onRecord:record=>observed.push(record),fetcher:async(_url,init)=>{
  const body=JSON.parse(String(init?.body));calls++;const c=calls===1?v3:legacy;
  if(calls===2){assert.equal(createHash('sha256').update(body.messages[0].content).digest('hex'),'ce5113683f0fb87482d8806e2b9f8db3d33ce306e95c86e0285500a6220219a0');assert.equal(body.messages[1].content,encodeMenuContext(legacy));assert.equal(Object.hasOwn(body.response_format.json_schema.schema.properties,'issueChoiceId'),false);}
  return response(ordinary(c),'mock-mixed-'+calls);
 }});
 await transport.generate(v3);await transport.generate(legacy);
 assert.equal(calls,2);assert.deepEqual(transport.records.map(record=>record.generationId),['mock-mixed-1','mock-mixed-2']);assert.deepEqual(observed.map(record=>record.generationId),['mock-mixed-1','mock-mixed-2']);
 observed[0].status='failed';assert.equal(transport.records[0].status,'accepted','callback copies cannot mutate the retained record');
});

test('a malformed v3 issue choice is diagnosed safely after one mocked completion with no retry',async()=>{
 const c=qualityContext();let calls=0;const marker='SYNTHETIC_MALFORMED_TRANSPORT_SENTINEL';
 const transport=createSocialTransport({key:'offline-fixture',fetcher:async()=>{calls++;return response({...ordinary(c),text:marker,discussion:null,issueChoiceId:'unlisted-choice'});}});
 await assert.rejects(transport.generate(c),(error:unknown)=>{assert.ok(!String(error).includes(marker));return (error as {code:string}).code==='AI_ACTION_SCHEMA';});
 assert.equal(calls,1);assert.equal(transport.records.length,1);assert.equal(transport.records[0].status,'failed');assert.equal(transport.records[0].socialValidationRule,'SOCIAL_TARGET');assert.equal(transport.records[0].socialValidationPath,'decision.issueChoiceId');
 assert.equal(transport.records[0].termination?.jsonValid,true);assert.equal(transport.records[0].termination?.actionValid,false);assert.ok(!JSON.stringify(transport.records).includes(marker));
});

test('v3 rejects a generated legacy issueUpdate instead of retrying or replacing the selected contract',async()=>{
 const c=qualityContext();let calls=0;
 const transport=createSocialTransport({key:'offline-fixture',fetcher:async()=>{calls++;return response({...ordinary(c),issueUpdate:{kind:'resolve',topicId:'topic-1',issueId:'invented-issue'}});}});
 await assert.rejects(transport.generate(c));assert.equal(calls,1);assert.equal(transport.records.length,1);assert.equal(transport.records[0].socialValidationRule,'SOCIAL_SHAPE');assert.equal(transport.records[0].socialValidationPath,'decision');
});
