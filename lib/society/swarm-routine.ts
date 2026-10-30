import type {Action,Platform,SocietyWorld,SocialItem} from './contract.ts';import {experiencedMemories} from './episodic.ts';
/** Phase4E routine support never invents discretionary authored dialogue. */
export function swarmRoutineStep(w:SocietyWorld,id:string,platform:Platform,feed:SocialItem[],apply:(w:SocietyWorld,a:Action)=>SocietyWorld){
 const actor=w.agents.find(a=>a.id===id)!,events=w.events.filter(e=>e.actorId===id);let next={...w,agents:w.agents.map(a=>a.id===id?{...a,turns:a.turns+1}:a)};
 if(w.tick%8===0)return apply(next,{actorId:id,type:'activity',location:actor.activity==='residential-context'?'community-context':'residential-context'});
 const source=feed.find(i=>i.actorId!==id&&!events.some(e=>e.type==='read'&&e.targetId===i.id&&w.tick-e.tick<8));
 if(source&&!actor.seen.includes(source.id))return apply(next,{actorId:id,type:'read',platform,targetId:source.id});
 const exposed=experiencedMemories(w,id),considered=feed.find(i=>i.actorId!==id&&exposed.some(m=>m.kind==='exposure'&&m.itemId===i.id)&&!events.some(e=>e.type==='opinion'&&e.targetId===i.id));
 if(actor.turns%5===3&&considered)return apply(next,{actorId:id,type:'opinion',platform,targetId:considered.id});
 const target=feed.find(i=>exposed.some(m=>m.itemId===i.id)&&!events.some(e=>e.type==='like'&&e.targetId===i.id));
 if(actor.turns%5===4&&target)return apply(next,{actorId:id,type:'like',platform,targetId:target.id});
 return apply(next,{actorId:id,type:'inactive',platform});
}
