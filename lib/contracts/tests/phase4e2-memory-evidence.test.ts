import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {DecisionContext,SocialDecision} from '../../society/decision-contract.ts';

const sourceText='The pilot requires a monthly pay floor of 2900 dollars before launch approval.';
function context():DecisionContext {
 return {version:1,policy:'conversation-menu-v2',id:'fixture-decision',runId:'fixture-run',tick:256,
  actor:{id:'reader',label:'Fictional reader',goal:'Assess the pilot.',position:0,resistance:0.5,priorities:[],demographic:null},platform:'reddit',question:'What remains necessary?',connections:[],actions:['post','reply','inactive'],assumptions:[],
  calendar:{version:1,policy:'multi-day-swarm-v1',profileId:'fixture',pacingTarget:350,day:4,hour:0,minute:0,timeZone:'Asia/Singapore',label:'Day 4 00:00',elapsedMinutes:3840,availability:{available:true,restStartMinute:0,restMinutes:0,localMinute:0},assumption:'Fictional clock.'},
  items:[{id:'old-source',actorId:'author-b',platform:'reddit',parentId:null,text:sourceText,media:'Text discussion',tick:0,counterpartyRole:'Fictional service coordinator'},
   {id:'current-question',actorId:'author-c',platform:'reddit',parentId:null,text:'Which condition still applies?',media:'Text discussion',tick:256}],
  memories:[{eventId:'old-read',primaryItemId:'old-source',itemIds:['old-source'],platform:'reddit',kind:'exposure',text:'',origin:'episodic',tick:128},
   {eventId:'current-read',primaryItemId:'current-question',itemIds:['current-question'],platform:'reddit',kind:'exposure',text:'',origin:'short-term',tick:256}],
  menu:[{id:'write',action:'post',platform:'reddit',targetKind:'none',targetIndex:null,groupIndex:null,memberIndices:[],memoryIndices:[],purposeIndex:null},
   {id:'answer',action:'comment',platform:'reddit',targetKind:'item',targetIndex:1,groupIndex:null,memberIndices:[],memoryIndices:[1],purposeIndex:null}],
  issues:[{id:'old-issue',kind:'condition',topicId:'topic-1',sourceEventId:'old-source',createdTick:0,status:'open',changedEventId:null}]};
}
function decision(text='Author author-b reported on Day 1 that the pilot requires a monthly pay floor of 2900 dollars before launch approval.'):SocialDecision {
 return {action:'post',platform:'reddit',targetId:null,text,memoryIds:['old-read'],stance:null,motivation:'Address the current question.',issueUpdate:null,selection:{choiceId:'write',stanceId:'keep',recallIds:['memory-1']}};
}
async function presentation(){assert.ok(existsSync(resolve('lib/society/memory-presentation.ts')),'memory source-time presentation must be implemented');return import('../../society/memory-presentation.ts');}
async function evaluator(){assert.ok(existsSync(resolve('scripts/testing/phase4e2-memory-evidence.ts')),'source-grounded evaluator must be implemented');return import('../../../scripts/testing/phase4e2-memory-evidence.ts');}

test('wire memory evidence distinguishes authored time, encounter time and source author from the current counterparty',async()=>{
 const {encodeMemoryEvidence}=await presentation(),c=context(),before=JSON.stringify(c),value=encodeMemoryEvidence(c);
 assert.equal(value.policy,'memory-source-time-v1');assert.equal(value.sourceReportedNotVerified,true);
 assert.equal(value.entries.length,2);const old=value.entries[0];
 assert.equal(old.memoryRef,'memory-1');assert.equal(old.primaryItemRef,'item-1');assert.equal(old.authorId,'author-b');
 assert.equal(old.authorRole,'Fictional service coordinator');assert.notEqual(old.authorId,c.items[1].actorId);
 assert.equal(old.authored?.label,'Day 1 08:00');assert.equal(old.authored?.ageMinutes,3840);
 assert.equal(old.encountered?.label,'Day 2 16:00');assert.equal(old.encountered?.ageMinutes,1920);
 assert.equal(old.origin,'episodic');assert.equal(value.entries[1].origin,'short-term');
 assert.match(value.omittedSourceWarning,/omitted/i);assert.match(value.omittedSourceWarning,/not known/i);
 assert.ok(!JSON.stringify(value).includes(sourceText));assert.equal(JSON.stringify(c),before);
});

