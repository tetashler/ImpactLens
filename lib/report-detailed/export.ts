import {DETAILED_REPORT_LABELS,DETAILED_REPORT_SECTION_KEYS,parseDetailedReport,type DetailedReport,type DetailedReportV2} from './contract.ts';
import {findingEvidenceLabel,findingEvidenceDetails} from './finding-presentation.ts';

const htmlText=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const markdownText=(value:string)=>value.replace(/[\\`*_{}\[\]()<>#+.!|~]/g,'\\$&').replace(/^(\s*)-/gm,'$1\\-');
const statusText=(report:DetailedReport)=>`${report.runStatus}${report.runStatus==='completed'?'':' — partial simulation snapshot'}`;
const traceabilityNote='References are checked against this report snapshot. Review whether they support the AI interpretation; an ID match does not establish factual faithfulness.';
function findingsMarkdown(report:DetailedReportV2):string[]{
 const evidence=new Map(report.evidence.map(item=>[item.id,item]));
 return ['', '## Inspectable findings','',traceabilityNote,...(report.findings.length<3?['',`Limited evidence: ${report.findings.length} supported finding(s) could be linked; further findings need more evidence.`]:[]),...report.findings.flatMap((finding,index)=>[
  '',`### Finding ${index+1} (${finding.id})`,'',markdownText(finding.text),'',`**Evidence types:** ${[...new Set(finding.supportIds.map(id=>findingEvidenceLabel(evidence.get(id)!)))].join('; ')}`,`**Support IDs:** ${finding.supportIds.map(id=>'`'+id+'`').join(', ')}`,'','**Limitations:**',...finding.limitations.map(text=>'- '+markdownText(text)),'','**Unresolved dependencies:**',...(finding.unresolvedDependencies.length?finding.unresolvedDependencies.map(text=>'- '+markdownText(text)):['No additional dependency identified in this bounded report; completeness is not established.']),
 ])];
}
function evidenceMarkdown(report:DetailedReportV2):string[]{return ['','## Supporting evidence',...report.evidence.flatMap(item=>[
 '',`### ${item.id} — ${findingEvidenceLabel(item)}`,'',markdownText(item.label),'',markdownText(item.text),'',...findingEvidenceDetails(item).map(detail=>`**${detail.label}:** ${markdownText(detail.value)}`),...(item.kind==='source-passage'?['',`[Open published source](<${item.url}>)`]:[]),'','**Evidence limitations:**',...item.limitations.map(text=>'- '+markdownText(text)),
 ])];}
function findingsHtml(report:DetailedReportV2):string{
 const evidence=new Map(report.evidence.map(item=>[item.id,item]));
 return `<section><h2>Inspectable findings</h2><p class="note">${htmlText(traceabilityNote)}</p>${report.findings.length<3?`<p class="note">Limited evidence: ${report.findings.length} supported finding(s) could be linked; further findings need more evidence.</p>`:''}${report.findings.map((finding,index)=>`<article><h3>Finding ${index+1} (${htmlText(finding.id)})</h3><p>${htmlText(finding.text)}</p><p class="note">Evidence types: ${htmlText([...new Set(finding.supportIds.map(id=>findingEvidenceLabel(evidence.get(id)!)))].join('; '))}\nSupport IDs: ${htmlText(finding.supportIds.join(', '))}</p><h4>Limitations</h4><ul>${finding.limitations.map(text=>`<li>${htmlText(text)}</li>`).join('')}</ul><h4>Unresolved dependencies</h4>${finding.unresolvedDependencies.length?`<ul>${finding.unresolvedDependencies.map(text=>`<li>${htmlText(text)}</li>`).join('')}</ul>`:'<p>No additional dependency identified in this bounded report; completeness is not established.</p>'}</article>`).join('')}</section>`;
}
function evidenceHtml(report:DetailedReportV2):string{return `<section><h2>Supporting evidence</h2>${report.evidence.map(item=>`<article><h3>${htmlText(item.id)} — ${htmlText(findingEvidenceLabel(item))}</h3><p>${htmlText(item.label)}</p><blockquote>${htmlText(item.text)}</blockquote><dl>${findingEvidenceDetails(item).map(detail=>`<dt>${htmlText(detail.label)}</dt><dd>${htmlText(detail.value)}</dd>`).join('')}</dl>${item.kind==='source-passage'?`<p><a href="${htmlText(item.url)}" rel="noopener noreferrer">Open published source: ${htmlText(item.title)}</a></p>`:''}<h4>Evidence limitations</h4><ul>${item.limitations.map(text=>`<li>${htmlText(text)}</li>`).join('')}</ul></article>`).join('')}</section>`;}

/** Export only the saved public report, never the run's access token or evidence pack. */
export function reportToMarkdown(report:DetailedReport):string {
 if(report.version===2)report=parseDetailedReport(report);
 return ['# ImpactLens detailed report','',`**Question:** ${markdownText(report.question)}`,'',`**Generated:** ${report.generatedAt}`,'',`**Run status:** ${markdownText(statusText(report))}`,'','Participants and discussions are fictional. This report describes a simulation, not a prediction.',...(report.version===2?findingsMarkdown(report):[]),...DETAILED_REPORT_SECTION_KEYS.flatMap(key=>['',`## ${DETAILED_REPORT_LABELS[key]}`,'',markdownText(report.sections[key])]),...(report.version===2?evidenceMarkdown(report):[]),''].join('\n');
}

/** A standalone, escaped document for the browser's Print / Save as PDF dialog. */
export function reportToPrintHtml(report:DetailedReport):string {
 if(report.version===2)report=parseDetailedReport(report);
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ImpactLens detailed report</title><style>body{margin:0 auto;padding:40px 28px;max-width:760px;font:16px/1.65 Georgia,serif;color:#172b35;background:white}h1,h2,h3,h4,.metadata{font-family:Arial,sans-serif}h1{font-size:30px;line-height:1.2}h2{font-size:21px;line-height:1.3;margin:30px 0 10px;break-after:avoid}h3{font-size:18px;margin-top:22px}h4{font-size:15px}p,blockquote,dd,li{white-space:pre-wrap;overflow-wrap:anywhere}p{margin:0 0 16px}blockquote{margin:12px 0;padding-left:14px;border-left:3px solid #7896a0}dt{font-weight:bold}dd{margin:0 0 10px}.question{font-size:20px}.metadata{font-size:13px;color:#43545d}.note{font-size:14px;color:#43545d}@page{size:auto;margin:18mm}@media print{body{padding:0;max-width:none}h1,h2,h3,h4{break-after:avoid}p{orphans:3;widows:3}}</style></head><body><main><h1>ImpactLens detailed report</h1><p class="question">${htmlText(report.question)}</p><p class="metadata">Generated: ${htmlText(report.generatedAt)}\nRun status: ${htmlText(statusText(report))}</p><p class="note">Participants and discussions are fictional. This report describes a simulation, not a prediction.</p>${report.version===2?findingsHtml(report):''}${DETAILED_REPORT_SECTION_KEYS.map(key=>`<section><h2>${htmlText(DETAILED_REPORT_LABELS[key])}</h2><p>${htmlText(report.sections[key])}</p></section>`).join('')}${report.version===2?evidenceHtml(report):''}</main></body></html>`;
}

export function reportDownloadFilename(report:DetailedReport,extension:'md'|'html'):string {
 const run=report.runId.replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'report';
 const date=/^\d{4}-\d{2}-\d{2}/.exec(report.generatedAt)?.[0]||'undated';
 return `impactlens-detailed-${run}-${date}.${extension==='md'?'md':'html'}`;
}
