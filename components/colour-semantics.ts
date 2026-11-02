import type {AutomaticReportsState} from '../lib/report-detailed/automatic.ts';

export type ProcessTone='info'|'complete'|'attention'|'error'|'neutral';
/** Presentation only: process status is independent of participant views and evidence strength. */
export function processTone(status:string|undefined):ProcessTone {
 if(status==='completed'||status==='complete')return 'complete';
 if(status==='failed'||status==='error')return 'error';
 if(['partial','paused','cancelled','budget-limited','capacity-limited','needs-map-review'].includes(status??''))return 'attention';
 if(['running','preparing','executing','interpreting','summarising'].includes(status??''))return 'info';
 return 'neutral';
}
export function reportPreparationTone(state:Pick<AutomaticReportsState,'stage'|'summary'|'detailed'|'errors'>):ProcessTone {
 if(state.stage==='complete')return state.summary==='available'&&state.detailed==='available'&&Object.keys(state.errors).length===0?'complete':'attention';
 return state.stage==='cancelled'?'attention':'info';
}
export type CommuteTone='saved'|'added'|'unchanged'|'unknown'|'reachable';
export function commuteTone(minutesSaved:number|null):CommuteTone {
 return minutesSaved===null||!Number.isFinite(minutesSaved)?'unknown':minutesSaved>0?'saved':minutesSaved<0?'added':'unchanged';
}
export function journeyOutcomeTone(status:string):CommuteTone {
 return status==='improved'?'saved':status==='worse'?'added':status==='unchanged'?'unchanged':status==='newly-reachable'?'reachable':'unknown';
}
