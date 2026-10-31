import {canonical} from '../experiments/validation.ts';
import type {SocietyWorld} from './contract.ts';
import type {DecisionContext} from './decision-contract.ts';
import {DECISION_LIMITS} from './decision-contract.ts';
import {isDeep} from './deep-policy.ts';
import {deepConversationMetadata} from './deep-context.ts';
import {threadPath} from './exposure.ts';
import {buildDecisionMenu,replyMenuMetrics,encodeMenuContext,type DecisionOption} from './decision-menu.ts';

export interface ContextCapacityPacking {policy:'deep-byte-pack-v1';changed:boolean;fits:boolean;droppedMemoryReferences:number;droppedItemBodies:number;collapsedThreadRows:number}
export const decisionContextBytes=(c:DecisionContext)=>{const internal=new TextEncoder().encode(canonical(c)).length;return (c.policy==='conversation-menu-v3'||c.policy==='conversation-menu-v4')?Math.max(internal,new TextEncoder().encode(encodeMenuContext(c)).length):internal;};
const bytes=decisionContextBytes;
const replyActions=new Set(['comment','reply','group-reply']);

/** Overflow repair only: bounded historical/accepted contexts are never rewritten.
 * Drops optional context, never truncates text or creates an exposure/permission. */
export function packDeepContext(w:SocietyWorld,c:DecisionContext):ContextCapacityPacking {
 const report:ContextCapacityPacking={policy:'deep-byte-pack-v1',changed:false,fits:bytes(c)<=DECISION_LIMITS.contextBytes,droppedMemoryReferences:0,droppedItemBodies:0,collapsedThreadRows:0};
 if(report.fits||!isDeep(w))return report;
 const originalItems=c.items.length,originalMemories=c.memories.length,oldOmitted=c.diagnostics?.contextOmittedItems??0,oldCapacity=c.diagnostics?.omissionReasons.contextCapacity??oldOmitted;
 const source=c.opportunity?.sourceEventId??null;
 const primaryBinding=source?c.memories.find(m=>m.kind==='exposure'&&m.primaryItemId===source&&m.itemIds.includes(source)&&w.events.some(e=>e.id===m.eventId&&e.actorId===c.actor.id&&e.type==='read'&&e.targetId===source)):undefined;
 if(source&&(!c.items.some(i=>i.id===source)||!primaryBinding))return report;
 const sourcePath=source?threadPath(w,source):[],anchors=new Set(sourcePath.length?[sourcePath[0],sourcePath.at(-2),source].filter((id):id is string=>!!id):[]);
 const mandatoryMemoryId=primaryBinding?.eventId??null;
 report.changed=true;

 const reconcile=()=>{
  const retained=new Set(c.items.map(i=>i.id));
  c.memories=c.memories.filter(m=>retained.has(m.primaryItemId??'')).map(m=>({...m,itemIds:m.itemIds.filter(id=>retained.has(id))})).filter(m=>m.itemIds.length>0);
  c.blockedTargets=c.blockedTargets?.filter(t=>retained.has(t.targetId));
  c.readableIds=c.readableIds?.filter(id=>retained.has(id));
  c.issues=c.issues?.filter(issue=>retained.has(issue.sourceEventId)&&c.memories.some(m=>m.itemIds.includes(issue.sourceEventId)));
  const all=deepConversationMetadata(w,c.actor.id,[...retained]),perRoot=new Map<string,typeof all.threads[number]>();
  for(const row of all.threads){const prior=perRoot.get(row.rootId);if(!prior||row.ancestryCount>prior.ancestryCount||row.ancestryCount===prior.ancestryCount&&(row.targetId===source||prior.targetId!==source&&row.targetId.localeCompare(prior.targetId)<0))perRoot.set(row.rootId,row);}
  c.conversation={...all,threads:[...perRoot.values()]};report.collapsedThreadRows=Math.max(report.collapsedThreadRows,all.threads.length-c.conversation.threads.length);
  // Complete ancestry remains authoritative even if its redundant metadata row was collapsed.
  c.menu=buildDecisionMenu(c).filter(option=>!replyActions.has(option.action)||option.targetIndex===null||threadPath(w,c.items[option.targetIndex].id).length<64);
  const protectedOptions=new Set<DecisionOption>();
  const inactive=c.menu.find(o=>o.action==='inactive');if(inactive)protectedOptions.add(inactive);
  const focus=source?c.menu.find(o=>o.targetKind==='item'&&o.targetIndex!==null&&c.items[o.targetIndex].id===source&&replyActions.has(o.action))??c.menu.find(o=>o.targetKind==='item'&&o.targetIndex!==null&&c.items[o.targetIndex].id===source):c.menu.find(o=>['post','message'].includes(o.action));
  if(focus)protectedOptions.add(focus);
  const diagnostics=()=>{const metrics=replyMenuMetrics(c);c.diagnostics={...metrics,contextOmittedItems:oldOmitted+originalItems-c.items.length,omissionReasons:{menuCapacity:metrics.omittedPeerReplies,contextCapacity:oldCapacity+originalItems-c.items.length}};};
  diagnostics();
  while(bytes(c)>DECISION_LIMITS.contextBytes){const index=c.menu.findLastIndex(o=>!protectedOptions.has(o));if(index<0)break;c.menu.splice(index,1);diagnostics();}
 };
 reconcile();
 // Retrieval order is relevance-first. Its tail is optional; mandatory present exposure stays.
 while(bytes(c)>DECISION_LIMITS.contextBytes){
  const index=c.memories.findLastIndex(m=>m.eventId!==mandatoryMemoryId);if(index<0)break;
  const removed=c.memories.splice(index,1)[0];
  if(removed.primaryItemId&&!anchors.has(removed.primaryItemId)&&!c.memories.some(m=>m.primaryItemId===removed.primaryItemId))c.items=c.items.filter(i=>i.id!==removed.primaryItemId);
  reconcile();
 }
 // Keep a root/parent anchor when possible; they are still optional raw bodies.
 for(const preserveAnchors of [true,false])while(bytes(c)>DECISION_LIMITS.contextBytes){
  const candidates=c.items.map((item,index)=>({item,index})).filter(({item})=>item.id!==source&&(!preserveAnchors||!anchors.has(item.id)));
  candidates.sort((a,b)=>Number(c.memories.some(m=>m.primaryItemId===a.item.id))-Number(c.memories.some(m=>m.primaryItemId===b.item.id))||Number(!!a.item.directToActor)-Number(!!b.item.directToActor)||(a.item.tick??0)-(b.item.tick??0)||b.index-a.index);
  const removed=candidates[0];if(!removed)break;c.items=c.items.filter(i=>i.id!==removed.item.id);reconcile();
 }
 report.droppedMemoryReferences=originalMemories-c.memories.length;report.droppedItemBodies=originalItems-c.items.length;
 report.fits=bytes(c)<=DECISION_LIMITS.contextBytes&&(!source||c.items.some(i=>i.id===source)&&c.memories.some(m=>m.eventId===mandatoryMemoryId&&m.primaryItemId===source&&m.itemIds.includes(source)))&&!!c.menu?.some(o=>o.action==='inactive');
 return report;
}
