import { CAPABILITY_IDS, getCapability, type CapabilityId, type InputRequirement, type GeographyKind } from './registry.ts';

export const SCENARIO_PLAN_VERSION = 1;
export const SCENARIO_LIMITS = Object.freeze({ bodyBytes: 16_384, questionCharacters: 2000, mapPoints: 12, responseBytes: 32_768 });
export const SCENARIO_INTENTS = ['mrt-line', 'aac', 'polyclinic', 'other-healthcare', 'international-policy', 'education-policy', 'stakeholder-question', 'individual-prediction', 'clarify', 'unsupported'] as const;
export type ScenarioIntent = typeof SCENARIO_INTENTS[number];
export type ScenarioCategory = 'mrt' | 'aac' | 'exploratory-agents' | 'evidence-analysis';
export interface UserMapPoint { id: string; lat: number; lon: number; provenance: 'user-provided' }
export interface ScenarioRequest { version: 1; clientRequestId: string; question: string; selectedCategory?: ScenarioCategory; mapPoints?: UserMapPoint[] }
/** Providers select finite references only. They cannot write plans, evidence, metrics or code. */
export interface ScenarioSelection { version: 1; intent: ScenarioIntent; capabilityId: CapabilityId }
interface PlanBase {
  schemaVersion: 1; planId: string; request: ScenarioRequest; interpretation: ScenarioSelection;
  title: string; interpretedIntent: string; domain: 'transport' | 'eldercare' | 'healthcare' | 'international-policy' | 'education' | 'general';
  executionState: 'not-executed'; confirmationRequired: true;
  missingInputs: InputRequirement[]; supportedOutcomes: string[]; unsupportedOutcomes: string[];
  geographicRequirements: { kind: GeographyKind; suppliedPointIds: string[]; validatedForExecution: false }[];
  assumptions: string[]; evidenceReferences: []; evidenceRequirements: string[];
  stakeholders: string[]; researchQuestions: string[]; limitations: string[]; routeReason: string; nextAction: string;
}
/** V1 issues configuration/research plans only. 'ready' is deliberately not legal:
 * a later handoff must validate full engine configuration against actual source data. */
