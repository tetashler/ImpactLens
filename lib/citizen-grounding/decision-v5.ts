/** New opt-in wire contract. The frozen v4 decoder remains the final evidence/fact gate. */
import {canonical,object,freezeSnapshot,ensure} from '../experiments/validation.ts';
import type {DecisionContext,SocialDecision} from '../society/decision-contract.ts';
import {DecisionMenuError,menuSchema,encodeMenuContext} from '../society/decision-menu.ts';
import {createSafeSocialDiagnostic,type SafeSocialDiagnostic,type SafeSocialSubreason,type SafeSocialStage,type SafeSocialField} from '../society/social-diagnostics.ts';
import {buildCitizenIssueMenu,type CitizenIssueChoice} from './issue-choices.ts';
import {decodeCitizenDecision} from './decision.ts';
import {assessIssueEvidence,evaluateIssueSatisfaction,COMMUTE_CONDITION,type GroundedIssueSubject,type GroundedIssueKind} from './issues.ts';

const authored=new Set(['post','message','comment','reply','group-reply']);
export const CITIZEN_V5_LIMITS=Object.freeze({evidenceOptions:24,minimumProse:96,outputText:1000,maximumFacts:2});
export const CITIZEN_V5_NUMERIC_TERMS=Object.freeze(['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety','hundred','thousand','million','billion','dozen','half','quarter','twice','minutes','minute','mins','min','seconds','second','secs','sec','hours','hour','hrs','hr','percent']);
const numeric=new RegExp('\\p{N}|\\b('+CITIZEN_V5_NUMERIC_TERMS.join('|')+')\\b','iu');
const personal=/\bI (live|reside|work|am employed|am an?)\b|\bmy (home|workplace|job|employer|occupation|age|shift) (is|starts|ends)\b/i;
const v4=(c:DecisionContext):DecisionContext=>({...c,policy:'conversation-menu-v4'});
type Fact=NonNullable<DecisionContext['grounding']>['facts'][number];
const render=(f:Fact)=>`[${f.basis==='calculated'?'Modelled':'Synthetic'} fact: ${f.label}: ${f.value}${f.unit?' '+f.unit:''}.]`;

/** Keep enough prose space even for an unusually long trusted fact; disclose omissions. */
export function citizenV5TextBudget(c:DecisionContext){
 const available=(c.grounding?.facts??[]).filter(f=>f.value!==null&&render(f).length<=CITIZEN_V5_LIMITS.outputText-CITIZEN_V5_LIMITS.minimumProse-1);
 const lengths=available.map(f=>render(f).length).sort((a,b)=>b-a);
 let maxFacts=Math.min(CITIZEN_V5_LIMITS.maximumFacts,lengths.length);
 if(maxFacts===2&&lengths[0]+lengths[1]+2>CITIZEN_V5_LIMITS.outputText-CITIZEN_V5_LIMITS.minimumProse)maxFacts=1;
 const suffix=lengths.slice(0,maxFacts).reduce((n,v)=>n+v,0)+maxFacts;
 return {available,maxFacts,textMaxLength:CITIZEN_V5_LIMITS.outputText-suffix};
}

