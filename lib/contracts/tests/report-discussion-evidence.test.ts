import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {createSociety,type SocietyWorld,type SocialEvent,type SocialItem} from '../../society/engine.ts';
import {buildPopulation,populationView} from '../../server/population/store.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {publicSociety} from '../../server/society/summary.ts';
import {HYBRID_DEFAULTS} from '../../society/decision-contract.ts';
import {BALANCED_POLICY} from '../../society/intelligence.ts';
import {prepareHybridStep} from '../../society/hybrid.ts';
import {extractPublicDiscussionEvidence,extractDetailedReportDiscussionEvidence} from '../../server/report-discussion-evidence.ts';
import {readPublicReportDiscussion,readPublicDetailedReportDiscussion,readPublicGraphSummaryEvidence} from '../../server/society/public-service.ts';
import {projectGraphNodeDiscussion} from '../../server/graph-summary-evidence.ts';
import {entityFirstGraph} from '../../server/society/entity-graph.ts';
import {readSocialSessionReadonly} from '../../server/society/service.ts';
import type {PublicExplore} from '../../society/public-contract.ts';
import type {KnowledgeNode} from '../../knowledge-graph/contract.ts';

const sessionId='11111111-1111-4111-8111-111111111111';
function fixture(){
 const f=worldFixtures()[0];
 const world=structuredClone(createSociety({runId:'discussion-fixture',question:'Discuss the proposed polyclinic',seed:'discussion',population:populationView(buildPopulation({size:10000,seed:'discussion'})),roles:f.draft.agents,jurisdictions:f.draft.jurisdictions,acceptedActions:f.draft.agents.map((a,i)=>({id:`accepted-${i}`,roleId:a.id,statement:`A public concern from stakeholder ${i}: opening hours and staffing need clarification.`,position:'conditional'})),communication:{version:1,channels:[{id:'reddit',entityId:'forum',name:'Public forum',entityType:'Discussion forum',style:'public-discussion',adapter:'discussion',limitation:'Fictional'},{id:'whatsapp',entityId:'chat',name:'Private chat',entityType:'Messaging',style:'private-group',adapter:'private-group',limitation:'Fictional'}],topics:[]},config:{agents:4,steps:4,activePerStep:1}}));
 const node=(id:string,label:string,properties:KnowledgeNode['properties'],description='Public context'):KnowledgeNode=>({id,label,category:'planning',description,entityType:'Discussion context',properties,provenance:{kind:'synthetic-exploratory',reference:'Fictional'},limitations:[]});
 const run:PublicExplore={version:3,kind:'summary-execution',attemptId:'attempt',requestIdentity:'request',runId:'discussion-fixture',planId:null,question:'Discuss the proposed polyclinic',status:'completed',request:null,graph:{version:1,scenarioIdentity:'scenario',executionIdentity:'discussion-fixture',nodes:[node('public-platform','Public forum',{platformId:'reddit',recordType:'communication-platform'},'99 events, 30 reactions, 2 private groups'),...f.draft.agents.map((a,i)=>node(`role-${i}`,a.label,{roleId:a.id,agentId:world.genesis.bindings[a.id],recordType:'fictional-agent'},'Fictional participant in this proposal.')),node('clinic','Proposed polyclinic',{recordType:'world-entity'},'Proposed clinic location for discussion.'),node('private-platform','Private chat',{platformId:'whatsapp',recordType:'communication-platform'},'PRIVATE_NODE_DESCRIPTION'),node('private-group','Private group',{recordType:'fictional-messaging-group'},'PRIVATE_GROUP_DESCRIPTION')],edges:[],limitations:[]},inspections:{},roles:f.draft.agents.map(a=>({id:a.id,label:a.label,goals:a.goals})),initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:0,actionCalls:0,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:{id:sessionId,token:'a'.repeat(64),revision:3},society:publicSociety(world)};
 return {world,run};
}
function add(world:SocietyWorld,id:string,text:string,changes:Partial<SocialEvent>={},itemChanges:Partial<SocialItem>={}){
 const actorId=world.agents[0].id;
 const event:SocialEvent={id,actorId,type:'post',platform:'reddit',tick:1,minute:15,targetId:null,parentId:null,text,position:0,previousPosition:null,causes:[],source:'social-model',sourceEventId:null,location:null,...changes};
 world.events.push(event);world.items.push({id,actorId:event.actorId,platform:event.platform!,parentId:event.parentId,community:'public',text,position:0,tick:1,media:'none',votes:0,likes:0,hidden:false,sharedFrom:null,...itemChanges});
}

