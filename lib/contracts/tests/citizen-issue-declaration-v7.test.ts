import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeMenuDecision,encodeMenuContext,menuSchema} from '../../society/decision-menu.ts';
import {parseSocialDecision} from '../../society/hybrid.ts';
import {citizenV5Context,citizenV5Wire,addOwnedIssue} from './helpers/citizen-v5.ts';
const context=()=>({...citizenV5Context(),policy:'conversation-menu-v7',proseReferences:{source:'validated-hybrid-binding',stationCodes:['NS4','NE16']}} as any);
const encoded=(c:any)=>JSON.parse(encodeMenuContext(c));
const option=(c:any,kind:string,subject='schedule')=>encoded(c).issueOptions.find((o:any)=>o.kind===kind&&o.subjectId===subject);
const wire=(c:any,text:any)=>({...citizenV5Wire(c),text});
const decode=(c:any,w:any)=>parseSocialDecision(decodeMenuDecision(w,c),c);
// All wording below is synthetic. No rejected live response bodies were retained.
const concerns=[['question','How would that fit around changing trains?'],['question','Please explain the practical arrangements.'],['condition','That would determine whether I could participate.'],['disagreement','I see it differently; the practical details remain unclear.'],['commitment','I can review this before deciding what to do.']];
for(const [kind,text] of concerns)test('v7 explicit declaration keeps independent natural prose: '+kind+' '+text,()=>{
 const c=context(),o=option(c,kind);assert.ok(o?.statement);const d=decode(c,{...wire(c,text),discussion:null,issueEvidenceId:o.id});
 assert.equal(d.selection?.authoredText,text);assert.equal(d.issueUpdate?.kind,kind);
 const g=d.issueUpdate!.grounding! as any;assert.equal(g.quote,o.statement);assert.equal(g.declaration.origin,'model-selected-server-rendered');assert.equal(g.declaration.policy,'issue-declaration-v1');assert.equal(g.declaration.optionId,o.id);
 assert.ok(!text.includes(g.quote));assert.ok(d.text!.includes('[Agent-selected issue declaration: '+o.statement+']'));assert.deepEqual((d.selection as any).issueDeclaration,g.declaration);
});
test('v6 original sentence/subject contracts stay frozen and reproduce synthetic weaknesses',()=>{
 const c={...context(),policy:'conversation-menu-v6'};for(const [kind,text] of concerns.slice(0,4)){const o=option(c,kind);assert.ok(o);assert.throws(()=>decode(c,{...wire(c,text),discussion:null,issueEvidenceId:o.id}));}
});
test('ordinary prose never creates a formal issue, including unrelated commentary',()=>{
 const c=context();for(const text of ['The shift schedule needs clarification.','The gardens are pleasant.','I am worried about transfers after work.'])assert.equal(decode(c,wire(c,text)).issueUpdate,null);
 for(const action of ['read','inactive']){const choice=c.menu.find((o:any)=>o.action===action);assert.ok(choice);const w={...wire(c,null),choiceId:choice.id};assert.equal(decode(c,w).issueUpdate,null);assert.throws(()=>decode(c,{...w,issueEvidenceId:option(c,'question').id,discussion:null}));}
});
test('declaration, context and wire schema disclose honest bounded provenance',()=>{
 const c=context(),e=encoded(c),s:any=menuSchema(c);assert.equal(e.policy,'conversation-menu-v7');assert.equal(e.issueRules.policy,'issue-declaration-v1');assert.equal(e.issueRules.authoredProseIsEvidence,false);assert.ok(e.issueOptions.length>0&&e.issueOptions.length<=24);assert.ok(e.issueOptions.every((o:any)=>o.statement.length<=240&&o.statementOrigin==='model-selected-server-rendered'));
 assert.ok(s.properties.issueEvidenceId.enum.includes(option(c,'question').id));assert.equal(s.additionalProperties,false);assert.ok(Buffer.byteLength(encodeMenuContext(c))<=24000);
});
test('unknown, cross-context, cross-actor, extra-field and malformed selections fail without downgrade',()=>{
 const c=context(),o=option(c,'question'),w={...wire(c,'Please explain the practical arrangements.'),discussion:null,issueEvidenceId:o.id};
 for(const patch of [{issueEvidenceId:'invented'},{issueEvidenceId:[]},{statement:o.statement},{issueDeclaration:{origin:'model-authored'}},{discussion:{topicIds:[],argument:'unspecified'}},{text:null}])assert.throws(()=>decode(c,{...w,...patch}));
 for(const patch of [{id:'another-context'},{actor:{...c.actor,id:'other'}},{grounding:{...c.grounding,citizenId:'other'}}])assert.throws(()=>decode({...c,...patch},w));
});
test('accepted records cannot forge declaration statement, origin or rendered text',()=>{
 const c=context(),o=option(c,'question'),d=decode(c,{...wire(c,'Please explain the practical arrangements.'),discussion:null,issueEvidenceId:o.id});
 for(const mutate of [(x:any)=>x.issueUpdate.grounding.quote='Made up evidence.',(x:any)=>x.issueUpdate.grounding.declaration.origin='model-authored',(x:any)=>x.selection.issueDeclaration.optionId='invented',(x:any)=>x.text=x.text.replace(o.statement,'Made up evidence.')]){const bad=structuredClone(d);mutate(bad);assert.throws(()=>parseSocialDecision(bad,c));}
});
test('raw factual prose restrictions and exact trusted rendering remain intact',()=>{
 const c=context();for(const text of ['My commute will be 15 minutes shorter.','I work at a hospital in Novena.','My workplace is Novena.','All residents save twenty minutes.','[Agent-selected issue declaration: Invented.]'])assert.throws(()=>decode(c,wire(c,text)));
 const d=decode(c,{...wire(c,'The supplied commute comparison deserves consideration.'),factIds:['fact-saving']});assert.match(d.text!,/Modelled commute saving: 6 minutes/);assert.throws(()=>decode(c,{...wire(c,'The supplied comparison deserves consideration.'),factIds:['foreign-fact']}));
});
test('owned update, owner report and withdrawal preserve distinct status and source bindings',()=>{
 const c=addOwnedIssue(context());for(const [kind,status] of [['progress','updated'],['resolve','owner-reported-resolution'],['withdraw','owner-withdrawal']]){const o=option(c,kind);assert.ok(o);const d=decode(c,{...wire(c,'I have considered the supplied information.'),discussion:null,issueEvidenceId:o.id});assert.equal(d.issueUpdate?.grounding?.statusEvidence,status);assert.ok(d.memoryIds.includes('m-own'));}
 const old=option(c,'resolve');for(const mutate of [(x:any)=>x.issues[0].status='resolved',(x:any)=>x.items[0].actorId='other',(x:any)=>x.items[1].groupId='hidden',(x:any)=>x.memories=[]]){const bad=structuredClone(c);mutate(bad);assert.throws(()=>decode(bad,{...wire(bad,'I have considered the supplied information.'),discussion:null,issueEvidenceId:old.id}));}
});
test('an unsatisfied or unknown calculated criterion cannot fall back to owner-reported resolution',()=>{
 for(const value of [0,null]){const c=addOwnedIssue(context());c.issues[0].grounding.subjectId='commute';c.issues[0].grounding.criterion='shorter';c.grounding.subjects[1].criterion={id:'shorter',factId:'fact-saving',operator:'gte',threshold:1};c.grounding.facts[1].value=value;c.items[1].text='The commute comparison is confirmed before visits begin.';assert.equal(option(c,'resolve','commute'),undefined);}
 const c=addOwnedIssue(context());c.issues[0].grounding.subjectId='commute';c.issues[0].grounding.criterion='shorter';c.grounding.subjects[1].criterion={id:'shorter',factId:'fact-saving',operator:'gte',threshold:1};const o=option(c,'resolve','commute');assert.ok(o);assert.equal(decode(c,{...wire(c,'I have considered the supplied comparison.'),discussion:null,issueEvidenceId:o.id}).issueUpdate?.grounding?.statusEvidence,'deterministically-evidenced-satisfaction');
});
test('server-rendered declarations alone cannot masquerade as newer answer evidence',()=>{
 const c=addOwnedIssue(context());c.items[1].text='[Agent-selected issue declaration: I will review the shift schedule before deciding whether to support this proposal.]';assert.equal(option(c,'resolve'),undefined);
});
test('shared or rule-clipped declaration fragments cannot masquerade as newer answers',()=>{
 const base=context(),o=option(base,'commitment'),d=decode(base,{...wire(base,'I have considered the practical arrangements carefully and intend to keep discussing this proposal.'),discussion:null,issueEvidenceId:o.id});
 for(const length of [120,140,180]){const c=addOwnedIssue(context());c.items[1].text='Sharing an encountered perspective: '+d.text!.slice(0,length);assert.equal(option(c,'resolve'),undefined);}
 const c=addOwnedIssue(context());c.items[1].text='[Agent-selected issue declaration: The working schedule is confirmed\n';assert.equal(option(c,'resolve'),undefined);
});
test('render budget leaves room for declaration and fact suffixes without altering authored text',()=>{
 const c=context(),e=encoded(c),o=option(c,'question');const text='a'.repeat(e.proseRules.textMaxLength),d=decode(c,{...wire(c,text),discussion:null,issueEvidenceId:o.id,factIds:e.proseRules.allowedFactIds.slice(0,e.proseRules.maxFactReferences)});assert.equal(d.selection?.authoredText,text);assert.ok(d.text!.length<=1000);assert.throws(()=>decode(c,{...wire(c,text+'a'),discussion:null,issueEvidenceId:o.id}));
});
