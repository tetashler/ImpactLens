/** New declared-language subset. No claim of unrestricted semantic understanding. */
import {assessIssueEvidence,type GroundedIssueSubject,type GroundedIssueKind,type GroundedIssueEvidence,COMMUTE_CONDITION} from './issues.ts';
import type {ProseSubreason} from '../society/social-diagnostics-v2.ts';
const aliases:Record<string,string[]>={commute:['train','transport','station','connection','transfer','travel','journey','rail'],schedule:['roster','shift','availability','hours','timetable'],workplace:['workplace','station','access','walk']};
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function relevantIssueSubject(q:string,s:GroundedIssueSubject){return [...s.keywords,...(aliases[s.id]??[])].some(k=>new RegExp('\\b'+escape(k)+'(?:s|es|ing)?\\b','iu').test(q));}
export function assessIssueProse(kind:GroundedIssueKind,raw:string,e:GroundedIssueEvidence,s:GroundedIssueSubject):ProseSubreason|null{
 const q=e.quote;
 if(!q||q.trim()!==q||q.length>240||!raw.includes(q))return 'authored-span-missing';
 if((q.match(/[\p{L}\p{N}]+/gu)?.length??0)<4)return 'evidence-content-too-short';
 if(!relevantIssueSubject(q,s))return 'evidence-subject-missing';
 if(!s.factRefs.includes(e.basisRef)&&!/^item-[1-8]$/.test(e.basisRef))return 'evidence-criterion-mismatch';
 if(e.criterion!==null&&(e.criterion!==s.criterion?.id||!['resolve','progress','withdraw'].includes(kind)&&(kind!=='condition'||q!==COMMUTE_CONDITION)))return 'evidence-criterion-mismatch';
 if(kind==='resolve'||kind==='withdraw'){
  if(/\b(not|never|cannot|unanswered|unresolved|unmet|unclear|unknown|pending|unconfirmed|uncertain|might|may|maybe|perhaps|possibly|probably|keep (?:the |my )?issue open)\b|\b\p{L}+n['’]t\b/iu.test(raw))return 'closure-negative-or-modal-marker';
  if(kind==='resolve'&&!/\b(my|this|the) (question|condition|issue|commitment) (?:is|was|are|were|has been|have been) (?:now )?(?:answered|met|fulfilled|resolved|satisfied|completed) because\b/i.test(q))return 'evidence-action-language-unassessed';
  return assessIssueEvidence(kind,raw,e,s).assessment==='eligible'?null:'evidence-action-language-unassessed';
 }
 if(/^(?:according to|the (?:source|message)|they (?:said|asked))/i.test(q))return 'evidence-action-language-unassessed';
 const patterns:Record<string,boolean>={
  question:(q.endsWith('?')||/\b(wonder (?:whether|how|if)|(?:please )?clarify|(?:like|need|want) to (?:know|understand))\b/i.test(q))&&/\b(commut\w*|journey|travel|transfer\w*|route|shift|schedule|roster|availability|hours|timetable|workplace|access|connect\w*|interchange|service|proposed|arriv\w*|depart\w*|operat\w*)\b/i.test(q)&&! /\b(nice|great|pleasant|delightful|who cares|why bother|what.s the point|manufactur\w*|invent\w*|wheels?)\b/i.test(q),
  condition:/\b(only if|unless|provided that|depends on|conditional on|cannot .+ (?:until|without)|(?:need|require|must) .+ before|if .+ I (?:cannot|can|will|would))\b/i.test(q),
  disagreement:/\b(I (?:disagree|do not agree|don.t agree|cannot support|oppose)|not convinced)\b/i.test(q)&&/\b(because|since|whereas|contradict)\b/i.test(q),
  commitment:/\bI (will|commit to|agree to|undertake to)\b/i.test(q)&&/\b(before|after|when|once|during|until|if|by)\b/i.test(q),
  progress:/\b(update|pending|still|not yet|await|remaining|follow.up|progress|waiting)\b/i.test(q),
 };
 return patterns[kind]?null:'evidence-action-language-unassessed';
}
export function findIssueProse(raw:string,kind:GroundedIssueKind,basisRef:string,criterion:string|null,s:GroundedIssueSubject):{quote?:string;reason:ProseSubreason|null}{
 const sentences=raw.match(/[^.!?\n]+[.!?]?/gu)??[raw.trim()];
 const candidates=[...new Set(sentences.map(v=>v.trim()))].filter(q=>q.length<=240);
 if(!candidates.length)return {reason:'authored-span-missing'};
 let reason:ProseSubreason='authored-span-missing';
 for(const quote of candidates){const r=assessIssueProse(kind,raw,{quote,basisRef,criterion},s);if(r===null)return {quote,reason:null};reason=r;}
 return {reason};
}
