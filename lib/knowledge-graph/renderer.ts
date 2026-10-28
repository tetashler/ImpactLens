import cytoscape from 'cytoscape';
import type {Core,ElementDefinition,StylesheetJson,EdgeSingular} from 'cytoscape';
import {parseKnowledgeGraph,type KnowledgeGraph} from './contract.ts';
import {CATEGORY_COLOURS} from './palette.ts';
export {CATEGORY_COLOURS} from './palette.ts';
export type GraphSelection={kind:'node'|'edge';id:string}|null;
export interface RendererSnapshot {
  zoom:number;pan:{x:number;y:number};positions:{id:string;x:number;y:number}[];
  nodes:number;edges:number;visibleNodes:number;visibleEdges:number;layoutMs:number;destroyed:boolean;
}

/** Display coordinates only: these are deterministic seeds, never geographic points. */
export function graphElements(graph:KnowledgeGraph):ElementDefinition[]{
  const degree=new Map<string,number>();
  for(const e of graph.edges){degree.set(e.source,(degree.get(e.source)??0)+1);degree.set(e.target,(degree.get(e.target)??0)+1);}
  const nodes=[...graph.nodes].sort((a,b)=>a.id.localeCompare(b.id));
  return [
    ...nodes.map((n,i)=>{
      const angle=i*2.399963229728653,radius=55*Math.sqrt(i+1),connections=degree.get(n.id)??0;
      return {data:{id:n.id,label:n.label,category:n.category,colour:CATEGORY_COLOURS[n.category],size:n.category==='scenario'?32:Math.min(27,10+Math.sqrt(connections)*2.7),degree:connections},
        position:{x:Math.cos(angle)*radius,y:Math.sin(angle)*radius},classes:n.category==='scenario'?'hub':''};
    }),
    ...graph.edges.map(e=>({data:{id:e.id,source:e.source,target:e.target,label:e.relationship,directed:e.directed}})),
  ];
}

const stylesheet:StylesheetJson=[
  {selector:'node',style:{'background-color':'data(colour)',width:'data(size)',height:'data(size)',label:'data(label)',color:'#cbd9e8','font-size':12,'font-family':'Arial, sans-serif','text-valign':'bottom','text-margin-y':7,'min-zoomed-font-size':16,'text-max-width':'135px','text-wrap':'ellipsis','border-width':1.5,'border-color':'#12202f','overlay-opacity':0}},
  {selector:'node.hub',style:{'border-width':3,'border-color':'#b5eee7','font-size':16,'font-weight':'bold','min-zoomed-font-size':0}},
  {selector:'edge',style:{width:.8,'line-color':'#58738d',opacity:.42,'curve-style':'bezier','target-arrow-shape':'none','arrow-scale':.55,'overlay-padding':7,'overlay-opacity':0}},
  {selector:'edge[?directed]',style:{'target-arrow-shape':'triangle','target-arrow-color':'#58738d'}},
  {selector:'.dimmed',style:{opacity:.12}},
  {selector:'node.neighbour',style:{opacity:1,'border-width':2,'border-color':'#b6d8df'}},
  {selector:'node.focused',style:{opacity:1,'border-width':4,'border-color':'#f4fbff','font-size':16,'font-weight':'bold','min-zoomed-font-size':0,'text-background-color':'#102231','text-background-opacity':.95,'text-background-padding':'4px','text-background-shape':'roundrectangle'}},
  {selector:'edge.focused',style:{opacity:.95,width:2,'line-color':'#96e6d8','target-arrow-color':'#96e6d8'}},
  {selector:'node.hovered',style:{'min-zoomed-font-size':0,'font-size':14,'border-width':3,'border-color':'#e7f4ff'}},
  {selector:'.kg-hidden',style:{display:'none'}},
];

/** An independently disposable real Cytoscape core. Undefined container is headless. */
export function createGraphCore(input:KnowledgeGraph,container?:HTMLElement):Core {
  const graph=parseKnowledgeGraph(input);
  const core=cytoscape({container,elements:graphElements(graph),headless:!container,styleEnabled:true,
    style:stylesheet,layout:{name:'preset'},minZoom:.08,maxZoom:4,
    pixelRatio:1,boxSelectionEnabled:false,selectionType:'single',autounselectify:true});
  return core;
}

/** Owns no application state, network calls, external DOM controls or idle physics. */
export class GraphRenderer {
  readonly core:Core;
  readonly layoutMs:number;
  private disposed=false;
  private chosen:string|null=null;
  private onSelect:(selection:GraphSelection)=>void;
  constructor(container:HTMLElement|undefined,graph:KnowledgeGraph,onSelect:(selection:GraphSelection)=>void){
    this.onSelect=onSelect;
    const start=performance.now();this.core=createGraphCore(graph,container);
    // CoSE executes a fixed number of steps without animation, then stops. Seeds
    // and the headless reference box are stable; opening inspectors never reruns it.
    if(graph.nodes.length)this.core.layout({name:'cose',animate:false,randomize:false,fit:!!container,padding:55,
      boundingBox:{x1:0,y1:0,w:1000,h:760},numIter:250,nodeRepulsion:()=>6500,idealEdgeLength:()=>85,
      edgeElasticity:()=>80,gravity:.15,componentSpacing:100,nodeDimensionsIncludeLabels:false}).run();
    this.layoutMs=performance.now()-start;
    this.core.on('tap','node',event=>{const id=event.target.id();this.select(id);this.onSelect({kind:'node',id});});
    this.core.on('tap','edge',event=>{const id=event.target.id();this.select(id);this.onSelect({kind:'edge',id});});
    this.core.on('tap',event=>{if(event.target===this.core){this.select(null);this.onSelect(null);}});
    this.core.on('mouseover','node',event=>event.target.addClass('hovered'));
    this.core.on('mouseout','node',event=>event.target.removeClass('hovered'));
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
  filter(categories:readonly string[]):void {
    if(this.disposed)return;const allowed=new Set(categories);
    this.core.batch(()=>{
      this.core.nodes().forEach(node=>{node.toggleClass('kg-hidden',!allowed.has(node.data('category')));});
      this.core.edges().forEach(edge=>{edge.toggleClass('kg-hidden',edge.source().hasClass('kg-hidden')||edge.target().hasClass('kg-hidden'));});
    });
    this.select(this.chosen);
  }
  fit():void {if(!this.disposed&&this.core.nodes().not('.kg-hidden').length){this.core.resize();this.core.fit(this.core.elements().not('.kg-hidden'),55);}}
  zoomBy(factor:number):void {if(!this.disposed&&Number.isFinite(factor)&&factor>0)this.core.zoom(Math.min(4,Math.max(.08,this.core.zoom()*factor)));}
  resize():void {if(!this.disposed)this.core.resize();}
  snapshot():RendererSnapshot {
    return {zoom:this.core.zoom(),pan:this.core.pan(),positions:this.core.nodes().map(n=>({id:n.id(),x:n.position('x'),y:n.position('y')})).sort((a,b)=>a.id.localeCompare(b.id)),
      nodes:this.core.nodes().length,edges:this.core.edges().length,visibleNodes:this.core.nodes().not('.kg-hidden').length,visibleEdges:this.core.edges().not('.kg-hidden').length,layoutMs:this.layoutMs,destroyed:this.disposed};
  }
  dispose():void {if(this.disposed)return;this.disposed=true;this.core.removeAllListeners();this.core.destroy();}
}