test('discussion evidence retains accepted public arguments and excludes private, forwarded, hidden and rule content',()=>{
 const {run,world}=fixture();
 add(world,'followup','The opening-hours proposal still needs a staffing commitment.');
 add(world,'private','PRIVATE_STATEMENT',{platform:'whatsapp',groupId:'private-group'},{platform:'whatsapp',groupId:'private-group'});
 add(world,'group-on-public','PRIVATE_GROUP_STATEMENT',{groupId:'private-group'},{groupId:'private-group'});
 add(world,'rule','PRIVATE_RULE_STATEMENT',{source:'deterministic-rule'});
 add(world,'failure','PRIVATE_FAILED_STATEMENT',{source:'social-decision-failed'});
 add(world,'hidden','PRIVATE_HIDDEN_STATEMENT',{}, {hidden:true});
 add(world,'share','PRIVATE_SHARED_STATEMENT',{type:'share'}, {sharedFrom:'private'});
 add(world,'forwarded','PRIVATE_FORWARDED_STATEMENT',{}, {sharedFrom:'private'});
 add(world,'reply-to-share','PRIVATE_QUOTED_STATEMENT',{type:'reply',parentId:'share'}, {parentId:'share'});
 Object.assign(world.agents[0],{motivation:'PRIVATE_MOTIVATION',memory:[{text:'PRIVATE_MEMORY'}],resident:{name:'PRIVATE_PROFILE'}});
 Object.assign(world.events.at(-1)!,{motivation:'PRIVATE_MOTIVATION'});
 const evidence=extractPublicDiscussionEvidence(run,world),encoded=JSON.stringify(evidence);
 assert.equal(evidence.initialStatements,4);assert.equal(evidence.followupStatements,1);assert.equal(evidence.omitted,0);
 assert.equal(evidence.statements.at(-1)?.text,'The opening-hours proposal still needs a staffing commitment.');
 assert.deepEqual(evidence.statements.at(-1)?.nodeIds,['public-platform','role-0']);
 assert.match(evidence.scope,/fictional/i);assert.match(evidence.scope,/healthcare outcomes/i);
 assert.ok(evidence.nodes.some(n=>n.nodeId==='clinic'));
 assert.doesNotMatch(encoded,/PRIVATE_|99 events|30 reactions|2 private groups/);
 assert.ok(!Object.hasOwn(run,'publicDiscussion'));
});

test('initial-only evidence makes the missing followup discussion explicit',()=>{
 const {run,world}=fixture(),evidence=extractPublicDiscussionEvidence(run,world);
 assert.equal(evidence.followupStatements,0);assert.match(evidence.scope,/initial.only/i);
 assert.match(evidence.scope,/no.*follow.?up/i);assert.match(evidence.scope,/not.*public opinion/i);
});

test('detailed evidence retains fuller public reasoning and chronology without changing the quick pack',()=>{
 const {run,world}=fixture();
 add(world,'opening','The engineer proposes phased work. '.repeat(40),{minute:30});
 add(world,'reply','The resident requests a stable sheltered route. '.repeat(30),{type:'reply',parentId:'opening',minute:45},{parentId:'opening'});
 for(let i=0;i<45;i++)add(world,`later-${i}`,'Specific later public reasoning '.repeat(40),{minute:60+i});
 add(world,'private-detail','PRIVATE_DETAIL',{platform:'whatsapp',groupId:'private-group'},{platform:'whatsapp',groupId:'private-group'});
 const before=extractPublicDiscussionEvidence(run,world),expanded=extractDetailedReportDiscussionEvidence(run,world);
 assert.equal(before.statements.length,32);assert.equal(expanded.statements.length,51);
 assert.ok(expanded.statements.find(s=>s.id==='opening')!.text.length>700);
 const reply=expanded.statements.find(s=>s.id==='reply') as any;
 assert.equal(reply.minute,45);assert.equal(reply.replyToId,'opening');
 assert.ok(expanded.statements.every(s=>s.text.length<=1600));
 assert.doesNotMatch(JSON.stringify(expanded),/PRIVATE_/);
 assert.deepEqual(extractPublicDiscussionEvidence(run,world),before);
 assert.ok(!Object.hasOwn(before.statements[0],'minute'));
});

