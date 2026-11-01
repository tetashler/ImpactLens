import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSocialTransport} from '../../server/inference/social.ts';
import {citizenV5Context,citizenV5Wire} from './helpers/citizen-v5.ts';
import {encodeMenuContext} from '../../society/decision-menu.ts';
const response=(content:string)=>Response.json({id:'synthetic-v5-transport',model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',usage:{prompt_tokens:100,completion_tokens:50,cost:0,completion_tokens_details:{reasoning_tokens:0}},choices:[{finish_reason:'stop',message:{content}}]});
test('v5 production transport sends one coherent system/schema/context and accepts finite evidence',async()=>{
 const c=citizenV5Context();let calls=0;
 const transport=createSocialTransport({key:'offline-only',fetcher:async(_url,init)=>{calls++;const body=JSON.parse(String(init?.body)),wire=JSON.parse(body.messages[1].content);
  assert.ok(body.messages[0].content.includes('conversation-menu-v5'));assert.ok(!body.messages[0].content.includes('using conversation-menu-v3'));
  assert.ok(body.response_format.json_schema.schema.properties.issueEvidenceId);assert.equal(body.messages[1].content,encodeMenuContext(c));
  assert.deepEqual(body.provider,{only:['digitalocean'],allow_fallbacks:false,require_parameters:true});assert.deepEqual(body.reasoning,{effort:'none',exclude:true});assert.equal(body.max_tokens,600);
  const option=wire.issueOptions.find((o:any)=>o.kind==='question'&&o.subjectId==='schedule');
  return response(JSON.stringify({...citizenV5Wire(c),text:'Which shift schedule will be confirmed before volunteer visits begin?',discussion:null,issueEvidenceId:option.id}));
 }});
 const r=await transport.generate(c);assert.equal(r.value.issueUpdate?.kind,'question');assert.equal(calls,1);assert.equal(transport.records[0].status,'accepted');
});
test('v5 opt-in rejection observation is finite, independent, once-only and outside usage',async()=>{
 const c=citizenV5Context(),observed:any[]=[];let calls=0;const secret='PRIVATE_REJECTED_MODEL_SENTINEL';
 const t=createSocialTransport({key:'offline-only',rejectionObserver:{version:1,observe:(id:string,v:any)=>observed.push({id,v})},fetcher:async()=>{calls++;return response(JSON.stringify({...citizenV5Wire(c),text:'My commute saves twelve minutes. '+secret}));}});
 await assert.rejects(t.generate(c));assert.equal(calls,1);assert.equal(observed.length,1);assert.equal(observed[0].id,c.id);assert.equal(observed[0].v.subreason,'unsupported-number-or-unit');assert.ok(Object.isFrozen(observed[0].v));
 assert.ok(!JSON.stringify(observed).includes(secret));assert.ok(!JSON.stringify(t.records).includes(secret));assert.equal((t.records[0] as any).diagnostic,undefined);
 assert.equal(t.records[0].socialValidationRule,'SOCIAL_TEXT');
});
test('v5 malformed JSON emits a safe schema observation and never retries',async()=>{
 let calls=0;const observed:any[]=[];const t=createSocialTransport({key:'offline-only',rejectionObserver:{version:1,observe:(_id:string,v:any)=>observed.push(v)},fetcher:async()=>{calls++;return response('{PRIVATE_INVALID_JSON');}});
 await assert.rejects(t.generate(citizenV5Context()));assert.equal(calls,1);assert.equal(observed.length,1);assert.equal(observed[0].subreason,'schema-rejection');assert.equal(observed[0].stage,'schema');assert.ok(!JSON.stringify(observed).includes('PRIVATE_INVALID_JSON'));
});
test('v5 observation failure cannot change validation, retry or billing behavior',async()=>{
 let calls=0;const t=createSocialTransport({key:'offline-only',rejectionObserver:{version:1,observe:()=>{throw Error('UNTRUSTED_OBSERVER_TEXT');}},fetcher:async()=>{calls++;return response(JSON.stringify({...citizenV5Wire(citizenV5Context()),issueEvidenceId:'UNKNOWN_OPTION'}));}});
 await assert.rejects(t.generate(citizenV5Context()),(e:any)=>e.code==='AI_ACTION_SCHEMA');assert.equal(calls,1);assert.equal(t.records.length,1);assert.equal(t.records[0].socialValidationRule,'SOCIAL_TARGET');
});
test('v5 asynchronous observer rejection remains observational and cannot escape',async()=>{
 let calls=0;const t=createSocialTransport({key:'offline-only',rejectionObserver:{version:1,observe:async()=>{throw Error('ASYNC_OBSERVER_FAILURE');}},fetcher:async()=>{calls++;return response(JSON.stringify({...citizenV5Wire(citizenV5Context()),text:'My commute saves twelve minutes.'}));}});
 await assert.rejects(t.generate(citizenV5Context()),(e:any)=>e.code==='AI_ACTION_SCHEMA');await new Promise(done=>setImmediate(done));assert.equal(calls,1);assert.equal(t.records[0].socialValidationRule,'SOCIAL_TEXT');
});
