import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraCoordinator,fitSingapore,SINGAPORE_BOUNDS,LANDING_CAMERA} from '../../map-camera.ts';
function port(){const calls:{type:string;bounds?:unknown;options?:Record<string,unknown>}[]=[];return {calls,stop(){calls.push({type:'stop'});},fitBounds(bounds:unknown,options:Record<string,unknown>){calls.push({type:'fit',bounds,options});},easeTo(options:Record<string,unknown>){calls.push({type:'ease',options});}};}
test('latest camera command waits for map readiness and applies only once to its owned map',()=>{
  const map=port(),camera=new CameraCoordinator();camera.request({id:1,target:'landing'});camera.request({id:2,target:'singapore'});
  assert.equal(camera.apply(null,false,false),false);assert.equal(camera.apply(map,false,false),false);assert.equal(map.calls.length,0);
  assert.equal(camera.apply(map,true,false),true);assert.deepEqual(map.calls.map(c=>c.type),['stop','fit']);assert.deepEqual(map.calls[1].bounds,[[103.62,1.235],[104.03,1.465]]);
  assert.equal(camera.apply(map,true,false),false);camera.request({id:2,target:'singapore'});assert.equal(camera.apply(map,true,false),false);
  camera.request({id:1,target:'landing'});assert.equal(camera.apply(map,true,false),false);
});
test('return to landing interrupts the old transition; reduced motion uses zero duration and remount replays latest command',()=>{
  const map=port(),camera=new CameraCoordinator();camera.request({id:1,target:'singapore'});camera.apply(map,true,false);
  assert.ok(Number(map.calls[1].options?.duration)>0);camera.request({id:2,target:'landing'});camera.apply(map,true,true);
  assert.deepEqual(map.calls.map(c=>c.type),['stop','fit','stop','ease']);assert.deepEqual(map.calls[3].options,{...LANDING_CAMERA,duration:0});
  const replacement=port();assert.equal(camera.apply(replacement,true,true),true);assert.equal(replacement.calls[1].options?.duration,0);
});
test('Fit Singapore and requested Singapore view share bounds and do not mutate constants',()=>{
  const map=port();fitSingapore(map,true);assert.deepEqual(map.calls[1].bounds,SINGAPORE_BOUNDS);assert.equal(map.calls[1].options?.duration,0);
  (map.calls[1].bounds as number[][])[0][0]=0;assert.equal(SINGAPORE_BOUNDS[0][0],103.62);
});
