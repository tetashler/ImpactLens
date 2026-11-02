/** Server-only model input. Never expose this pack through an HTTP response or client state. */
import type {PublicExplore} from '../society/public-contract.ts';
import type {SocietyWorld,SocialEvent,SocialItem,Platform} from '../society/contract.ts';

export interface GraphChannelDiscussion {
  nodeId:string;
  channel:string;
  visibility:'public'|'private';
  eligibleStatements:number;
  omitted:number;
  statements:{id:string;speaker:string;thread:string;phase:'initial'|'followup';minute:number|null;replyToId:string|null;text:string}[];
}
const authored=new Set(['post','comment','reply','message','group-reply']);
const MAX_STATEMENTS=24,MAX_TEXT_CHARACTERS=1200,MAX_BATCH_TEXT_BYTES=60000;
type Candidate={event:SocialEvent;item:SocialItem;order:number;root:string};

/** Metadata identifies text to remove; it never supplies profiles or membership context. */
function participantRedactor(world:SocietyWorld):(text:string)=>string {
  const tokens=[...new Set(world.agents.flatMap(agent=>[agent.id,agent.label,agent.handle])
    .filter(value=>typeof value==='string'&&value.trim().length>=4).map(value=>value.trim()))].sort((a,b)=>b.length-a.length);
  if(!tokens.length)return text=>text;
  const escaped=tokens.map(token=>RegExp.escape(token));
  const pattern=new RegExp(String.raw`(?<![\p{L}\p{N}_])(?:`+escaped.join('|')+String.raw`)(?![\p{L}\p{N}_])`,'giu');
  return text=>text.replace(pattern,'a participant');
}

/** Preserve complete Unicode characters within both the character and UTF-8 budgets. */
function excerpt(text:string,byteBudget:number):string {
  let result='',bytes=0;
  for(const character of text.trim()) {
    const size=Buffer.byteLength(character,'utf8');
    if(result.length+character.length>MAX_TEXT_CHARACTERS||bytes+size>byteBudget)break;
    result+=character;bytes+=size;
  }
  return result;
}

/** Include the beginning, middle and end, then fill the widest remaining chronological gaps. */
function spread<T>(values:readonly T[],limit:number):T[] {
  if(values.length<=limit)return [...values];
  const indices=new Set([0,values.length-1]);
  if(limit>=3)indices.add(Math.floor((values.length-1)/2));
  while(indices.size<limit) {
    const sorted=[...indices].sort((a,b)=>a-b);let gap=0,next=-1;
    for(let i=1;i<sorted.length;i++)if(sorted[i]-sorted[i-1]>gap){gap=sorted[i]-sorted[i-1];next=Math.floor((sorted[i]+sorted[i-1])/2);}
    if(next<0||indices.has(next))break;
    indices.add(next);
  }
  return [...indices].sort((a,b)=>a-b).slice(0,limit).map(index=>values[index]);
}

/** Accepted authored text only, with an intact, matching, unhidden and unforwarded ancestry. */
function acceptedCandidates(world:SocietyWorld):Candidate[] {
  const channels=new Set(world.genesis.input.communication?.channels.map(channel=>channel.id));
  const groups=new Map(world.groups?.map(group=>[group.id,group]));
  const items=new Map<string,SocialItem>(),duplicateItems=new Set<string>(),duplicateEvents=new Set<string>(),eventIds=new Set<string>();
  for(const item of world.items){if(items.has(item.id))duplicateItems.add(item.id);items.set(item.id,item);}
  for(const event of world.events){if(eventIds.has(event.id))duplicateEvents.add(event.id);eventIds.add(event.id);}
  const eligible=new Map<string,Candidate>();
  world.events.forEach((event,order)=>{
    if(duplicateEvents.has(event.id)||duplicateItems.has(event.id)||!['accepted-model-action','social-model'].includes(event.source)||!authored.has(event.type)||!event.platform||!channels.has(event.platform)||typeof event.text!=='string'||!event.text.trim())return;
    const item=items.get(event.id);
    if(!item||item.actorId!==event.actorId||item.platform!==event.platform||item.text!==event.text||(item.groupId??null)!==(event.groupId??null)||item.hidden||item.sharedFrom)return;
    if(item.groupId&&groups.get(item.groupId)?.platform!==item.platform)return;
    eligible.set(event.id,{event,item,order,root:event.id});
  });
  const roots=new Map<string,string|null>();
  for(const candidate of eligible.values()) {
    const path:Candidate[]=[],seen=new Set<string>();let current:Candidate|undefined=candidate,root:string|null=null;
    while(current) {
      if(roots.has(current.item.id)){root=roots.get(current.item.id)!;break;}
      if(seen.has(current.item.id))break;
      seen.add(current.item.id);path.push(current);
      if(!current.item.parentId){root=current.item.id;break;}
      // Items carry the canonical reply target. Engine events can instead carry
      // target.parentId, so requiring event/item parent equality drops valid comments.
      const parent=eligible.get(current.item.parentId);
      if(!parent||parent.item.platform!==current.item.platform||(parent.item.groupId??null)!==(current.item.groupId??null)||parent.order>=current.order)break;
      current=parent;
    }
    for(const entry of path)roots.set(entry.item.id,root);
  }
  return [...eligible.values()].flatMap(candidate=>{const root=roots.get(candidate.item.id);return root?[{...candidate,root}]:[];});
}

