import {object,canonical} from '../experiments/validation.ts';
import type {DecisionContext,SocialDecision} from '../society/decision-contract.ts';
import {decodeMenuDecision,DecisionMenuError} from '../society/decision-menu.ts';
import {citizenV5Schema,encodeCitizenV5Context} from './decision-v5.ts';
import {assessCitizenProse,PROSE_RULES} from './prose.ts';
import {buildCitizenDeclarations,citizenV7TextBudget,DECLARATION_POLICY,DECLARATION_PREFIX,renderIssueDeclaration} from './issue-declarations.ts';
import {parseSafeSocialDiagnosticV2,type SafeSocialDiagnosticV2,type ProseSubreason} from '../society/social-diagnostics-v2.ts';
const authored=new Set(['post','message','comment','reply','group-reply']);
export function citizenV7Schema(c:DecisionContext){
 const s=citizenV5Schema({...c,policy:'conversation-menu-v5'}),budget=citizenV7TextBudget(c),ids=buildCitizenDeclarations(c).map(o=>o.id);
 const visit=(v:any,key=''):any=>{if(Array.isArray(v))return v.map(x=>visit(x));if(!v||typeof v!=='object')return v;
  if(key==='issueEvidenceId')return v.type==='null'?v:{...v,enum:v.type==='string'?ids:[null,...ids]};
  if(key==='text'&&v.type!=='null')return {...v,maxLength:budget.textMaxLength};
  if(key==='factIds')return {...v,maxItems:Math.min(v.maxItems,budget.maxFacts),items:budget.available.length?{type:'string',enum:budget.available.map(f=>f.id)}:{type:'string'}};
  return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x,k)]));};
 const result=visit(s);if(!ids.length)result.anyOf=result.anyOf.filter((branch:any)=>branch.properties.issueEvidenceId.type!=='string');return result;
}
export function encodeCitizenV7Context(c:DecisionContext){
 const e=JSON.parse(encodeCitizenV5Context({...c,policy:'conversation-menu-v5'})),b=citizenV7TextBudget(c);e.policy='conversation-menu-v7';
 e.issueOptions=buildCitizenDeclarations(c).map(o=>({id:o.id,kind:o.choice.update.kind,subjectId:o.choice.subjectId,basisRef:o.basisRef,criterionId:o.criterion,sourceItem:o.sourceItemId===null?null:'item-'+(c.items.findIndex(i=>i.id===o.sourceItemId)+1),requiredMemories:o.memoryIndices.map(i=>'memory-'+(i+1)),statement:o.statement,statementOrigin:o.declaration.origin}));
 e.issueRules={policy:DECLARATION_POLICY,optional:true,authoredProseIsEvidence:false,meaning:'Selecting an offered issueEvidenceId deliberately adopts its exact displayed statement as your formal action. The application labels and renders it separately. Your own dialogue stays unchanged and is not treated as that statement or evidence for it.',closure:'Only eligible own issues and supplied sources may be selected. Owner-reported closure is not verified satisfaction. Calculated conditions require actual satisfied criteria.',semanticUnderstanding:'NOT_VERIFIED'};
 e.proseRules={...PROSE_RULES,textMaxLength:b.textMaxLength,maxFactReferences:b.maxFacts,allowedFactIds:b.available.map(f=>f.id)};e.proseReferences=c.proseReferences??null;
 e.qualityInstructions=['Use conversation-menu-v7. Select only offered choiceId, stanceId, factIds and optional issueEvidenceId.','Write your own qualitative discussion. Do not copy declaration statements or rendering markers into text. Quantities and personal assignments must use factIds; only the server renders them.','Ordinary conversation, questions and preferences may remain untracked: issueEvidenceId:null. A formal issue is a deliberate selection of the complete displayed statement, not a classification of your prose. Select only a statement you intend to adopt; use discussion:null for that selection.','Never force an issue, closure or recall. Inactivity and reading remain valid; non-authored actions require text:null, factIds:[], issueEvidenceId:null.','Sources remain claims. Declarations are model-selected application wording, not model-written evidence, independent verification or proof of problem solving. Source, memory and private membership permissions remain binding.'];
 return canonical(e);
}
export class CitizenV7Error extends Error {
 readonly diagnostic:SafeSocialDiagnosticV2;readonly path:string;readonly rule:DecisionMenuError['rule'];
 constructor(rule:DecisionMenuError['rule'],reason:ProseSubreason,stage:SafeSocialDiagnosticV2['stage'],field:SafeSocialDiagnosticV2['field'],c:DecisionContext,v:Record<string,unknown>={},e?:ReturnType<typeof buildCitizenDeclarations>[number]){
  super(rule);this.rule=rule;this.path=field==='decision'?'decision':'decision.'+field;const action=c.menu?.find(o=>o.id===v.choiceId);
  this.diagnostic=parseSafeSocialDiagnosticV2({version:2,family:rule,subreason:reason,stage,field,offeredOption:{actionOffered:!!action,evidenceOffered:!!e,action:action?.action??null,issueKind:e?.choice.update.kind??null}});
 }
}
export function decodeCitizenV7(value:unknown,c:DecisionContext):SocialDecision{
 let v:Record<string,unknown>;try{v=object(value,['choiceId','text','motivation','recallIds','stanceId','discussion','issueEvidenceId','factIds']);}catch{throw new CitizenV7Error('SOCIAL_SHAPE','invalid-wire-shape','schema','decision',c);}
 const reject=(rule:DecisionMenuError['rule'],reason:ProseSubreason,stage:SafeSocialDiagnosticV2['stage'],field:SafeSocialDiagnosticV2['field'],e?:ReturnType<typeof buildCitizenDeclarations>[number]):never=>{throw new CitizenV7Error(rule,reason,stage,field,c,v,e);};
 if(c.policy!=='conversation-menu-v7'||!c.grounding||c.grounding.citizenId!==c.actor.id)reject('SOCIAL_TARGET','source-permission-unavailable','permission','decision');
 const budget=citizenV7TextBudget(c),action=c.menu?.find(o=>o.id===v.choiceId);if(!action)reject('SOCIAL_TARGET','unoffered-action','menu','choiceId');
 if(!Array.isArray(v.factIds)||v.factIds.length>budget.maxFacts)reject('SOCIAL_SHAPE','invalid-fact-array','schema','factIds');
 const factIds=v.factIds as string[];if(new Set(factIds).size!==factIds.length)reject('SOCIAL_TARGET','duplicate-fact-reference','menu','factIds');
 for(const id of factIds)if(!budget.available.some(f=>f.id===id))reject('SOCIAL_TARGET','fact-not-offered','factual','factIds');
 const raw=v.text;if(typeof raw==='string'){if(raw.toLowerCase().includes(DECLARATION_PREFIX.toLowerCase()))reject('SOCIAL_TEXT','selection-inconsistent','decision','text');const reason=assessCitizenProse(raw,c);if(reason)reject('SOCIAL_TEXT',reason,'factual','text');if(raw.length>budget.textMaxLength)reject('SOCIAL_TEXT','rendered-text-limit','factual','text');}
 const e=v.issueEvidenceId===null?undefined:buildCitizenDeclarations(c).find(o=>o.id===v.issueEvidenceId);
 if(v.issueEvidenceId!==null&&!e)reject('SOCIAL_TARGET','unoffered-issue-evidence','menu','issueEvidenceId');
 if(!authored.has(action!.action)&&(e||factIds.length))reject('SOCIAL_TARGET','evidence-action-mismatch','menu','issueEvidenceId',e);
 if(e&&v.discussion!==null)reject('SOCIAL_SHAPE','ordinary-evidence-conflict','schema','discussion',e);
 const base=decodeMenuDecision({choiceId:v.choiceId,text:raw,motivation:v.motivation,recallIds:v.recallIds,stanceId:v.stanceId,discussion:e?{topicIds:[],argument:'unspecified'}:v.discussion,issueChoiceId:null},{...c,policy:'conversation-menu-v3'});
 let issueUpdate:SocialDecision['issueUpdate']=null;const extra:string[]=[];
 if(e){
  const kind=e.choice.update.kind;
  const statusEvidence=kind==='progress'?'updated':kind==='withdraw'?'owner-withdrawal':kind==='resolve'?(e.criterion?'deterministically-evidenced-satisfaction':'owner-reported-resolution'):'open';
  issueUpdate={...e.choice.update,grounding:{subjectId:e.choice.subjectId,basisRef:e.basisRef,quote:e.statement,criterion:e.criterion,statusEvidence,updates:[],declaration:e.declaration}};
  extra.push(...e.memoryIndices.map(i=>c.memories[i].eventId));
 }
 const factSuffix=factIds.map(id=>{const f=budget.available.find(f=>f.id===id)!;return `[${f.basis==='calculated'?'Modelled':'Synthetic'} fact: ${f.label}: ${f.value}${f.unit?' '+f.unit:''}.]`;});
 const suffix=[...(e?[renderIssueDeclaration(e.statement)]:[]),...factSuffix].join(' '),text=base.text===null?null:base.text+(suffix?' '+suffix:'');
 if(text!==null&&text.length>1000)reject('SOCIAL_TEXT','rendered-text-limit','factual','text',e);
 const memoryIds=[...new Set([...base.memoryIds,...extra])];if(memoryIds.length>6)reject('SOCIAL_MEMORY','required-memory-unavailable','permission','memoryIds',e);
 return {...base,text,memoryIds,discussion:e?e.choice.discussion:base.discussion,issueUpdate,selection:{...base.selection!,issueChoiceId:e?.choice.id??null,issueEvidence:e?{quote:e.statement,basisRef:e.basisRef,criterion:e.criterion}:null,factIds,authoredText:raw as string|null,issueEvidenceId:v.issueEvidenceId as string|null,issueDeclaration:e?.declaration??null}};
}