test('graph evidence attributes background statements only to its actual non-role complement',()=>{
 const original=fixture(),world=structuredClone(createSociety({...original.world.genesis.input,config:{...original.world.genesis.config,agents:6}})),run=original.run;
 const background=world.agents.find(agent=>!agent.role)!;assert.ok(background);
 add(world,'background-remark','A background participant asks for sheltered access.',{actorId:background.id});
 add(world,'role-remark','A scenario role asks about opening hours.',{actorId:world.agents.find(agent=>!!agent.role)!.id});
 add(world,'private-remark','PRIVATE_ONLY',{platform:'whatsapp',groupId:'private-group'},{platform:'whatsapp',groupId:'private-group'});
 run.society=publicSociety(world);run.graph=entityFirstGraph(run.graph,run.society);
 const aggregate=run.graph.nodes.find(node=>node.properties.recordType==='fictional-agent-aggregate');assert.ok(aggregate);
 const pack=projectGraphNodeDiscussion(run,world,[aggregate.id]);
 assert.ok(pack.statements.find(statement=>statement.id==='background-remark')?.nodeIds.includes(aggregate.id));
 assert.ok(!pack.statements.find(statement=>statement.id==='role-remark')?.nodeIds.includes(aggregate.id));
 assert.doesNotMatch(JSON.stringify(pack),/PRIVATE_ONLY/);
 const privatePack=projectGraphNodeDiscussion(run,world,['private-group']);assert.deepEqual(privatePack.statements,[]);
});
test('later graph nodes retain their own evidence even when public discussion exceeds the report cap',()=>{
 const original=fixture(),world=structuredClone(createSociety({...original.world.genesis.input,socialPolicy:'memory-aware-v1',intelligence:{...BALANCED_POLICY},config:{...original.world.genesis.config,agents:80}})),run=original.run;
 world.events=[];world.items=[];
 for(const [index,actor]of world.agents.entries())add(world,`public-${index}`,`Public concern specific to participant ${index}.`,{actorId:actor.id});
 run.society=publicSociety(world);run.graph=entityFirstGraph(run.graph,run.society);
 const last=world.agents.at(-1)!,target=run.graph.nodes.find(node=>node.properties.agentId===last.id)!;
 assert.ok(target);
 const pack=projectGraphNodeDiscussion(run,world,[target.id]);
 assert.ok(pack.statements.some(statement=>statement.nodeIds.includes(target.id)&&statement.text.includes('participant 79')));
 assert.ok(pack.statements.length<=64);
});
test('entity summaries receive recorded discussion mentioning the entity rather than generic role descriptions',()=>{
 const {run,world}=fixture();
 run.graph.nodes.push({...run.graph.nodes.find(node=>node.id==='clinic')!,id:'existing-private-clinic',label:'Existing private clinic'});
 add(world,'continuity','Keeping a private clinic preserves the familiar doctor relationship.');
 add(world,'subsidies','The proposed polyclinic may make subsidised follow-ups easier.');
 const pack=projectGraphNodeDiscussion(run,world,['existing-private-clinic']);
 assert.ok(pack.statements.find(statement=>statement.id==='continuity')?.nodeIds.includes('existing-private-clinic'));
 assert.ok(!pack.statements.find(statement=>statement.id==='subsidies')?.nodeIds.includes('existing-private-clinic'));
});

