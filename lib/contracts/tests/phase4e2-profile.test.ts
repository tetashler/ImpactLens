import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as swarm from '../../society/swarm.ts';
import {phase4dWorld} from './phase4d-fixture.ts';
import {createSociety,advanceSociety,saveSociety,restoreSociety,act,stepSociety,multiDayComplete} from '../../society/engine.ts';

const factory=()=>{assert.equal(typeof swarm.multiDaySwarmPolicy,'function','multi-day profile factory is missing');return swarm.multiDaySwarmPolicy;};
function input(active:50|100=50,steps:160|320|672=320){const base=phase4dWorld(active).genesis.input,p=factory()(active,70,steps);return {...base,swarm:p,hybrid:swarm.swarmHybrid(p),intelligence:{...base.intelligence!,memory:'episodic-topic-v2' as const},config:{...base.config,steps}};}

test('new horizons resolve immutable allowlisted capacities without changing legacy clocks',async()=>{
 for(const active of [50,100] as const)for(const steps of [160,320,672] as const){const w=createSociety(input(active,steps)),{getExecutionProfile,executionLimits}=await import('../../society/execution-profile.ts'),p=getExecutionProfile(w)!;
  assert.equal(w.genesis.config.steps,steps);assert.equal(p.decisions,active===50?350:700);assert.equal(p.modelAgents,active===50?35:70);assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.limits)&&Object.isFrozen(p.calendar));assert.equal(executionLimits(w).replayIterations,steps+(active===50?350:700)+32);
  assert.equal(p.availabilityPolicy,'seeded-rest-v1');assert.equal(p.pacingPolicy,'grant-release-v1');assert.equal(p.routinePolicy,'availability-routine-v1');assert.equal(p.memoryPolicy,'episodic-topic-v2');assert.deepEqual(p.publicSchema,{exploreVersion:3,societyVersion:2,jobVersion:1,clockVersion:1});assert.ok(Object.isFrozen(p.publicSchema));
 }
 const legacy=phase4dWorld(50).genesis.input,p=swarm.deepSwarmPolicy(50);assert.throws(()=>createSociety({...legacy,swarm:p,hybrid:swarm.swarmHybrid(p),intelligence:{...legacy.intelligence!,memory:'episodic-topic-v2'},config:{...legacy.config,steps:320}}));
});

test('profile selectors cannot override fixed policy values or enable arbitrary horizons and capacities',()=>{
 const i=input(),p=i.swarm;assert.throws(()=>createSociety({...i,config:{...i.config,steps:321}}));assert.throws(()=>createSociety({...i,config:{...i.config,steps:160}}));
 assert.throws(()=>swarm.validateSwarm({...p,multiDay:{...p.multiDay!,profileId:'multi-day-50-1400-v1'}}));
 assert.throws(()=>swarm.validateSwarm({...p,cooldownTicks:1}));assert.throws(()=>swarm.validateSwarm({...p,deep:{...p.deep!,maxDecisions:700}}));
 assert.throws(()=>createSociety({...i,hybrid:{...i.hybrid,maxCalls:175}}));
 assert.throws(()=>factory()(50,-1));assert.throws(()=>factory()(50,1.5));assert.throws(()=>factory()(50,350,80 as 320));assert.equal(factory()(50,700).multiDay!.pacingTarget,350);
});

test('extended rule worlds round-trip after the legacy 144-tick boundary',()=>{
 const i=input(50,160),w=advanceSociety(createSociety({...i,swarm:factory()(50,0,160)}),160);assert.equal(w.tick,160);assert.equal(w.status,'complete');assert.deepEqual(restoreSociety(saveSociety(w)),w);
 const legacy=phase4dWorld(50);assert.throws(()=>advanceSociety(legacy,160));
});

test('new event and item exhaustion return stable truthful terminal states',async()=>{
 let w=createSociety(input());const {executionLimits}=await import('../../society/execution-profile.ts'),limits=executionLimits(w),actorId=w.agents[0].id,platform=w.genesis.input.communication!.channels.find(c=>c.style!=='private-group')!.id;
 const events={...w,events:Array.from({length:limits.events},(_,n)=>({...w.events[0],id:'capacity-'+n}))};const eventLimited=act(events,{actorId,type:'inactive',platform});assert.equal(eventLimited.status,'event-limit');assert.equal(stepSociety(eventLimited),eventLimited);
 const items={...w,items:Array.from({length:limits.items},(_,n)=>({...w.items[0],id:'item-capacity-'+n}))};const itemLimited=act(items,{actorId,type:'post',platform,text:'A legitimate bounded post.'});assert.equal(itemLimited.status,'item-limit');assert.equal(itemLimited.items.length,2048);assert.equal(stepSociety(itemLimited),itemLimited);
});

test('the last permitted private message marks item exhaustion immediately',async()=>{
 const original=createSociety(input()),group=original.groups![0],actorId=group.creatorId,w={...original,items:Array.from({length:2047},(_,n)=>({...original.items[0],id:'private-capacity-'+n}))};
 const result=act(w,{actorId,type:'message',platform:group.platform,groupId:group.id,text:'A legitimate final private item.'});assert.equal(result.items.length,2048);assert.equal(result.status,'item-limit');assert.equal(stepSociety(result),result);
});

test('final-tick capacity exhaustion remains a limited terminal rather than natural completion',()=>{
 const w={...createSociety(input()),tick:320};for(const status of ['event-limit','item-limit'] as const)assert.equal(multiDayComplete({...w,status}),false);
 const legacy=phase4dWorld(50);assert.equal(multiDayComplete({...legacy,tick:80,status:'event-limit'}),true,'legacy coarse-clock completion semantics remain unchanged');
});
