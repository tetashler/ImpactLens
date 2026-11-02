/** Server-only data access projection. Do not import this module into browser code or HTTP DTOs. */
import type {PublicExplore} from '../society/public-contract.ts';
import type {SocietyWorld,SocialEvent,SocialItem} from '../society/contract.ts';
import type {KnowledgeNode} from '../knowledge-graph/contract.ts';
import {PUBLIC_DISCUSSION_LIMITS as quickLimits,type PublicDiscussionEvidence} from '../report-summary/discussion-contract.ts';
const detailedLimits={statements:64,statementCharacters:1600,nodes:24,descriptionCharacters:700};

const clip=(value:string,max:number)=>Array.from(value.trim()).slice(0,max).join('').slice(0,max);
const authored=new Set(['post','comment','reply','message','group-reply']);
const scope='Accepted fictional stakeholder statements only. They are not observed behaviour or measured public opinion. No healthcare outcomes, waiting times, staffing capacity or causal effects are established by this discussion.';

function publicNodes(run:PublicExplore,world?:SocietyWorld):KnowledgeNode[]{
 const channels=world?.genesis.input.communication?.channels??[];
 const privatePlatforms=new Set<string>(channels.filter(c=>c.style==='private-group').map(c=>c.id));
 const privateEntities=new Set(channels.filter(c=>c.style==='private-group').map(c=>c.entityId).filter(Boolean));
 const publicPlatforms=new Set<string>(channels.filter(c=>c.style==='public-discussion'||c.style==='public-feed').map(c=>c.id));
 const privateGroups=new Set(world?.groups?.map(g=>g.id)??[]);
 return run.graph.nodes.filter(node=>{
  const p=node.properties;
  if(privateGroups.has(node.id)||p.groupId||p.recordType==='fictional-messaging-group'||p.style==='private-group')return false;
  if(typeof p.platformId==='string'&&(privatePlatforms.has(p.platformId)||!publicPlatforms.has(p.platformId)))return false;
  return !privateEntities.has(typeof p.entityId==='string'?p.entityId:null);
 });
}

function projectNode(node:KnowledgeNode,limits:{descriptionCharacters:number}=quickLimits):PublicDiscussionEvidence['nodes'][number]{
 const platform=typeof node.properties.platformId==='string';
 return {nodeId:node.id,label:clip(node.label,180),kind:clip(node.entityType??node.category,80),description:clip(platform?`Fictional public discussion environment: ${node.label}.`:node.description,limits.descriptionCharacters)};
}

function contextNode(node:KnowledgeNode){
 return !node.properties.platformId&&(node.properties.recordType==='world-entity'||['scenario','infrastructure','geography'].includes(node.category));
}

/** Empty evidence for retained runs that have no public society/session. No private execution fallback. */
export function emptyPublicDiscussionEvidence(run:PublicExplore):PublicDiscussionEvidence {
 return {version:1,scope:`No accepted public discussion statements are available. ${scope}`,initialStatements:0,followupStatements:0,omitted:0,statements:[],nodes:publicNodes(run).filter(contextNode).slice(0,quickLimits.nodes).map(node=>projectNode(node))};
}

interface Candidate {event:SocialEvent;item:SocialItem;roleId:string|null;nodeIds:string[];actor:string;phase:'initial'|'followup'}

/** Round-robin ordering retains different actors/channels before a frequent contributor's later turns. */
function breadth(candidates:Candidate[],key:(candidate:Candidate)=>string):Candidate[]{
 const buckets=new Map<string,Candidate[]>();
 for(const candidate of candidates){const id=key(candidate),bucket=buckets.get(id)??[];bucket.push(candidate);buckets.set(id,bucket);}
 const ordered:Candidate[]=[];
 for(let depth=0;ordered.length<candidates.length;depth++)for(const bucket of buckets.values())if(bucket[depth])ordered.push(bucket[depth]);
 return ordered;
}

