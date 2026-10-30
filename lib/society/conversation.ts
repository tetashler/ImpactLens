import type {Platform,SocietyWorld,SocialItem} from './contract.ts';
import {canAccessItem,eligibleChannels} from './communication.ts';
import {threadPath} from './exposure.ts';
export function conversationPriority(w:SocietyWorld,actorId:string,item:SocialItem){
 const parent=w.items.find(i=>i.id===item.parentId),path=threadPath(w,item.id);
 const model=w.events.find(e=>e.id===item.id)?.source==='social-model';
 const direct=parent?.actorId===actorId,active=path.some(id=>w.items.find(i=>i.id===id)?.actorId===actorId);
 const question=w.events.find(e=>e.id===item.id)?.discussion?.argument==='question';
 const seed=!!w.events.find(e=>e.id===item.id)?.sourceEventId;
 const seen=w.agents.find(a=>a.id===actorId)!.seen.includes(item.id);
 return (item.actorId===actorId?-100:direct&&model?200:active&&model?150:direct?100:active?80:model?60:question?50:seed&&!seen?40:!seen?20:0)+item.tick/1000;
}
/** Ranking never expands the feed's access boundary. A descendant is read through its visible root. */
export function conversationCandidates(w:SocietyWorld,actorId:string,platform:Platform,roots:SocialItem[]){
 const rootIds=new Set(roots.map(i=>i.id));
 return w.items.filter(i=>i.platform===platform&&canAccessItem(w,actorId,i)&&(rootIds.has(i.id)||rootIds.has(threadPath(w,i.id)[0])))
  .sort((a,b)=>conversationPriority(w,actorId,b)-conversationPriority(w,actorId,a)||b.tick-a.tick||a.id.localeCompare(b.id));
}
export function opportunityTick(steps:number,index:number,maxCalls:number){
 const slots=Math.min(maxCalls,Math.max(0,steps-1));
 return index>=slots?Infinity:Math.max(1,Math.min(steps-1,Math.floor((index+0.25)*steps/slots)));
}
export function conversationOpportunity(w:SocietyWorld,visible:(w:SocietyWorld,id:string,platform:Platform)=>SocialItem[]){
 const records=w.hybrid!.records,config=w.genesis.input.hybrid!;
 if(w.tick<opportunityTick(w.genesis.config.steps,records.length,config.maxCalls)||w.tick>=w.genesis.config.steps)return null;
 const ids=Object.values(w.genesis.bindings).slice(0,config.selectedAgents);
 const counts=new Map(ids.map(id=>[id,records.filter(r=>r.context.actor.id===id).length]));
 const candidates=ids.flatMap(actorId=>eligibleChannels(w,actorId).map(ch=>{
  const items=conversationCandidates(w,actorId,ch.id,visible(w,actorId,ch.id)),target=items.find(i=>i.actorId!==actorId)??items[0];
  const prior=records.filter(r=>r.context.actor.id===actorId&&r.context.platform===ch.id).length;
  return {actorId,platform:ch.id,targetId:target?.id,score:(target?conversationPriority(w,actorId,target):-200)-prior*0.1-records.filter(r=>r.context.platform===ch.id).length*40};
 }));
 candidates.sort((a,b)=>counts.get(a.actorId)!-counts.get(b.actorId)!||b.score-a.score||ids.indexOf(a.actorId)-ids.indexOf(b.actorId)||a.platform.localeCompare(b.platform));
 return candidates[0]??null;
}
