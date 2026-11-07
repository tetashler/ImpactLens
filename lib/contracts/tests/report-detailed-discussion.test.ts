import test from 'node:test';
import assert from 'node:assert/strict';
import type {PublicDiscussionEvidence} from '../../report-summary/discussion-contract.ts';

test('writer discussion uses opaque references and a public allowlist including safe chronology',async()=>{
 const m=await import('../../server/report-detailed-discussion.ts').catch(()=>null);assert.ok(m?.sanitizeDetailedDiscussion,'discussion privacy boundary required');
 const raw={version:1,scope:'Public fixture scope.',initialStatements:1,followupStatements:1,omitted:0,statements:[{id:'RAW_EVENT_ONE',actor:'Fictional resident',nodeIds:['RAW_NODE_ONE'],phase:'initial',text:'Operating hours need review.'},{id:'RAW_EVENT_TWO',actor:'Fictional worker',nodeIds:['RAW_NODE_ONE'],phase:'followup',text:'Responding to RAW_EVENT_ONE; revisit RAW_NODE_ONE.',minute:15,replyToId:'RAW_EVENT_ONE',privateMemory:'PRIVATE_MEMORY'}],nodes:[{nodeId:'RAW_NODE_ONE',label:'Public discussion',kind:'platform',description:'A public fictional discussion.'}],privateGroup:'PRIVATE_GROUP'} as unknown as PublicDiscussionEvidence;
 const original=JSON.stringify(raw),safe=m.sanitizeDetailedDiscussion('run-one',raw),json=JSON.stringify(safe);
 assert.doesNotMatch(json,/RAW_EVENT|RAW_NODE|PRIVATE_MEMORY|PRIVATE_GROUP/);assert.equal(JSON.stringify(raw),original);assert.deepEqual(safe,m.sanitizeDetailedDiscussion('run-one',raw));assert.notDeepEqual(safe,m.sanitizeDetailedDiscussion('run-two',raw));
 assert.equal(safe.statements[1].replyToId,safe.statements[0].id);assert.equal(safe.statements[1].minute,15);assert.equal(safe.statements[0].nodeIds[0],safe.nodes[0].nodeId);assert.match(safe.statements[1].text,/public-ref-/);
 const draft={sections:{assessment:'The RAW_EVENT_ONE statement matters.'},findings:[]};assert.throws(()=>m.assertNoRawDiscussionIdentifiers(draft,raw),/REPORT_PRIVATE_REFERENCE/);
 m.assertNoRawDiscussionIdentifiers({sections:{assessment:safe.statements[1].text},findings:[]},raw);
});

test('identifier redaction handles sentence punctuation and literal regular-expression characters',async()=>{
 const {sanitizeDetailedDiscussion,assertNoRawDiscussionIdentifiers}=await import('../../server/report-detailed-discussion.ts');
 const raw:PublicDiscussionEvidence={version:1,scope:'Public.',initialStatements:1,followupStatements:0,omitted:0,statements:[{id:'event.a[1]',actor:'Fictional participant',nodeIds:['node:one'],phase:'initial',text:'Review event.a[1]. and node:one: before proceeding.'}],nodes:[]};
 const safe=sanitizeDetailedDiscussion('punctuation',raw);assert.doesNotMatch(safe.statements[0].text,/event\.a\[1\]|node:one/);
 assertNoRawDiscussionIdentifiers(safe,raw);
 assert.throws(()=>assertNoRawDiscussionIdentifiers({limitation:'Review event.a[1].'},raw),/REPORT_PRIVATE_REFERENCE/);
 assertNoRawDiscussionIdentifiers({text:'eventXa1 is unrelated.'},raw);
});
