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
export function citizenAppearance(agentId: string) {
  let hash = 2166136261;
  for (const c of agentId) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  return { shirt: ['#73d8d0','#eea26d','#b1a2df','#739ed1','#d9be69','#dc8fa5'][hash % 6],
    skin: ['#e9bb99','#b87e5e','#865c45','#d89d78'][(hash >>> 4) % 4], trousers: '#283f58', hair: ['#3b302f','#222d34','#695147'][(hash >>> 8) % 3] };
}
type Part = { mesh: THREE.InstancedMesh; at: [number,number,number]; size: [number,number,number]; color: 'shirt'|'skin'|'trousers'|'hair'|'eyes'|'shoes'; swing?: number };
export function createCitizenScene(capacity: number) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 300) throw new Error('Citizen capacity must be 1–300');
  const scene = new THREE.Scene(), geometry = new THREE.BoxGeometry(1,1,1);
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, side: THREE.DoubleSide });
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const sun = new THREE.DirectionalLight(0xffeedb, 2.5); sun.position.set(-80,-100,180); scene.add(sun);
  const definitions: Omit<Part,'mesh'>[] = [
    { at:[0,0,1.45],size:[.48,.43,.46],color:'skin' },
    { at:[0,-.025,1.7],size:[.5,.44,.12],color:'hair' },
    { at:[0,0,1.02],size:[.51,.32,.48],color:'shirt' },
    { at:[0,0,.72],size:[.46,.3,.16],color:'trousers' },
    { at:[-.34,0,.98],size:[.15,.2,.47],color:'skin',swing:1 },
    { at:[.34,0,.98],size:[.15,.2,.47],color:'skin',swing:-1 },
    { at:[-.13,0,.39],size:[.19,.25,.5],color:'trousers',swing:-1 },
    { at:[.13,0,.39],size:[.19,.25,.5],color:'trousers',swing:1 },
    { at:[-.13,.055,.09],size:[.22,.37,.16],color:'shoes',swing:-1 },
    { at:[.13,.055,.09],size:[.22,.37,.16],color:'shoes',swing:1 },
    { at:[-.105,.222,1.48],size:[.055,.025,.06],color:'eyes' },
    { at:[.105,.222,1.48],size:[.055,.025,.06],color:'eyes' },
  ];
  const parts: Part[] = definitions.map(d => {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity); mesh.count = 0; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh); return { ...d, mesh };
  });
  const ringGeometry = new THREE.RingGeometry(3.5,4.3,32), ringMaterial = new THREE.MeshBasicMaterial({color:'#fff0ac',side:THREE.DoubleSide});
  const ring = new THREE.Mesh(ringGeometry,ringMaterial); ring.visible=false; scene.add(ring);
  const root = new THREE.Object3D(), limb = new THREE.Object3D(), color = new THREE.Color(), matrix = new THREE.Matrix4();
  function setCitizen(index: number, id: string, sample: AnimationSample, origin: Wgs84Position, elapsed: number, selected: boolean, moving: boolean) {
    if (!sample.position) return;
    const p = localMetres(sample.position,origin), walking = sample.state==='walking'||sample.state==='arriving';
    const phase = sample.limbPhase, bob = moving ? Math.sin(elapsed*2+index)*.025 : 0;
    root.position.set(p.x,p.y,bob); root.rotation.set(0,0,sample.headingRadians-Math.PI/2); root.scale.setScalar(5.5); root.updateMatrix();
    const appearance = citizenAppearance(id);
    for (const part of parts) {
      limb.position.set(...part.at); limb.rotation.set(walking&&moving&&part.swing ? Math.sin(phase)*.6*part.swing : 0,0,0);
      if (part.swing && walking && moving) limb.position.y += Math.sin(phase)*.13*part.swing;
      limb.scale.set(...part.size); limb.updateMatrix();
      part.mesh.setMatrixAt(index,matrix.multiplyMatrices(root.matrix,limb.matrix));
      color.set(part.color==='eyes'?'#18232b':part.color==='shoes'?'#e4e8dc':appearance[part.color]);
      part.mesh.setColorAt(index,color);
    }
    if(selected) {ring.visible=true;ring.position.set(p.x,p.y,.2);}
  }
  let disposed=false;
  return { scene,geometry,material,parts,ring,setCitizen,
    finish(count:number,detailed:boolean) { for(let i=0;i<parts.length;i++){const m=parts[i].mesh;m.count=count;m.visible=detailed||i===0||i===2;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.boundingSphere=null;} },
    dispose(){if(disposed)return;disposed=true;parts.forEach(p=>p.mesh.dispose());geometry.dispose();material.dispose();ringGeometry.dispose();ringMaterial.dispose();scene.clear();} };
}