test('bounded selection preserves initial roles and followup breadth without copying property bags',()=>{
 const {run,world}=fixture();
 for(let i=0;i<50;i++)add(world,`frequent-${i}`,'Opening hours '.repeat(100));
 add(world,'other-actor','A different stakeholder requests accessible appointments.',{actorId:world.agents[1].id});
 for(let i=0;i<30;i++)run.graph.nodes.push({...run.graph.nodes[5],id:`context-${i}`,description:'Context '.repeat(100)});
 const first=extractPublicDiscussionEvidence(run,world),second=extractPublicDiscussionEvidence(run,world);
 assert.deepEqual(first,second);assert.equal(first.statements.length,32);assert.equal(first.omitted,23);
 assert.equal(new Set(first.statements.filter(s=>s.phase==='initial').map(s=>s.actor)).size,4);
 assert.ok(first.statements.some(s=>s.id==='other-actor'));
 assert.ok(first.statements.every(s=>s.text.length<=700));assert.ok(first.nodes.length<=16);
 assert.ok(first.nodes.every(n=>n.description.length<=320));
 assert.ok(first.statements.every(s=>s.nodeIds.every(id=>first.nodes.some(n=>n.nodeId===id))));
 assert.doesNotMatch(JSON.stringify(first),/persistentGoal|privateGroupCount|memoryIds/);
});

function storedFixture(){
 const original=fixture(),run=original.run;let world=createSociety({...original.world.genesis.input,socialPolicy:'memory-aware-v1',hybrid:{...HYBRID_DEFAULTS},config:{...original.world.genesis.config,steps:80}});
 while(!world.hybrid!.pending&&world.tick<80)world=prepareHybridStep(world);
 assert.ok(world.hybrid!.pending,'fixture must retain a real pending reservation');run.society=publicSociety(world);
 const directory=mkdtempSync(join(tmpdir(),'impactlens-discussion-')),sessions=join(directory,'sessions');mkdirSync(sessions);
 const archive=join(directory,createHash('sha256').update(run.runId).digest('hex')+'.json'),journal=join(sessions,sessionId+'.jsonl');
 writeFileSync(archive,JSON.stringify({version:1,token:run.session!.token,execution:{private:'PRIVATE_EXECUTION'},publicRun:run,sessionId,revision:3,baseGraph:run.graph}));
 // A retained reservation must remain untouched by a report read.
 writeFileSync(journal,JSON.stringify({id:sessionId,runId:run.runId,revision:3,input:world.genesis.input,tick:world.tick,hybrid:world.hybrid,reservation:world.hybrid!.pending})+'\n');
 return {run,world,directory,archive,journal,deps:{storeDirectory:directory,directory:sessions,fetcher:async()=>{throw Error('No provider calls permitted');}}};
}
function cleanup(directory:string){const path=resolve(directory);assert.equal(dirname(path),resolve(tmpdir()));assert.ok(basename(path).startsWith('impactlens-discussion-'));rmSync(path,{recursive:true,force:true});}

test('authenticated report discussion reads preserve journal, reservation and directory bytes',async()=>{
 const f=storedFixture();try{
  const archive=readFileSync(f.archive),journal=readFileSync(f.journal),files=readdirSync(f.deps.directory);
  const evidence=await readPublicReportDiscussion(f.run.runId,f.run.session!.token,3,f.world.tick,f.deps);
  const detailed=await readPublicDetailedReportDiscussion(f.run.runId,f.run.session!.token,3,f.world.tick,f.deps);
  assert.equal(detailed.initialStatements,4);
  assert.equal(evidence.initialStatements,4);assert.equal(evidence.followupStatements,0);
  assert.deepEqual(readFileSync(f.archive),archive);assert.deepEqual(readFileSync(f.journal),journal);assert.deepEqual(readdirSync(f.deps.directory),files);
  const state=await readSocialSessionReadonly(sessionId,f.deps);assert.equal(state.revision,3);
  assert.deepEqual(readFileSync(f.journal),journal);assert.doesNotMatch(JSON.stringify(evidence),/PRIVATE_/);
 }finally{cleanup(f.directory);}
});

