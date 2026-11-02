import type {PublicExplore} from '../society/public-contract.ts';
import type {SocietyWorld} from '../society/contract.ts';
import type {PublicDiscussionEvidence} from '../report-summary/discussion-contract.ts';
import {projectGraphSummaryContext,type GraphSummaryContext} from '../graph-summary/evidence.ts';
import {extractGraphTargetDiscussionEvidence} from './report-discussion-evidence.ts';
import type {GraphChannelDiscussion} from './graph-channel-discussions.ts';
import {graphEntityMention} from './graph-entity-mentions.ts';
export type GraphSummaryWriterEvidence=GraphSummaryContext&{publicDiscussion:PublicDiscussionEvidence;channelDiscussions?:GraphChannelDiscussion[];scenarioConversations?:GraphChannelDiscussion[]};

/** Match permitted public statements to node identities, never to event totals or similarity of opinions. */
export function projectGraphNodeDiscussion(run:PublicExplore,world:SocietyWorld,nodeIds:readonly string[]):PublicDiscussionEvidence {
 const targetIds=new Set(nodeIds),targets=run.graph.nodes.filter(node=>targetIds.has(node.id));
 if(targets.length!==targetIds.size)throw Error('GRAPH_SUMMARY_NODE');
 const events=new Map(world.events.map(event=>[event.id,event]));
 const privatePlatforms=new Set(run.society?.platforms.filter(platform=>platform.style==='private-group').map(platform=>platform.id));
 const isPrivate=(node:typeof targets[number])=>node.properties.recordType==='fictional-messaging-group'||node.properties.style==='private-group'||typeof node.properties.platformId==='string'&&privatePlatforms.has(node.properties.platformId);
 const primaryNonRole=new Set(run.graph.nodes.filter(node=>node.properties.recordType==='fictional-agent'&&!node.properties.roleId&&node.properties.presentationPrimary===true).map(node=>node.properties.agentId));
 const background=new Set((run.society?.agents??[]).filter(agent=>!agent.roleId&&!primaryNonRole.has(agent.id)).map(agent=>agent.id));
 const actors=new Set<string>(),platforms=new Set<string>();
 for(const node of targets){if(isPrivate(node))continue;const p=node.properties;
  if(p.recordType==='fictional-agent-aggregate')for(const actor of background)actors.add(actor);
  if(typeof p.agentId==='string')actors.add(p.agentId);
  if(typeof p.roleId==='string'&&world.genesis.bindings[p.roleId])actors.add(world.genesis.bindings[p.roleId]);
  if(typeof p.platformId==='string')platforms.add(p.platformId);
 }
 const pack=extractGraphTargetDiscussionEvidence(run,world,actors,platforms,text=>targets.some(node=>graphEntityMention(node,text)));
 const statements=pack.statements.map(statement=>{
  const event=events.get(statement.id);
  const associated=event?targets.filter(node=>{
   const p=node.properties;
   if(isPrivate(node))return false;
   if(p.recordType==='fictional-agent-aggregate')return background.has(event.actorId);
   if(typeof p.platformId==='string')return p.platformId===event.platform;
   if(typeof p.agentId==='string')return p.agentId===event.actorId;
   return typeof p.roleId==='string'?world.genesis.bindings[p.roleId]===event.actorId:graphEntityMention(node,statement.text);
  }).map(node=>node.id):[];
  return {...statement,nodeIds:associated};
 });
 // Batch-specific statements first, then a small amount of clearly unassigned scenario context.
 const attributed=statements.filter(statement=>statement.nodeIds.length),context=statements.filter(statement=>!statement.nodeIds.length).slice(0,8);
 const privateOnly=targets.every(isPrivate);
 return {...pack,scope:pack.scope+' Only statement.nodeIds establish attribution. For entities this means an explicit mention, not that the entity spoke or endorsed anything. Empty nodeIds mean scenario context only. This pack covers public statements; anonymous channel conversation excerpts are supplied separately.',statements:privateOnly?[]:[...attributed,...context].slice(0,64),nodes:projectGraphSummaryContext(run).nodes.filter(node=>targetIds.has(node.nodeId)).map(node=>({nodeId:node.nodeId,label:node.label,kind:node.kind,description:node.description}))};
}
export function projectGraphSummaryWriterEvidence(run:PublicExplore,nodeIds:readonly string[],publicDiscussion:PublicDiscussionEvidence,channelDiscussions:GraphChannelDiscussion[]=[],scenarioConversations:GraphChannelDiscussion[]=[]):GraphSummaryWriterEvidence {
 const context=projectGraphSummaryContext(run),ids=new Set(nodeIds),nodes=context.nodes.filter(node=>ids.has(node.nodeId));
 if(nodes.length!==ids.size)throw Error('GRAPH_SUMMARY_NODE');
 return {...context,nodes,publicDiscussion,channelDiscussions,scenarioConversations};
}
