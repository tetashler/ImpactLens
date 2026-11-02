import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

// Exercise the controller at its MapLibre boundary without a browser/WebGL context.
// The renderer double only records the source, marker and event effects we own.
const harness = String.raw`
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
class Element extends EventTarget {
  constructor(tag) { super(); this.tagName=tag; this.style={}; this.dataset={}; this.children=[]; this.attributes={}; this.textContent=''; this.className=''; this.classes=new Set(); this.classList={toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)}; }
  append(...elements) { this.children.push(...elements); }
  setAttribute(name,value) { this.attributes[name]=String(value); }
  set innerHTML(value) { throw new Error('Untrusted HTML must never enter the map'); }
}
globalThis.document={createElement:tag=>new Element(tag)};
class Marker {
  constructor(options) { this.element=options.element; this.draggable=options.draggable??false; this.events=new Map(); }
  setLngLat(value) { this.coordinate={lng:value[0],lat:value[1]}; return this; }
  getLngLat() { return this.coordinate; }
  getElement() { return this.element; }
  setDraggable(value) { this.draggable=value; return this; }
  addTo(map) { this.map=map; map.markers.add(this); map.createdMarkers++; return this; }
  remove() { this.map?.markers.delete(this); return this; }
  on(name,callback) { this.events.set(name,callback); return this; }
  off(name,callback) { if(this.events.get(name)===callback)this.events.delete(name); return this; }
  emit(name) { this.events.get(name)?.(); }
}
globalThis.TestMarker=Marker;
registerHooks({resolve(specifier,context,next) {
  if(specifier==='maplibre-gl')return {url:'data:text/javascript,export const Marker=globalThis.TestMarker;',shortCircuit:true};
  return next(specifier,context);
}});
const {PlotMapLayer}=await import(MODULE_URL).catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return {};
  throw error;
});
assert.equal(typeof PlotMapLayer,'function','The universal plot map controller must exist');
class MapSurface {
  sources=new Map(); layers=new Map(); events=new Map(); markers=new Set(); createdMarkers=0; hits=[];
  getSource(id) { return this.sources.get(id); }
  addSource(id,options) { assert.ok(!this.sources.has(id),'Source IDs must be unique'); this.sources.set(id,{data:options.data,setData(data){this.data=data;}}); }
  removeSource(id) { this.sources.delete(id); }
  getLayer(id) { return this.layers.get(id); }
  addLayer(layer) { assert.ok(!this.layers.has(layer.id),'Layer IDs must be unique'); this.layers.set(layer.id,layer); }
  setPaintProperty(id,key,value) { this.layers.get(id).paint[key]=value; }
  removeLayer(id) { this.layers.delete(id); }
  on(name,callback) { if(!this.events.has(name))this.events.set(name,new Set()); this.events.get(name).add(callback); }
  off(name,callback) { this.events.get(name)?.delete(callback); }
  emit(name) { for(const callback of this.events.get(name)??[])callback(); }
  queryRenderedFeatures(point,options) { this.lastQuery={point,options}; return this.hits; }
}
const position={lat:1.3,lon:103.8};
const geometry={version:1,scenarioId:'test',features:[
  {kind:'point',id:'stop',label:'Stop A',coordinate:position,role:'station',provenance:'user-drawn'},
  {kind:'point',id:'pin',label:'<img src=x onerror=alert(1)>',coordinate:{lat:1.31,lon:103.81},role:'unassigned',provenance:'user-drawn'},
  {kind:'line',id:'route',label:'Route',coordinates:[position,{lat:1.32,lon:103.82}],provenance:'user-drawn'},
  {kind:'line',id:'draft',label:'Draft',coordinates:[{lat:1.33,lon:103.83}],provenance:'user-drawn'},
]};
const options={active:true,geometry,mode:'edit',selection:null,anchors:{stop:'EW17'},onSelect(){},onMovePoint(){},onMoveVertex(){},onDragStart(){}};
const pointMarker=(map,id)=>[...map.markers].find(marker=>marker.element.dataset.plotId===id&&marker.element.dataset.plotVertex===undefined);
const vertexMarker=(map,id,index)=>[...map.markers].find(marker=>marker.element.dataset.plotId===id&&marker.element.dataset.plotVertex===String(index));
const lineData=map=>[...map.sources.values()].find(source=>source.data.type==='FeatureCollection').data;
`;

