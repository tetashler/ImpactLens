import type {GroundingBundle,GroundingSource} from '../../grounding/contract.ts';

/** Exact prefix bounded in UTF-8 bytes; never splits a Unicode code point. */
function prefix(text:string,maximum:number):string {
 let bytes=0,result='';
 for(const character of text){const size=Buffer.byteLength(character,'utf8');if(bytes+size>maximum)break;result+=character;bytes+=size;}
 return result;
}

/** Planner-only projection. The immutable grounding bundle keeps complete excerpts. */
export function plannerGroundingSources(bundle:GroundingBundle):GroundingSource[] {
 if(!bundle.research)return bundle.sources;
 return bundle.sources.map(source=>({...source,title:prefix(source.title,96),publisher:prefix(source.publisher,128),passages:source.passages.map(passage=>({...passage,text:prefix(passage.text,192)}))}));
}

export function plannerResearchDisclosure(bundle?:GroundingBundle):Record<string,string> {
 return bundle?.research?{researchExcerptPolicy:'Research titles, publishers and passages are truncated exact UTF-8 prefixes for planner input. All source/passage IDs and dates are retained. Omitted text is unavailable here: do not infer omitted facts. Full excerpts remain in the immutable plan; selecting a passage does not verify any claim.'}:{};
}
