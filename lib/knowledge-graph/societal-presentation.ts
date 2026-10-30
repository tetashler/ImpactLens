import type {KnowledgeGraph} from './contract.ts';
import {searchKnowledgeNodes} from './selectors.ts';

export interface SocietalVisibilityOptions {focusedNodeId?:string|null;revealedNodeIds?:readonly string[];query?:string;maxReveal?:number}

/** Presentation only: candidates already crossed the public summary allowlist. */
export function visibleGraphNodeIds(graph:KnowledgeGraph,options:SocietalVisibilityOptions={}):Set<string>{
 const nodes=new Map(graph.nodes.map(n=>[n.id,n])),visible=new Set(graph.nodes.filter(n=>n.properties.presentationPrimary!==false).map(n=>n.id));
 const limit=(value:number|undefined,fallback:number)=>value===undefined?fallback:Math.max(0,Math.min(100,Number.isFinite(value)?Math.floor(value):0));
 const queryLimit=limit(options.maxReveal,24),neighborLimit=limit(options.maxReveal,32),seeds=new Set<string>();
 for(const id of [...(options.revealedNodeIds??[]),...(options.focusedNodeId?[options.focusedNodeId]:[])])if(nodes.has(id)){visible.add(id);seeds.add(id);}
 if(options.query?.trim()){
  const matches=searchKnowledgeNodes(graph,options.query).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,queryLimit);
  for(const n of matches){visible.add(n.id);seeds.add(n.id);}
 }
 // Expand only explicit/query seeds; expanding every primary platform would
 // immediately disclose the entire background population in the initial view.
 const neighbors=new Set<string>();
 for(const e of graph.edges){if(seeds.has(e.source)&&!visible.has(e.target))neighbors.add(e.target);if(seeds.has(e.target)&&!visible.has(e.source))neighbors.add(e.source);}
 const ranked=[...neighbors].filter(id=>nodes.has(id)).sort((a,b)=>Number(nodes.get(b)!.properties.significanceScore??0)-Number(nodes.get(a)!.properties.significanceScore??0)||a.localeCompare(b));
 for(const id of ranked.slice(0,neighborLimit))visible.add(id);
 return visible;
}

/** Keeps original IDs, properties, provenance and only edges with visible endpoints. */
export function selectSocietalGraphVisibility(graph:KnowledgeGraph,options:SocietalVisibilityOptions={}):KnowledgeGraph{
 const ids=visibleGraphNodeIds(graph,options);
 return {...graph,nodes:graph.nodes.filter(n=>ids.has(n.id)),edges:graph.edges.filter(e=>ids.has(e.source)&&ids.has(e.target))};
}
