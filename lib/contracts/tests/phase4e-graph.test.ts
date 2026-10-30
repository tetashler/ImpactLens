import test from 'node:test';
import assert from 'node:assert/strict';
import {entityFirstGraph} from '../../server/society/entity-graph.ts';
import {visibleGraphNodeIds,selectSocietalGraphVisibility} from '../../knowledge-graph/societal-presentation.ts';
import {parseKnowledgeGraph,type KnowledgeGraph,type KnowledgeNode} from '../../knowledge-graph/contract.ts';
import {publicSociety,summaryGraph} from '../../server/society/summary.ts';
import {phase4dWorld,fixtureDecision} from './phase4d-fixture.ts';
import type {SocietySummary} from '../../society/public-contract.ts';
import {createSociety} from '../../society/engine.ts';
import {prepareHybridStep,finishDecision} from '../../society/hybrid.ts';
import {swarmPolicy,swarmHybrid,SWARM_INTELLIGENCE} from '../../society/swarm.ts';

const base=():KnowledgeGraph=>({version:1,scenarioIdentity:'phase4e-fixture',executionIdentity:'phase4d-fixture',nodes:[],edges:[],limitations:[]});
const entity=(id:string,properties:KnowledgeNode['properties']={}):KnowledgeNode=>({id,label:id,entityType:'Public institution',category:'planning',description:'A retained entity claim.',properties:{recordType:'world-entity',...properties},provenance:{kind:'source-backed',reference:'Retained literal source mention',url:'https://example.com/entity'},limitations:['A source mention does not verify every property.']});
function summary():SocietySummary{
 const s=publicSociety(phase4dWorld(100));
 // Controlled public fixture: no activity is significant unless a test supplies it.
 s.groups=[];s.links=[];
 s.agents=s.agents.map(a=>({...a,events:0,modelDecisions:0,ruleEvents:0,stateChanges:0,platformIds:[],groupCount:0,discussion:undefined}));
 return s;
}

test('entity-first graph preserves institutions, original role identities and evidence provenance',()=>{
 const s=summary(),role=s.agents[0].roleId!,b=base();
 b.nodes=[entity('institution:union',{entityId:'union',roleId:role}),{...entity('scenario:role',{roleId:role}),properties:{recordType:'fictional-agent',roleId:role},provenance:{kind:'synthetic-exploratory',reference:'Fictional scenario role'}}, {...entity('candidate:business',{entityId:'business'}),provenance:{kind:'model-assumption',reference:'Unverified candidate'}}];
 b.edges=[{id:'base:relation',source:'institution:union',target:'candidate:business',relationship:'connects',description:'A retained proposed relationship.',provenance:{kind:'model-assumption',reference:'Unverified association'},directed:true}];
 const original=structuredClone(b),g=entityFirstGraph(b,s),shown=visibleGraphNodeIds(g);
 assert.deepEqual(b,original);
 for(const n of original.nodes){const retained=g.nodes.find(x=>x.id===n.id)!;assert.ok(retained);assert.deepEqual(retained.provenance,n.provenance);assert.equal(retained.entityType,n.entityType);assert.ok(shown.has(n.id));}
 assert.equal(g.nodes.find(n=>n.id==='institution:union')!.properties.presentationCategory,'entity');
 assert.equal(g.nodes.find(n=>n.id==='scenario:role')!.properties.presentationCategory,'role');
 assert.ok(g.edges.some(e=>e.source===s.agents[0].id&&e.target==='scenario:role'&&e.relationship==='represents'));
 assert.deepEqual(g.edges.find(e=>e.id==='base:relation'),b.edges[0]);
});

