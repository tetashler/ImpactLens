/** Conservative synthetic-fixture evaluator. This recognises one declared claim grammar;
 * unknown natural-language paraphrases remain UNASSESSED. It never establishes causal use. */
import type {DecisionContext,SocialDecision} from '../../lib/society/decision-contract.ts';
import {encodeMemoryEvidence} from '../../lib/society/memory-presentation.ts';

export interface MemoryBindingEvidence {rawRecallRefs:string[];targetRequiredRefs:string[];stanceRequiredRefs:string[];issueRequiredRefs:string[];additionalRecallRefs:string[];invalidRecallRefs:string[]}
export function classifyMemoryBindings(c:DecisionContext,d:SocialDecision|null):MemoryBindingEvidence {
 const rawRecallRefs=[...(d?.selection?.recallIds??[])],valid=new Set(c.memories.map((_,index)=>`memory-${index+1}`));
 const targetRequiredRefs=c.menu?.find(option=>option.id===d?.selection?.choiceId)?.memoryIndices.map(index=>`memory-${index+1}`)??[];
 const stanceRequiredRefs=d?.stance?c.memories.flatMap((memory,index)=>memory.eventId===d.stance!.exposureId?[`memory-${index+1}`]:[]):[];
 const issue=d?.issueUpdate&&((c.policy==='conversation-menu-v4'||c.policy==='conversation-menu-v5')?['progress','resolve','withdraw']:['resolve','withdraw']).includes(d.issueUpdate.kind)?c.issues?.find(issue=>issue.id===d.issueUpdate!.issueId):undefined;
 const selected=new Set([...targetRequiredRefs,...rawRecallRefs,...c.memories.flatMap((memory,index)=>d?.memoryIds.includes(memory.eventId)?[`memory-${index+1}`]:[])]);
 // Conservatively classify every actually selected source binding used by the issue.
 const sourceRequiredRefs=issue?c.memories.flatMap((memory,index)=>memory.itemIds.includes(issue.sourceEventId)&&selected.has(`memory-${index+1}`)?[`memory-${index+1}`]:[]):[];
 const evidenceItem=(c.policy==='conversation-menu-v4'||c.policy==='conversation-menu-v5')&&d?.issueUpdate&&/^item-([1-8])$/.exec(d.selection?.issueEvidence?.basisRef??'');
 const basis=evidenceItem?c.items[Number(evidenceItem[1])-1]:undefined;
 const evidenceRefs=basis?c.memories.flatMap((m,i)=>m.itemIds.includes(basis.id)&&selected.has(`memory-${i+1}`)?[`memory-${i+1}`]:[]):[];
 const issueRequiredRefs=[...new Set([...sourceRequiredRefs,...evidenceRefs])];
 const required=new Set([...targetRequiredRefs,...stanceRequiredRefs,...issueRequiredRefs]);
 return {rawRecallRefs,targetRequiredRefs,stanceRequiredRefs,issueRequiredRefs,additionalRecallRefs:rawRecallRefs.filter(ref=>valid.has(ref)&&!required.has(ref)),invalidRecallRefs:rawRecallRefs.filter(ref=>!valid.has(ref))};
}

export interface SyntheticMemorySource {itemId:string;eventId:string;authorId:string;tick:number;text:string;relevance:'relevant'|'irrelevant'}
interface Claim {subject:string;relation:string;detail:string;condition:string;boundary:string}
interface AttributedClaim extends Claim {authorId:string;day:number}
const normal=(value:string)=>value.trim().toLowerCase().replace(/\s+/g,' ');
const claim=(value:string):Claim|null=>{
 const match=/^the (.+?) (does not require|requires) (.+?) (before|after) (.+?)\.?$/i.exec(value.trim());
 return match?{subject:normal(match[1]),relation:normal(match[2]),detail:normal(match[3]),condition:normal(match[4]),boundary:normal(match[5]).replace(/\.$/,'')}:null;
};
const attributed=(value:string):AttributedClaim|null=>{
 const match=/^author ([a-z0-9:_-]{1,160}) reported on day ([1-9][0-9]*) that (.+)$/i.exec(value.trim());
 const parsed=match?claim(match[3]):null;
 return parsed&&match?{...parsed,authorId:match[1],day:Number(match[2])}:null;
};
const equal=(a:Claim,b:Claim)=>a.subject===b.subject&&a.relation===b.relation&&a.detail===b.detail&&a.condition===b.condition&&a.boundary===b.boundary;
export type MemoryContentAssessment='SOURCE_GROUNDED_REFERENCE'|'IRRELEVANT_SOURCE_REFERENCE'|'UNSUPPORTED_REFERENCE'|'UNASSESSED'|'NO_AUTHORED_CONTENT';

/** Source objects are predeclared synthetic ground truth, not model-generated annotations.
 * Safe results retain IDs/booleans only; neither source nor response text is returned. */
export function evaluateMemoryEvidence(c:DecisionContext,d:SocialDecision|null,sources:readonly SyntheticMemorySource[],retainedEventIds?:readonly string[]) {
 const bindings=classifyMemoryBindings(c,d),presentation=encodeMemoryEvidence(c);
 const rows=sources.map(source=>{
  const memoryIndex=c.memories.findIndex(memory=>memory.eventId===source.eventId&&memory.primaryItemId===source.itemId),memory=memoryIndex>=0?c.memories[memoryIndex]:undefined;
  const ref=memoryIndex>=0?`memory-${memoryIndex+1}`:null;
  const item=c.items.find(item=>item.id===source.itemId&&item.actorId===source.authorId&&item.tick===source.tick&&item.text===source.text);
  const supplied=!!item&&!!memory?.itemIds.includes(source.itemId)&&!!presentation.entries.some(entry=>entry.memoryRef===ref);
  return {source,parsed:claim(source.text),authoredDay:presentation.entries.find(entry=>entry.memoryRef===ref)?.authored?.day??null,
   safe:{sourceItemId:source.itemId,retained:retainedEventIds?retainedEventIds.includes(source.eventId):null,retrieved:!!memory,primaryContentIncluded:supplied,explicitRecall:!!ref&&bindings.rawRecallRefs.includes(ref),additionalRecall:!!ref&&bindings.additionalRecallRefs.includes(ref)}};
 });
 const authored=!!d&&['post','comment','reply','message','group-reply'].includes(d.action)&&!!d.text?.trim();
 const claims=authored?d!.text!.split(/(?<=[.!?])\s+/).map(attributed):[];
 let contentAssessment:MemoryContentAssessment='NO_AUTHORED_CONTENT';
 if(authored){
  if(!claims.length||claims.some(value=>!value))contentAssessment='UNASSESSED';
  else {
   const matches=claims.map(value=>rows.find(row=>row.safe.primaryContentIncluded&&row.parsed&&value!.authorId===row.source.authorId&&value!.day===row.authoredDay&&equal(value!,row.parsed)));
   contentAssessment=matches.some(row=>!row)?'UNSUPPORTED_REFERENCE':matches.some(row=>row!.source.relevance==='irrelevant')?'IRRELEVANT_SOURCE_REFERENCE':'SOURCE_GROUNDED_REFERENCE';
  }
 }
 return {version:1 as const,scope:'synthetic-declared-claim-grammar-v1' as const,bindings,sources:rows.map(row=>row.safe),contentAssessment,causalInfluence:'NOT_VERIFIED' as const};
}
