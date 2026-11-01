import {object,canonical,freezeSnapshot} from '../experiments/validation.ts';
import type {DecisionContext,SocialDecision} from '../society/decision-contract.ts';
import {decodeMenuDecision,DecisionMenuError} from '../society/decision-menu.ts';
import {buildCitizenEvidenceMenu,citizenV5TextBudget,citizenV5Schema,encodeCitizenV5Context} from './decision-v5.ts';
import {evaluateIssueSatisfaction} from './issues.ts';
import {findIssueProse} from './issue-prose.ts';
import {assessCitizenProse,PROSE_RULES} from './prose.ts';
import {parseSafeSocialDiagnosticV2,type SafeSocialDiagnosticV2,type ProseSubreason} from '../society/social-diagnostics-v2.ts';
const authored=new Set(['post','message','comment','reply','group-reply']),v5=(c:DecisionContext):DecisionContext=>({...c,policy:'conversation-menu-v5'});
export const buildCitizenV6EvidenceMenu=(c:DecisionContext)=>buildCitizenEvidenceMenu(v5(c)).map(o=>({...o,id:o.id.replace(/^evidence-/,'evidence-v6-')}));
export function citizenV6Schema(c:DecisionContext){const s=citizenV5Schema(v5(c));const visit=(v:any):any=>typeof v==='string'?v.replace(/^evidence-/,'evidence-v6-'):Array.isArray(v)?v.map(visit):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x)])):v;return visit(s);}
export function encodeCitizenV6Context(c:DecisionContext){
 const e=JSON.parse(encodeCitizenV5Context(v5(c)));e.policy='conversation-menu-v6';
 e.issueOptions=e.issueOptions.map((o:any)=>({...o,id:o.id.replace(/^evidence-/,'evidence-v6-')}));
 e.proseRules={...PROSE_RULES,textMaxLength:citizenV5TextBudget(c).textMaxLength,maxFactReferences:citizenV5TextBudget(c).maxFacts,allowedFactIds:citizenV5TextBudget(c).available.map(f=>f.id)};
 e.issueRules={maximumQuoteCharacters:240,minimumWords:4,subjectRequired:true,semanticVerification:'NOT_VERIFIED',question:'A relevant practical question or request to clarify; no required opening or temporal word.',condition:'Explicit dependency or participation condition, not a preference. Predicate options require their exact declared condition.',disagreement:'Explicit disagreement with a reason, including not convinced or do not agree.',progress:'Report progress on the supplied own issue.',closure:'Resolution/withdrawal retains the original strict owned-source rules. A self-report is not verified real-world satisfaction.'};
 e.proseReferences=c.proseReferences??null;
 e.qualityInstructions=['Use conversation-menu-v6. Select only offered choiceId, stanceId, factIds and optional issueEvidenceId.','Qualitative hours, shifts, travelling and transfers are legal. Raw quantities and replacement personal attributes are not; select factIds and the server appends exact values.','Track only a specific supplied concern. Use discussion:null with an issue selection; ordinary discussion has issueEvidenceId:null. An actual relevant authored span is required, never invented or silently downgraded.','Use natural practical questions, explicit dependencies or reasoned disagreement. Resolution remains strictly owned and source-supported.','Sources remain claims; quoted attribution requires exact accessible supplied wording. Personality and hypothetical concerns are not factual evidence. Inactivity/reading and non-use of recall remain valid.'];
 return canonical(e);
}
export class CitizenV6Error extends Error {
 readonly diagnostic:SafeSocialDiagnosticV2;readonly path:string;readonly rule:DecisionMenuError['rule'];
 constructor(rule:DecisionMenuError['rule'],reason:ProseSubreason,stage:SafeSocialDiagnosticV2['stage'],field:SafeSocialDiagnosticV2['field'],c:DecisionContext,v:any={},e?:ReturnType<typeof buildCitizenV6EvidenceMenu>[number]){
  super(rule);this.rule=rule;this.path=field==='decision'?'decision':'decision.'+field;const action=c.menu?.find(o=>o.id===v.choiceId);
  this.diagnostic=parseSafeSocialDiagnosticV2({version:2,family:rule,subreason:reason,stage,field,offeredOption:{actionOffered:!!action,evidenceOffered:!!e,action:action?.action??null,issueKind:e?.choice.update.kind??null}});
 }
}
export function decodeCitizenV6(value:unknown,c:DecisionContext):SocialDecision{
 let v:Record<string,unknown>;try{v=object(value,['choiceId','text','motivation','recallIds','stanceId','discussion','issueEvidenceId','factIds']);}catch{throw new CitizenV6Error('SOCIAL_SHAPE','invalid-wire-shape','schema','decision',c);}
 const reject=(rule:DecisionMenuError['rule'],reason:ProseSubreason,stage:SafeSocialDiagnosticV2['stage'],field:SafeSocialDiagnosticV2['field'],e?:ReturnType<typeof buildCitizenV6EvidenceMenu>[number]):never=>{throw new CitizenV6Error(rule,reason,stage,field,c,v,e);};
 if(c.policy!=='conversation-menu-v6'||!c.grounding||c.grounding.citizenId!==c.actor.id)reject('SOCIAL_TARGET','source-permission-unavailable','permission','decision');
 const budget=citizenV5TextBudget(c),action=c.menu?.find(o=>o.id===v.choiceId);if(!action)reject('SOCIAL_TARGET','unoffered-action','menu','choiceId');
 if(!Array.isArray(v.factIds)||v.factIds.length>budget.maxFacts)reject('SOCIAL_SHAPE','invalid-fact-array','schema','factIds');
 const factIds=v.factIds as string[];if(new Set(factIds).size!==factIds.length)reject('SOCIAL_TARGET','duplicate-fact-reference','menu','factIds');
 for(const id of factIds)if(!budget.available.some(f=>f.id===id))reject('SOCIAL_TARGET','fact-not-offered','factual','factIds');
 const raw=v.text;if(typeof raw==='string'){const r=assessCitizenProse(raw,c);if(r)reject('SOCIAL_TEXT',r,'factual','text');if(raw.length>budget.textMaxLength)reject('SOCIAL_TEXT','rendered-text-limit','factual','text');}
 const evidence=v.issueEvidenceId===null?undefined:buildCitizenV6EvidenceMenu(c).find(o=>o.id===v.issueEvidenceId);
 if(v.issueEvidenceId!==null&&!evidence)reject('SOCIAL_TARGET','unoffered-issue-evidence','menu','issueEvidenceId');
 if(!authored.has(action!.action)&&(evidence||factIds.length))reject('SOCIAL_TARGET','evidence-action-mismatch','menu','issueEvidenceId',evidence);
 if(evidence&&v.discussion!==null)reject('SOCIAL_SHAPE','ordinary-evidence-conflict','schema','discussion',evidence);
 const base=decodeMenuDecision({choiceId:v.choiceId,text:raw,motivation:v.motivation,recallIds:v.recallIds,stanceId:v.stanceId,discussion:evidence?{topicIds:[],argument:'unspecified'}:v.discussion,issueChoiceId:null},{...c,policy:'conversation-menu-v3'});
 let issueUpdate:SocialDecision['issueUpdate']=null,discussion=base.discussion,quote:string|undefined;const extra:string[]=[];
 if(evidence){
  if(typeof raw!=='string')reject('SOCIAL_SHAPE','authored-span-missing','evidence','text',evidence);
  const subject=c.grounding!.subjects.find(s=>s.id===evidence.choice.subjectId);if(!subject)reject('SOCIAL_TARGET','issue-state-stale','evidence','issueEvidenceId',evidence);
  const span=findIssueProse(raw as string,evidence.choice.update.kind,evidence.basisRef,evidence.criterion,subject!);if(!span.quote)reject('SOCIAL_TEXT',span.reason!,'evidence','issueEvidenceId',evidence);quote=span.quote;
  const existing=c.issues?.find(i=>i.id===evidence.choice.update.issueId),kind=evidence.choice.update.kind;
  let statusEvidence:'open'|'updated'|'owner-reported-resolution'|'deterministically-evidenced-satisfaction'|'owner-withdrawal'=kind==='progress'?'updated':kind==='withdraw'?'owner-withdrawal':'open';
  if(kind==='resolve'){
   if(evidence.criterion!==null&&existing?.grounding?.criterion===evidence.criterion&&subject!.criterion?.id===evidence.criterion&&evaluateIssueSatisfaction(subject!.criterion,c.grounding!.facts)==='satisfied')statusEvidence='deterministically-evidenced-satisfaction';
   else {const source=c.items.find(i=>i.id===evidence.sourceItemId);if(!existing||!source||source.id===existing.sourceEventId||(source.tick??-1)<=existing.createdTick)reject('SOCIAL_MEMORY','source-permission-unavailable','permission','issueEvidenceId',evidence);statusEvidence='owner-reported-resolution';}
  }
  extra.push(...evidence.memoryIndices.map(i=>c.memories[i].eventId));
  issueUpdate={...evidence.choice.update,grounding:{subjectId:subject!.id,basisRef:evidence.basisRef,quote:quote!,criterion:evidence.criterion,statusEvidence,updates:[]}};discussion=evidence.choice.discussion;
 }
 const suffix=factIds.map(id=>{const f=budget.available.find(f=>f.id===id)!;return `[${f.basis==='calculated'?'Modelled':'Synthetic'} fact: ${f.label}: ${f.value}${f.unit?' '+f.unit:''}.]`;}).join(' '),text=base.text===null?null:base.text+(suffix?' '+suffix:'');
 if(text!==null&&text.length>1000)reject('SOCIAL_TEXT','rendered-text-limit','factual','text',evidence);
 const memoryIds=[...new Set([...base.memoryIds,...extra])];if(memoryIds.length>6)reject('SOCIAL_MEMORY','required-memory-unavailable','permission','memoryIds',evidence);
 return {...base,text,memoryIds,discussion,issueUpdate,selection:{...base.selection!,issueChoiceId:evidence?.choice.id??null,issueEvidence:evidence?{quote:quote!,basisRef:evidence.basisRef,criterion:evidence.criterion}:null,factIds,authoredText:raw as string|null,issueEvidenceId:v.issueEvidenceId as string|null}};
}
