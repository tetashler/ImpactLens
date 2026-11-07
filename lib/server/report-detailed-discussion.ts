/** The public discussion extractor is internal: sanitize its identifiers before model input. */
import {createHash} from 'node:crypto';
import type {PublicDiscussionEvidence} from '../report-summary/discussion-contract.ts';
type SafeStatement=PublicDiscussionEvidence['statements'][number]&{minute?:number|null;replyToId?:string|null};
export type SafeDetailedDiscussion=Omit<PublicDiscussionEvidence,'statements'>&{statements:SafeStatement[]};
function identifiers(pack:PublicDiscussionEvidence){return [...new Set([...pack.statements.flatMap(statement=>[statement.id,...statement.nodeIds,...(typeof (statement as SafeStatement).replyToId==='string'?[(statement as SafeStatement).replyToId!]:[])]),...pack.nodes.map(node=>node.nodeId)])].filter(id=>typeof id==='string'&&id.length>0&&id.length<=160).sort((a,b)=>b.length-a.length);}
function token(id:string,global=false){const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp(`(^|[^A-Za-z0-9_-])${escaped}(?=$|[^A-Za-z0-9_-])`,global?'g':'');}
export function sanitizeDetailedDiscussion(runId:string,pack:PublicDiscussionEvidence):SafeDetailedDiscussion{
 const ids=identifiers(pack),reference=(id:string)=>'public-ref-'+createHash('sha256').update(JSON.stringify([runId,id])).digest('hex').slice(0,32);
 const clean=(text:string,max:number)=>{let result=text;for(const id of ids)result=result.replace(token(id,true),(_match,prefix)=>prefix+reference(id));return result.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').slice(0,max);};
 const selected=pack.statements.slice(0,64),eventIds=new Set(selected.map(s=>s.id)),nodes=pack.nodes.slice(0,32),nodeIds=new Set(nodes.map(n=>n.nodeId));
 return {version:1,scope:clean(pack.scope,1200),initialStatements:pack.initialStatements,followupStatements:pack.followupStatements,omitted:pack.omitted+Math.max(0,pack.statements.length-selected.length),
  statements:selected.map(statement=>{const detail=statement as SafeStatement;return {id:reference(statement.id),actor:clean(statement.actor,180),nodeIds:statement.nodeIds.filter(id=>nodeIds.has(id)).slice(0,16).map(reference),phase:statement.phase,text:clean(statement.text,1600),...(Object.hasOwn(detail,'minute')?{minute:typeof detail.minute==='number'&&Number.isFinite(detail.minute)&&detail.minute>=0?detail.minute:null}:{}),...(Object.hasOwn(detail,'replyToId')?{replyToId:typeof detail.replyToId==='string'&&eventIds.has(detail.replyToId)?reference(detail.replyToId):null}:{})};}),
  nodes:nodes.map(node=>({nodeId:reference(node.nodeId),label:clean(node.label,180),kind:clean(node.kind,80),description:clean(node.description,640)})),
 };
}
/** Guard all free text, including chapters, if a completion somehow returns an internal identifier. */
export function assertNoRawDiscussionIdentifiers(value:unknown,pack:PublicDiscussionEvidence):void{
 const patterns=identifiers(pack).map(id=>token(id));
 function visit(item:unknown){if(typeof item==='string'){if(patterns.some(pattern=>pattern.test(item)))throw Error('REPORT_PRIVATE_REFERENCE');}else if(Array.isArray(item))item.forEach(visit);else if(item&&typeof item==='object')Object.values(item).forEach(visit);}
 visit(value);
}
