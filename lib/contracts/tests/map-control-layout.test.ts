import test from 'node:test';
import assert from 'node:assert/strict';
import {mapControlLayout,observeMapControlLayout} from '../../../components/map-control-layout.ts';

test('closed map layers clear the measured scale and footer without reserving toolbar space',()=>{
  assert.deepEqual(mapControlLayout({panelBottom:800,frameTop:66,frameBottom:754,scaleTop:725,toolbarHeight:0,topControlsBottom:120}),{
    toolbarBottom:85,layersBottom:39,layersMaxHeight:585,
  });
});

test('layers follow wrapped toolbar height with a ten pixel gap',()=>{
  const desktop=mapControlLayout({panelBottom:800,frameTop:66,frameBottom:754,scaleTop:725,toolbarHeight:96,topControlsBottom:120});
  const wrapped=mapControlLayout({panelBottom:800,frameTop:66,frameBottom:754,scaleTop:725,toolbarHeight:144,topControlsBottom:120});
  assert.equal(desktop.layersBottom,145);
  assert.equal(wrapped.layersBottom,193);
  assert.equal(754-desktop.layersBottom+10,800-desktop.toolbarBottom-96);
  assert.equal(754-wrapped.layersBottom+10,800-wrapped.toolbarBottom-144);
});

test('credit wrapping changes the panel inset while mobile layers stay above the scale',()=>{
  assert.deepEqual(mapControlLayout({panelBottom:534,frameTop:104,frameBottom:460,scaleTop:432,toolbarHeight:108,topControlsBottom:153}),{
    toolbarBottom:112,layersBottom:156,layersMaxHeight:141,
  });
});

test('before scale mounts the layout leaves a small canvas edge clearance',()=>{
  assert.deepEqual(mapControlLayout({panelBottom:500,frameTop:100,frameBottom:450,toolbarHeight:0,topControlsBottom:144}),{
    toolbarBottom:60,layersBottom:10,layersMaxHeight:286,
  });
});

test('mounted controls remeasure after toolbar resize and return to the scale when removed',t=>{
  const callbacks:{resize?:()=>void;mutation?:()=>void;frame?:FrameRequestCallback}={};
  const replacements={
    ResizeObserver:class {constructor(callback:()=>void){callbacks.resize=callback;}observe(){}unobserve(){}disconnect(){}},
    MutationObserver:class {constructor(callback:()=>void){callbacks.mutation=callback;}observe(){}disconnect(){}},
    requestAnimationFrame:(callback:FrameRequestCallback)=>{callbacks.frame=callback;return 1;},
    cancelAnimationFrame:()=>{callbacks.frame=undefined;},
  };
  for(const [key,value] of Object.entries(replacements)){
    const previous=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
    t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else Reflect.deleteProperty(globalThis,key);});
  }
  let toolbarHeight=96;
  let toolbarMounted=true;
  const scale={getBoundingClientRect:()=>({top:725})};
  const topControls={getBoundingClientRect:()=>({bottom:120})};
  const toolbar={getBoundingClientRect:()=>({height:toolbarHeight})};
  const frame={getBoundingClientRect:()=>({top:66,bottom:754}),querySelector:(selector:string)=>selector==='.maplibregl-ctrl-scale'?scale:topControls};
  const styles=new Map<string,string>();
  const panel={
    getBoundingClientRect:()=>({bottom:800}),
    querySelector:(selector:string)=>selector==='.map-frame'?frame:selector==='#map-plot-controls'&&toolbarMounted?toolbar:null,
    style:{setProperty:(key:string,value:string)=>styles.set(key,value),removeProperty:(key:string)=>styles.delete(key)},
  };
  const stop=observeMapControlLayout(panel as unknown as HTMLElement);
  assert.equal(styles.get('--map-layers-bottom'),'145px');
  toolbarHeight=144;
  callbacks.resize?.();
  callbacks.frame?.(0);
  assert.equal(styles.get('--map-layers-bottom'),'193px');
  assert.equal(styles.get('--map-layers-max-height'),'431px');
  toolbarMounted=false;
  callbacks.mutation?.();
  callbacks.frame?.(0);
  assert.equal(styles.get('--map-layers-bottom'),'39px');
  stop();
  assert.equal(styles.size,0);
});
