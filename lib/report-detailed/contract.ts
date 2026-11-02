import type {PublicExplore} from '../society/public-contract.ts';
import {canonical} from '../experiments/validation.ts';
import {projectDetailedReportEvidence} from './evidence.ts';

export const DETAILED_REPORT_PROMPT_VERSION='detailed-report-v1';
export const DETAILED_REPORT_SECTION_KEYS=['assessment','impacts','perspectives','tradeoffs','developments','nextSteps'] as const;
export const DETAILED_REPORT_LABELS={assessment:'Overall assessment',impacts:'Calculated impacts',perspectives:'Stakeholder perspectives',tradeoffs:'Agreements and trade-offs',developments:'How the discussion developed',nextSteps:'Open questions and next steps'} as const;
export type DetailedReportSections=Record<typeof DETAILED_REPORT_SECTION_KEYS[number],string>;
export interface DetailedReport {version:1;runId:string;snapshotKey:string;generatedAt:string;question:string;runStatus:string;sections:DetailedReportSections}
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
 const r=record(value);exact(r,['version','runId','snapshotKey','generatedAt','question','runStatus','sections']);
 if(r.version!==1||typeof r.runId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(r.runId)||typeof r.snapshotKey!=='string'||!/^[a-f0-9]{64}$/.test(r.snapshotKey)||typeof r.generatedAt!=='string'||r.generatedAt.length>32||!Number.isFinite(Date.parse(r.generatedAt))||!validText(r.question,2000)||!validText(r.runStatus,80))throw Error('DETAILED_REPORT_IDENTITY');
 return {version:1,runId:r.runId,snapshotKey:r.snapshotKey,generatedAt:r.generatedAt,question:r.question,runStatus:r.runStatus,sections:parseDetailedReportSections(r.sections)};
}
export function detailedReportSnapshotPayload(run:PublicExplore,promptVersion=DETAILED_REPORT_PROMPT_VERSION):string {return canonical({schemaVersion:1,promptVersion,evidence:projectDetailedReportEvidence(run)});}
