/** Explicit author action only: no reading private stores, no generation and no invented dialogue. */
import type {PilotCase} from './core.ts';
import {parseDetailedReport} from '../report-detailed/contract.ts';
import {freezeSnapshot,ensure} from '../experiments/validation.ts';
export function attachPilotDiscussion(caseValue:PilotCase,input:unknown):PilotCase {
 const report=parseDetailedReport(input);
 ensure(report.version===2&&report.question===caseValue.generationQuestion,'PILOT_REPORT_BRIEF_BINDING');
 const items=report.evidence.filter(e=>e.kind==='discussion-event').slice(0,12).map(e=>{ensure(e.kind==='discussion-event');return {id:e.id,text:e.text,actorLabel:e.actorLabel};});
 ensure(items.length>0,'PILOT_NO_DISCUSSION_EVIDENCE');
 return freezeSnapshot({...caseValue,supplement:{runId:report.runId,snapshotKey:report.snapshotKey,generatedAt:report.generatedAt,items}});
}