test('presentation supplies no dangling, inaccessible private, out-of-bound or invented time evidence',async()=>{
 const {encodeMemoryEvidence}=await presentation(),c=context();
 c.memories.push({...c.memories[0],eventId:'dangling',primaryItemId:'missing'});
 c.items[0].groupId='private-group';assert.equal(encodeMemoryEvidence(c).entries.some(e=>e.authorId==='author-b'),false);
 c.communication={channels:[],groups:[{id:'private-group',name:'Fictional group',platform:'reddit',member:true,canJoin:false,canInvite:false,canShare:false}],purposes:[],topics:[]};
 assert.equal(encodeMemoryEvidence(c).entries.length,2);
 c.memories[0].itemIds=[];assert.equal(encodeMemoryEvidence(c).entries.length,1);
 const legacy=context();delete legacy.calendar;assert.equal(encodeMemoryEvidence(legacy).entries[0].authored,null);
 const future=context();future.memories[0].tick=300;assert.equal(encodeMemoryEvidence(future).entries[0].encountered,null);
 const zero=context();zero.tick=0;zero.calendar={...zero.calendar!,day:1,hour:8,elapsedMinutes:0,label:'Day 1 08:00'};zero.memories[0].tick=0;
 assert.equal(encodeMemoryEvidence(zero).entries[0].authored?.label,'Day 1 08:00');
 for(let n=0;n<12;n++){legacy.items.push({...legacy.items[0],id:'extra-'+n});legacy.memories.push({...legacy.memories[0],eventId:'read-'+n,primaryItemId:'extra-'+n,itemIds:['extra-'+n]});}
 const bounded=encodeMemoryEvidence(legacy);assert.ok(bounded.entries.length<=6);assert.ok(bounded.entries.every(e=>Number(e.primaryItemRef.slice(5))<=8));
});

test('recall accounting separates target, stance and issue bindings from additional explicit recall',async()=>{
 const {classifyMemoryBindings}=await evaluator(),c=context(),d=decision();
 d.selection!.choiceId='answer';d.stance={target:0.2,exposureId:'old-read'};
 const stance=classifyMemoryBindings(c,d);
 assert.deepEqual(stance.rawRecallRefs,['memory-1']);assert.deepEqual(stance.targetRequiredRefs,['memory-2']);
 assert.deepEqual(stance.stanceRequiredRefs,['memory-1']);assert.deepEqual(stance.additionalRecallRefs,[]);
 d.stance=null;d.issueUpdate={kind:'resolve',topicId:'topic-1',issueId:'old-issue'};
 const issue=classifyMemoryBindings(c,d);assert.deepEqual(issue.issueRequiredRefs,['memory-1']);assert.deepEqual(issue.additionalRecallRefs,[]);
 d.selection!.recallIds=[];d.memoryIds=['old-read'];
 assert.deepEqual(classifyMemoryBindings(c,d).issueRequiredRefs,['memory-1'],'automatic issue source binding is required even without a target or recall selection');
 d.selection!.recallIds=['memory-1'];
 d.issueUpdate=null;assert.deepEqual(classifyMemoryBindings(c,d).additionalRecallRefs,['memory-1']);
 d.selection!.recallIds=['invented-memory'];assert.deepEqual(classifyMemoryBindings(c,d).invalidRecallRefs,['invented-memory']);
 assert.deepEqual(classifyMemoryBindings(c,null).additionalRecallRefs,[]);
});

