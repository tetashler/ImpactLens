import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {assessIssueEvidence,evaluateIssueSatisfaction} from '../../citizen-grounding/issues.ts';
const subject={id:'schedule',label:'Work schedule',keywords:['schedule','shift','roster'],factRefs:['fact-schedule']};
test('v4 ordinary concern and rhetorical/ambiguous questions do not become tracked issues',()=>{
 for(const text of ['Schedules matter.','This is good, right?','Could things be better?','I prefer convenient hours.'])assert.notEqual(assessIssueEvidence('question',text,{quote:text,basisRef:'fact-schedule',criterion:null},subject).assessment,'eligible');
});
test('specific authored question and participation condition carry exact evidence',()=>{
 for(const [kind,text] of [['question','Which shift schedule will be confirmed before volunteer visits begin?'],['condition','I can participate only if the shift schedule is confirmed before visits begin.']] as const)assert.equal(assessIssueEvidence(kind,text,{quote:text,basisRef:'fact-schedule',criterion:null},subject).assessment,'eligible');
});
test('own commitments differ from aspirations and assigning another actor work',()=>{
 const yes='I will review the shift schedule before the pilot begins.';assert.equal(assessIssueEvidence('commitment',yes,{quote:yes,basisRef:'fact-schedule',criterion:null},subject).assessment,'eligible');
 for(const text of ['Someone should review the shift schedule before the pilot.','I hope to review the shift schedule before the pilot.'])assert.notEqual(assessIssueEvidence('commitment',text,{quote:text,basisRef:'fact-schedule',criterion:null},subject).assessment,'eligible');
});
test('paraphrased evidence and unrelated profile facts do not pass exact basis binding',()=>{
 const text='Which shift schedule will be confirmed before volunteer visits begin?';assert.equal(assessIssueEvidence('question',text,{quote:'A different question about schedules.',basisRef:'fact-schedule',criterion:null},subject).assessment,'ineligible');
 assert.equal(assessIssueEvidence('question',text,{quote:text,basisRef:'other-agent-private-fact',criterion:null},subject).assessment,'ineligible');
});
test('generic agreement cannot resolve an issue and explicit withdrawal is an owner statement',()=>{
 assert.notEqual(assessIssueEvidence('resolve','Thanks, I agree.',{quote:'Thanks, I agree.',basisRef:'item-2',criterion:null},subject).assessment,'eligible');
 const text='I withdraw my schedule condition because I am no longer participating.';assert.equal(assessIssueEvidence('withdraw',text,{quote:text,basisRef:'fact-schedule',criterion:null},subject).assessment,'eligible');
});
test('deterministic satisfaction requires the exact finite fact and predicate',()=>{
 const facts=[{id:'fact-saving',value:6,unit:'minutes',basis:'calculated'}];
 assert.equal(evaluateIssueSatisfaction({factId:'fact-saving',operator:'gte',threshold:5},facts),'satisfied');
 assert.equal(evaluateIssueSatisfaction({factId:'fact-saving',operator:'gte',threshold:7},facts),'not-satisfied');
 assert.equal(evaluateIssueSatisfaction({factId:'other-private',operator:'gte',threshold:0},facts),'unknown');
 assert.equal(evaluateIssueSatisfaction({factId:'fact-saving',operator:'gte',threshold:0},[{...facts[0],basis:'source-reported'}]),'unknown');
});
test('a commute saving predicate cannot close an unrelated station access question',()=>{
 const commute={id:'commute',label:'Own commute',keywords:['commute','route','station'],factRefs:['fact-saving'],criterion:{id:'criterion-commute-improves',factId:'fact-saving',operator:'gte' as const,threshold:0.000001}};
 const q='Which station route will provide accessible entry before the service opens?';
 assert.notEqual(assessIssueEvidence('question',q,{quote:q,basisRef:'fact-saving',criterion:commute.criterion.id},commute).assessment,'eligible');
 for(const q of ['I can participate only if the modelled commute improves and station access is guaranteed before volunteering.','I can participate only if the modelled commute improves no more than the previous route.'])assert.notEqual(assessIssueEvidence('condition',q,{quote:q,basisRef:'fact-saving',criterion:commute.criterion.id},commute).assessment,'eligible');
 const condition='I can participate only if the modelled commute is shorter than the baseline.';
 assert.equal(assessIssueEvidence('condition',condition,{quote:condition,basisRef:'fact-saving',criterion:commute.criterion.id},commute).assessment,'eligible');
});
