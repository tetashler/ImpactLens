/** Deterministic internal social simulator. No fetch, provider credentials or real social APIs. */
import {canonical,ensure,freezeSnapshot,object} from '../experiments/validation.ts';
import {SOCIETY_LIMITS as L,randomFor,type Action,type Platform,type SocietyInput,type SocietyWorld,type SocialAgent,type SocialEvent,type SocialItem,type SocietyConfig} from './contract.ts';
export * from './contract.ts';
function immutable(w:SocietyWorld):SocietyWorld{Object.freeze(w.events);Object.freeze(w.items);Object.freeze(w.ties);for(const a of w.agents){Object.freeze(a.memory);Object.freeze(a.seen);Object.freeze(a.notifications);Object.freeze(a);}Object.freeze(w.agents);return Object.freeze(w);}
const bounded=(n:unknown,min:number,max:number)=>ensure(typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max,'Invalid society bound.');
export function createSociety(input:SocietyInput):SocietyWorld{
 ensure(input.runId.length<=128&&input.seed.length>0&&input.seed.length<=128&&input.question.length<=2000&&/^population-[a-f0-9]{64}$/.test(input.population.id),'Invalid society identity.');ensure(input.roles.length<=4&&input.acceptedActions.length<=8,'Existing model-role/action limits exceeded.');
 ensure(new Set(input.roles.map(r=>r.id)).size===input.roles.length,'Duplicate active role identity.');
 ensure(input.sharePolicy===undefined||input.sharePolicy==='source-position-v1','Unknown sharing policy.');
 ensure(input.acceptedActions.every(e=>typeof e.id==='string'&&e.id.length>0&&e.id.length<=300)&&new Set(input.acceptedActions.map(e=>e.id)).size===input.acceptedActions.length,'Duplicate or invalid accepted action identity.');
 const config:SocietyConfig={agents:24,steps:80,activation:0.55,influence:0.25,activePerStep:6,...input.config};object(config,['agents','steps','activation','influence','activePerStep']);for(const [k,max]of [['agents',L.agents],['steps',L.steps],['activePerStep',L.activePerStep]] as const){bounded(config[k],k==='agents'?4:1,max);ensure(Number.isSafeInteger(config[k]));}bounded(config.activation,0,1);bounded(config.influence,0,1);
 const pool=input.population.residents.filter(r=>Number(r.ageGroup.split('_')[0])>=20);ensure(pool.length>=config.agents,'Insufficient eligible adult profiles in the supplied view.');ensure(new Set(pool.map(r=>r.id)).size===pool.length,'Duplicate resident identities.');
 const agents:SocialAgent[]=[],bindings:Record<string,string>={};let next=0;
 const add=(role:SocietyInput['roles'][number]|null)=>{const affiliation=role?input.jurisdictions.find(j=>j.id===role.jurisdictionId)?.label??null:'Singapore',resident=!role||affiliation&&/\bsingapore\b/i.test(affiliation)?pool[next++]:null;const id=resident?.id??`fictional-${input.runId}-${role!.id}`;ensure(!agents.some(a=>a.id===id));if(role)bindings[role.id]=id;
 const startingPosition=role?(input.acceptedActions.filter(e=>e.roleId===role.id).at(-1)?.position??role.initialPosition):null;
 const opinion=startingPosition==='concerned'?-0.6:startingPosition==='conditional'?0.2:role?0:randomFor(input.seed+id+'opinion')*2-1;
 agents.push({id,label:role?`Fictional ${role.label}`:resident!.label,handle:`sim_${id.split('-').at(-1)}_${Math.floor(randomFor(id)*1e6)}`,resident,role,affiliation,goal:role?.goals[0]??'Understand the proposed change and discuss unresolved practical trade-offs.',initialOpinion:opinion,opinion,resistance:0.15+0.7*randomFor(id+'resistance'),actions:0,turns:0,memory:[],seen:[],notifications:[],community:`discussion-${Math.floor(randomFor(id+'community')*3)}`,activity:'residential-context',behaviour:'observe'});};
 input.roles.forEach(add);while(agents.length<config.agents)add(null);
 const ties:SocietyWorld['ties']=[];for(let i=0;i<agents.length;i++)for(const offset of [1,3,7]){const a=agents[i],b=agents[(i+offset)%agents.length];if(a.id!==b.id&&!ties.some(t=>t.source===a.id&&t.target===b.id))ties.push({source:a.id,target:b.id,kind:a.resident?.planningArea===b.resident?.planningArea?'neighbourhood-assumption':'fictional-friendship',assumed:true});}
 const genesis=freezeSnapshot({version:input.sharePolicy?3 as const:input.geography?2 as const:1 as const,id:`society-${input.runId}`,input:structuredClone(input),config,bindings,assumptions:['All handles, social ties, memberships, participation and behaviour are fictional assumptions, never measured public opinion.','Adult age bands beginning at twenty are eligible. Demographic attributes do not determine opinion, resistance or attention.','Reddit-like communities share ranked discussions; Instagram-like feeds use follows. Cross-platform transfers require an encountered source.','Influence is an uncalibrated bounded-assimilation rule. Simulated minutes are steps multiplied by fifteen.','Role-to-resident assignments are synthetic, not observed employment. Foreign/unresolved roles receive no Singapore individual demographic allocation.','Accepted model statements seed posts via an explicit alternating-platform placement assumption; this does not mean the LLM chose native platform posting. Starting positions map the latest accepted role position to an uncalibrated numerical scale.','Local activities refer to geographic context only: no exact residence, workplace, GPS track or validated journey is assigned.',...(input.sharePolicy?['Shared excerpts preserve the source item position; this is numeric record consistency, not language understanding.']:[])]});
 let w:SocietyWorld=immutable({version:1,genesis,tick:0,agents,ties,items:[],events:[],status:'ready'});
 for(const [i,e]of input.acceptedActions.entries()){ensure(bindings[e.roleId]&&e.statement.length<=1600,'Invalid accepted model-action reference.');w=act(w,{actorId:bindings[e.roleId],type:'post',platform:i%2?'instagram':'reddit',text:e.statement,sourceEventId:e.id,position:e.position==='concerned'?-0.6:e.position==='conditional'?0.2:0});}
 return w;
}
export function visibleFeed(w:SocietyWorld,id:string,platform:Platform):SocialItem[]{const a=w.agents.find(a=>a.id===id);ensure(a,'Unknown social actor.');const followed=new Set(w.ties.filter(t=>t.source===id).map(t=>t.target));return w.items.filter(p=>!p.hidden&&!p.parentId&&p.platform===platform&&(platform==='reddit'?(p.community===a.community||followed.has(p.actorId)||p.actorId===id):(followed.has(p.actorId)||p.actorId===id))).sort((x,y)=>platform==='reddit'?(y.votes+y.tick*0.02)-(x.votes+x.tick*0.02)||y.tick-x.tick:y.tick-x.tick||y.likes-x.likes).slice(0,16);}
/** Single validated event transition; rejected actions never mutate the old world. */
export function act(w:SocietyWorld,a:Action):SocietyWorld{
 object(a,['actorId','type','platform','targetId','parentId','text','position','sourceEventId','location'],['actorId','type']);
 if(w.events.length>=L.events)return immutable({...w,status:'event-limit'});
 const actor=w.agents.find(p=>p.id===a.actorId);ensure(actor,'Unknown social actor.');const platform=a.platform??null,target=w.items.find(i=>i.id===a.targetId),person=w.agents.find(p=>p.id===a.targetId),id=`${w.genesis.id}:e${w.events.length}`;
 ensure(['post','read','comment','reply','like','upvote','downvote','follow','unfollow','share','opinion','activity','inactive','moderate'].includes(a.type),'Unknown social action.');
 if(a.platform!==undefined)ensure(a.platform==='reddit'||a.platform==='instagram','Unknown simulated platform.');
 if(a.location!==undefined)ensure(a.type==='activity'&&['residential-context','community-context'].includes(a.location),'Invalid activity context.');
 if(a.type==='activity')ensure(a.location!==undefined,'Activity requires a context.');
 const needsTarget=['read','comment','reply','like','upvote','downvote','follow','unfollow','share','opinion','moderate'].includes(a.type);
 ensure(needsTarget?typeof a.targetId==='string'&&(target||person):a.targetId===undefined,'Missing or dangling action context.');
 if(a.parentId!==undefined)ensure(a.parentId===target?.parentId,'Invalid thread parent context.');
 if(a.sourceEventId!==undefined)ensure(typeof a.sourceEventId==='string'&&a.sourceEventId.length>0&&!w.events.some(e=>e.sourceEventId===a.sourceEventId),'Duplicate or invalid model-source event.');
 if(['post','comment','reply'].includes(a.type))ensure(typeof a.text==='string','Authored content requires text.');
 if(!['activity','inactive','opinion'].includes(a.type))ensure(platform==='reddit'||platform==='instagram','Missing simulated platform.');
 if(a.text!==undefined)ensure(typeof a.text==='string'&&a.text.trim().length>0&&a.text.length<=1600,'Invalid social text.');
 if(a.position!==undefined)bounded(a.position,-1,1);
 if(['post','comment','reply','share'].includes(a.type))ensure(w.items.length<L.items,'Social item limit reached.');
 const prior=target?actor.memory.filter(m=>m.itemId===target.id||m.exposedIds.includes(target.id)).at(-1):undefined;
 if(a.type==='read')ensure(target&&visibleFeed(w,actor.id,platform!).some(i=>i.id===target.id),'Cannot read a hidden or unavailable item.');
 if(['comment','reply','like','upvote','downvote','share','opinion','moderate'].includes(a.type))ensure(target&&prior,'An actual remembered exposure is required.');
 if(target)ensure(!target.hidden,'Withdrawn items cannot receive new reactions.');
 if(target&&a.type!=='share')ensure(target.platform===platform,'Platform target mismatch.');
 if(a.type==='share'){ensure(target&&target.platform!==platform,'Cross-platform sharing requires a different destination.');if(w.genesis.input.sharePolicy==='source-position-v1')ensure(a.position===undefined||a.position===target.position,'A source share cannot silently replace the source position.');}
 if(['upvote','downvote'].includes(a.type))ensure(platform==='reddit','Instagram has no downvotes/upvotes.');
 if(a.type==='reply')ensure(target?.parentId,'A reply requires a visible comment.');
 if(a.type==='comment')ensure(!target?.parentId,'Comment on a post; reply to a comment.');
 if(['follow','unfollow'].includes(a.type))ensure(person&&person.id!==actor.id,'Invalid follow endpoint.');
 if(a.type==='moderate')ensure(platform==='reddit'&&target?.actorId===actor.id,'Prototype moderation is an author withdrawal, not invented authority.');
 if(a.sourceEventId)ensure(a.type==='post'&&w.tick===0&&w.genesis.input.acceptedActions.some(e=>e.id===a.sourceEventId&&w.genesis.bindings[e.roleId]===actor.id&&e.statement===a.text),'Model source not in accepted history.');
 const causes=[...new Set([...(target?[target.id]:[]),...(prior?[prior.eventId]:[]),...(a.type==='opinion'?actor.memory.filter(m=>m.kind==='exposure'&&m.platform!==platform).slice(-1).map(m=>m.eventId):[])])];
 let opinion=actor.opinion;if(a.type==='opinion'){ensure(target&&target.actorId!==actor.id&&prior?.kind==='exposure','Influence requires another encountered agent.');opinion=Math.max(-1,Math.min(1,opinion+w.genesis.config.influence*(1-actor.resistance)*(target.position-opinion)));}
 const publishedPosition=a.type==='share'&&w.genesis.input.sharePolicy==='source-position-v1'?target!.position:a.position??actor.opinion;
 const event:SocialEvent=freezeSnapshot({id,actorId:actor.id,type:a.type,platform,tick:w.tick,minute:w.tick*15,targetId:a.targetId??null,parentId:a.parentId??target?.parentId??null,text:a.text??null,position:a.type==='opinion'?opinion:publishedPosition,previousPosition:a.type==='opinion'?actor.opinion:null,causes,source:a.sourceEventId?'accepted-model-action':'deterministic-rule',sourceEventId:a.sourceEventId??null,location:a.location??null});
 let items=w.items,seen=actor.seen,memory=actor.memory,ties=w.ties;
 if(['post','comment','reply','share'].includes(a.type)){
  const parentId=['comment','reply'].includes(a.type)?target!.id:null;
  const item:SocialItem=Object.freeze({id,actorId:actor.id,platform:platform!,parentId,community:actor.community,text:a.text??`Sharing an encountered perspective: ${target!.text.slice(0,180)}`,position:publishedPosition,tick:w.tick,media:platform==='instagram'&&!parentId?'synthetic-card':'none',votes:0,likes:0,hidden:false,sharedFrom:a.type==='share'?target!.id:null});items=[...items,item];memory=[...memory,{eventId:id,itemId:id,platform:platform!,kind:'authored' as const,exposedIds:[id]}].slice(-L.memory);seen=[...seen,id].slice(-L.seen);
 }
 if(a.type==='read'){const exposed=[target!.id,...items.filter(i=>i.parentId===target!.id&&!i.hidden).slice(-6).map(i=>i.id)];seen=[...new Set([...seen,...exposed])].slice(-L.seen);memory=[...memory,{eventId:id,itemId:target!.id,platform:platform!,kind:'exposure' as const,exposedIds:exposed}].slice(-L.memory);}
 if(['like','upvote','downvote','moderate'].includes(a.type)){ensure(!w.events.some(e=>e.actorId===actor.id&&e.targetId===a.targetId&&e.type===a.type),'Duplicate reaction.');items=items.map(i=>i.id!==a.targetId?i:Object.freeze({...i,likes:i.likes+(a.type==='like'?1:0),votes:i.votes+(a.type==='upvote'?1:a.type==='downvote'?-1:0),hidden:i.hidden||a.type==='moderate'}));}
 if(a.type==='follow'){ensure(ties.length<L.edges);if(!ties.some(t=>t.source===actor.id&&t.target===person!.id))ties=[...ties,{source:actor.id,target:person!.id,kind:'online-follow',assumed:true}];}
 if(a.type==='unfollow')ties=ties.filter(t=>t.source!==actor.id||t.target!==person!.id);
 const agents=w.agents.map(p=>p.id===actor.id?{...p,actions:p.actions+1,opinion,memory,seen,activity:a.location??p.activity,behaviour:Math.abs(opinion)>0.4?'discuss' as const:'observe' as const}:target&&p.id===target.actorId&&['comment','reply','share'].includes(a.type)?{...p,notifications:[...p.notifications,id].slice(-L.memory)}:p);
 return immutable({...w,agents,items,ties,events:[...w.events,event]});
}
export function stepSociety(original:SocietyWorld):SocietyWorld{
 if(original.tick>=original.genesis.config.steps||original.status==='event-limit')return original;
 let w=immutable({...original,tick:original.tick+1});const {config,input}=w.genesis;
 const active=w.agents.filter(a=>randomFor(`${input.seed}:${w.tick}:${a.id}:activate`)<config.activation).sort((a,b)=>randomFor(`${input.seed}:${w.tick}:${a.id}`)-randomFor(`${input.seed}:${w.tick}:${b.id}`)).slice(0,config.activePerStep).map(a=>a.id);
 for(const id of active){if(w.status==='event-limit'||w.items.length>=L.items){w=immutable({...w,status:'event-limit'});break;}const a=w.agents.find(a=>a.id===id)!,platform:Platform=(a.turns+Math.floor(randomFor(id)*2))%2?'reddit':'instagram',feed=visibleFeed(w,id,platform).filter(p=>p.actorId!==id),unread=feed.find(p=>!a.memory.some(m=>m.kind==='exposure'&&m.itemId===p.id));
  if(w.tick%4===0){w=act(w,{actorId:id,type:'activity',location:a.activity==='residential-context'?'community-context':'residential-context'});}
  const phase=a.turns%7;w=immutable({...w,agents:w.agents.map(p=>p.id===id?{...p,turns:p.turns+1}:p)});
  if(phase===0||!feed.length){w=act(w,{actorId:id,type:'post',platform,text:`${a.goal} My current simulated priority is ${a.opinion>0.3?'exploring potential benefits':a.opinion< -0.3?'examining practical concerns':'seeking clearer conditions'}. This is a fictional perspective on: ${input.question.slice(0,200)}`});continue;}
  const seen=feed.find(p=>a.memory.some(m=>m.kind==='exposure'&&m.itemId===p.id));
  if(!seen||phase===1||phase===6){const fresh=feed.find(p=>w.items.some(i=>i.parentId===p.id&&!a.seen.includes(i.id)))??unread??feed[0];if(fresh){w=act(w,{actorId:id,type:'read',platform,targetId:fresh.id});w=act(w,{actorId:id,type:'opinion',platform,targetId:fresh.id});}continue;}
  if(phase===1||phase===2){const comment=w.items.filter(i=>i.parentId===seen.id&&a.seen.includes(i.id)&&i.actorId!==id).at(-1),target=comment??seen;w=act(w,{actorId:id,type:comment?'reply':'comment',platform,targetId:target.id,text:`Responding to the encountered ${comment?'comment':'post'}: “${target.text.slice(0,140)}” — ${a.goal} ${a.opinion>0?'I would consider a conditional trial.':'I would request safeguards before changing plans.'}`});}
  else if(phase===3)w=act(w,{actorId:id,type:'share',platform:platform==='reddit'?'instagram':'reddit',targetId:seen.id});
  else if(phase===4){const type=platform==='instagram'?'like':a.opinion>=0?'upvote':'downvote';if(!w.events.some(e=>e.type===type&&e.actorId===id&&e.targetId===seen.id))w=act(w,{actorId:id,type,platform,targetId:seen.id});}
  else if(phase===5){const person=w.agents[(Math.floor(randomFor(id+w.tick)*w.agents.length))];if(person.id!==id)w=act(w,{actorId:id,type:w.ties.some(t=>t.source===id&&t.target===person.id)?'unfollow':'follow',platform,targetId:person.id});}
  else w=act(w,{actorId:id,type:'read',platform,targetId:seen.id});
 }
 return immutable({...w,status:w.status==='event-limit'?'event-limit':w.tick>=config.steps?'complete':'ready'});
}
export function advanceSociety(w:SocietyWorld,steps:number){ensure(Number.isSafeInteger(steps)&&steps>=0&&steps<=L.steps);for(let i=0;i<steps&&w.tick<w.genesis.config.steps;i++)w=stepSociety(w);return w;}
export function saveSociety(w:SocietyWorld){const text=JSON.stringify(w);ensure(new TextEncoder().encode(text).length<=L.savedBytes,'Saved society exceeds limit.');return text;}
export function restoreSociety(text:string,expected?:SocietyWorld['genesis']):SocietyWorld{ensure(new TextEncoder().encode(text).length<=L.savedBytes);const value=JSON.parse(text);ensure(value.version===1&&[1,2,3].includes(value.genesis?.version)&&Number.isSafeInteger(value.tick)&&value.tick>=0&&value.tick<=L.steps);if(expected)ensure(canonical(expected)===canonical(value.genesis),'Stale or different society genesis.');const replay=advanceSociety(createSociety(value.genesis.input),value.tick);ensure(canonical(replay)===canonical(value),'Society events/state differ from deterministic replay.');return replay;}

/** Restore earlier worlds as recorded; upgrading policy requires an explicit new/reset social world. */
export function restoreSocietyForInput(text:string,expected:SocietyWorld['genesis']):SocietyWorld{
 ensure(new TextEncoder().encode(text).length<=L.savedBytes);
 const value=JSON.parse(text);
 if([1,2].includes(value.genesis?.version)&&value.genesis?.input?.sharePolicy===undefined){
  const legacyInput=structuredClone(expected.input);delete legacyInput.sharePolicy;
  if(value.genesis.version===1&&!value.genesis.input.geography)delete legacyInput.geography;
  ensure(canonical(legacyInput)===canonical(value.genesis.input),'Saved social genesis differs from current scenario.');
  return restoreSociety(text);
 }
 return restoreSociety(text,expected);
}
