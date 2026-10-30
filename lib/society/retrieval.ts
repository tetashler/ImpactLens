/** episodic-topic-v2 only. Pure bounded retrieval; no inferred synonyms, embeddings or global topic expansion. */
import type {Memory,SocietyWorld} from './contract.ts';
import {canAccessItem} from './communication.ts';
import {threadPath} from './exposure.ts';
import {DECISION_LIMITS} from './decision-contract.ts';

export interface TopicScore {
 eventId:string;topic:number;counterparty:number;importance:number;recency:number;lexical:number;issue:number;
 redundancy:number;score:number;lexicalMatches:number;
 exclusion:'none'|'permission'|'ancestry'|'item-limit'|'duplicate-source'|'no-relevance'|'rank-bound';
}
const functionWords=new Set('the and for with this that from was are can would could should have has had will what when where who how must now not but our their them its before after than then your about into also some does did'.split(' '));
const words=(s:string)=>new Set((s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)??[]).filter(t=>!functionWords.has(t)));
const overlap=(a:Set<string>,b:Set<string>)=>[...a].filter(t=>b.has(t)).length;

export function retrieveTopicMemories(w:SocietyWorld,actorId:string,eligible:Memory[]){
 const actor=w.agents.find(a=>a.id===actorId)!,items=new Map(w.items.map(i=>[i.id,i])),events=new Map(w.events.map((e,index)=>[e.id,{event:e,index}]));
 const episodes=new Map((actor.episodic??[]).map(m=>[m.eventId,m])),experienced=new Set(eligible.flatMap(m=>m.exposedIds));
 const validTopics=new Set(w.genesis.input.communication?.topics.map(t=>t.id)??[]);
 const pathFor=(id:string)=>{const path=threadPath(w,id);return path.length&&path.every(p=>experienced.has(p)&&canAccessItem(w,actorId,items.get(p)!))?path:[];};
 const sequence=(m:Memory)=>events.get(m.eventId)?.index??-1;
 const tick=(m:Memory)=>events.get(m.eventId)?.event.tick??0;
 // Pool order is not chronological after short-term and episodic merging. V2 uses actual encounter order.
 const latest=eligible.filter(m=>m.kind==='exposure'&&pathFor(m.itemId).length).sort((a,b)=>tick(b)-tick(a)||sequence(b)-sequence(a)||a.eventId.localeCompare(b.eventId))[0];
 const queryPath=latest?pathFor(latest.itemId):[],queryItem=latest?items.get(latest.itemId):undefined;
 const topicsFor=(path:string[])=>new Set(path.flatMap(id=>events.get(id)?.event.discussion?.topicIds??[]).filter(id=>validTopics.has(id)));
 const queryTopics=topicsFor(queryPath),queryWords=words(queryItem?.text??''),goalWords=words(actor.goal);
 const mostRecent=new Map<string,Memory>();for(const m of eligible){const prior=mostRecent.get(m.itemId);if(!prior||tick(m)>tick(prior)||tick(m)===tick(prior)&&sequence(m)>sequence(prior))mostRecent.set(m.itemId,m);}
 const rows=eligible.map(m=>{
  const item=items.get(m.itemId),path=item?pathFor(item.id):[],episode=episodes.get(m.eventId);
  const accessible=!!item&&canAccessItem(w,actorId,item),tokens=accessible&&path.length?words(item.text):new Set<string>();
  const topics=accessible?topicsFor(path):new Set<string>(),matches=overlap(tokens,queryWords);
  const open=(actor.issues??[]).some(i=>i.status==='open'&&i.sourceEventId===m.itemId);
  const queryLexical=matches/Math.sqrt(Math.max(1,tokens.size));
  const details:TopicScore={eventId:m.eventId,topic:6*overlap(topics,queryTopics)/Math.sqrt(Math.max(1,topics.size)),counterparty:item&&queryItem&&item.actorId===queryItem.actorId&&item.actorId!==actorId?0.6:0,importance:(episode?.importance??2)/5,recency:0.6/(1+Math.max(0,w.tick-tick(m))/20),lexical:Math.min(4,queryLexical+0.2*overlap(tokens,goalWords)/Math.sqrt(Math.max(1,tokens.size))),issue:open?(overlap(topics,queryTopics)>0?4:1):0,redundancy:0,score:0,lexicalMatches:matches,exclusion:!accessible?'permission':!path.length?'ancestry':mostRecent.get(m.itemId)!==m?'duplicate-source':'rank-bound'};
  details.score=details.topic+details.counterparty+details.importance+details.recency+details.lexical+details.issue;
  // Importance/counterparty are tie-strength signals, not evidence that a different subject is relevant.
  if(details.exclusion==='rank-bound'&&m!==latest&&details.topic===0&&queryLexical<0.35&&details.issue===0&&path[0]!==queryPath[0])details.exclusion='no-relevance';
  return {m,item,path,tokens,details};
 });
 const selected:typeof rows=[],boundedIds:string[]=[],available=rows.filter(r=>r.details.exclusion==='rank-bound');
 const penalty=(r:typeof rows[number])=>selected.reduce((max,s)=>{
  const similarity=overlap(r.tokens,s.tokens)/Math.max(1,new Set([...r.tokens,...s.tokens]).size);
  return Math.max(max,(similarity>=0.85?1.5:0)+(r.path[0]===s.path[0]?0.75:0)+(r.item?.actorId===s.item?.actorId?0.25:0)+(r.item?.platform===s.item?.platform?0.1:0));
 },0);
 const add=(r:typeof rows[number])=>{const extra=r.path.filter(id=>!boundedIds.includes(id));if(boundedIds.length+extra.length>DECISION_LIMITS.items){r.details.exclusion='item-limit';return false;}boundedIds.push(...extra);r.details.exclusion='none';selected.push(r);return true;};
 // Preserve a valid present encounter, without forcing old, cross-platform or private memories.
 const anchor=available.find(r=>r.m===latest);if(anchor){available.splice(available.indexOf(anchor),1);add(anchor);}
 while(available.length&&selected.length<DECISION_LIMITS.memories){
  for(const r of available){r.details.redundancy=penalty(r);r.details.score=r.details.topic+r.details.counterparty+r.details.importance+r.details.recency+r.details.lexical+r.details.issue-r.details.redundancy;}
  available.sort((a,b)=>b.details.score-a.details.score||tick(b.m)-tick(a.m)||a.m.eventId.localeCompare(b.m.eventId));
  add(available.shift()!);
 }
 // Additional legitimately encountered context is optional; selected primary content has already secured its ancestry.
 for(const r of selected)for(const id of r.m.exposedIds){const path=pathFor(id),extra=path.filter(p=>!boundedIds.includes(p));if(path.length&&boundedIds.length+extra.length<=DECISION_LIMITS.items)boundedIds.push(...extra);}
 return {selected:selected.map(r=>r.m),itemIds:boundedIds,scores:rows.map(r=>r.details)};
}
