'use client';

import { useId, useState } from 'react';
import type { EldercareApiResponse } from '../lib/eldercare/api-contract';
import type { EldercareMetric } from '../prototype/eldercare/types';
import { formatPopulation, formatDistance, formatShare, formatPercentagePoints, metricLabel, overallMetric, groupMetrics, presentMetric } from '../lib/eldercare/dashboard';
import type { EldercareDimension, EldercareSort } from '../lib/eldercare/dashboard';
import './eldercare-dashboard.css';

interface Props { report:EldercareApiResponse; selectedThresholdMetres:number }
const dimensions:{id:EldercareDimension;label:string}[]=[{id:'ageGroup',label:'Age band'},{id:'sex',label:'Sex'},{id:'planningArea',label:'Planning area'},{id:'subzone',label:'Subzone'}];
const keyOf=(metric:EldercareMetric)=>JSON.stringify(metric.group);

/** The scale only draws stored distances; it does not calculate accessibility outcomes. */
function DistanceRail({value,maximum,scenario=false}:{value:number|null;maximum:number;scenario?:boolean}) {
  return <svg className={`aac-distance-rail${scenario?' is-scenario':''}`} viewBox="0 0 100 9" preserveAspectRatio="none" aria-hidden="true">
    <rect width="100" height="9" rx="2" className="aac-rail-track"/>
    {value!==null&&<rect width={Math.max(0,Math.min(100,value/maximum*100))} height="9" rx="2" className="aac-rail-fill"/>}
  </svg>;
}

function MetricDetails({metric,thresholdMetres}:{metric:EldercareMetric;thresholdMetres:number}) {
  const view=presentMetric(metric,thresholdMetres), threshold=view.threshold;
  return <div className="aac-group-detail">
    <h4>{metricLabel(metric)}</h4>
    <dl className="aac-detail-ledger">
      <div><dt>Age-targeted population</dt><dd>{formatPopulation(metric.population)}</dd></div>
      <div><dt>Located / comparable</dt><dd>{formatPopulation(metric.locatedPopulation)} / {formatPopulation(metric.comparablePopulation)}</dd></div>
      <div><dt>Unlocated · outcome unknown</dt><dd>{formatPopulation(metric.unlocatedPopulation)}</dd></div>
      <div><dt>Located without baseline</dt><dd>{formatPopulation(metric.baselineUnavailablePopulation)}</dd></div>
      <div><dt>Closer nearest AAC</dt><dd>{formatPopulation(metric.closerPopulation)}</dd></div>
      <div><dt>No distance improvement · comparable only</dt><dd>{formatPopulation(metric.noImprovementPopulation)}</dd></div>
      <div><dt>Mean baseline distance</dt><dd>{view.baselineDistance}<small>{view.baselineDenominator}</small></dd></div>
      <div><dt>Mean scenario distance</dt><dd>{view.scenarioDistance}<small>{view.scenarioDenominator}</small></dd></div>
      <div><dt>Mean paired reduction</dt><dd>{view.reductionDistance}<small>{view.reductionDenominator}</small></dd></div>
      <div><dt>Newly within selected threshold</dt><dd>{threshold?formatPopulation(threshold.newlyWithinPopulation):'Unknown'}</dd></div>
      <div><dt>Scenario access without a baseline</dt><dd>{threshold?formatPopulation(threshold.scenarioAccessWithoutBaselinePopulation):'Unknown'}</dd></div>
      <div><dt>Paired threshold change</dt><dd>{formatPercentagePoints(threshold?.changePercentagePoints??null)}<small>{threshold?`${formatPopulation(threshold.pairedScenarioShare.denominatorPopulation)} comparable population`:'Selected threshold is absent from this result'}</small></dd></div>
    </dl>
  </div>;
}

