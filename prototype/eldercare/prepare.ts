import { createHash } from 'node:crypto';
import type { FacilityCatalogue, Corroboration, FacilitySource, Facility } from './types.ts';
import { AAC_CORROBORATIONS, MOH_SOURCE } from './corroborations.ts';
import { ensure, position, text, source as validateSource, validateFacility, validateCorroboration } from './validation.ts';

function decode(value:string):string {
  return value.replace(/<[^>]*>/g,'').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(whole,entity:string)=>{
    if(entity[0]==='#'){const n=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1));return n>0 && n<=0x10ffff?String.fromCodePoint(n):whole;}
    return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '} as Record<string,string>)[entity.toLowerCase()]??whole;
  }).trim();
}
export function parseKmlAttributes(description:unknown):Record<string,string> {
  text(description,'KML description');const result:Record<string,string>=Object.create(null);
  for(const match of description.matchAll(/<th\b[^>]*>([^<]+)<\/th>\s*<td\b[^>]*>([\s\S]*?)<\/td>/gi)){
    const key=decode(match[1]);ensure(!Object.hasOwn(result,key),'Duplicate KML attribute');result[key]=decode(match[2]);
  }
  text(result.NAME,'facility name');return result;
}
export function prepareFacilityCatalogue(raw:string,corroborations:Corroboration[]=AAC_CORROBORATIONS,metadata:FacilitySource=MOH_SOURCE):FacilityCatalogue {
  validateSource(metadata);const input=JSON.parse(raw);
  ensure(input?.type==='FeatureCollection' && Array.isArray(input.features),'Expected GeoJSON FeatureCollection');
  const crs=input.crs?.properties?.name??'GeoJSON-default-WGS84';
  ensure(['GeoJSON-default-WGS84','urn:ogc:def:crs:OGC:1.3:CRS84','EPSG:4326','urn:ogc:def:crs:EPSG::4326'].includes(crs),'Unsupported CRS; explicit conversion required');
  const verified=new Map<string,Corroboration>();
  for(const c of corroborations){validateCorroboration(c);ensure(!verified.has(c.sourceFeatureId),'Duplicate corroboration');verified.set(c.sourceFeatureId,c);}
  const facilities:Facility[]=[],seen=new Set<string>(),fingerprints=new Set<string>(),excluded:FacilityCatalogue['audit']['excluded']=[],conflicts:string[]=[];
  const normalAddress=(s:string)=>s.toLowerCase().replace(/\bblk\b|\bblock\b/g,'').replace(/\brd\b/g,'road').replace(/[^a-z0-9]/g,'');
  for(const [index,f] of input.features.entries()){
    try{
      ensure(f?.type==='Feature' && f.geometry?.type==='Point','Expected Point feature');
      const coordinates=f.geometry.coordinates;ensure(Array.isArray(coordinates) && [2,3].includes(coordinates.length) && coordinates.every((v:unknown)=>typeof v==='number' && Number.isFinite(v)),'Missing/malformed coordinates');
      const point={lat:coordinates[1],lon:coordinates[0]};position(point);
      const id=f.properties?.Name;text(id,'source feature ID');
      const a=parseKmlAttributes(f.properties?.Description),name=a.NAME;
      const fingerprint=JSON.stringify([name.toLowerCase(),point]);ensure(!seen.has(id) && !fingerprints.has(fingerprint),'Duplicate facility record');
      const postalCode=/^\d{6}$/.test(a.ADDRESSPOSTALCODE??'')?a.ADDRESSPOSTALCODE:null;
      const candidate=verified.get(id);
      const corroboration=candidate && candidate.expectedSourceName===name && candidate.postalCode===postalCode && normalAddress(candidate.listedAddress)===normalAddress(a.ADDRESSSTREETNAME??'')?structuredClone(candidate):null;
      if(candidate && !corroboration)conflicts.push(id);
      const facility:Facility={id,sourceName:name,name:corroboration?.name??name,postalCode,address:a.ADDRESSSTREETNAME||null,position:point,serviceType:corroboration?.serviceType??'unknown',capacity:null,openedOn:null,operationStatus:corroboration?'listed-unconfirmed':'historical-unknown',recordUpdated:/^\d{14}$/.test(a.FMEL_UPD_D??'')?a.FMEL_UPD_D:null,sourceRecord:index+1,corroboration};
      validateFacility(facility);facilities.push(facility);seen.add(id);fingerprints.add(fingerprint);
    }catch(error){excluded.push({record:index+1,reason:(error as Error).message});}
  }
  const locations=new Map<string,string[]>();for(const f of facilities){const key=JSON.stringify(f.position);locations.set(key,[...(locations.get(key)??[]),f.id]);}
  const capacityFields=new Set<string>();for(const f of input.features)if(typeof f?.properties?.Description==='string')for(const m of f.properties.Description.matchAll(/<th\b[^>]*>([^<]+)<\/th>/gi))if(/capacity|beds|places/i.test(m[1]))capacityFields.add(decode(m[1]));
  return {schemaVersion:1,source:{...structuredClone(metadata),rawSha256:createHash('sha256').update(raw).digest('hex')},facilities,
    audit:{rawRecords:input.features.length,sourceCrs:crs,excluded,verificationConflicts:conflicts,coLocatedGroups:[...locations.values()].filter(x=>x.length>1),unknownClassifications:facilities.filter(f=>f.serviceType==='unknown').length,recordUpdateValues:[...new Set(facilities.map(f=>f.recordUpdated).filter((v):v is string=>v!==null))].sort(),missingPostalCodes:facilities.filter(f=>f.postalCode===null).length,missingAddresses:facilities.filter(f=>f.address===null).length,unsupportedCapacityFields:[...capacityFields].sort()}};
}
