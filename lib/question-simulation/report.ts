/** Browser-safe projection of accepted inputs/results. No model or participant executor is invoked. */
import type { SimulationResponse } from '../map-contract.ts';
import { parseEldercareApiResponse, type EldercareApiResponse } from '../eldercare/api-contract.ts';
import { verifyStakeholderRun } from '../stakeholder-simulation/identities.ts';
import { SIMULATION_DISCLOSURE, type StakeholderSimulationRunV1 } from '../stakeholder-simulation/contract.ts';
import { assertJsonData, ensure, freezeSnapshot, identifier, object, strings, text } from '../experiments/validation.ts';
import { parseQuestionContext, type QuestionContextV1, type QuestionScope } from './context.ts';
import { parseInferenceDiagnostics, type InferenceDiagnosticsV1 } from '../stakeholder-simulation/inference-contract.ts';

export const QUESTION_REPORT_LIMITS = Object.freeze({ outputBytes: 2_000_000, calculatedResults: 2, sections: 8, itemsPerSection: 64 });
export type QuestionCalculatedResultV1 =
  | { kind: 'mrt'; scenarioIdentity: string; executionIdentity: string; result: SimulationResponse }
  | { kind: 'aac'; scenarioIdentity: string; executionIdentity: string; result: EldercareApiResponse };
export type ReportSectionKind = 'scope' | 'synthetic-observations' | 'research-questions' | 'evidence' | 'limitations' | 'calculated-results';
export interface QuestionReportItemV1 {
  id: string; label: string; text: string;
  classification: 'context' | 'synthetic-statement' | 'research-question' | 'supplied-evidence' | 'calculated-reference' | 'limitation';
  eventId?: string; sourceIds?: string[];
}
export interface QuestionReportSectionV1 { id: string; title: string; kind: ReportSectionKind; items: QuestionReportItemV1[] }
export interface QuestionReportV1 {
  version: 1; contextIdentity: string; question: string; scope: QuestionScope;
  runId: string | null; runStatus: 'not-run' | StakeholderSimulationRunV1['status'];
  executionMode: 'not-run' | StakeholderSimulationRunV1['execution']['mode'];
  sections: QuestionReportSectionV1[]; calculatedResults: QuestionCalculatedResultV1[]; limitations: string[];
  /** Actual validated inference accounting, kept separate from societal findings. */
  inference?: InferenceDiagnosticsV1;
}
export interface ProjectQuestionReportOptions {
  context: QuestionContextV1; run?: StakeholderSimulationRunV1 | null;
  inference?: InferenceDiagnosticsV1;
  /** Must be the caller's exact current calculator binding, never a display hash. */
  calculationIdentity?: string; calculatedResults?: QuestionCalculatedResultV1[];
}

function nullableNumber(value: unknown, minimum?: number, integer = false): void {
  ensure(value === null || typeof value === 'number' && Number.isFinite(value) && (minimum === undefined || value >= minimum) && (!integer || Number.isSafeInteger(value)), 'Invalid retained calculator value');
}
function parseMrtResult(value: unknown): SimulationResponse {
  const r = object(value, ['serviceDate', 'model', 'comparisons']);
  const date = text(r.serviceDate, 10);
  ensure(/^\d{4}-\d\d-\d\d$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date, 'Invalid MRT service date');
  ensure(r.model === 'static-median-travel-time' && Array.isArray(r.comparisons) && r.comparisons.length <= 20, 'Invalid retained MRT model or journey count');
  function route(value: unknown, status: unknown): void {
    if (status !== 'reachable') { ensure(value === null, 'Unreachable journeys cannot contain routes'); return; }
    const r = object(value, ['stationIds', 'lines', 'coordinates']);
    const stationIds = strings(r.stationIds, 500, 128, false); strings(r.lines, 40, 128);
    ensure(stationIds.length > 0 && Array.isArray(r.coordinates) && r.coordinates.length === stationIds.length, 'Invalid retained MRT route');
    for (const coordinate of r.coordinates) ensure(Array.isArray(coordinate) && coordinate.length === 2 && typeof coordinate[0] === 'number'
      && Number.isFinite(coordinate[0]) && coordinate[0] >= -180 && coordinate[0] <= 180 && typeof coordinate[1] === 'number'
      && Number.isFinite(coordinate[1]) && coordinate[1] >= -90 && coordinate[1] <= 90, 'Invalid retained route coordinate');
  }
  for (const value of r.comparisons) {
    const c = object(value, ['origin', 'destination', 'status', 'baselineMinutes', 'scenarioMinutes', 'minutesSaved', 'percentageChange', 'usedProposedLine', 'baselineTransfers', 'scenarioTransfers', 'transferChange', 'baselineStatus', 'scenarioStatus', 'baselineRoute', 'scenarioRoute']);
    text(c.origin, 128); text(c.destination, 128);
    ensure(['compared', 'newly-reachable', 'unreachable', 'invalid'].includes(c.status as string));
    for (const status of [c.baselineStatus, c.scenarioStatus]) ensure(['reachable', 'unreachable', 'station-unavailable', 'invalid'].includes(status as string));
    for (const key of ['baselineMinutes', 'scenarioMinutes']) nullableNumber(c[key], 0);
    for (const key of ['minutesSaved', 'percentageChange']) nullableNumber(c[key]);
    for (const key of ['baselineTransfers', 'scenarioTransfers']) nullableNumber(c[key], 0, true);
    nullableNumber(c.transferChange, undefined, true);
    ensure(c.usedProposedLine === null || typeof c.usedProposedLine === 'boolean');
    route(c.baselineRoute, c.baselineStatus); route(c.scenarioRoute, c.scenarioStatus);
  }
  return structuredClone(r) as unknown as SimulationResponse;
}

