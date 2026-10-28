import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaybackClock, sampleCitizenAnimation } from '../../citizens/playback.ts';
import { illustrativeCitizenSimulation } from '../citizen-simulation.fixtures.ts';

test('visible playback time is independent of frame cadence, including slow rendering',()=>{
  const run=(fps:number)=>{const clock=new PlaybackClock();clock.play(0);for(let frame=1;frame<=fps*5;frame++)clock.tick(frame*1000/fps);return clock.tick(5000).elapsedSeconds;};
  for(const fps of [2,10,30,60,144])assert.ok(Math.abs(run(fps)-5)<1e-10,`clock drift at ${fps} FPS`);
});
test('explicit hidden/disabled pause excludes hidden time without dropping subsequent visible seconds',()=>{
  const clock=new PlaybackClock();clock.play(0);clock.pause(1200);clock.tick(100000);clock.play(100000);
  assert.ok(Math.abs(clock.tick(101200).elapsedSeconds-2.4)<1e-10);
});
test('pause freezes exact elapsed time and reset restores zero before repeat playback',()=>{
  const clock=new PlaybackClock();clock.play(100);clock.tick(1500);clock.pause(1500);const paused=clock.tick(1600).elapsedSeconds;
  assert.equal(clock.tick(100000).elapsedSeconds,paused);clock.reset(100000);assert.equal(clock.tick(100500).elapsedSeconds,0);
  clock.play(100500);assert.ok(Math.abs(clock.tick(101900).elapsedSeconds-paused)<1e-10);
});
test('pausing a supplied animation retains its walking phase rather than snapping to an idle pose',()=>{
  const animation=illustrativeCitizenSimulation.animations[0];
  const moving=sampleCitizenAnimation(animation,30.25,{playing:true}),paused=sampleCitizenAnimation(animation,30.25,{playing:false});
  assert.notEqual(moving.limbPhase,0);assert.equal(paused.limbPhase,moving.limbPhase);assert.deepEqual(paused.position,moving.position);
});