/** Explicit allowlist over accepted PUBLIC authored items; no profile, memory or membership projection. */
export function extractPublicDiscussionEvidence(run:PublicExplore,world:SocietyWorld):PublicDiscussionEvidence {
 return extractDiscussion(run,world,false);
}
/** Fuller public reasoning for the long report; quick summaries keep their original projection. */
export function extractDetailedReportDiscussionEvidence(run:PublicExplore,world:SocietyWorld):PublicDiscussionEvidence {
 return extractDiscussion(run,world,true);
}
function extractDiscussion(run:PublicExplore,world:SocietyWorld,detailed:boolean):PublicDiscussionEvidence {
 const limits=detailed?detailedLimits:quickLimits;
 if(world.genesis.input.runId!==run.runId)throw Error('REPORT_DISCUSSION_IDENTITY');
 const channels=world.genesis.input.communication?.channels??[];
 const platforms=new Set(channels.filter(c=>c.style==='public-discussion'||c.style==='public-feed').map(c=>c.id));
 const items=new Map(world.items.map(item=>[item.id,item]));
 const nodes=publicNodes(run,world),roles=new Map(Object.entries(world.genesis.bindings).map(([role,actor])=>[actor,role]));
 const permitted=(item:SocialItem)=>!item.groupId&&!item.hidden&&!item.sharedFrom&&platforms.has(item.platform);
 const publicThread=(item:SocialItem)=>{
  const seen=new Set<string>();let current:SocialItem|undefined=item;
  while(current){if(seen.has(current.id)||!permitted(current))return false;seen.add(current.id);if(!current.parentId)return true;current=items.get(current.parentId);if(!current)return false;}
  return false;
 };
 const candidates:Candidate[]=[];
 for(const event of world.events){
  if(!['accepted-model-action','social-model'].includes(event.source)||!authored.has(event.type)||event.groupId||!event.platform||!platforms.has(event.platform)||typeof event.text!=='string'||!event.text.trim())continue;
  const item=items.get(event.id);
  if(!item||item.actorId!==event.actorId||item.platform!==event.platform||item.text!==event.text||!publicThread(item))continue;
  const roleId=roles.get(event.actorId)??null;
  const platformNodes=nodes.filter(n=>n.properties.platformId===event.platform);
  const actorNodes=nodes.filter(n=>n.properties.agentId===event.actorId||n.id===event.actorId||roleId!==null&&n.properties.roleId===roleId);
  const actor=actorNodes[0]?.label??run.society?.agents.find(a=>a.id===event.actorId)?.label??run.roles.find(r=>r.id===roleId)?.label??'Fictional participant';
  candidates.push({event,item,roleId,nodeIds:[...new Set([...platformNodes,...actorNodes].map(n=>n.id))],actor,phase:event.source==='accepted-model-action'?'initial':'followup'});
 }
 const initial=candidates.filter(c=>c.phase==='initial'),followup=candidates.filter(c=>c.phase==='followup');
 const ordered=[...breadth(initial,c=>c.roleId??c.event.actorId),...breadth(followup,c=>`${c.event.actorId}|${c.event.platform}`)];
 let statementBytes=0;
 const selected=ordered.slice(0,limits.statements).filter(candidate=>{
  if(!detailed)return true;
  const size=new TextEncoder().encode(clip(candidate.event.text!,limits.statementCharacters)).length;
  if(statementBytes+size>120000)return false;
  statementBytes+=size;return true;
 });
 const referenced=[...new Set(selected.flatMap(c=>c.nodeIds))];
 const referencedPlatforms=nodes.filter(n=>referenced.includes(n.id)&&typeof n.properties.platformId==='string');
 const referencedActors=referenced.map(id=>nodes.find(n=>n.id===id)!).filter(n=>typeof n.properties.platformId!=='string');
 const selectedNodes=[...referencedPlatforms,...referencedActors,...nodes.filter(n=>!referenced.includes(n.id)&&contextNode(n))].slice(0,limits.nodes);
 const ids=new Set(selectedNodes.map(n=>n.id));
 const selectedIds=new Set(selected.map(c=>c.event.id));
 return {version:1,scope:`${followup.length?'Initial and accepted public follow-up statements.':initial.length?'Initial-only discussion: no accepted public follow-up statements are available.':'No accepted public discussion statements are available.'} ${scope}`,initialStatements:initial.length,followupStatements:followup.length,omitted:candidates.length-selected.length,statements:selected.map(c=>({id:c.event.id,actor:clip(c.actor,180),nodeIds:c.nodeIds.filter(id=>ids.has(id)),phase:c.phase,text:clip(c.event.text!,limits.statementCharacters),...(detailed?{minute:Number.isFinite(c.event.minute)?c.event.minute:null,replyToId:c.event.parentId&&selectedIds.has(c.event.parentId)?c.event.parentId:null}:{})})),nodes:selectedNodes.map(node=>projectNode(node,limits))};
}
