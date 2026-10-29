import {forceSimulation,forceLink,forceManyBody,forceCollide,forceCenter,forceX,forceY,type SimulationNodeDatum,type Simulation,type SimulationLinkDatum} from 'd3-force';
import type {KnowledgeGraph} from './contract.ts';

export interface PhysicsNode extends SimulationNodeDatum {id:string;x:number;y:number}
interface PhysicsLink extends SimulationLinkDatum<PhysicsNode> {distance:number}
export interface PhysicsSnapshot {alpha:number;alphaTarget:number;running:boolean;ticks:number}
export function relationshipPairs(graph:KnowledgeGraph):Map<string,KnowledgeGraph['edges']> {
  const pairs=new Map<string,KnowledgeGraph['edges']>();
  for(const edge of graph.edges){const key=JSON.stringify([edge.source,edge.target].sort());const group=pairs.get(key)??[];group.push(edge);pairs.set(key,group);}
  return pairs;
}

/** Independent public D3-force integration; Cytoscape remains the input/rendering layer. */
export class WorldPhysics {
  readonly nodes:PhysicsNode[];
  private readonly simulation:Simulation<PhysicsNode,PhysicsLink>;
  private readonly byId:Map<string,PhysicsNode>;
  private readonly automatic:boolean;
  private readonly update:()=>void;
  private running=false;
  private visible=true;
  private reducedMotion=false;
  private disposed=false;
  private ticks=0;
  constructor(graph:KnowledgeGraph,positions:{id:string;x:number;y:number}[],automatic:boolean,update:()=>void){
    this.nodes=positions.map(p=>({...p,vx:0,vy:0}));this.byId=new Map(this.nodes.map(n=>[n.id,n]));
    this.automatic=automatic;this.update=update;
    const links:PhysicsLink[]=[];
    for(const group of relationshipPairs(graph).values())for(const edge of group)if(edge.source!==edge.target)links.push({source:edge.source,target:edge.target,distance:150+50*(group.length-1)});
    this.simulation=forceSimulation<PhysicsNode>(this.nodes).stop()
      .force('link',forceLink<PhysicsNode,PhysicsLink>(links).id(n=>n.id).distance(e=>e.distance))
      .force('charge',forceManyBody<PhysicsNode>().strength(-400))
      .force('collide',forceCollide<PhysicsNode>(50))
      .force('center',forceCenter(0,0))
      .force('x',forceX<PhysicsNode>(0).strength(.04)).force('y',forceY<PhysicsNode>(0).strength(.04))
      .on('tick',()=>{
        this.ticks++;
        // Large graphs publish once per D3 timer turn while advancing two real
        // integration steps. Force parameters and drag reheating stay identical.
        if(this.nodes.length>=100&&this.simulation.alpha()>=this.simulation.alphaMin()){
          this.simulation.tick();this.ticks++;
        }
        this.update();
      })
      .on('end',()=>{this.running=false;});
  }
  private resume():void {
    if(this.disposed||!this.automatic||!this.visible||this.reducedMotion||this.simulation.alpha()<this.simulation.alphaMin())return;
    this.running=true;this.simulation.restart();
  }
  start():void {this.resume();}
  tick(iterations=1):void {
    if(this.disposed)return;
    for(let i=0;i<Math.max(0,Math.min(1000,Math.floor(iterations)));i++){
      if(this.simulation.alpha()<this.simulation.alphaMin()&&this.simulation.alphaTarget()===0)break;
      this.simulation.tick();this.ticks++;
    }
    if(this.simulation.alpha()<this.simulation.alphaMin()){this.simulation.stop();this.running=false;}
    this.update();
  }
  pin(id:string,x:number,y:number):void {
    const node=this.byId.get(id);if(!node||this.disposed)return;
    node.x=x;node.y=y;node.fx=x;node.fy=y;node.vx=0;node.vy=0;
  }
  move(id:string,x:number,y:number):void {
    if(this.disposed||!this.byId.has(id))return;
    this.pin(id,x,y);this.simulation.alphaTarget(.3).alpha(Math.max(.3,this.simulation.alpha()));this.resume();
  }
  release(id:string,x:number,y:number):void {
    const node=this.byId.get(id);if(!node||this.disposed)return;
    node.x=x;node.y=y;node.fx=null;node.fy=null;node.vx=0;node.vy=0;
    this.simulation.alphaTarget(0);
  }
  reset(positions:{id:string;x:number;y:number}[]):void {
    if(this.disposed)return;
    for(const p of positions){const node=this.byId.get(p.id);if(node)Object.assign(node,p,{vx:0,vy:0,fx:null,fy:null});}
    this.simulation.alpha(1).alphaTarget(0);this.ticks=0;
    // A user-requested reset can compute a static layout once. Initial rendering
    // still avoids blocking, and reduced motion never starts an animation timer.
    if(this.reducedMotion){this.tick(350);this.cool();}else {this.update();this.resume();}
  }
  cool():void {this.simulation.alpha(0).alphaTarget(0).stop();this.running=false;}
  setVisible(visible:boolean):void {if(this.disposed)return;this.visible=visible;if(visible)this.resume();else {this.simulation.stop();this.running=false;}}
  setReducedMotion(reduced:boolean):void {if(this.disposed)return;this.reducedMotion=reduced;if(reduced){this.simulation.stop();this.running=false;}else this.resume();}
  snapshot():PhysicsSnapshot {return {alpha:this.simulation.alpha(),alphaTarget:this.simulation.alphaTarget(),running:this.running,ticks:this.ticks};}
  dispose():void {if(this.disposed)return;this.disposed=true;this.simulation.stop().on('tick',null).on('end',null);this.running=false;}
}
