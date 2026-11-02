import type {PublicExplore} from '../society/public-contract.ts';
import {parseResearchBriefing,RESEARCH_PROMPT_SCOPE} from '../grounding/briefing.ts';
import {canonical} from '../experiments/validation.ts';
import {REPORT_SUMMARY_PROMPT_VERSION} from './contract.ts';
import {reviewContext} from '../assumption-review/contract.ts';
const text = (v: string, max = 800) => {
  const bytes = new TextEncoder().encode(v);
  return bytes.length <= max ? v : new TextDecoder().decode(bytes.slice(0, max));
};
const texts = (v: string[], max = 12, width = 300) => v.slice(0, max).map(s => text(s, width));
const number = (v: number | null) => v !== null && Number.isFinite(v) ? v : null;
/** Explicit allowlist: no profiles, membership, messages, memories, session or graph property bags. */
export function projectReportEvidence(run: PublicExplore) {
  const s = run.society, impact = run.grounding?.impact;
  const evidence = {
    ...(run.assumptionReview?{assumptionReview:reviewContext(run.assumptionReview)}:{}),
    ...(run.research?{research:parseResearchBriefing(run.research),researchScope:RESEARCH_PROMPT_SCOPE}:{}),
    runId: run.runId, question: text(run.question, 2000), status: text(run.status, 80),
    revision: run.session?.revision ?? null,
    job: run.job ? {status: run.job.status, reason: run.job.reason, tick: run.job.tick, totalSteps: run.job.totalSteps} : null,
    assumptions: texts(run.assumptions), limitations: texts(run.limitations),
    simulation: s ? {
      phase: s.phase, tick: s.tick, totalSteps: s.totalSteps,
      agents: number(s.counts.agents), events: number(s.counts.events), modelEvents: number(s.counts.modelEvents), ruleEvents: number(s.counts.ruleEvents),
      aiDiscussion: {calls:number(s.usage?.calls??null),accepted:number(s.usage?.accepted??null),skipped:number(s.usage?.skipped??null),initialStatements:run.initialActions.length},
      limitations: texts(s.limitations),
      environments: s.platforms.slice(0, 16).map(p => ({name: text(p.name, 120), summary: text(p.summary, 600), arguments: text(p.arguments, 600), themes: texts(p.themes, 4, 80), limitations: texts(p.limitations, 2, 200)})),
    } : null,
    calculatedCommute: impact ? {
      interpretation: text(impact.summary.interpretation), representedPopulation: number(impact.summary.representedPopulation),
      representedAgents: number(impact.summary.representedAgents), comparableWeight: number(impact.summary.comparableWeight),
      meanMinutesSaved: number(impact.summary.meanMinutesSaved), benefitingShare: number(impact.summary.benefitingShare),
      coverage: Object.fromEntries(['improved','unchanged','worse','newly-reachable','unreachable','unknown','not-applicable'].map(key => {
        const c = impact.summary.coverage[key as keyof typeof impact.summary.coverage];
        return [key, {agents: number(c.agents), weight: number(c.weight)}];
      })), assumptions: texts(impact.assumptions), limitations: texts(run.grounding!.limitations),
    } : null,
    ...(run.locationContext ? {locationContext: {
      interventionType: text(run.locationContext.interventionType, 80),
      analysisMode: text(run.locationContext.analysisMode, 80),
      geometryRevision: Number.isSafeInteger(run.locationContext.geometryRevision) && run.locationContext.geometryRevision >= 0 ? run.locationContext.geometryRevision : null,
      locations: (run.locationContext.locations ?? []).slice(0, 32).map(location => ({
        pointId: text(location.pointId, 160),
        coordinate: {lat: number(location.coordinate.lat), lon: number(location.coordinate.lon)},
        planningArea: location.planningArea === null ? null : text(location.planningArea, 160),
        subzone: location.subzone === null ? null : text(location.subzone, 160),
      })),
      limitations: texts(run.locationContext.limitations, 12, 600),
      scope: 'Discussion-only context for fictional participants, not measured residents. No measured healthcare effects; healthcare outcomes, waiting times and capacity have not been calculated.',
    }} : {}),
    evidenceLimits: 'Bounded public report excerpt. Private dialogue, memories, individual profiles and private groups are excluded. Accepted public fictional statements, when available, are supplied separately by the server. Activity counts and topic tags do not establish substantive agreement or disagreement. Omitted details are unavailable.',
  };
  if (new TextEncoder().encode(JSON.stringify(evidence)).length > (run.research?180000:60000)) throw Error('REPORT_INPUT_SIZE');
  return evidence;
}
export type ReportEvidence = ReturnType<typeof projectReportEvidence>;

export function reportSnapshotPayload(evidence: ReportEvidence, promptVersion = REPORT_SUMMARY_PROMPT_VERSION) {return canonical({schemaVersion: 1, promptVersion, evidence});}
