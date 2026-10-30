import cytoscape from 'cytoscape';
import type {Core,ElementDefinition,StylesheetJson,EdgeSingular} from 'cytoscape';
import {parseKnowledgeGraph,type KnowledgeGraph} from './contract.ts';
import {knowledgeEntityType,knowledgeRelationshipLabel,entityTypeColour} from './display.ts';
import {WorldPhysics,relationshipPairs,type PhysicsSnapshot} from './physics.ts';
export {CATEGORY_COLOURS} from './palette.ts';
export type GraphSelection={kind:'node'|'edge';id:string}|null;
export interface RendererSnapshot {
  zoom:number;pan:{x:number;y:number};positions:{id:string;x:number;y:number}[];
  nodes:number;edges:number;visibleNodes:number;visibleEdges:number;layoutMs:number;destroyed:boolean;
  physics:PhysicsSnapshot;
}

/** Match screen density without unbounded canvas allocation or invalid ratios. */
export function graphPixelRatio(devicePixelRatio:unknown):number {
  return typeof devicePixelRatio==='number'&&Number.isFinite(devicePixelRatio)&&devicePixelRatio>0
    ?Math.min(2,Math.max(1,devicePixelRatio)):1;
}

function displayLabel(label:string,limit=28):string {
  const characters=Array.from(label);
  return characters.length<=limit?label:`${characters.slice(0,limit-1).join('').trimEnd()}…`;
}

/** Display coordinates only: these are deterministic seeds, never geographic points. */
export function graphElements(graph:KnowledgeGraph):ElementDefinition[]{
  const degree=new Map<string,number>();
  for(const e of graph.edges){degree.set(e.source,(degree.get(e.source)??0)+1);degree.set(e.target,(degree.get(e.target)??0)+1);}
  const nodes=[...graph.nodes].sort((a,b)=>a.id.localeCompare(b.id));
  const pairs=relationshipPairs(graph),edgeClasses=new Map<string,string>();
  for(const group of pairs.values())for(const edge of group)edgeClasses.set(edge.id,edge.source===edge.target?'loop':group.length>1?'parallel':'single');
  return [
    ...nodes.map((n,i)=>{
      const angle=i*2.399963229728653,radius=55*Math.sqrt(i+1),connections=degree.get(n.id)??0;
      const presentation=n.properties.presentationCategory;
      const hierarchy=presentation==='entity'||presentation==='role'||presentation==='person'||presentation==='aggregate'?presentation:'legacy';
      const size=hierarchy==='entity'?28+Math.min(8,connections):hierarchy==='role'?23:hierarchy==='aggregate'?31:hierarchy==='person'?12:n.category==='scenario'?14:12;
      return {data:{id:n.id,label:n.label,displayLabel:displayLabel(n.label,hierarchy==='entity'||hierarchy==='role'||hierarchy==='aggregate'?72:28),category:n.category,entityType:knowledgeEntityType(n),colour:entityTypeColour(knowledgeEntityType(n)),size,degree:connections},
        position:{x:Math.cos(angle)*radius,y:Math.sin(angle)*radius},classes:`${n.category==='scenario'?'hub ':''}presentation-${hierarchy}`};
    }),
    ...graph.edges.map(e=>({data:{id:e.id,source:e.source,target:e.target,label:knowledgeRelationshipLabel(e),directed:e.directed},classes:edgeClasses.get(e.id)})),
  ];
}

