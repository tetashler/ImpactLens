import {DETAILED_REPORT_LABELS,DETAILED_REPORT_SECTION_KEYS,type DetailedReport} from './contract.ts';

const htmlText=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const markdownText=(value:string)=>value.replace(/[\\`*_{}\[\]()<>#+.!|~]/g,'\\$&').replace(/^(\s*)-/gm,'$1\\-');
const statusText=(report:DetailedReport)=>`${report.runStatus}${report.runStatus==='completed'?'':' — partial simulation snapshot'}`;

/** Export only the saved public report, never the run's access token or evidence pack. */
export function reportToMarkdown(report:DetailedReport):string {
 return ['# ImpactLens detailed report','',`**Question:** ${markdownText(report.question)}`,'',`**Generated:** ${report.generatedAt}`,'',`**Run status:** ${markdownText(statusText(report))}`,'','Participants and discussions are fictional. This report describes a simulation, not a prediction.',...DETAILED_REPORT_SECTION_KEYS.flatMap(key=>['',`## ${DETAILED_REPORT_LABELS[key]}`,'',markdownText(report.sections[key])]),''].join('\n');
}

/** A standalone, escaped document for the browser's Print / Save as PDF dialog. */
export function reportToPrintHtml(report:DetailedReport):string {
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ImpactLens detailed report</title><style>body{margin:0 auto;padding:40px 28px;max-width:760px;font:16px/1.65 Georgia,serif;color:#172b35;background:white}h1,h2,.metadata{font-family:Arial,sans-serif}h1{font-size:30px;line-height:1.2}h2{font-size:21px;line-height:1.3;margin:30px 0 10px;break-after:avoid}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 16px}.question{font-size:20px}.metadata{font-size:13px;color:#43545d}.note{font-size:14px;color:#43545d}@page{size:auto;margin:18mm}@media print{body{padding:0;max-width:none}h1,h2{break-after:avoid}p{orphans:3;widows:3}}</style></head><body><main><h1>ImpactLens detailed report</h1><p class="question">${htmlText(report.question)}</p><p class="metadata">Generated: ${htmlText(report.generatedAt)}\nRun status: ${htmlText(statusText(report))}</p><p class="note">Participants and discussions are fictional. This report describes a simulation, not a prediction.</p>${DETAILED_REPORT_SECTION_KEYS.map(key=>`<section><h2>${htmlText(DETAILED_REPORT_LABELS[key])}</h2><p>${htmlText(report.sections[key])}</p></section>`).join('')}</main></body></html>`;
}

export function reportDownloadFilename(report:DetailedReport,extension:'md'|'html'):string {
 const run=report.runId.replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'report';
 const date=/^\d{4}-\d{2}-\d{2}/.exec(report.generatedAt)?.[0]||'undated';
 return `impactlens-detailed-${run}-${date}.${extension==='md'?'md':'html'}`;
}
