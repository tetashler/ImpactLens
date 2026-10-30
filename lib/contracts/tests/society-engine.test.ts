import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPopulation,populationView} from '../../server/population/store.ts';
import {createSociety,stepSociety,advanceSociety,saveSociety,restoreSociety,restoreSocietyForInput,act,visibleFeed} from '../../society/engine.ts';
import {buildSocietyGeography} from '../../server/population/geography.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {projectSocietyGraph} from '../../society/graph.ts';
import {createDynamicPlan} from '../../dynamic-scenarios/plan.ts';
import {createDynamicInput} from '../../dynamic-scenarios/execution.ts';
import {runStakeholderSimulation,deterministicTurn} from '../../stakeholder-simulation/engine.ts';
import {projectPrimaryWorldGraph} from '../../world-graph/projection.ts';
const population=()=>populationView(buildPopulation({size:10000,seed:'society-fixture'}));
function world(){const f=worldFixtures()[0];return createSociety({runId:'fixture-run',question:f.request.question,seed:'social-test',population:population(),roles:f.draft.agents,jurisdictions:f.draft.jurisdictions,acceptedActions:[],config:{agents:24,steps:80,activation:0.7,influence:0.35}});}
test('seeded network, shared identities and saved replay are deterministic',()=>{const a=advanceSociety(world(),40),b=advanceSociety(world(),40);assert.deepEqual(a,b);assert.deepEqual(restoreSociety(saveSociety(a),a.genesis),a);assert.equal(new Set(a.agents.map(a=>a.id)).size,24);assert.ok(a.ties.length<24*24);assert.ok(a.agents.every(a=>a.memory.length<=12));assert.ok(a.events.every((e,i)=>e.id===`${a.genesis.id}:e${i}`));});
test('posts, exposure, replies, reactions and cross-platform memory arise from recorded state',()=>{const w=advanceSociety(world(),80),types=new Set(w.events.map(e=>e.type));for(const type of ['post','read','comment','reply','share','opinion','upvote','like'] as const)assert.ok(types.has(type),`Missing ${type}`);assert.ok(w.items.some(i=>i.platform==='reddit')&&w.items.some(i=>i.platform==='instagram'));assert.ok(w.events.some(e=>e.type==='opinion'&&e.causes.some(id=>w.events.find(x=>x.id===id)?.platform!==e.platform)));assert.ok(w.agents.some(a=>a.opinion!==a.initialOpinion));});
test('unexposed targets, unknown actors and Instagram downvotes fail without mutation',()=>{const w=world(),a=w.agents[0];assert.throws(()=>act(w,{actorId:'missing',platform:'reddit',type:'post',text:'x'}));const posted=act(w,{actorId:a.id,platform:'instagram',type:'post',text:'A synthetic question.',position:0.5});assert.throws(()=>act(posted,{actorId:w.agents[1].id,platform:'instagram',type:'comment',targetId:posted.items[0].id,text:'Unseen reply'}));assert.throws(()=>act(posted,{actorId:a.id,platform:'instagram',type:'downvote',targetId:posted.items[0].id}));assert.equal(w.items.length,0);});
test('foreign roles do not inherit Singapore resident demographics',()=>{const f=worldFixtures()[1],w=createSociety({runId:'water-run',question:f.request.question,seed:'water',population:population(),roles:f.draft.agents,jurisdictions:f.draft.jurisdictions,acceptedActions:[]});for(const a of w.agents.filter(a=>a.affiliation!=='Singapore'))assert.equal(a.resident,null);});
test('event, step and sample limits stop rather than silently discard causal history',()=>{assert.throws(()=>createSociety({...world().genesis.input,config:{agents:1000}}));const w=advanceSociety(world(),80);assert.equal(w.tick,80);assert.deepEqual(stepSociety(w),w);const bad=JSON.parse(saveSociety(w));bad.events[0].actorId='invented';assert.throws(()=>restoreSociety(JSON.stringify(bad),w.genesis));});
test('source action seeds retain exact source IDs once and graph projections use canonical people',async()=>{
 const f=worldFixtures()[0],input=await createDynamicInput(await createDynamicPlan(f.request,f.draft)),run=await runStakeholderSimulation(input,{attemptId:'society-graph-fixture',provider:'offline-mock',model:'mock',generateTurn:async c=>deterministicTurn(c)});const base=await projectPrimaryWorldGraph(run);
 const w=advanceSociety(createSociety({runId:run.runId,question:f.request.question,seed:'graph',population:population(),roles:f.draft.agents,jurisdictions:f.draft.jurisdictions,acceptedActions:run.events.map(e=>({id:e.id,roleId:e.roleId,statement:e.statement,position:e.position}))}),30);
 assert.equal(w.events.filter(e=>e.source==='accepted-model-action').length,8);assert.equal(new Set(w.events.filter(e=>e.sourceEventId).map(e=>e.sourceEventId)).size,8);const g=projectSocietyGraph(base.graph,w);for(const a of w.agents)assert.ok(g.nodes.some(n=>n.id===a.id&&n.properties.agentId===a.id));assert.ok(!g.nodes.some(n=>w.events.some(e=>e.id===n.id)));assert.ok(g.edges.some(e=>e.relationshipLabel==='RECORDED_SOCIAL_INTERACTION'));assert.deepEqual(projectSocietyGraph({...base.graph,executionIdentity:'different'},w),{...base.graph,executionIdentity:'different'});
});
test('opinions do not derive from sex or age and zero activation still advances explicit time',()=>{const a=world(),input=structuredClone(a.genesis.input);input.population.residents.forEach(r=>{r.sex=r.sex==='male'?'female':'male';if(Number(r.ageGroup.split('_')[0])>=20)r.ageGroup='80_84';});const b=createSociety(input);assert.deepEqual(a.agents.map(a=>a.initialOpinion),b.agents.map(a=>a.initialOpinion));const none=advanceSociety(createSociety({...a.genesis.input,config:{activation:0}}),10);assert.equal(none.events.length,0);assert.equal(none.tick,10);});
test('runtime transitions reject dangling context, invented location and duplicate model-source IDs',()=>{
 const w=world(),actorId=w.agents[0].id;
 assert.throws(()=>act(w,{actorId,type:'activity',location:'unknown' as any}));
 assert.throws(()=>act(w,{actorId,type:'post',platform:'reddit',text:'Fictional post',targetId:'invented'}));
 assert.throws(()=>act(w,{actorId,type:'post',platform:'reddit',text:'Fictional post',parentId:'invented'}));
 assert.throws(()=>act(w,{actorId,type:'inactive',platform:'unknown' as any}));
 const e={id:'accepted-source',roleId:w.genesis.input.roles[0].id,statement:'An accepted fictional statement.',position:'conditional'};
 assert.throws(()=>createSociety({...w.genesis.input,acceptedActions:[e,e]}));
 assert.equal(w.events.length,0);
});
test('new sharing policy preserves encountered source position without changing the sharer opinion',()=>{
 const seed=createSociety({...world().genesis.input,sharePolicy:'source-position-v1'}),author=seed.agents[1],reader=seed.agents[0];
 let w=act(seed,{actorId:author.id,type:'post',platform:'instagram',text:'A fictional concern about the change.',position:-0.8});const original=w.items.at(-1)!;
 w=act(w,{actorId:reader.id,type:'read',platform:'instagram',targetId:original.id});
 w=act(w,{actorId:reader.id,type:'share',platform:'reddit',targetId:original.id});
 assert.equal(w.genesis.version,3);assert.equal(w.items.at(-1)!.position,-0.8);assert.equal(w.events.at(-1)!.position,-0.8);
 assert.equal(w.agents.find(a=>a.id===reader.id)!.opinion,reader.opinion);
 assert.throws(()=>act(w,{actorId:reader.id,type:'share',platform:'reddit',targetId:original.id,position:0.9}));
});
test('legacy sharing and saved identities replay unchanged; new policy is explicit and replayable',()=>{
 const old=world(),author=old.agents[1],reader=old.agents[0];let w=act(old,{actorId:author.id,type:'post',platform:'instagram',text:'A fictional concern.',position:-0.8});const original=w.items.at(-1)!;
 w=act(w,{actorId:reader.id,type:'read',platform:'instagram',targetId:original.id});w=act(w,{actorId:reader.id,type:'share',platform:'reddit',targetId:original.id});assert.equal(w.items.at(-1)!.position,reader.opinion);
 const legacy=advanceSociety(old,40),current=advanceSociety(createSociety({...old.genesis.input,sharePolicy:'source-position-v1'}),40);
 assert.deepEqual(restoreSociety(saveSociety(legacy),legacy.genesis),legacy);assert.deepEqual(restoreSociety(saveSociety(current),current.genesis),current);
 assert.throws(()=>restoreSociety(saveSociety(legacy),current.genesis));
 for(const e of current.events.filter(e=>e.type==='share'))assert.equal(current.items.find(i=>i.id===e.id)!.position,current.items.find(i=>i.id===e.targetId)!.position);
});
test('UI restoration retains version-one/two worlds and refuses unrelated policy migrations',()=>{
 for(const geography of [undefined,buildSocietyGeography()]){
  const old=advanceSociety(createSociety({...world().genesis.input,...(geography?{geography}:{})}),20);
  const current=createSociety({...old.genesis.input,geography:buildSocietyGeography(),sharePolicy:'source-position-v1'});
  assert.deepEqual(restoreSocietyForInput(saveSociety(old),current.genesis),old);
  const different=createSociety({...current.genesis.input,seed:'unrelated'});
  assert.throws(()=>restoreSocietyForInput(saveSociety(old),different.genesis));
 }
 assert.throws(()=>createSociety({...world().genesis.input,sharePolicy:'invented' as any}));
});
