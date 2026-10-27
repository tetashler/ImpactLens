'use client';

import { useId, useState,type ReactNode } from 'react';
import type { ImpactResponse } from '../lib/impact/api-contract';
import type { ImpactMetric } from '../prototype/agents/impact/types';
import type { DashboardLayout } from '../lib/ai/contracts';
import { NOTES } from '../lib/ai/contracts';
import { formatNumber, formatPercent, groupLabel, groupMetrics, metricPresentation, sortGroupMetrics } from '../lib/dashboard/metrics';
import type { DashboardSort, Dimension, MetricId } from '../lib/dashboard/metrics';
import './dashboard.css';

interface Props { report: ImpactResponse; layout: DashboardLayout; children?:ReactNode }
const dimensions: { id: Dimension; label: string }[] = [
  { id: 'ageGroup', label: 'Age band' }, { id: 'sex', label: 'Sex' },
  { id: 'planningArea', label: 'Area' }, { id: 'subzone', label: 'Subzone' },
];
const keyOf = (metric: ImpactMetric) => JSON.stringify(metric.group);
const known = (value: number | null) => value !== null && Number.isFinite(value);

/** A drawing scale only; displayed outcomes always come from the stored report. */
function Bar({ value, maximum = 1, coverage = false }: { value: number | null; maximum?: number; coverage?: boolean }) {
  const width = known(value) && maximum > 0 ? Math.max(0, Math.min(100, value! / maximum * 100)) : null;
  return <svg className={`dashboard-bar${width === null ? ' is-unknown' : ''}${coverage ? ' is-coverage' : ''}`} viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
    <rect className="dashboard-bar-track" x="0" y="0" width="100" height="8" rx="1"/>
    {[0, 25, 50, 75, 100].map(x => <line key={x} x1={x} x2={x} y1="0" y2="8" className="dashboard-bar-grid"/>)}
    {width !== null && <rect className="dashboard-bar-fill" x="0" y="1" width={width} height="6" rx=".6"/>}
    <line x1="0" x2="0" y1="0" y2="8" className="dashboard-bar-zero"/>
  </svg>;
}

function MetricTile({ report, id }: { report: ImpactResponse; id: MetricId }) {
  const item = metricPresentation(report, id);
  return <div className={`dashboard-kpi${id === 'unassigned' ? ' dashboard-kpi-unknown' : ''}`}>
    <dt>{item.label}</dt>
    <dd className={item.value === null ? 'dashboard-unknown' : ''}>{item.formatted}{item.value !== null && item.unit && <span>{item.unit}</span>}</dd>
    <p>{item.denominator}</p>
  </div>;
}

function Accessibility({ report, metric }: { report: ImpactResponse; metric: ImpactMetric }) {
  const a = metric.accessibility;
  return <section className="dashboard-access" aria-label="Journey-time threshold accessibility">
    <div className="dashboard-section-heading"><h3>Within {formatNumber(a.thresholdMinutes)} minutes</h3><span>Station to station</span></div>
    <div className="dashboard-access-row"><span>Baseline</span><strong>{formatPercent(a.baseline.value)}</strong><Bar value={a.baseline.value}/></div>
    <div className="dashboard-access-row is-scenario"><span>Scenario</span><strong>{formatPercent(a.scenario.value)}</strong><Bar value={a.scenario.value}/></div>
    <div className="dashboard-axis"><span>0%</span><span>50%</span><span>100%</span></div>
    <p className="dashboard-access-change">{metricPresentation(report, 'accessChange', metric).formatted} <span>percentage points</span></p>
    <p className="dashboard-caption">Of {formatNumber(a.baseline.denominatorPopulation)} assigned non-invalid represented residents. Walking and egress time are excluded.</p>
  </section>;
}

