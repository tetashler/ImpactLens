/** v2 is opt-in; the v1 enum and serialized observations remain frozen. */
import {object,ensure,freezeSnapshot} from '../experiments/validation.ts';
import {parseSafeSocialDiagnostic,SAFE_SOCIAL_SUBREASONS,type SafeSocialDiagnostic} from './social-diagnostics.ts';
export const PROSE_SUBREASONS=Object.freeze(['unsupported-quantity-token','ambiguous-quantity-phrase','personal-fact-requires-reference','source-attribution-unverified','reserved-fact-rendering','authored-span-missing','evidence-content-too-short','evidence-subject-missing','evidence-action-language-unassessed','closure-negative-or-modal-marker','evidence-criterion-mismatch'] as const);
export type ProseSubreason=typeof PROSE_SUBREASONS[number]|SafeSocialDiagnostic['subreason'];
export type SafeSocialDiagnosticV2=Omit<SafeSocialDiagnostic,'version'|'subreason'>&{version:2;subreason:ProseSubreason};
export function parseSafeSocialDiagnosticV2(value:unknown):SafeSocialDiagnosticV2{
 const d=object(value,['version','family','subreason','stage','field','offeredOption']);
 ensure(d.version===2&&[...SAFE_SOCIAL_SUBREASONS,...PROSE_SUBREASONS].includes(d.subreason as any),'Invalid v2 safe diagnostic.');
 parseSafeSocialDiagnostic({...d,version:1,subreason:'selection-inconsistent'});
 return freezeSnapshot(d) as unknown as SafeSocialDiagnosticV2;
}