test('all-node graph evidence reads retain private boundaries and never recover or rewrite the run',async()=>{
 const f=storedFixture();try{
  const archive=readFileSync(f.archive),journal=readFileSync(f.journal);
  const ids=['clinic','private-platform','private-group'];
  const evidence=await readPublicGraphSummaryEvidence(f.run.runId,f.run.session!.token,3,f.world.tick,ids,f.deps);
  assert.deepEqual(evidence.nodes.map(node=>node.nodeId).sort(),[...ids].sort());
  assert.ok(evidence.scenarioConversations?.length,'entities receive anonymous public conversation context for ordinary-language references');
  assert.ok(evidence.scenarioConversations!.every(channel=>channel.visibility==='public'));
  assert.doesNotMatch(JSON.stringify(evidence),/PRIVATE_/);
  await assert.rejects(()=>readPublicGraphSummaryEvidence(f.run.runId,'b'.repeat(64),3,f.world.tick,ids,f.deps),/PUBLIC_ACCESS/);
  await assert.rejects(()=>readPublicGraphSummaryEvidence(f.run.runId,f.run.session!.token,2,f.world.tick,ids,f.deps),/REPORT_DISCUSSION_STALE/);
  assert.deepEqual(readFileSync(f.archive),archive);assert.deepEqual(readFileSync(f.journal),journal);
 }finally{cleanup(f.directory);}
});

test('discussion reads reject wrong capabilities and stale or mismatched snapshots',async()=>{
 const f=storedFixture();try{
  await assert.rejects(()=>readPublicReportDiscussion(f.run.runId,'b'.repeat(64),3,f.world.tick,f.deps),/PUBLIC_ACCESS/);
  await assert.rejects(()=>readPublicReportDiscussion(f.run.runId,f.run.session!.token,2,f.world.tick,f.deps),/REPORT_DISCUSSION_STALE/);
  await assert.rejects(()=>readPublicReportDiscussion(f.run.runId,f.run.session!.token,3,f.world.tick+1,f.deps),/REPORT_DISCUSSION_STALE/);
  const stored=JSON.parse(readFileSync(f.archive,'utf8'));stored.publicRun.session.id='22222222-2222-4222-8222-222222222222';writeFileSync(f.archive,JSON.stringify(stored));
  await assert.rejects(()=>readPublicReportDiscussion(f.run.runId,f.run.session!.token,3,f.world.tick,f.deps),/REPORT_DISCUSSION_IDENTITY/);
 }finally{cleanup(f.directory);}
});

test('runs without a society session return empty scoped evidence without recovering anything',async()=>{
 const f=storedFixture();try{
  const stored=JSON.parse(readFileSync(f.archive,'utf8'));stored.sessionId=null;stored.publicRun.session=null;stored.publicRun.society=null;stored.revision=0;writeFileSync(f.archive,JSON.stringify(stored));
  const evidence=await readPublicReportDiscussion(f.run.runId,f.run.session!.token,0,0,f.deps);
  assert.deepEqual(evidence.statements,[]);assert.equal(evidence.initialStatements,0);assert.equal(evidence.followupStatements,0);assert.match(evidence.scope,/no.*accepted public/i);
 }finally{cleanup(f.directory);}
});

test('a journal ahead of the retained snapshot is rejected without updating either record',async()=>{
 const f=storedFixture();try{
  const journal=JSON.parse(readFileSync(f.journal,'utf8'));journal.revision=4;writeFileSync(f.journal,JSON.stringify(journal)+'\n');
  const beforeArchive=readFileSync(f.archive),beforeJournal=readFileSync(f.journal);
  await assert.rejects(()=>readPublicReportDiscussion(f.run.runId,f.run.session!.token,3,f.world.tick,f.deps),/REPORT_DISCUSSION_STALE/);
  assert.deepEqual(readFileSync(f.archive),beforeArchive);assert.deepEqual(readFileSync(f.journal),beforeJournal);
 }finally{cleanup(f.directory);}
});

test('a snapshot from a different world cannot use a matching session revision',async()=>{
 const f=storedFixture();try{
  const archive=JSON.parse(readFileSync(f.archive,'utf8'));archive.publicRun.society.worldId='different-world';writeFileSync(f.archive,JSON.stringify(archive));
  await assert.rejects(()=>readPublicReportDiscussion(f.run.runId,f.run.session!.token,3,f.world.tick,f.deps),/REPORT_DISCUSSION_IDENTITY/);
 }finally{cleanup(f.directory);}
});