export function ImpactDashboard({ report, layout, children }: Props) {
  const id = useId();
  const configKey = JSON.stringify(layout.chart);
  const [override, setOverride] = useState<{ key: string; dimension: Dimension; sort: DashboardSort; type: DashboardLayout['chart']['type'] } | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const chart = override?.key === configKey ? override : layout.chart;
  const setChart = (change: Partial<typeof layout.chart>) => {
    setOverride({ key: configKey, dimension: chart.dimension, sort: chart.sort, type: chart.type, ...change });
    setSelectedKey(null);
  };
  const overall = report.metrics.find(m => Object.keys(m.group).length === 0);
  if (!overall) return <p className="dashboard-empty" role="status">No aggregate metrics are available for this report.</p>;
  const groups = sortGroupMetrics(groupMetrics(report, chart.dimension), chart.dimension, chart.sort);
  const selected = groups.find(m => keyOf(m) === selectedKey);
  const coverage = chart.type === 'coverage-bars';
  const maximum = coverage ? Math.max(0, ...groups.map(m => Number.isFinite(m.coverage.representedPopulation) ? m.coverage.representedPopulation : 0)) : 1;
  const notes = [...new Set(['assumed-demand', 'unknown-outcomes', ...layout.notes, 'no-causality'] as const)];

  return <div className="impact-dashboard" aria-label="Demographic impact dashboard" data-run-id={report.identity.runId}>
    <header className="dashboard-heading"><h2>{layout.title}</h2><p>Modelled journeys · {report.payload.metadata.simulationDate}</p></header>

    <section className="dashboard-coverage" aria-labelledby={`${id}-coverage`}>
      <h3 id={`${id}-coverage`}>Coverage before conclusions</h3>
      <dl className="dashboard-coverage-ledger">
        {(['represented', 'assigned', 'comparable', 'unassigned'] as const).map(metricId => {
          const item = metricPresentation(report, metricId);
          return <div key={metricId} className={`dashboard-coverage-${metricId}`}><dt><i aria-hidden="true"/>{item.label}</dt><dd>{item.formatted}</dd></div>;
        })}
      </dl>
      <dl className="dashboard-outcomes"><div><dt>Newly reachable</dt><dd>{formatNumber(overall.coverage.newlyReachablePopulation)}</dd></div><div><dt>Unreachable / unavailable</dt><dd>{formatNumber(overall.coverage.unreachablePopulation)}</dd></div><div><dt>Invalid assigned journeys</dt><dd>{formatNumber(overall.coverage.invalidPopulation)}</dd></div></dl>
      <p className="dashboard-caption">Population figures are expansion-weighted residents, not sampled profile counts. Assigned and comparable populations are nested within the represented population.</p>
      <p className="dashboard-unknown-note"><strong>{formatNumber(overall.coverage.unassignedPopulation)} unassigned</strong> residents have unknown journey outcomes. Unreachable and invalid journeys also have no comparable saving.</p>
    </section>

    <dl className="dashboard-kpis" aria-label="Selected impact metrics">{layout.kpis.map(metricId => <MetricTile key={metricId} report={report} id={metricId}/>)}</dl>
    {children}

    <section className="dashboard-groups" aria-labelledby={`${id}-groups`}>
      <div className="dashboard-section-heading"><h3 id={`${id}-groups`}>Compare population groups</h3><span>{groups.length} groups</span></div>
      <div className="dashboard-dimensions" role="group" aria-label="Compare demographic dimension">
        {dimensions.map(d => <button key={d.id} type="button" aria-pressed={chart.dimension === d.id} onClick={() => setChart({ dimension: d.id })}>{d.label}</button>)}
      </div>
      <div className="dashboard-chart-controls">
        <label htmlFor={`${id}-measure`}>Show<select id={`${id}-measure`} value={chart.type} onChange={e => setChart({ type: e.target.value as typeof chart.type })}><option value="benefit-bars">Benefiting share</option><option value="coverage-bars">Comparable coverage</option></select></label>
        <label htmlFor={`${id}-sort`}>Order<select id={`${id}-sort`} value={chart.sort} onChange={e => setChart({ sort: e.target.value as DashboardSort })}><option value="benefit-desc">Highest benefit</option><option value="benefit-asc">Lowest benefit</option><option value="coverage-asc">Fewest comparable</option><option value="name">Group name</option></select></label>
      </div>
      <p className="dashboard-chart-basis">{coverage ? 'Comparable population, on one shared resident scale.' : 'Benefiting share of each group’s comparable population.'}</p>
      <div className="dashboard-axis" aria-hidden="true"><span>{coverage ? '0 residents' : '0%'}</span><span>{coverage ? formatNumber(maximum / 2) : '50%'}</span><span>{coverage ? formatNumber(maximum) : '100%'}</span></div>
      <div className="dashboard-bars" aria-label={coverage ? 'Comparable population by group' : 'Benefiting share by group'}>
        {groups.map(m => {
          const value = coverage ? m.coverage.comparablePopulation : m.benefiting.value;
          const label = groupLabel(m, chart.dimension);
          return <button className="dashboard-group" type="button" key={keyOf(m)} aria-pressed={keyOf(m) === selectedKey} aria-controls={`${id}-detail`} onClick={() => setSelectedKey(keyOf(m) === selectedKey ? null : keyOf(m))}>
            <span className="dashboard-group-label">{label}</span><strong className={!known(value) ? 'dashboard-unknown' : ''}>{coverage ? formatNumber(value) : formatPercent(value)}</strong>
            <Bar value={value} maximum={maximum} coverage={coverage}/>
            <span className="dashboard-group-denominator">{formatNumber(m.coverage.comparablePopulation)} comparable / {formatNumber(m.coverage.representedPopulation)} represented</span>
          </button>;
        })}
      </div>
      {groups.length === 0 && <p className="dashboard-empty">This report has no groups for this dimension. Select another dimension.</p>}
      <p className="dashboard-caption">Select a bar to inspect the group. A zero share means no comparable journey benefited; “Unknown” means no comparable denominator. Groups across dimensions overlap.</p>
      <div id={`${id}-detail`}>
        {selected && <section className="dashboard-group-detail" aria-label={`Details for ${groupLabel(selected, chart.dimension)}`}>
          <div className="dashboard-section-heading"><h3>{groupLabel(selected, chart.dimension)}</h3><button type="button" onClick={() => setSelectedKey(null)} aria-label="Close group details">Close</button></div>
          <dl className="dashboard-detail-ledger">{(['represented', 'assigned', 'comparable', 'unassigned', 'benefitShare', 'meanSaved', 'transferChange', 'newlyReachable'] as const).map(metricId => {
            const item = metricPresentation(report, metricId, selected);
            return <div key={metricId}><dt>{item.label}</dt><dd>{item.formatted}{item.value !== null && item.unit && ` ${item.unit}`}</dd></div>;
          })}<div><dt>Unreachable population</dt><dd>{formatNumber(selected.coverage.unreachablePopulation)}</dd></div><div><dt>Invalid assigned population</dt><dd>{formatNumber(selected.coverage.invalidPopulation)}</dd></div></dl>
          <p className="dashboard-caption">Benefit, saving and mean transfer change: {formatNumber(selected.benefiting.denominatorPopulation)} comparable represented residents. Negative transfer change means fewer transfers.</p>
          <Accessibility report={report} metric={selected}/>
        </section>}
      </div>
      <details className="dashboard-exact"><summary>Compare exact group figures</summary>
        <div className="dashboard-table-scroll" role="region" tabIndex={0} aria-label="Scrollable group comparison table"><table>
          <caption>Stored weighted aggregates. Unknown values are not zero.</caption>
          <thead><tr><th scope="col">Group</th><th scope="col">Represented</th><th scope="col">Comparable</th><th scope="col">Unknown / unassigned</th><th scope="col">Benefit share</th><th scope="col">Mean saved</th><th scope="col">Mean transfer change</th></tr></thead>
          <tbody>{groups.map(m => <tr key={keyOf(m)}><th scope="row">{groupLabel(m, chart.dimension)}</th><td>{formatNumber(m.coverage.representedPopulation)}</td><td>{formatNumber(m.coverage.comparablePopulation)}</td><td>{formatNumber(m.coverage.unassignedPopulation)}</td><td>{formatPercent(m.benefiting.value)}</td><td>{metricPresentation(report, 'meanSaved', m).formatted}</td><td>{metricPresentation(report, 'transferChange', m).formatted}</td></tr>)}</tbody>
        </table></div><p className="dashboard-caption">Mean saved is minutes; transfer change is scenario minus baseline. Both use each group’s comparable represented population.</p>
      </details>
    </section>

    <Accessibility report={report} metric={overall}/>
    <section className="dashboard-transfers" aria-label="Weighted transfer change"><div><span>Mean transfer change</span><strong>{metricPresentation(report, 'transferChange').formatted}<small> transfers</small></strong></div><p className="dashboard-caption">Weighted across {formatNumber(overall.benefiting.denominatorPopulation)} comparable represented residents. Negative means fewer transfers; zero means no mean change.</p></section>

    <section className="dashboard-limits" aria-labelledby={`${id}-limits`}><h3 id={`${id}-limits`}>Read these results with their limits</h3><ul>{notes.map(note => <li key={note}>{NOTES[note]}</li>)}</ul>
      <p className="dashboard-source">Demographic reference: Census {report.payload.metadata.demographicReferenceYear}. {report.payload.sources.map((source, index) => <span key={source.id}>{index > 0 && '; '}<a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.agency} ({source.referenceYear})</a></span>)}</p>
    </section>
  </div>;
}

export default ImpactDashboard;
