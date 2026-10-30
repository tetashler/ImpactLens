import {decodeMenuDecision} from '../../lib/society/decision-menu.ts';
/** Explicit semantic fixtures, never imported by production inference. */
import type {DecisionContext} from '../../lib/society/decision-contract.ts';
export function socialDecisionFixture(c:DecisionContext){
 if(['action-menu-v1','conversation-menu-v2'].includes(c.policy??''))return decodeMenuDecision(socialProviderFixture(c),c);
 const target=c.items.find(i=>i.platform===c.platform&&i.parentId&&i.actorId!==c.actor.id)??c.items.find(i=>i.platform===c.platform&&!i.parentId&&i.actorId!==c.actor.id)??c.items.find(i=>i.platform===c.platform)!;
 const memory=c.memories.find(m=>m.kind==='exposure'&&m.itemIds.includes(target.id))!;
 const other=c.memories.find(m=>m.platform!==c.platform&&m.kind==='exposure');
 const wage=/wage|income|employee/i.test(c.actor.label+' '+c.actor.goal),text=wage?'Protecting monthly pay should be separate from overtime: a shorter week should not quietly become longer unpaid shifts.':'Service coverage needs a staggered roster rather than assuming every business closes on the same day. Staffing costs should be discussed alongside wage protection.';
 if(c.communication){const privateChannel=c.communication.channels.find(p=>p.id===c.platform)?.style==='private-group';return {action:privateChannel?'group-reply':target.parentId?'reply':'comment',platform:c.platform,targetId:target.id,text:`RAW_SOCIAL_DECISION_4C ${c.platform==='whatsapp'?'RAW_WHATSAPP_MESSAGE_4C':c.platform==='telegram'?'RAW_TELEGRAM_REPLY_4C':c.platform==='instagram'?'RAW_INSTAGRAM_COMMENT_4C':'RAW_REDDIT_POST_4C'} ${text} Responding to ${target.text.slice(0,100)}`,memoryIds:[memory.eventId],stance:null,motivation:'RAW_MEMORY_EXCERPT_4C Fictional fixture motivation.',groupId:null,memberIds:[],purposeId:null,discussion:{topicIds:c.communication.topics.slice(0,1).map(t=>t.id),argument:wage?'concern':'condition'}};}
 return {action:target.parentId?'reply':'comment',platform:c.platform,targetId:target.id,text:`${text} ${other?`The earlier ${other.platform} discussion raised: ${other.text.slice(0,90)}. `:''}Responding to: ${target.text.slice(0,100)}`,memoryIds:[...new Set([memory.eventId,...(other?[other.eventId]:[])])],stance:null,motivation:`Fictional fixture decision shaped by: ${c.actor.goal.slice(0,150)}`};
}

/** Provider wire fixture. The live transport never imports this module. */
export function socialProviderFixture(c:any):any{
 if(!['action-menu-v1','conversation-menu-v2'].includes(c.policy??''))return socialDecisionFixture(c);
 const choices=c.choices??c.menu,privateChannel=(c.channels??c.communication?.channels??[]).find((p:any)=>p.id===c.platform)?.style==='private-group';
 const choice=choices.find((m:any)=>m.action===(privateChannel?'group-reply':'reply'))??choices.find((m:any)=>m.action===(privateChannel?'message':'comment'))??choices.find((m:any)=>m.action==='post')??choices[0];
 const marker=c.platform==='whatsapp'?'RAW_WHATSAPP_MESSAGE_4C':c.platform==='telegram'?'RAW_TELEGRAM_REPLY_4C':c.platform==='instagram'?'RAW_INSTAGRAM_COMMENT_4C':'RAW_REDDIT_POST_4C';
 return {choiceId:choice.id,text:['post','comment','reply','message','group-reply'].includes(choice.action)?'RAW_SOCIAL_DECISION_4C '+marker+' Fictional wages and service coverage require safeguards, with a fair roster.':null,motivation:'RAW_MEMORY_EXCERPT_4C Fictional fixture motivation.',recallIds:[],stanceId:'keep',discussion:{topicIds:(c.topics??c.communication?.topics??[]).slice(0,1).map((t:any)=>t.id),argument:'condition'},...(c.policy==='conversation-menu-v2'?{issueUpdate:(c.topics??c.communication?.topics??[]).length&&['post','comment','reply','message','group-reply'].includes(choice.action)?{kind:'condition',topicId:(c.topics??c.communication.topics)[0].id,issueId:null}:null}:{})};
}
