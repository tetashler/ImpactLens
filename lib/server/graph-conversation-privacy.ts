import type {PublicExplore} from '../society/public-contract.ts';
import type {GraphNodeSummary} from '../graph-summary/contract.ts';
import type {GraphSummaryWriterEvidence} from './graph-summary-evidence.ts';
import {AiError} from './ai/errors.ts';
const escaped=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const words=(text:string)=>text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
/** Keep private discussion as anonymous synthesis, not a transcript or an identity disclosure. */
export function protectPrivateConversationSummaries(run:PublicExplore,evidence:GraphSummaryWriterEvidence,batch:GraphNodeSummary[]):GraphNodeSummary[]{
 const privateChannels=new Map(evidence.channelDiscussions?.filter(channel=>channel.visibility==='private').map(channel=>[channel.nodeId,channel]));
 if(!privateChannels.size)return batch;
 const identifiers=[...new Set([...(run.society?.agents??[]).flatMap(agent=>[agent.id,agent.label]),...run.roles.map(role=>role.label)])].filter(value=>value.length>=4).sort((a,b)=>b.length-a.length);
 return batch.map(item=>{
  const channel=privateChannels.get(item.nodeId);if(!channel)return item;
  let summary=item.summary;
  for(const identifier of identifiers)summary=summary.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${escaped(identifier)}(?![\\p{L}\\p{N}_])`,'giu'),'a participant');
  const output=` ${words(summary).join(' ')} `;
  for(const statement of channel.statements){
   const source=words(statement.text);if(source.length<8)continue;
   const width=Math.min(12,source.length);
   for(let index=0;index<=source.length-width;index++)if(output.includes(` ${source.slice(index,index+width).join(' ')} `))throw new AiError('Please retry to get a paraphrased conversation summary.','GRAPH_SUMMARY_PRIVATE_QUOTE',502);
  }
  return {...item,summary};
 });
}
