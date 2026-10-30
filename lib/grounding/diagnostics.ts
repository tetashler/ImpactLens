/** Failure telemetry contains counts/identity only, never titles, queries, URLs or passages. */
import {assertJsonData,ensure,object,freezeSnapshot} from '../experiments/validation.ts';
import {parseGroundingBundle,type GroundingBundle} from './contract.ts';
export interface RetrievalDiagnostic {version:1;status:GroundingBundle['status'];sourceCount:number;durationMs:number;credits:number|null;searches:0|1;bundleId:string;limitation:'unverified-excerpts'|'no-usable-sources'|'not-configured'|'timeout'|'unavailable'}
export function summariseRetrieval(value:GroundingBundle,durationMs:number):RetrievalDiagnostic {
 const b=parseGroundingBundle(value);return parseRetrievalDiagnostic({version:1,status:b.status,sourceCount:b.sources.length,durationMs:Math.min(120000,Math.max(0,Math.round(durationMs))),credits:b.usage.credits,searches:b.usage.searches,bundleId:b.bundleId,limitation:b.status==='not-configured'?'not-configured':b.status==='failed'?(b.limitations.includes('Optional web grounding timed out.')?'timeout':'unavailable'):b.sources.length?'unverified-excerpts':'no-usable-sources'});
}
export function parseRetrievalDiagnostic(value:unknown):RetrievalDiagnostic {
 assertJsonData(value);const d=object(value,['version','status','sourceCount','durationMs','credits','searches','bundleId','limitation']);
 ensure(d.version===1&&['retrieved','failed','not-configured'].includes(d.status as string));
 ensure(Number.isSafeInteger(d.sourceCount)&&(d.sourceCount as number)>=0&&(d.sourceCount as number)<=5);ensure(Number.isSafeInteger(d.durationMs)&&(d.durationMs as number)>=0&&(d.durationMs as number)<=120000);
 ensure(d.credits===null||typeof d.credits==='number'&&Number.isFinite(d.credits)&&d.credits>=0&&d.credits<=100);ensure(d.searches===0||d.searches===1);ensure(typeof d.bundleId==='string'&&/^g1_[a-f0-9]{16}$/.test(d.bundleId));
 if(d.status==='retrieved')ensure(d.limitation===(d.sourceCount?'unverified-excerpts':'no-usable-sources')&&d.searches===1);
 else if(d.status==='not-configured')ensure(d.limitation==='not-configured'&&d.sourceCount===0&&d.searches===0&&d.credits===null);
 else ensure(['timeout','unavailable'].includes(d.limitation as string)&&d.sourceCount===0&&d.searches===1);
 return freezeSnapshot(value) as RetrievalDiagnostic;
}