export type ScenarioPlan = PlanBase & (
  { execution: 'calculated'; capabilityId: 'mrt-accessibility-v1'; availability: 'available'; readiness: 'needs-input' } |
  { execution: 'calculated'; capabilityId: 'aac-accessibility-v1'; availability: 'available-limited'; readiness: 'needs-input' } |
  { execution: 'exploratory-agents'; capabilityId: 'stakeholder-exploration-v1'; availability: 'planned'; readiness: 'planned-capability' } |
  { execution: 'evidence-analysis'; capabilityId: 'evidence-exploration-v1'; availability: 'planning-only'; readiness: 'needs-evidence' | 'needs-input' | 'unsupported' }
);
export type ProviderStatus = 'used' | 'not-configured' | 'unavailable' | 'invalid-response' | 'not-needed';
export const SCENARIO_PROVIDER_NOTICES: Readonly<Record<ProviderStatus,string>> = Object.freeze({
  used: 'A validated AI selection helped interpret the question; no simulation was executed.',
  'not-configured': 'AI configuration is unavailable. A conservative deterministic plan is shown.',
  unavailable: 'The configured provider could not complete interpretation. A conservative deterministic plan is shown.',
  'invalid-response': 'The provider response was not accepted. A conservative deterministic plan is shown.',
  'not-needed': 'A deterministic scope or safety rule selected this planning route without calling AI.',
});
export interface ScenarioResponse {
  version: 1; requestId: string; clientRequestId: string;
  method: 'ai-assisted' | 'deterministic-fallback'; providerStatus: ProviderStatus; plan: ScenarioPlan;
}
function ensure(ok: unknown): asserts ok { if (!ok) throw new Error('Invalid scenario planning data'); }
function object(value: unknown, allowed: string[], required = allowed): Record<string, unknown> {
  ensure(value !== null && typeof value === 'object' && !Array.isArray(value));
  const r = value as Record<string, unknown>;
  ensure(Object.keys(r).every(k => allowed.includes(k)) && required.every(k => Object.hasOwn(r, k)));
  return r;
}
function identifier(value: unknown): asserts value is string { ensure(typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(value)); }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function parseScenarioRequest(value: unknown): ScenarioRequest {
  const r = object(value, ['version', 'clientRequestId', 'question', 'selectedCategory', 'mapPoints'], ['version', 'clientRequestId', 'question']);
  ensure(r.version === 1); identifier(r.clientRequestId);
  ensure(typeof r.question === 'string' && r.question.trim().length > 0 && r.question.length <= SCENARIO_LIMITS.questionCharacters && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(r.question));
  if (r.selectedCategory !== undefined) ensure(['mrt','aac','exploratory-agents','evidence-analysis'].includes(r.selectedCategory as string));
  if (r.mapPoints !== undefined) {
    ensure(Array.isArray(r.mapPoints) && r.mapPoints.length <= SCENARIO_LIMITS.mapPoints);
    const ids = new Set<string>();
    for (const value of r.mapPoints) {
      const p = object(value, ['id','lat','lon','provenance']); identifier(p.id); ensure(!ids.has(p.id)); ids.add(p.id);
      ensure(p.provenance === 'user-provided' && typeof p.lat === 'number' && Number.isFinite(p.lat) && p.lat >= 1.15 && p.lat <= 1.5 && typeof p.lon === 'number' && Number.isFinite(p.lon) && p.lon >= 103.6 && p.lon <= 104.1);
    }
  }
  return structuredClone(r) as unknown as ScenarioRequest;
}
export function parseScenarioSelection(value: unknown): ScenarioSelection {
  const r = object(value, ['version','intent','capabilityId']);
  ensure(r.version === 1 && SCENARIO_INTENTS.includes(r.intent as ScenarioIntent) && CAPABILITY_IDS.includes(r.capabilityId as CapabilityId));
  const permitted = r.intent === 'mrt-line' ? ['mrt-accessibility-v1'] : r.intent === 'aac' ? ['aac-accessibility-v1']
    : ['individual-prediction','clarify','unsupported'].includes(r.intent as string) ? ['evidence-exploration-v1']
    : ['stakeholder-exploration-v1','evidence-exploration-v1'];
  ensure(permitted.includes(r.capabilityId as string));
  return structuredClone(r) as unknown as ScenarioSelection;
}
const labels: Record<ScenarioIntent, [PlanBase['domain'], string, string]> = {
  'mrt-line': ['transport', 'Explore a hypothetical MRT line', 'Configure an additive MRT accessibility comparison.'],
  aac: ['eldercare', 'Explore a hypothetical Active Ageing Centre', 'Configure a limited-area AAC geographic accessibility comparison.'],
  polyclinic: ['healthcare', 'Plan research into a proposed polyclinic', 'Identify evidence and modelling needs; no polyclinic calculation capability is registered.'],
  'other-healthcare': ['healthcare', 'Plan research into an unsupported healthcare service', 'The registered AAC model cannot calculate access to other healthcare services.'],
  'international-policy': ['international-policy', 'Explore an international-policy question', 'Frame competing hypotheses and stakeholder uncertainties without claiming public-opinion predictions.'],
  'education-policy': ['education', 'Explore an education-policy question', 'Frame evidence needs and possible stakeholder differences without forecasting outcomes.'],
  'stakeholder-question': ['general', 'Plan synthetic stakeholder exploration', 'Define a future synthetic exploration under explicit assumptions, without claiming representative reactions.'],
  'individual-prediction': ['general', 'Individual predictions are unsupported', 'The application cannot identify real individuals affected by a hypothetical policy.'],
  clarify: ['general', 'Choose how to explore this question', 'Select the intended scenario category or clarify the question.'],
  unsupported: ['general', 'Requested prediction is unsupported', 'A planning response cannot claim completed simulations or invented numerical impacts.'],
};
function content(request: ScenarioRequest, selection: ScenarioSelection) {
  const capability = getCapability(selection.capabilityId), [domain,title,interpretedIntent] = labels[selection.intent];
  const readiness = capability.execution === 'calculated' ? 'needs-input' : capability.execution === 'exploratory-agents' ? 'planned-capability'
    : ['individual-prediction','unsupported'].includes(selection.intent) ? 'unsupported' : selection.intent === 'clarify' ? 'needs-input' : 'needs-evidence';
  return {
    schemaVersion: 1 as const, request, interpretation: selection, title, interpretedIntent, domain,
    execution: capability.execution, capabilityId: capability.id, availability: capability.availability, readiness,
    executionState: 'not-executed' as const, confirmationRequired: true as const,
    missingInputs: capability.requiredInputs, supportedOutcomes: readiness === 'unsupported' ? [] : capability.supportedOutcomes,
    unsupportedOutcomes: capability.unsupportedOutcomes,
    geographicRequirements: capability.geography.map(kind => ({ kind, suppliedPointIds: kind === 'none' ? [] : (request.mapPoints ?? []).map(p => p.id), validatedForExecution: false as const })),
    assumptions: capability.assumptions, evidenceReferences: [] as [],
    evidenceRequirements: capability.execution === 'calculated' ? ['Review engine provenance and confirm the declared configuration assumptions.'] : ['Verified relevant source documents and reference periods are needed; none were retrieved by this endpoint.', 'Seek independent evidence for competing hypotheses and stakeholder differences.'],
    stakeholders: selection.intent === 'international-policy' ? ['Residents', 'Businesses and workers', 'Regional partners'] : selection.intent === 'education-policy' ? ['Students', 'Educators', 'Families'] : [],
    researchQuestions: capability.execution === 'calculated' ? [] : ['Which outcomes are supportable with available evidence?', 'What competing explanations and missing evidence could change the interpretation?'],
    limitations: [...capability.limitations, 'A plan is not a simulation result. No calculation, agent execution or evidence retrieval has occurred.'],
    routeReason: `${interpretedIntent} ${capability.execution === 'calculated' ? 'A registered engine exists, but complete engine configuration and user confirmation are still required.' : 'There is no executable quantitative model for this request in the selected route.'}`,
    nextAction: readiness === 'unsupported' ? 'Reframe as an aggregate, evidence-based question without individual or invented numerical predictions.' : readiness === 'needs-input' && capability.execution === 'calculated' ? 'Open the existing intervention editor, complete required inputs and explicitly confirm calculation.' : selection.intent === 'clarify' ? 'Select MRT, AAC, future stakeholder exploration or evidence planning.' : 'Confirm research scope and evidence requirements; do not execute a quantitative forecast.',
  };
}
async function identity(request: ScenarioRequest, selection: ScenarioSelection): Promise<string> {
  const { clientRequestId: _client, ...inputs } = request;
  const bytes = new TextEncoder().encode(canonical({ ...content(request,selection), request: inputs }));
  return `plan-${[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n => n.toString(16).padStart(2,'0')).join('')}`;
}
export async function createScenarioPlan(input: ScenarioRequest, choice: ScenarioSelection): Promise<ScenarioPlan> {
  const request = parseScenarioRequest(input), selection = parseScenarioSelection(choice);
  return parseScenarioPlan({ ...content(request,selection), planId: await identity(request,selection) });
}
/** Semantic validation compares trusted templates, not merely a plausible object shape. */
export function parseScenarioPlan(value: unknown): ScenarioPlan {
  ensure(value !== null && typeof value === 'object' && !Array.isArray(value));
  const r = value as Record<string,unknown>, request = parseScenarioRequest(r.request), selection = parseScenarioSelection(r.interpretation);
  ensure(typeof r.planId === 'string' && /^plan-[a-f0-9]{64}$/.test(r.planId));
  ensure(canonical(r) === canonical({ ...content(request,selection), planId: r.planId }));
  return structuredClone(r) as unknown as ScenarioPlan;
}
export async function parseScenarioResponse(value: unknown, expected?: ScenarioRequest): Promise<ScenarioResponse> {
  const r = object(value, ['version','requestId','clientRequestId','method','providerStatus','plan']);
  ensure(r.version === 1); identifier(r.requestId); identifier(r.clientRequestId);
  ensure(['ai-assisted','deterministic-fallback'].includes(r.method as string));
  ensure(['used','not-configured','unavailable','invalid-response','not-needed'].includes(r.providerStatus as string));
  ensure((r.method === 'ai-assisted') === (r.providerStatus === 'used'));
  const plan = parseScenarioPlan(r.plan); ensure(plan.request.clientRequestId === r.clientRequestId);
  ensure(plan.planId === await identity(plan.request,plan.interpretation));
  if (expected) ensure(canonical(plan.request) === canonical(parseScenarioRequest(expected)));
  return structuredClone(r) as unknown as ScenarioResponse;
}
export const SCENARIO_SELECTION_SCHEMA: Record<string,unknown> = {
  type: 'object', additionalProperties: false, required: ['version','intent','capabilityId'],
  properties: { version: { type: 'integer', enum: [1] }, intent: { type: 'string', enum: [...SCENARIO_INTENTS] }, capabilityId: { type: 'string', enum: [...CAPABILITY_IDS] } },
};
