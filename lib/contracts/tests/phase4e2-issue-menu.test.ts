import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildDecisionMenu,decodeMenuDecision,encodeMenuContext,menuSchema,DecisionMenuError} from '../../society/decision-menu.ts';
import type {DecisionContext} from '../../society/decision-contract.ts';
import {createSociety,act,saveSociety,restoreSociety} from '../../society/engine.ts';
import {buildDecisionContext,prepareHybridStep,finishDecision,parseSocialDecision} from '../../society/hybrid.ts';
import {multiDaySwarmPolicy,swarmHybrid} from '../../society/swarm.ts';
import {QUALITY_POLICY,TOPIC_POLICY} from '../../society/intelligence.ts';
import {applyIssue} from '../../society/episodic.ts';
import {phase4dWorld} from './phase4d-fixture.ts';

function context(policy='conversation-menu-v3'):DecisionContext {
 const c={version:1,policy,id:'decision-quality-fixture',runId:'quality-fixture',tick:20,actor:{id:'owner',label:'Fictional owner',goal:'Review explicit safeguards',position:0,resistance:0.5,priorities:[],demographic:null},platform:'reddit',question:'A hypothetical local service trial',connections:[{id:'peer',handle:'fictional-peer'}],items:[{id:'own-source',actorId:'owner',platform:'reddit',parentId:null,text:'An explicit fictional condition.',media:'none',tick:2},{id:'peer-source',actorId:'peer',platform:'reddit',parentId:null,text:'A fictional reply about safeguards.',media:'none',tick:19,modelAuthored:true}],memories:[{eventId:'own-memory',primaryItemId:'own-source',itemIds:['own-source'],platform:'reddit',kind:'authored',text:'',tick:2},{eventId:'peer-memory',primaryItemId:'peer-source',itemIds:['peer-source'],platform:'reddit',kind:'exposure',text:'',tick:19}],actions:['post','comment','read','like','inactive','group-create'],assumptions:[],issues:[{id:'issue:own-source',kind:'condition',topicId:'topic-1',sourceEventId:'own-source',createdTick:2,status:'open',changedEventId:null}],issueCreationAllowed:true,communication:{channels:[{id:'reddit',style:'public-discussion'},{id:'whatsapp',style:'private-group'}],groups:[],canCreateGroup:true,purposes:['topic-1'],topics:[{id:'topic-1',label:'Safeguards'},{id:'topic-2',label:'Service'}]}} as unknown as DecisionContext;
 c.recentDecisions=[];c.memories=c.memories.map(m=>({...m,origin:'short-term',importance:4}));
 c.menu=buildDecisionMenu(c);return c;
}
function wire(c:DecisionContext,issueChoiceId:string|null=null,action='post'){
 return {choiceId:c.menu!.find(m=>m.action===action)!.id,text:action==='inactive'?null:'A contextual fictional classification.',motivation:'Track the explicit fictional issue.',recallIds:[],stanceId:'keep',discussion:issueChoiceId===null?{topicIds:[],argument:'unspecified'}:null,issueChoiceId};
}
const encoded=(c:DecisionContext)=>JSON.parse(encodeMenuContext(c));
const rejects=(action:()=>unknown,rule:string,path:string)=>assert.throws(action,(e:unknown)=>e instanceof DecisionMenuError&&e.rule===rule&&e.path===path);

test('v3 offers exact issue classifications and binds closure source memory without optional recalls',()=>{
 const c=context(),view=encoded(c);
 assert.ok(Array.isArray(view.issueChoices),'the issue interface must advertise finite choices');
 assert.equal(view.issueChoices.length,10);
 const resolve=view.issueChoices.find((i:any)=>i.kind==='resolve');
 assert.equal(resolve.topicId,'topic-1');assert.equal(resolve.sourceItem,'item-1');assert.deepEqual(resolve.requiredMemories,['memory-1']);
 const d=decodeMenuDecision(wire(c,resolve.id),c);
 assert.deepEqual(d.issueUpdate,{kind:'resolve',topicId:'topic-1',issueId:'issue:own-source'});
 assert.deepEqual(d.discussion,{topicIds:['topic-1'],argument:'condition'});
 assert.deepEqual(d.memoryIds,['own-memory']);assert.deepEqual(d.selection?.recallIds,[]);
 assert.equal((d.selection as any).issueChoiceId,resolve.id);
 assert.deepEqual(c.memories.map(m=>m.eventId),['own-memory','peer-memory']);
});

