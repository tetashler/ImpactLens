/** Closed diagnostic vocabulary. Submitted identifiers, prose and context never belong here. */
import {ensure,freezeSnapshot,object} from '../experiments/validation.ts';

export const SAFE_SOCIAL_FAMILIES=Object.freeze(['SOCIAL_SHAPE','SOCIAL_TARGET','SOCIAL_MEMORY','SOCIAL_PLATFORM','SOCIAL_TEXT','SOCIAL_STANCE','SOCIAL_STALE','SOCIAL_BUDGET'] as const);
export const SAFE_SOCIAL_SUBREASONS=Object.freeze([
 'invalid-wire-shape','invalid-fact-array','fact-not-offered','fact-unavailable','duplicate-fact-reference',
 'unsupported-number-or-unit','unsupported-personal-assertion','unoffered-issue-evidence','unoffered-action',
 'evidence-action-mismatch','ordinary-evidence-conflict','issue-state-stale','source-permission-unavailable',
 'authored-span-missing','subject-language-unassessed','criterion-not-satisfied','required-memory-unavailable',
 'rendered-text-limit','selection-inconsistent','schema-rejection',
] as const);
export const SAFE_SOCIAL_STAGES=Object.freeze(['schema','menu','factual','evidence','permission','decision'] as const);
export const SAFE_SOCIAL_FIELDS=Object.freeze(['decision','factIds','text','issueEvidenceId','choiceId','selection','memoryIds','discussion','stanceId'] as const);
export const SAFE_OFFERED_SOCIAL_ACTIONS=Object.freeze(['post','read','comment','reply','like','upvote','downvote','follow','unfollow','share','opinion','activity','inactive','moderate','group-create','group-invite','group-join','group-leave','message','group-reply'] as const);
export const SAFE_ISSUE_KINDS=Object.freeze(['question','condition','disagreement','commitment','progress','resolve','withdraw'] as const);

export type SafeSocialFamily=typeof SAFE_SOCIAL_FAMILIES[number];
export type SafeSocialSubreason=typeof SAFE_SOCIAL_SUBREASONS[number];
export type SafeSocialStage=typeof SAFE_SOCIAL_STAGES[number];
export type SafeSocialField=typeof SAFE_SOCIAL_FIELDS[number];
export type SafeOfferedSocialAction=typeof SAFE_OFFERED_SOCIAL_ACTIONS[number];
export type SafeIssueKind=typeof SAFE_ISSUE_KINDS[number];
export interface SafeOfferedOption {
 actionOffered:boolean;evidenceOffered:boolean;action:SafeOfferedSocialAction|null;issueKind:SafeIssueKind|null;
}
export interface SafeSocialDiagnostic {
 version:1;family:SafeSocialFamily;subreason:SafeSocialSubreason;stage:SafeSocialStage;field:SafeSocialField;offeredOption:SafeOfferedOption;
}
export type SafeSocialDiagnosticInput=Omit<SafeSocialDiagnostic,'version'>;
const fields=['family','subreason','stage','field','offeredOption'] as const;
const fail='Invalid safe social diagnostic.';
const member=(value:unknown,allowed:readonly string[])=>typeof value==='string'&&allowed.includes(value);

/** Validation returns an independent immutable snapshot and never echoes rejected input. */
export function parseSafeSocialDiagnostic(value:unknown):SafeSocialDiagnostic {
 const d=object(value,['version',...fields]);
 ensure(d.version===1&&member(d.family,SAFE_SOCIAL_FAMILIES)&&member(d.subreason,SAFE_SOCIAL_SUBREASONS)&&member(d.stage,SAFE_SOCIAL_STAGES)&&member(d.field,SAFE_SOCIAL_FIELDS),fail);
 const o=object(d.offeredOption,['actionOffered','evidenceOffered','action','issueKind']);
 ensure(typeof o.actionOffered==='boolean'&&typeof o.evidenceOffered==='boolean',fail);
 ensure(o.action===null||member(o.action,SAFE_OFFERED_SOCIAL_ACTIONS),fail);
 ensure(o.issueKind===null||member(o.issueKind,SAFE_ISSUE_KINDS),fail);
 ensure(o.actionOffered||o.action===null,fail);
 ensure(o.evidenceOffered||o.issueKind===null,fail);
 return freezeSnapshot(d) as unknown as SafeSocialDiagnostic;
}

/** Callers must supply application-owned finite labels, never extracted model strings. */
export function createSafeSocialDiagnostic(input:SafeSocialDiagnosticInput):SafeSocialDiagnostic {
 const d=object(input,fields);
 return parseSafeSocialDiagnostic({version:1,family:d.family,subreason:d.subreason,stage:d.stage,field:d.field,offeredOption:d.offeredOption});
}