interface EvidenceOption {id:string;choice:CitizenIssueChoice;basisRef:string;criterion:string|null;sourceItemId:string|null;memoryIndices:number[]}
/** Opaque deterministic menu keys, not authorization certificates. Current bindings are always rebuilt. */
function key(value:unknown){let a=2166136261,b=2246822519;const input=canonical(value);for(let i=0;i<input.length;i++){const unit=input.charCodeAt(i);a=Math.imul(a^unit,16777619)>>>0;b=Math.imul(b^unit,3266489917)>>>0;}return a.toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0');}
const accessible=(c:DecisionContext,item:DecisionContext['items'][number])=>!item.groupId||!!c.communication?.groups.some(g=>g.id===item.groupId&&g.member);
const memoryIndex=(c:DecisionContext,id:string)=>c.memories.findLastIndex(m=>m.itemIds.includes(id));
function newerAnswer(c:DecisionContext,subject:GroundedIssueSubject,issueId:string|null,index:number){
 const issue=c.issues?.find(i=>i.id===issueId&&i.status==='open'),item=c.items[index];
 return !!issue&&!!item&&item.id!==issue.sourceEventId&&(item.tick??-1)>issue.createdTick&&accessible(c,item)&&memoryIndex(c,item.id)>=0&&!/[?]/.test(item.text)&&!(/\b(not|unconfirmed|pending|cannot|unanswered|unknown|might|may|perhaps)\b/i.test(item.text))&&subject.keywords.some(k=>new RegExp('\\b'+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(item.text));
}
export function buildCitizenEvidenceMenu(c:DecisionContext):readonly EvidenceOption[]{
 if(c.policy!=='conversation-menu-v5'||!c.grounding||c.grounding.citizenId!==c.actor.id||!c.menu?.some(o=>authored.has(o.action)))return [];
 const facts=citizenV5TextBudget(c).available,buckets:Omit<EvidenceOption,'id'>[][]=[];
 for(const choice of buildCitizenIssueMenu(v4(c))){
  const subject=c.grounding.subjects.find(s=>s.id===choice.subjectId);if(!subject||!subject.keywords.some(k=>!numeric.test(k)&&!personal.test(k)))continue;
  const kind=choice.update.kind,issue=c.issues?.find(i=>i.id===choice.update.issueId&&i.status==='open');
  const bases:Omit<EvidenceOption,'id'>[]=[];
  const add=(basisRef:string,criterion:string|null)=>{const i=/^item-([1-8])$/.exec(basisRef),item=i?c.items[Number(i[1])-1]:undefined,mi=item?memoryIndex(c,item.id):-1;if(i&&(!item||!accessible(c,item)||mi<0))return;bases.push({choice,basisRef,criterion,sourceItemId:item?.id??null,memoryIndices:[...new Set([...choice.memoryIndices,...(mi<0?[]:[mi])])]});};
  if(kind==='resolve'){
   if(issue?.grounding?.criterion&&subject.criterion?.id===issue.grounding.criterion&&facts.some(f=>f.id===subject.criterion!.factId)&&evaluateIssueSatisfaction(subject.criterion,facts)==='satisfied')add(subject.criterion.factId,subject.criterion.id);
   else c.items.forEach((_,i)=>{if(newerAnswer(c,subject,choice.update.issueId,i))add('item-'+(i+1),null);});
  }else if(kind==='withdraw'){
   const i=c.items.findIndex(item=>item.id===issue?.sourceEventId&&item.actorId===c.actor.id);if(i>=0)add('item-'+(i+1),null);
  }else {
   for(const ref of subject.factRefs)if(facts.some(f=>f.id===ref))add(ref,null);
   if(kind==='condition'&&subject.criterion&&facts.some(f=>f.id===subject.criterion!.factId))add(subject.criterion.factId,subject.criterion.id);
   if(kind==='progress')c.items.forEach((item,i)=>{if(item.id===issue?.sourceEventId||newerAnswer(c,subject,choice.update.issueId,i))add('item-'+(i+1),issue?.grounding?.criterion??null);});
  }
  if(bases.length)buckets.push(bases);
 }
 const rows:EvidenceOption[]=[],bindings=new Map<string,string>();
 for(let round=0;rows.length<CITIZEN_V5_LIMITS.evidenceOptions;round++){
  let found=false;for(const bucket of buckets){const b=bucket[round];if(!b)continue;found=true;
   const issue=c.issues?.find(i=>i.id===b.choice.update.issueId),source=b.sourceItemId?c.items.find(i=>i.id===b.sourceItemId):null,fact=c.grounding.facts.find(f=>f.id===b.basisRef);
   const binding={policy:'citizen-menu-v2',context:c.id,actor:c.actor.id,update:b.choice.update,subject:b.choice.subjectId,basis:b.basisRef,criterion:b.criterion,issue:issue??null,source:source??null,fact:fact??null},id='evidence-'+key(binding),serialized=canonical(binding);
   ensure(!bindings.has(id)||bindings.get(id)===serialized,'CITIZEN_EVIDENCE_IDENTITY');bindings.set(id,serialized);
   if(!rows.some(r=>r.id===id))rows.push({...b,id});
   if(rows.length===CITIZEN_V5_LIMITS.evidenceOptions)break;
  }if(!found)break;
 }
 ensure(new Set(rows.map(r=>r.id)).size===rows.length,'CITIZEN_EVIDENCE_IDENTITY');return freezeSnapshot(rows);
}

export const CITIZEN_V5_ISSUE_RULES=freezeSnapshot({minimumWords:8,maximumQuoteCharacters:240,subjectKeywordRequired:true,semanticVerification:'NOT_VERIFIED',temporalMarkers:['before','after','until','during','when','where','which','whether','by','at','confirm','published','assigned'],kinds:{
 question:'Start with what/which/when/where/who/how/can/could/will/is/are/does/do; end with ?; include a concrete temporal or confirmation word. Vague things/something/anything/better/right do not qualify.',
 condition:'Explicit only if/unless/provided that, or a concrete need/require/must/cannot condition with before/until. A predicate option requires the exact declared condition.',
 commitment:'Start I will/I commit to/I agree to/I undertake to, with a concrete temporal condition.',
 disagreement:'Explicit I disagree/I do not agree/I cannot support/I oppose, with because/whereas/contradict.',
 progress:'Explicit update/pending/still/not yet/await/remaining/follow-up/progress for the supplied own issue.',
 resolve:'Explicit my/this/the question/condition/issue/commitment answered/met/fulfilled/resolved/satisfied/completed because; no negation or uncertainty. Only a supplied newer answer or satisfied criterion is eligible.',
 withdraw:'Explicit I withdraw/I retract/I no longer pursue/I am withdrawing the supplied own issue.',
}});
export function encodeCitizenV5Context(c:DecisionContext):string{
 const value=JSON.parse(encodeMenuContext({...c,policy:'conversation-menu-v3'})),budget=citizenV5TextBudget(c);
 delete value.issueChoices;value.policy='conversation-menu-v5';value.grounding=c.grounding;
 value.issueOptions=buildCitizenEvidenceMenu(c).map(o=>({id:o.id,kind:o.choice.update.kind,subjectId:o.choice.subjectId,basisRef:o.basisRef,criterionId:o.criterion,criterionCondition:o.criterion?COMMUTE_CONDITION:null,sourceItem:o.sourceItemId===null?null:'item-'+(c.items.findIndex(i=>i.id===o.sourceItemId)+1),requiredMemories:o.memoryIndices.map(i=>'memory-'+(i+1))}));
 value.issueRules={...CITIZEN_V5_ISSUE_RULES,subjects:c.grounding?.subjects.map(s=>({id:s.id,label:s.label,proseKeywords:s.keywords.filter(k=>!numeric.test(k)&&!personal.test(k))}))??[]};
 value.proseRules={textMaxLength:budget.textMaxLength,maxFactReferences:budget.maxFacts,allowedFactIds:budget.available.map(f=>f.id),forbiddenNumericTerms:CITIZEN_V5_NUMERIC_TERMS,unicodeDigitsForbidden:true,personalAssertionsRequireFactReferences:true,forbiddenSelfFactForms:['I live/reside/work/am employed/am a/an','my home/workplace/job/employer/occupation/age/shift is/starts/ends'],note:'Select factIds; exact source values are appended by the application. These conservative text guards also reject ambiguous uses of listed number/time words. Do not copy quantitative source wording into prose.'};
 value.qualityInstructions=['Use conversation-menu-v5 only. Select choiceId, stanceId, factIds and optionally one supplied issueEvidenceId. Never output issueChoiceId, issueEvidence, source IDs or a repeated quote.','For ordinary discussion use issueEvidenceId:null and ordinary discussion tags. For a deliberate tracked issue use its offered issueEvidenceId and discussion:null. The server finds a truly eligible exact span in your own authored text; no eligible span means rejection, not a rewritten message.','Each issue option fixes subject, basis, criterion and required memories. Follow issueRules and use the actual subject keywords. Ordinary questions/preferences may remain untracked; never force an issue or closure.','For non-authored actions text:null, factIds:[], issueEvidenceId:null. Inactivity/reading remain legitimate.','Citizen facts/personality are fictional inputs, not past experiences. Source statements remain claims, not verified facts. Recall is optional; source omission never licenses invention.'];
 return canonical(value);
}
export function citizenV5Schema(c:DecisionContext):Record<string,any>{
 const legacy:any=menuSchema({...c,policy:'conversation-menu-v3'}),budget=citizenV5TextBudget(c),ids=buildCitizenEvidenceMenu(c).map(o=>o.id);
 const {issueChoiceId,...base}=legacy.properties;
 const properties={...base,text:{type:['string','null'],maxLength:budget.textMaxLength},issueEvidenceId:{type:['string','null'],enum:[null,...ids]},factIds:{type:'array',maxItems:budget.maxFacts,uniqueItems:true,items:budget.available.length?{type:'string',enum:budget.available.map(f=>f.id)}:{type:'string'}}};
 const root={type:'object',additionalProperties:false,required:Object.keys(properties),properties};
 const discussion=legacy.properties.discussion.anyOf[0];
 return {...root,anyOf:[true,false].flatMap(content=>{const actions=c.menu?.filter(o=>authored.has(o.action)===content).map(o=>o.id)??[];if(!actions.length)return [];
  const ordinary={...root,properties:{...properties,choiceId:{type:'string',enum:actions},text:content?{type:'string',minLength:1,maxLength:budget.textMaxLength}:{type:'null'},issueEvidenceId:{type:'null'},discussion,...(content?{}:{factIds:{...properties.factIds,maxItems:0}})}};
  return content&&ids.length?[ordinary,{...ordinary,properties:{...ordinary.properties,issueEvidenceId:{type:'string',enum:ids},discussion:{type:'null'}}}]:[ordinary];})};
}
export class CitizenV5Error extends Error {readonly diagnostic:SafeSocialDiagnostic;readonly rule:DecisionMenuError['rule'];readonly path:string;
 constructor(family:DecisionMenuError['rule'],subreason:SafeSocialSubreason,stage:SafeSocialStage,field:SafeSocialField,c:DecisionContext,value?:Record<string,unknown>,evidence?:EvidenceOption){
  super(family);this.rule=family;this.path=field==='decision'?'decision':'decision.'+field;const option=c.menu?.find(o=>o.id===value?.choiceId);
  this.diagnostic=createSafeSocialDiagnostic({family,subreason,stage,field,offeredOption:{actionOffered:!!option,evidenceOffered:!!evidence,action:option?.action??null,issueKind:evidence?.choice.update.kind??null}});
 }
}
function span(text:string,kind:GroundedIssueKind,basisRef:string,criterion:string|null,subject:GroundedIssueSubject){
 const candidates=[text.trim(),...(text.match(/[^.!?\n]+[.!?]?/gu)??[]).map(v=>v.trim())];
 return [...new Set(candidates)].find(quote=>quote.length<=240&&assessIssueEvidence(kind,text,{quote,basisRef,criterion},subject).assessment==='eligible');
}
export function decodeCitizenV5(value:unknown,c:DecisionContext):SocialDecision{
 let v:Record<string,unknown>;try{v=object(value,['choiceId','text','motivation','recallIds','stanceId','discussion','issueEvidenceId','factIds']);}catch{throw new CitizenV5Error('SOCIAL_SHAPE','invalid-wire-shape','schema','decision',c);}
 const reject=(family:DecisionMenuError['rule'],reason:SafeSocialSubreason,stage:SafeSocialStage,field:SafeSocialField,evidence?:EvidenceOption):never=>{throw new CitizenV5Error(family,reason,stage,field,c,v,evidence);};
 if(!c.grounding||c.grounding.citizenId!==c.actor.id)reject('SOCIAL_TARGET','source-permission-unavailable','permission','decision');
 const action=c.menu?.find(o=>o.id===v.choiceId);if(!action)reject('SOCIAL_TARGET','unoffered-action','menu','choiceId');
 const budget=citizenV5TextBudget(c);
 if(!Array.isArray(v.factIds)||v.factIds.length>budget.maxFacts)reject('SOCIAL_TARGET','invalid-fact-array','schema','factIds');
 const factIds=v.factIds as unknown[];if(new Set(factIds).size!==factIds.length)reject('SOCIAL_TARGET','duplicate-fact-reference','menu','factIds');
 for(const ref of factIds)if(!budget.available.some(f=>f.id===ref))reject('SOCIAL_TARGET',c.grounding!.facts.some(f=>f.id===ref)?'fact-unavailable':'fact-not-offered','factual','factIds');
 const raw=v.text;if(typeof raw==='string'){if(numeric.test(raw))reject('SOCIAL_TEXT','unsupported-number-or-unit','factual','text');if(personal.test(raw))reject('SOCIAL_TEXT','unsupported-personal-assertion','factual','text');if(raw.length>budget.textMaxLength)reject('SOCIAL_TEXT','rendered-text-limit','factual','text');}
 const evidence=v.issueEvidenceId===null?undefined:buildCitizenEvidenceMenu(c).find(o=>o.id===v.issueEvidenceId);
 if(v.issueEvidenceId!==null&&!evidence)reject('SOCIAL_TARGET','unoffered-issue-evidence','menu','issueEvidenceId');
 if(!authored.has(action!.action)&&(evidence||factIds.length))reject('SOCIAL_TARGET','evidence-action-mismatch','menu','issueEvidenceId',evidence);
 if(evidence&&v.discussion!==null)reject('SOCIAL_SHAPE','ordinary-evidence-conflict','schema','discussion',evidence);
 let quote:string|undefined;
 if(evidence){const subject=c.grounding!.subjects.find(s=>s.id===evidence.choice.subjectId);if(!subject)reject('SOCIAL_TARGET','issue-state-stale','evidence','issueEvidenceId',evidence);quote=typeof raw==='string'?span(raw,evidence.choice.update.kind,evidence.basisRef,evidence.criterion,subject!):undefined;if(!quote)reject('SOCIAL_TEXT','subject-language-unassessed','evidence','issueEvidenceId',evidence);}
 try{
  const result=decodeCitizenDecision({choiceId:v.choiceId,text:raw,motivation:v.motivation,recallIds:v.recallIds,stanceId:v.stanceId,discussion:v.discussion,factIds,issueChoiceId:evidence?.choice.id??null,issueEvidence:evidence?{quote:quote!,basisRef:evidence.basisRef,criterion:evidence.criterion}:null},v4(c));
  return {...result,selection:{...result.selection!,issueEvidenceId:v.issueEvidenceId as string|null}};
 }catch(error){if(error instanceof DecisionMenuError){const field:SafeSocialField=error.path.endsWith('recallIds')?'memoryIds':error.path.endsWith('stanceId')?'stanceId':error.path.endsWith('discussion')?'discussion':'selection';reject(error.rule,error.rule==='SOCIAL_MEMORY'?'required-memory-unavailable':'selection-inconsistent','decision',field,evidence);}throw error;}
}