async function calculatedResults(input: ProjectQuestionReportOptions, context: QuestionContextV1): Promise<QuestionCalculatedResultV1[]> {
  const values = input.calculatedResults ?? [];
  ensure(Array.isArray(values) && values.length <= QUESTION_REPORT_LIMITS.calculatedResults, 'Too many retained calculator results');
  if (values.length) { ensure(typeof input.calculationIdentity === 'string', 'A current calculation identity binding is required'); text(input.calculationIdentity, 160_000); }
  const kinds = new Set<string>(), parsed: QuestionCalculatedResultV1[] = [];
  for (const value of values) {
    const r = object(value, ['kind', 'scenarioIdentity', 'executionIdentity', 'result']);
    ensure((r.kind === 'mrt' || r.kind === 'aac') && !kinds.has(r.kind), 'Unknown or duplicate calculator result kind'); kinds.add(r.kind);
    const scenarioIdentity = text(r.scenarioIdentity, 160_000), executionIdentity = identifier(r.executionIdentity);
    ensure(scenarioIdentity === input.calculationIdentity, 'Stale calculation identity binding');
    ensure(context.intent === r.kind && context.scope === 'local', 'Calculator result does not match this local question intent');
    parsed.push(r.kind === 'mrt' ? { kind: 'mrt', scenarioIdentity, executionIdentity, result: parseMrtResult(r.result) }
      : { kind: 'aac', scenarioIdentity, executionIdentity, result: await parseEldercareApiResponse(r.result) });
  }
  return parsed;
}