test('v3 issue schema permits classification only with authored actions and null discussion',()=>{
 const c=context(),schema:any=menuSchema(c),view=encoded(c);
 assert.ok(schema.required.includes('issueChoiceId'));assert.ok(!schema.required.includes('issueUpdate'));
 const selected=schema.anyOf.find((b:any)=>b.properties.issueChoiceId?.enum?.includes(view.issueChoices[0].id));
 assert.ok(selected);assert.equal(selected.properties.discussion.type,'null');
 assert.ok(selected.properties.choiceId.enum.every((id:string)=>['post','comment','reply','message','group-reply'].includes(c.menu!.find(m=>m.id===id)!.action)));
 const concern=decodeMenuDecision({...wire(c),discussion:{topicIds:['topic-1'],argument:'concern'}},c);
 assert.equal(concern.issueUpdate,null);assert.equal(concern.discussion!.argument,'concern');
});

test('v3 rejects invented issue IDs, arbitrary updates and contradictory tags without coercion',()=>{
 const c=context(),choice=encoded(c).issueChoices?.find((i:any)=>i.kind==='resolve');assert.ok(choice);
 rejects(()=>decodeMenuDecision(wire(c,'issue:own-source'),c),'SOCIAL_TARGET','decision.issueChoiceId');
 rejects(()=>decodeMenuDecision({...wire(c,choice.id),issueUpdate:{kind:'resolve',topicId:'topic-1',issueId:'issue:own-source'}},c),'SOCIAL_SHAPE','decision');
 rejects(()=>decodeMenuDecision({...wire(c,choice.id),discussion:{topicIds:['topic-2'],argument:'support'}},c),'SOCIAL_SHAPE','decision.discussion');
 rejects(()=>decodeMenuDecision(wire(c,choice.id,'inactive'),c),'SOCIAL_TARGET','decision.issueChoiceId');
});

test('v3 closure choices require supplied owner sources, memories, topics and open status',()=>{
 const cases=[(c:DecisionContext)=>{c.items[0].actorId='peer';},(c:DecisionContext)=>{c.items=c.items.slice(1);},(c:DecisionContext)=>{c.memories=c.memories.slice(1);},(c:DecisionContext)=>{c.issues![0].status='resolved';},(c:DecisionContext)=>{c.issues![0].topicId='absent-topic';},(c:DecisionContext)=>{c.items[0].groupId='not-a-current-membership';}];
 for(const change of cases){const c=context();change(c);c.menu=buildDecisionMenu(c);const choices=encoded(c).issueChoices;assert.ok(Array.isArray(choices));assert.ok(choices.every((i:any)=>i.kind!=='resolve'&&i.kind!=='withdraw'));}
});

test('v3 lifetime cap removes creation while retained closure remains explicitly selectable',()=>{
 const c=context();c.issueCreationAllowed=false;const choices=encoded(c).issueChoices;assert.ok(Array.isArray(choices));assert.deepEqual(choices.map((i:any)=>i.kind),['resolve','withdraw']);
 const noIssues=context();noIssues.issues=[];noIssues.issueCreationAllowed=false;assert.deepEqual(encoded(noIssues).issueChoices,[]);
 const d=decodeMenuDecision(wire(noIssues),noIssues);assert.equal(d.issueUpdate,null);
});

test('v3 malformed discussion is rejected with controlled safe shape diagnostics',()=>{
 const c=context();for(const discussion of [{},{topicIds:null,argument:'condition'},{topicIds:['topic-1'],argument:'invented'},null])rejects(()=>decodeMenuDecision({...wire(c),discussion},c),'SOCIAL_SHAPE','decision.discussion');
});

