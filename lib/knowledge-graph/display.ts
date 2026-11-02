import type {KnowledgeGraph,KnowledgeNode,KnowledgeEdge} from './contract.ts';
const colours=['#80ded1','#a6b6ff','#e9b679','#d6a6ee','#7dc7ec','#b2d487','#eea4b9','#a9becf','#e5cc87','#88cfb1','#c0a7e5','#efb297'];
// Broad hues come first; the remaining pastels extend the categorical key to
// the ontology's sixteen types. None encodes approval, provenance or opinion.
const graphColours=['#80ded1','#a6b6ff','#e9b679','#d6a6ee','#b2d487','#eea4b9','#7dc7ec','#e5cc87','#a9becf','#88cfb1','#c0a7e5','#efb297','#d0d8ee','#d4c3a5','#d6a9d0','#a3cdbd'];
const lightGraphColours=['#0a8696','#5b5fc7','#bf6a14','#a352c4','#51862a','#d4487a','#2a78c8','#9c7a0c','#5f7a8c','#1a8664','#7f62c9','#c4552f','#4a6fa5','#92784d','#b65aa5','#3a8570'];
export type GraphAppearance='light'|'dark';
export function isArchivedGraphView(scope:{kind:'current'|'experiment'|'run';graph?:KnowledgeGraph},activeRunId:string|undefined,archiveSelected:boolean):boolean{return scope.kind==='experiment'||scope.kind==='run'&&(archiveSelected||!activeRunId||scope.graph?.executionIdentity!==activeRunId);}
/** Type is presentation, independently assigned from evidence provenance. */
export function knowledgeEntityType(node:KnowledgeNode):string{return node.entityType??node.category.replace(/^./,c=>c.toUpperCase());}
/** Captions only; the canonical label and identity remain untouched. */
export function knowledgeNodeLabel(node:KnowledgeNode):string {
  const p=node.properties,participant=typeof p.agentId==='string';
  const role=!participant&&!p.entityId&&(typeof p.roleId==='string'||p.recordType==='role');
  const suffix=participant&&p.roleId?' · participant':role?' · role':'';
  const label=(node.label.trim()||knowledgeEntityType(node)).replace(/\s+/g,' ');
  const base=suffix?label.replace(/\s*\(participant\)\s*$/i,''):label;
  const legacy=!p.presentationCategory&&!p.recordType&&!suffix;
  const limit=(legacy?28:44)-Array.from(suffix).length,characters=Array.from(base);
  if(characters.length<=limit)return base+suffix;
  const clipped=characters.slice(0,limit-1).join('');
  const boundary=clipped.lastIndexOf(' ');
  return (!legacy&&boundary>limit*.6?clipped.slice(0,boundary):clipped).trimEnd()+'…'+suffix;
}
export function knowledgeRelationshipLabel(edge:KnowledgeEdge):string{return edge.relationshipLabel??edge.relationship;}
export function entityTypeColour(type:string):string{let hash=2166136261;for(const c of type.toLocaleLowerCase('en-SG'))hash=Math.imul(hash^c.charCodeAt(0),16777619);return colours[(hash>>>0)%colours.length];}
/** Always use the complete graph, so discovery and type filters retain colours.
 * Dynamic names remain valid. Beyond sixteen types colours repeat deliberately;
 * the labelled type key and record shapes remain available for identification. */
export function graphEntityTypeColours(graph:KnowledgeGraph,appearance:GraphAppearance='dark'):Map<string,string>{
  const names=[...new Set(graph.nodes.map(knowledgeEntityType))].sort((a,b)=>a<b?-1:a>b?1:0);
  const palette=appearance==='light'?lightGraphColours:graphColours;
  return new Map(names.map((name,index)=>[name,names.length===1&&appearance==='dark'?entityTypeColour(name):palette[index%palette.length]]));
}
export function graphEntityTypes(graph:KnowledgeGraph,appearance:GraphAppearance='dark'):{name:string;colour:string;count:number}[]{const palette=graphEntityTypeColours(graph,appearance),counts=new Map<string,number>();for(const n of graph.nodes){const name=knowledgeEntityType(n);counts.set(name,(counts.get(name)??0)+1);}return [...counts].sort(([a],[b])=>a.localeCompare(b)).map(([name,count])=>({name,count,colour:palette.get(name)!}));}
