import type {DecisionContext} from './decision-contract.ts';
/** Generation constraints only. The authoritative parser/reducer still reject invalid decisions. */
export function actionTargetSchema(c:DecisionContext,legacy:{type:string;additionalProperties:boolean;required:string[];properties:Record<string,any>}){
 const properties=structuredClone(legacy.properties),refs=(ids:string[],maximum:number)=>({type:'array',maxItems:ids.length?maximum:0,uniqueItems:true,items:ids.length?{type:'string',enum:ids}:{type:'string'}});
 properties.memoryIds=refs(c.memories.map(m=>m.eventId),6);
 const exposures=c.memories.filter(m=>m.kind==='exposure'&&(c.policy==='action-targets-v2'?c.items.some(i=>i.id===m.primaryItemId&&i.actorId!==c.actor.id):m.itemIds.some(id=>c.items.some(i=>i.id===id&&i.actorId!==c.actor.id)))).map(m=>m.eventId);
 properties.stance=exposures.length?{anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['target','exposureId'],properties:{target:{type:'number',minimum:-1,maximum:1},exposureId:{type:'string',enum:exposures}}}]}:{type:'null'};
 if(c.communication)properties.discussion.properties.topicIds=refs(c.communication.topics.map(t=>t.id),3);
 const shared=['memoryIds','stance','motivation',...(c.communication?['discussion']:[])],definitions=Object.fromEntries(shared.map(k=>[k,properties[k]]));
 const groups=c.communication?.groups??[],channels=c.communication?.channels??[{id:'reddit',style:'public-discussion'},{id:'instagram',style:'public-feed'}];
 const alternatives:any[]=[],interned=new Map<string,string>(),combined=new Map<string,any>();
 for(const [key,value]of Object.entries(definitions))interned.set(JSON.stringify(value),key);
 function intern(value:any){const encoded=JSON.stringify(value);if(encoded.length<80)return value;let key=interned.get(encoded);if(!key){key='constraint'+interned.size;definitions[key]=value;interned.set(encoded,key);}return {$ref:'#/$defs/'+key};}
 function branch(action:string,platform:string,targets:(string|null)[],groupIds:(string|null)[]=[null]){
  if(!targets.length)return;
  const p:any={...Object.fromEntries(shared.map(k=>[k,{$ref:'#/$defs/'+k}])),action:{type:'string',enum:[action]},platform:{type:'string',enum:[platform]},targetId:{type:targets.includes(null)?['string','null']:'string',enum:targets},text:['post','comment','reply','message','group-reply'].includes(action)?{type:'string',minLength:1,maxLength:1000}:{type:'null'}};
  if(c.communication){p.groupId={type:['string','null'],enum:groupIds};p.memberIds=['group-create','group-invite'].includes(action)?{...refs([c.actor.id,...c.connections.map(p=>p.id)],8),minItems:1}:{type:'array',maxItems:0,items:{type:'string'}};p.purposeId=action==='group-create'?{type:['string','null'],enum:[null,...c.communication.purposes]}:{type:'null'};}
  if(!['post','inactive','message','group-create','group-invite','group-join','group-leave','follow','unfollow'].includes(action)){const ids=c.memories.filter(m=>m.itemIds.some(id=>targets.includes(id))).map(m=>m.eventId);if(!ids.length)return;p.memoryIds={...properties.memoryIds,minItems:1,contains:{enum:ids}};}
  const normalized=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,intern(v)]));const signature=JSON.stringify({...normalized,action:null});const prior=combined.get(signature);if(prior){prior.properties.action.enum.push(action);return;}const variant={type:'object',additionalProperties:false,required:legacy.required,properties:normalized};combined.set(signature,variant);alternatives.push(variant);
 }
 for(const action of c.actions){
  if(action==='group-create'){for(const ch of channels.filter(ch=>ch.style==='private-group'))branch(action,ch.id,[null]);continue;}
  if(['post','inactive'].includes(action)){branch(action,c.platform,[null]);continue;}
  if(action==='message'){const ids=groups.filter(g=>g.member&&g.platform===c.platform).map(g=>g.id);if(ids.length)branch(action,c.platform,[null],ids);continue;}
  if(action==='share'){
   for(const ch of channels){const targets=c.items.filter(i=>i.platform!==ch.id&&(!i.groupId||groups.some(g=>g.id===i.groupId&&g.member&&g.canShare))).map(i=>i.id);const ids=ch.style==='private-group'?groups.filter(g=>g.member&&g.platform===ch.id).map(g=>g.id):[null];if(ids.length)branch(action,ch.id,targets,ids);}continue;
  }
  if(['group-invite','group-join','group-leave'].includes(action)){branch(action,c.platform,groups.filter(g=>g.platform===c.platform&&(action==='group-join'?g.canJoin:action==='group-invite'?g.canInvite:g.member)).map(g=>g.id));continue;}
  if(['follow','unfollow'].includes(action)){branch(action,c.platform,c.connections.filter(p=>p.id!==c.actor.id).map(p=>p.id));continue;}
  const targets=c.items.filter(i=>i.platform===c.platform&&!c.blockedTargets?.some(b=>b.action===action&&b.targetId===i.id)&&
   (action==='comment'?!i.parentId&&!i.groupId:action==='reply'?!!i.parentId&&!i.groupId:action==='group-reply'?!!i.groupId&&groups.some(g=>g.id===i.groupId&&g.member):true)).map(i=>i.id);
  branch(action,c.platform,targets);
 }
 return {...legacy,properties:Object.fromEntries(Object.entries(properties).map(([k,v])=>[k,intern(v)])),$defs:definitions,anyOf:alternatives};
}
