import type {Platform,SocietyWorld,SocialItem} from './contract.ts';import {cohortIds} from './swarm.ts';import {eligibleChannels,canAccessItem} from './communication.ts';import {threadPath} from './exposure.ts';import {deepOpportunity} from './deep-scheduler.ts';
export interface SwarmTrigger {version:1;kind:'direct-reply'|'group-discussion'|'question'|'conversation-followup'|'new-contribution'|'unresolved-issue'|'proactive-window';sourceEventId:string|null;tick:number;substep?:number;ordinal?:number}
export function describeSwarmTrigger(w:SocietyWorld,actorId:string,platform:Platform):SwarmTrigger{
 const read=w.events.findLast(e=>e.actorId===actorId&&e.type==='read'&&e.platform===platform&&e.tick===w.tick),item=w.items.find(i=>i.id===read?.targetId),event=w.events.find(e=>e.id===item?.id),parent=w.items.find(i=>i.id===item?.parentId);
 const kind:SwarmTrigger['kind']=!item?'proactive-window':parent?.actorId===actorId?'direct-reply':w.genesis.input.swarm?.scheduling!=='event-triggers-v1'&&item.groupId?'group-discussion':event?.discussion?.argument==='question'?'question':(w.genesis.input.swarm?.deep?w.agents.find(a=>a.id===actorId)?.issueHistory??w.agents.find(a=>a.id===actorId)?.issues:w.agents.find(a=>a.id===actorId)?.issues)?.some(i=>i.status==='open'&&(i.sourceEventId===item.id||!!w.genesis.input.swarm?.deep&&event?.discussion?.topicIds.includes(i.topicId)))?'unresolved-issue':threadPath(w,item.id).some(id=>w.items.find(i=>i.id===id)?.actorId===actorId)?'conversation-followup':'new-contribution';
 return {version:1,kind,sourceEventId:item?.id??null,tick:w.tick,...(w.genesis.input.swarm?.deep?{substep:w.hybrid!.records.filter(r=>r.context.tick===w.tick).length,ordinal:w.hybrid!.records.length}:{})};
}
export function swarmOpportunity(w:SocietyWorld,visible:(w:SocietyWorld,id:string,p:Platform)=>SocialItem[]){
 if(w.genesis.input.swarm?.deep)return deepOpportunity(w,visible);
 const p=w.genesis.input.swarm!,records=w.hybrid!.records;if(w.tick===0||w.tick>=w.genesis.config.steps||records.filter(r=>r.context.tick===w.tick).length>=p.decisionsPerTick)return null;
 // V3 reserves future reasoning capacity while allowing four ticks of event-driven burst credit. No trigger or action is invented.
 if(p.scheduling==='event-triggers-v3'&&records.length>=Math.min(w.genesis.input.hybrid!.maxCalls,Math.ceil((w.tick+4)*w.genesis.input.hybrid!.maxCalls/w.genesis.config.steps)))return null;
 const ids=cohortIds(w),events=new Map(w.events.map(e=>[e.id,e])),items=new Map(w.items.map(i=>[i.id,i])),paths=new Map(w.items.map(i=>[i.id,threadPath(w,i.id)]));const choices=[];
 for(const actorId of ids){const prior=records.filter(r=>r.context.actor.id===actorId);if(prior.length>=p.maxPerAgent||prior.some(r=>w.tick-r.context.tick<p.cooldownTicks))continue;
 const handled=new Set(prior.map(r=>r.context.opportunity?.sourceEventId).filter(Boolean));
 for(const channel of eligibleChannels(w,actorId)){const roots=new Set(visible(w,actorId,channel.id).map(i=>i.id));const candidates=w.items.filter(i=>i.platform===channel.id&&i.actorId!==actorId&&!handled.has(i.id)&&canAccessItem(w,actorId,i)&&roots.has(paths.get(i.id)?.[0]??''));
 const priority=(i:SocialItem)=>{const path=paths.get(i.id)??[],e=events.get(i.id),parent=items.get(i.parentId??'');return (parent?.actorId===actorId?200:p.scheduling!=='event-triggers-v1'&&i.groupId?100:e?.discussion?.argument==='question'?140:path.some(id=>items.get(id)?.actorId===actorId)?100:e?.source==='social-model'?80:e?.sourceEventId?60:20)+i.tick/1000;};
 candidates.sort((a,b)=>priority(b)-priority(a)||a.id.localeCompare(b.id));const item=candidates[0];
 if(item)choices.push({actorId,platform:channel.id,targetId:item.id,score:priority(item)-prior.filter(r=>r.context.platform===channel.id).length*10,count:prior.length});
 else if(w.tick%p.proactiveInterval===0&&!prior.some(r=>r.context.opportunity?.kind==='proactive-window'))choices.push({actorId,platform:channel.id,targetId:undefined,score:-10,count:prior.length});
 }}
 choices.sort((a,b)=>a.count-b.count||b.score-a.score||ids.indexOf(a.actorId)-ids.indexOf(b.actorId)||a.platform.localeCompare(b.platform));return choices[0]??null;
}
