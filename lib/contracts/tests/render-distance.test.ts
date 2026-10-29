import test from 'node:test';
import assert from 'node:assert/strict';
import {RENDER_DISTANCE,renderDistanceMinZoom,renderDistanceLabel} from '../../buildings/display-policy.ts';

test('render distance defaults to 14.5 and increases visibility towards Far',()=>{
 assert.equal(renderDistanceMinZoom(RENDER_DISTANCE.defaultValue),14.5);
 assert.deepEqual(Array.from({length:8},(_,value)=>renderDistanceMinZoom(value)),[16,15.5,15,14.5,14,13.5,13,12.5]);
 assert.equal(renderDistanceLabel(0),'Near');assert.equal(renderDistanceLabel(3),'Default');assert.equal(renderDistanceLabel(7),'Far');
});

test('render distance rejects unsupported positions instead of altering geometry or camera inputs',()=>{
 for(const value of [-1,8,NaN,Infinity,3.25])assert.throws(()=>renderDistanceMinZoom(value));
});
