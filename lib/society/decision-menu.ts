import {canonical,object} from '../experiments/validation.ts';
import type {DecisionContext,SocialDecision} from './decision-contract.ts';
import type {Platform,SocialKind} from './contract.ts';
export interface DecisionOption {id:string;action:SocialKind;platform:Platform;targetKind:'none'|'item'|'person'|'group';targetIndex:number|null;groupIndex:number|null;memberIndices:number[];memoryIndices:number[];purposeIndex:number|null}
export class DecisionMenuError extends Error {readonly rule:'SOCIAL_TARGET'|'SOCIAL_SHAPE'|'SOCIAL_MEMORY'|'SOCIAL_STANCE'|'SOCIAL_TEXT';readonly path:string;constructor(rule:DecisionMenuError['rule'],path:string){super(rule);this.rule=rule;this.path=path;}}
const contentActions=['post','comment','reply','message','group-reply'];
const priorities=['comment','reply','group-reply','message','post','read','share','like','upvote','downvote','group-create','group-invite','group-join','group-leave','follow','unfollow','inactive'];
/** Indexed bindings are application-owned, bounded and frozen in the recorded context. */
export function buildDecisionMenu(c:DecisionContext):DecisionOption[]{
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
  if(item.groupId){if(groups.some(g=>g.id===item.groupId&&g.member))add('group-reply',c.platform,'item',i);}
  else add(item.parentId?'reply':'comment',c.platform,'item',i);
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
  if(c.policy==='conversation-menu-v2')for(const bucket of buckets.values())bucket.sort((a,b)=>score(b)-score(a));
  const result:DecisionOption[]=[];
  if(c.policy==='conversation-menu-v2'){
   const peer=[...buckets.values()].flat().filter(o=>['comment','reply','group-reply'].includes(o.action)&&o.targetIndex!==null&&c.items[o.targetIndex].modelAuthored&&c.items[o.targetIndex].actorId!==c.actor.id).sort((a,b)=>score(b)-score(a))[0];
   if(peer){result.push(peer);buckets.set(peer.action,buckets.get(peer.action)!.filter(o=>o!==peer));}
  }
  for(let round=0;result.length<24;round++){let found=false;for(const action of priorities){const option=buckets.get(action)?.[round];if(option){result.push(option);found=true;if(result.length===24)break;}}if(!found)break;}
  return result.map((option,i)=>({...option,id:'choice-'+(i+1)}));
}
function stanceMenu(c:DecisionContext){return [{id:'keep',stance:null},...c.memories.flatMap((m,i)=>m.kind==='exposure'&&c.items.some(item=>item.id===m.primaryItemId&&item.actorId!==c.actor.id)?[-1,1].map(direction=>({id:`stance-${i+1}-${direction>0?'support':'concern'}`,stance:{target:Math.max(-1,Math.min(1,c.actor.position+direction*0.2)),exposureId:m.eventId}})):[])];}
export function menuSchema(c:DecisionContext){
 const menu=c.menu??[],ids=menu.map(m=>m.id),memoryIds=c.memories.map((_,i)=>'memory-'+(i+1));
 const properties={choiceId:{type:'string',enum:ids},text:{type:['string','null'],maxLength:1000},motivation:{type:'string',minLength:1,maxLength:240},recallIds:{type:'array',maxItems:memoryIds.length?6:0,uniqueItems:true,items:memoryIds.length?{type:'string',enum:memoryIds}:{type:'string'}},stanceId:{type:'string',enum:stanceMenu(c).map(s=>s.id)},discussion:{type:'object',additionalProperties:false,required:['topicIds','argument'],properties:{topicIds:{type:'array',maxItems:c.communication?.topics.length?3:0,uniqueItems:true,items:c.communication?.topics.length?{type:'string',enum:c.communication.topics.map(t=>t.id)}:{type:'string'}},argument:{type:'string',enum:['concern','condition','support','question','disagreement','unspecified']}}}};
 if(c.policy==='conversation-menu-v2')Object.assign(properties,{issueUpdate:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['kind','topicId','issueId'],properties:{kind:{type:'string',enum:['question','condition','disagreement','commitment','resolve','withdraw']},topicId:{type:'string',enum:c.communication?.topics.map(t=>t.id)??[]},issueId:{type:['string','null'],enum:[null,...(c.issues??[]).filter(i=>i.status==='open').map(i=>i.id)]}}}]}});
  const base={type:'object',additionalProperties:false,required:Object.keys(properties),properties};
 return {...base,anyOf:[true,false].flatMap(authored=>{const choices=menu.filter(m=>contentActions.includes(m.action)===authored).map(m=>m.id);return choices.length?[{...base,properties:{...properties,choiceId:{type:'string',enum:choices},text:authored?{type:'string',minLength:1,maxLength:1000}:{type:'null'}}}]:[];})};
}
export function encodeMenuContext(c:DecisionContext){
 const itemRef=(id:string|null|undefined)=>id==null?null:c.items.findIndex(i=>i.id===id)>=0?'item-'+(c.items.findIndex(i=>i.id===id)+1):'earlier-record';
 return canonical({...(c.policy==='conversation-menu-v2'?{issues:c.issues?.map(issue=>({id:issue.id,kind:issue.kind,topicId:issue.topicId,status:issue.status,createdTick:issue.createdTick,sourceItem:itemRef(issue.sourceEventId),lastChangeItem:itemRef(issue.changedEventId),memoryRefs:c.memories.flatMap((m,index)=>m.itemIds.includes(issue.sourceEventId)?['memory-'+(index+1)]:[])}))??[],stateHistory:c.stateHistory??[]}:{}),version:1,id:c.id,runId:c.runId,policy:c.policy,actor:c.actor,question:c.question,tick:c.tick,platform:c.platform,channels:c.communication?.channels,groups:c.communication?.groups.map((g,i)=>({ref:'group-'+(i+1),name:g.name,platform:g.platform,member:g.member,canJoin:g.canJoin,canInvite:g.canInvite,canShare:g.canShare})),topics:c.communication?.topics,items:c.items.map((i,n)=>({...i,id:'item-'+(n+1),parentId:itemRef(i.parentId),groupId:i.groupId?'group-'+((c.communication?.groups.findIndex(g=>g.id===i.groupId)??-1)+1):null})),memories:c.memories.map((m,i)=>({...((c.policy==='conversation-menu-v2')?{tick:m.tick,origin:m.origin,importance:m.importance}:{}),ref:'memory-'+(i+1),kind:m.kind,platform:m.platform,primaryItem:itemRef(m.primaryItemId),items:m.itemIds.map(itemRef)})),recentDecisions:c.recentDecisions,choices:c.menu?.map(m=>({id:m.id,action:m.action,platform:m.platform,target:m.targetKind==='none'?null:(m.targetKind==='person'?'connection':m.targetKind)+'-'+(m.targetIndex!+1),destinationGroup:m.groupIndex===null?null:'group-'+(m.groupIndex+1),requiredMemories:m.memoryIndices.map(i=>'memory-'+(i+1)),members:m.memberIndices.map(i=>i<0?'self':'connection-'+(i+1)),purpose:m.purposeIndex===null?null:c.communication?.purposes[m.purposeIndex]})),connections:c.connections.map((p,i)=>({ref:'connection-'+(i+1),handle:p.handle})),stanceChoices:stanceMenu(c).map(s=>({id:s.id,proposal:s.stance?{target:s.stance.target,memory:'memory-'+(c.memories.findIndex(m=>m.eventId===s.stance!.exposureId)+1)}:null})),assumptions:c.assumptions,...(c.sharedBriefing?{sharedBriefing:c.sharedBriefing}:{})});
}
export function decodeMenuDecision(value:unknown,c:DecisionContext):SocialDecision{
 let v:Record<string,unknown>;try{v=object(value,['choiceId','text','motivation','recallIds','stanceId','discussion',...(c.policy==='conversation-menu-v2'?['issueUpdate']:[])]);}catch{throw new DecisionMenuError('SOCIAL_SHAPE','decision');}
 const option=c.menu?.find(m=>m.id===v.choiceId);if(!option)throw new DecisionMenuError('SOCIAL_TARGET','decision.choiceId');
 if(!Array.isArray(v.recallIds)||v.recallIds.length>6||new Set(v.recallIds).size!==v.recallIds.length)throw new DecisionMenuError('SOCIAL_MEMORY','decision.recallIds');
 const recalls=v.recallIds.map(id=>c.memories.findIndex((_,i)=>id==='memory-'+(i+1)));if(recalls.some(i=>i<0))throw new DecisionMenuError('SOCIAL_MEMORY','decision.recallIds');
 const stance=stanceMenu(c).find(s=>s.id===v.stanceId);if(!stance)throw new DecisionMenuError('SOCIAL_STANCE','decision.stanceId');
 let issueUpdate:SocialDecision['issueUpdate']=null;
  if(c.policy==='conversation-menu-v2'&&v.issueUpdate!==null){
   let u:Record<string,unknown>;try{u=object(v.issueUpdate,['kind','topicId','issueId']);}catch{throw new DecisionMenuError('SOCIAL_SHAPE','decision.issueUpdate');}
   const tags=v.discussion as SocialDecision['discussion'];
   if(!contentActions.includes(option.action)||!c.communication?.topics.some(t=>t.id===u.topicId)||!tags?.topicIds.includes(u.topicId as string))throw new DecisionMenuError('SOCIAL_TARGET','decision.issueUpdate');
   if(['resolve','withdraw'].includes(u.kind as string)){
    const issue=c.issues?.find(i=>i.id===u.issueId&&i.status==='open'&&i.topicId===u.topicId);
    const memories=[...option.memoryIndices,...recalls].flatMap(i=>c.memories[i].itemIds);
    if(!issue||!memories.includes(issue.sourceEventId))throw new DecisionMenuError('SOCIAL_MEMORY','decision.issueUpdate');
   }else if(!['question','condition','disagreement','commitment'].includes(u.kind as string)||u.issueId!==null||(u.kind!=='commitment'&&tags.argument!==u.kind))throw new DecisionMenuError('SOCIAL_SHAPE','decision.issueUpdate');
   issueUpdate=u as unknown as NonNullable<SocialDecision['issueUpdate']>;
  }
  const groups=c.communication?.groups??[],target=option.targetIndex===null?null:option.targetKind==='item'?c.items[option.targetIndex]?.id:option.targetKind==='person'?c.connections[option.targetIndex]?.id:groups[option.targetIndex]?.id;
 const memoryIndices=[...new Set([...option.memoryIndices,...recalls,...(stance.stance?[c.memories.findIndex(m=>m.eventId===stance.stance!.exposureId)]:[])])];
 return {...(c.policy==='conversation-menu-v2'?{issueUpdate}:{}),action:option.action,platform:option.platform,targetId:target??null,text:v.text as string|null,motivation:v.motivation as string,memoryIds:memoryIndices.map(i=>c.memories[i].eventId),stance:stance.stance,...(c.communication?{groupId:option.groupIndex===null?null:groups[option.groupIndex].id,memberIds:option.memberIndices.map(i=>i<0?c.actor.id:c.connections[i].id),purposeId:option.purposeIndex===null?null:c.communication.purposes[option.purposeIndex],discussion:v.discussion as SocialDecision['discussion']}:{}),selection:{choiceId:option.id,stanceId:v.stanceId as string,recallIds:v.recallIds as string[]}};
}

/** Metadata-only opportunity diagnostics. Targets have already passed context access checks. */
export function replyMenuMetrics(c:DecisionContext){
 const eligible=c.items.map((item,index)=>({item,index})).filter(({item})=>item.modelAuthored&&item.actorId!==c.actor.id&&item.platform===c.platform&&c.memories.some(m=>m.itemIds.includes(item.id))&&(item.groupId?c.actions.includes('group-reply')&&c.communication?.groups.some(g=>g.id===item.groupId&&g.member):c.actions.includes(item.parentId?'reply':'comment')));
 const included=eligible.filter(({index})=>c.menu?.some(m=>['comment','reply','group-reply'].includes(m.action)&&m.targetKind==='item'&&m.targetIndex===index)).length;
 return {eligiblePeerReplies:eligible.length,includedPeerReplies:included,omittedPeerReplies:eligible.length-included};
}
