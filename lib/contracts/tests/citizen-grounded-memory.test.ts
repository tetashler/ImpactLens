import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import type {SocietyWorld,SocialEvent,SocialItem} from '../../society/contract.ts';
import {groundedMemoryBonus} from '../../citizen-grounding/memory.ts';

/** Source-grounded synthetic capability fixture; it establishes no spontaneous model recollection. */
function world():SocietyWorld{
 const actorId='citizen-fixture',fingerprint='a'.repeat(64),makeItem=(id:string,tick:number):SocialItem=>({id,actorId,tick,platform:'reddit',parentId:null,community:'fixture',text:'A recorded fictional household-access concern.',position:0,media:'none',votes:0,likes:0,hidden:false,sharedFrom:null});
 const items=[makeItem('earlier',1),makeItem('query',200)];
 const events:SocialEvent[]=items.map(i=>({id:i.id,actorId,type:'post',platform:i.platform,tick:i.tick,minute:i.tick*15,targetId:null,parentId:null,text:i.text,position:0,previousPosition:null,causes:[],source:'social-model',sourceEventId:null,location:null,decisionId:'decision-'+i.id,citizenEvidence:{factLinks:[{citizenId:actorId,scenarioFingerprint:fingerprint,factId:'fact-home'}],issueSubjectId:null}}));
 const grounding={version:1,policy:'citizen-grounded-v1',populationId:'population-'+'b'.repeat(64),datasetId:'citizens-'+'c'.repeat(64),scenarioFingerprint:fingerprint,profiles:[{citizen:{id:actorId,ageGroup:'30_34',exactAge:32,sex:'female',planningAreaName:'Fictional Area',subzoneName:'Fictional Subzone',labourForceStatus:'outside-labour-force',employmentRelationship:null,nature:null,occupationCode:null,jobTitle:null,workplaceArea:null,workplaceAreaName:null,schedule:null,travelMode:'no-work-trip',fieldProvenance:{}},commute:null}],personalities:{profiles:[{citizenId:actorId,origin:'offline-mock',traits:{communicationStyle:'direct',caution:1,initiative:2,detail:3,cooperation:4,uncertaintyTolerance:0}}]}};
 return {version:1,genesis:{input:{citizenGrounding:grounding}},tick:250,items,events,agents:[{id:actorId,issues:[],issueHistory:[],memory:[],seen:[]}],groups:[]} as unknown as SocietyWorld;
}
const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v));

test('actual own cross-day fact anchors earn a bounded bonus after short-term eviction',()=>{
 const w=world();assert.equal(groundedMemoryBonus(w,'citizen-fixture','query','earlier'),1);assert.equal(w.agents[0].memory.length,0);
 assert.equal(groundedMemoryBonus(copy(w),'citizen-fixture','query','earlier'),1);
});

test('stable profile keywords, generic text and absent evidence do not improve retrieval',()=>{
 const w=world();for(const event of w.events)delete event.citizenEvidence;
 w.items.forEach(i=>{i.text='commute rail workplace shift home schedule concern';});assert.equal(groundedMemoryBonus(w,'citizen-fixture','query','earlier'),0);
 assert.equal(groundedMemoryBonus(w,'citizen-fixture','query','query'),0);
});

test('a peer reply can anchor to an actually accessible own earlier fact in the same thread',()=>{
 const w=world();w.items[1].actorId='peer';w.events[1].actorId='peer';w.items[1].parentId='earlier';w.events[1].targetId='earlier';w.events[1].citizenEvidence={factLinks:[],issueSubjectId:null};
 assert.equal(groundedMemoryBonus(w,'citizen-fixture','query','earlier'),1);
 const foreign=copy(w);foreign.items[1].parentId=null;assert.equal(groundedMemoryBonus(foreign,'citizen-fixture','query','earlier'),0);
 const forged=copy(foreign);forged.events[1].citizenEvidence={factLinks:[{citizenId:'citizen-fixture',scenarioFingerprint:'a'.repeat(64),factId:'fact-home'}],issueSubjectId:null};assert.equal(groundedMemoryBonus(forged,'citizen-fixture','query','earlier'),0);
});

