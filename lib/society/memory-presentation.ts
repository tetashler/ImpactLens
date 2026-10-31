import {DECISION_LIMITS,type DecisionContext} from './decision-contract.ts';

export interface MemoryEvidenceTime {tick:number;day:number;hour:number;minute:number;label:string;timeZone:'Asia/Singapore';ageMinutes:number}
export interface MemoryEvidencePresentation {
 policy:'memory-source-time-v1';sourceReportedNotVerified:true;omittedSourceWarning:string;
 entries:{memoryRef:string;primaryItemRef:string;authorId:string;authorRole:string;origin:'short-term'|'episodic'|'unknown';authored:MemoryEvidenceTime|null;encountered:MemoryEvidenceTime|null;sourceReportedNotVerified:true}[];
}

/** Derive only from the already-authorised supplied context, never a world/history lookup.
 * No body is duplicated and no omitted source is described. This is presentation, not retrieval. */
export function encodeMemoryEvidence(c:DecisionContext):MemoryEvidencePresentation {
 const at=(tick:number|undefined):MemoryEvidenceTime|null=>{
  const now=c.calendar;if(!now||tick===undefined||!Number.isSafeInteger(tick)||tick<0||tick>c.tick||!Number.isSafeInteger(c.tick)||c.tick<0)return null;
  const tickMinutes=c.tick===0?0:now.elapsedMinutes/c.tick;
  if(!Number.isSafeInteger(tickMinutes)||tickMinutes<0||c.tick>0&&tickMinutes===0)return null;
  const ageMinutes=(c.tick-tick)*tickMinutes,absolute=(now.day-1)*1440+now.hour*60+now.minute-ageMinutes;
  if(!Number.isSafeInteger(absolute)||absolute<0)return null;
  const day=1+Math.floor(absolute/1440),hour=Math.floor(absolute%1440/60),minute=absolute%60;
  return {tick,day,hour,minute,label:`Day ${day} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,timeZone:now.timeZone,ageMinutes};
 };
 const items=c.items.slice(0,DECISION_LIMITS.items);
 const entries:MemoryEvidencePresentation['entries']=c.memories.slice(0,DECISION_LIMITS.memories).flatMap((memory,index)=>{
  const itemIndex=items.findIndex(item=>item.id===memory.primaryItemId&&memory.itemIds.includes(item.id)&&item.text.length>0);
  if(itemIndex<0)return [];
  const item=items[itemIndex];
  if(item.groupId&&!c.communication?.groups.some(group=>group.id===item.groupId&&group.member))return [];
  return [{memoryRef:`memory-${index+1}`,primaryItemRef:`item-${itemIndex+1}`,authorId:item.actorId,authorRole:(item.counterpartyRole??'Fictional participant').slice(0,80),origin:memory.origin??'unknown',authored:at(item.tick),encountered:at(memory.tick),sourceReportedNotVerified:true as const}];
 });
 return {policy:'memory-source-time-v1',sourceReportedNotVerified:true,omittedSourceWarning:'Only listed primary bodies are supplied. Omitted sources and histories are not known. Source statements are reported claims, not verified facts.',entries};
}