test('v3 context includes bounded evidence presentation without changing legacy encoding or schemas',()=>{
 const old=context('conversation-menu-v2'),legacy=encoded(old),schema:any=menuSchema(old);
 assert.equal(legacy.issueChoices,undefined);assert.equal(legacy.memoryEvidence,undefined);assert.equal(legacy.qualityInstructions,undefined);
 assert.ok(schema.required.includes('issueUpdate'));assert.equal(schema.properties.issueChoiceId,undefined);
 const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 assert.equal(digest(schema),'a58d876ee6e0a5af833683eda27b85cd0c0855e87b90f79fdec049fbb99a76c0');assert.equal(digest(legacy),'6722b111d03622e4935b4b02ce7efec52fe85cf14852bbcf3a8f84204517c8cd');
 const c=context(),view=encoded(c);assert.equal(view.memoryEvidence?.policy,'memory-source-time-v1');assert.ok(view.qualityInstructions);
});

test('v3 preserves a message destination for each member group when the bounded menu is saturated',()=>{
 const c=context();c.platform='whatsapp';c.actions=['read','message','group-reply','like','group-create','group-invite','group-join','group-leave','share','inactive'];
 c.connections=Array.from({length:6},(_,i)=>({id:'connection-'+i,handle:'fictional-'+i}));
 c.communication!.groups=Array.from({length:8},(_,i)=>({id:'group-'+i,name:'Fictional group '+i,platform:'whatsapp',member:true,canJoin:false,canInvite:true,canShare:true}));
 c.items=Array.from({length:8},(_,i)=>({id:'item-'+i,actorId:'peer',platform:'whatsapp',parentId:null,groupId:'group-0',text:'A fictional source '+i,media:'none',modelAuthored:true}));
 c.memories=Array.from({length:6},(_,i)=>({eventId:'memory-'+i,primaryItemId:'item-'+i,itemIds:['item-'+i],platform:'whatsapp',kind:'exposure',text:''}));
 c.readableIds=c.items.map(i=>i.id);c.issues=[];
 const legacy=buildDecisionMenu({...c,policy:'conversation-menu-v2'});
 assert.ok(!legacy.some(m=>m.action==='message'&&m.groupIndex===7),'the saturated historical menu exhibits the missing final destination');
 const menu=buildDecisionMenu(c);assert.ok(menu.length<=24);
 assert.deepEqual(menu.filter(m=>m.action==='message').map(m=>m.groupIndex).sort(),[0,1,2,3,4,5,6,7]);
 assert.ok(menu.some(m=>m.action==='inactive'));assert.ok(menu.some(m=>m.action==='group-reply'));
});

test('v3 public opportunities can offer permitted private group creation without changing old action menus',()=>{
 const c=context(),created=c.menu!.find(m=>m.action==='group-create');assert.ok(created);assert.equal(created.platform,'whatsapp');
 const d=decodeMenuDecision({...wire(c),choiceId:created.id,text:null},c);assert.equal(d.action,'group-create');assert.deepEqual(d.memberIds,['owner','peer']);
});

test('v3 group presentation includes only supplied known purposes without adding history metadata',()=>{
 const c=context(),base={name:'Fictional group',platform:'whatsapp' as const,member:true,canJoin:false,canInvite:false,canShare:false};
 c.communication!.groups=[{...base,id:'member',purposeId:'topic-1'},{...base,id:'invited',member:false,canJoin:true,purposeId:'topic-2'},{...base,id:'missing'},{...base,id:'invalid',purposeId:'unknown-topic'}];
 const groups=encoded(c).groups;
 assert.deepEqual(groups.map((g:any)=>g.purposeId??null),['topic-1','topic-2',null,null]);
 assert.ok(groups.every((g:any)=>!Object.hasOwn(g,'hasMessages')&&!Object.hasOwn(g,'createdTick')));
 const legacy=encoded({...c,policy:'conversation-menu-v2'});assert.ok(legacy.groups.every((g:any)=>!Object.hasOwn(g,'purposeId')));
});