export default function EldercareDashboard({report,selectedThresholdMetres}:Props) {
  const id=useId();
  const [dimension,setDimension]=useState<EldercareDimension>('ageGroup');
  const [sort,setSort]=useState<EldercareSort>('group');
  const [selectedKey,setSelectedKey]=useState<string|null>(null);
  const result=report.result,overall=overallMetric(result.metrics);
  if(!overall)return <p className="aac-dashboard-empty" role="status">This result has no overall accessibility metric.</p>;
  const view=presentMetric(overall,selectedThresholdMetres),threshold=view.threshold;
  const groups=groupMetrics(result.metrics,dimension,sort);
  const selected=groups.find(metric=>keyOf(metric)===selectedKey);
  const scale=Math.max(1,overall.meanBaselineMetres.value??0,overall.meanScenarioMetres.value??0);
  const source=result.provenance.facilitySource,population=result.provenance.population;

  return <div className="aac-dashboard" aria-label="AAC geographic accessibility results" data-scenario-id={report.identity.scenarioId}>
    <header className="aac-dashboard-heading"><div><h2>AAC accessibility</h2><p>{result.intervention.name}</p></div><span className="aac-result-status">Illustrative result</span></header>
    <p className="aac-intro">Nearest AAC, before and after this proposal. Straight-line distance from public landmark proxies; Census {population.referenceYear} age bands {result.options.minimumAge}+.</p>

    <section className="aac-distance-section" aria-labelledby={`${id}-distance`}>
      <div className="aac-section-heading"><h3 id={`${id}-distance`}>Mean distance to nearest AAC</h3><span>Straight-line metres</span></div>
      <div className="aac-distance-row"><div><span>Baseline</span><strong>{view.baselineDistance}</strong></div><DistanceRail value={overall.meanBaselineMetres.value} maximum={scale}/><p>{view.baselineDenominator}</p></div>
      <div className="aac-distance-row is-scenario"><div><span>With proposal</span><strong>{view.scenarioDistance}</strong></div><DistanceRail value={overall.meanScenarioMetres.value} maximum={scale} scenario/><p>{view.scenarioDenominator}</p></div>
      <div className="aac-distance-reduction"><span>Mean paired reduction</span><strong>{view.reductionDistance}</strong><small>{view.reductionDenominator}</small></div>
      <p className="aac-caption">The paired reduction uses only residents with both distances. Baseline and scenario means may cover different populations.</p>
    </section>

    <section className="aac-coverage-section" aria-labelledby={`${id}-coverage`}>
      <h3 id={`${id}-coverage`}>Population coverage</h3>
      <dl className="aac-coverage-ledger">
        <div><dt>Age-targeted</dt><dd>{formatPopulation(overall.population)}</dd></div>
        <div><dt>Located at proxies</dt><dd>{formatPopulation(overall.locatedPopulation)}</dd></div>
        <div><dt>Before / after comparable</dt><dd>{formatPopulation(overall.comparablePopulation)}</dd></div>
        <div className="is-unknown"><dt>Unlocated · unknown outcome</dt><dd>{formatPopulation(overall.unlocatedPopulation)}</dd></div>
      </dl>
      <p className="aac-caption">Expansion-weighted population, not the number of simulated profiles. Located and comparable populations sit within the age-targeted total.</p>
      <p className="aac-unknown-note">Unlocated residents have unknown access. They are not counted as having no improvement.</p>
    </section>

    <section className="aac-access-section" aria-labelledby={`${id}-threshold`}>
      <div className="aac-section-heading"><h3 id={`${id}-threshold`}>Distance gains and threshold access</h3><span>{formatDistance(selectedThresholdMetres)} threshold</span></div>
      <dl className="aac-benefit-ledger">
        <div><dt>Closer nearest AAC</dt><dd>{formatPopulation(overall.closerPopulation)}</dd><small>Of {formatPopulation(overall.comparablePopulation)} comparable population</small></div>
        <div><dt>Newly within threshold</dt><dd>{threshold?formatPopulation(threshold.newlyWithinPopulation):'Unknown'}</dd><small>Of {formatPopulation(overall.comparablePopulation)} comparable population; above before, within after</small></div>
      </dl>
      <p className="aac-caption">A shorter distance does not always cross the selected threshold. A zero new-within count is a valid result.</p>
      {threshold?<>
        <div className="aac-share-row"><span>Baseline within {formatDistance(threshold.metres)}</span><strong>{formatShare(threshold.baselineShare.value)}</strong><small>{formatPopulation(threshold.baselineShare.numeratorPopulation)} of {formatPopulation(threshold.baselineShare.denominatorPopulation)} baseline-assessable population</small></div>
        <div className="aac-share-row is-scenario"><span>Scenario within {formatDistance(threshold.metres)}</span><strong>{formatShare(threshold.scenarioShare.value)}</strong><small>{formatPopulation(threshold.scenarioShare.numeratorPopulation)} of {formatPopulation(threshold.scenarioShare.denominatorPopulation)} scenario-assessable population</small></div>
        <div className="aac-share-row"><span>Paired coverage change</span><strong>{formatPercentagePoints(threshold.changePercentagePoints)}</strong><small>{formatShare(threshold.pairedBaselineShare.value)} to {formatShare(threshold.pairedScenarioShare.value)}; {formatPopulation(threshold.pairedScenarioShare.denominatorPopulation)} comparable population</small></div>
        <p className="aac-caption">The paired change compares the same population on both sides. The two assessable shares above can have different denominators.</p>
        <div className="aac-no-baseline"><strong>{formatPopulation(threshold.scenarioAccessWithoutBaselinePopulation)}</strong><span>within threshold in the scenario without a baseline distance. Reported separately from newly within.</span></div>
      </>:<p className="aac-unknown-note" role="status">Unknown threshold access: {formatDistance(selectedThresholdMetres)} is absent from this stored result. Run the scenario with this threshold to compare coverage.</p>}
      <p className="aac-caption">{formatPopulation(overall.noImprovementPopulation)} comparable population with no distance improvement. {formatPopulation(overall.baselineUnavailablePopulation)} located population without a baseline; their distance change is unknown.</p>
    </section>

    <section className="aac-groups-section" aria-labelledby={`${id}-groups`}>
      <div className="aac-section-heading"><h3 id={`${id}-groups`}>Compare groups</h3><span>{groups.length} groups</span></div>
      <div className="aac-group-controls"><label htmlFor={`${id}-dimension`}>Group by<select id={`${id}-dimension`} value={dimension} onChange={event=>{setDimension(event.target.value as EldercareDimension);setSelectedKey(null);}}>{dimensions.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label htmlFor={`${id}-sort`}>Sort by<select id={`${id}-sort`} value={sort} onChange={event=>setSort(event.target.value as EldercareSort)}><option value="group">Group order</option><option value="closer">Most population closer</option><option value="reduction">Largest mean reduction</option><option value="unlocated">Most unlocated population</option></select></label></div>
      <p className="aac-caption">Each dimension reuses the stored group metrics. Age, sex and geographic groups overlap; do not add them together.</p>
      <div className="aac-table-scroll" tabIndex={0} role="region" aria-label="Accessibility metrics by population group"><table className="aac-group-table"><caption>{dimensions.find(item=>item.id===dimension)?.label} accessibility; weighted population and straight-line metres</caption><thead><tr><th scope="col">Group / details</th><th scope="col">Closer</th><th scope="col">Mean reduction</th><th scope="col">Newly within</th><th scope="col">Unlocated</th></tr></thead><tbody>{groups.map(metric=>{const item=presentMetric(metric,selectedThresholdMetres);return <tr key={keyOf(metric)} className={selected===metric?'is-selected':''}><th scope="row"><button type="button" aria-pressed={selected===metric} onClick={()=>setSelectedKey(selected===metric?null:keyOf(metric))}>{metricLabel(metric)}</button></th><td>{formatPopulation(metric.closerPopulation)}</td><td>{item.reductionDistance}</td><td>{item.threshold?formatPopulation(item.threshold.newlyWithinPopulation):'Unknown'}</td><td>{formatPopulation(metric.unlocatedPopulation)}</td></tr>;})}</tbody></table>{groups.length===0&&<p className="aac-caption">No stored groups for this dimension.</p>}</div>
      {selected&&<MetricDetails metric={selected} thresholdMetres={selectedThresholdMetres}/>}
    </section>

    <section className="aac-evidence-section" aria-label="Model limits and source provenance">
      <div className="aac-capacity-note"><h3>Geographic access is not service allocation</h3><p>Existing capacity is unknown for {formatPopulation(result.capacity.existingUnknownCount)} included AACs. Proposed capacity: {result.capacity.proposedAssumedUsers===null?'unknown':`${formatPopulation(result.capacity.proposedAssumedUsers)} users, illustrative assumption`}. Capacity does not cap these access figures. Attendance, utilisation and placements are not modelled.</p></div>
      <details><summary>Assumptions and limits</summary><ul>{report.limitations.map(note=><li key={note}>{note}</li>)}</ul><p>Thresholds are scenario assumptions, not official AAC service standards. Age targeting does not confirm eligibility. Reference date: {result.options.referenceDate}; no ageing-forward projection.</p><p>Existing centres: {result.options.existingAvailability==='assume-listed-available'?'listed centres assumed available':'unconfirmed listed centres excluded'}. Proposed AAC: {result.intervention.availability==='assumed-available'?'assumed available':'assumed unavailable'}.</p><p>{result.intervention.rationale}</p>{result.intervention.assumptions.map(item=><p key={item.id}>{item.description}</p>)}{result.intervention.capacity&&<p>Capacity assumption: {result.intervention.capacity.rationale}</p>}</details>
      <details><summary>Sources and location coverage</summary><p><a href={source.url} target="_blank" rel="noreferrer">{source.agency} facility source</a> · catalogue updated {source.catalogueUpdated}; accessed {source.accessedDate}. Historical coordinates and unconfirmed current opening status. {source.scope}</p><p><a href={population.sourceUrl} target="_blank" rel="noreferrer">{population.agency} population source</a> · reference year {population.referenceYear}; updated {population.updated}. Seed: {result.provenance.populationSeed}; {formatPopulation(result.provenance.inputAgentCount)} simulated profiles.</p><p><a href={source.licenceUrl} target="_blank" rel="noreferrer">Facility data licence</a> · <a href={population.licenceUrl} target="_blank" rel="noreferrer">Population data licence</a></p><h4>Origin proxies</h4>{result.provenance.originReferences.map(origin=><p key={origin.id}><a href={origin.provenance.sourceUrl} target="_blank" rel="noreferrer">{origin.id}</a>: {origin.provenance.description} ({origin.provenance.referenceDate}).</p>)}<h4>Operator corroboration</h4>{result.provenance.corroborations.map(item=><p key={item.sourceFeatureId}><a href={item.evidenceUrl} target="_blank" rel="noreferrer">{item.name}</a> · checked {item.checkedDate}</p>)}<h4>Unlocated geographies</h4>{result.unlocatedGeographies.length===0?<p>No unlocated population in this result.</p>:<ul>{result.unlocatedGeographies.map(item=><li key={`${item.planningArea}/${item.subzone}`}>{metricLabel({...overall,group:{planningArea:item.planningArea,subzone:item.subzone}})}: {formatPopulation(item.population)} population; access unknown.</li>)}</ul>}<p className="aac-scenario-id">Scenario: {report.identity.scenarioId}</p></details>
    </section>
  </div>;
}