/**
 * Bounded fictional channel conversations for graph summaries. Private analysis is
 * explicitly permitted here; actor identities, memberships and record metadata are not.
 */
export function extractGraphChannelDiscussions(run:PublicExplore,world:SocietyWorld,nodeIds:readonly string[]):GraphChannelDiscussion[] {
  if(world.genesis.input.runId!==run.runId)throw Error('GRAPH_CHANNEL_IDENTITY');
  const nodes=new Map(run.graph.nodes.map(node=>[node.id,node])),channels=new Map(world.genesis.input.communication?.channels.map(channel=>[channel.id,channel])),groups=new Map(world.groups?.map(group=>[group.id,group]));
  const redact=participantRedactor(world);
  const candidates=acceptedCandidates(world).map(candidate=>({...candidate,text:redact(candidate.item.text)}));
  const targets=[...new Set(nodeIds)].flatMap(nodeId=>{
    const node=nodes.get(nodeId);if(!node)return [];
    const group=node.properties.recordType==='fictional-messaging-group'?groups.get(node.id):undefined;
    if(node.properties.recordType==='fictional-messaging-group'&&!group)return [];
    if(group&&typeof node.properties.platform==='string'&&node.properties.platform!==group.platform)return [];
    const platform=group?.platform??(typeof node.properties.platformId==='string'?node.properties.platformId:null),channel=platform?channels.get(platform as Platform):undefined;
    if(!channel)return [];
    return [{node,group,channel,candidates:candidates.filter(candidate=>candidate.item.platform===channel.id&&(!group||candidate.item.groupId===group.id))}];
  });
  // Equal shares prevent a busy platform or duplicated platform/group view from
  // starving another selected node. Unused shares need not expand the evidence.
  const byteBudget=Math.floor(MAX_BATCH_TEXT_BYTES/Math.max(1,targets.length));
  return targets.map(({node,group,channel,candidates:matching})=>{
    let selected=spread(matching,MAX_STATEMENTS);
    if(selected.reduce((sum,candidate)=>sum+Buffer.byteLength(excerpt(candidate.text,MAX_BATCH_TEXT_BYTES),'utf8'),0)>byteBudget) {
      selected=spread(matching,Math.min(MAX_STATEMENTS,Math.max(3,Math.floor(byteBudget/1200))));
    }
    const selectedBytes=selected.reduce((sum,candidate)=>sum+Buffer.byteLength(excerpt(candidate.text,MAX_BATCH_TEXT_BYTES),'utf8'),0);
    const perStatementBudget=selectedBytes<=byteBudget?MAX_BATCH_TEXT_BYTES:Math.floor(byteBudget/Math.max(1,selected.length));
    const speakers=new Map<string,string>(),threads=new Map<string,string>(),ids=new Map(selected.map((candidate,index)=>[candidate.item.id,`statement-${index+1}`]));
    const statements=selected.flatMap(candidate=>{
      const text=excerpt(candidate.text,perStatementBudget);if(!text)return [];
      if(!speakers.has(candidate.item.actorId))speakers.set(candidate.item.actorId,`Participant ${speakers.size+1}`);
      // Ancestry validation guarantees that root identity is confined to one platform/group.
      if(!threads.has(candidate.root))threads.set(candidate.root,`Discussion ${threads.size+1}`);
      return [{id:ids.get(candidate.item.id)!,speaker:speakers.get(candidate.item.actorId)!,thread:threads.get(candidate.root)!,phase:candidate.event.source==='accepted-model-action'?'initial' as const:'followup' as const,minute:Number.isFinite(candidate.event.minute)?candidate.event.minute:null,replyToId:candidate.item.parentId?ids.get(candidate.item.parentId)??null:null,text}];
    });
    return {nodeId:node.id,channel:node.label.slice(0,180),visibility:group||channel.style==='private-group'?'private' as const:'public' as const,eligibleStatements:matching.length,omitted:matching.length-statements.length,statements};
  });
}
