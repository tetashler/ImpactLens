/** Conservative declared-language precision gate. Not a general semantic classifier.
 * Unknown/paraphrased cases remain ambiguous and ordinary discussion stays available. */
export interface GroundedIssueSubject {id:string;label:string;keywords:string[];factRefs:string[];criterion?:{id:string;factId:string;operator:'gte'|'lte'|'eq';threshold:number}}
export interface GroundedIssueEvidence {quote:string;basisRef:string;criterion:string|null}
export type GroundedIssueKind='question'|'condition'|'disagreement'|'commitment'|'progress'|'resolve'|'withdraw';
export const COMMUTE_CONDITION='I can participate only if the modelled commute is shorter than the baseline.';
export interface IssuePrecisionAssessment {assessment:'eligible'|'ambiguous'|'ineligible';reason:string;semanticVerification:'NOT_VERIFIED'}
export function assessIssueEvidence(kind:GroundedIssueKind,text:string,evidence:GroundedIssueEvidence,subject:GroundedIssueSubject):IssuePrecisionAssessment{
 const result=(assessment:IssuePrecisionAssessment['assessment'],reason:string):IssuePrecisionAssessment=>({assessment,reason,semanticVerification:'NOT_VERIFIED'});
 if(typeof text!=='string'||!evidence||typeof evidence.quote!=='string'||evidence.quote.length>240||evidence.quote.trim()!==evidence.quote||!evidence.quote||!text.includes(evidence.quote))return result('ineligible','exact-authored-span-required');
 if(!subject.factRefs.includes(evidence.basisRef)&&!/^item-[1-8]$/.test(evidence.basisRef))return result('ineligible','supplied-basis-required');
 if(evidence.criterion!==null&&evidence.criterion!==subject.criterion?.id)return result('ineligible','unknown-criterion');
 if(evidence.criterion!==null&&!['resolve','progress','withdraw'].includes(kind)&&(kind!=='condition'||evidence.quote!==COMMUTE_CONDITION))return result('ineligible','predicate-not-the-stated-condition');
 const q=evidence.quote,words=q.match(/[\p{L}\p{N}]+/gu)??[],lower=q.toLowerCase();
 if(words.length<8||!subject.keywords.some(k=>new RegExp('\\b'+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(q)))return result('ambiguous','specific-subject-required');
 const temporal=/\b(before|after|until|during|when|where|which|whether|by|at|confirm|published|assigned)\b/i.test(q);
 const patterns:Record<GroundedIssueKind,boolean>={
  question:/^(what|which|when|where|who|how|can|could|will|is|are|does|do)\b/i.test(q)&&q.endsWith('?')&&temporal&&!/\b(things|something|anything|better|right)\b/i.test(q),
  condition:/\b(only if|unless|provided that|cannot .+ until|must .+ before|require .+ before|need .+ before)\b/i.test(q),
  commitment:/^I (will|commit to|agree to|undertake to)\b/i.test(q)&&temporal,
  disagreement:/\bI (disagree|do not agree|cannot support|oppose)\b/i.test(q)&&/\b(because|whereas|contradict)\b/i.test(q),
  progress:/\b(update|pending|still|not yet|await|remaining|follow.up|progress)\b/i.test(q),
  resolve:/\b(my|this|the) (question|condition|issue|commitment)\b.{0,70}\b(answered|met|fulfilled|resolved|satisfied|completed)\b/i.test(q)&&/\bbecause\b/i.test(q)&&!(/\b(not|unconfirmed|pending|cannot|unanswered)\b/.test(lower)),
  withdraw:/\bI (withdraw|retract|no longer pursue|am withdrawing)\b/i.test(q),
 };
 return patterns[kind]?result('eligible','declared-evidence-grammar'):result('ambiguous','ordinary-or-unassessed-language');
}
export function evaluateIssueSatisfaction(criterion:{factId:string;operator:'gte'|'lte'|'eq';threshold:number},facts:readonly {id:string;value:unknown;basis:string}[]):'satisfied'|'not-satisfied'|'unknown'{
 const fact=facts.find(f=>f.id===criterion.factId);
 if(!fact||fact.basis!=='calculated'||typeof fact.value!=='number'||!Number.isFinite(fact.value)||!Number.isFinite(criterion.threshold)||!['gte','lte','eq'].includes(criterion.operator))return 'unknown';
 return (criterion.operator==='gte'?fact.value>=criterion.threshold:criterion.operator==='lte'?fact.value<=criterion.threshold:fact.value===criterion.threshold)?'satisfied':'not-satisfied';
}
