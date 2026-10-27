import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { localMetres, citizenAppearance, createCitizenScene, mercatorUnitsPerMetre, rayFromProjection } from '../../citizens/scene.ts';

test('geographic local frame preserves east/north/up and WGS84 origin without swapping axes', () => {
  const origin = { lon: 103.85, lat: 1.37 };
  assert.deepEqual(localMetres(origin, origin), { x: 0, y: 0, z: 0 });
  const east = localMetres({ lon: 103.851, lat: 1.37 }, origin);
  const north = localMetres({ lon: 103.85, lat: 1.371 }, origin);
  assert.ok(Math.abs(east.x - 111.28) < .3); assert.equal(east.y, 0);
  assert.ok(Math.abs(north.y - 111.32) < .3); assert.equal(north.x, 0);
  assert.equal(east.z, 0);
});

test('Mercator scale cancels local latitude scale instead of doubling it',()=>{
  assert.ok(Math.abs(mercatorUnitsPerMetre(60)/mercatorUnitsPerMetre(0)-2)<1e-12);
  const origin={lon:103.85,lat:60},target={lon:103.851,lat:60};
  const delta=localMetres(target,origin).x*mercatorUnitsPerMetre(60);
  assert.ok(Math.abs(delta-(target.lon-origin.lon)/360)<1e-14);
});

test('picking tolerates an infinite far plane and updated instance positions',()=>{
  const rig=createCitizenScene(2), origin={lon:103.85,lat:1.37};
  const sample={position:origin,headingRadians:0,state:'idle' as const,progress:0,limbPhase:0};
  rig.setCitizen(0,'agent-one',sample,origin,0,false,false);rig.finish(1,true);rig.scene.updateMatrixWorld(true);
  const camera=new THREE.PerspectiveCamera(45,1,.1,1000);
  // Analytic OpenGL infinite-far limit; Three's camera constructor needs a finite far.
  camera.projectionMatrix.elements[10]=-1;camera.projectionMatrix.elements[14]=-.2;
  camera.position.set(0,-20,8);camera.up.set(0,0,1);camera.lookAt(0,0,8);camera.updateMatrixWorld(true);
  const projection=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  const ray=rayFromProjection(0,0,projection.clone().invert());
  assert.ok(Number.isFinite(ray.ray.direction.x));
  assert.equal(ray.intersectObject(rig.parts[0].mesh)[0]?.instanceId,0);
  const moved={...sample,position:{lon:103.851,lat:1.37}};
  rig.setCitizen(0,'agent-one',moved,origin,0,false,false);rig.finish(1,true);rig.scene.updateMatrixWorld(true);
  const x=localMetres(moved.position,origin).x;camera.position.x=x;camera.lookAt(x,0,8);camera.updateMatrixWorld(true);
  projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  assert.equal(rayFromProjection(0,0,projection.clone().invert()).intersectObject(rig.parts[0].mesh)[0]?.instanceId,0);
  rig.dispose();
});
test('appearance is deterministic per ID with variation and has no demographic input', () => {
  assert.deepEqual(citizenAppearance('syn-0123456789abcdef-1'), citizenAppearance('syn-0123456789abcdef-1'));
  const colors = new Set(Array.from({ length: 30 }, (_, i) => citizenAppearance(`syn-0123456789abcdef-${i + 1}`).shirt));
  assert.ok(colors.size >= 4);
});
test('scene batches procedural body parts using shared geometry and idempotently disposes owned resources', () => {
  const rig = createCitizenScene(180);
  assert.equal(rig.parts.length, 12);
  assert.equal(new Set(rig.parts.map((p: any) => p.mesh.geometry)).size, 1);
  assert.equal(rig.parts[0].mesh.instanceMatrix.count, 180);
  let geometryDisposals = 0, materialDisposals = 0;
  rig.geometry.addEventListener('dispose', () => geometryDisposals++);
  rig.material.addEventListener('dispose', () => materialDisposals++);
  rig.dispose(); rig.dispose();
  assert.equal(geometryDisposals, 1); assert.equal(materialDisposals, 1);
  assert.equal(rig.scene.children.length, 0);
  assert.throws(() => createCitizenScene(301));
});
