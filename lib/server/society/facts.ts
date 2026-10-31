import type {SocietyWorld,SocialEvent} from '../../society/contract.ts';
import type {DiscussionSummary} from '../../society/discussion-contract.ts';
import type {SocietyClockSummary} from '../../society/public-contract.ts';
import {simulationCalendar} from '../../society/temporal-policy.ts';

const authoredTypes=new Set(['post','message','comment','reply','group-reply','share']);
const expressedTypes=new Set(['post','message','comment','reply','group-reply']);
const kinds=['concern','condition','support','question','disagreement'] as const;
/** Internal claim-to-ledger references. Never serialize this object in an ordinary response. */
export interface AggregateFactPack {version:1;view:DiscussionSummary;clock?:SocietyClockSummary;transfers:{source:string;target:string;count:number;sourceEventIds:string[]}[];claims:{id:string;kind:'activity'|'classification'|'state'|'followup'|'issue'|'transfer';sourceEventIds:string[];value:number}[]}
/** One allowlisted chronology for the Report and Graph; no source text or private membership epochs. */
function dailyClock(w:SocietyWorld,authored:SocialEvent[],classified:SocialEvent[],followups:SocialEvent[],changes:SocialEvent[]):SocietyClockSummary|undefined{
 const calendar=simulationCalendar(w);if(!calendar)return undefined;
 const daily:SocietyClockSummary['daily']=Array.from({length:Math.min(8,calendar.day)},(_,index)=>({day:index+1,authoredItems:0,classifiedDecisions:0,followups:0,positionChanges:0,opportunities:0,acceptedDecisions:0,participatingAgents:0,modelAuthoredItems:0,ruleAuthoredItems:0,publicAuthoredItems:0,privateAuthoredItems:0}));
 const row=(tick:number)=>daily[simulationCalendar(w,tick)!.day-1];
 for(const e of authored){const d=row(e.tick);d.authoredItems++;if(e.source==='social-model')d.modelAuthoredItems++;if(e.source==='deterministic-rule')d.ruleAuthoredItems++;if(e.groupId)d.privateAuthoredItems++;else d.publicAuthoredItems++;}
 for(const e of classified)row(e.tick).classifiedDecisions++;
 for(const e of followups)row(e.tick).followups++;
 for(const e of changes)row(e.tick).positionChanges++;
 const participants=daily.map(()=>new Set<string>());
 for(const record of w.hybrid?.records??[]){const d=row(record.context.tick);d.opportunities++;if(record.status==='accepted'){d.acceptedDecisions++;participants[d.day-1].add(record.context.actor.id);}}
 for(const d of daily)d.participatingAgents=participants[d.day-1].size;
 return {version:1,policy:'multi-day-swarm-v1',profileId:w.genesis.input.swarm!.multiDay!.profileId,timeZone:calendar.timeZone,tickMinutes:15,anchor:'Day 1 08:00',day:calendar.day,hour:calendar.hour,minute:calendar.minute,elapsedMinutes:calendar.elapsedMinutes,availabilityAssumption:'Fictional seeded rest windows use the run seed and actor identity, not demographic or observed personal schedules. Unavailable actors defer model opportunities; quiet periods do not establish observed behaviour.',daily};
}
export function aggregateFacts(w:SocietyWorld,events:SocialEvent[],privateScope=false):AggregateFactPack{
 const byId=new Map(w.items.map(i=>[i.id,i])),eventMap=new Map(w.events.map(e=>[e.id,e]));
 const authored=events.filter(e=>authoredTypes.has(e.type));
 const decisions=[...new Map(events.filter(e=>expressedTypes.has(e.type)&&e.source==='social-model'&&e.decisionId).map(e=>[e.decisionId!,e])).values()];
 const classified=decisions.filter(e=>e.discussion&&kinds.includes(e.discussion.argument as typeof kinds[number]));
 const followups=authored.filter(e=>{const parent=byId.get(e.targetId??'');return ['comment','reply','group-reply'].includes(e.type)&&parent&&parent.actorId!==e.actorId;});
 const peer=followups.filter(e=>e.source==='social-model'&&eventMap.get(e.targetId!)?.source==='social-model');
 const changes=events.filter(e=>e.type==='opinion'&&e.position!==e.previousPosition);
 const transfers=new Map<string,AggregateFactPack['transfers'][number]>();
 for(const event of events){if(!event.targetId||!['comment','reply','group-reply','share'].includes(event.type))continue;const item=byId.get(event.targetId);if(!item)continue;const source=item.groupId??item.platform,target=event.groupId??event.platform;if(!target||source===target)continue;const key=source+'|'+target,record=transfers.get(key)??{source,target,count:0,sourceEventIds:[]};record.count++;record.sourceEventIds.push(event.id);transfers.set(key,record);}
 const ids=new Set(events.map(e=>e.id));
 const issues=w.agents.flatMap(a=>a.issueHistory??a.issues??[]).filter(i=>ids.has(i.sourceEventId));
 const depth=(id:string)=>{let d=0,p=byId.get(id);const seen=new Set<string>();while(p&&!seen.has(p.id)&&d<(w.genesis.input.swarm?.deep?64:12)){seen.add(p.id);d++;p=p.parentId?byId.get(p.parentId):undefined;}return d;};
 const period=(tick:number)=>tick<w.genesis.config.steps/3?'early':tick<w.genesis.config.steps*2/3?'middle':'late';
 const view:DiscussionSummary={version:1,authoredItems:authored.length,uniqueAuthors:new Set(authored.map(e=>e.actorId)).size,modelAuthoredDecisions:decisions.length,classifiedDecisions:classified.length,unclassifiedItems:authored.length-classified.length,arguments:Object.fromEntries(kinds.map(kind=>[kind,classified.filter(e=>e.discussion!.argument===kind).length])) as DiscussionSummary['arguments'],topicCoverage:(w.genesis.input.communication?.topics??[]).map(t=>({label:t.label,decisions:decisions.filter(e=>e.discussion?.topicIds.includes(t.id)).length})).filter(t=>t.decisions>0),stakeholderCategories:privateScope?[]:[...new Set(authored.map(e=>w.agents.find(a=>a.id===e.actorId)?.role?.category??'Fictional resident'))].sort(),followups:followups.length,peerReplies:peer.length,maxDepth:Math.max(0,...authored.map(e=>depth(e.id))),actualPositionChanges:changes.length,openIssues:issues.filter(i=>i.status==='open').length,resolvedIssues:issues.filter(i=>i.status==='resolved').length,withdrawnIssues:issues.filter(i=>i.status==='withdrawn').length,timeline:(['early','middle','late'] as const).map(p=>({period:p,authoredItems:authored.filter(e=>period(e.tick)===p).length,classifiedDecisions:classified.filter(e=>period(e.tick)===p).length,followups:followups.filter(e=>period(e.tick)===p).length,positionChanges:changes.filter(e=>period(e.tick)===p).length}))};
 const clock=events===w.events?dailyClock(w,authored,classified,followups,changes):undefined;
 return {version:1,view,...(clock?{clock}:{}),transfers:[...transfers.values()],claims:[{id:'recorded-transfers',kind:'transfer',sourceEventIds:[...transfers.values()].flatMap(t=>t.sourceEventIds),value:[...transfers.values()].reduce((n,t)=>n+t.count,0)},{id:'authored-items',kind:'activity',sourceEventIds:authored.map(e=>e.id),value:authored.length},{id:'classified-authored-decisions',kind:'classification',sourceEventIds:classified.map(e=>e.id),value:classified.length},{id:'actual-position-changes',kind:'state',sourceEventIds:changes.map(e=>e.id),value:changes.length},{id:'recorded-followups',kind:'followup',sourceEventIds:followups.map(e=>e.id),value:followups.length},{id:'explicit-issues',kind:'issue',sourceEventIds:issues.flatMap(i=>[i.sourceEventId,...(i.changedEventId?[i.changedEventId]:[])]),value:issues.length}]};
}
export function discussionText(f:DiscussionSummary){return `${f.authoredItems} authored items came from ${f.uniqueAuthors} fictional participants. ${f.classifiedDecisions} unique model-authored decisions carry argument classifications; ${f.unclassifiedItems} other items have no interpreted argument. ${f.followups} recorded follow-ups include ${f.peerReplies} model-to-model replies. ${f.actualPositionChanges} nonzero fictional position changes were recorded. ${f.openIssues} explicitly tagged issues remain open; ${f.resolvedIssues} were marked resolved by their authors. These self-classifications do not establish consensus, causal policy effects or measured public opinion.`;}
export function argumentText(f:DiscussionSummary){return kinds.map(kind=>`${kind}: ${f.arguments[kind]}`).join('; ')+'. Counts are unique authored decisions, excluding their state effects. Tags are fictional self-classifications; untagged argument details remain unavailable.';}
export function timelineText(f:DiscussionSummary){return f.timeline.map(t=>`${t.period}: ${t.authoredItems} authored items, ${t.classifiedDecisions} classified decisions, ${t.followups} follow-ups, ${t.positionChanges} nonzero state changes`).join('. ')+'.';}
export function dailyChronologyText(clock:SocietyClockSummary){return clock.daily.map(d=>`Day ${d.day}: ${d.authoredItems} authored (public ${d.publicAuthoredItems}, private ${d.privateAuthoredItems}; model ${d.modelAuthoredItems}, rule ${d.ruleAuthoredItems}); ${d.classifiedDecisions} classified; ${d.followups} follow-ups; ${d.positionChanges} changes; ${d.opportunities} opportunities; ${d.acceptedDecisions} accepted; ${d.participatingAgents} participating agents`).join('. ')+'.';}