test('role participant display labels distinguish the original scenario role without changing canonical identity',()=>{
 const s=summary(),a=s.agents[0],originalLabel=a.label,b=base();
 const role={...entity('scenario:shared-role',{roleId:a.roleId}),label:originalLabel,properties:{recordType:'fictional-agent',roleId:a.roleId},provenance:{kind:'synthetic-exploratory' as const,reference:'Original fictional scenario role'}};
 b.nodes=[role];const g=entityFirstGraph(b,s),participant=g.nodes.find(n=>n.id===a.id)!,retained=g.nodes.find(n=>n.id===role.id)!;
 assert.equal(participant.label,`${originalLabel} (participant)`);assert.equal(retained.label,originalLabel);assert.notEqual(participant.label,retained.label);
 assert.equal(participant.properties.agentId,a.id);assert.equal(s.agents[0].label,originalLabel);assert.deepEqual(retained.provenance,role.provenance);
 assert.ok(g.edges.some(e=>e.source===a.id&&e.target===role.id&&e.relationship==='represents'));
});

test('role participant display suffix fits the graph label bound while summary labels remain intact',()=>{
 const s=summary(),a=s.agents[0];a.label='X'.repeat(180);
 const g=entityFirstGraph(base(),s),label=g.nodes.find(n=>n.id===a.id)!.label;
 assert.ok(label.length<=180);assert.ok(label.endsWith(' (participant)'));assert.equal(a.label.length,180);
});

test('recorded significance can surface a rule-driven person while idle model capability does not',()=>{
 const s=summary(),[rule,idle]=s.agents.filter(a=>!a.roleId);
 rule.events=30;rule.ruleEvents=30;rule.stateChanges=2;
 Object.assign(rule,{controlMode:'rule-driven'});Object.assign(idle,{controlMode:'llm-capable',offeredDecisions:5});
 const g=entityFirstGraph(base(),s),shown=visibleGraphNodeIds(g),r=g.nodes.find(n=>n.id===rule.id)!;
 assert.ok(shown.has(rule.id));assert.ok(!shown.has(idle.id));
 assert.equal(r.properties.presentationCategory,'person');
 assert.match(String(r.properties.significanceReason),/position|state/i);
 assert.equal(g.nodes.find(n=>n.id===idle.id)!.properties.significanceScore,0);
});

test('background aggregate uses an explicit non-role complement and reconciles safe activity counts',()=>{
 const s=summary(),background=s.agents.filter(a=>!a.roleId);
 background.forEach((a,i)=>{a.events=2;a.ruleEvents=2;a.groupCount=i%2;a.affiliation='Unsupported employer claim';});
 const g=entityFirstGraph(base(),s),aggregate=g.nodes.find(n=>n.properties.presentationCategory==='aggregate')!;
 assert.ok(aggregate);assert.equal(aggregate.properties.members,96);assert.equal(aggregate.properties.recordedEvents,192);assert.equal(aggregate.properties.ruleEvents,192);
 assert.match(String(aggregate.properties.membershipRule),/non-role/);assert.match(String(aggregate.properties.membershipRule),/primary/i);
 assert.doesNotMatch(aggregate.label,/employ|union|politic|demograph/i);
 assert.doesNotMatch(JSON.stringify(aggregate),/Unsupported employer claim|memberIds|memberships|privateMembers/);
 const primaryAgents=g.nodes.filter(n=>n.properties.agentId&&n.properties.presentationPrimary===true);
 assert.equal(primaryAgents.length+Number(aggregate.properties.members),100);
 assert.equal(primaryAgents.reduce((n,a)=>n+Number(a.properties.recordedEvents),0)+Number(aggregate.properties.recordedEvents),192);
});

