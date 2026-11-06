/** Browser-safe relationship data. A relationship is lineage, never implied causation. */
export const KNOWLEDGE_GRAPH_VERSION=1 as const;
export const NODE_CATEGORIES=['scenario','infrastructure','geography','assumption','population','result','source','planning','limitation'] as const;
export type NodeCategory=typeof NODE_CATEGORIES[number];
export const PROVENANCE_KINDS=['user-authored','source-backed','model-assumption','calculated','planning-only','synthetic-exploratory'] as const;
export type ProvenanceKind=typeof PROVENANCE_KINDS[number];
export interface KnowledgeProvenance {kind:ProvenanceKind;reference:string;url?:string}
export interface KnowledgeNode {
  id:string;label:string;category:NodeCategory;entityType?:string;description:string;details?:string;
  provenance:KnowledgeProvenance;properties:Record<string,string|number|boolean|null>;limitations:string[];
}
export const RELATIONSHIPS=['declares','contains','connects','ordered-before','uses','produces','describes','supported-by','limited-by','requires','plans','located-at','represents','compares','has-metric'] as const;
export type KnowledgeRelationship=typeof RELATIONSHIPS[number];
/** Reader-facing explanation of a relationship. Aggregate values only. */
export type EdgeBasis='assumed'|'recorded'|'proposed'|'reported';
export interface EdgeDetail {label:string;basis:EdgeBasis;headline:string;interaction?:string;where?:string;about?:string;outcome?:string;note?:string}
export interface KnowledgeEdge {id:string;source:string;target:string;relationship:KnowledgeRelationship;relationshipLabel?:string;description:string;provenance:KnowledgeProvenance;directed:boolean;detail?:EdgeDetail}
export interface KnowledgeGraph {version:1;scenarioIdentity:string;executionIdentity?:string;nodes:KnowledgeNode[];edges:KnowledgeEdge[];limitations:string[]}
export const GRAPH_LIMITS={nodes:1500,edges:6000,bytes:3_000_000,label:180,description:2000,details:8000,identity:160_000} as const;
function ensure(value:unknown,message='Invalid knowledge graph'):asserts value {if(!value)throw new Error(message);}
function object(value:unknown,allowed:readonly string[],required=allowed):Record<string,unknown>{
  ensure(value!==null&&typeof value==='object'&&!Array.isArray(value));const r=value as Record<string,unknown>;
  ensure(Object.keys(r).every(k=>allowed.includes(k))&&required.every(k=>Object.hasOwn(r,k)));return r;
}
function text(value:unknown,max:number):asserts value is string {ensure(typeof value==='string'&&value.trim().length>0&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value));}
function displayType(value:unknown):void {text(value,80);ensure(!/[<>]/.test(value as string),'Invalid graph display type');}
function identifier(value:unknown):asserts value is string {text(value,180);ensure(/^[A-Za-z0-9][A-Za-z0-9._:~-]*$/.test(value));}
function strings(value:unknown,max=30):void {ensure(Array.isArray(value)&&value.length<=max);for(const s of Array.from(value))text(s,2000);}
function provenance(value:unknown):void {
  const p=object(value,['kind','reference','url'],['kind','reference']);ensure(PROVENANCE_KINDS.includes(p.kind as ProvenanceKind));text(p.reference,2000);
  if(p.url!==undefined){text(p.url,2048);const url=new URL(p.url as string);ensure(url.protocol==='https:'&&!url.username&&!url.password,'Unsafe knowledge source URL');}
}
/** Strict, bounded validation followed by detached values; no HTML or URL fetching. */
export function parseKnowledgeGraph(value:unknown):KnowledgeGraph {
  const g=object(value,['version','scenarioIdentity','executionIdentity','nodes','edges','limitations'],['version','scenarioIdentity','nodes','edges','limitations']);
  ensure(g.version===1,'Unsupported knowledge graph version');text(g.scenarioIdentity,GRAPH_LIMITS.identity);if(g.executionIdentity!==undefined)text(g.executionIdentity,GRAPH_LIMITS.identity);
  ensure(Array.isArray(g.nodes)&&g.nodes.length<=GRAPH_LIMITS.nodes);ensure(Array.isArray(g.edges)&&g.edges.length<=GRAPH_LIMITS.edges);strings(g.limitations);
  const nodes=new Set<string>(),edges=new Set<string>();
  for(const v of Array.from(g.nodes)){
    const n=object(v,['id','label','category','entityType','description','details','provenance','properties','limitations'],['id','label','category','description','provenance','properties','limitations']);
    identifier(n.id);ensure(!nodes.has(n.id),'Duplicate knowledge node');nodes.add(n.id);text(n.label,GRAPH_LIMITS.label);text(n.description,GRAPH_LIMITS.description);
    ensure(NODE_CATEGORIES.includes(n.category as NodeCategory));if(n.entityType!==undefined)displayType(n.entityType);if(n.details!==undefined)text(n.details,GRAPH_LIMITS.details);provenance(n.provenance);strings(n.limitations);
    ensure(n.properties!==null&&typeof n.properties==='object'&&!Array.isArray(n.properties));const entries=Object.entries(n.properties);ensure(entries.length<=40);
    for(const [key,value]of entries){text(key,100);ensure(!['__proto__','prototype','constructor'].includes(key));if(typeof value==='string')text(value,2000);else ensure(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value));}
  }
  for(const v of Array.from(g.edges)){
    const e=object(v,['id','source','target','relationship','relationshipLabel','description','provenance','directed','detail'],['id','source','target','relationship','description','provenance','directed']);if(e.relationshipLabel!==undefined)displayType(e.relationshipLabel);identifier(e.id);ensure(!edges.has(e.id)&&!nodes.has(e.id),'Duplicate knowledge identity');edges.add(e.id);
    ensure(typeof e.source==='string'&&typeof e.target==='string'&&nodes.has(e.source)&&nodes.has(e.target),'Unknown knowledge endpoint');ensure(RELATIONSHIPS.includes(e.relationship as KnowledgeRelationship));
    text(e.description,GRAPH_LIMITS.description);ensure(typeof e.directed==='boolean');provenance(e.provenance);if(e.detail!==undefined){const x=object(e.detail,['label','basis','headline','interaction','where','about','outcome','note'],['label','basis','headline']);ensure(['assumed','recorded','proposed','reported'].includes(x.basis as string),'Invalid edge detail');displayType(x.label);for(const k of ['headline','interaction','where','about','outcome','note'])if(x[k]!==undefined){text(x[k],400);ensure(!/[<>]/.test(x[k] as string),'Invalid edge detail');}}
  }
  ensure(new TextEncoder().encode(JSON.stringify(value)).byteLength<=GRAPH_LIMITS.bytes,'Knowledge graph exceeds payload budget');
  return structuredClone(value) as KnowledgeGraph;
}
