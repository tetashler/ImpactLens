import type {Action,Platform,SocietyWorld,SocialItem} from './contract.ts';
import {activeMember,canAccessItem,channelFor} from './communication.ts';
import {conversationCandidates} from './conversation.ts';
import {experiencedMemories} from './episodic.ts';

/** Fictional attention assumptions. At most one social action per routine activation. */
export function attentiveStep(w:SocietyWorld,actorId:string,platform:Platform,feed:SocialItem[],apply:(w:SocietyWorld,a:Action)=>SocietyWorld):SocietyWorld{
 const a=w.agents.find(a=>a.id===actorId)!,policy=w.genesis.input.intelligence!,events=w.events.filter(e=>e.actorId===actorId),phase=a.turns%5;
 let next:SocietyWorld={...w,agents:w.agents.map(p=>p.id===actorId?{...p,turns:p.turns+1}:p)};
 if(w.tick%4===0)next=apply(next,{actorId,type:'activity',location:a.activity==='residential-context'?'community-context':'residential-context'});
 const privateChannel=channelFor(w,platform)?.style==='private-group';
 const group=w.groups?.find(g=>g.platform===platform&&activeMember(w,g.id,actorId));
 if(privateChannel&&!group){const invited=w.groups?.find(g=>g.platform===platform&&g.invitations.includes(actorId)&&g.members.filter(m=>m.leftSequence===null).length<8);return apply(next,invited?{actorId,type:'group-join',platform,targetId:invited.id}:{actorId,type:'inactive',platform});}
 const candidates=conversationCandidates(w,actorId,platform,feed).filter(i=>i.actorId!==actorId);
 const memories=experiencedMemories(w,actorId);
 const recent=(types:string[],targetId?:string,cooldown=policy.responseCooldown)=>events.some(e=>types.includes(e.type)&&(targetId===undefined||e.targetId===targetId)&&w.tick-e.tick<cooldown);
 const encountered=candidates.find(i=>memories.some(m=>m.kind==='exposure'&&m.exposedIds.includes(i.id)));
 const unread=candidates.find(i=>!a.seen.includes(i.id)&&!recent(['read'],i.id,policy.readCooldown));
 if(phase===1||!encountered){const target=unread??candidates.find(i=>!recent(['read'],i.id,policy.readCooldown));if(target)return apply(next,{actorId,type:'read',platform,targetId:target.id});}
 const novel=(text:string)=>!events.some(e=>e.platform===platform&&e.text&&similar(e.text,text)>=0.85);
 if(phase===0&&!recent(['post','message'],undefined,policy.postCooldown)){
  const text=`${a.goal} The fictional discussion still needs explicit conditions and practical alternatives.`;
  if(novel(text))return apply(next,{actorId,type:privateChannel?'message':'post',platform,text,...(group?{groupId:group.id}:{})});
 }
 if(phase===2&&encountered&&!recent(['comment','reply','group-reply'],undefined,policy.responseCooldown)&&!events.some(e=>['comment','reply','group-reply'].includes(e.type)&&e.targetId===encountered.id)){
  const text=`${a.goal} ${a.opinion>0.3?'I would examine the proposed benefits alongside remaining conditions.':a.opinion< -0.3?'I retain concerns until the practical conditions are addressed.':'I remain conditional while the discussion develops.'}`;
  if(novel(text))return apply(next,{actorId,type:privateChannel?'group-reply':encountered.parentId?'reply':'comment',platform,targetId:encountered.id,text});
 }
 const consideration=candidates.find(i=>memories.some(m=>m.kind==='exposure'&&m.exposedIds.includes(i.id))&&!events.some(e=>e.type==='opinion'&&e.targetId===i.id));
 if(phase===3&&consideration)return apply(next,{actorId,type:'opinion',platform,targetId:consideration.id});
 if(phase===4&&encountered&&!events.some(e=>e.type==='like'&&e.targetId===encountered.id))return apply(next,{actorId,type:'like',platform,targetId:encountered.id});
 // Transfers require an actual exposure, forwarding permission and accessible destination.
 if(phase===4){const source=memories.flatMap(m=>m.exposedIds).map(id=>w.items.find(i=>i.id===id)).find(i=>i&&i.platform!==platform&&canAccessItem(w,actorId,i)&&(!i.groupId||w.groups?.find(g=>g.id===i.groupId)?.shareAllowed)&&!events.some(e=>e.type==='share'&&e.targetId===i.id&&e.platform===platform));if(source)return apply(next,{actorId,type:'share',platform,targetId:source.id,...(group?{groupId:group.id}:{})});}
 return apply(next,{actorId,type:'inactive',platform});
}
export function similar(a:string,b:string){const tokens=(s:string)=>new Set(s.toLowerCase().match(/[a-z0-9]+/g)??[]),x=tokens(a),y=tokens(b);return [...x].filter(t=>y.has(t)).length/Math.max(1,new Set([...x,...y]).size);}
