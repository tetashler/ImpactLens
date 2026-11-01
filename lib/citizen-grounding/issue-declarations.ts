/** Optional formal intentions, selected by the model; never model-authored evidence.
 * Templates and their interpretation are frozen by issue-declaration-v1 / menu-v7. */
import {freezeSnapshot} from '../experiments/validation.ts';
import type {DecisionContext} from '../society/decision-contract.ts';
import type {IssueDeclaration} from '../society/episodic.ts';
import {buildCitizenEvidenceMenu,citizenV5TextBudget} from './decision-v5.ts';
import {COMMUTE_CONDITION,evaluateIssueSatisfaction} from './issues.ts';

export const DECLARATION_POLICY='issue-declaration-v1' as const;
export const DECLARATION_PREFIX='[Agent-selected issue declaration: ';
export const renderIssueDeclaration=(statement:string)=>DECLARATION_PREFIX+statement+']';
/** Do not let an earlier generated declaration become a purported later answer. */
export const withoutIssueDeclarations=(text:string)=>text.replace(/\[Agent-selected issue declaration: [^\]\r\n]*(?:\]|$)/gmu,'').trim();
const labels:Readonly<Record<string,string>>=Object.freeze({commute:'commute comparison',schedule:'working-schedule information',workplace:'workplace information'});
const reserve=240+DECLARATION_PREFIX.length+2;
export function citizenV7TextBudget(c:DecisionContext){
 const limit=1000-reserve,render=(f:NonNullable<DecisionContext['grounding']>['facts'][number])=>`[${f.basis==='calculated'?'Modelled':'Synthetic'} fact: ${f.label}: ${f.value}${f.unit?' '+f.unit:''}.]`;
 const available=citizenV5TextBudget(c).available.filter(f=>render(f).length<=limit-97),lengths=available.map(f=>render(f).length).sort((a,b)=>b-a);
 let maxFacts=Math.min(2,lengths.length);if(maxFacts===2&&lengths[0]+lengths[1]+2>limit-96)maxFacts=1;
 const suffix=lengths.slice(0,maxFacts).reduce((a,b)=>a+b,0)+maxFacts;
 return {available,maxFacts,textMaxLength:limit-suffix};
}
export function buildCitizenDeclarations(c:DecisionContext){
 if(c.policy!=='conversation-menu-v7'||!c.grounding||c.grounding.citizenId!==c.actor.id)return [];
 const budget=citizenV7TextBudget(c),safe:DecisionContext={...c,policy:'conversation-menu-v5',grounding:{...c.grounding,facts:budget.available},items:c.items.map(i=>({...i,text:withoutIssueDeclarations(i.text)}))};
 return freezeSnapshot(buildCitizenEvidenceMenu(safe).flatMap(o=>{
  const subject=c.grounding!.subjects.find(s=>s.id===o.choice.subjectId),label=labels[o.choice.subjectId],kind=o.choice.update.kind;
  if(!subject||!label)return [];
  const existing=c.issues?.find(i=>i.id===o.choice.update.issueId);
  if(kind==='resolve'&&existing?.grounding?.criterion&&(!subject.criterion||subject.criterion.id!==existing.grounding.criterion||o.criterion!==subject.criterion.id||evaluateIssueSatisfaction(subject.criterion,budget.available)!=='satisfied'))return [];
  const statements={
   question:`Which assumptions about the ${label} should be checked before this proposal is used?`,
   condition:o.criterion?COMMUTE_CONDITION:`I can support this proposal only if the ${label} is clarified before implementation.`,
   commitment:`I will review the supplied ${label} before deciding whether to support this proposal.`,
   disagreement:`I do not support relying on the ${label} because the supplied information needs further scrutiny.`,
   progress:`I am reviewing the supplied ${label}; my existing concern remains open.`,
   resolve:o.criterion?'I close my condition because the supplied calculated comparison satisfies its declared criterion.':`I report my existing concern about the ${label} as resolved on the basis of the supplied later statement; this is my report, not independent verification.`,
   withdraw:`I withdraw my existing concern about the ${label}; withdrawal does not establish that it was satisfied.`,
  };
  const statement=statements[kind];if(statement.length>240)return [];
  const id=o.id.replace(/^evidence-/,'declaration-v1-');
  const declaration:IssueDeclaration={policy:DECLARATION_POLICY,origin:'model-selected-server-rendered',optionId:id,kind,statement};
  return [{...o,id,statement,declaration}];
 }));
}
