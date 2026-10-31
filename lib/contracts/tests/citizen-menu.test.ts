import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDecisionMenu,encodeMenuContext,decodeMenuDecision,menuSchema} from '../../society/decision-menu.ts';
import {buildCitizenIssueMenu} from '../../citizen-grounding/issue-choices.ts';
const context=()=>{
 const c:any={version:1,policy:'conversation-menu-v4',id:'decision-citizen',runId:'citizen-test',tick:20,actor:{id:'owner',label:'Fictional resident',goal:'Examine access',position:0,resistance:0.5,priorities:[],demographic:null},platform:'reddit',question:'A hypothetical MRT line',connections:[],items:[{id:'own',actorId:'owner',platform:'reddit',parentId:null,text:'I can participate only if the shift schedule is confirmed before visits begin.',media:'none',tick:2},{id:'peer',actorId:'peer',platform:'reddit',parentId:null,text:'The shift schedule is confirmed before visits begin.',media:'none',tick:19}],memories:[{eventId:'m-own',primaryItemId:'own',itemIds:['own'],kind:'authored',platform:'reddit',text:''},{eventId:'m-peer',primaryItemId:'peer',itemIds:['peer'],kind:'exposure',platform:'reddit',text:''}],actions:['post','comment','read','inactive'],assumptions:[],issues:[],issueCreationAllowed:true,communication:{channels:[{id:'reddit',style:'public-discussion'}],groups:[],purposes:['t'],topics:[{id:'t',label:'Shift schedule and commute'}]},grounding:{version:1,policy:'citizen-grounded-v1',citizenId:'owner',datasetId:'citizens-test',facts:[{id:'fact-schedule',label:'Fictional schedule',value:'on-site weekdays',unit:null,basis:'synthetic-assumption',sourceIds:[]},{id:'fact-saving',label:'Modelled commute saving',value:6,unit:'minutes',basis:'calculated',sourceIds:[]}],subjects:[{id:'schedule',label:'Shift schedule',keywords:['schedule','shift','roster'],factRefs:['fact-schedule']},{id:'commute',label:'Commute',keywords:['commute','route','journey'],factRefs:['fact-saving']}],limitations:[]}};
 c.recentDecisions=[];c.memories=c.memories.map((m:any)=>({...m,origin:'short-term',tick:m.kind==='authored'?2:19,importance:4}));c.menu=buildDecisionMenu(c);return c;
};
const wire=(c:any)=>({choiceId:c.menu.find((m:any)=>m.action==='post').id,text:'I will review the commute route before the pilot begins.',motivation:'Consider the supplied fictional circumstance.',recallIds:[],stanceId:'keep',discussion:{topicIds:[],argument:'unspecified'},issueChoiceId:null,issueEvidence:null,factIds:[]});
test('v4 finite subjects replace topic-wide issue creation and ordinary discussion remains valid',()=>{
 const c=context(),encoded=JSON.parse(encodeMenuContext(c));assert.equal(encoded.policy,'conversation-menu-v4');assert.equal(encoded.grounding.citizenId,'owner');assert.ok(encoded.issueChoices.every((x:any)=>['schedule','commute'].includes(x.subjectId)));assert.equal(decodeMenuDecision(wire(c),c).issueUpdate,null);
});
test('v4 valid issue needs exact concrete authored evidence and unavailable basis is rejected',()=>{
 const c=context(),choice=buildCitizenIssueMenu(c).find(x=>x.update.kind==='question'&&x.subjectId==='schedule')!,text='Which shift schedule will be confirmed before volunteer visits begin?';
 const v={...wire(c),text,discussion:null,issueChoiceId:choice.id,issueEvidence:{quote:text,basisRef:'fact-schedule',criterion:null}};
 assert.equal(decodeMenuDecision(v,c).issueUpdate?.grounding?.subjectId,'schedule');
 assert.throws(()=>decodeMenuDecision({...v,issueEvidence:{...v.issueEvidence,basisRef:'private-other'}},c));
 assert.throws(()=>decodeMenuDecision({...v,text:'Schedules matter.',issueEvidence:{...v.issueEvidence,quote:'Schedules matter.'}},c));
});
test('v4 duplicate subjects are revisited through progress instead of repeated creation',()=>{
 const c=context();c.issues=[{id:'issue:own',kind:'condition',topicId:'t',sourceEventId:'own',createdTick:2,status:'open',changedEventId:null,grounding:{subjectId:'schedule',basisRef:'fact-schedule',quote:c.items[0].text,criterion:null,statusEvidence:'open',updates:[]}}];
 const choices=buildCitizenIssueMenu(c);assert.ok(choices.some(x=>x.update.kind==='progress'));assert.ok(!choices.some(x=>x.subjectId==='schedule'&&x.update.issueId===null));
 const progress=choices.find(x=>x.update.kind==='progress')!,text='My shift schedule condition is still pending before volunteer visits begin.';
 assert.equal(decodeMenuDecision({...wire(c),text,discussion:null,issueChoiceId:progress.id,issueEvidence:{quote:text,basisRef:'fact-schedule',criterion:null}},c).issueUpdate?.kind,'progress');
});
test('v4 closure requires own original source and newer evidence; agreement never closes',()=>{
 const c=context();c.issues=[{id:'issue:own',kind:'condition',topicId:'t',sourceEventId:'own',createdTick:2,status:'open',changedEventId:null,grounding:{subjectId:'schedule',basisRef:'fact-schedule',quote:c.items[0].text,criterion:null,statusEvidence:'open',updates:[]}}];
 const choice=buildCitizenIssueMenu(c).find(x=>x.update.kind==='resolve')!,text='My condition is satisfied because the shift schedule is confirmed before visits begin.';
 const d=decodeMenuDecision({...wire(c),text,discussion:null,issueChoiceId:choice.id,issueEvidence:{quote:text,basisRef:'item-2',criterion:null}},c);assert.equal(d.issueUpdate?.grounding?.statusEvidence,'owner-reported-resolution');
 assert.throws(()=>decodeMenuDecision({...wire(c),text:'Thanks, I agree.',discussion:null,issueChoiceId:choice.id,issueEvidence:{quote:'Thanks, I agree.',basisRef:'item-2',criterion:null}},c));
 c.items[0].actorId='other';assert.ok(!buildCitizenIssueMenu(c).some(x=>x.update.kind==='resolve'));
});
test('v4 quantitative claims are application rendered from allowed own facts',()=>{
 const c=context(),v={...wire(c),factIds:['fact-saving']},d=decodeMenuDecision(v,c);assert.match(d.text!,/6 minutes/);assert.equal(d.selection?.authoredText,v.text);assert.deepEqual(d.selection?.factIds,['fact-saving']);
 assert.throws(()=>decodeMenuDecision({...v,factIds:['other-private-fact']},c));
 assert.throws(()=>decodeMenuDecision({...v,text:'My commute saves 99 minutes.'},c));
 assert.throws(()=>decodeMenuDecision({...v,text:'My commute saves twenty minutes.'},c));
 assert.throws(()=>decodeMenuDecision({...v,text:'My commute saves twelve mins.'},c));
 assert.throws(()=>decodeMenuDecision({...v,text:'My employer is Example Hospital.'},c));
 assert.throws(()=>decodeMenuDecision({...v,text:'The route saves a dozen min.'},c));
});
test('v4 schema requires new evidence fields without changing v3 schema',()=>{
 const c=context(),schema:any=menuSchema(c);assert.ok(schema.required.includes('factIds'));assert.ok(schema.required.includes('issueEvidence'));
 const old:any=menuSchema({...c,policy:'conversation-menu-v3'});assert.equal(old.properties.factIds,undefined);assert.equal(old.properties.issueEvidence,undefined);
});
