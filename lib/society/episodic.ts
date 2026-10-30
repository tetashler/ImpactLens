import {freezeSnapshot} from '../experiments/validation.ts';
import {canAccessItem} from './communication.ts';
import type {Memory,SocietyWorld} from './contract.ts';

export interface Episode extends Memory {tick:number;counterparty:string;topicIds:string[];importance:number;access:'recheck-current-membership'}
export interface SocialIssue {id:string;kind:'question'|'condition'|'disagreement'|'commitment';topicId:string;sourceEventId:string;createdTick:number;status:'open'|'resolved'|'withdrawn';changedEventId:string|null}
export interface IssueUpdate {kind:SocialIssue['kind']|'resolve'|'withdraw';topicId:string;issueId:string|null}
export function selectedAgents(w:SocietyWorld){return Object.values(w.genesis.bindings).slice(0,w.genesis.input.hybrid?.selectedAgents??4);}
/** Only genuine reducer experiences enter the index. Content remains in private item records. */
export function rememberExperiences(w:SocietyWorld):SocietyWorld{
 if(!w.genesis.input.intelligence)return w;
 const event=w.events.at(-1);if(!event||!selectedAgents(w).includes(event.actorId))return w;
 const actor=w.agents.find(a=>a.id===event.actorId)!,entries=new Map((actor.episodic??[]).map(m=>[m.eventId,m]));
 for(const m of actor.memory){
  const item=w.items.find(i=>i.id===m.itemId),source=w.events.find(e=>e.id===m.itemId),encounter=w.events.find(e=>e.id===m.eventId);
  if(!item||!encounter||!canAccessItem(w,actor.id,item))continue;
  const direct=w.items.find(i=>i.id===item.parentId)?.actorId===actor.id;
  entries.set(m.eventId,{...m,tick:encounter.tick,counterparty:item.actorId,topicIds:source?.discussion?.topicIds??[],importance:direct?9:source?.sourceEventId?8:source?.source==='social-model'?7:m.kind==='authored'?4:2,access:'recheck-current-membership'});
 }
 const issues=actor.issues??[];
 const episodic=[...entries.values()].sort((a,b)=>((issues.some(i=>i.status==='open'&&i.sourceEventId===b.itemId)?20:0)+b.importance+b.tick/1000)-((issues.some(i=>i.status==='open'&&i.sourceEventId===a.itemId)?20:0)+a.importance+a.tick/1000)||b.eventId.localeCompare(a.eventId)).slice(0,w.genesis.input.intelligence.episodicEntries).sort((a,b)=>a.tick-b.tick||a.eventId.localeCompare(b.eventId));
 return {...w,agents:w.agents.map(a=>a.id===actor.id?freezeSnapshot({...a,episodic}):a)};
}
export function experiencedMemories(w:SocietyWorld,actorId:string):Memory[]{
 const actor=w.agents.find(a=>a.id===actorId)!;
 const all=w.genesis.input.intelligence?[...(actor.episodic??[]),...actor.memory]:actor.memory;
 return [...new Map(all.map(m=>[m.eventId,m])).values()].filter(m=>m.exposedIds.some(id=>{const item=w.items.find(i=>i.id===id);return item&&canAccessItem(w,actorId,item);}));
}
export function experienced(w:SocietyWorld,actorId:string,itemId:string){return experiencedMemories(w,actorId).some(m=>m.exposedIds.includes(itemId));}
export function applyIssue(w:SocietyWorld,actorId:string,update:IssueUpdate|null|undefined,eventId:string):SocietyWorld{
 if(!update)return w;
 const actor=w.agents.find(a=>a.id===actorId)!,event=w.events.find(e=>e.id===eventId)!;
 const issues=actor.issues??[];
 const next=update.issueId?issues.map(i=>i.id===update.issueId?{...i,status:update.kind==='resolve'?'resolved' as const:'withdrawn' as const,changedEventId:eventId}:i):[...issues,{id:'issue:'+eventId,kind:update.kind as SocialIssue['kind'],topicId:update.topicId,sourceEventId:eventId,createdTick:event.tick,status:'open' as const,changedEventId:null}].slice(-8);
 return {...w,agents:w.agents.map(a=>a.id===actorId?freezeSnapshot({...a,issues:next}):a)};
}