test('search and focus reveal an omitted person and connected entities with stable candidate properties',()=>{
 const s=summary(),hidden=s.agents.find(a=>!a.roleId)!,other=s.agents.filter(a=>!a.roleId)[1];
 hidden.platformIds=[s.platforms[0].id];s.links=[{source:hidden.id,target:other.id,kind:'ASSUMED_SOCIAL_TIE',count:1}];
 const g=entityFirstGraph(base(),s),before=structuredClone(g),original=g.nodes.find(n=>n.id===hidden.id)!;
 assert.equal(visibleGraphNodeIds(g).has(hidden.id),false);
 const selected=selectSocietalGraphVisibility(g,{query:hidden.id});
 assert.ok(selected.nodes.some(n=>n.id===hidden.id));assert.ok(selected.nodes.some(n=>n.id===other.id));
 assert.ok(selected.nodes.some(n=>n.properties.platformId===s.platforms[0].id));
 assert.deepEqual(selected.nodes.find(n=>n.id===hidden.id),original);assert.deepEqual(g,before);
 assert.ok(visibleGraphNodeIds(g,{focusedNodeId:hidden.id,maxReveal:0}).has(hidden.id));
});

test('primary individual selection is bounded and deterministic without deleting safe candidates',()=>{
 const s=summary();for(const a of s.agents.filter(a=>!a.roleId)){a.events=3;a.ruleEvents=3;a.stateChanges=1;}
 const g=entityFirstGraph(base(),s),reversed=entityFirstGraph(base(),{...s,agents:[...s.agents].reverse()});
 assert.equal(g.nodes.filter(n=>n.properties.agentId).length,100);
 assert.equal(g.nodes.filter(n=>n.properties.presentationCategory==='person'&&n.properties.presentationPrimary===true).length,12);
 assert.deepEqual(g.nodes.filter(n=>n.properties.agentId&&n.properties.presentationPrimary===true).map(n=>n.id).sort(),reversed.nodes.filter(n=>n.properties.agentId&&n.properties.presentationPrimary===true).map(n=>n.id).sort());
 assert.ok(g.nodes.length<=110);assert.ok(g.edges.length<=6000);assert.doesNotThrow(()=>parseKnowledgeGraph(g));
 assert.equal(g.nodes.find(n=>n.properties.presentationCategory==='aggregate')!.properties.members,84);
});

test('aggregate platform participation counts use recorded platform activity without private membership lists',()=>{
 const s=summary(),background=s.agents.filter(a=>!a.roleId);background[0].platformIds=[s.platforms[0].id];background[1].platformIds=[s.platforms[0].id];
 const g=entityFirstGraph(base(),s),aggregate=g.nodes.find(n=>n.properties.presentationCategory==='aggregate')!,platform=g.nodes.find(n=>n.properties.platformId===s.platforms[0].id)!;
 const link=g.edges.find(e=>e.source===aggregate.id&&e.target===platform.id)!;
 assert.ok(link);assert.match(link.description,/2 fictional/);assert.doesNotMatch(link.description,/member|employment/i);
});

test('entity-first projection never copies raw extensions or private lists into graph candidates',()=>{
 const s=summary();Object.assign(s.agents[10],{messages:['RAW_MESSAGE_4E'],episodic:['RAW_MEMORY_4E'],membershipIds:['RAW_MEMBERS_4E']});
 Object.assign(s.platforms[0],{rawText:'RAW_PLATFORM_4E'});
 const g=entityFirstGraph(base(),s),serialized=JSON.stringify(g);
 assert.doesNotMatch(serialized,/RAW_MESSAGE_4E|RAW_MEMORY_4E|RAW_MEMBERS_4E|RAW_PLATFORM_4E/);
 assert.equal(g.nodes.some(n=>['message','event','social-item'].includes(String(n.properties.recordType))),false);
 assert.ok(g.nodes.filter(n=>n.properties.agentId).every(n=>n.provenance.kind==='synthetic-exploratory'));
 const environment=g.nodes.find(n=>n.properties.platformId===s.platforms[0].id)!;
 assert.equal(environment.provenance.kind,'model-assumption');
});

