import * as THREE from 'three';
import type { Wgs84Position } from '../contracts/citizen-simulation.ts';
import type { AnimationSample } from './playback.ts';
const R = 6371008.8, rad = Math.PI / 180;
export function mercatorUnitsPerMetre(latitude:number) { return 1/(Math.cos(latitude*rad)*2*Math.PI*R); }
export function rayFromProjection(x:number,y:number,inverse:THREE.Matrix4) {
  const near=new THREE.Vector3(x,y,-1).applyMatrix4(inverse),mid=new THREE.Vector3(x,y,0).applyMatrix4(inverse);
  return new THREE.Raycaster(near,mid.sub(near).normalize());
}
/** Local Mercator metres: east, north, up. */
export function localMetres(position: Wgs84Position, origin: Wgs84Position) {
  const scale = Math.cos(origin.lat * rad);
  return { x: R * (position.lon - origin.lon) * rad * scale,
    y: R * (Math.log(Math.tan(Math.PI / 4 + position.lat * rad / 2)) - Math.log(Math.tan(Math.PI / 4 + origin.lat * rad / 2))) * scale, z: 0 };
}
function appearanceHash(agentId: string) {
  let hash = 2166136261;
  for (const c of agentId) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  return hash;
}
function appearanceFromHash(hash: number) {
  // Visual variety uses only the synthetic ID, never citizen demographics.
  return { shirt: ['#718d99','#aa837c','#908b9f','#8c9b87','#b49c76','#b4b0a0'][hash % 6],
    skin: ['#dfb599','#ae7f64','#805c49','#ca9778'][(hash >>> 4) % 4],
    trousers: ['#3a4650','#50534b','#57505a'][(hash >>> 12) % 3],
    hair: ['#403631','#2d3438','#6e5949'][(hash >>> 8) % 3],
    shoes: ['#535d5c','#665d53','#55545e'][(hash >>> 16) % 3] };
}
export function citizenAppearance(agentId: string) { return appearanceFromHash(appearanceHash(agentId)); }

/** Metres before display scaling; the tallest ID is 2.8 m on the map, below low-rise roofs. */
export const CITIZEN_MODEL_HEIGHT = 1.75;
export const CITIZEN_DISPLAY_SCALE = 1.6;
type PartColor = keyof ReturnType<typeof citizenAppearance> | 'eyes';
type Part = { mesh: THREE.InstancedMesh; color: PartColor };

