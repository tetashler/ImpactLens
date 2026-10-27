import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCitizenViewPair, getCitizenProfile, selectCitizenSample } from '../../citizens/data.ts';
import { citizenViewPairFixture } from '../../citizens/fixtures.ts';
import { PlaybackClock, sampleCitizenAnimation } from '../../citizens/playback.ts';
import { parseCitizenProfile } from '../citizen-simulation.ts';

test('validated pair owns an immutable copy and matches citizen identity by ID', () => {
  const input=structuredClone(citizenViewPairFixture);
  input.scenario.citizens.reverse();
  const result=parseCitizenViewPair(input);
  input.baseline.citizens[0].weight=999;
  assert.equal(result.baseline.citizens[0].weight,100);
  assert.ok(Object.isFrozen(result.baseline.citizens[0].demographic));
  const wrong=structuredClone(citizenViewPairFixture);
  wrong.scenario.citizens[0].demographic.sex='female';
  assert.throws(()=>parseCitizenViewPair(wrong), /identity/);
  const changedSeed=structuredClone(citizenViewPairFixture);
  changedSeed.scenario.metadata.population.seed='other';
  assert.throws(()=>parseCitizenViewPair(changedSeed), /population/);
});

test('fixture conserves the full population and profiles preserve missing activity details', () => {
  for (const payload of [citizenViewPairFixture.baseline,citizenViewPairFixture.scenario]) {
    assert.equal(payload.citizens.length,180);
    assert.equal(payload.citizens.reduce((sum,c)=>sum+c.weight,0),9000);
    assert.deepEqual(payload.metrics,[]);
    assert.ok(payload.animations.every(a=>a.position!==null));
    for (const citizen of payload.citizens) {
      const profile=getCitizenProfile(payload,citizen.agentId)!;
      assert.equal(parseCitizenProfile(profile),profile);
      assert.equal(profile.activity.description,profile.journey?.assignment==='hypothetical'?'Illustrative station endpoints; not observed commuting behaviour.':null);
      assert.deepEqual(profile.activity.destinationCategories,[]);
      assert.equal(profile.activity.status,profile.journey?.assignment ?? 'unassigned');
    }
    assert.equal(getCitizenProfile(payload,'missing'),null);
  }
  assert.notDeepEqual(citizenViewPairFixture.baseline.animations[0].waypoints,citizenViewPairFixture.scenario.animations[0].waypoints);
});

test('stable sample keeps IDs across reordered views and excludes absent positions only from rendering', () => {
  const input=structuredClone(citizenViewPairFixture);
  input.scenario.citizens.reverse();
  input.scenario.animations[0].position=null;
  input.scenario.animations[0].state='idle';
  const pair=parseCitizenViewPair(input);
  const ids=selectCitizenSample(pair,12);
  assert.equal(ids.length,12);
  assert.ok(!ids.includes(input.scenario.animations[0].agentId));
  assert.deepEqual(ids,selectCitizenSample(pair,12));
  assert.ok(getCitizenProfile(pair.scenario,input.scenario.animations[0].agentId));
  assert.equal(pair.scenario.metadata.population.agentCount,180);
  assert.throws(()=>selectCitizenSample(pair,301));
});

test('animation uses supplied path with idle, movement, arrival and destination states', () => {
  const animation=structuredClone(citizenViewPairFixture.baseline.animations[0]);
  animation.position={lon:103,lat:1};
  animation.waypoints=[{lon:103,lat:1},{lon:103,lat:1},{lon:103.01,lat:1}];
  assert.equal(sampleCitizenAnimation(animation,1).state,'idle');
  const halfway=sampleCitizenAnimation(animation,44.5);
  assert.equal(halfway.state,'travelling');
  assert.ok(Math.abs(halfway.position!.lon-103.005)<1e-8);
  assert.equal(halfway.headingRadians,0);
  assert.equal(sampleCitizenAnimation(animation,88).state,'arriving');
  assert.deepEqual(sampleCitizenAnimation(animation,200).position,{lon:103.01,lat:1});
  assert.equal(sampleCitizenAnimation(animation,200).state,'idle');
  const paused=sampleCitizenAnimation(animation,30,{playing:false});
  assert.equal(paused.state,'paused');
  assert.equal(paused.limbPhase,0);
  assert.equal(sampleCitizenAnimation(animation,5,{offsetSeconds:10}).state,'idle');
  animation.waypoints=[]; animation.state='idle';
  assert.deepEqual(sampleCitizenAnimation(animation,40).position,animation.position);
  animation.position=null;
  assert.equal(sampleCitizenAnimation(animation,40).position,null);
});

