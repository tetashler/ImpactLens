/** Presentation only: these helpers never assign journeys or calculate impacts. */
import type { ImpactResponse } from '../impact/api-contract.ts';
import type { ImpactMetric } from '../../prototype/agents/impact/types.ts';

export type MetricId = 'represented' | 'assigned' | 'comparable' | 'unassigned' | 'benefiting' | 'benefitShare' | 'meanSaved' | 'accessChange' | 'transferChange' | 'newlyReachable';
export type Dimension = 'ageGroup' | 'sex' | 'planningArea' | 'subzone';
export type DashboardSort = 'benefit-desc' | 'benefit-asc' | 'coverage-asc' | 'name';
export interface MetricPresentation { label: string; value: number | null; formatted: string; denominator: string; unit: string }

export function formatNumber(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('en-SG', { maximumFractionDigits: 2 }) : 'Unknown';
}
export function formatPercent(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${formatNumber(value * 100)}%` : 'Unknown';
}
const finite = (value: number | null | undefined): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const signed = (value: number | null): string => value === null ? 'Unknown' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatNumber(Math.abs(value))}`;

/** All values and denominators refer to the stored aggregate, never the profile sample. */
export function metricPresentation(report: ImpactResponse, id: MetricId, metric?: ImpactMetric): MetricPresentation {
  const m = metric ?? report.metrics.find(entry => Object.keys(entry.group).length === 0);
  const comparable = `${formatNumber(m?.benefiting.denominatorPopulation)} comparable represented residents`;
  const represented = 'represented residents';
  let label: string, value: number | null | undefined, denominator: string, unit = 'residents', signedValue = false, percentage = false;
  switch (id) {
    case 'represented': label = 'Represented population'; value = m?.coverage.representedPopulation; denominator = represented; break;
    case 'assigned': label = 'Assigned a journey'; value = m?.coverage.assignedPopulation; denominator = represented; break;
    case 'comparable': label = 'Comparable journeys'; value = m?.coverage.comparablePopulation; denominator = represented; break;
    case 'unassigned': label = 'Unassigned / outcome unknown'; value = m?.coverage.unassignedPopulation; denominator = 'represented residents; journey outcome unknown'; break;
    case 'benefiting': label = 'Benefiting population'; value = m?.weightedBenefitingPopulation; denominator = comparable; break;
    case 'benefitShare': label = 'Benefiting share'; value = m?.benefiting.value; denominator = comparable; unit = ''; percentage = true; break;
    case 'meanSaved': label = 'Mean journey-time saving'; value = m?.weightedMeanMinutesSaved; denominator = comparable; unit = 'min'; break;
    case 'accessChange': label = 'Threshold access change'; value = m?.accessibility.changePercentagePoints; denominator = `${formatNumber(m?.accessibility.baseline.denominatorPopulation)} assigned non-invalid represented residents`; unit = 'percentage points'; signedValue = true; break;
    case 'transferChange': label = 'Mean transfer change'; value = m?.weightedMeanTransferChange; denominator = comparable; unit = 'transfers'; signedValue = true; break;
    case 'newlyReachable': label = 'Newly reachable population'; value = m?.coverage.newlyReachablePopulation; denominator = `${formatNumber(m?.coverage.assignedPopulation)} assigned represented residents`; break;
  }
  const safe = finite(value);
  return { label, value: safe, formatted: percentage ? formatPercent(safe) : signedValue ? signed(safe) : formatNumber(safe), denominator, unit };
}

/** Subzones include their parent area; other views use single-dimension aggregates. */
export function groupMetrics(report: ImpactResponse, dimension: Dimension): ImpactMetric[] {
  return report.metrics.filter(m => m.group[dimension] !== undefined && (dimension === 'subzone' || Object.keys(m.group).length === 1));
}
const title = (value: string) => value.replaceAll('-', ' ').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
export function groupLabel(metric: ImpactMetric, dimension: Dimension): string {
  const value = String(metric.group[dimension] ?? 'Unknown');
  if (dimension === 'ageGroup') return value === '90andOver' ? '90+' : value.replaceAll('_', '–');
  const label = title(value);
  return dimension === 'subzone' && metric.group.planningArea ? `${label} · ${title(metric.group.planningArea)}` : label;
}
export function sortGroupMetrics(metrics: readonly ImpactMetric[], dimension: Dimension, sort: DashboardSort): ImpactMetric[] {
  const names = (a: ImpactMetric, b: ImpactMetric) => groupLabel(a, dimension).localeCompare(groupLabel(b, dimension), 'en-SG', { numeric: true });
  return [...metrics].sort((a, b) => {
    if (sort === 'name') return names(a, b);
    const av = finite(sort === 'coverage-asc' ? a.coverage.comparablePopulation : a.benefiting.value);
    const bv = finite(sort === 'coverage-asc' ? b.coverage.comparablePopulation : b.benefiting.value);
    if (av === null) return bv === null ? names(a, b) : 1;
    if (bv === null) return -1;
    return (sort === 'benefit-desc' ? bv - av : av - bv) || names(a, b);
  });
}
