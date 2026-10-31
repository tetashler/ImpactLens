import type {Platform,SocietyInput,SocietyWorld,SocialItem} from './contract.ts';
import {cohortIds} from './swarm.ts';
import {eligibleChannels,canAccessItem} from './communication.ts';
import {threadPath} from './exposure.ts';
import {privateDiscussionInbox} from './deep-context.ts';
import {getExecutionProfile} from './execution-profile.ts';
import {isActorAvailable} from './temporal-policy.ts';
/** Cumulative allowance carries unused credit. Urgent borrowing is debt until release catches up. */
export function multiDayPacing(value:SocietyInput|SocietyWorld,tick='genesis' in value?value.tick:0,used='genesis' in value?value.hybrid?.records.length??0:0){
 const profile=getExecutionProfile(value);if(!profile)return null;const input='genesis' in value?value.genesis.input:value,target=Math.min(profile.decisions,input.swarm!.multiDay!.pacingTarget),initialBurst=Math.min(target,profile.decisionsPerTick);
 const protectedUntilTick=Math.ceil(profile.steps*2/3),reserved=Math.ceil(target*0.3);
 const releaseAt=(at:number)=>{const finalReserve=at<profile.steps?Math.min(1,target):0,ceiling=Math.min(target-finalReserve,at<protectedUntilTick?target-reserved:target);return {ceiling,released:at<1?0:Math.max(0,Math.min(ceiling,initialBurst+Math.floor((target-initialBurst)*Math.min(profile.steps-1,at-1)/(profile.steps-1))))};};
 const {ceiling,released}=releaseAt(tick);let loanCeiling:number|null=null;
 if(input.swarm!.multiDay!.pacingRevision==='loan-repayment-v1'&&'genesis' in value){
  // A loan keeps its original ceiling. Partial repayment cannot roll the loan
  // forward forever and starve ordinary demand. One released opportunity must
  // settle after repayment before another bounded urgent loan becomes possible.
  for(const [index,record]of (value.hybrid?.records??[]).slice(0,used).entries()){const at=releaseAt(record.context.tick);if(index<at.released)loanCeiling=null;else if(loanCeiling===null)loanCeiling=Math.min(at.ceiling,at.released+profile.urgentBorrow);}
 }
 const urgentReleased=tick<1?0:Math.max(0,Math.min(ceiling,loanCeiling===null?released+profile.urgentBorrow:Math.max(released,loanCeiling)));
 return {target,initialBurst,released,borrowLimit:profile.urgentBorrow,debt:Math.max(0,used-released),available:Math.max(0,released-used),urgentAvailable:Math.max(0,urgentReleased-used),reserved,protectedUntilTick};
}
/** A bounded queue derived exclusively from committed, accessible events. Rebuilt deterministically. */
export function deepOpportunity(w:SocietyWorld,visible:(w:SocietyWorld,id:string,p:Platform)=>SocialItem[]){
 const p=w.genesis.input.swarm!,d=p.deep!,records=w.hybrid!.records,tick=w.tick;
 const atTick=records.filter(r=>r.context.tick===tick),pacing=multiDayPacing(w);
 if(!tick||(pacing?tick>w.genesis.config.steps||w.status==='event-limit'||w.status==='item-limit':tick>=w.genesis.config.steps)||atTick.length>=p.decisionsPerTick)return null;
 // Two-tick burst credit retains capacity through later simulated periods. No demand means no dispatch.
 if(pacing?!pacing.urgentAvailable:records.length>=Math.min(w.genesis.input.hybrid!.maxCalls,Math.ceil((tick+2)*w.genesis.input.hybrid!.maxCalls/w.genesis.config.steps)))return null;
 const items=new Map(w.items.map(i=>[i.id,i])),events=new Map(w.events.map(e=>[e.id,e])),paths=new Map(w.items.map(i=>[i.id,threadPath(w,i.id)]));
 const fingerprint=(i:SocialItem)=>i.text.toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const repeated=new Set<string>(),seen=new Set<string>();for(const i of w.items){const thread=i.parentId?paths.get(i.id)?.[0]??i.parentId:i.platform+'|root-post',key=i.actorId+'|'+thread+'|'+fingerprint(i);if(seen.has(key))repeated.add(i.id);seen.add(key);}
 type Candidate={actorId:string;platform:Platform;targetId?:string;score:number;order:number;count:number};
 const queue=new Map<string,Candidate>();
 const enqueue=(c:Candidate)=>{const key=c.actorId+'|'+c.platform,prior=queue.get(key);if(!prior||c.score>prior.score||c.score===prior.score&&(c.targetId??'').localeCompare(prior.targetId??'')<0)queue.set(key,c);};
 for(const [order,actorId]of cohortIds(w).entries()){
  if(pacing&&!isActorAvailable(w,actorId))continue;
  const prior=records.filter(r=>r.context.actor.id===actorId);if(prior.length>=p.maxPerAgent||atTick.some(r=>r.context.actor.id===actorId))continue;
  const handled=new Set(prior.map(r=>r.context.opportunity?.sourceEventId).filter(Boolean));
  const last=prior.at(-1)?.context.tick??-p.cooldownTicks;
  const actor=w.agents.find(a=>a.id===actorId)!,issues=actor.issueHistory??actor.issues??[];
  for(const channel of eligibleChannels(w,actorId)){
   const roots=new Set(visible(w,actorId,channel.id).map(i=>i.id));
   // Private inbox targets are revalidated individually; feed root ageing grants no access.
   const inbox=channel.style==='private-group'?privateDiscussionInbox(w,actorId,channel.id):null;
   const candidates=(inbox??w.items).filter(i=>i.platform===channel.id&&i.actorId!==actorId&&!handled.has(i.id)&&!repeated.has(i.id)&&canAccessItem(w,actorId,i));
   let hasEligibleCandidate=false;
   for(const item of candidates){
    const path=paths.get(item.id)??[];if(!path.length)continue;const root=path[0],parent=items.get(item.parentId??''),direct=parent?.actorId===actorId;
    if(pacing&&!pacing.available&&!direct)continue;
    if(!inbox&&!roots.has(root)&&!(direct&&actor.notifications.includes(item.id)))continue;
    if(tick-last<(direct?1:p.cooldownTicks))continue;
    const threadTurns=atTick.filter(r=>{const source=r.context.opportunity?.sourceEventId;return source&&paths.get(source)?.[0]===root;}).length;if(threadTurns>=d.perThreadBurst)continue;
    const e=events.get(item.id),continuity=path.some(id=>items.get(id)?.actorId===actorId),issue=issues.some(i=>i.status==='open'&&(i.sourceEventId===item.id||e?.discussion?.topicIds.includes(i.topicId)));
    const urgency=direct?200:e?.discussion?.argument==='question'?140:issue?130:continuity?100:item.groupId?90:e?.source==='social-model'?80:20;
    // Fair-share credits exist only alongside eligible demand and saturate. Soft allowance is not a quota.
    const waiting=Math.min(40,tick-Math.max(item.tick,last)),credit=Math.max(0,d.softAllowance-prior.length)*24;
    const score=urgency+waiting*3+credit-prior.filter(r=>r.context.platform===channel.id).length*3;
    hasEligibleCandidate=true;enqueue({actorId,platform:channel.id,targetId:item.id,score,order,count:prior.length});
   }
   if((!pacing||pacing.available>0)&&!hasEligibleCandidate&&tick%p.proactiveInterval===0&&tick-last>=p.cooldownTicks&&prior.filter(r=>r.context.opportunity?.kind==='proactive-window').length<d.proactiveLimit)enqueue({actorId,platform:channel.id,score:-20+Math.max(0,d.softAllowance-prior.length)*24,order,count:prior.length});
  }
 }
 const choices=[...queue.values()],ordinaryFairness=p.multiDay?.pacingRevision==='loan-repayment-v1'&&!!pacing?.available;
 choices.sort((a,b)=>{
  if(ordinaryFairness){const incoming=Number(!!b.targetId)-Number(!!a.targetId);if(incoming)return incoming;if(a.targetId&&b.targetId){const fairShare=Math.min(d.softAllowance,a.count)-Math.min(d.softAllowance,b.count);if(fairShare)return fairShare;}}
  return b.score-a.score||a.order-b.order||a.platform.localeCompare(b.platform)||(a.targetId??'').localeCompare(b.targetId??'');
 });return choices[0]??null;
}
