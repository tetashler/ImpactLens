import {FINDING_EVIDENCE_LABELS,type ReportEvidenceItem} from './findings.ts';

export function findingEvidenceLabel(item:ReportEvidenceItem):string {
 return item.kind==='assumption'&&item.reviewStatus==='unknown'?'Rejected premise — unknown':FINDING_EVIDENCE_LABELS[item.kind];
}
export function findingEvidenceDetails(item:ReportEvidenceItem):{label:string;value:string}[]{
 switch(item.kind){
  case 'calculation':return [{label:'Calculation',value:item.metric},{label:'Value',value:`${item.value} ${item.unit==='share'?'share (0–1)':item.unit}`},{label:'Denominator',value:item.denominator===null?'Not supplied':`${item.denominator}${item.denominatorLabel?' — '+item.denominatorLabel:''}`},...item.assumptions.map(value=>({label:'Model assumption',value}))];
  case 'source-passage':return [{label:'Source ID',value:item.sourceId},{label:'Retained passage ID',value:item.passageId},{label:'Publisher',value:item.publisher},{label:'Published',value:item.publishedAt??'Date not supplied'},{label:'Retrieved',value:item.retrievedAt}];
  case 'assumption':return [{label:'Review status',value:item.reviewStatus==='allowed-hypothetical'?'Allowed as a hypothetical premise; not verified':item.reviewStatus==='unknown'?'Rejected; remains unknown, not its opposite':'Stated hypothetical premise; no review decision recorded'},...(item.assumptionId?[{label:'Assumption ID',value:item.assumptionId}]:[])];
  case 'discussion-event':return [{label:'Fictional speaker',value:item.actorLabel},{label:'Phase',value:item.phase==='initial'?'Initial public statement':'Accepted public follow-up'},{label:'Reference scope',value:'Opaque public excerpt ID for this report; private actor, node and event identifiers are excluded.'}];
  case 'model-limitation':return [{label:'Scope',value:item.scope==='healthcare-service-model'?'Healthcare service model unavailable':'Retained evidence boundary'}];
 }
}
