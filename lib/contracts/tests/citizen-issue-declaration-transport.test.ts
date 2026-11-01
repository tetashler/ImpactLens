import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {createSocialTransport} from '../../server/inference/social.ts';
import {citizenV5Context,citizenV5Wire,addOwnedIssue} from './helpers/citizen-v5.ts';
import {encodeMenuContext,decodeMenuDecision,menuSchema} from '../../society/decision-menu.ts';
import {parseSafeSocialDiagnosticV2} from '../../society/social-diagnostics-v2.ts';
const context=()=>({...citizenV5Context(),policy:'conversation-menu-v7'} as any);
const response=(text:string)=>Response.json({id:'synthetic-v7',model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',usage:{prompt_tokens:100,completion_tokens:30,cost:0,completion_tokens_details:{reasoning_tokens:0}},choices:[{finish_reason:'stop',message:{content:text}}]});
test('v7 actual structured provider transport selects an explicit statement and preserves prose',async()=>{
 const c=context();let calls=0;const text='Could someone explain how that would work in practice?';const transport=createSocialTransport({key:'offline-fixture',fetcher:async(_url,init)=>{
  calls++;const b=JSON.parse(String(init?.body)),e=JSON.parse(b.messages[1].content);assert.match(b.messages[0].content,/conversation-menu-v7/);assert.match(b.messages[0].content,/never as your authored evidence/);assert.deepEqual(b.provider,{only:['digitalocean'],allow_fallbacks:false,require_parameters:true});assert.deepEqual(b.reasoning,{effort:'none',exclude:true});assert.equal(b.max_tokens,600);assert.equal(e.issueRules.authoredProseIsEvidence,false);assert.equal(b.messages[1].content,encodeMenuContext(c));
  const o=e.issueOptions.find((o:any)=>o.kind==='question'&&o.subjectId==='schedule');assert.ok(o.statement);return response(JSON.stringify({...citizenV5Wire(c),text,discussion:null,issueEvidenceId:o.id}));
 }});const d=(await transport.generate(c)).value;assert.equal(calls,1);assert.equal(d.selection?.authoredText,text);assert.equal(d.issueUpdate?.grounding?.declaration?.origin,'model-selected-server-rendered');assert.equal(transport.records[0].status,'accepted');
});
for(const bad of ['unknown-selection','raw-quantity','malformed-json','forged-origin'])test('v7 bounded v2 rejection diagnostics, no raw retention or retry: '+bad,async()=>{
 const c=context(),privateMarker='PRIVATE_REJECTION_SENTINEL';let calls=0;const observed:any[]=[];
 const transport=createSocialTransport({key:'offline-fixture',rejectionObserver:{version:2,observe:(_id,d)=>{observed.push(parseSafeSocialDiagnosticV2(d));throw Error('OPTIONAL_OBSERVER_FAILURE');}},fetcher:async()=>{calls++;const wire:any={...citizenV5Wire(c),text:'Please explain the practical arrangements. '+privateMarker};if(bad==='unknown-selection'){wire.issueEvidenceId='made-up';wire.discussion=null;}if(bad==='raw-quantity')wire.text='The route saves 99 minutes. '+privateMarker;if(bad==='forged-origin')wire.issueDeclaration={origin:'model-authored'};return response(bad==='malformed-json'?'{PRIVATE_INVALID':JSON.stringify(wire));}});
 await assert.rejects(transport.generate(c));assert.equal(calls,1);assert.equal(transport.records.length,1);assert.equal(observed.length,1);assert.ok(!JSON.stringify({records:transport.records,observed}).includes(privateMarker));
});
test('v7 no eligible statements has a valid null-only schema; unknown subjects are not invented',()=>{
 const c=context();c.grounding.subjects.forEach((s:any)=>s.id='unknown-'+s.id);const e=JSON.parse(encodeMenuContext(c)),s:any=menuSchema(c);assert.deepEqual(e.issueOptions,[]);assert.deepEqual(s.properties.issueEvidenceId.enum,[null]);assert.ok(s.anyOf.every((b:any)=>b.properties.issueEvidenceId.type==='null'));assert.ok(decodeMenuDecision(citizenV5Wire(c),c));
});
test('private source permissions and memory eviction filter closure before provider dispatch',()=>{
 const c=addOwnedIssue(context());c.items[1].groupId='private';const encoded=()=>JSON.parse(encodeMenuContext(c));assert.ok(!encoded().issueOptions.some((o:any)=>o.kind==='resolve'));
 c.communication.groups=[{id:'private',name:'Private fixture',platform:'reddit',member:true,canJoin:false,canInvite:false,canShare:false}];assert.ok(encoded().issueOptions.some((o:any)=>o.kind==='resolve'));
 c.communication.groups[0].member=false;assert.ok(!encoded().issueOptions.some((o:any)=>o.kind==='resolve'));c.memories=[];assert.ok(!encoded().issueOptions.some((o:any)=>['progress','resolve','withdraw'].includes(o.kind)));
});
test('open subject projection prevents duplicate creation outside the four-issue body view',()=>{
 const c=context();c.issueSubjectStates=[{subjectId:'schedule',issueId:'older-own-issue',status:'open'}];assert.ok(!JSON.parse(encodeMenuContext(c)).issueOptions.some((o:any)=>o.subjectId==='schedule'));
 c.issueCreationAllowed=false;assert.equal(JSON.parse(encodeMenuContext(c)).issueOptions.length,0);
});
test('long facts are omitted with sufficient prose/declaration headroom and closed schema',()=>{
 const c=context();c.grounding.facts[0].value='x'.repeat(2000);const e=JSON.parse(encodeMenuContext(c)),s:any=menuSchema(c);assert.ok(!e.proseRules.allowedFactIds.includes('fact-schedule'));assert.ok(e.proseRules.textMaxLength>=96);assert.ok(!JSON.stringify(s).includes('"enum":[]'));assert.throws(()=>decodeMenuDecision({...citizenV5Wire(c),factIds:['fact-schedule']},c));
});
