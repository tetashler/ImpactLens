import type {DetailedReportV2} from '../lib/report-detailed/contract';
import {findingEvidenceLabel,findingEvidenceDetails} from '../lib/report-detailed/finding-presentation';

export function ReportFindings({report}:{report:DetailedReportV2}){
 const evidence=new Map(report.evidence.map(item=>[item.id,item]));
 return <section className="report-findings" aria-label="Inspectable findings">
  <h3>Key findings and their evidence</h3>
  <p className="report-findings-note">References are checked against this report snapshot. Review whether they support the AI’s interpretation. Published claims, hypothetical premises and fictional discussion do not establish measured effects.</p>
  {report.findings.length<3&&<p className="report-findings-sparse">Limited evidence: {report.findings.length===0?'no inspectable findings are available':`only ${report.findings.length} finding${report.findings.length===1?'':'s'} could be linked to retained evidence`}. Further findings need more support.</p>}
  {report.findings.map((finding,index)=>{
   const items=finding.supportIds.map(id=>evidence.get(id)!);const labels=[...new Set(items.map(findingEvidenceLabel))];const prefix=`finding-${report.snapshotKey.slice(0,12)}-${finding.id}`;
   return <article className="report-finding" key={finding.id} aria-labelledby={prefix}>
    <h4 id={prefix}>Finding {index+1}</h4><p className="report-finding-text">{finding.text}</p>
    <ul className="report-finding-basis" aria-label="Evidence types">{labels.map(label=><li key={label}>{label}</li>)}</ul>
    <div className="report-finding-caveats"><strong>Limitations</strong><ul>{finding.limitations.map(text=><li key={text}>{text}</li>)}</ul><strong>Unresolved dependencies</strong>{finding.unresolvedDependencies.length?<ul>{finding.unresolvedDependencies.map(text=><li key={text}>{text}</li>)}</ul>:<p>No additional dependency was identified in this bounded report; this does not establish completeness.</p>}</div>
    <details className="report-finding-why"><summary aria-labelledby={`${prefix}-why ${prefix}`}><span id={`${prefix}-why`}>Why this finding?</span></summary>
     <p>Support IDs: {finding.supportIds.map((id,i)=><span key={id}>{i>0?', ':''}<code>{id}</code></span>)}</p>
     {items.map(item=><section className="report-finding-evidence" key={item.id} aria-label={item.label}>
      <p className="report-finding-kind">{findingEvidenceLabel(item)}</p><h5>{item.label}</h5><p><code>{item.id}</code></p><blockquote>{item.text}</blockquote>
      <dl>{findingEvidenceDetails(item).map((detail,i)=><div key={detail.label+i}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>
      {item.kind==='source-passage'&&<p><a href={item.url} target="_blank" rel="noopener noreferrer">Open published source: {item.title}</a></p>}
      <strong>Evidence limitations</strong><ul>{item.limitations.map(text=><li key={text}>{text}</li>)}</ul>
     </section>)}
    </details>
   </article>;
  })}
 </section>;
}
