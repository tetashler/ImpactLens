import type {SocietyWorld} from './contract.ts';import type {DecisionContext} from './decision-contract.ts';
import {canAccessItem} from './communication.ts';
import type {TopicScore} from './retrieval.ts';
/** Selected means ranking-stage selection; included counts supplied references, primary-items counts supplied content. Item-filtered combines ancestry/access and item limits.
 * Separate protected audit DTO. Never added to a world, accepted context, public summary or replay identity. */
export interface MemoryRetrievalDiagnostics {
 version:1;actorId:string;tick:number;policy:string;shortTermEntries:number;episodicEntries:number;experiencedEvents:number;shortTermEvictions:number;
 episodicOnlyCandidates:number;episodicOnlySelected:number;episodicOnlyIncluded:number;episodicOnlyPrimaryItemsIncluded:number;selectedMemories:number;includedMemoryReferences:number;contextBytes:number;lexicallyRelevantExcluded:number;
 rejected:Record<'permission'|'missing-item'|'rank-bound'|'item-filtered'|'unsupported-kind',number>;
 entries:{eventId:string;itemId:string;origin:'short-term'|'episodic';stage:'included'|'pointer-only'|'selected-not-in-context'|'rank-bound'|'permission'|'missing-item'|'unsupported-kind'|'item-limit'|'ancestry'|'duplicate-source'|'no-relevance';score:number|null;lexicalMatches:number}[];
 contextByteLimitExceeded?:boolean;
 capacityPacking?:import('./context-capacity.ts').ContextCapacityPacking;
 topicSelection?:{scores:TopicScore[];duplicateSources:number;ancestryRejected:number;itemLimitRejected:number;selectedEventIds:string[]};
}
export function describeMemoryRetrieval(w:SocietyWorld,actorId:string,c:DecisionContext,ranked:{eventId:string;score:number;lexicalMatches:number}[],selectedIds:string[],topicScores?:TopicScore[]):MemoryRetrievalDiagnostics{
 const actor=w.agents.find(a=>a.id===actorId)!,short=new Set(actor.memory.map(m=>m.eventId)),pool=[...new Map([...(actor.episodic??[]),...actor.memory].map(m=>[m.eventId,m])).values()];
 const experienced=w.events.filter(e=>e.actorId===actorId&&(e.type==='read'||w.items.some(i=>i.id===e.id))).map(e=>e.id);
 const entries:MemoryRetrievalDiagnostics['entries']=pool.map(m=>{
  const r=ranked.find(r=>r.eventId===m.eventId),included=c.memories.some(x=>x.eventId===m.eventId),primary=c.items.some(i=>i.id===m.itemId),exists=w.items.some(i=>i.id===m.itemId);
  const accessible=m.exposedIds.some(id=>{const item=w.items.find(i=>i.id===id);return item&&canAccessItem(w,actorId,item);});
  const exclusion=topicScores?.find(s=>s.eventId===m.eventId)?.exclusion;
  const special=exclusion&&['item-limit','ancestry','duplicate-source','no-relevance'].includes(exclusion)?exclusion as 'item-limit'|'ancestry'|'duplicate-source'|'no-relevance':null;
  const stage=!exists?'missing-item':!['exposure','authored'].includes(m.kind)?'unsupported-kind':!accessible?'permission':included?(primary?'included':'pointer-only'):selectedIds.includes(m.eventId)?'selected-not-in-context':special??'rank-bound';
  return {eventId:m.eventId,itemId:m.itemId,origin:short.has(m.eventId)?'short-term':'episodic',stage,score:r?.score??null,lexicalMatches:r?.lexicalMatches??0};
 });
 return {version:1,...(topicScores?{topicSelection:{scores:topicScores.map(s=>({...s})),duplicateSources:topicScores.filter(s=>s.exclusion==='duplicate-source').length,ancestryRejected:topicScores.filter(s=>s.exclusion==='ancestry').length,itemLimitRejected:topicScores.filter(s=>s.exclusion==='item-limit').length,selectedEventIds:[...selectedIds]}}:{}),actorId,tick:w.tick,policy:w.genesis.input.intelligence?.memory??'legacy',shortTermEntries:actor.memory.length,episodicEntries:actor.episodic?.length??0,experiencedEvents:experienced.length,shortTermEvictions:experienced.filter(id=>!short.has(id)).length,episodicOnlyCandidates:entries.filter(e=>e.origin==='episodic'&&e.score!==null).length,episodicOnlySelected:entries.filter(e=>e.origin==='episodic'&&selectedIds.includes(e.eventId)).length,episodicOnlyIncluded:entries.filter(e=>e.origin==='episodic'&&['included','pointer-only'].includes(e.stage)).length,episodicOnlyPrimaryItemsIncluded:entries.filter(e=>e.origin==='episodic'&&e.stage==='included').length,selectedMemories:selectedIds.length,includedMemoryReferences:c.memories.length,contextBytes:new TextEncoder().encode(JSON.stringify(c)).length,lexicallyRelevantExcluded:entries.filter(e=>e.lexicalMatches>0&&e.stage!=='included').length,rejected:{permission:entries.filter(e=>e.stage==='permission').length,'missing-item':entries.filter(e=>e.stage==='missing-item').length,'rank-bound':entries.filter(e=>e.stage==='rank-bound').length,'item-filtered':entries.filter(e=>['pointer-only','selected-not-in-context','item-limit','ancestry'].includes(e.stage)).length,'unsupported-kind':entries.filter(e=>e.stage==='unsupported-kind').length},entries};
}
