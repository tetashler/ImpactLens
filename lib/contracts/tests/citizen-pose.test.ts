import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCitizenScene } from '../../citizens/scene.ts';
import type { AnimationSample } from '../../citizens/playback.ts';

const origin = { lon: 103.85, lat: 1.37 };
const sample: AnimationSample = { position: origin, headingRadians: Math.PI / 2, state: 'walking', progress: .5, limbPhase: 0 };
type Rig = ReturnType<typeof createCitizenScene>;

function part(rig: Rig, name: string) {
  const found = rig.parts.find(p => p.mesh.name === name);
  assert.ok(found, `The rendered rig needs a ${name} part`);
  return found.mesh;
}
function centre(mesh: THREE.InstancedMesh, index = 0) {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  return new THREE.Vector3().setFromMatrixPosition(matrix);
}
function bounds(mesh: THREE.InstancedMesh, index = 0) {
  const matrix = new THREE.Matrix4(), box = new THREE.Box3(), vertex = new THREE.Vector3();
  mesh.getMatrixAt(index, matrix);
  const positions = mesh.geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) box.expandByPoint(vertex.fromBufferAttribute(positions, i).applyMatrix4(matrix));
  return box;
}
function matrices(rig: Rig) {
  return rig.parts.map(p => Array.from(p.mesh.instanceMatrix.array.slice(0, 16)));
}

test('rendered pedestrians are human proportioned, below three metres, and rooted on the supplied ground position', () => {
  const rig = createCitizenScene(30), heights = new Set<number>();
  try {
    for (let i = 0; i < 30; i++) {
      rig.setCitizen(i, `citizen-${i}`, sample, origin, 100, false, true);
      const box = new THREE.Box3();
      for (const p of rig.parts) box.union(bounds(p.mesh, i));
      assert.ok(Math.abs(box.min.z) < 1e-6, `ground ${box.min.z}`);
      assert.ok(box.max.z >= 2.55 && box.max.z <= 2.81, `display height ${box.max.z}`);
      assert.ok(Math.abs((box.min.x + box.max.x) / 2) < .01);
      assert.ok(box.max.x - box.min.x < 1.2);
      heights.add(Math.round(box.max.z * 100));
    }
    assert.ok(heights.size >= 4, 'stable IDs should produce several subtly different heights');
  } finally { rig.dispose(); }
});

test('face and shoes point north at heading pi/2 and east at heading zero', () => {
  const rig = createCitizenScene(1);
  try {
    for (const [heading, axis, other] of [[Math.PI / 2, 'y', 'x'], [0, 'x', 'y']] as const) {
      rig.setCitizen(0, 'direction', { ...sample, headingRadians: heading }, origin, 0, false, false);
      const eyes = centre(part(rig, 'left-eye')).add(centre(part(rig, 'right-eye'))).multiplyScalar(.5);
      const head = centre(part(rig, 'head'));
      assert.ok(eyes[axis] - head[axis] > .15);
      assert.ok(Math.abs(eyes[other] - head[other]) < 1e-6);
      assert.ok(centre(part(rig, 'left-shoe'))[axis] > .05);
    }
  } finally { rig.dispose(); }
});

test('gait uses opposed arms and legs with joint articulation and no foot sinking', () => {
  const rig = createCitizenScene(1);
  try {
    for (let i = 0; i <= 32; i++) {
      const phase = i * Math.PI / 16;
      rig.setCitizen(0, 'gait', { ...sample, limbPhase: phase }, origin, i, false, true);
      for (const p of rig.parts) assert.ok(matricesFor(p.mesh).every(Number.isFinite));
      const left = bounds(part(rig, 'left-shoe')), right = bounds(part(rig, 'right-shoe'));
      assert.ok(left.min.z >= -1e-6 && right.min.z >= -1e-6);
      assert.ok(Math.min(left.min.z, right.min.z) < 1e-6, 'one foot stays planted throughout the step');
      if (i === 8) {
        assert.ok(left.min.z > .08, 'the forward foot clears the ground');
        const leftFoot = centre(part(rig, 'left-shoe')), rightFoot = centre(part(rig, 'right-shoe'));
        const leftHand = centre(part(rig, 'left-hand')), rightHand = centre(part(rig, 'right-hand'));
        assert.ok(leftFoot.y > rightFoot.y + .4);
        assert.ok(leftHand.y < rightHand.y - .35, 'arms oppose their own legs');
        const thigh = new THREE.Matrix4(), shin = new THREE.Matrix4();
        part(rig, 'left-thigh').getMatrixAt(0, thigh); part(rig, 'left-shin').getMatrixAt(0, shin);
        const a = new THREE.Vector3().setFromMatrixColumn(thigh, 2).normalize();
        const b = new THREE.Vector3().setFromMatrixColumn(shin, 2).normalize();
        assert.ok(a.dot(b) < .95, 'the knee bends instead of translating a rigid leg');
      }
    }
  } finally { rig.dispose(); }
});

