/** Browser-safe deterministic scope hints. Classification is not a legal or economic finding. */
import { assertJsonData, canonical, ensure, freezeSnapshot, object, text } from '../experiments/validation.ts';

export const QUESTION_CONTEXT_VERSION = 1;
export const QUESTION_CONTEXT_LIMITS = Object.freeze({ questionCharacters: 2000, outputBytes: 65_536, jurisdictions: 18, domains: 12, entityTypes: 16, questions: 12, assumptions: 6 });
export type QuestionScope = 'local' | 'cross-border' | 'international' | 'undetermined';
export type QuestionIntent = 'asean-withdrawal' | 'mrt' | 'aac' | 'polyclinic' | 'local-amenity' | 'cross-border-policy' | 'general-policy' | 'undetermined';
export type AffectedDomain = 'transport-accessibility' | 'healthcare-access' | 'public-space' | 'trade-customs' | 'logistics' | 'labour-employment' | 'business-investment' | 'public-finance' | 'diplomacy-governance' | 'household-living-costs' | 'policy-design';
export type CandidateEntityType = 'residents' | 'commuters' | 'patients' | 'healthcare-providers' | 'local-businesses' | 'public-agencies' | 'workers' | 'employers' | 'importers-exporters' | 'logistics-providers' | 'international-partners' | 'regional-institutions' | 'investors' | 'households';
export interface RelevantJurisdictionV1 { id: string; label: string; kind: 'country' | 'regional-organisation'; provenance: 'explicit-question'; mention: string }
export interface QuestionContextV1 {
  version: 1; question: string; contextIdentity: string; scope: QuestionScope; intent: QuestionIntent;
  classification: { method: 'deterministic-heuristic'; confidence: 'provisional' | 'explicit'; rationale: string[] };
  primaryJurisdiction: { id: 'SG'; label: 'Singapore'; provenance: 'explicit-question' | 'application-context' } | null;
  relevantJurisdictions: RelevantJurisdictionV1[]; affectedDomains: AffectedDomain[]; candidateEntityTypes: CandidateEntityType[];
  unresolvedQuestions: string[];
  assumptions: { id: string; label: string; statement: string; provenance: 'heuristic-assumption' | 'application-context' }[];
}

// Finite recognisable mentions only. An organisation never expands into member countries.
const jurisdictions: readonly { id: string; label: string; kind: RelevantJurisdictionV1['kind']; pattern: RegExp; uppercaseAlias?: RegExp }[] = [
  { id: 'SG', label: 'Singapore', kind: 'country', pattern: /\b(?:Singapore|Singaporean|SG)\b/i },
  { id: 'MY', label: 'Malaysia', kind: 'country', pattern: /\b(?:Malaysia|Malaysian)\b/i },
  { id: 'CN', label: 'China', kind: 'country', pattern: /\b(?:China|Chinese)\b/i },
  { id: 'US', label: 'United States', kind: 'country', pattern: /\b(?:United States|USA)\b/i, uppercaseAlias: /\bUS\b/ },
  { id: 'ID', label: 'Indonesia', kind: 'country', pattern: /\b(?:Indonesia|Indonesian)\b/i },
  { id: 'IN', label: 'India', kind: 'country', pattern: /\b(?:India|Indian)\b/i },
  { id: 'JP', label: 'Japan', kind: 'country', pattern: /\b(?:Japan|Japanese)\b/i },
  { id: 'AU', label: 'Australia', kind: 'country', pattern: /\b(?:Australia|Australian)\b/i },
  { id: 'GB', label: 'United Kingdom', kind: 'country', pattern: /\b(?:United Kingdom|Britain|British|UK)\b/i },
  { id: 'TH', label: 'Thailand', kind: 'country', pattern: /\b(?:Thailand|Thai)\b/i },
  { id: 'VN', label: 'Vietnam', kind: 'country', pattern: /\b(?:Vietnam|Vietnamese)\b/i },
  { id: 'PH', label: 'Philippines', kind: 'country', pattern: /\b(?:Philippines|Philippine|Filipino)\b/i },
  { id: 'KR', label: 'South Korea', kind: 'country', pattern: /\b(?:South Korea|South Korean)\b/i },
  { id: 'EU', label: 'European Union', kind: 'regional-organisation', pattern: /\b(?:European Union|EU)\b/i },
  { id: 'ASEAN', label: 'ASEAN', kind: 'regional-organisation', pattern: /\bASEAN\b/i },
];