const stylesheet:StylesheetJson=[
  {selector:'node',style:{'background-color':'data(colour)',width:'data(size)',height:'data(size)',label:'data(displayLabel)',color:'#cbd9e8','font-size':12,'font-weight':400,'font-family':'Arial, sans-serif','text-valign':'bottom','text-margin-y':7,'min-zoomed-font-size':8,'text-max-width':'160px','text-wrap':'ellipsis','border-width':1,'border-color':'#12202f','overlay-opacity':0}},
  {selector:'node.hub',style:{'border-width':1.5,'border-color':'#b5eee7','font-size':13,'font-weight':500}},
  {selector:'node.presentation-entity',style:{shape:'round-rectangle','border-width':1.5,'border-color':'#d4e7ef','font-size':13,'font-weight':600,'text-margin-y':9}},
  {selector:'node.presentation-role',style:{shape:'diamond','border-width':1.5,'border-color':'#b8c8e8','font-size':12,'font-weight':500}},
  {selector:'node.presentation-person',style:{shape:'ellipse','font-size':10,'text-opacity':.85,'border-color':'#8babc0'}},
  {selector:'node.presentation-aggregate',style:{shape:'hexagon','border-width':2,'border-style':'dashed','border-color':'#bed3df','font-size':12,'font-weight':500}},
  {selector:'node.presentation-entity, node.presentation-role, node.presentation-aggregate',style:{'text-wrap':'wrap','min-zoomed-font-size':0,'text-background-color':'#0c1827','text-background-opacity':.82,'text-background-shape':'roundrectangle',color:'#d7e6f0'}},
  {selector:'node.labels-hidden',style:{label:''}},
  {selector:'edge',style:{width:.8,'line-color':'#58738d',opacity:.42,'curve-style':'bezier','target-arrow-shape':'none','arrow-scale':.55,'overlay-padding':7,'overlay-opacity':0}},
  {selector:'edge.single',style:{'curve-style':'straight'}},
  {selector:'edge.parallel',style:{'curve-style':'bezier','control-point-step-size':42}},
  {selector:'edge.loop',style:{'curve-style':'bezier','loop-direction':'-45deg','loop-sweep':'70deg'}},
  {selector:'edge.edge-label',style:{label:'data(label)','font-size':10,color:'#9aafc3','min-zoomed-font-size':8,'text-rotation':'autorotate','text-background-color':'#0b1722','text-background-opacity':.85,'text-background-padding':'3px'}},
  {selector:'edge.labels-hidden',style:{label:''}},
  {selector:'edge[?directed]',style:{'target-arrow-shape':'triangle','target-arrow-color':'#58738d'}},
  {selector:'.dimmed',style:{opacity:.12}},
  {selector:'node.neighbour',style:{opacity:1,'border-width':2,'border-color':'#b6d8df'}},
  {selector:'node.focused',style:{label:'data(displayLabel)',opacity:1,'border-width':2,'border-color':'#f4fbff','font-size':13,'font-weight':500,'min-zoomed-font-size':0,'text-background-color':'#102231','text-background-opacity':.95,'text-background-padding':'4px','text-background-shape':'roundrectangle'}},
  {selector:'edge.focused',style:{opacity:.95,width:2,'line-color':'#96e6d8','target-arrow-color':'#96e6d8'}},
  {selector:'node.hovered',style:{label:'data(displayLabel)','min-zoomed-font-size':0,'font-size':13,'font-weight':500,'border-width':2,'border-color':'#e7f4ff'}},
  {selector:'.kg-hidden',style:{display:'none'}},
];

/** An independently disposable real Cytoscape core. Undefined container is headless. */
export function createGraphCore(input:KnowledgeGraph,container?:HTMLElement):Core {
  const graph=parseKnowledgeGraph(input);
  const core=cytoscape({container,elements:graphElements(graph),headless:!container,styleEnabled:true,
    style:stylesheet,layout:{name:'preset'},minZoom:.08,maxZoom:4,
    pixelRatio:container?graphPixelRatio(container.ownerDocument.defaultView?.devicePixelRatio):1,
    motionBlur:false,textureOnViewport:false,boxSelectionEnabled:false,selectionType:'single',autounselectify:true,desktopTapThreshold:3,touchTapThreshold:3});
  return core;
}

type CachedLayout={positions:{id:string;x:number;y:number}[];zoom:number;pan:{x:number;y:number}};
const layoutCache=new Map<string,CachedLayout>();
const CACHE_LIMIT=8;

