import {object,canonical} from '../experiments/validation.ts';
import type {DecisionContext,SocialDecision} from '../society/decision-contract.ts';
import {DecisionMenuError,menuSchema,encodeMenuContext,decodeMenuDecision} from '../society/decision-menu.ts';
import {buildCitizenIssueMenu} from './issue-choices.ts';
import {assessIssueEvidence,evaluateIssueSatisfaction,COMMUTE_CONDITION,type GroundedIssueEvidence} from './issues.ts';
const authored=new Set(['post','message','comment','reply','group-reply']);
const fail=(rule:DecisionMenuError['rule'],path:string):never=>{throw new DecisionMenuError(rule,path);};
export function citizenDecisionSchema(c:DecisionContext):Record<string,unknown>{
 const legacy=menuSchema({...c,policy:'conversation-menu-v3'}) as any,ids=buildCitizenIssueMenu(c).map(i=>i.id),factIds=c.grounding?.facts.filter(f=>f.value!==null).map(f=>f.id)??[];
 const evidence={anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['quote','basisRef','criterion'],properties:{quote:{type:'string',minLength:1,maxLength:240},basisRef:{type:'string',enum:[...new Set([...(c.grounding?.facts.map(f=>f.id)??[]),...c.items.map((_,i)=>'item-'+(i+1))])]},criterion:{type:['string','null'],enum:[null,...c.grounding?.subjects.flatMap(s=>s.criterion?[s.criterion.id]:[])??[]]}}}]};
 const p={...legacy.properties,issueChoiceId:{type:['string','null'],enum:[null,...ids]},factIds:{type:'array',maxItems:2,uniqueItems:true,items:factIds.length?{type:'string',enum:factIds}:{type:'string'}},issueEvidence:evidence};
 const base={type:'object',additionalProperties:false,required:Object.keys(p),properties:p};
 return {...base,anyOf:[true,false].flatMap(content=>{
  const actions=c.menu?.filter(o=>authored.has(o.action)===content).map(o=>o.id)??[];if(!actions.length)return [];
  const ordinary={...base,properties:{...p,choiceId:{type:'string',enum:actions},text:content?{type:'string',minLength:1,maxLength:1000}:{type:'null'},discussion:legacy.properties.discussion.anyOf[0],issueChoiceId:{type:'null'},issueEvidence:{type:'null'},...(content?{}:{factIds:{...p.factIds,maxItems:0}})}};
  return content&&ids.length?[ordinary,{...ordinary,properties:{...ordinary.properties,discussion:{type:'null'},issueChoiceId:{type:'string',enum:ids},issueEvidence:evidence.anyOf[1]}}]:[ordinary];
 })};
}
export function encodeCitizenDecisionContext(c:DecisionContext):string{
 const value=JSON.parse(encodeMenuContext({...c,policy:'conversation-menu-v3'}));
 value.policy=c.policy;value.grounding=c.grounding;value.issueChoices=buildCitizenIssueMenu(c).map(i=>({id:i.id,kind:i.update.kind,subjectId:i.subjectId,topicId:i.update.topicId,basisRefs:i.basisRefs,criterionId:i.criterionId,criterionCondition:i.criterionId?COMMUTE_CONDITION:null,sourceItem:i.sourceItemId===null?null:'item-'+(c.items.findIndex(x=>x.id===i.sourceItemId)+1),requiredMemories:i.memoryIndices.map(n=>'memory-'+(n+1))}));
 value.qualityInstructions=['Citizen facts and calculated commute values are immutable fictional inputs; scenario role labels do not replace them. Only your own profile is supplied. Personality is fictional style, never factual evidence.','Use factIds for quantitative or personal identity assertions. The application renders exact supplied values; do not write numbers, time units or replacement home/job facts in text.','Ordinary discussion uses issueChoiceId:null and issueEvidence:null. Track only a specific supplied subject with an exact authored quote and valid basisRef. Rhetorical questions, preferences, aspirations and generic agreement are not tracked problems.','Existing issues have progress choices; do not create duplicates. Resolve requires explicit owned-source evidence and a newer supplied answer, or a listed deterministic criterion. Withdrawal must explicitly retract your own issue. These guards do not verify real-world resolution.','Only actual recorded encounters are memories. Stable occupation and commute facts are not past travel experiences. Unassessed natural language is not evidence of substantive recall.'];
 return canonical(value);
}
export function decodeCitizenDecision(value:unknown,c:DecisionContext):SocialDecision{
 let v:Record<string,unknown>;try{v=object(value,['choiceId','text','motivation','recallIds','stanceId','discussion','issueChoiceId','issueEvidence','factIds']);}catch{return fail('SOCIAL_SHAPE','decision');}
 const facts=c.grounding?.facts??[];
 if(!Array.isArray(v.factIds)||v.factIds.length>2||new Set(v.factIds).size!==v.factIds.length||!v.factIds.every(id=>facts.some(f=>f.id===id&&f.value!==null)))return fail('SOCIAL_TARGET','decision.factIds');
 const raw=v.text;
 if(typeof raw==='string'&&(/\p{N}|\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|dozen|half|quarter|twice|minutes?|mins?|seconds?|secs?|hours?|hrs?|percent)\b/iu.test(raw)||/\bI (live|reside|work|am employed|am an?)\b|\bmy (home|workplace|job|employer|occupation|age|shift) (is|starts|ends)\b/i.test(raw)))return fail('SOCIAL_TEXT','decision.factualClaims');
 const base=decodeMenuDecision({choiceId:v.choiceId,text:raw,motivation:v.motivation,recallIds:v.recallIds,stanceId:v.stanceId,discussion:v.issueChoiceId===null?v.discussion:{topicIds:[],argument:'unspecified'},issueChoiceId:null},{...c,policy:'conversation-menu-v3'});
 if(!authored.has(base.action)&&(v.factIds.length||v.issueChoiceId!==null||v.issueEvidence!==null))return fail('SOCIAL_TARGET','decision.issueChoiceId');
 let issueUpdate:SocialDecision['issueUpdate']=null,discussion=base.discussion,extraMemories:string[]=[];
 if(v.issueChoiceId!==null){
  const selected=buildCitizenIssueMenu(c).find(i=>i.id===v.issueChoiceId),subject=c.grounding?.subjects.find(s=>s.id===selected?.subjectId);
  if(!selected||!subject||!authored.has(base.action))return fail('SOCIAL_TARGET','decision.issueChoiceId');
  if(v.discussion!==null)return fail('SOCIAL_SHAPE','decision.discussion');
  let evidence:GroundedIssueEvidence;try{const e=object(v.issueEvidence,['quote','basisRef','criterion']);if(typeof e.quote!=='string'||typeof e.basisRef!=='string'||e.criterion!==null&&typeof e.criterion!=='string')throw Error();evidence=e as unknown as GroundedIssueEvidence;}catch{return fail('SOCIAL_SHAPE','decision.issueEvidence');}
  if(!selected.basisRefs.includes(evidence.basisRef)||typeof raw!=='string'||assessIssueEvidence(selected.update.kind,raw,evidence,subject).assessment!=='eligible')return fail('SOCIAL_TEXT','decision.issueEvidence');
  const basisIndex=/^item-([1-8])$/.exec(evidence.basisRef),basis=basisIndex?c.items[Number(basisIndex[1])-1]:undefined;
  if(basisIndex&&!basis)return fail('SOCIAL_MEMORY','decision.issueEvidence');
  if(basis){const mi=c.memories.findLastIndex(m=>m.itemIds.includes(basis.id));if(mi<0)return fail('SOCIAL_MEMORY','decision.issueEvidence');extraMemories.push(c.memories[mi].eventId);}
  const existing=c.issues?.find(i=>i.id===selected.update.issueId);
  let statusEvidence:'open'|'updated'|'owner-reported-resolution'|'deterministically-evidenced-satisfaction'|'owner-withdrawal'=selected.update.kind==='progress'?'updated':selected.update.kind==='withdraw'?'owner-withdrawal':'open';
  if(selected.update.kind==='resolve'){
   if(evidence.criterion!==null&&existing?.grounding?.criterion===evidence.criterion&&subject.criterion?.id===evidence.criterion&&evaluateIssueSatisfaction(subject.criterion,facts)==='satisfied')statusEvidence='deterministically-evidenced-satisfaction';
   else {
    if(!existing||!basis||basis.id===existing.sourceEventId||(basis.tick??-1)<=existing.createdTick||/\b(not|unconfirmed|pending|cannot|unanswered)\b/i.test(basis.text)||subject.keywords.filter(k=>new RegExp('\\b'+k+'\\b','i').test(basis.text)).length===0)return fail('SOCIAL_MEMORY','decision.issueEvidence');
    statusEvidence='owner-reported-resolution';
   }
  }
  issueUpdate={...selected.update,grounding:{subjectId:subject.id,basisRef:evidence.basisRef,quote:evidence.quote,criterion:evidence.criterion,statusEvidence,updates:[]}};
  discussion=selected.discussion;extraMemories.push(...selected.memoryIndices.map(i=>c.memories[i].eventId));
 }else if(v.issueEvidence!==null)return fail('SOCIAL_SHAPE','decision.issueEvidence');
 const suffix=(v.factIds as string[]).map(id=>{const f=facts.find(f=>f.id===id)!;return `[${f.basis==='calculated'?'Modelled':'Synthetic'} fact: ${f.label}: ${f.value}${f.unit?' '+f.unit:''}.]`;}).join(' ');
 const text=base.text===null?null:base.text+(suffix?' '+suffix:'');if(text!==null&&text.length>1000)return fail('SOCIAL_TEXT','decision.text');
 const memoryIds=[...new Set([...base.memoryIds,...extraMemories])];if(memoryIds.length>6)return fail('SOCIAL_MEMORY','decision.issueEvidence');
 return {...base,text,discussion,issueUpdate,memoryIds,selection:{...base.selection!,issueChoiceId:v.issueChoiceId as string|null,issueEvidence:v.issueEvidence as GroundedIssueEvidence|null,factIds:v.factIds as string[],authoredText:raw as string|null}};
}