test('missing, inaccessible or inconsistent peer ancestry cannot introduce a private own anchor',()=>{
 const w=world();w.items[1].actorId='peer';w.events[1].actorId='peer';w.items[1].parentId='earlier';w.events[1].citizenEvidence={factLinks:[],issueSubjectId:null};
 for(const mutate of [(x:SocietyWorld)=>{x.items[0].hidden=true;},(x:SocietyWorld)=>{x.items[0].groupId='private-outsider';},(x:SocietyWorld)=>{x.items[1].parentId='missing-parent';},(x:SocietyWorld)=>{x.items[0].actorId='other';x.events[0].actorId='other';}]){const x=copy(w);mutate(x);assert.equal(groundedMemoryBonus(x,'citizen-fixture','query','earlier'),0);}
});

for(const [name,mutate]of [
 ['wrong citizen',(w:SocietyWorld)=>{w.events[0].citizenEvidence!.factLinks[0].citizenId='other-citizen';}],
 ['wrong actor',(w:SocietyWorld)=>{w.events[0].actorId='other-citizen';w.items[0].actorId='other-citizen';}],
 ['wrong scenario',(w:SocietyWorld)=>{w.events[0].citizenEvidence!.factLinks[0].scenarioFingerprint='e'.repeat(64);}],
 ['unknown fact',(w:SocietyWorld)=>{w.events[0].citizenEvidence!.factLinks[0].factId='fact-other-secret';}],
 ['unavailable fact',(w:SocietyWorld)=>{w.events.forEach(e=>{e.citizenEvidence!.factLinks[0].factId='fact-saving';});}],
 ['rule source',(w:SocietyWorld)=>{w.events[0].source='deterministic-rule';}],
 ['hidden candidate',(w:SocietyWorld)=>{w.items[0].hidden=true;}],
 ['future candidate',(w:SocietyWorld)=>{w.items[0].tick=251;}],
 ['missing event',(w:SocietyWorld)=>{w.events.shift();}],
 ['inaccessible private source',(w:SocietyWorld)=>{w.items[0].groupId='private-other';}],
] as const)test('grounded retrieval rejects '+name,()=>{const w=world();mutate(w);assert.equal(groundedMemoryBonus(w,'citizen-fixture','query','earlier'),0);});

test('only an actual accessible owned open issue source can contribute issue continuity',()=>{
 const w=world();w.events.forEach(e=>{e.citizenEvidence!.issueSubjectId='commute';});
 const issue={id:'issue-own',kind:'question',topicId:'topic-commute',sourceEventId:'earlier',createdTick:1,status:'open',changedEventId:null,grounding:{subjectId:'commute',basisRef:'fact-home',quote:'Fictional source quote',criterion:null,statusEvidence:'open',updates:[]}} as const;
 w.agents[0].issues=[copy(issue) as any];assert.equal(groundedMemoryBonus(w,'citizen-fixture','query','earlier'),1.5);
 w.events.forEach(e=>{e.citizenEvidence!.factLinks=[];});assert.equal(groundedMemoryBonus(w,'citizen-fixture','query','earlier'),0.5);
 const resolved=copy(w);resolved.agents[0].issues![0].status='resolved';assert.equal(groundedMemoryBonus(resolved,'citizen-fixture','query','earlier'),0);
 const mismatch=copy(w);mismatch.events[1].citizenEvidence!.issueSubjectId='schedule';assert.equal(groundedMemoryBonus(mismatch,'citizen-fixture','query','earlier'),0);
 const missing=copy(w);missing.agents[0].issues![0].sourceEventId='not-recorded';assert.equal(groundedMemoryBonus(missing,'citizen-fixture','query','earlier'),0);
 const closed=copy(w);closed.agents[0].issueHistory=[copy(closed.agents[0].issues![0])];closed.agents[0].issues![0].status='resolved';assert.equal(groundedMemoryBonus(closed,'citizen-fixture','query','earlier'),0);
});

test('private leave/rejoin chronology and legacy selector absence preserve access restrictions',()=>{
 const w=world();w.items.forEach(i=>{i.groupId='private-group';});w.groups=[{id:'private-group',name:'Fixture group',entityType:'Fictional group',platform:'reddit',creatorId:'citizen-fixture',purposeId:'fixture',createdEventId:'earlier',createdTick:1,shareAllowed:false,invitations:[],members:[{agentId:'citizen-fixture',joinedSequence:0,leftSequence:1},{agentId:'citizen-fixture',joinedSequence:1,leftSequence:null}]}];
 assert.equal(groundedMemoryBonus(w,'citizen-fixture','query','earlier'),0);
 const legacy=world();delete legacy.genesis.input.citizenGrounding;assert.equal(groundedMemoryBonus(legacy,'citizen-fixture','query','earlier'),0);
 assert.equal(groundedMemoryBonus(world(),'unknown-actor','query','earlier'),0);
});
