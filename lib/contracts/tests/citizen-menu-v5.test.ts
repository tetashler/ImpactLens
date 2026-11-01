import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {menuSchema,encodeMenuContext,decodeMenuDecision} from '../../society/decision-menu.ts';
import {parseSocialDecision} from '../../society/hybrid.ts';
import {citizenV5Context,citizenV5Wire,addOwnedIssue} from './helpers/citizen-v5.ts';
import {buildDecisionMenu} from '../../society/decision-menu.ts';
import {COMMUTE_CONDITION} from '../../citizen-grounding/issues.ts';
import {classifyMemoryBindings} from '../../../scripts/testing/phase4e2-memory-evidence.ts';

const encoded=(c:any)=>JSON.parse(encodeMenuContext(c));
test('v5 replaces independently copied issue text/bases with a finite evidence reference',()=>{
 const c=citizenV5Context(),s:any=menuSchema(c),v=encoded(c);
 assert.ok(s.properties.issueEvidenceId,'new bounded evidence selection must be in the production schema');
 assert.equal(s.properties.issueChoiceId,undefined);assert.equal(s.properties.issueEvidence,undefined);
 assert.ok(v.issueOptions.length>0);assert.equal(v.issueChoices,undefined);
 assert.equal(v.policy,'conversation-menu-v5');assert.ok(v.proseRules.forbiddenNumericTerms.includes('minutes'));
 assert.equal(v.issueRules.minimumWords,8);assert.ok(v.issueRules.kinds.question);
});
test('v5 ordinary authored discussion keeps null issue evidence and validated fact rendering',()=>{
 const c=citizenV5Context(),v={...citizenV5Wire(c),factIds:['fact-saving']},d=decodeMenuDecision(v,c);
 assert.equal(d.issueUpdate,null);assert.match(d.text!,/6 minutes/);assert.equal(d.selection?.authoredText,v.text);
 assert.equal(d.selection?.issueEvidenceId,null);assert.deepEqual(parseSocialDecision(d,c),d);
});
test('v5 finite evidence resolves an exact eligible authored span without model quotation copying',()=>{
 const c=citizenV5Context(),option=encoded(c).issueOptions.find((x:any)=>x.kind==='question'&&x.subjectId==='schedule');
 const question='Which shift schedule will be confirmed before volunteer visits begin?';
 const text='The practical uncertainty deserves a careful response. '+question;
 const d=decodeMenuDecision({...citizenV5Wire(c),text,discussion:null,issueEvidenceId:option.id},c);
 assert.equal(d.issueUpdate?.kind,'question');assert.equal(d.issueUpdate?.grounding?.quote,question);
 assert.equal(d.issueUpdate?.grounding?.basisRef,'fact-schedule');assert.deepEqual(parseSocialDecision(d,c),d);
});
test('v5 does not offer resolution without a usable newer answer or satisfied criterion',()=>{
 const c=addOwnedIssue(citizenV5Context());c.items=c.items.slice(0,1);c.memories=c.memories.slice(0,1);
 assert.ok(!encoded(c).issueOptions.some((x:any)=>x.kind==='resolve'));
 assert.ok(encoded(c).issueOptions.some((x:any)=>x.kind==='progress'));
 assert.ok(encoded(c).issueOptions.some((x:any)=>x.kind==='withdraw'));
});
test('v5 resolution uses only supplied newer accessible answer and remains owner-reported',()=>{
 const c=addOwnedIssue(citizenV5Context()),option=encoded(c).issueOptions.find((x:any)=>x.kind==='resolve');assert.ok(option);
 const text='My condition is satisfied because the shift schedule is confirmed before visits begin.';
 const d=decodeMenuDecision({...citizenV5Wire(c),text,discussion:null,issueEvidenceId:option.id},c);
 assert.equal(d.issueUpdate?.grounding?.statusEvidence,'owner-reported-resolution');assert.ok(d.memoryIds.includes('m-peer'));
 c.issues[0].status='resolved';assert.throws(()=>decodeMenuDecision({...citizenV5Wire(c),text,discussion:null,issueEvidenceId:option.id},c));
});
test('v5 excludes null facts, unremembered answers, pending answers and private outsiders',()=>{
 const c=addOwnedIssue(citizenV5Context());c.grounding.facts[0].value=null;
 c.memories=c.memories.slice(0,1);assert.ok(!encoded(c).issueOptions.some((x:any)=>x.kind==='resolve'));
 c.memories=citizenV5Context().memories;c.items[1].text='The shift schedule is not confirmed and remains pending.';
 assert.ok(!encoded(c).issueOptions.some((x:any)=>x.kind==='resolve'));
 c.items[1].text='The shift schedule is confirmed before visits begin.';c.items[1].groupId='secret';c.communication.groups=[];
 assert.ok(!encoded(c).issueOptions.some((x:any)=>x.kind==='resolve'));
});
test('v5 never turns an unassessed preference into an issue and gives a finite safe subreason',()=>{
 const c=citizenV5Context(),option=encoded(c).issueOptions[0],marker='PRIVATE_REJECTED_SENTINEL';
 assert.throws(()=>decodeMenuDecision({...citizenV5Wire(c),text:'The schedule sounds nice. '+marker,discussion:null,issueEvidenceId:option.id},c),(e:any)=>{
  assert.equal(e.rule,'SOCIAL_TEXT');assert.equal(e.diagnostic.subreason,'subject-language-unassessed');assert.ok(!JSON.stringify(e.diagnostic).includes(marker));return true;
 });
});
test('v5 retains strict numeric and self-factual guards with distinguishable safe diagnostics',()=>{
 const c=citizenV5Context();
 for(const [text,reason]of [['My commute saves twelve minutes.','unsupported-number-or-unit'],['I work at an invented hospital.','unsupported-personal-assertion']]){
  assert.throws(()=>decodeMenuDecision({...citizenV5Wire(c),text},c),(e:any)=>e.rule==='SOCIAL_TEXT'&&e.diagnostic.subreason===reason);
 }
 assert.throws(()=>decodeMenuDecision({...citizenV5Wire(c),factIds:['other-private-fact']},c),(e:any)=>e.diagnostic.subreason==='fact-not-offered');
});
test('v5 malformed, forged, stale and contradictory selections fail instead of becoming ordinary replies',()=>{
 const c=citizenV5Context(),option=encoded(c).issueOptions[0],wire={...citizenV5Wire(c),discussion:null,issueEvidenceId:option.id};
 for(const v of [{...wire,issueEvidenceId:'invented-private-id'},{...wire,issueEvidence:{quote:'forged'}},{...wire,issueChoiceId:'tracked-1'},{...wire,discussion:{topicIds:[],argument:'support'}}])assert.throws(()=>decodeMenuDecision(v,c));
 c.id+='-changed';assert.throws(()=>decodeMenuDecision(wire,c));
});
test('v5 read and inactivity require no prose, facts or formal evidence',()=>{
 const c=citizenV5Context();for(const action of ['read','inactive']){const option=c.menu.find((x:any)=>x.action===action);assert.ok(option);const d=decodeMenuDecision({...citizenV5Wire(c),choiceId:option.id,text:null},c);assert.equal(d.action,action);assert.equal(d.issueUpdate,null);}
});
test('v5 schema headroom covers the application-rendered fact suffix',()=>{
 const c=citizenV5Context();c.grounding.facts[0].value='S'.repeat(500);const schema:any=menuSchema(c),max=schema.properties.text.maxLength;assert.ok(max<1000);
 const text='x'.repeat(max),d=decodeMenuDecision({...citizenV5Wire(c),text,factIds:['fact-schedule','fact-saving']},c);assert.ok(d.text!.length<=1000);
});
test('v4 schema and freely constructed evidence fields remain frozen alongside v5',()=>{
 const c={...citizenV5Context(),policy:'conversation-menu-v4'},s:any=menuSchema(c);
 assert.ok(s.properties.issueChoiceId);assert.ok(s.properties.issueEvidence);assert.equal(s.properties.issueEvidenceId,undefined);
});
test('v5 discloses legal subject prose and never offers an entirely forbidden vocabulary',()=>{
 const c=citizenV5Context();c.grounding.subjects[0].keywords.push('hours');const e=encoded(c);
 assert.ok(e.issueRules.subjects.find((s:any)=>s.id==='schedule').proseKeywords.includes('schedule'));
 assert.ok(!e.issueRules.subjects.find((s:any)=>s.id==='schedule').proseKeywords.includes('hours'));
 c.grounding.subjects[0].keywords=['hours'];assert.ok(!encoded(c).issueOptions.some((o:any)=>o.subjectId==='schedule'));
 assert.ok(encoded(c).issueRules.temporalMarkers.includes('whether'));
});
test('v5 non-authored-only menus expose no unusable issue evidence',()=>{
 const c=citizenV5Context();c.actions=['read','inactive'];c.menu=buildDecisionMenu(c);assert.deepEqual(encoded(c).issueOptions,[]);
});
test('v5 predicate resolution requires the same explicit owned condition and a satisfied fact',()=>{
 const c=addOwnedIssue(citizenV5Context());c.grounding.subjects[1].criterion={id:'shorter',factId:'fact-saving',operator:'gte',threshold:0.000001};
 c.items[0].text=COMMUTE_CONDITION;c.issues[0].grounding={...c.issues[0].grounding,subjectId:'commute',basisRef:'fact-saving',quote:COMMUTE_CONDITION,criterion:'shorter'};
 const option=encoded(c).issueOptions.find((o:any)=>o.kind==='resolve');assert.equal(option.criterionId,'shorter');
 const text='My condition is satisfied because the modelled commute is shorter than the baseline.';
 const d=decodeMenuDecision({...citizenV5Wire(c),text,discussion:null,issueEvidenceId:option.id},c);assert.equal(d.issueUpdate?.grounding?.statusEvidence,'deterministically-evidenced-satisfaction');
 c.grounding.facts[1].value=0;assert.ok(!encoded(c).issueOptions.some((o:any)=>o.kind==='resolve'));
});
test('v5 distinguishes an issue-required source binding from an additional voluntary recall',()=>{
 const c=addOwnedIssue(citizenV5Context()),option=encoded(c).issueOptions.find((o:any)=>o.kind==='resolve');
 const text='My condition is satisfied because the shift schedule is confirmed before visits begin.';
 const d=decodeMenuDecision({...citizenV5Wire(c),text,discussion:null,issueEvidenceId:option.id,recallIds:['memory-2']},c),e=classifyMemoryBindings(c,d);
 assert.ok(e.issueRequiredRefs.includes('memory-2'));assert.deepEqual(e.additionalRecallRefs,[]);
});
test('v5 source binding preserves supplementary Unicode differences across rebuilt menus',()=>{
 const c=addOwnedIssue(citizenV5Context());c.items[1].text+=' \u{1f600}';const first=encoded(c).issueOptions.find((o:any)=>o.kind==='resolve');
 c.items[1].text=c.items[1].text.replace('\u{1f600}','\u{1f601}');const second=encoded(c).issueOptions.find((o:any)=>o.kind==='resolve');assert.notEqual(first.id,second.id);
});
