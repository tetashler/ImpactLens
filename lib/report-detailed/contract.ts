import type {PublicExplore} from '../society/public-contract.ts';
import {canonical} from '../experiments/validation.ts';
import {projectDetailedReportEvidence} from './evidence.ts';
import {parseFindingDrafts,parseReportFinding,parseReportEvidenceItem,validateFindingReferences,type ReportFindingDraft,type ReportFinding,type ReportEvidenceItem} from './findings.ts';

export const LEGACY_DETAILED_REPORT_PROMPT_VERSION='detailed-report-v1';
export const DETAILED_REPORT_PROMPT_VERSION='detailed-report-v2';
export const DETAILED_REPORT_SECTION_KEYS=['assessment','impacts','perspectives','tradeoffs','developments','nextSteps'] as const;
export const DETAILED_REPORT_LABELS={assessment:'Overall assessment',impacts:'Calculated impacts',perspectives:'Stakeholder perspectives',tradeoffs:'Agreements and trade-offs',developments:'How the discussion developed',nextSteps:'Open questions and next steps'} as const;
export type DetailedReportSections=Record<typeof DETAILED_REPORT_SECTION_KEYS[number],string>;
interface DetailedReportIdentity {runId:string;snapshotKey:string;generatedAt:string;question:string;runStatus:string;sections:DetailedReportSections}
export interface DetailedReportV1 extends DetailedReportIdentity {version:1}
export interface DetailedReportV2 extends DetailedReportIdentity {version:2;findings:ReportFinding[];evidence:ReportEvidenceItem[]}
export type DetailedReport=DetailedReportV1|DetailedReportV2;
export interface DetailedReportDraft {sections:DetailedReportSections;findings:ReportFindingDraft[]}
export const DETAILED_REPORT_MAX_BYTES=180000;
function record(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('DETAILED_REPORT_SHAPE');return value as Record<string,unknown>;}
function exact(value:Record<string,unknown>,keys:readonly string[]){if(Object.keys(value).sort().join(',')!==[...keys].sort().join(','))throw Error('DETAILED_REPORT_SHAPE');}
const validText=(value:unknown,max:number):value is string=>typeof value==='string'&&!!value.trim()&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
export function parseDetailedReportSections(value:unknown):DetailedReportSections {
 const r=record(value);exact(r,DETAILED_REPORT_SECTION_KEYS);
 const result={} as DetailedReportSections;
 for(const key of DETAILED_REPORT_SECTION_KEYS){if(!validText(r[key],12000))throw Error('DETAILED_REPORT_TEXT');result[key]=(r[key] as string).trim();}
 if(new TextEncoder().encode(JSON.stringify(result)).length>60000)throw Error('DETAILED_REPORT_SIZE');
 return result;
}
export function parseDetailedReport(value:unknown):DetailedReport {
 const r=record(value);exact(r,['version','runId','snapshotKey','generatedAt','question','runStatus','sections',...(r.version===2?['findings','evidence']:[])]);
 if(![1,2].includes(r.version as number)||typeof r.runId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(r.runId)||typeof r.snapshotKey!=='string'||!/^[a-f0-9]{64}$/.test(r.snapshotKey)||typeof r.generatedAt!=='string'||r.generatedAt.length>32||!Number.isFinite(Date.parse(r.generatedAt))||!validText(r.question,2000)||!validText(r.runStatus,80))throw Error('DETAILED_REPORT_IDENTITY');
 const common={runId:r.runId,snapshotKey:r.snapshotKey,generatedAt:r.generatedAt,question:r.question,runStatus:r.runStatus,sections:parseDetailedReportSections(r.sections)};
 if(r.version===1)return {version:1,...common};
 if(!Array.isArray(r.findings)||r.findings.length>5||!Array.isArray(r.evidence)||r.evidence.length>30)throw Error('DETAILED_REPORT_FINDINGS');
 const findings=r.findings.map(parseReportFinding),evidence=r.evidence.map(parseReportEvidenceItem);validateFindingReferences(findings,evidence);
 const result:DetailedReportV2={version:2,...common,findings,evidence};if(new TextEncoder().encode(JSON.stringify(result)).length>DETAILED_REPORT_MAX_BYTES)throw Error('DETAILED_REPORT_SIZE');return result;
}
export function parseDetailedReportDraft(value:unknown):DetailedReportDraft {
 const r=record(value);exact(r,['sections','findings']);const draft={sections:parseDetailedReportSections(r.sections),findings:parseFindingDrafts(r.findings)};
 if(new TextEncoder().encode(JSON.stringify(draft)).length>60000)throw Error('DETAILED_REPORT_SIZE');return draft;
}
export function detailedReportSnapshotPayload(run:PublicExplore,promptVersion=DETAILED_REPORT_PROMPT_VERSION):string {return canonical({schemaVersion:promptVersion===LEGACY_DETAILED_REPORT_PROMPT_VERSION?1:2,promptVersion,evidence:projectDetailedReportEvidence(run)});}
export function legacyDetailedReportSnapshotPayload(run:PublicExplore):string{return detailedReportSnapshotPayload(run,LEGACY_DETAILED_REPORT_PROMPT_VERSION);}
