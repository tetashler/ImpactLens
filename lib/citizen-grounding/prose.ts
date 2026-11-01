/** Conservative, explainable lexical boundary, not an arbitrary-language fact checker.
 * Quantities and individual attributes are rendered from selected server facts. */
import type {DecisionContext} from '../society/decision-contract.ts';
import type {ProseSubreason} from '../society/social-diagnostics-v2.ts';
const words='zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundreds?|thousands?|millions?|billions?|dozens?|half|quarter|twice|halve[ds]?|halving|double[ds]?|doubling|triple[ds]?|tripling';
const quantity=new RegExp('\\p{N}|\\b('+words+')\\b','iu');
export const PROSE_RULES=Object.freeze({policy:'citizen-prose-v1',qualitativeUnitsAllowed:true,numericalAssertions:'Select factIds; only the server renders exact quantities and personal attributes. Raw quantities remain unsupported, even with a selected fact or a citation.',identifierException:'Only exact station codes in server-validated proseReferences. Question text is not an allowlist.',semanticVerification:'NOT_VERIFIED',examples:['My working hours make public transport inconvenient.','I am worried about transfers after work.','One concern is whether transfers remain practical.']});
export function assessCitizenProse(text:string,c:DecisionContext):ProseSubreason|null{
 if(/\[(?:Modelled|Synthetic) fact:/i.test(text))return 'reserved-fact-rendering';
 let scanned=text;
 if(c.proseReferences?.source==='validated-hybrid-binding')for(const code of c.proseReferences.stationCodes){if(/^[A-Z]{1,3}[0-9]{1,3}$/.test(code))scanned=scanned.replace(new RegExp('(?<![\\p{L}\\p{N}])'+code+'(?![\\p{L}\\p{N}]|\\s*(?:%|minutes?\\b|hours?\\b|seconds?\\b|jobs\\b))','gu'),' station ');}
 scanned=scanned.replace(/\b(one another|no one|one concern|one question|one option|a second opinion|first and foremost)\b/gi,' qualitative ');
 scanned=scanned.replace(/\b(?:for one thing|on the one hand|one\s+(?:idea|thought|suggestion|caveat|consideration|worry|of\s+(?:my|our|the)\s+(?:concerns|questions|ideas|thoughts|suggestions|caveats|considerations|worries)|(?=(?:could|might|may|can|should|would)\b)))\b/gi,' qualitative '); // Discourse counters and impersonal pronouns are not measured outcomes.
 scanned=scanned.replace(/\bdouble[- ]check(?:s|ed|ing)?\b/gi,' review ');
 if(quantity.test(scanned))return 'unsupported-quantity-token';
 if(/\b[IVXLCDM]+\s+(?:minutes?|mins?|hours?|hrs?|seconds?|secs?|kilometres?|kilometers?|km|percent)\b/i.test(scanned))return 'ambiguous-quantity-phrase';
 if(/\b(?:a|an)\s+(?:third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|fraction)\b(?=\s+(?:of|as|less|reduction|saving)\b|[.!?,]|$)/i.test(scanned))return 'unsupported-quantity-token';
 if(/\b(?:a|an)\s+(?:[\p{L}-]+\s+){0,4}(?:minute|hour|hr|second|sec|kilometre|kilometer|km|percent|job)\b/iu.test(scanned))return 'unsupported-quantity-token';
 if(/\b(?:saves?|saved|cuts?|reduce[sd]?|increase[sd]?|takes?|lasts?|spends?|shorten[sd]?|create[sd]?|generate[sd]?)\b[^.!?\n]{0,70}\b(?:minutes?|mins?|hours?|hrs?|seconds?|secs?|kilometres?|kilometers?|km|percent|jobs|dollars)\b/i.test(scanned))return 'ambiguous-quantity-phrase';
 if(/\b(several|couple of|a few|many|multiple|roughly|approximately)\s+(minutes?|hours?|seconds?|kilomet(?:er|re)s?|percent|jobs|stations?)\b|\b(first|second|third|fourth)\s+(station|stop|train|shift)\b/i.test(scanned))return 'ambiguous-quantity-phrase';
 const personal=text.replace(/\bI(?: am|'m) a (?:bit|little) (?:worried|concerned|unsure|uncertain|cautious)\b/gi,'I feel concerned');
 if(/\bI (live|reside|work|am employed|am an?|commute to|travel to|earn|drive to|cycle to|walk to|start work|finish work)\b|\bI(?:'m| am) (male|female|aged|a |an )|\bmy (home|workplace|job|employer|occupation|age|shift|schedule|working hours|salary) (is|are|starts|ends|runs|begins|finishes|lasts)\b|\b(?:my|our) (?:neighbour|colleague|coworker|friend) is (?:a|an)\b|\b(?:works|lives|resides|is employed) (?:in|at|as|for)\b|\bmy (?:modelled |calculated )?(?:commute|journey|trip) (?:will |would )?(?:is|be|takes|saves|lasts)\b/i.test(personal))return 'personal-fact-requires-reference';
 if(/\b(according to|source says|message says|they said|report states|study shows)\b/i.test(text)){
  const quotations=[...text.matchAll(/["“]([^"”]+)["”]/gu)].map(m=>m[1]);
  if(!quotations.length||!quotations.every(q=>(q.match(/[\p{L}\p{N}]+/gu)?.length??0)>=4&&c.items.some(i=>i.text===q&&(!i.groupId||c.communication?.groups.some(g=>g.id===i.groupId&&g.member))&&c.memories.some(m=>m.itemIds.includes(i.id)))))return 'source-attribution-unverified';
 }
 return null;
}