function matricesFor(mesh: THREE.InstancedMesh) {
  return Array.from(mesh.instanceMatrix.array.slice(0, 16));
}

test('pausing preserves the exact supplied gait pose and elapsed wall time cannot move it', () => {
  const rig = createCitizenScene(1);
  try {
    const walking = { ...sample, limbPhase: 1.13 };
    rig.setCitizen(0, 'paused', walking, origin, 4, false, true);
    const before = matrices(rig);
    rig.setCitizen(0, 'paused', { ...walking, state: 'paused' }, origin, 500, false, false);
    assert.deepEqual(matrices(rig), before);
    rig.setCitizen(0, 'paused', walking, origin, 900, false, false);
    assert.deepEqual(matrices(rig), before);
    rig.setCitizen(0, 'paused', { ...walking, limbPhase: 2.13 }, origin, 900, false, true);
    assert.notDeepEqual(matrices(rig), before);
  } finally { rig.dispose(); }
});

test('body bobs subtly with gait phase while shoes stay grounded and pauses preserve the dip', () => {
  const rig = createCitizenScene(1);
  try {
    rig.setCitizen(0, 'body-bob', sample, origin, 0, false, true);
    const highHead = centre(part(rig, 'head')).z;
    for (const phase of [Math.PI / 4, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      rig.setCitizen(0, 'body-bob', { ...sample, limbPhase: phase }, origin, 50, false, true);
      const left = bounds(part(rig, 'left-shoe')), right = bounds(part(rig, 'right-shoe'));
      assert.ok(left.min.z >= -1e-6 && right.min.z >= -1e-6);
      assert.ok(Math.min(left.min.z, right.min.z) < 1e-6);
    }
    const dippedHead = centre(part(rig, 'head')).z, dipped = matrices(rig);
    assert.ok(highHead - dippedHead > .015 && highHead - dippedHead < .045, 'the body dips a few display centimetres during a wide step');
    rig.setCitizen(0, 'body-bob', { ...sample, limbPhase: Math.PI * 1.5, state: 'paused' }, origin, 500, false, false);
    assert.deepEqual(matrices(rig), dipped);
    rig.setCitizen(0, 'body-bob', sample, origin, 900, false, true);
    assert.equal(centre(part(rig, 'head')).z, highHead);
  } finally { rig.dispose(); }
});

test('rounded limb segments retain a visible joint instead of meeting at a pin point', () => {
  const rig = createCitizenScene(1);
  try {
    rig.setCitizen(0, 'joint', sample, origin, 0, false, false);
    rig.finish(1, true); rig.scene.updateMatrixWorld(true);
    const thigh = part(rig, 'left-thigh'), shin = part(rig, 'left-shin'), matrix = new THREE.Matrix4();
    thigh.getMatrixAt(0, matrix);
    const stature = new THREE.Vector3().setFromMatrixColumn(matrix, 0).length() / .15;
    const alongBone = new THREE.Vector3().setFromMatrixColumn(matrix, 2).normalize();
    const knee = centre(thigh).addScaledVector(alongBone, .2 * stature);
    // A real knee needs volume 3.5 cm away from the bone centre, rather than
    // the zero-radius pole of two capsules touching tip to tip.
    const ray = new THREE.Raycaster(new THREE.Vector3(knee.x + .035 * stature, knee.y - stature, knee.z), new THREE.Vector3(0, 1, 0));
    const hits = ray.intersectObjects([thigh, shin]);
    assert.ok(hits.length >= 2, 'joint surfaces must cover an off-centre ray');
    assert.ok(hits.at(-1)!.distance - hits[0].distance > .025 * stature);
  } finally { rig.dispose(); }
});

test('same IDs retain scale and instance colors across slots and frames', () => {
  const rig = createCitizenScene(3);
  try {
    rig.setCitizen(0, 'same-id', sample, origin, 0, false, false);
    rig.setCitizen(1, 'same-id', sample, origin, 20, false, false);
    rig.setCitizen(2, 'different-id', sample, origin, 20, false, false);
    let varied = false;
    for (const p of rig.parts) {
      const a = new THREE.Matrix4(), b = new THREE.Matrix4();
      p.mesh.getMatrixAt(0, a); p.mesh.getMatrixAt(1, b); assert.deepEqual(a.elements, b.elements);
      const colors = p.mesh.instanceColor!, before = Array.from(colors.array);
      const first = new THREE.Color(), second = new THREE.Color(), third = new THREE.Color();
      p.mesh.getColorAt(0, first); p.mesh.getColorAt(1, second); p.mesh.getColorAt(2, third);
      assert.deepEqual(first, second); varied ||= !first.equals(third);
      rig.setCitizen(0, 'same-id', sample, origin, 99, false, true);
      assert.equal(p.mesh.instanceColor, colors); assert.deepEqual(Array.from(colors.array), before);
    }
    assert.ok(varied);
  } finally { rig.dispose(); }
});