test('clock preserves pause, speed, reset and disposal and clamps hidden-tab gaps', () => {
  const clock=new PlaybackClock();
  assert.deepEqual(clock.tick(0),{elapsedSeconds:0,playing:false,speed:1});
  clock.play(0);
  assert.equal(clock.tick(100).elapsedSeconds,.1);
  clock.setSpeed(2,100);
  assert.ok(Math.abs(clock.tick(200).elapsedSeconds-.3)<1e-12);
  clock.pause(200);
  assert.ok(Math.abs(clock.tick(5000).elapsedSeconds-.3)<1e-12);
  clock.play(5000);
  assert.equal(clock.tick(10000).elapsedSeconds,.8);
  clock.reset(10000);
  assert.equal(clock.tick(10100).elapsedSeconds,0);
  clock.play(10100); clock.dispose();
  assert.equal(clock.tick(10200).elapsedSeconds,0);
  assert.throws(()=>clock.setSpeed(0,10200));
});

test('profiles never manufacture animation for absent data and leave unavailable journeys idle',()=>{
  const payload=structuredClone(citizenViewPairFixture.baseline);
  const id=payload.citizens[0].agentId;
  payload.animations=payload.animations.filter(a=>a.agentId!==id);
  assert.equal(getCitizenProfile(payload,id)!.animation,null);
  const other=payload.citizens[1].agentId;
  payload.journeys=payload.journeys.filter(j=>j.agentId!==other);
  const animation=payload.animations.find(a=>a.agentId===other)!;
  animation.journeyId=null; animation.state='idle'; animation.waypoints=[]; animation.visualisation.geometry='none';
  assert.equal(getCitizenProfile(payload,other)!.animation!.state,'idle');
  assert.equal(getCitizenProfile(payload,payload.citizens[3].agentId)!.animation!.state,'idle');
  assert.equal(Object.isFrozen(payload.metadata),false);
});

test('stationary and unassigned animations stay finite without making paths',()=>{
  const animation=structuredClone(citizenViewPairFixture.baseline.animations[0]);
  animation.waypoints=[{lat:1.37,lon:103.85},{lat:1.37,lon:103.85}];
  const stationary=sampleCitizenAnimation(animation,40);
  assert.deepEqual(stationary.position,{lat:1.37,lon:103.85});
  assert.ok(Number.isFinite(stationary.headingRadians));
  const unassigned=citizenViewPairFixture.baseline.animations[2];
  assert.equal(sampleCitizenAnimation(unassigned,40).state,'unassigned');
  assert.deepEqual(sampleCitizenAnimation(unassigned,40).position,unassigned.position);
  const walking=citizenViewPairFixture.baseline.animations[1];
  assert.equal(sampleCitizenAnimation(walking,40).state,'walking');
  assert.throws(()=>sampleCitizenAnimation(animation,NaN));
});

test('valid polar coordinates remain inspectable but are omitted from Mercator rendering',()=>{
  const input=structuredClone(citizenViewPairFixture),id=input.baseline.citizens[2].agentId;
  input.baseline.animations[2].position={lat:90,lon:0};
  input.scenario.animations[2].position={lat:90,lon:0};
  const pair=parseCitizenViewPair(input);
  assert.ok(!selectCitizenSample(pair).includes(id));
  assert.equal(getCitizenProfile(pair.baseline,id)!.animation!.position!.lat,90);
  assert.equal(pair.baseline.citizens.length,180);
});
