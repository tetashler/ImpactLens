import type {GroundingBundle} from './contract.ts';

/** Lexical provenance only. Mentions can be negated, irrelevant, hypothetical or conflicting. */
const words=(s:string)=>' '+s.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu,' ').trim()+' ';
export function safeRequestedLocality(locality:unknown):string|null {
 return typeof locality==='string'&&locality.length<=80&&/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(locality.trim())?locality.trim():null;
}
export function geographicCoverage(bundle:GroundingBundle,locality:unknown=null){
 const area=safeRequestedLocality(locality);
 return {version:1 as const,policy:'passage-mentions-v1' as const,requestedLocality:area,
  interpretation:'Literal passage mentions only. Neither geography, source title, domain nor citation proves relevance, truth or existence of the hypothetical intervention.',
  sources:bundle.sources.map(s=>({sourceId:s.id,publishedAt:s.publishedAt,retrievedAt:s.retrievedAt,passages:s.passages.map(p=>({passageId:p.id,requestedLocalityMentioned:area?words(p.text).includes(words(area)):null,singaporeMentioned:words(p.text).includes(' singapore '),verification:'unverified-source-excerpt' as const}))}))};
}

/** Exact contiguous excerpt; no synthetic summary, ellipsis or invented provenance. */
export function localityWindow(content:string,maximum:number,locality:unknown):string{
 const area=safeRequestedLocality(locality);
 let start=0;
 if(area){const needle=area.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),match=new RegExp('(?<![\\p{L}\\p{N}])'+needle+'(?![\\p{L}\\p{N}])','iu').exec(content);if(match)start=Math.max(0,match.index-Math.floor(maximum/4));}
 if(start>0&&/[\uDC00-\uDFFF]/u.test(content[start]))start++;
 let result=content.slice(start,start+maximum);if(/[\uD800-\uDBFF]$/u.test(result))result=result.slice(0,-1);
 return result;
}