export function createCitizenScene(capacity: number) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 300) throw new Error('Citizen capacity must be 1–300');
  const scene = new THREE.Scene();
  const geometry = new THREE.SphereGeometry(1, 8, 6);
  const hairGeometry = new THREE.SphereGeometry(1, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2);
  const torsoGeometry = new THREE.CylinderGeometry(1, .78, 1, 6).rotateX(Math.PI / 2);
  // Normalized to one unit high/one unit wide, with Z as the long axis.
  const limbGeometry = new THREE.CapsuleGeometry(.5, 1, 2, 6).rotateX(Math.PI / 2).scale(1, 1, .5);
  const geometries = [geometry, hairGeometry, torsoGeometry, limbGeometry];
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, side: THREE.DoubleSide });
  scene.add(new THREE.AmbientLight(0xffffff, 1.8));
  const sun = new THREE.DirectionalLight(0xffeedb, 2.1); sun.position.set(-80,-100,180); scene.add(sun);
  const definitions: [string, THREE.BufferGeometry, PartColor][] = [
    ['head', geometry, 'skin'], ['hair', hairGeometry, 'hair'],
    // Head and torso remain slots 0 and 2 for coarse rendering and picking.
    ['torso', torsoGeometry, 'shirt'], ['pelvis', torsoGeometry, 'trousers'],
    ['left-eye', geometry, 'eyes'], ['right-eye', geometry, 'eyes'],
    ['left-upper-arm', limbGeometry, 'shirt'], ['left-forearm', limbGeometry, 'skin'], ['left-hand', geometry, 'skin'],
    ['right-upper-arm', limbGeometry, 'shirt'], ['right-forearm', limbGeometry, 'skin'], ['right-hand', geometry, 'skin'],
    ['left-thigh', limbGeometry, 'trousers'], ['left-shin', limbGeometry, 'trousers'], ['left-shoe', geometry, 'shoes'],
    ['right-thigh', limbGeometry, 'trousers'], ['right-shin', limbGeometry, 'trousers'], ['right-shoe', geometry, 'shoes'],
  ];
  const parts: Part[] = definitions.map(([name, partGeometry, color]) => {
    const mesh = new THREE.InstancedMesh(partGeometry, material, capacity); mesh.count = 0; mesh.frustumCulled = false; mesh.name = name;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh); return { color, mesh };
  });
  const ringGeometry = new THREE.RingGeometry(.65,.79,32), ringMaterial = new THREE.MeshBasicMaterial({color:'#fff0ac',side:THREE.DoubleSide});
  const ring = new THREE.Mesh(ringGeometry,ringMaterial); ring.visible=false; scene.add(ring);
  const root = new THREE.Object3D(), limb = new THREE.Object3D(), matrix = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 0, 1), delta = new THREE.Vector3();
  const shoulder = new THREE.Vector3(), elbow = new THREE.Vector3(), hand = new THREE.Vector3();
  const hip = new THREE.Vector3(), knee = new THREE.Vector3(), ankle = new THREE.Vector3();
  const appearances = new Map<string, { colors: Record<PartColor, THREE.Color>; scale: number }>();
  const slotIds: (string | undefined)[] = new Array(capacity);
  let colorsDirty = false;

  function store(index: number, partIndex: number) {
    limb.updateMatrix();
    parts[partIndex].mesh.setMatrixAt(index, matrix.multiplyMatrices(root.matrix, limb.matrix));
  }
  function place(index: number, partIndex: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    limb.position.set(x, y, z); limb.quaternion.identity(); limb.scale.set(sx, sy, sz); store(index, partIndex);
  }
  function segment(index: number, partIndex: number, start: THREE.Vector3, end: THREE.Vector3, width: number, depth: number) {
    delta.subVectors(end, start);
    const length = delta.length();
    limb.position.copy(start).add(end).multiplyScalar(.5);
    limb.quaternion.setFromUnitVectors(up, delta.divideScalar(length));
    // Round ends overlap the joint centre; tip-to-tip capsules leave pinched
    // knees/elbows even when their mathematical bone endpoints are connected.
    limb.scale.set(width, depth, length + width * .6); store(index, partIndex);
  }
  function setCitizen(index: number, id: string, sample: AnimationSample, origin: Wgs84Position, _elapsed: number, selected: boolean, _moving: boolean) {
    if (!sample.position) return;
    let appearance = appearances.get(id);
    if (!appearance) {
      const hash = appearanceHash(id), palette = appearanceFromHash(hash);
      appearance = { colors: { shirt: new THREE.Color(palette.shirt), skin: new THREE.Color(palette.skin),
        trousers: new THREE.Color(palette.trousers), hair: new THREE.Color(palette.hair), shoes: new THREE.Color(palette.shoes), eyes: new THREE.Color('#253138') },
        scale: CITIZEN_DISPLAY_SCALE * (.94 + ((hash >>> 20) % 7) * .01) };
      appearances.set(id, appearance);
    }
    const p = localMetres(sample.position, origin);
    // Local +Y faces forward; headings are counterclockwise from geographic east.
    root.position.set(p.x, p.y, 0); root.rotation.set(0, 0, sample.headingRadians - Math.PI / 2); root.scale.setScalar(appearance.scale); root.updateMatrix();
    if (slotIds[index] !== id) {
      for (const part of parts) part.mesh.setColorAt(index, appearance.colors[part.color]);
      slotIds[index] = id; colorsDirty = true;
    }
    // Supplied phase is the entire pose clock. Pausing/reduced motion freezes the
    // sampler, so toggling moving/state cannot reset a mid-stride pose.
    const stride = Math.sin(sample.limbPhase);
    // Two small body dips per gait cycle, lowest at a wide step. The root and
    // stance sole stay at Z=0; lowering the hips also avoids stretching the leg.
    const bodyDrop = .018 * stride * stride;
    place(index, 0, 0, 0, 1.535 - bodyDrop, .163, .143, .195);
    place(index, 1, 0, -.005, 1.62 - bodyDrop, .163, .145, CITIZEN_MODEL_HEIGHT - 1.62);
    place(index, 2, 0, 0, 1.17 - bodyDrop, .22, .135, .48);
    place(index, 3, 0, 0, .925 - bodyDrop, .178, .12, .18);
    place(index, 4, -.061, .133, 1.565 - bodyDrop, .014, .012, .018);
    place(index, 5, .061, .133, 1.565 - bodyDrop, .014, .012, .018);

    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? 1 : -1, x = side === 0 ? -.1 : .1;
      const step = stride * sign, lift = Math.max(0, step) * .075;
      const upperAngle = -.4 * step - .1, lowerAngle = upperAngle + .25;
      shoulder.set(x * 2.45, 0, 1.36 - bodyDrop);
      elbow.set(shoulder.x, .265 * Math.sin(upperAngle), shoulder.z - .265 * Math.cos(upperAngle));
      hand.set(elbow.x, elbow.y + .245 * Math.sin(lowerAngle), elbow.z - .245 * Math.cos(lowerAngle));
      const armPart = 6 + side * 3;
      segment(index, armPart, shoulder, elbow, .125, .12);
      segment(index, armPart + 1, elbow, hand, .096, .09);
      place(index, armPart + 2, hand.x, hand.y, hand.z, .05, .043, .065);

      hip.set(x, 0, .895 - bodyDrop); ankle.set(x, .18 * step, .12 + lift);
      // Equal 0.4 m thigh/shin lengths, solving the knee forward in the YZ
      // plane. Shoes stay level; the stance sole is exactly at local Z=0.
      const dy = ankle.y - hip.y, dz = ankle.z - hip.z, distance = Math.hypot(dy, dz);
      const bend = Math.sqrt(Math.max(0, .4 * .4 - distance * distance / 4));
      knee.set(x, dy / 2 - dz / distance * bend, hip.z + dz / 2 + dy / distance * bend);
      const legPart = 12 + side * 3;
      segment(index, legPart, hip, knee, .15, .15);
      segment(index, legPart + 1, knee, ankle, .125, .125);
      place(index, legPart + 2, x, ankle.y + .055, .065 + lift, .086, .15, .065);
    }
    if(selected) {ring.visible=true;ring.position.set(p.x,p.y,.025);}
  }
  let disposed=false;
  return { scene,geometry,material,parts,ring,setCitizen,
    finish(count:number,detailed:boolean) {
      for(let i=0;i<parts.length;i++) {
        const m=parts[i].mesh;m.count=count;m.visible=detailed||i===0||i===2;m.instanceMatrix.needsUpdate=true;
        if(colorsDirty && m.instanceColor)m.instanceColor.needsUpdate=true;m.boundingSphere=null;
      }
      colorsDirty=false;
    },
    dispose(){if(disposed)return;disposed=true;parts.forEach(p=>p.mesh.dispose());geometries.forEach(g=>g.dispose());material.dispose();ringGeometry.dispose();ringMaterial.dispose();appearances.clear();scene.clear();} };
}
