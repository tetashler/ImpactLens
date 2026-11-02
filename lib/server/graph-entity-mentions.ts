import type {KnowledgeNode} from '../knowledge-graph/contract.ts';
const normalize=(value:string)=>value.replace(/([a-z])([A-Z])/g,'$1 $2').normalize('NFKC').toLowerCase().replace(/['’]s\b/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const generic=new Set(['clinic','station','line','facility','shop','group','area','community','resident','residents','government']);
/** Conservative literal references, not a semantic assertion that an entity spoke or adopted a view. */
export function graphEntityMention(node:KnowledgeNode,statement:string):boolean {
 const p=node.properties;
 if(typeof p.agentId==='string'||typeof p.roleId==='string'||['communication-platform','fictional-messaging-group','fictional-agent-aggregate','citizen-commute-aggregate'].includes(String(p.recordType)))return false;
 const full=normalize(node.label),short=full.replace(/^(?:(?:the|existing|proposed|planned|future|new|current) )+/,'');
 const aliases=[full,...(short!==full&&!generic.has(short)?[short]:[])].filter(value=>value.length>=4&&!generic.has(value));
 const text=` ${normalize(statement)} `;
 return aliases.some(alias=>text.includes(` ${alias} `));
}