/** Owns a bounded force lifecycle; no application state or network calls. */
export class GraphRenderer {
  readonly core:Core;
  readonly layoutMs:number;
  readonly physics:WorldPhysics;
  private disposed=false;
  private chosen:string|null=null;
  private onSelect:(selection:GraphSelection)=>void;
  private readonly cacheKey:string;
  private readonly seeds:{id:string;x:number;y:number}[];
  private readonly automatic:boolean;
  private visible=true;
  private grabbed:string|null=null;
  private dragged=false;
  private suppressTapUntil=0;
  private labels=false;
  private presentationIds:ReadonlySet<string>;
  private allowedCategories:{values:Set<string>;mode:'category'|'entity-type'}|null=null;
  private cleanup:(()=>void)[]=[];
  constructor(container:HTMLElement|undefined,graph:KnowledgeGraph,onSelect:(selection:GraphSelection)=>void){
    this.onSelect=onSelect;
    const start=performance.now();this.core=createGraphCore(graph,container);this.automatic=!!container;
    this.presentationIds=new Set(graph.nodes.filter(node=>node.properties.presentationPrimary!==false).map(node=>node.id));
    this.applyVisibility();
    const coreNodes=this.core.nodes();
    this.seeds=coreNodes.map(n=>({id:n.id(),x:n.position('x'),y:n.position('y')}));
    this.cacheKey=JSON.stringify([graph.scenarioIdentity,graph.executionIdentity??null,this.seeds.map(n=>n.id).sort(),
      graph.edges.map(e=>[e.id,e.source,e.target,e.directed]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))]);
    const cached=layoutCache.get(this.cacheKey);
    this.physics=new WorldPhysics(graph,cached?.positions??this.seeds,this.automatic,()=>{
      if(this.disposed)return;
      // Collection positions batches renderer notification and reuses the stable
      // node ordering, avoiding hundreds of collection lookups per force frame.
      coreNodes.positions((node,index)=>{
        const position=node.id()===this.grabbed?node.position():this.physics.nodes[index];return {x:position.x,y:position.y};
      });
    });
    if(cached){
      coreNodes.positions((_node,index)=>{const position=cached.positions[index];return {x:position.x,y:position.y};});
      this.core.viewport({zoom:cached.zoom,pan:cached.pan});this.physics.cool();
    }else if(!container){this.physics.tick(350);}
    else {
      // Seed a readable camera immediately. The expensive force settling happens
      // over D3's bounded cooling timer, never as a blocking browser layout.
      this.fit();
    }
    if(container){
      const media=typeof window!=='undefined'?window.matchMedia?.('(prefers-reduced-motion: reduce)'):undefined;
      if(media){this.physics.setReducedMotion(media.matches);const change=()=>this.physics.setReducedMotion(media.matches);media.addEventListener('change',change);this.cleanup.push(()=>media.removeEventListener('change',change));}
      if(typeof document!=='undefined'){const change=()=>this.syncVisibility();document.addEventListener('visibilitychange',change);this.cleanup.push(()=>document.removeEventListener('visibilitychange',change));change();}
      this.physics.start();
    }
    this.layoutMs=performance.now()-start;
    this.core.on('grab','node',event=>{
      const node=event.target;this.grabbed=node.id();this.dragged=false;this.suppressTapUntil=0;this.physics.pin(node.id(),node.position('x'),node.position('y'));
    });
    this.core.on('drag','node',event=>{
      const node=event.target;this.dragged=true;this.physics.move(node.id(),node.position('x'),node.position('y'));
    });
    this.core.on('free','node',event=>{
      const node=event.target;this.physics.release(node.id(),node.position('x'),node.position('y'));this.grabbed=null;this.suppressTapUntil=this.dragged?performance.now()+100:0;this.dragged=false;
    });
    this.core.on('tap','node',event=>{if(performance.now()<this.suppressTapUntil){this.suppressTapUntil=0;return;}const id=event.target.id();this.select(id);this.onSelect({kind:'node',id});});
    this.core.on('tap','edge',event=>{const id=event.target.id();this.select(id);this.onSelect({kind:'edge',id});});
    this.core.on('tap',event=>{if(event.target===this.core){this.select(null);this.onSelect(null);}});
    this.core.on('mouseover','node',event=>event.target.addClass('hovered'));
    this.core.on('mouseout','node',event=>event.target.removeClass('hovered'));
    this.core.on('zoom',()=>this.updateLabelDensity());
    this.updateLabelDensity();
  }
  select(id:string|null):void {
    if(this.disposed)return;
    this.chosen=id;
    this.core.batch(()=>{
      this.core.elements().removeClass('focused neighbour dimmed');
      if(!id)return;
      const item=this.core.getElementById(id);if(item.empty())return;
      this.core.elements().addClass('dimmed');item.removeClass('dimmed').addClass('focused');
      if(item.isNode()){
        item.neighborhood().removeClass('dimmed');item.neighborhood('node').addClass('neighbour');item.connectedEdges().addClass('focused');
      }else{(item as unknown as EdgeSingular).connectedNodes().removeClass('dimmed').addClass('neighbour');}
    });
  }
  focus(id:string):void {
    if(this.disposed)return;const item=this.core.getElementById(id);if(item.empty()||item.hasClass('kg-hidden'))return;
    this.select(id);this.core.center(item);this.core.zoom({level:Math.max(this.core.zoom(),.8),position:item.position()});
  }
  filter(categories:readonly string[],mode:'category'|'entity-type'='category'):void {
    if(this.disposed)return;
    this.allowedCategories={values:new Set(categories),mode};this.applyVisibility();
    this.select(this.chosen);this.updateLabelDensity();
  }
  /** Candidate nodes stay in the same core, preserving layout through discovery. */
  setPresentationVisibility(ids:ReadonlySet<string>):void {
    if(this.disposed)return;
    this.presentationIds=new Set(ids);this.applyVisibility();
    this.select(this.chosen);this.updateLabelDensity();
  }
  private applyVisibility():void {
    const filter=this.allowedCategories;
    this.core.batch(()=>{
      this.core.nodes().forEach(node=>{node.toggleClass('kg-hidden',!this.presentationIds.has(node.id())||!!filter&&!filter.values.has(node.data(filter.mode==='entity-type'?'entityType':'category')));});
      this.core.edges().forEach(edge=>{edge.toggleClass('kg-hidden',edge.source().hasClass('kg-hidden')||edge.target().hasClass('kg-hidden'));});
    });
  }
  fit():void {if(!this.disposed&&this.core.nodes().not('.kg-hidden').length){this.core.resize();this.core.fit(this.core.elements().not('.kg-hidden'),75);}}
  zoomBy(factor:number):void {if(!this.disposed&&Number.isFinite(factor)&&factor>0)this.core.zoom(Math.min(4,Math.max(.08,this.core.zoom()*factor)));}
  resize():void {if(!this.disposed)this.core.resize();}
  setVisible(visible:boolean):void {
    if(this.disposed)return;this.visible=visible;
    this.syncVisibility();
    if(visible)this.resize();else this.remember();
  }
  private syncVisibility():void {
    const effective=this.visible&&(typeof document==='undefined'||!document.hidden);
    if(!effective&&this.grabbed){
      const node=this.core.getElementById(this.grabbed);
      this.physics.release(node.id(),node.position('x'),node.position('y'));this.grabbed=null;this.dragged=false;this.suppressTapUntil=0;
    }
    this.physics.setVisible(effective);
  }
  resetLayout():void {
    if(this.disposed)return;
    this.physics.reset(this.seeds);if(!this.automatic)this.physics.tick(350);
    this.remember();
  }
  resetView():void {
    if(this.disposed)return;this.core.resize();this.core.zoom(1);
    const visible=this.core.elements().not('.kg-hidden');if(visible.length)this.core.center(visible);else this.core.pan({x:0,y:0});
  }
  setEdgeLabels(enabled:boolean):void {if(this.disposed)return;this.labels=enabled;this.core.edges().toggleClass('edge-label',enabled);this.updateLabelDensity();}
  private updateLabelDensity():void {
    if(this.disposed)return;
    // Dense, zoomed-out graphs keep labels available without painting a wall of text.
    const zoom=Math.max(.08,this.core.zoom()),lowZoom=zoom<.8;
    this.core.batch(()=>{
      const dense=this.core.nodes().not('.kg-hidden').length>=100&&lowZoom;
      this.core.nodes().forEach(node=>{
        const entity=node.hasClass('presentation-entity'),role=node.hasClass('presentation-role'),aggregate=node.hasClass('presentation-aggregate');
        node.toggleClass('labels-hidden',dense&&!entity&&!role&&!aggregate);
        // Only label styling changes with the camera. Existing force positions,
        // drag reheating and the relative sizes of the node tiers stay intact.
        if(entity||role||aggregate)node.style({'font-size':Math.max(entity?13:12,(role?9.5:11)/zoom),'text-max-width':Math.max(160,180/zoom),'text-margin-y':Math.max(9,6/zoom),'text-background-padding':2/zoom});
      });
      this.core.edges().toggleClass('labels-hidden',this.labels&&this.core.edges().length>120&&lowZoom);
    });
  }
  private remember():void {
    const {positions,zoom,pan}=this.snapshot();layoutCache.delete(this.cacheKey);layoutCache.set(this.cacheKey,{positions,zoom,pan});
    while(layoutCache.size>CACHE_LIMIT)layoutCache.delete(layoutCache.keys().next().value!);
  }
  snapshot():RendererSnapshot {
    return {zoom:this.core.zoom(),pan:this.core.pan(),positions:this.core.nodes().map(n=>({id:n.id(),x:n.position('x'),y:n.position('y')})).sort((a,b)=>a.id.localeCompare(b.id)),
      nodes:this.core.nodes().length,edges:this.core.edges().length,visibleNodes:this.core.nodes().not('.kg-hidden').length,visibleEdges:this.core.edges().not('.kg-hidden').length,layoutMs:this.layoutMs,destroyed:this.disposed,physics:this.physics.snapshot()};
  }
  dispose():void {if(this.disposed)return;this.remember();this.disposed=true;this.physics.dispose();for(const cleanup of this.cleanup)cleanup();this.cleanup=[];this.core.removeAllListeners();this.core.destroy();}
}
