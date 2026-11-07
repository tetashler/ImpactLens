import type {PublicExplore} from '../society/public-contract.ts';
import {parseReportSummary} from './contract.ts';
import {parseDetailedReport} from '../report-detailed/contract.ts';

/** Only authenticated saved-artifact GETs may use a retained historical snapshot key.
 * Historical public projections can change running/partial labels without rewriting the original artifact.
 */
export function savedArtifactSnapshotKey(historical:boolean,expected:string,received:unknown):string {
 if(typeof received!=='string'||!/^[a-f0-9]{64}$/.test(received)||!historical&&received!==expected)throw Error('The saved artifact does not match this run snapshot.');
 return received;
}
function envelope(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('The saved report response is invalid.');return value as Record<string,unknown>;}
export function parseSavedReportSummary(value:unknown,run:PublicExplore,expectedKey:string){
 const body=envelope(value),snapshotKey=savedArtifactSnapshotKey(run.storage?.disposition==='historical-read-only',expectedKey,body.snapshotKey);
 const summary=body.summary===null?null:parseReportSummary(body.summary);
 if(summary&&(summary.runId!==run.runId||summary.snapshotKey!==snapshotKey))throw Error('The saved summary does not match this report.');
 return {snapshotKey,summary};
}
export function parseSavedDetailedReport(value:unknown,run:PublicExplore,expectedKey:string,legacyExpectedKey?:string){
 const body=envelope(value),snapshotKey=savedArtifactSnapshotKey(run.storage?.disposition==='historical-read-only',expectedKey,body.snapshotKey);
 let report=body.report===null?null:parseDetailedReport(body.report);
 if(report&&(report.runId!==run.runId||report.snapshotKey!==snapshotKey||report.question!==run.question))throw Error('The saved detailed report does not match this run.');
 if(!report&&body.legacyReport!==undefined){const legacy=parseDetailedReport(body.legacyReport);if(run.storage?.disposition==='historical-read-only'||legacy.version!==1||legacy.runId!==run.runId||legacy.question!==run.question||!legacyExpectedKey||legacy.snapshotKey!==legacyExpectedKey)throw Error('The legacy detailed report does not match this run.');report=legacy;}
 return {snapshotKey,report};
}
