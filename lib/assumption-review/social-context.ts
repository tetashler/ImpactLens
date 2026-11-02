import {canonical} from '../experiments/validation.ts';
import {isMenuPolicy} from '../society/intelligence.ts';
import {encodeMenuContext} from '../society/decision-menu.ts';
import type {DecisionContext} from '../society/decision-contract.ts';
import {reviewContext} from './contract.ts';

/** One final encoding for provider dispatch, admission reservations and byte packing.
 * Measurement deliberately does not enforce a bound: packers must be able to
 * inspect oversized contexts and remove optional items without dropping review. */
export function encodeSocialContext(context:DecisionContext):string {
 const encoded=isMenuPolicy(context.policy)?encodeMenuContext(context):canonical(context);
 const review=context.sharedBriefing?.assumptionReview;
 return review?canonical({...JSON.parse(encoded),assumptionReview:reviewContext(review)}):encoded;
}
