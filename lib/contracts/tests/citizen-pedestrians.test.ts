import test from 'node:test';
import assert from 'node:assert/strict';
import { compilePedestrianPath, illustrativePedestrianActors, illustrativePedestrianPaths, samplePedestrianMotion } from '../../citizens/pedestrians.ts';
import { citizenViewPairFixture } from '../../citizens/fixtures.ts';
import {sampleCitizenAnimation} from '../../citizens/playback.ts';

// A ten-metre square at the equator gives independent, hand-calculable distances.
const degree=180/(Math.PI*6371008.8);
const square={id:'test',areaId:'test',areaLabel:'Test',focus:{lon:0,lat:0},waypoints:[
  {lon:0,lat:0},{lon:10*degree,lat:0},{lon:10*degree,lat:10*degree},{lon:0,lat:10*degree},
]};
const actor={agentId:'test',pathId:'test',speedMetresPerSecond:1.25,startDistanceMetres:1,direction:1 as const};
const metres=(a:{lon:number;lat:number},b:{lon:number;lat:number})=>Math.hypot((b.lon-a.lon)/degree*Math.cos((a.lat+b.lat)*Math.PI/360),(b.lat-a.lat)/degree);

test('exported fixture paths start at each actor position even without the local looping opt-in',()=>{
  for(const a of citizenViewPairFixture.baseline.animations){if(a.waypoints.length){assert.deepEqual(a.waypoints[0],a.position);assert.deepEqual(sampleCitizenAnimation(a,0).position,a.position);}}
});

test('closed paths use metre arc lengths and time, independent of sample cadence',()=>{
  const path=compilePedestrianPath(square);
  assert.ok(Math.abs(path.totalLengthMetres-40)<1e-8);
  const start=samplePedestrianMotion(path,actor,0),after=samplePedestrianMotion(path,actor,4);
  assert.ok(Math.abs(after.position!.lon/degree-6)<1e-9);
  assert.ok(Math.abs(metres(start.position!,after.position!)-5)<1e-8);
  assert.equal(after.state,'walking');assert.equal(after.headingRadians,0);
  for(let frame=0;frame<240;frame++)samplePedestrianMotion(path,actor,frame/60);
  assert.deepEqual(samplePedestrianMotion(path,actor,4),after);
  assert.ok(metres(samplePedestrianMotion(path,actor,4).position!,samplePedestrianMotion(path,actor,36).position!)<1e-8);
  assert.ok(metres(samplePedestrianMotion(path,actor,90).position!,samplePedestrianMotion(path,actor,95).position!)>4);
});

test('reverse travel, loop wrap and pause preserve position and gait phase',()=>{
  const path=compilePedestrianPath(square),reverse={...actor,direction:-1 as const};
  const backwards=samplePedestrianMotion(path,reverse,4);
  assert.ok(Math.abs(backwards.position!.lon)<1e-12);
  assert.ok(Math.abs(backwards.position!.lat/degree-4)<1e-8);
  const elapsed=(path.totalLengthMetres-actor.startDistanceMetres)/actor.speedMetresPerSecond;
  const before=samplePedestrianMotion(path,actor,elapsed-.001),after=samplePedestrianMotion(path,actor,elapsed+.001);
  assert.ok(metres(before.position!,after.position!)<.0026,'wrap must traverse the closing segment without teleporting');
  const moving=samplePedestrianMotion(path,actor,3.3),paused=samplePedestrianMotion(path,actor,3.3,{playing:false});
  assert.deepEqual(paused,{...moving,state:'paused'});
});

test('invalid paths, invalid actors and non-finite clocks fail before producing matrices',()=>{
  for(const waypoints of [[],[{lon:0,lat:0}],[{lon:0,lat:0},{lon:0,lat:0}], [{lon:NaN,lat:0},{lon:1,lat:1}], [{lon:181,lat:0},{lon:1,lat:1}]]){
    assert.throws(()=>compilePedestrianPath({...square,waypoints}),/path/i);
  }
  const path=compilePedestrianPath(square);
  for(const elapsed of [NaN,Infinity,-Infinity,-1])assert.throws(()=>samplePedestrianMotion(path,actor,elapsed),/clock/i);
  for(const speedMetresPerSecond of [0,-1,NaN,Infinity])assert.throws(()=>samplePedestrianMotion(path,{...actor,speedMetresPerSecond},0),/actor/i);
  assert.throws(()=>samplePedestrianMotion(path,{...actor,startDistanceMetres:Infinity},0),/actor/i);
  assert.throws(()=>samplePedestrianMotion(path,{...actor,direction:0 as 1},0),/actor/i);
  assert.throws(()=>samplePedestrianMotion(path,{...actor,pathId:'other'},0),/actor/i);
  for(const elapsed of [1e12,Number.MAX_VALUE]){
    const sample=samplePedestrianMotion(path,actor,elapsed);
    assert.ok(Object.values(sample.position!).every(Number.isFinite));
    assert.ok(Number.isFinite(sample.headingRadians)&&Number.isFinite(sample.limbPhase));
    assert.ok(sample.progress>=0&&sample.progress<1);
  }
});

test('180 independent actors spread across five areas with separated starts and smooth loop seams',()=>{
  assert.equal(illustrativePedestrianActors.length,180);
  assert.equal(new Set(illustrativePedestrianActors.map(a=>a.agentId)).size,180);
  assert.deepEqual([...new Set(illustrativePedestrianPaths.map(p=>p.areaId))],['tiong-bahru','sengkang','tampines','downtown','ang-mo-kio']);
  assert.equal(illustrativePedestrianPaths.length,10);
  const compiled=new Map(illustrativePedestrianPaths.map(p=>[p.id,compilePedestrianPath(p)]));
  const counts=new Map<string,number>();
  const initial=illustrativePedestrianActors.map((a,i)=>{
    assert.equal(a.agentId,`syn-a4b1800000000000-${i+1}`);
    assert.ok(a.speedMetresPerSecond>=.95&&a.speedMetresPerSecond<=1.55);
    const path=compiled.get(a.pathId)!;counts.set(path.areaId,(counts.get(path.areaId)??0)+1);
    const sample=samplePedestrianMotion(path,a,0);
    assert.deepEqual(citizenViewPairFixture.baseline.animations[i].position,sample.position);
    assert.deepEqual(citizenViewPairFixture.scenario.animations[i].position,sample.position);
    const later=samplePedestrianMotion(path,a,5);
    assert.ok(metres(sample.position!,later.position!)>3.5,'five seconds must move the root in geographic metres');
    return sample.position!;
  });
  assert.deepEqual([...counts.values()],[36,36,36,36,36]);
  for(let i=0;i<initial.length;i++)for(let j=i+1;j<initial.length;j++)assert.ok(metres(initial[i],initial[j])>=3,'initial roots need three metres of separation');
  for(const path of compiled.values()){
    const probe={...actor,pathId:path.id,startDistanceMetres:0};
    const period=path.totalLengthMetres/probe.speedMetresPerSecond;
    const before=samplePedestrianMotion(path,probe,period-.001),after=samplePedestrianMotion(path,probe,.001);
    const angle=Math.abs(Math.atan2(Math.sin(after.headingRadians-before.headingRadians),Math.cos(after.headingRadians-before.headingRadians)));
    assert.ok(angle<.18,'closed visual paths must avoid endpoint heading flips');
    assert.ok(metres(before.position!,after.position!)<.003);
  }
});
