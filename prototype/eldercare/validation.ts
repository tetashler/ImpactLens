import type { Position, FacilitySource, Facility, Corroboration } from './types.ts';
export function ensure(condition:unknown,message:string):asserts condition {if(!condition)throw new Error(message);}
export function object(value:unknown,keys:string[],label:string):asserts value is Record<string,unknown> {
  ensure(value!==null && typeof value==='object' && !Array.isArray(value) && Object.keys(value).every(k=>keys.includes(k)),`Invalid ${label} fields`);
}
export function text(value:unknown,label:string):asserts value is string {ensure(typeof value==='string' && value.trim().length>0,`Missing ${label}`);}
export function id(value:unknown,label:string):asserts value is string {text(value,label);ensure(/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value),`Invalid ${label}`);}
export function geography(value:unknown):asserts value is string {ensure(typeof value==='string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),'Invalid geographic identifier');}
export function nonnegative(value:unknown,label:string):asserts value is number {ensure(typeof value==='number' && Number.isFinite(value) && value>=0,`Invalid ${label}`);}
export function date(value:unknown):asserts value is string {
  ensure(typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value),'Invalid reference date');const d=new Date(`${value}T00:00:00Z`);ensure(Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===value,'Invalid reference date');
}
export function url(value:unknown):asserts value is string {text(value,'source URL');let ok=false;try{ok=['http:','https:'].includes(new URL(value).protocol);}catch{}ensure(ok,'Invalid source URL');}
export function position(value:unknown,singapore=true):asserts value is Position {
  object(value,['lat','lon'],'position');const p=value;
  ensure(typeof p.lat==='number' && Number.isFinite(p.lat) && typeof p.lon==='number' && Number.isFinite(p.lon) && Math.abs(p.lat)<=90 && Math.abs(p.lon)<=180,'Invalid geographic coordinates');
  if(singapore)ensure(p.lat>=1.15 && p.lat<=1.5 && p.lon>=103.6 && p.lon<=104.1,'Coordinates outside declared Singapore-region bounds');
}
export function source(value:FacilitySource):void {
  id(value.id,'source ID');text(value.agency,'agency');url(value.url);url(value.licenceUrl);date(value.catalogueUpdated);date(value.accessedDate);text(value.scope,'source scope');
}
export function validateCorroboration(value:unknown):asserts value is Corroboration {
  object(value,['sourceFeatureId','expectedSourceName','postalCode','name','serviceType','listedAddress','evidenceUrl','checkedDate'],'corroboration');
  id(value.sourceFeatureId,'corroborated feature ID');text(value.expectedSourceName,'corroborated source name');text(value.name,'corroborated facility name');
  ensure(typeof value.postalCode==='string' && /^\d{6}$/.test(value.postalCode),'Invalid corroborated postal code');
  ensure(['aac','aac-care','nursing-home','day-care','rehabilitation'].includes(value.serviceType as string),'Unsupported corroborated service type');
  text(value.listedAddress,'listed address');url(value.evidenceUrl);date(value.checkedDate);
}
export function validateFacility(f:Facility):void {
  object(f,['id','sourceName','name','postalCode','address','position','serviceType','capacity','openedOn','operationStatus','recordUpdated','sourceRecord','corroboration'],'facility');
  id(f.id,'facility ID');text(f.sourceName,'source name');text(f.name,'facility name');position(f.position);
  ensure(['aac','aac-care','nursing-home','day-care','rehabilitation','unknown'].includes(f.serviceType),'Invalid facility service type');
  ensure(f.capacity===null && f.openedOn===null,'Unsupported existing capacity or opening date');
  ensure(['listed-unconfirmed','historical-unknown','closed'].includes(f.operationStatus),'Invalid operation status');
  ensure(Number.isSafeInteger(f.sourceRecord) && f.sourceRecord>0,'Invalid source record');
  ensure(f.postalCode===null || (typeof f.postalCode==='string' && /^\d{6}$/.test(f.postalCode)),'Invalid postal code');ensure(f.address===null || typeof f.address==='string','Invalid address');
  ensure(f.recordUpdated===null || (typeof f.recordUpdated==='string' && /^\d{14}$/.test(f.recordUpdated)),'Invalid source update field');
  if(f.corroboration!==null){validateCorroboration(f.corroboration);ensure(f.corroboration.sourceFeatureId===f.id && f.corroboration.serviceType===f.serviceType && f.corroboration.postalCode===f.postalCode && f.corroboration.expectedSourceName===f.sourceName,'Inconsistent facility corroboration');}
  else ensure(f.serviceType==='unknown','Known facility service requires corroboration');
}
export function near(a:number,b:number):boolean {return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-6+1e-9*Math.max(Math.abs(a),Math.abs(b));}