function qualityWorld(){const p=multiDaySwarmPolicy();return createSociety({...phase4dWorld(50).genesis.input,swarm:p,hybrid:swarmHybrid(p),intelligence:QUALITY_POLICY,config:{agents:50,activation:0,steps:320}});}

test('v3 projects a retained open issue before newer closed issues within the four-issue context bound',()=>{
 let w=qualityWorld();const owner=w.agents[0].id,sourceIds:string[]=[];
 for(let i=0;i<5;i++){
  w=act({...w,tick:i+1},{actorId:owner,type:'post',platform:'reddit',text:'A fictional service safeguard condition requiring review '+i});
  const source=w.items.at(-1)!;sourceIds.push(source.id);w=applyIssue(w,owner,{kind:'condition',topicId:'topic-1',issueId:null},source.id);
  if(i){w=act(w,{actorId:owner,type:'post',platform:'reddit',text:'An explicit fictional closure record.'});w=applyIssue(w,owner,{kind:'resolve',topicId:'topic-1',issueId:'issue:'+source.id},w.items.at(-1)!.id);}
 }
 w=act(w,{actorId:owner,type:'read',platform:'reddit',targetId:sourceIds.at(-1)!});
 const c=buildDecisionContext(w,owner,'reddit');assert.ok(sourceIds.every(id=>c.items.some(item=>item.id===id)),'all competing issue sources must actually be retained');
 assert.equal(c.issues!.length,4);assert.equal(c.issues![0].sourceEventId,sourceIds[0]);assert.equal(c.issues![0].status,'open');
 const legacy=buildDecisionContext({...w,genesis:{...w.genesis,input:{...w.genesis.input,intelligence:TOPIC_POLICY}}},owner,'reddit');
 assert.ok(!legacy.issues!.some(i=>i.sourceEventId===sourceIds[0]));
});

test('v3 explicit creation and source-bound resolution survive the real reducer and deterministic replay',()=>{
 let w=qualityWorld(),owner:string|null=null,resolved=false,sourceId:string|null=null;
 for(let i=0;i<120&&!resolved;i++){
  w=prepareHybridStep(w);const c=w.hybrid!.pending;if(!c)continue;
  let decision=decodeMenuDecision(wire(c,null,'inactive'),c);
  if(owner===null||c.actor.id===owner){
   const authored=c.menu!.find(m=>['post','comment','reply','message','group-reply'].includes(m.action));
   const choice=encoded(c).issueChoices.find((o:any)=>o.kind===(owner===null?'condition':'resolve')&&o.topicId==='topic-1');
   if(authored&&choice){
    decision=decodeMenuDecision({...wire(c,choice.id,authored.action),choiceId:authored.id},c);
    parseSocialDecision(decision,c);if(owner===null)owner=c.actor.id;else resolved=true;
   }
  }
  w=finishDecision(w,{decision,usage:null,error:null});
  if(owner&&sourceId===null)sourceId=w.agents.find(a=>a.id===owner)!.issueHistory?.[0]?.sourceEventId??null;
 }
 assert.ok(resolved,'the owner must receive and explicitly select an offered closure');assert.ok(owner&&sourceId);
 const issue=w.agents.find(a=>a.id===owner)!.issueHistory![0];assert.equal(issue.status,'resolved');assert.notEqual(issue.changedEventId,issue.sourceEventId);
 assert.equal(w.events.find(e=>e.id===issue.sourceEventId)!.actorId,owner);assert.equal(w.events.find(e=>e.id===issue.changedEventId)!.actorId,owner);
 assert.equal(w.events.find(e=>e.id===issue.changedEventId)!.source,'social-model');
 const record=w.hybrid!.records.find(r=>r.decision?.issueUpdate?.kind==='resolve')!;
 assert.deepEqual(record.decision!.selection!.recallIds,[]);assert.ok(record.decision!.memoryIds.some(id=>record.context.memories.some(m=>m.eventId===id&&m.itemIds.includes(sourceId!))));
 assert.deepEqual(restoreSociety(saveSociety(w)),w);
});
