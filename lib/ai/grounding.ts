import type { ImpactResponse } from '../impact/api-contract.ts';
import type { CitizenProfileResponse } from '../contracts/citizen-simulation.ts';
import type { ChatSelection, ExplanationSelection } from './contracts.ts';
import { NOTES } from './contracts.ts';
import { metricPresentation } from '../dashboard/metrics.ts';
const number=(n:number|null)=>n===null?'unavailable':n.toLocaleString('en-SG',{maximumFractionDigits:2});
export function evidenceGroupIds(report:ImpactResponse):string[]{return report.metrics.slice(0,40).map((_,i)=>`g${i}`);}
export function groupLabel(group:ImpactResponse['metrics'][number]['group']):string {return Object.values(group).join(' / ').replaceAll('_','–')||'Overall';}
/** Small authoritative summary: no representative arrays, routing graph or raw sources. */
export function compactImpactContext(report:ImpactResponse) {
  return {identity:{requestId:report.identity.requestId,runId:report.identity.runId},intervention:report.payload.metadata.intervention,
    simulationDate:report.payload.metadata.simulationDate,demographicReferenceYear:report.payload.metadata.demographicReferenceYear,thresholdMinutes:report.identity.request.thresholdMinutes,
    assumptions:report.payload.assumptions.map(a=>({kind:a.kind,description:a.description})),
    sources:report.payload.sources.map(s=>({agency:s.agency,datasetId:s.datasetId,referenceYear:s.referenceYear,sourceUrl:s.sourceUrl,rawSha256:s.rawSha256})),
    metrics:report.metrics.slice(0,40).map((m,i)=>({groupId:`g${i}`,group:m.group,represented:m.coverage.representedPopulation,assigned:m.coverage.assignedPopulation,
      comparable:m.coverage.comparablePopulation,unassigned:m.coverage.unassignedPopulation,benefiting:m.weightedBenefitingPopulation,benefitShare:m.benefiting.value,
      meanSaved:m.weightedMeanMinutesSaved,transferChange:m.weightedMeanTransferChange,newlyReachable:m.coverage.newlyReachablePopulation,
      accessChange:m.accessibility.changePercentagePoints,accessDenominator:m.accessibility.baseline.denominatorPopulation,baselineAccess:m.accessibility.baseline.value,scenarioAccess:m.accessibility.scenario.value})),
    denominatorDefinitions:{benefitShare:'comparable represented population',meanSaved:'comparable represented population',transferChange:'comparable represented population',accessChange:'assigned non-invalid represented population'},
    limitations:[...Object.values(NOTES),'National rounded leaf counts 4,047,260 differ from published 4,044,210 by 3,050; no renormalisation.','GTFS median times are uncalibrated; no walking/egress, crowding or departure-clock model.']};
}
export function renderExplanation(selection:ExplanationSelection,report:ImpactResponse):string[] {
  const opening={results:'Under the declared travel-demand assumptions, these calculated results are useful to inspect.',coverage:'Check who has a comparable journey before interpreting the benefits.',limitations:'These are conditional model results, with important limits on what can be concluded.'}[selection.focus];
  return [opening,...selection.facts.map(f=>{
    const index=Number(f.groupId.slice(1)),metric=report.metrics[index];if(!metric||f.groupId!==`g${index}`)throw new Error('Unknown evidence reference');
    const p=metricPresentation(report,f.metricId,metric);return `${groupLabel(metric.group)} — ${p.label}: ${p.formatted}${p.value!==null&&p.unit?` ${p.unit}`:''}. ${p.denominator}`;
  }),...selection.notes.map(id=>NOTES[id])];
}
/** Provider chooses topics, while every rendered fact is taken from the validated profile. */
export function renderCitizenAnswer(selection:ChatSelection,profile:CitizenProfileResponse):string {
  const c=profile.citizen,j=profile.journey?.assignment==='hypothetical'?profile.journey.comparison:null;
  const topics={
    journey:!j?'I have no assigned journey, so travel time and savings are not available.':`My assigned station journey is ${j.origin} to ${j.destination}. My baseline estimate is ${number(j.baselineMinutes)}${j.baselineMinutes===null?'':' minutes'} (${j.baselineStatus}); my scenario estimate is ${number(j.scenarioMinutes)}${j.scenarioMinutes===null?'':' minutes'} (${j.scenarioStatus}). The supplied time saving is ${number(j.minutesSaved)}${j.minutesSaved===null?'':' minutes'}. These are modelled station-to-station estimates.`,
    demographics:`My generated categories are age ${c.demographic.ageGroup.replaceAll('_','–')}, sex ${c.demographic.sex}, ${c.demographic.subzoneName} in ${c.demographic.planningAreaName}. They are assigned from aggregate historical distributions, not private records.`,
    weight:`My expansion weight is ${number(c.weight)} represented residents. I am one synthetic representative; the number of visible characters is not a population denominator.`,
    source:`My demographic reference year is ${profile.metadata.demographicReferenceYear}. My profile is synthetic and grounded in the supplied aggregate source catalogue, not a survey of me.`,
    assumptions:`My journey assignment is ${profile.journey?.assignment??'unassigned'}. ${profile.assumptions.filter(a=>a.kind==='journey-assignment'||a.kind==='routing').map(a=>a.description).join(' ')} These are declared assumptions, not observed routines.`,
    transfers:!j?'Transfers are not available because I have no assigned journey.':`My baseline transfer count is ${number(j.baselineTransfers)} and scenario count is ${number(j.scenarioTransfers)}. The supplied transfer change is ${number(j.transferChange)}. Proposed-line use is ${j.usedProposedLine===null?'unavailable':j.usedProposedLine?'yes':'no'}.`,
    limits:'My exact home, daily routine and individual movement are not observed. The model does not establish real commuter benefits or long-term economic, health or social outcomes.',
    unsupported:'That personal information is not supplied. I cannot invent an employer, income, exact apartment, health condition or life story, or change the trusted simulation results.'
  };
  let answer='I’m a synthetic representative, not a real surveyed resident.';
  for(const topic of selection.topics){if(answer.length+topics[topic].length>1800){answer+=' More supplied context is available in the profile’s assumptions and provenance.';break;}answer+=` ${topics[topic]}`;}
  return answer;
}
