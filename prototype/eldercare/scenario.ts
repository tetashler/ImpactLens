import type { EldercareIntervention, AccessibilityOptions, OriginReference } from './types.ts';
import { ensure, object, id, text, position, nonnegative, date, geography, url } from './validation.ts';
export function parseEldercareIntervention(value:unknown):EldercareIntervention {
  object(value,['schemaVersion','id','name','serviceType','status','position','availability','capacity','eligibility','rationale','assumptions'],'intervention');
  ensure(value.schemaVersion===1 && value.status==='hypothetical','Unsupported intervention version/status');id(value.id,'intervention ID');text(value.name,'centre name');
  ensure(value.serviceType==='aac','Unsupported facility service: only AAC geographic access implemented');position(value.position);
  ensure(['assumed-available','assumed-unavailable'].includes(value.availability as string),'Invalid availability assumption');
  ensure(value.eligibility==='age-only-other-criteria-unknown','Unsupported service eligibility assumption');text(value.rationale,'rationale');
  if(value.capacity!==null){object(value.capacity,['users','basis','rationale'],'capacity');nonnegative(value.capacity.users,'capacity');ensure(Number.isSafeInteger(value.capacity.users) && value.capacity.users>0 && value.capacity.basis==='illustrative-assumption','Capacity must be positive illustrative user count');text(value.capacity.rationale,'capacity rationale');}
  ensure(Array.isArray(value.assumptions) && value.assumptions.length>0,'Missing intervention assumptions');const ids=new Set<string>();
  for(const a of value.assumptions){object(a,['id','description'],'assumption');id(a.id,'assumption ID');text(a.description,'assumption description');ensure(!ids.has(a.id),'Duplicate assumption ID');ids.add(a.id);}
  return value as unknown as EldercareIntervention;
}
export function validateOptions(o:AccessibilityOptions):void {
  object(o,['referenceDate','minimumAge','thresholdsMetres','existingAvailability','eligibility','straightLineWalkingMetresPerSecond'],'options');date(o.referenceDate);
  ensure(Number.isInteger(o.minimumAge) && o.minimumAge>=60 && o.minimumAge<=90 && o.minimumAge%5===0,'Age cutoff must align with complete Census age bands, 60 to 90');
  ensure(Array.isArray(o.thresholdsMetres) && o.thresholdsMetres.length>0 && new Set(o.thresholdsMetres).size===o.thresholdsMetres.length,'Missing/duplicate distance thresholds');for(const t of o.thresholdsMetres)nonnegative(t,'distance threshold');
  ensure(['assume-listed-available','exclude-unconfirmed'].includes(o.existingAvailability),'Invalid existing availability policy');ensure(o.eligibility==='age-only-other-criteria-unknown','Invalid eligibility interpretation');
  if(o.straightLineWalkingMetresPerSecond!==undefined)ensure(Number.isFinite(o.straightLineWalkingMetresPerSecond) && o.straightLineWalkingMetresPerSecond>0,'Invalid assumed walking speed');
}
export function validateOrigin(o:OriginReference):void {
  object(o,['id','planningArea','subzone','position','provenance'],'origin');id(o.id,'origin ID');geography(o.planningArea);geography(o.subzone);position(o.position);
  object(o.provenance,['method','description','sourceUrl','referenceDate','assumptionId'],'origin provenance');ensure(o.provenance.method==='explicit-geographic-proxy','Origin must be an explicit geographic proxy');text(o.provenance.description,'origin derivation');url(o.provenance.sourceUrl);date(o.provenance.referenceDate);id(o.provenance.assumptionId,'origin assumption ID');
}
