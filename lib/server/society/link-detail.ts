import type {SocietyWorld,SocialEvent} from '../../society/contract.ts';
import type {LinkDetail,LinkArgument,SocietyLink} from '../../society/public-contract.ts';
import {aggregateFacts} from './facts.ts';

type Mutable={link:SocietyLink;events:SocialEvent[];stance:{changes:number;towardSupport:number;towardConcern:number}};

/** Aggregate description of a set of events: interaction mix, themes and argument kinds. Never text or timing. */
function describe(w:SocietyWorld,events:SocialEvent[]):LinkDetail {
 const mix:Record<string,number>={},platforms=new Set<string>(),arguments_:Partial<Record<LinkArgument,number>>={},themes=new Map<string,number>();
 const topics=w.genesis.input.communication?.topics??[];
 for(const e of events){
  mix[e.type]=(mix[e.type]??0)+1;
  if(e.platform)platforms.add(e.platform);
  const d=e.discussion;if(!d)continue;
  if(d.argument!=='unspecified')arguments_[d.argument]=(arguments_[d.argument]??0)+1;
  for(const id of d.topicIds){const label=topics.find(t=>t.id===id)?.label;if(label)themes.set(label,(themes.get(label)??0)+1);}
 }
 const top=[...themes].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,2).map(([label,count])=>({label,count}));
 return {mix,...(platforms.size?{platforms:[...platforms].sort()}:{}),...(top.length?{themes:top}:{}),...(Object.keys(arguments_).length?{arguments:arguments_}:{})};
}

/**
 * Public links with aggregate detail. Interaction links keep the existing key and count; transfers and
 * assumed ties are unchanged apart from the extra optional `detail`.
 */
export function buildLinks(w:SocietyWorld):SocietyLink[] {
 const links=new Map<string,Mutable>();
 for(const tie of w.ties)links.set('tie:'+tie.source+'|'+tie.target,{link:{source:tie.source,target:tie.target,kind:'ASSUMED_SOCIAL_TIE',count:1,detail:{tie:tie.kind}},events:[],stance:{changes:0,towardSupport:0,towardConcern:0}});
 const items=new Map(w.items.map(i=>[i.id,i]));
 const direct=new Map<string,Mutable>();
 for(const e of w.events){
  if(e.groupId||!['comment','reply'].includes(e.type)||!e.targetId)continue;
  const item=items.get(e.targetId);if(!item||item.groupId||item.actorId===e.actorId)continue;
  const key='interaction:'+e.actorId+'|'+item.actorId;
  const m=direct.get(key)??{link:{source:e.actorId,target:item.actorId,kind:'RECORDED_PUBLIC_INTERACTION',count:0},events:[],stance:{changes:0,towardSupport:0,towardConcern:0}};
  m.link.count++;m.events.push(e);direct.set(key,m);
 }
 // Stance changes recorded after the actor considered the other participant's items. Association only.
 for(const e of w.events){
  if(e.type!=='opinion'||e.groupId||e.position===null||e.previousPosition===null||e.position===e.previousPosition||!e.targetId)continue;
  const item=items.get(e.targetId);if(!item||item.groupId||item.actorId===e.actorId)continue;
  const m=direct.get('interaction:'+e.actorId+'|'+item.actorId);if(!m)continue;
  m.stance.changes++;if(e.position>e.previousPosition)m.stance.towardSupport++;else m.stance.towardConcern++;
 }
 for(const [key,m] of direct){
  const detail=describe(w,m.events);
  if(m.stance.changes)detail.stance=m.stance;
  m.link.detail=detail;links.set(key,m);
 }
 const byId=new Map(w.events.map(e=>[e.id,e]));
 for(const t of aggregateFacts(w,w.events).transfers){
  const events=t.sourceEventIds.map(id=>byId.get(id)).filter((e):e is SocialEvent=>!!e);
  const detail=describe(w,events);delete detail.platforms;
  links.set(t.source+'|'+t.target,{link:{source:t.source,target:t.target,kind:'RECORDED_INFORMATION_TRANSFER',count:t.count,detail},events,stance:{changes:0,towardSupport:0,towardConcern:0}});
 }
 return [...links.values()].map(m=>m.link);
}
