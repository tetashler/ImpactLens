type MapControlMeasurements={
  panelBottom:number;
  frameTop:number;
  frameBottom:number;
  toolbarHeight:number;
  topControlsBottom:number;
};

export function mapControlLayout({panelBottom,frameTop,frameBottom,toolbarHeight,topControlsBottom}:MapControlMeasurements){
  const clearance=10;
  const layersBottom=clearance+(toolbarHeight>0?toolbarHeight+10:0);
  return {
    toolbarBottom:Math.max(0,panelBottom-frameBottom)+clearance,
    layersBottom,
    layersMaxHeight:Math.max(0,frameBottom-Math.max(frameTop,topControlsBottom)-layersBottom-10),
  };
}

/** The map mounts dynamically, and its credits and toolbar can wrap independently. */
export function observeMapControlLayout(panel:HTMLElement){
  let pending:number|undefined;
  let disposed=false;
  const observed=new Set<Element>();
  const schedule=()=>{if(pending===undefined&&!disposed)pending=requestAnimationFrame(measure);};
  const resize=new ResizeObserver(schedule);
  function measure(){
    pending=undefined;
    if(disposed)return;
    const frame=panel.querySelector<HTMLElement>('.map-frame');
    if(!frame)return;
    const toolbar=panel.querySelector<HTMLElement>('#map-plot-controls');
    const topControls=frame.querySelector<HTMLElement>('.map-toolbar');
    const credits=panel.querySelector<HTMLElement>('.building-credit-strip');
    const elements=new Set<Element>([panel,frame,...[toolbar,topControls,credits].filter((element):element is HTMLElement=>!!element)]);
    for(const element of observed)if(!elements.has(element)){resize.unobserve(element);observed.delete(element);}
    for(const element of elements)if(!observed.has(element)){resize.observe(element);observed.add(element);}
    const frameBounds=frame.getBoundingClientRect();
    const layout=mapControlLayout({
      panelBottom:panel.getBoundingClientRect().bottom,
      frameTop:frameBounds.top,
      frameBottom:frameBounds.bottom,
      toolbarHeight:toolbar?.getBoundingClientRect().height??0,
      topControlsBottom:topControls?.getBoundingClientRect().bottom??frameBounds.top,
    });
    panel.style.setProperty('--plot-tools-bottom',`${layout.toolbarBottom}px`);
    panel.style.setProperty('--map-layers-bottom',`${layout.layersBottom}px`);
    panel.style.setProperty('--map-layers-max-height',`${layout.layersMaxHeight}px`);
  }
  const mutations=new MutationObserver(schedule);
  mutations.observe(panel,{childList:true,subtree:true});
  measure();
  return()=>{
    disposed=true;
    if(pending!==undefined)cancelAnimationFrame(pending);
    resize.disconnect();
    mutations.disconnect();
    for(const property of ['--plot-tools-bottom','--map-layers-bottom','--map-layers-max-height'])panel.style.removeProperty(property);
  };
}
