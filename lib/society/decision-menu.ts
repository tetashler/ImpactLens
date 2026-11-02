import {citizenV7Schema,encodeCitizenV7Context,decodeCitizenV7} from '../citizen-grounding/decision-v7.ts';
import {citizenV6Schema,encodeCitizenV6Context,decodeCitizenV6} from '../citizen-grounding/decision-v6.ts';
import {citizenDecisionSchema,encodeCitizenDecisionContext,decodeCitizenDecision} from '../citizen-grounding/decision.ts';
import {citizenV5Schema,encodeCitizenV5Context,decodeCitizenV5} from '../citizen-grounding/decision-v5.ts';
import {canonical,object} from '../experiments/validation.ts';
import type {DecisionContext,SocialDecision} from './decision-contract.ts';
import type {Platform,SocialKind} from './contract.ts';
import {buildIssueMenu} from './issue-menu.ts';
import {encodeMemoryEvidence} from './memory-presentation.ts';
export interface DecisionOption {id:string;action:SocialKind;platform:Platform;targetKind:'none'|'item'|'person'|'group';targetIndex:number|null;groupIndex:number|null;memberIndices:number[];memoryIndices:number[];purposeIndex:number|null}
export class DecisionMenuError extends Error {readonly rule:'SOCIAL_TARGET'|'SOCIAL_SHAPE'|'SOCIAL_MEMORY'|'SOCIAL_STANCE'|'SOCIAL_TEXT';readonly path:string;constructor(rule:DecisionMenuError['rule'],path:string){super(rule);this.rule=rule;this.path=path;}}
const contentActions=['post','comment','reply','message','group-reply'];
const priorities=['comment','reply','group-reply','message','post','read','share','like','upvote','downvote','group-create','group-invite','group-join','group-leave','follow','unfollow','inactive'];
/** Indexed bindings are application-owned, bounded and frozen in the recorded context. */
export function buildDecisionMenu(c:DecisionContext):DecisionOption[]{
 if(c.policy==='conversation-menu-v4'||c.policy==='conversation-menu-v5'||c.policy==='conversation-menu-v6'||c.policy==='conversation-menu-v7')return buildDecisionMenu({...c,policy:'conversation-menu-v3'});
 const buckets=new Map<string,DecisionOption[]>(),groups=c.communication?.groups??[],channels=c.communication?.channels??[];
 const memory=(index:number)=>c.memories.findLastIndex(m=>m.itemIds.includes(c.items[index].id));
 function add(action:SocialKind,platform:Platform,kind:DecisionOption['targetKind']='none',targetIndex:number|null=null,groupIndex:number|null=null,memberIndices:number[]=[],purposeIndex:number|null=null){
  if(!c.actions.includes(action))return;const memories=kind==='item'&&targetIndex!==null?[memory(targetIndex)]:[];if(memories.some(i=>i<0))return;
  const a=buckets.get(action)??[];a.push({id:'',action,platform,targetKind:kind,targetIndex,groupIndex,memberIndices,memoryIndices:memories,purposeIndex});buckets.set(action,a);
 }
 add('inactive',c.platform);add('post',c.platform);
 for(const [i,item]of c.items.entries()){
  if(item.platform!==c.platform)continue;
  if(c.readableIds?.includes(item.id))add('read',c.platform,'item',i);
  const canExtend=!c.conversation?.threads.some(t=>t.targetId===item.id&&t.ancestryCount>=64);
  if(item.groupId){if(canExtend&&groups.some(g=>g.id===item.groupId&&g.member))add('group-reply',c.platform,'item',i);}
  else if(canExtend)add(item.parentId?'reply':'comment',c.platform,'item',i);
  for(const a of ['like','upvote','downvote'] as const)if(!c.blockedTargets?.some(b=>b.action===a&&b.targetId===item.id))add(a,c.platform,'item',i);
 }
 for(const [i,person]of c.connections.entries())if(person.id!==c.actor.id){add('follow',c.platform,'person',i);add('unfollow',c.platform,'person',i);}
 for(const [i,g]of groups.entries()){
  if(g.platform===c.platform){if(g.member){add('message',g.platform,'none',null,i);add('group-leave',g.platform,'group',i);}if(g.canJoin)add('group-join',g.platform,'group',i);if(g.canInvite)for(let m=0;m<c.connections.length;m++)add('group-invite',g.platform,'group',i,null,[m]);}
 }
 if(c.communication?.canCreateGroup&&c.connections.length)for(const ch of channels.filter(ch=>ch.style==='private-group'))add('group-create',ch.id,'none',null,null,[-1,...c.connections.slice(0,3).map((_,i)=>i)],c.communication!.purposes.length?0:null);
 for(const [i,item]of c.items.entries()){
  if(item.groupId&&!groups.some(g=>g.id===item.groupId&&g.member&&g.canShare))continue;
  for(const ch of channels){if(ch.style==='private-group'){for(const [g,dest]of groups.entries())if(dest.member&&dest.platform===ch.id&&(item.platform!==ch.id||item.groupId&&item.groupId!==dest.id))add('share',ch.id,'item',i,g);}else if(item.platform!==ch.id)add('share',ch.id,'item',i);}
 }
  const score=(o:DecisionOption)=>{const i=o.targetKind==='item'&&o.targetIndex!==null?c.items[o.targetIndex]:null;return i?(i.actorId===c.actor.id?-100:i.directToActor?100:i.conversationWithActor?80:i.modelAuthored?60:0)+(i.tick??0)/1000:0;};
  if(c.policy==='conversation-menu-v2'||c.policy==='conversation-menu-v3')for(const bucket of buckets.values())bucket.sort((a,b)=>score(b)-score(a));
  const result:DecisionOption[]=[];
  if(c.policy==='conversation-menu-v2'||c.policy==='conversation-menu-v3'){
   const peer=[...buckets.values()].flat().filter(o=>['comment','reply','group-reply'].includes(o.action)&&o.targetIndex!==null&&c.items[o.targetIndex].modelAuthored&&c.items[o.targetIndex].actorId!==c.actor.id).sort((a,b)=>score(b)-score(a))[0];
   if(peer){result.push(peer);buckets.set(peer.action,buckets.get(peer.action)!.filter(o=>o!==peer));}
  }
  if(c.policy==='conversation-menu-v3'){
   // Every current member destination remains discoverable even when item actions fill the menu.
   const messages=buckets.get('message')??[];result.push(...messages);buckets.set('message',[]);
   const inactive=buckets.get('inactive')?.[0];if(inactive){result.push(inactive);buckets.set('inactive',[]);}
  }
  for(let round=0;result.length<24;round++){let found=false;for(const action of priorities){const option=buckets.get(action)?.[round];if(option){result.push(option);found=true;if(result.length===24)break;}}if(!found)break;}
  return result.map((option,i)=>({...option,id:'choice-'+(i+1)}));
}
function stanceMenu(c:DecisionContext){return [{id:'keep',stance:null},...c.memories.flatMap((m,i)=>m.kind==='exposure'&&c.items.some(item=>item.id===m.primaryItemId&&item.actorId!==c.actor.id)?[-1,1].map(direction=>({id:`stance-${i+1}-${direction>0?'support':'concern'}`,stance:{target:Math.max(-1,Math.min(1,c.actor.position+direction*0.2)),exposureId:m.eventId}})):[])];}
export function menuSchema(c:DecisionContext){
 if(c.policy==='conversation-menu-v7')return citizenV7Schema(c);
 if(c.policy==='conversation-menu-v6')return citizenV6Schema(c);
 if(c.policy==='conversation-menu-v5')return citizenV5Schema(c);
 if(c.policy==='conversation-menu-v4')return citizenDecisionSchema(c);
 const menu=c.menu??[],ids=menu.map(m=>m.id),memoryIds=c.memories.map((_,i)=>'memory-'+(i+1));
 const properties={choiceId:{type:'string',enum:ids},text:{type:['string','null'],maxLength:1000},motivation:{type:'string',minLength:1,maxLength:240},recallIds:{type:'array',maxItems:memoryIds.length?6:0,uniqueItems:true,items:memoryIds.length?{type:'string',enum:memoryIds}:{type:'string'}},stanceId:{type:'string',enum:stanceMenu(c).map(s=>s.id)},discussion:{type:'object',additionalProperties:false,required:['topicIds','argument'],properties:{topicIds:{type:'array',maxItems:c.communication?.topics.length?3:0,uniqueItems:true,items:c.communication?.topics.length?{type:'string',enum:c.communication.topics.map(t=>t.id)}:{type:'string'}},argument:{type:'string',enum:['concern','condition','support','question','disagreement','unspecified']}}}};
 if(c.policy==='conversation-menu-v2')Object.assign(properties,{issueUpdate:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['kind','topicId','issueId'],properties:{kind:{type:'string',enum:c.issueCreationAllowed===false?['resolve','withdraw']:['question','condition','disagreement','commitment','resolve','withdraw']},topicId:{type:'string',enum:c.communication?.topics.map(t=>t.id)??[]},issueId:{type:['string','null'],enum:[null,...(c.issues??[]).filter(i=>i.status==='open').map(i=>i.id)]}}}]}});
 if(c.policy==='conversation-menu-v3'){
  const issueIds=buildIssueMenu(c).map(i=>i.id),p={...properties,discussion:{anyOf:[properties.discussion,{type:'null'}]},issueChoiceId:{type:['string','null'],enum:[null,...issueIds]}},base={type:'object',additionalProperties:false,required:Object.keys(p),properties:p};
  const branches=[true,false].flatMap(authored=>{const choices=menu.filter(m=>contentActions.includes(m.action)===authored).map(m=>m.id);if(!choices.length)return [];
   const branch={...base,properties:{...p,choiceId:{type:'string',enum:choices},text:authored?{type:'string',minLength:1,maxLength:1000}:{type:'null'},discussion:properties.discussion,issueChoiceId:{type:'null'}}};
   return authored&&issueIds.length?[branch,{...branch,properties:{...branch.properties,discussion:{type:'null'},issueChoiceId:{type:'string',enum:issueIds}}}]:[branch];
  });
  return {...base,anyOf:branches};
 }
  const base={type:'object',additionalProperties:false,required:Object.keys(properties),properties};
 return {...base,anyOf:[true,false].flatMap(authored=>{const choices=menu.filter(m=>contentActions.includes(m.action)===authored).map(m=>m.id);return choices.length?[{...base,properties:{...properties,choiceId:{type:'string',enum:choices},text:authored?{type:'string',minLength:1,maxLength:1000}:{type:'null'}}}]:[];})};
}
export function encodeMenuContext(c:DecisionContext){
 if(c.policy==='conversation-menu-v7')return encodeCitizenV7Context(c);
 if(c.policy==='conversation-menu-v6')return encodeCitizenV6Context(c);
 if(c.policy==='conversation-menu-v5')return encodeCitizenV5Context(c);
 if(c.policy==='conversation-menu-v4')return encodeCitizenDecisionContext(c);
 if(c.policy==='conversation-menu-v3'){
  const encoded=JSON.parse(encodeMenuContext({...c,policy:'conversation-menu-v2'}));
  encoded.policy=c.policy;encoded.issues=encoded.issues.map(({id:_id,...issue}:Record<string,unknown>)=>issue);
  encoded.groups=encoded.groups?.map((group:Record<string,unknown>,i:number)=>{const purposeId=c.communication?.groups[i].purposeId;return {...group,...(purposeId&&c.communication?.topics.some(t=>t.id===purposeId)?{purposeId}:{})};});
  encoded.issueChoices=buildIssueMenu(c).map(choice=>({id:choice.id,kind:choice.update.kind,topicId:choice.update.topicId,sourceItem:choice.sourceItemId===null?null:'item-'+(c.items.findIndex(i=>i.id===choice.sourceItemId)+1),requiredMemories:choice.memoryIndices.map(i=>'memory-'+(i+1)),discussion:choice.discussion}));
  encoded.memoryEvidence=encodeMemoryEvidence(c);
  encoded.qualityInstructions=['Select issueChoiceId only to explicitly classify your authored text; use discussion:null with a selected issue choice. The selected kind, topic and source-memory bindings are fixed by that listed choice.','With issueChoiceId:null, supply ordinary discussion tags. A concern alone is not a commitment. Resolve or withdraw only when your text explicitly addresses that supplied own issue; these are fictional self-classifications, not verified outcomes.','Use supplied source bodies and memoryEvidence to distinguish their author and source time from your encounter time. Memory references alone do not demonstrate substantive recall. Preserve uncertainty and never invent omitted history.'];
  return canonical(encoded);
 }
 const itemRef=(id:string|null|undefined)=>id==null?null:c.items.findIndex(i=>i.id===id)>=0?'item-'+(c.items.findIndex(i=>i.id===id)+1):'earlier-record';
 return canonical({...(c.calendar?{calendar:c.calendar}:{}),...(c.issueCreationAllowed!==undefined?{issueCreationAllowed:c.issueCreationAllowed}:{}),...(c.conversation?{conversation:{...c.conversation,omittedMessagesAreNotContext:true,threads:c.conversation.threads.map(t=>({...t,targetId:itemRef(t.targetId),rootId:itemRef(t.rootId),providedIds:t.providedIds.map(itemRef)}))}}:{}),...(c.policy==='conversation-menu-v2'?{issues:c.issues?.map(issue=>({id:issue.id,kind:issue.kind,topicId:issue.topicId,status:issue.status,createdTick:issue.createdTick,sourceItem:itemRef(issue.sourceEventId),lastChangeItem:itemRef(issue.changedEventId),memoryRefs:c.memories.flatMap((m,index)=>m.itemIds.includes(issue.sourceEventId)?['memory-'+(index+1)]:[])}))??[],stateHistory:c.stateHistory??[]}:{}),version:1,id:c.id,runId:c.runId,policy:c.policy,actor:c.actor,question:c.question,tick:c.tick,platform:c.platform,channels:c.communication?.channels,groups:c.communication?.groups.map((g,i)=>({ref:'group-'+(i+1),name:g.name,platform:g.platform,member:g.member,canJoin:g.canJoin,canInvite:g.canInvite,canShare:g.canShare})),topics:c.communication?.topics,items:c.items.map((i,n)=>({...i,id:'item-'+(n+1),parentId:itemRef(i.parentId),groupId:i.groupId?'group-'+((c.communication?.groups.findIndex(g=>g.id===i.groupId)??-1)+1):null})),memories:c.memories.map((m,i)=>({...((c.policy==='conversation-menu-v2')?{tick:m.tick,origin:m.origin,importance:m.importance}:{}),ref:'memory-'+(i+1),kind:m.kind,platform:m.platform,primaryItem:itemRef(m.primaryItemId),items:m.itemIds.map(itemRef)})),recentDecisions:c.recentDecisions,choices:c.menu?.map(m=>({id:m.id,action:m.action,platform:m.platform,target:m.targetKind==='none'?null:(m.targetKind==='person'?'connection':m.targetKind)+'-'+(m.targetIndex!+1),destinationGroup:m.groupIndex===null?null:'group-'+(m.groupIndex+1),requiredMemories:m.memoryIndices.map(i=>'memory-'+(i+1)),members:m.memberIndices.map(i=>i<0?'self':'connection-'+(i+1)),purpose:m.purposeIndex===null?null:c.communication?.purposes[m.purposeIndex]})),connections:c.connections.map((p,i)=>({ref:'connection-'+(i+1),handle:p.handle})),stanceChoices:stanceMenu(c).map(s=>({id:s.id,proposal:s.stance?{target:s.stance.target,memory:'memory-'+(c.memories.findIndex(m=>m.eventId===s.stance!.exposureId)+1)}:null})),assumptions:c.assumptions,...(c.sharedBriefing?{sharedBriefing:c.sharedBriefing}:{}),...(c.researchContext?{researchContext:c.researchContext}:{})});
}
export function decodeMenuDecision(value:unknown,c:DecisionContext):SocialDecision{
 if(c.policy==='conversation-menu-v7')return decodeCitizenV7(value,c);
 if(c.policy==='conversation-menu-v6')return decodeCitizenV6(value,c);
 if(c.policy==='conversation-menu-v5')return decodeCitizenV5(value,c);
 if(c.policy==='conversation-menu-v4')return decodeCitizenDecision(value,c);
 const quality=c.policy==='conversation-menu-v3';
 let v:Record<string,unknown>;try{v=object(value,['choiceId','text','motivation','recallIds','stanceId','discussion',...(c.policy==='conversation-menu-v2'?['issueUpdate']:[]),...(quality?['issueChoiceId']:[])]);}catch{throw new DecisionMenuError('SOCIAL_SHAPE','decision');}
 const option=c.menu?.find(m=>m.id===v.choiceId);if(!option)throw new DecisionMenuError('SOCIAL_TARGET','decision.choiceId');
 if(!Array.isArray(v.recallIds)||v.recallIds.length>6||new Set(v.recallIds).size!==v.recallIds.length)throw new DecisionMenuError('SOCIAL_MEMORY','decision.recallIds');
 const recalls=v.recallIds.map(id=>c.memories.findIndex((_,i)=>id==='memory-'+(i+1)));if(recalls.some(i=>i<0))throw new DecisionMenuError('SOCIAL_MEMORY','decision.recallIds');
 const stance=stanceMenu(c).find(s=>s.id===v.stanceId);if(!stance)throw new DecisionMenuError('SOCIAL_STANCE','decision.stanceId');
 let issueUpdate:SocialDecision['issueUpdate']=null;
 let discussion=v.discussion as SocialDecision['discussion'],issueMemories:number[]=[];
 if(quality){
  if(v.issueChoiceId!==null){
   const selected=buildIssueMenu(c).find(choice=>choice.id===v.issueChoiceId);
   if(!selected||!contentActions.includes(option.action))throw new DecisionMenuError('SOCIAL_TARGET','decision.issueChoiceId');
   if(v.discussion!==null)throw new DecisionMenuError('SOCIAL_SHAPE','decision.discussion');
   issueUpdate=selected.update;discussion=selected.discussion;issueMemories=selected.memoryIndices;
  }else{
   let tags:Record<string,unknown>;try{tags=object(v.discussion,['topicIds','argument']);}catch{throw new DecisionMenuError('SOCIAL_SHAPE','decision.discussion');}
   if(!Array.isArray(tags.topicIds)||tags.topicIds.length>3||new Set(tags.topicIds).size!==tags.topicIds.length||!tags.topicIds.every(id=>c.communication?.topics.some(t=>t.id===id))||!['concern','condition','support','question','disagreement','unspecified'].includes(tags.argument as string))throw new DecisionMenuError('SOCIAL_SHAPE','decision.discussion');
   discussion=tags as unknown as SocialDecision['discussion'];
  }
 }
  if(c.policy==='conversation-menu-v2'&&v.issueUpdate!==null){
   let u:Record<string,unknown>;try{u=object(v.issueUpdate,['kind','topicId','issueId']);}catch{throw new DecisionMenuError('SOCIAL_SHAPE','decision.issueUpdate');}
   const tags=v.discussion as SocialDecision['discussion'];
   if(!contentActions.includes(option.action)||!c.communication?.topics.some(t=>t.id===u.topicId)||!tags?.topicIds.includes(u.topicId as string))throw new DecisionMenuError('SOCIAL_TARGET','decision.issueUpdate');
   if(['resolve','withdraw'].includes(u.kind as string)){
    const issue=c.issues?.find(i=>i.id===u.issueId&&i.status==='open'&&i.topicId===u.topicId);
    const memories=[...option.memoryIndices,...recalls].flatMap(i=>c.memories[i].itemIds);
    if(!issue||!memories.includes(issue.sourceEventId))throw new DecisionMenuError('SOCIAL_MEMORY','decision.issueUpdate');
   }else if(c.issueCreationAllowed===false||!['question','condition','disagreement','commitment'].includes(u.kind as string)||u.issueId!==null||(u.kind!=='commitment'&&tags.argument!==u.kind))throw new DecisionMenuError('SOCIAL_SHAPE','decision.issueUpdate');
   issueUpdate=u as unknown as NonNullable<SocialDecision['issueUpdate']>;
  }
  const groups=c.communication?.groups??[],target=option.targetIndex===null?null:option.targetKind==='item'?c.items[option.targetIndex]?.id:option.targetKind==='person'?c.connections[option.targetIndex]?.id:groups[option.targetIndex]?.id;
 const memoryIndices=[...new Set([...option.memoryIndices,...recalls,...issueMemories,...(stance.stance?[c.memories.findIndex(m=>m.eventId===stance.stance!.exposureId)]:[])])];
 return {...(c.policy==='conversation-menu-v2'||quality?{issueUpdate}:{}),action:option.action,platform:option.platform,targetId:target??null,text:v.text as string|null,motivation:v.motivation as string,memoryIds:memoryIndices.map(i=>c.memories[i].eventId),stance:stance.stance,...(c.communication?{groupId:option.groupIndex===null?null:groups[option.groupIndex].id,memberIds:option.memberIndices.map(i=>i<0?c.actor.id:c.connections[i].id),purposeId:option.purposeIndex===null?null:c.communication.purposes[option.purposeIndex],discussion}:{}),selection:{choiceId:option.id,stanceId:v.stanceId as string,recallIds:v.recallIds as string[],...(quality?{issueChoiceId:v.issueChoiceId as string|null}:{})}};
}

/** Metadata-only opportunity diagnostics. Targets have already passed context access checks. */
export function replyMenuMetrics(c:DecisionContext){
 const eligible=c.items.map((item,index)=>({item,index})).filter(({item})=>item.modelAuthored&&item.actorId!==c.actor.id&&item.platform===c.platform&&c.memories.some(m=>m.itemIds.includes(item.id))&&(item.groupId?c.actions.includes('group-reply')&&c.communication?.groups.some(g=>g.id===item.groupId&&g.member):c.actions.includes(item.parentId?'reply':'comment')));
 const included=eligible.filter(({index})=>c.menu?.some(m=>['comment','reply','group-reply'].includes(m.action)&&m.targetKind==='item'&&m.targetIndex===index)).length;
 return {eligiblePeerReplies:eligible.length,includedPeerReplies:included,omittedPeerReplies:eligible.length-included};
}
