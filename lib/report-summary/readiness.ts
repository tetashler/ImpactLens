import type {PublicExplore} from '../society/public-contract.ts';

/** Initial stakeholder completion is separate from the live society's progress. */
export function isReportRunUpdating(run:PublicExplore):boolean {
 if(run.storage?.disposition==='historical-read-only')return false;
 // Coordinator state is authoritative; society metadata can lag a settled pause.
 if(run.job)return run.job.status==='running';
 return !!run.society&&['preparing','simulating','summarising'].includes(run.society.phase);
}
