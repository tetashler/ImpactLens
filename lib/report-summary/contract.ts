/** Browser-safe derived narrative. All text renders as plain text, never HTML. */
export const REPORT_SUMMARY_VERSION = 1 as const;
export const REPORT_SUMMARY_PROMPT_VERSION = 'report-summary-v2-discussion';
export const REPORT_SECTION_KEYS = ['findings', 'agreements', 'disagreements', 'concerns', 'unknowns'] as const;
export type ReportSections = Record<typeof REPORT_SECTION_KEYS[number], string>;
export interface ReportNodeSummary {nodeId:string;summary:string}
export interface ReportNarrative {sections:ReportSections;nodeSummaries:ReportNodeSummary[]}
export interface ReportSummary {
  version: 1;
  runId: string;
  snapshotKey: string;
  generatedAt: string;
  sections: ReportSections;
  nodeSummaries?: ReportNodeSummary[];
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('REPORT_SUMMARY_SHAPE');
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) throw Error('REPORT_SUMMARY_SHAPE');
}
export function parseReportSections(value: unknown): ReportSections {
  const sections = record(value);
  exact(sections, REPORT_SECTION_KEYS);
  const parsed = {} as ReportSections;
  for (const key of REPORT_SECTION_KEYS) {
    const text = sections[key];
    if (typeof text !== 'string' || !text.trim() || text.length > 2400 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw Error('REPORT_SUMMARY_TEXT');
    parsed[key] = text.trim();
  }
  if (new TextEncoder().encode(JSON.stringify(parsed)).length > 18000) throw Error('REPORT_SUMMARY_SIZE');
  return parsed;
}
export function parseReportSummary(value: unknown): ReportSummary {
  const r = record(value);
  exact(r, ['version', 'runId', 'snapshotKey', 'generatedAt', 'sections',...(Object.hasOwn(r,'nodeSummaries')?['nodeSummaries']:[])]);
  if (r.version !== 1 || typeof r.runId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(r.runId) || typeof r.snapshotKey !== 'string' || !/^[a-f0-9]{64}$/.test(r.snapshotKey) || typeof r.generatedAt !== 'string' || r.generatedAt.length > 32 || !Number.isFinite(Date.parse(r.generatedAt))) throw Error('REPORT_SUMMARY_IDENTITY');
  return {version: 1, runId: r.runId, snapshotKey: r.snapshotKey, generatedAt: r.generatedAt, sections: parseReportSections(r.sections),...(r.nodeSummaries!==undefined?{nodeSummaries:parseReportNodeSummaries(r.nodeSummaries)}:{})};
}

export function parseReportNodeSummaries(value:unknown,allowedNodeIds?:ReadonlySet<string>):ReportNodeSummary[]{
 if(!Array.isArray(value)||value.length>16)throw Error('REPORT_NODES_SHAPE');
 const seen=new Set<string>();
 return value.map(item=>{const n=record(item);exact(n,['nodeId','summary']);
  if(typeof n.nodeId!=='string'||!n.nodeId.trim()||n.nodeId.length>200||seen.has(n.nodeId)||allowedNodeIds&&!allowedNodeIds.has(n.nodeId)||typeof n.summary!=='string'||!n.summary.trim()||n.summary.length>650||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(n.summary))throw Error('REPORT_NODES_TEXT');
  seen.add(n.nodeId);return {nodeId:n.nodeId,summary:n.summary.trim()};
 });
}
export function parseReportNarrative(value:unknown,allowedNodeIds?:ReadonlySet<string>):ReportNarrative{
 const r=record(value);exact(r,[...REPORT_SECTION_KEYS,'nodeSummaries']);
 const nodeSummaries=parseReportNodeSummaries(r.nodeSummaries,allowedNodeIds);
 if(allowedNodeIds&&nodeSummaries.length!==allowedNodeIds.size)throw Error('REPORT_NODES_SHAPE');
 return {sections:parseReportSections(Object.fromEntries(REPORT_SECTION_KEYS.map(k=>[k,r[k]]))),nodeSummaries};
}
