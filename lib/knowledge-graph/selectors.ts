import type {KnowledgeGraph,KnowledgeNode,NodeCategory,KnowledgeEdge} from './contract.ts';

/** Search only supported entity text/IDs; never creates entities or relationships. */
export function searchKnowledgeNodes(graph:KnowledgeGraph,query:string):KnowledgeNode[]{
  const q=query.trim().toLocaleLowerCase('en-SG');if(!q)return graph.nodes;
  return graph.nodes.filter(n=>`${n.label} ${n.category} ${n.description} ${n.id} ${Object.values(n.properties).join(' ')}`.toLocaleLowerCase('en-SG').includes(q));
}
/** Category filtering preserves full source identity and only edges with visible endpoints. */
export function filterKnowledgeGraph(graph:KnowledgeGraph,categories:readonly NodeCategory[]):KnowledgeGraph{
  const allowed=new Set(categories),nodes=graph.nodes.filter(n=>allowed.has(n.category)),ids=new Set(nodes.map(n=>n.id));
  return {...graph,nodes,edges:graph.edges.filter(e=>ids.has(e.source)&&ids.has(e.target))};
}
export function knowledgeRelationships(graph:KnowledgeGraph,nodeId:string):KnowledgeEdge[]{return graph.edges.filter(e=>e.source===nodeId||e.target===nodeId);}
export function knowledgeNeighbours(graph:KnowledgeGraph,nodeId:string):Set<string>{
  return new Set(knowledgeRelationships(graph,nodeId).map(e=>e.source===nodeId?e.target:e.source).filter(id=>id!==nodeId));
}
