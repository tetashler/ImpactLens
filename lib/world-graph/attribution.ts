/** Versioned presentation policy over immutable candidates; it never rewrites a plan. */
import {parseGroundingSupport,type GroundingBundle,type GroundingSupport} from '../grounding/contract.ts';
import {freezeSnapshot} from '../experiments/validation.ts';
import type {WorldOntologyV1} from './ontology.ts';
export interface SourceAttributionV1 {version:1;status:'none'|'source-reported'|'unverified-candidate';reason:'no-support'|'literal-entity-mention'|'entity-mention-not-established'|'literal-relationship-statement'|'relationship-support-not-established'}
export interface AssessedAttribution {attribution:SourceAttributionV1;evidence:GroundingSupport|null}
function result(status:SourceAttributionV1['status'],reason:SourceAttributionV1['reason'],evidence:GroundingSupport|null):AssessedAttribution{return freezeSnapshot({attribution:{version:1,status,reason},evidence});}
function support(value:GroundingSupport|null,grounding?:GroundingBundle):GroundingSupport|null {
 if(value===null)return null;
 // Integrity is still mandatory, even when the eventual association is unverified.
 return parseGroundingSupport(value,grounding as GroundingBundle);
}
const mentions=(quote:string,name:string)=>quote.toLocaleLowerCase('en-SG').includes(name.toLocaleLowerCase('en-SG'));
export function assessEntityAttribution(entity:WorldOntologyV1['entities'][number],grounding?:GroundingBundle):AssessedAttribution {
 const s=support(entity.support,grounding);if(!s)return result('none','no-support',null);
 return mentions(s.quote,entity.name)?result('source-reported','literal-entity-mention',s):result('unverified-candidate','entity-mention-not-established',null);
}
export function assessRelationshipAttribution(relation:WorldOntologyV1['relationships'][number],ontology:WorldOntologyV1,grounding?:GroundingBundle):AssessedAttribution {
 const s=support(relation.support,grounding);if(!s)return result('none','no-support',null);
 const endpoints=[relation.source,relation.target].map(id=>ontology.entities.find(e=>e.id===id));
 // Fictional participants never acquire factual existence/relationships through a quotation.
 const literal=s.quote===relation.statement&&endpoints.every(e=>e&&mentions(s.quote,e.name));
 return literal?result('source-reported','literal-relationship-statement',s):result('unverified-candidate','relationship-support-not-established',null);
}
export function ontologyAttributionSummary(ontology:WorldOntologyV1,grounding?:GroundingBundle){return freezeSnapshot({version:1,withheldEntityAssociations:ontology.entities.filter(e=>assessEntityAttribution(e,grounding).attribution.status==='unverified-candidate').length,withheldRelationshipAssociations:ontology.relationships.filter(r=>assessRelationshipAttribution(r,ontology,grounding).attribution.status==='unverified-candidate').length});}
/** Safe Report projection; original candidate associations remain in the immutable run. */
export function effectiveReportOntology(ontology:WorldOntologyV1,grounding?:GroundingBundle):WorldOntologyV1 {return freezeSnapshot({...ontology,entities:ontology.entities.map(e=>({...e,support:assessEntityAttribution(e,grounding).evidence})),relationships:ontology.relationships.map(r=>({...r,support:assessRelationshipAttribution(r,ontology,grounding).evidence}))});}
