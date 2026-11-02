import type {KnowledgeGraph,KnowledgeNode,KnowledgeEdge} from './contract.ts';
const colours=['#80ded1','#a6b6ff','#e9b679','#d6a6ee','#7dc7ec','#b2d487','#eea4b9','#a9becf','#e5cc87','#88cfb1','#c0a7e5','#efb297'];
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
export function graphEntityTypes(graph:KnowledgeGraph):{name:string;colour:string;count:number}[]{const counts=new Map<string,number>();for(const n of graph.nodes){const name=knowledgeEntityType(n);counts.set(name,(counts.get(name)??0)+1);}return [...counts].sort(([a],[b])=>a.localeCompare(b)).map(([name,count])=>({name,count,colour:entityTypeColour(name)}));}
