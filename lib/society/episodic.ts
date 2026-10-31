import {cohortIds} from './swarm.ts';
import {freezeSnapshot} from '../experiments/validation.ts';
import {canAccessItem} from './communication.ts';
import {isDeep} from './deep-policy.ts';
import {ensure} from '../experiments/validation.ts';
import {threadPath} from './exposure.ts';
import type {Memory,SocietyWorld} from './contract.ts';

export interface Episode extends Memory {tick:number;counterparty:string;topicIds:string[];importance:number;access:'recheck-current-membership'}
export interface GroundedIssueState {subjectId:string;basisRef:string;quote:string;criterion:string|null;statusEvidence:'open'|'updated'|'owner-reported-resolution'|'deterministically-evidenced-satisfaction'|'owner-withdrawal';updates:{eventId:string;basisRef:string;quote:string;statusEvidence:string}[]}
export interface SocialIssue {grounding?:GroundedIssueState;id:string;kind:'question'|'condition'|'disagreement'|'commitment';topicId:string;sourceEventId:string;createdTick:number;status:'open'|'resolved'|'withdrawn';changedEventId:string|null}
export interface IssueUpdate {kind:SocialIssue['kind']|'resolve'|'withdraw'|'progress';topicId:string;issueId:string|null;grounding?:GroundedIssueState}
export function selectedAgents(w:SocietyWorld){return w.genesis.input.swarm?cohortIds(w):Object.values(w.genesis.bindings).slice(0,w.genesis.input.hybrid?.selectedAgents??4);}
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
 const issues=isDeep(w)?actor.issueHistory??actor.issues??[]:actor.issues??[];
 // Deep retention indexes distinct primary sources. The full encounter journal is unchanged.
 const candidates=isDeep(w)?[...entries.values()].reduce((sources,m)=>{const prior=sources.get(m.itemId);if(!prior||m.tick>prior.tick||m.tick===prior.tick&&w.events.findIndex(e=>e.id===m.eventId)>w.events.findIndex(e=>e.id===prior.eventId))sources.set(m.itemId,m);return sources;},new Map<string,Episode>()).values():entries.values();
 const score=(m:Episode)=>(issues.some(i=>i.status==='open'&&i.sourceEventId===m.itemId)?20:0)+m.importance+m.tick/1000;
 const pool=[...candidates],retained:Episode[]=[];
 if(isDeep(w)&&pool.length>w.genesis.input.intelligence.episodicEntries){
  // A modest metadata-only penalty preserves distinctive sources without forcing quotas.
  const rows=pool.map(m=>({m,root:threadPath(w,m.itemId)[0],base:score(m),penalty:0}));
  while(rows.length&&retained.length<w.genesis.input.intelligence.episodicEntries){rows.sort((a,b)=>(b.base-b.penalty)-(a.base-a.penalty)||b.m.eventId.localeCompare(a.m.eventId));const selected=rows.shift()!;retained.push(selected.m);for(const row of rows)row.penalty=Math.max(row.penalty,(row.root===selected.root?2:0)+(row.m.counterparty===selected.m.counterparty?0.75:0)+(row.m.topicIds.some(t=>selected.m.topicIds.includes(t))?0.25:0));}
 }else retained.push(...pool.sort((a,b)=>score(b)-score(a)||b.eventId.localeCompare(a.eventId)).slice(0,w.genesis.input.intelligence.episodicEntries));
 const episodic=retained.sort((a,b)=>a.tick-b.tick||a.eventId.localeCompare(b.eventId));
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
 if(isDeep(w)){
  ensure(actor&&event&&event.actorId===actorId&&['post','comment','reply','message','group-reply'].includes(event.type),'ISSUE_SOURCE');
  const history=actor.issueHistory??actor.issues??[],existing=update.issueId?history.find(i=>i.id===update.issueId):undefined;
  if(update.issueId)ensure(existing&&existing.status==='open'&&existing.topicId===update.topicId&&(w.genesis.input.citizenGrounding?['progress','resolve','withdraw']:['resolve','withdraw']).includes(update.kind),'ISSUE_STATUS');
  else ensure(history.length<16&&!['resolve','withdraw'].includes(update.kind),'ISSUE_LIMIT');
  let next:SocialIssue[];
  if(w.genesis.input.citizenGrounding){
   const g=update.grounding;ensure(g&&typeof g.quote==='string'&&g.quote.length<=240&&event.text?.includes(g.quote)&&g.subjectId.length<=80,'ISSUE_EVIDENCE');
   if(update.issueId){ensure(existing&&existing.status==='open'&&existing.topicId===update.topicId&&['progress','resolve','withdraw'].includes(update.kind)&&existing.grounding?.subjectId===g.subjectId,'ISSUE_STATUS');
    const status=update.kind==='progress'?'open':update.kind==='resolve'?'resolved':'withdrawn';
    next=history.map(i=>i.id===existing.id?{...i,status,changedEventId:eventId,grounding:{...g,criterion:i.grounding!.criterion,updates:[...i.grounding!.updates,{eventId,basisRef:g.basisRef,quote:g.quote,statusEvidence:g.statusEvidence}].slice(-16)}}:i);
   }else{ensure(history.length<16&&!['progress','resolve','withdraw'].includes(update.kind)&&!history.some(i=>i.status==='open'&&i.grounding?.subjectId===g.subjectId),'ISSUE_LIMIT');next=[...history,{id:'issue:'+eventId,kind:update.kind as SocialIssue['kind'],topicId:update.topicId,sourceEventId:eventId,createdTick:event.tick,status:'open',changedEventId:null,grounding:g}];}
  }else next=update.issueId?history.map(i=>i.id===update.issueId?{...i,status:update.kind==='resolve'?'resolved':'withdrawn',changedEventId:eventId}:i):[...history,{id:'issue:'+eventId,kind:update.kind as SocialIssue['kind'],topicId:update.topicId,sourceEventId:eventId,createdTick:event.tick,status:'open',changedEventId:null}];
  const open=next.filter(i=>i.status==='open'),closed=next.filter(i=>i.status!=='open');
  return {...w,agents:w.agents.map(a=>a.id===actorId?freezeSnapshot({...a,issueHistory:next,issues:[...open,...closed.reverse()].slice(0,8)}):a)};
 }
 const issues=actor.issues??[];
 const next=update.issueId?issues.map(i=>i.id===update.issueId?{...i,status:update.kind==='resolve'?'resolved' as const:'withdrawn' as const,changedEventId:eventId}:i):[...issues,{id:'issue:'+eventId,kind:update.kind as SocialIssue['kind'],topicId:update.topicId,sourceEventId:eventId,createdTick:event.tick,status:'open' as const,changedEventId:null}].slice(-8);
 return {...w,agents:w.agents.map(a=>a.id===actorId?freezeSnapshot({...a,issues:next}):a)};
}