function classificationContent(question: string): Omit<QuestionContextV1, 'contextIdentity'> {
  text(question, QUESTION_CONTEXT_LIMITS.questionCharacters);
  const relevantJurisdictions: RelevantJurisdictionV1[] = jurisdictions.flatMap(jurisdiction => {
    const mention = question.match(jurisdiction.pattern)?.[0] ?? (jurisdiction.uppercaseAlias ? question.match(jurisdiction.uppercaseAlias)?.[0] : undefined);
    return mention ? [{ id: jurisdiction.id, label: jurisdiction.label, kind: jurisdiction.kind, provenance: 'explicit-question' as const, mention }] : [];
  });
  const singaporeExplicit = relevantJurisdictions.some(j => j.id === 'SG');
  const foreignCountryExplicit = relevantJurisdictions.some(j => j.kind === 'country' && j.id !== 'SG');
  const primaryJurisdiction: QuestionContextV1['primaryJurisdiction'] = singaporeExplicit ? { id: 'SG', label: 'Singapore', provenance: 'explicit-question' }
    : foreignCountryExplicit ? null : { id: 'SG', label: 'Singapore', provenance: 'application-context' };
  const asean = /\bASEAN\b/i.test(question), international = asean || /\b(?:international|diplomac\w*|geopolitic\w*|European Union|EU)\b/i.test(question);
  const imports = /\b(?:imports?|imported|importing|exports?|exported|tariffs?|customs)\b/i.test(question);
  const shipping = /\b(?:shipping|supply[- ]chains?|cross[- ]border|overseas|foreign trade)\b/i.test(question);
  const foreignWorkers = /\b(?:foreign|migrant)\s+workers?\b|\bwork[- ]passes?\b/i.test(question);
  const headquarters = /\b(?:headquarters|multinationals?|foreign companies|foreign investment)\b/i.test(question);
  const taxes = /\b(?:tax(?:es|ation)?|GST|tariffs?|excise|dut(?:y|ies))\b/i.test(question);
  const mrt = /\b(?:MRT|LRT|rail(?:way)?|train stations?)\b/i.test(question);
  const clinic = /\bpolyclinics?\b/i.test(question);
  const aac = /\bAAC\b|active\s+ageing\s+cent(?:re|er)/i.test(question);
  const amenity = /\b(?:parks?|playgrounds?|community gardens?)\b/i.test(question)
    || !foreignCountryExplicit && /\b(?:(?:community|neighbou?rhood)\s+(?:facilit(?:y|ies)|cent(?:re|er)s?)|schools?|housing(?:\s+(?:estates?|developments?|projects?))?|public\s+(?:services?|facilit(?:y|ies)))\b/i.test(question);
  const localTopic = mrt || clinic || aac || amenity;
  const crossBorder = imports || shipping || foreignWorkers || headquarters || (singaporeExplicit && foreignCountryExplicit);
  const withdrawal = asean && /\b(?:leave|leaves|leaving|left|withdraw|withdraws|withdrawing|withdrawal|withdrew|withdrawn|exit|exits|exiting)\b/i.test(question);
  const negatedMembershipChange = /\b(?:not|never|without|avoid|avoids|avoiding|rather than|instead of|stays?|staying|remains?|remaining|won['’]?t|wouldn['’]?t|doesn['’]?t|don['’]?t|didn['’]?t|cannot)\b/i.test(question);
  const proposedChange = /\b(?:what\s+if|suppose|imagine|hypothetical|scenario|if|should|could|would)\b/i.test(question)
    || /^\s*(?:Singapore|we)\s+(?:leaves?|leaving|withdraws?|withdrawing|exits?|exiting)\b/i.test(question);
  const definitionOnly = /^\s*(?:what\s+(?:is|does|are)|define|explain|describe|history|when\s+did|did\s+)/i.test(question) && !/\bwhat\s+if\b/i.test(question);
  // Registered ASEAN roles are a narrow demonstration. Mixed policy questions must not enter it.
  const narrowWithdrawal = withdrawal && proposedChange && !definitionOnly && !negatedMembershipChange && primaryJurisdiction?.id === 'SG' && !foreignCountryExplicit
    && !taxes && !imports && !shipping && !foreignWorkers && !headquarters && !localTopic;
  const scope: QuestionScope = international ? 'international' : crossBorder ? 'cross-border' : localTopic ? 'local' : 'undetermined';
  const intent: QuestionIntent = narrowWithdrawal ? 'asean-withdrawal' : scope === 'cross-border' ? 'cross-border-policy'
    : !international && mrt ? 'mrt' : !international && clinic ? 'polyclinic' : !international && aac ? 'aac'
      : !international && amenity ? 'local-amenity' : international || taxes ? 'general-policy' : 'undetermined';
  const domains = new Set<AffectedDomain>(), entities = new Set<CandidateEntityType>(['residents', 'public-agencies']);
  if (mrt) { domains.add('transport-accessibility'); entities.add('commuters'); }
  if (clinic || aac) { domains.add('healthcare-access'); entities.add('patients'); entities.add('healthcare-providers'); }
  if (amenity) { domains.add('public-space'); entities.add('local-businesses'); }
  if (imports || taxes && scope === 'cross-border') { domains.add('trade-customs'); entities.add('importers-exporters'); }
  if (shipping || imports) { domains.add('logistics'); entities.add('logistics-providers'); }
  if (foreignWorkers) { domains.add('labour-employment'); entities.add('workers'); entities.add('employers'); }
  if (headquarters) { domains.add('business-investment'); entities.add('employers'); entities.add('investors'); }
  if (taxes) { domains.add('public-finance'); domains.add('household-living-costs'); entities.add('households'); entities.add('local-businesses'); }
  if (international) { domains.add('diplomacy-governance'); entities.add('international-partners'); if (asean) entities.add('regional-institutions'); }
  if (!domains.size) domains.add('policy-design');
  const assumptions: QuestionContextV1['assumptions'] = [], unresolvedQuestions: string[] = [];
  if (primaryJurisdiction?.provenance === 'application-context') assumptions.push({ id: 'singapore-context', label: 'Working jurisdiction',
    statement: 'Singapore is the application context, provisionally assumed because the question does not name a primary country. Confirm the intended jurisdiction.', provenance: 'application-context' });
  if (!primaryJurisdiction) unresolvedQuestions.push('Which jurisdiction is responsible for the proposed change? No Singapore jurisdiction is assumed for an explicitly foreign-country question.');
  if (taxes) unresolvedQuestions.push(imports ? 'Which tax instrument applies to imported goods: GST, excise, a specific customs duty or a proposed tariff? A universal tariff is not assumed.'
    : 'Which tax or tax instrument is meant, which activities does it cover, and is the change domestic or cross-border?');
  if (taxes && imports) assumptions.push({ id: 'import-tax-interpretation', label: 'Provisional import-tax interpretation',
    statement: 'Working interpretation: the question concerns a tax on imported goods with possible cross-border channels. The instrument, product coverage and legal basis remain unresolved; no universal tariff is assumed.', provenance: 'heuristic-assumption' });
  if (scope === 'cross-border') {
    unresolvedQuestions.push('Which named counterpart jurisdictions, firms or groups are in scope? No unmentioned country is added to the scenario.');
    if (imports || shipping) unresolvedQuestions.push('Which goods, routes, agreements and supply-chain links require evidence before any effects can be assessed?');
    if (foreignWorkers) unresolvedQuestions.push('Which worker pass categories, sectors, eligibility rules and employer arrangements are actually proposed?');
    if (headquarters) unresolvedQuestions.push('Which firms and functions might relocate, between which jurisdictions, and under what documented assumptions?');
  } else if (international) {
    unresolvedQuestions.push('Which specific agreements, institutional procedures and counterpart relationships need to be checked?');
    if (withdrawal) unresolvedQuestions.push('What withdrawal mechanism, transition terms and treatment of separate agreements would apply? These are not established by the question.');
    if (withdrawal && !narrowWithdrawal) unresolvedQuestions.push('Which actor and membership change are intended? The narrow Singapore withdrawal demonstration does not cover mixed policies, foreign-country withdrawal, definitions or remaining in ASEAN.');
  } else if (mrt) unresolvedQuestions.push('Which route, station connections, service timings and journey population will be explicitly supplied and confirmed?');
  else if (clinic || aac) unresolvedQuestions.push('Which site, service scope, capacity and target population are intended, and which of those inputs have evidence?');
  else if (amenity) unresolvedQuestions.push('Which site, access needs, land-use constraints and maintenance assumptions are intended?');
  else unresolvedQuestions.push('What concrete intervention, location and affected groups should this question investigate?');
  unresolvedQuestions.push('Which outcomes can the available evidence or existing models support, and which remain unknown?');
  const rationale = [international ? 'The question names a regional or international institutional context.'
    : scope === 'cross-border' ? 'The wording names a possible cross-border channel; its actual reach and effects require confirmation.'
      : scope === 'local' ? 'The question concerns a local service, transport connection or public amenity.'
        : 'The wording does not establish whether the proposed change is local or cross-border.'];
  if (taxes) rationale.push('A reference to tax does not establish a tariff or its legal treatment. The instrument is provisional.');
  return { version: 1, question, scope, intent, classification: { method: 'deterministic-heuristic', confidence: scope === 'undetermined' || taxes || !singaporeExplicit ? 'provisional' : 'explicit', rationale },
    primaryJurisdiction, relevantJurisdictions, affectedDomains: [...domains], candidateEntityTypes: [...entities], unresolvedQuestions, assumptions };
}

export function classifyQuestionContext(question: string): QuestionContextV1 {
  const content = classificationContent(question);
  const context = { ...content, contextIdentity: `question-context-v1:${canonical(content)}` };
  ensure(new TextEncoder().encode(canonical(context)).byteLength <= QUESTION_CONTEXT_LIMITS.outputBytes, 'Question context exceeds its size limit');
  return freezeSnapshot(context);
}

/** Semantic validation: callers cannot relabel a local question as an international result. */
export function parseQuestionContext(value: unknown): QuestionContextV1 {
  assertJsonData(value);
  const r = object(value, ['version', 'question', 'contextIdentity', 'scope', 'intent', 'classification', 'primaryJurisdiction', 'relevantJurisdictions', 'affectedDomains', 'candidateEntityTypes', 'unresolvedQuestions', 'assumptions']);
  const expected = classifyQuestionContext(text(r.question, QUESTION_CONTEXT_LIMITS.questionCharacters));
  ensure(canonical(r) === canonical(expected), 'Question context does not match its deterministic version-1 classification');
  return expected;
}