/** Caller-supplied calculations retain original values/units. The report does not calculate effects. */
export async function projectQuestionReport(input: ProjectQuestionReportOptions): Promise<QuestionReportV1> {
  const data = object(input, ['context', 'run', 'inference', 'calculationIdentity', 'calculatedResults'], ['context']);
  // Optional TypeScript arguments may be explicitly undefined; imported data still
  // passes descriptor/prototype checks before any property or nested value is read.
  assertJsonData(Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)));
  const context = parseQuestionContext(input.context);
  const run = input.run ? await verifyStakeholderRun(input.run) : null;
  ensure(!run || run.inputSnapshot.question === context.question, 'Stakeholder run question does not match the report scenario');
  ensure(input.inference === undefined || run !== null, 'Inference accounting requires its accepted stakeholder run');
  const inference = input.inference === undefined ? undefined : parseInferenceDiagnostics(input.inference, run!);
  const retained = await calculatedResults(input, context);
  const sections: QuestionReportSectionV1[] = [];
  function section(id: string, title: string, kind: ReportSectionKind, items: QuestionReportItemV1[]): void {
    ensure(sections.length < QUESTION_REPORT_LIMITS.sections && items.length <= QUESTION_REPORT_LIMITS.itemsPerSection, 'Question report section limit exceeded');
    sections.push({ id, title, kind, items });
  }
  const jurisdiction = context.primaryJurisdiction ? `${context.primaryJurisdiction.label} (${context.primaryJurisdiction.provenance === 'explicit-question' ? 'explicitly named' : 'provisional application context'})` : 'Primary jurisdiction unresolved';
  section('scope', 'Question scope and working interpretation', 'scope', [
    { id: 'scope', label: 'Scope', text: `${context.scope}. ${context.classification.rationale.join(' ')}`, classification: 'context' },
    { id: 'jurisdiction', label: 'Primary jurisdiction', text: jurisdiction, classification: 'context' },
    ...context.assumptions.map(a => ({ id: a.id, label: a.label, text: a.statement, classification: 'context' as const })),
  ]);
  const research = context.unresolvedQuestions.map((question, index) => ({ id: `research-${index}`, label: `Research question ${index + 1}`, text: question, classification: 'research-question' as const }));
  if (context.scope === 'local') section('local-research', 'Local questions that remain to be investigated', 'research-questions', research);
  else if (context.scope === 'cross-border') section('cross-border-research', 'Cross-border channels: research questions, not established effects', 'research-questions', research);
  else if (context.scope === 'international') section('international-research', 'International context: research questions, not established effects', 'research-questions', research);
  else section('scope-research', 'Clarify the intervention and its reach', 'research-questions', research);
  if (run?.events.length) section('stakeholder-statements', 'Recorded fictional stakeholder statements', 'synthetic-observations', run.events.map(event => ({
    id: event.id, eventId: event.id, label: `${run.inputSnapshot.stakeholderRoles.find(role => role.id === event.roleId)!.title} · round ${event.round}`,
    text: event.statement, classification: 'synthetic-statement', sourceIds: [...event.sourceIds],
  })));
  if (run?.inputSnapshot.evidence) {
    const evidence = run.inputSnapshot.evidence;
    section('evidence', 'Supplied evidence context', 'evidence', [
      ...evidence.findings.map(finding => ({ id: finding.id, label: 'Supplied finding; not independently verified by this report', text: finding.statement, classification: 'supplied-evidence' as const, sourceIds: [...finding.sourceIds] })),
      ...evidence.gaps.map((gap, index) => ({ id: `evidence-gap-${index}`, label: 'Evidence gap', text: gap, classification: 'limitation' as const })),
    ]);
  } else section('evidence', 'Evidence gap', 'evidence', [{ id: 'missing-evidence', label: 'Missing evidence', text: 'No evidence bundle is attached to a stakeholder run in this report. No citations or verified findings are inferred.', classification: 'limitation' }]);
  if (retained.length) section('calculated-results', 'Existing accessibility calculations', 'calculated-results', retained.map(result => ({
    id: result.executionIdentity, label: result.kind === 'mrt' ? 'Accepted MRT calculation reference' : 'Accepted limited AAC calculation reference',
    text: 'The supplied calculator output is retained in its original units, denominator and model scope. No broader social, economic or stakeholder outcome is inferred.', classification: 'calculated-reference',
  })));
  const limitations = [...new Set([
    'Scope is a deterministic wording heuristic with explicit provisional assumptions. It is not a factual finding about jurisdiction or effects.',
    'Cross-border and international sections contain research questions, not simulated trade, diplomatic, firm or worker effects.',
    ...(run ? run.limitations : ['No stakeholder run is attached. Candidate entity types and research questions are planning context only.']),
    ...(run ? [SIMULATION_DISCLOSURE] : []),
    'Supplied evidence and accepted calculator references retain their own provenance and limits; this report performs no source retrieval, independent verification or new numerical calculation.',
    ...(retained.some(result => result.kind === 'aac') ? retained.flatMap(result => result.kind === 'aac' ? result.result.limitations : []) : []),
    ...(retained.some(result => result.kind === 'mrt') ? ['MRT values are static travel-time comparisons for the supplied journeys, not measured demand, ridership or wider welfare effects.'] : []),
  ])];
  // Local reports carry their applicable limitations without a generic international appendix.
  const applicableLimitations = context.scope === 'local' ? limitations.filter(limit => !limit.startsWith('Cross-border and international sections')) : limitations;
  const report: QuestionReportV1 = { version: 1, contextIdentity: context.contextIdentity, question: context.question, scope: context.scope,
    runId: run?.runId ?? null, runStatus: run?.status ?? 'not-run', executionMode: run?.execution.mode ?? 'not-run', sections, calculatedResults: retained, limitations: applicableLimitations,
    ...(inference === undefined ? {} : { inference }) };
  assertJsonData(report);
  ensure(new TextEncoder().encode(JSON.stringify(report)).byteLength <= QUESTION_REPORT_LIMITS.outputBytes, 'Question report exceeds its size limit');
  return freezeSnapshot(report);
}
