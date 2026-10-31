import {freezeSnapshot} from '../experiments/validation.ts';
import type {DecisionContext,SocialDecision} from './decision-contract.ts';
import type {IssueUpdate} from './episodic.ts';

export interface IssueChoice {id:string;update:IssueUpdate;discussion:NonNullable<SocialDecision['discussion']>;sourceItemId:string|null;memoryIndices:number[]}

/** New-policy classifications bind exact supplied topics and owner/source evidence.
 * Choosing one is an explicit fictional classification, never an inferred outcome. */
export function buildIssueMenu(c:DecisionContext):IssueChoice[]{
 if(c.policy!=='conversation-menu-v3')return [];
 const choices:Omit<IssueChoice,'id'>[]=[],topics=c.communication?.topics??[];
 if(c.issueCreationAllowed!==false)for(const topic of topics)for(const kind of ['question','condition','disagreement','commitment'] as const){
  choices.push({update:{kind,topicId:topic.id,issueId:null},discussion:{topicIds:[topic.id],argument:kind==='commitment'?'unspecified':kind},sourceItemId:null,memoryIndices:[]});
 }
 for(const issue of c.issues??[]){
  const source=c.items.find(i=>i.id===issue.sourceEventId&&i.actorId===c.actor.id);
  if(issue.status!=='open'||!topics.some(t=>t.id===issue.topicId)||!source||source.groupId&&!c.communication?.groups.some(g=>g.id===source.groupId&&g.member))continue;
  const memoryIndex=c.memories.findLastIndex(m=>m.itemIds.includes(issue.sourceEventId));if(memoryIndex<0)continue;
  for(const kind of ['resolve','withdraw'] as const)choices.push({update:{kind,topicId:issue.topicId,issueId:issue.id},discussion:{topicIds:[issue.topicId],argument:issue.kind==='commitment'?'unspecified':issue.kind},sourceItemId:issue.sourceEventId,memoryIndices:[memoryIndex]});
 }
 return freezeSnapshot(choices.map((choice,i)=>({...choice,id:'issue-choice-'+(i+1)})));
}