test('source-grounded evaluation requires an accurate distinctive relationship, polarity, author and temporal condition',async()=>{
 const {evaluateMemoryEvidence}=await evaluator(),c=context(),source={itemId:'old-source',eventId:'old-read',authorId:'author-b',tick:0,text:sourceText,relevance:'relevant' as const};
 const evaluate=(text:string)=>evaluateMemoryEvidence(c,decision(text),[source],['old-read','current-read']);
 const positive=evaluate(decision().text!);assert.equal(positive.contentAssessment,'SOURCE_GROUNDED_REFERENCE');
 assert.equal(positive.causalInfluence,'NOT_VERIFIED');assert.equal(positive.sources[0].retained,true);assert.equal(positive.sources[0].retrieved,true);
 assert.equal(positive.sources[0].primaryContentIncluded,true);assert.equal(positive.sources[0].explicitRecall,true);assert.equal(positive.sources[0].additionalRecall,true);
 const unselected=decision();unselected.selection!.recallIds=[];unselected.memoryIds=[];
 const accurateUnselected=evaluateMemoryEvidence(c,unselected,[source]);assert.equal(accurateUnselected.contentAssessment,'SOURCE_GROUNDED_REFERENCE');assert.equal(accurateUnselected.sources[0].explicitRecall,false);assert.equal(accurateUnselected.causalInfluence,'NOT_VERIFIED');
 for(const text of [
  'Author author-b reported on Day 1 that the pilot does not require a monthly pay floor of 2900 dollars before launch approval.',
  'Author author-b reported on Day 1 that the exhibition requires a ticket budget of 2900 dollars before launch approval.',
  'Author author-b reported on Day 1 that the pilot requires a monthly pay floor of 2900 dollars and unlimited reimbursement before launch approval.',
  'Author author-c reported on Day 1 that the pilot requires a monthly pay floor of 2900 dollars before launch approval.',
  'Author author-b reported on Day 2 that the pilot requires a monthly pay floor of 2900 dollars before launch approval.',
  'Author author-b reported on Day 1 that the pilot requires a monthly pay floor of 2900 dollars after launch approval.',
 ])assert.equal(evaluate(text).contentAssessment,'UNSUPPORTED_REFERENCE');
 assert.equal(evaluate('Earlier we discussed pay, 2900 and approval.').contentAssessment,'UNASSESSED');
 assert.equal(evaluate('The recorded compensation safeguard must be confirmed first.').contentAssessment,'UNASSESSED');
 assert.notEqual(evaluate(decision().text!+' It also guarantees free transport.').contentAssessment,'SOURCE_GROUNDED_REFERENCE');
 assert.equal(evaluateMemoryEvidence(c,decision(),[{...source,relevance:'irrelevant'}],['old-read']).contentAssessment,'IRRELEVANT_SOURCE_REFERENCE');
 const unused=decision('I will consider the current question.');unused.selection!.recallIds=[];unused.memoryIds=[];
 const retained=evaluateMemoryEvidence(c,unused,[source],['old-read']);assert.equal(retained.sources[0].retained,true);assert.equal(retained.sources[0].explicitRecall,false);assert.equal(retained.contentAssessment,'UNASSESSED');
});

test('supplied reference IDs alone cannot establish primary content, source truth or memory causation',async()=>{
 const {evaluateMemoryEvidence}=await evaluator(),c=context(),source={itemId:'old-source',eventId:'old-read',authorId:'author-b',tick:0,text:sourceText,relevance:'relevant' as const};
 c.items=c.items.filter(i=>i.id!=='old-source');const absent=evaluateMemoryEvidence(c,decision(),[source],['old-read']);
 assert.equal(absent.sources[0].retrieved,true);assert.equal(absent.sources[0].primaryContentIncluded,false);assert.equal(absent.contentAssessment,'UNSUPPORTED_REFERENCE');
 assert.equal(absent.causalInfluence,'NOT_VERIFIED');
 c.items.unshift({...context().items[0],text:'Different source content.'});
 assert.equal(evaluateMemoryEvidence(c,decision(),[source]).contentAssessment,'UNSUPPORTED_REFERENCE');
 const safe=JSON.stringify(evaluateMemoryEvidence(context(),decision(),[source]));assert.ok(!safe.includes(sourceText));assert.ok(!safe.includes(decision().text!));
});

test('reusable live audit reports additional recall beyond target, stance and issue bindings',()=>{
 const source=readFileSync(resolve('scripts/testing/phase4e2-live-audit.ts'),'utf8');
 assert.ok(source.includes('classifyMemoryBindings'),'live audit must use shared binding classification');
 assert.ok(source.includes('stanceRequiredMemoryBindings'),'live audit must distinguish stance-required bindings');
 assert.ok(source.includes('issueRequiredMemoryBindings'),'live audit must distinguish issue-required bindings');
});
