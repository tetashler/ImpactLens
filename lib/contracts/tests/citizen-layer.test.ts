import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// Exercise the real layer/rig with only the WebGL transport replaced. Actual instance
// matrices, clock, event ownership and sampling remain production implementations.
function run(body:string){
  const layer=new URL('../../citizens/layer.ts',import.meta.url).href,fixture=new URL('../../citizens/fixtures.ts',import.meta.url).href;
  const three=new URL('../../../node_modules/three/build/three.module.js',import.meta.url).href;
  const script=`
    import {registerHooks} from 'node:module';import {existsSync} from 'node:fs';import assert from 'node:assert/strict';
    globalThis.renderers=[];globalThis.now=0;Object.defineProperty(performance,'now',{value:()=>globalThis.now});
    registerHooks({resolve(s,c,n){if(s==='three')return {url:'fixture:three',shortCircuit:true};if(s.startsWith('.')&&c.parentURL){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return n(u.href,c);}return n(s,c);},load(u,c,n){if(u==='fixture:three')return {format:'module',source:${JSON.stringify(`export * from '${three}';export class WebGLRenderer{autoClear=false;info={render:{calls:0}};disposed=false;constructor(){globalThis.renderers.push(this)}resetState(){}render(scene){scene.updateMatrixWorld(true);this.info.render.calls=scene.children.filter(x=>x.isInstancedMesh&&x.count&&x.visible).length;}dispose(){this.disposed=true;}}`)},shortCircuit:true};return n(u,c);}});
    const events=new Map(),mediaListeners=new Set(),mapEvents=new Map();let paints=0;
    globalThis.document={hidden:false,addEventListener:(k,f)=>events.set(k,f),removeEventListener:(k,f)=>{if(events.get(k)===f)events.delete(k)}};
    globalThis.window={innerWidth:1440};globalThis.matchMedia=()=>({matches:false,addEventListener:(k,f)=>mediaListeners.add(f),removeEventListener:(k,f)=>mediaListeners.delete(f)});
    const {CitizenLayer}=await import(${JSON.stringify(layer)}),{citizenViewPairFixture:pair}=await import(${JSON.stringify(fixture)});
    const first=pair.baseline.animations[0].position,reports=[];
    const map={getCanvas:()=>({clientWidth:1000,clientHeight:700}),getZoom:()=>19,getBounds:()=>({getWest:()=>103.6,getEast:()=>104.1,getSouth:()=>1.15,getNorth:()=>1.5}),project:p=>({x:500+(p[0]-first.lon)*10000,y:350-(p[1]-first.lat)*10000}),on:(k,f)=>{const set=mapEvents.get(k)||new Set();set.add(f);mapEvents.set(k,set)},off:(k,f)=>mapEvents.get(k)?.delete(f),triggerRepaint:()=>paints++,easeTo:()=>{}};
    const options={pair,view:'baseline',selectedId:pair.citizens?.[0]?.agentId??pair.baseline.citizens[0].agentId,playing:true,speed:1,resetKey:0,enabled:true,onStats:r=>reports.push(r)};
    const layer=new CitizenLayer(options),args={defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}};
    ${body}
  `;
  const result=spawnSync(process.execPath,['--experimental-transform-types','--input-type=module','--eval',script],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
}

test('citizen layer owns one renderer and ignores updates after idempotent removal',()=>run(`
  layer.onAdd(map,{});assert.throws(()=>layer.onAdd(map,{}),/already|attached/i);assert.equal(renderers.length,1);
  layer.render({},args);layer.onRemove();layer.onRemove();const count=paints;layer.update({...options,playing:false});layer.render({},args);
  assert.equal(paints,count);assert.equal(renderers[0].disposed,true);assert.equal(mediaListeners.size,0);assert.equal(events.size,0);assert.equal([...mapEvents.values()].reduce((n,s)=>n+s.size,0),0);
`));
test('visibility pause and style reattachment preserve a single clock without background jumps',()=>run(`
  layer.onAdd(map,{});layer.render({},args);now=1500;layer.render({},args);const before=reports.at(-1).elapsedSeconds;
  document.hidden=true;events.get('visibilitychange')();now=100000;document.hidden=false;events.get('visibilitychange')();layer.render({},args);
  assert.equal(reports.at(-1).elapsedSeconds,before);layer.onRemove();now=200000;layer.onAdd(map,{});layer.render({},args);
  assert.equal(reports.at(-1).elapsedSeconds,before);assert.equal(renderers.filter(r=>!r.disposed).length,1);layer.onRemove();
`));
test('disabled and reset layer state is isolated from input population and restores exact initial matrices',()=>run(`
  const original=JSON.stringify(pair);layer.onAdd(map,{});layer.render({},args);const initial=Array.from(layer.rig.parts[0].mesh.instanceMatrix.array.slice(0,16));
  now=6000;layer.render({},args);layer.update({...options,playing:false});layer.render({},args);const paused=Array.from(layer.rig.parts[0].mesh.instanceMatrix.array.slice(0,16));
  now=16000;layer.render({},args);assert.deepEqual(Array.from(layer.rig.parts[0].mesh.instanceMatrix.array.slice(0,16)),paused);
  layer.update({...options,enabled:false});layer.render({},args);assert.equal(reports.at(-1).visible,0);
  layer.update({...options,playing:false,resetKey:1});layer.render({},args);assert.deepEqual(Array.from(layer.rig.parts[0].mesh.instanceMatrix.array.slice(0,16)),initial);
  assert.equal(JSON.stringify(pair),original);layer.onRemove();
`));
test('only an explicit demo opt-in uses looping pedestrians; imported geometry is preserved',()=>run(`
  const {sampleCitizenAnimation}=await import(new URL('./lib/citizens/playback.ts',import.meta.url));
  layer.onAdd(map,{});layer.render({},args);now=6000;layer.render({},args);
  const supplied=sampleCitizenAnimation(pair.baseline.animations[0],6,{playing:true});assert.deepEqual(reports.at(-1).selected.position,supplied.position);
  layer.update({...options,illustrativePedestrians:true});layer.render({},args);assert.notDeepEqual(reports.at(-1).selected.position,supplied.position);layer.onRemove();
`));
test('changing imported population disposes the previous rig without creating a second renderer',()=>run(`
  layer.onAdd(map,{});layer.render({},args);const oldRig=layer.rig;let freed=false;oldRig.material.addEventListener('dispose',()=>freed=true);
  layer.update({...options,pair:structuredClone(pair)});layer.render({},args);assert.equal(freed,true);assert.equal(oldRig.scene.children.length,0);assert.equal(renderers.length,1);layer.onRemove();
`));
test('options changed during style detachment are reconciled before reattachment renders',()=>run(`
  layer.onAdd(map,{});layer.render({},args);layer.onRemove();const count=paints;
  layer.update({...options,enabled:false,playing:false,speed:4,selectedId:pair.baseline.citizens[1].agentId});assert.equal(paints,count);
  layer.onAdd(map,{});layer.render({},args);assert.equal(reports.at(-1).visible,0);assert.equal(reports.at(-1).status,'Hidden');
  assert.equal(layer.options.playing,false);assert.equal(layer.options.speed,4);assert.equal(layer.options.selectedId,pair.baseline.citizens[1].agentId);layer.onRemove();
`));
