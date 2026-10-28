import type { EvidenceBundleV1 } from '../evidence/index.ts';
import { parseExperiment, type ScenarioExperimentV1 } from './contract.ts';
import type { ExperimentConfigurationV1 } from './configuration.ts';
import { canonical, freezeSnapshot } from './validation.ts';

export interface ConfigurationComparisonRow { key: string; label: string; status: 'changed' | 'unchanged'; left: string; right: string }
export interface EvidenceSetComparison { shared: string[]; leftOnly: string[]; rightOnly: string[] }
export interface ExperimentComparisonV1 {
  version: 1; leftExperimentId: string; rightExperimentId: string; sameScenario: boolean;
  configurationChanges: ConfigurationComparisonRow[];
  evidence: {
    snapshotStatus: 'shared' | 'different' | 'missing'; sources: EvidenceSetComparison; findings: EvidenceSetComparison; gaps: EvidenceSetComparison;
    freshness: { status: 'unchanged' | 'changed'; left: string[]; right: string[] };
  };
  limitations: string[]; executionStatus: 'not-executed';
}

const labels: Record<string, string> = {
  kind: 'Scenario type', horizonYears: 'Time horizon', notes: 'Research notes', withdrawalTiming: 'Withdrawal timing',
  transitionMonths: 'Transition period', tradeArrangements: 'Trade arrangements assumption', stakeholderFocus: 'Stakeholder focus',
  location: 'Proposed polyclinic location', serviceScope: 'Polyclinic service scope', planId: 'Existing plan reference',
  routeId: 'Drawn MRT route reference', stationPointIds: 'Ordered drawn station references', sitePointId: 'Drawn AAC site reference',
  executionStatus: 'Execution status', researchFocus: 'Research focus', hypotheses: 'Competing hypotheses', namedAssumptions: 'Named assumptions',
};
const valueLabels: Record<string, string> = {
  asean: 'Singapore and ASEAN', polyclinic: 'Proposed polyclinic', mrt: 'MRT context references', aac: 'AAC context references', generic: 'General evidence research',
  immediate: 'Immediate (hypothetical)', negotiated: 'Negotiated (terms unresolved)', custom: 'Custom transition (hypothetical)',
  unresolved: 'Unresolved', 'hypothetical-continuity': 'Hypothetical continuity', 'hypothetical-replacement': 'Hypothetical replacement',
  'businesses-trade': 'Businesses and trade', 'workers-households': 'Workers and households', 'government-diplomacy': 'Government and diplomacy',
  'general-primary-care': 'General primary care (hypothetical scope)', 'scope-unconfirmed': 'Service scope unconfirmed', 'not-executed': 'Not executed',
};

function display(key: string, value: unknown): string {
  if (value === undefined) return 'Not applicable';
  if (value === null) return key === 'transitionMonths' ? 'Unspecified; terms unresolved' : 'Not supplied';
  if (key === 'horizonYears') return `${value} years`;
  if (key === 'transitionMonths') return `${value} months`;
  if (Array.isArray(value)) return value.length ? value.map(item => key === 'namedAssumptions'
    ? `${item.name} (${item.id}): ${item.statement}` : valueLabels[String(item)] ?? String(item)).join('; ') : 'None supplied';
  if (key === 'location' && typeof value === 'object') {
    const location = value as { lat: number; lon: number };
    return `${location.lat}, ${location.lon} (user-supplied)`;
  }
  return valueLabels[String(value)] ?? (String(value) || 'None supplied');
}

function configurationRows(left: ExperimentConfigurationV1, right: ExperimentConfigurationV1): ConfigurationComparisonRow[] {
  const a = left as unknown as Record<string, unknown>, b = right as unknown as Record<string, unknown>;
  return Object.keys(labels).filter(key => Object.hasOwn(a, key) || Object.hasOwn(b, key)).map(key => ({ key, label: labels[key],
    status: (a[key] === undefined || b[key] === undefined ? a[key] === b[key] : canonical(a[key]) === canonical(b[key])) ? 'unchanged' : 'changed',
    left: display(key, a[key]), right: display(key, b[key]) }));
}

function sets(left: readonly string[], right: readonly string[]): EvidenceSetComparison {
  const a = new Set(left), b = new Set(right);
  return { shared: [...a].filter(item => b.has(item)).sort(), leftOnly: [...a].filter(item => !b.has(item)).sort(), rightOnly: [...b].filter(item => !a.has(item)).sort() };
}
function snapshotContent(bundle: EvidenceBundleV1 | null): unknown {
  if (bundle === null) return null;
  return { version: bundle.version, queries: bundle.queries, sources: bundle.sources, findings: bundle.findings,
    unknowns: bundle.unknowns, status: bundle.status, mode: bundle.mode, limitations: bundle.limitations };
}
function freshness(bundle: EvidenceBundleV1 | null): string[] {
  if (bundle === null) return ['No evidence snapshot attached.'];
  return bundle.sources.map(source => `${source.title}: publication ${source.publishedAt ?? 'not supplied'}; snapshot verified ${source.verifiedAt}; verified replay, no live refresh.`).sort();
}
function findings(bundle: EvidenceBundleV1 | null): string[] {
  if (bundle === null) return [];
  return bundle.findings.map(finding => `${finding.classification}: ${finding.statement} [${bundle.sources.find(source => source.id === finding.sourceId)?.url}]${finding.limitations.length ? ` Limitations: ${finding.limitations.join('; ')}` : ''}`);
}

/** Describes saved input snapshots. It never calculates or predicts a social outcome. */
export function compareExperiments(left: ScenarioExperimentV1, right: ScenarioExperimentV1): ExperimentComparisonV1 {
  const a = parseExperiment(left), b = parseExperiment(right);
  const leftFreshness = freshness(a.evidence), rightFreshness = freshness(b.evidence);
  const sameScenario = a.scenarioIdentity === b.scenarioIdentity && a.question === b.question
    && (a.geometryContext?.canonicalContent ?? null) === (b.geometryContext?.canonicalContent ?? null);
  return freezeSnapshot({ version: 1, leftExperimentId: a.experimentId, rightExperimentId: b.experimentId, sameScenario,
    configurationChanges: configurationRows(a.configuration, b.configuration),
    evidence: {
      snapshotStatus: a.evidence === null && b.evidence === null ? 'missing' : canonical(snapshotContent(a.evidence)) === canonical(snapshotContent(b.evidence)) ? 'shared' : 'different',
      sources: sets((a.evidence?.sources ?? []).map(source => `${source.title} — ${source.url}`), (b.evidence?.sources ?? []).map(source => `${source.title} — ${source.url}`)),
      findings: sets(findings(a.evidence), findings(b.evidence)), gaps: sets(a.evidence?.unknowns ?? ['No evidence snapshot attached. Research is still required.'], b.evidence?.unknowns ?? ['No evidence snapshot attached. Research is still required.']),
      freshness: { status: canonical(leftFreshness) === canonical(rightFreshness) ? 'unchanged' : 'changed', left: leftFreshness, right: rightFreshness },
    },
    limitations: ['This compares configuration and evidence snapshots only. No stakeholder simulation or social outcome was generated.',
      'Shared replay sources are not new or independent confirmation. Research attempt times do not refresh source verification.',
      ...(!sameScenario ? ['These records have different questions or drawn context; their comparison is descriptive only.'] : [])],
    executionStatus: 'not-executed' });
}
