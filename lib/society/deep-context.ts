import type {Platform,SocietyWorld,SocialItem} from './contract.ts';
import {isDeep,deepLimits} from './deep-policy.ts';
import {canAccessItem,channelFor} from './communication.ts';
import {experiencedMemories} from './episodic.ts';
import {threadPath,conversationIndex} from './exposure.ts';
import {isBehaviourQuality} from './intelligence.ts';

/** Private server metadata only. Omitted messages are not described or supplied implicitly. */
export interface ConversationWindowMetadata {version:1;policy:'conversation-window-v1';maxAncestry:64;threads:{targetId:string;rootId:string;ancestryCount:number;omittedAncestors:number;providedIds:string[]}[]}
export function deepConversationMetadata(w:SocietyWorld,actorId:string,itemIds:string[]):ConversationWindowMetadata{
 const threads:ConversationWindowMetadata['threads']=[];
 if(isDeep(w)){
  const provided=new Set(itemIds.slice(0,deepLimits(w).contextItems)),exposed=new Set(experiencedMemories(w,actorId).flatMap(m=>m.exposedIds)),items=conversationIndex(w).items;
  for(const id of provided){const path=threadPath(w,id);if(!path.length||!path.every(p=>exposed.has(p)&&canAccessItem(w,actorId,items.get(p)!)))continue;threads.push({targetId:id,rootId:path[0],ancestryCount:path.length,omittedAncestors:path.filter(p=>!provided.has(p)).length,providedIds:path.filter(p=>provided.has(p))});}
 }
 return {version:1,policy:'conversation-window-v1',maxAncestry:64,threads};
}

/** A bounded inbox of legal read candidates, not permission to reply without a recorded read. */
export function privateDiscussionInbox(w:SocietyWorld,actorId:string,platform:Platform,eligible?:(item:SocialItem)=>boolean){
 if(!isDeep(w)||channelFor(w,platform)?.style!=='private-group')return [];
 const {items,sequence}=conversationIndex(w);
 const quality=isBehaviourQuality(w.genesis.input.intelligence),modern=!!w.genesis.input.swarm?.multiDay||quality;
 const handled=new Set(modern?(w.hybrid?.records??[]).filter(r=>r.context.actor.id===actorId).map(r=>r.context.opportunity?.sourceEventId).filter(Boolean):[]);
 const repeated=new Set<string>();
 if(modern){
  const seen=new Set<string>();
  // An inaccessible earlier copy is not evidence that this recipient received it.
  // Group scope also keeps separate coordination spaces independently discoverable.
  const history=quality?w.items.filter(i=>i.groupId&&i.platform===platform&&canAccessItem(w,actorId,i)):w.items;
  for(const item of history){
   const root=item.parentId?threadPath(w,item.id)[0]??item.parentId:item.platform+'|'+(quality?item.groupId+'|':'')+'root-post';
   const fingerprint=item.text.toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu,' ').trim(),key=item.actorId+'|'+root+'|'+fingerprint;
   if(seen.has(key))repeated.add(item.id);seen.add(key);
  }
 }
 // Saturated histories must not let ineligible items consume the bounded queue.
 // This is candidate discovery only: an actual reducer read is still required.
 return w.items.filter(i=>i.groupId&&i.platform===platform&&canAccessItem(w,actorId,i)&&(!modern||i.actorId!==actorId&&!handled.has(i.id)&&!repeated.has(i.id))&&(!eligible||eligible(i))).sort((a,b)=>Number(items.get(b.parentId??'')?.actorId===actorId)-Number(items.get(a.parentId??'')?.actorId===actorId)||b.tick-a.tick||sequence.get(b.id)!-sequence.get(a.id)!).slice(0,16);
}
