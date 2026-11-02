import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSociety} from '../../society/engine.ts';
import type {SocialEvent,SocialItem,SocietyWorld,Platform} from '../../society/contract.ts';
import {populationView,buildPopulation} from '../../server/population/store.ts';
import type {PublicExplore} from '../../society/public-contract.ts';
import type {KnowledgeNode} from '../../knowledge-graph/contract.ts';
import {extractGraphChannelDiscussions} from '../../server/graph-channel-discussions.ts';

function fixture(){
  const world=structuredClone(createSociety({runId:'channel-test',question:'Can people reach the proposed clinic?',seed:'channel-test',population:populationView(buildPopulation({size:10000,seed:'channel-test'})),roles:[],jurisdictions:[],acceptedActions:[],config:{agents:4,steps:4},communication:{version:1,channels:[{id:'reddit',name:'Reddit',entityId:'reddit-entity',entityType:'Forum',style:'public-discussion',adapter:'discussion',limitation:'Fictional'},{id:'whatsapp',name:'WhatsApp',entityId:'whatsapp-entity',entityType:'Messaging',style:'private-group',adapter:'private-group',limitation:'Fictional'}],topics:[]}}));
  world.events=[];world.items=[];
  world.groups=['PRIVATE_GROUP_A','PRIVATE_GROUP_B'].map(id=>({id,name:'PRIVATE_GROUP_NAME',entityType:'Group',platform:'whatsapp',creatorId:world.agents[0].id,purposeId:'topic',createdEventId:'PRIVATE_CREATION',createdTick:0,shareAllowed:false,invitations:['PRIVATE_INVITATION'],members:[{agentId:'PRIVATE_MEMBER_ID',joinedSequence:0,leftSequence:null}]}));
  Object.assign(world.agents[0],{label:'PRIVATE_PERSON_NAME',handle:'PRIVATE_HANDLE',resident:{name:'PRIVATE_PROFILE'},memory:[{text:'PRIVATE_MEMORY'}]});
  const node=(id:string,label:string,properties:KnowledgeNode['properties']):KnowledgeNode=>({id,label,category:'planning',description:'Scenario environment.',provenance:{kind:'synthetic-exploratory',reference:'Scenario'},properties,limitations:[]});
  const run:PublicExplore={version:3,kind:'summary-execution',attemptId:'attempt',requestIdentity:'request',runId:'channel-test',planId:null,question:'Can people reach the proposed clinic?',status:'completed',request:null,graph:{version:1,scenarioIdentity:'scenario',nodes:[node('reddit-node','Reddit',{platformId:'reddit'}),node('whatsapp-node','WhatsApp',{platformId:'whatsapp'}),node('PRIVATE_GROUP_A','Fictional chat A',{recordType:'fictional-messaging-group',platform:'whatsapp'}),node('PRIVATE_GROUP_B','Fictional chat B',{recordType:'fictional-messaging-group',platform:'whatsapp'}),node('person-node','A participant',{recordType:'fictional-agent',agentId:world.agents[0].id})],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:null,actionCalls:null,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:{id:'session',token:'PRIVATE_TOKEN',revision:1},society:null};
  return {run,world};
}
function add(world:SocietyWorld,id:string,text:string,changes:Partial<SocialEvent>={},itemChanges:Partial<SocialItem>={}){
  const event:SocialEvent={id,actorId:world.agents[0].id,type:'message',platform:'whatsapp',groupId:'PRIVATE_GROUP_A',tick:world.events.length,minute:world.events.length*15,targetId:null,parentId:null,text,position:null,previousPosition:null,causes:[],source:'social-model',sourceEventId:null,location:null,motivation:'PRIVATE_MOTIVATION',memoryIds:['PRIVATE_MEMORY_ID'],citizenEvidence:{factLinks:[{citizenId:'PRIVATE_CITIZEN',scenarioFingerprint:'PRIVATE_SCENARIO',factId:'PRIVATE_FACT'}],issueSubjectId:'PRIVATE_SUBJECT'},...changes};
  const item:SocialItem={id,actorId:event.actorId,platform:event.platform as Platform,groupId:event.groupId,parentId:event.parentId,community:'fictional',text,position:0,tick:event.tick,media:'none',votes:0,likes:0,hidden:false,sharedFrom:null,...itemChanges};
  world.events.push(event);world.items.push(item);
}
const extractor=()=>extractGraphChannelDiscussions;

test('private group and overall channel retain an anonymous question, answer, concern and followup with real reply links',()=>{
  const {run,world}=fixture();
  add(world,'PRIVATE_EVENT_Q','Will appointments extend into the evening?',{source:'accepted-model-action'});
  add(world,'PRIVATE_EVENT_A','Evening hours would help shift workers.',{actorId:world.agents[1].id,type:'group-reply',parentId:'PRIVATE_EVENT_Q'});
  add(world,'PRIVATE_EVENT_C','That still leaves the uncovered walking route.',{actorId:world.agents[2].id,type:'group-reply',parentId:'PRIVATE_EVENT_A'});
  add(world,'PRIVATE_EVENT_F','We still need to check shelter and staffing.',{type:'group-reply',parentId:'PRIVATE_EVENT_C'});
  const results=extractor()(run,world,['PRIVATE_GROUP_A','whatsapp-node','person-node']);
  assert.equal(results.length,2);
  for(const result of results){
    assert.equal(result.visibility,'private');assert.equal(result.eligibleStatements,4);assert.equal(result.omitted,0);
    assert.deepEqual(result.statements.map(s=>s.text),world.events.map(e=>e.text));
    assert.deepEqual(result.statements.map(s=>s.speaker),['Participant 1','Participant 2','Participant 3','Participant 1']);
    assert.deepEqual(result.statements.map(s=>s.phase),['initial','followup','followup','followup']);
    assert.deepEqual(result.statements.map(s=>s.minute),[0,15,30,45]);
    assert.equal(new Set(result.statements.map(s=>s.thread)).size,1);
    assert.deepEqual(result.statements.map(s=>s.replyToId),[null,...result.statements.slice(0,3).map(s=>s.id)]);
    assert.ok(result.statements.every(s=>!s.id.includes('PRIVATE_')));
  }
  const encoded=JSON.stringify(results.map(({nodeId,...rest})=>rest));
  assert.doesNotMatch(encoded,/PRIVATE_|actorId|roleId|memory|resident|motivation|member|citizen/i);
  assert.equal(results[0].channel,'Fictional chat A');assert.equal(results[1].channel,'WhatsApp');
});

test('group targets match exactly and platform evidence keeps groups and public threads distinct',()=>{
  const {run,world}=fixture();
  add(world,'a-root','The first group asks about access.');
  add(world,'a-reply','The first group asks for a covered path.',{type:'group-reply',parentId:'a-root'});
  add(world,'b-root','The second group asks about opening hours.',{groupId:'PRIVATE_GROUP_B'});
  add(world,'b-reply','The second group asks who can staff evenings.',{groupId:'PRIVATE_GROUP_B',type:'group-reply',parentId:'b-root'});
  add(world,'r-root','Will the route remain open?',{platform:'reddit',groupId:undefined,type:'post'});
  add(world,'r-answer','A temporary path needs checking.',{platform:'reddit',groupId:undefined,type:'comment',parentId:'r-root'});
  add(world,'r-other','A separate discussion asks about cost.',{platform:'reddit',groupId:undefined,type:'post'});
  const [group,platform,publicChannel]=extractor()(run,world,['PRIVATE_GROUP_B','whatsapp-node','reddit-node']);
  assert.deepEqual(group.statements.map(s=>s.text),['The second group asks about opening hours.','The second group asks who can staff evenings.']);
  assert.equal(platform.statements.length,4);assert.equal(new Set(platform.statements.map(s=>s.thread)).size,2);
  assert.equal(platform.statements[1].replyToId,platform.statements[0].id);assert.equal(platform.statements[3].replyToId,platform.statements[2].id);
  assert.notEqual(platform.statements[1].thread,platform.statements[3].thread);
  assert.equal(publicChannel.visibility,'public');assert.equal(publicChannel.statements.length,3);
  assert.equal(publicChannel.statements[1].replyToId,publicChannel.statements[0].id);
  assert.notEqual(publicChannel.statements[1].thread,publicChannel.statements[2].thread);
});

test('only matching accepted items survive hidden, forwarded, failed, rule and invalid parent ancestry checks',()=>{
  const {run,world}=fixture();add(world,'good','Accepted usable text.');
  add(world,'hidden','BLOCKED_HIDDEN',{}, {hidden:true});
  add(world,'forwarded','BLOCKED_FORWARDED',{}, {sharedFrom:'good'});
  add(world,'failed','BLOCKED_FAILED',{source:'social-decision-failed'});
  add(world,'rule','BLOCKED_RULE',{source:'deterministic-rule'});
  add(world,'reaction','BLOCKED_NONAUTHORED',{type:'like'});
  add(world,'actor-mismatch','BLOCKED_ACTOR',{}, {actorId:'other'});
  add(world,'text-mismatch','BLOCKED_TEXT',{}, {text:'Different item'});
  add(world,'platform-mismatch','BLOCKED_PLATFORM',{}, {platform:'reddit'});
  add(world,'group-mismatch','BLOCKED_GROUP',{}, {groupId:'PRIVATE_GROUP_B'});
  add(world,'unknown-group','BLOCKED_UNKNOWN_GROUP',{groupId:'unknown'});
  add(world,'hidden-child','BLOCKED_HIDDEN_CHILD',{parentId:'hidden',type:'group-reply'});
  add(world,'forward-child','BLOCKED_FORWARDED_CHILD',{parentId:'forwarded',type:'group-reply'});
  add(world,'rule-child','BLOCKED_RULE_CHILD',{parentId:'rule',type:'group-reply'});
  add(world,'missing-parent','BLOCKED_MISSING_PARENT',{parentId:'missing',type:'group-reply'});
  add(world,'cross-group','BLOCKED_CROSS_GROUP',{parentId:'good',type:'group-reply',groupId:'PRIVATE_GROUP_B'});
  add(world,'cross-platform','BLOCKED_CROSS_PLATFORM',{parentId:'good',type:'reply',platform:'reddit',groupId:undefined});
  add(world,'cycle','BLOCKED_CYCLE',{parentId:'cycle',type:'group-reply'});
  const [result]=extractor()(run,world,['whatsapp-node']);
  assert.equal(result.eligibleStatements,1);assert.deepEqual(result.statements.map(s=>s.text),['Accepted usable text.']);
  assert.doesNotMatch(JSON.stringify(result),/BLOCKED_/);
});

test('bounded excerpts preserve early, middle and late chronology while sharing UTF-8 budget across selected channels',()=>{
  const {run,world}=fixture();
  for(let i=0;i<100;i++)add(world,`private-${i}`,`${i}:`+'界'.repeat(1200));
  for(let i=0;i<100;i++)add(world,`public-${i}`,`${i}:`+'路'.repeat(1200),{platform:'reddit',groupId:undefined,type:'post'});
  const results=extractor()(run,world,['PRIVATE_GROUP_A','whatsapp-node','reddit-node']);
  assert.equal(results.length,3);let bytes=0;
  for(const result of results){
    assert.equal(result.eligibleStatements,100);assert.ok(result.statements.length>0&&result.statements.length<=24);
    assert.equal(result.omitted,100-result.statements.length);
    const indices=result.statements.map(s=>Number(s.text.split(':')[0]));
    assert.equal(indices[0],0);assert.equal(indices.at(-1),99);assert.ok(indices.some(i=>i>=40&&i<=60));
    assert.deepEqual(indices,[...indices].sort((a,b)=>a-b));
    for(const statement of result.statements){assert.ok(statement.text.length<=1200);assert.ok(!statement.text.includes('\ufffd'));bytes+=Buffer.byteLength(statement.text,'utf8');}
  }
  assert.ok(bytes<=60000);
});

test('late channel evidence is selected independently of earlier unrelated accepted statements',()=>{
  const {run,world}=fixture();
  for(let i=0;i<80;i++)add(world,`earlier-${i}`,'Earlier forum discussion.',{platform:'reddit',groupId:undefined,type:'post'});
  add(world,'late-private','The private chat asks which evening appointments remain available.');
  const [result]=extractor()(run,world,['whatsapp-node']);
  assert.equal(result.eligibleStatements,1);assert.equal(result.statements[0].text,'The private chat asks which evening appointments remain available.');
});

test('available byte budget preserves a substantive statement alongside many short remarks',()=>{
  const {run,world}=fixture();
  const nodeIds=['whatsapp-node'];
  for(let i=0;i<11;i++){const id=`platform-copy-${i}`;run.graph.nodes.push({...run.graph.nodes[1],id});nodeIds.push(id);}
  add(world,'substantive','A question about sheltered evening access. '.repeat(28));
  for(let i=0;i<23;i++)add(world,`short-${i}`,'Still unresolved.');
  const results=extractor()(run,world,nodeIds);
  assert.equal(results.length,12);
  for(const result of results){assert.equal(result.statements.length,24);assert.equal(result.statements[0].text,world.items[0].text.trim().slice(0,1200));}
  assert.ok(results.reduce((sum,result)=>sum+result.statements.reduce((n,s)=>n+Buffer.byteLength(s.text,'utf8'),0),0)<=60000);
});

test('unknown channels have no raw fallback and a mismatched world cannot supply evidence',()=>{
  const {run,world}=fixture();
  run.graph.nodes.push({...run.graph.nodes[0],id:'unknown-channel',properties:{platformId:'channel:unknown'}});
  assert.deepEqual(extractor()(run,world,['unknown-channel']),[]);
  world.genesis.input.runId='other';assert.throws(()=>extractor()(run,world,['whatsapp-node']),/IDENTITY/);
});

test('excerpt text anonymizes known participant names, handles and IDs without replacing partial or tiny tokens',()=>{
  const {run,world}=fixture();
  Object.assign(world.agents[0],{id:'actor-1234',label:'Alice Tan',handle:'@alice.tan'});
  Object.assign(world.agents[1],{id:'participant-other',label:'Alex',handle:'@alex'});
  Object.assign(world.agents[2],{id:'Jo',label:'Li',handle:'Bo'});
  add(world,'identity-mentions','ALICE TAN asked @Alice.Tan whether actor-1234 could respond. Alex replied to @alex. Alexander and actor-12345 remain different words; Jo and Li need no replacement.');
  const [result]=extractor()(run,world,['whatsapp-node']);
  assert.equal(result.statements[0].text,'a participant asked a participant whether a participant could respond. a participant replied to a participant. Alexander and actor-12345 remain different words; Jo and Li need no replacement.');
  assert.equal(result.statements[0].speaker,'Participant 1');
});

test('canonical item ancestry preserves valid comments when engine event parent metadata names a different context',()=>{
  const {run,world}=fixture();
  add(world,'post','Will the route stay open?',{platform:'reddit',groupId:undefined,type:'post'});
  // engine.ts records target.parentId on the event and target.id on its new item.
  add(world,'comment','A sheltered temporary route still needs checking.',{platform:'reddit',groupId:undefined,type:'comment',targetId:'post',parentId:null},{parentId:'post'});
  const [result]=extractor()(run,world,['reddit-node']);
  assert.equal(result.eligibleStatements,2);assert.equal(result.statements[1].replyToId,result.statements[0].id);
  assert.equal(result.statements[0].thread,result.statements[1].thread);
});