test('visibility bounds broad query and neighbor expansion while honoring explicit focus and retained entities',()=>{
 const g=base(),institution=entity('institution:anchor');g.nodes=[institution,...Array.from({length:100},(_,i)=>({...entity('person:'+i),properties:{presentationPrimary:false,presentationCategory:'person'},provenance:{kind:'synthetic-exploratory' as const,reference:'Fictional person'}}))];
 g.edges=g.nodes.slice(1).map(n=>({id:'edge:'+n.id,source:institution.id,target:n.id,relationship:'connects',description:'Explicit fictional tie.',provenance:{kind:'synthetic-exploratory',reference:'Fictional relation'},directed:true}));
 assert.ok(visibleGraphNodeIds(g,{query:'person',maxReveal:5}).size<=11);
 const selected=visibleGraphNodeIds(g,{focusedNodeId:'institution:anchor',revealedNodeIds:['person:99'],maxReveal:5});
 assert.ok(selected.has('person:99'));assert.ok(selected.has(institution.id));assert.ok(selected.size<=7);
});

test('legacy graph visibility remains complete when no presentation metadata exists',()=>{
 const g=base();g.nodes=[entity('entity:first'),entity('entity:second')];
 assert.deepEqual([...visibleGraphNodeIds(g)].sort(),['entity:first','entity:second']);
 assert.deepEqual(selectSocietalGraphVisibility(g),g);
});

for(const active of [50,100] as const)test(`${active}-agent swarm projection reconciles actual public summary counts and preserves entity-first discovery`,()=>{
 const input=structuredClone(phase4dWorld(active).genesis.input),policy=swarmPolicy(active);
 let w=createSociety({...input,swarm:policy,hybrid:swarmHybrid(policy),intelligence:SWARM_INTELLIGENCE});
 for(let n=0;n<600&&(w.tick<80||w.hybrid?.pending);n++){
  w=prepareHybridStep(w);const pending=w.hybrid?.pending;
  if(pending){const choice=pending.menu!.find(m=>['comment','reply','group-reply'].includes(m.action))??pending.menu!.find(m=>m.action==='post'||m.action==='message')??pending.menu!.find(m=>m.action==='inactive')!;w=finishDecision(w,{decision:fixtureDecision(pending,choice.action),usage:null,error:null});}
 }
 assert.equal(w.tick,80);assert.equal(w.hybrid!.records.length,active===50?64:128);
 const s=publicSociety(w),b=base(),platform=s.platforms[0];
 b.nodes=[entity('institution:retained',{entityId:'institution'}),entity('platform:retained',{entityId:platform.entityId})];
 const g=summaryGraph(b,s),shown=selectSocietalGraphVisibility(g),primaryAgents=shown.nodes.filter(n=>n.properties.agentId),aggregate=shown.nodes.find(n=>n.properties.presentationCategory==='aggregate')!;
 assert.ok(s.swarm);assert.equal(g.nodes.filter(n=>n.properties.agentId).length,active);assert.ok(primaryAgents.length<=16);
 assert.equal(primaryAgents.length+Number(aggregate.properties.members),active);
 assert.equal(primaryAgents.reduce((n,a)=>n+Number(a.properties.recordedEvents),0)+Number(aggregate.properties.recordedEvents),s.counts.events);
 assert.equal(primaryAgents.reduce((n,a)=>n+Number(a.properties.modelDecisions),0)+Number(aggregate.properties.modelDecisions),s.usage.accepted);
 for(const original of b.nodes){const retained=shown.nodes.find(n=>n.id===original.id)!;assert.ok(retained);assert.deepEqual(retained.provenance,original.provenance);assert.equal(retained.entityType,original.entityType);}
 const hidden=g.nodes.find(n=>n.properties.agentId&&n.properties.presentationPrimary===false)!;
 assert.ok(hidden);assert.ok(visibleGraphNodeIds(g,{query:hidden.id}).has(hidden.id));
 assert.doesNotMatch(JSON.stringify(g),/RAW_PHASE4E_|memoryIds|exposedIds|"episodic"/);assert.ok(g.nodes.length<=110);assert.ok(g.edges.length<=6000);
});
