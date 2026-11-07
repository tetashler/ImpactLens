import type {DetailedReportV2} from '../../../report-detailed/contract.ts';

/** Public-only offline fixture. The source excerpt is test data, not a claim about the linked website. */
export function inspectableReportFixture():DetailedReportV2{return {
 version:2,runId:'inspectable-report',snapshotKey:'a'.repeat(64),generatedAt:'2026-11-07T08:00:00.000Z',question:'What if a new polyclinic was built at the marked point?',runStatus:'paused',
 sections:{assessment:'The proposal needs further evidence.',impacts:'Only illustrative commute effects were calculated.',perspectives:'The fictional discussion raised operating constraints.',tradeoffs:'Service access depends on operating conditions.',developments:'The available public excerpt is bounded.',nextSteps:'Review the premises and obtain a service model.'},
 findings:[
  {id:'finding-1',text:'Staffing could constrain this proposal.',supportIds:['source-staff','assumption-staff','event-staff'],limitations:['These references do not establish an actual staffing shortage.'],unresolvedDependencies:['Local workforce and service-planning evidence is required.']},
  {id:'finding-2',text:'The illustrative commute model estimates a reduction of 2.5 minutes.',supportIds:['calc-minutes'],limitations:['This is a modeled commute estimate, not an observed healthcare effect.'],unresolvedDependencies:[]},
  {id:'finding-3',text:'Waiting-time improvement remains unknown without a service model.',supportIds:['limit-healthcare'],limitations:['Location and fictional discussion do not calculate service effects.'],unresolvedDependencies:['A demand, staffing and treatment-capacity model is needed.']},
 ],
 evidence:[
  {id:'source-staff',kind:'source-passage',label:'Published test excerpt',text:'Fixture published claim: operating plans require an appropriate workforce.',limitations:['Attributed source claim; not independently verified.'],sourceId:'source1',passageId:'passage-'+ 'b'.repeat(32),title:'Fixture workforce context',url:'https://www.moh.gov.sg/',publisher:'www.moh.gov.sg',publishedAt:null,retrievedAt:'2026-11-07T00:00:00.000Z'},
  {id:'assumption-staff',kind:'assumption',label:'Allowed hypothetical premise',text:'The proposed clinic would need a staffing plan.',limitations:['Approval permits a hypothetical premise; it does not verify it.'],assumptionId:'staffing',reviewStatus:'allowed-hypothetical'},
  {id:'event-staff',kind:'discussion-event',label:'Fictional public statement',text:'Fictional test participant: staffing arrangements need further discussion.',limitations:['Fictional statement, not measured public opinion.'],phase:'initial',actorLabel:'Fictional resident'},
  {id:'calc-minutes',kind:'calculation',label:'Mean minutes saved',text:'Illustrative mean minutes saved: 2.5 minutes.',limitations:['Synthetic commute model under stated assumptions.'],metric:'meanMinutesSaved',value:2.5,unit:'minutes',denominator:1000,denominatorLabel:'Comparable population weight',assumptions:['Static travel-time assumptions.']},
  {id:'limit-healthcare',kind:'model-limitation',label:'Healthcare effects were not calculated',text:'No healthcare service model is supplied. Waiting times, capacity and health outcomes remain unknown.',limitations:['This is a model boundary, not a prediction.'],scope:'healthcare-service-model'},
 ],
};}