function run(body: string) {
  const moduleUrl = new URL('../../plots/map-layer.ts', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', harness.replace('MODULE_URL', JSON.stringify(moduleUrl)) + body], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('plot source preserves geographic axes, omits draft lines, and restores only owned resources', () => run(`
  const map=new MapSurface();
  const layer=new PlotMapLayer(map,options);
  assert.equal(lineData(map).features.length,1);
  assert.deepEqual(lineData(map).features[0].geometry.coordinates,[[103.8,1.3],[103.82,1.32]]);
  assert.ok(vertexMarker(map,'draft',0),'A draft still has an editable first handle');
  const other=new PlotMapLayer(map,{...options,active:false});
  assert.equal(map.sources.size,2);
  other.dispose();
  map.sources.clear();map.layers.clear();
  map.sources.set('foreign',{data:{}});map.layers.set('foreign',{id:'foreign'});
  map.emit('style.load');
  assert.deepEqual(lineData(map).features[0].geometry.coordinates,[[103.8,1.3],[103.82,1.32]]);
  layer.update({...options,active:false});
  assert.equal(map.markers.size,0);assert.deepEqual(lineData(map).features,[]);
  layer.dispose();layer.dispose();
  assert.deepEqual([...map.sources.keys()],['foreign']);
  assert.deepEqual([...map.layers.keys()],['foreign']);
  assert.equal(map.events.get('style.load').size,0);
`));

test('plot selection keeps markers stable, labels remain text, and line picking stays parent controlled', () => run(`
  const map=new MapSurface(),selected=[];
  const current={...options,onSelect:value=>selected.push(value)};
  const layer=new PlotMapLayer(map,current);
  const pin=pointMarker(map,'pin'),stop=pointMarker(map,'stop'),created=map.createdMarkers;
  assert.ok(pin.element.attributes['aria-label'].includes('<img src=x onerror=alert(1)>'));
  assert.ok(stop.element.attributes['aria-label'].includes('EW17'));
  layer.update({...current,selection:{id:'pin'}});
  assert.equal(pointMarker(map,'pin'),pin);assert.equal(map.createdMarkers,created);
  assert.equal(pin.element.attributes['aria-pressed'],'true');
  const click=new Event('click',{bubbles:true});pin.element.dispatchEvent(click);
  assert.equal(click.cancelBubble,true);assert.deepEqual(selected,[{id:'pin'}]);
  assert.equal(map.events.has('click'),false);
  map.hits=[{properties:{id:'route',kind:'line'}}];
  assert.deepEqual(layer.pickLine({x:40,y:60}),{id:'route'});
  map.hits=[{properties:{id:'missing',kind:'line'}}];
  assert.equal(layer.pickLine({x:40,y:60}),null);
  layer.update({...current,mode:'explore'});
  assert.equal(pointMarker(map,'pin'),pin);assert.equal(pin.draggable,false);
  assert.equal(vertexMarker(map,'route',0),undefined);
  layer.dispose();
`));

test('plot drags preview lines locally and commit only valid final positions', () => run(`
  const map=new MapSurface(),moved=[],vertices=[];let starts=0,layer;
  const current={...options,onDragStart(){starts++;layer.update({...current,selection:{id:'route',vertex:0}});},onMovePoint:(...args)=>moved.push(args),onMoveVertex:(...args)=>vertices.push(args)};
  layer=new PlotMapLayer(map,current);
  const vertex=vertexMarker(map,'route',0);
  vertex.emit('dragstart');vertex.setLngLat([103.84,1.34]);vertex.emit('drag');
  assert.equal(starts,1);assert.deepEqual(vertices,[]);
  assert.deepEqual(lineData(map).features[0].geometry.coordinates,[[103.84,1.34],[103.82,1.32]]);
  assert.deepEqual(geometry.features[2].coordinates[0],{lat:1.3,lon:103.8});
  vertex.emit('dragend');assert.deepEqual(vertices,[['route',0,{lat:1.34,lon:103.84}]]);
  const pin=pointMarker(map,'pin');pin.emit('dragstart');pin.setLngLat([104.5,1.31]);pin.emit('dragend');
  assert.deepEqual(moved,[]);assert.deepEqual(pin.getLngLat(),{lng:103.81,lat:1.31});
  pin.emit('dragstart');pin.setLngLat([103.9,1.4]);pin.emit('dragend');
  assert.deepEqual(moved,[['pin',{lat:1.4,lon:103.9}]]);
  assert.equal(starts,3);
  layer.dispose();
`));

test('changing tools cancels a drag preview and prevents its later dragend from committing', () => run(`
  const map=new MapSurface(),moved=[];
  const current={...options,onMoveVertex:(...args)=>moved.push(args)};
  const layer=new PlotMapLayer(map,current),vertex=vertexMarker(map,'route',0);
  vertex.emit('dragstart');vertex.setLngLat([103.84,1.34]);vertex.emit('drag');
  layer.update({...current,mode:'explore'});
  assert.deepEqual(lineData(map).features[0].geometry.coordinates,[[103.8,1.3],[103.82,1.32]]);
  vertex.emit('dragend');assert.deepEqual(moved,[]);
  layer.dispose();
`));

test('plot appearance changes repaint existing lines and markers without changing geometry or marker ownership', () => run(`
  const map=new MapSurface(),layer=new PlotMapLayer(map,options);
  const lines=()=>[...map.layers.values()].find(value=>value.id.endsWith('-lines'));
  const pin=pointMarker(map,'pin'),created=map.createdMarkers,data=JSON.stringify(lineData(map));
  assert.equal(lines().paint['line-color'],'#ffac79');
  assert.deepEqual(lines().paint['line-dasharray'],[3,2]);
  layer.update({...options,appearance:'light'});
  assert.equal(lines().paint['line-color'],'#A96520');
  assert.equal(pointMarker(map,'pin'),pin);assert.equal(map.createdMarkers,created);
  assert.equal(pin.element.style.color,'#FFFFFF');
  assert.equal(pin.element.children[0].style.background,'#A96520');
  assert.equal(JSON.stringify(lineData(map)),data);
  map.sources.clear();map.layers.clear();map.emit('style.load');
  assert.equal(lines().paint['line-color'],'#A96520');
  layer.update(options);
  assert.equal(lines().paint['line-color'],'#ffac79');
  layer.dispose();
`));
