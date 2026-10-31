import type {DecisionContext} from '../society/decision-contract.ts';
import type {IssueChoice} from '../society/issue-menu.ts';
export interface CitizenIssueChoice extends IssueChoice {subjectId:string;basisRefs:string[];criterionId:string|null}
export function buildCitizenIssueMenu(c:DecisionContext):CitizenIssueChoice[]{
 if(c.policy!=='conversation-menu-v4'||!c.grounding)return [];
 const choices:Omit<CitizenIssueChoice,'id'>[]=[],topics=c.communication?.topics??[];
 for(const subject of c.grounding.subjects.slice(0,3)){
  const topic=topics.find(t=>subject.keywords.some(k=>t.label.toLowerCase().includes(k)))??topics[0];if(!topic)continue;
  const pending=(c.issueSubjectStates??c.issues?.flatMap(i=>i.grounding?[{subjectId:i.grounding.subjectId,issueId:i.id,status:i.status}]:[])??[]).some(i=>i.subjectId===subject.id&&i.status==='open');
  if(c.issueCreationAllowed!==false&&!pending)for(const kind of ['question','condition','commitment','disagreement'] as const)choices.push({subjectId:subject.id,basisRefs:subject.factRefs,criterionId:subject.criterion?.id??null,update:{kind,topicId:topic.id,issueId:null},discussion:{topicIds:[topic.id],argument:kind==='commitment'?'unspecified':kind},sourceItemId:null,memoryIndices:[]});
 }
 for(const issue of c.issues??[]){
  const subject=c.grounding.subjects.find(s=>s.id===issue.grounding?.subjectId),source=c.items.find(i=>i.id===issue.sourceEventId&&i.actorId===c.actor.id),mi=c.memories.findLastIndex(m=>m.itemIds.includes(issue.sourceEventId));
  if(!subject||issue.status!=='open'||!source||mi<0||!topics.some(t=>t.id===issue.topicId)||source.groupId&&!c.communication?.groups.some(g=>g.id===source.groupId&&g.member))continue;
  for(const kind of ['progress','resolve','withdraw'] as const)choices.push({subjectId:subject.id,basisRefs:[...subject.factRefs,...c.items.map((_,i)=>'item-'+(i+1))],criterionId:issue.grounding?.criterion??null,update:{kind,topicId:issue.topicId,issueId:issue.id},discussion:{topicIds:[issue.topicId],argument:issue.kind==='commitment'?'unspecified':issue.kind},sourceItemId:issue.sourceEventId,memoryIndices:[mi]});
 }
 return choices.slice(0,24).map((choice,index)=>({...choice,id:'tracked-'+(index+1)}));
}
