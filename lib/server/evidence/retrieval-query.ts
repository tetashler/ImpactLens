/** Search wording only: geographic anchors do not establish source relevance or facts. */
import {GROUNDING_LIMITS} from '../../grounding/contract.ts';

const tokens=(value:string)=>' '+value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()+' ';
// Match the existing scope constraint's country-name recognition without changing its generation policy.
const names=new Intl.DisplayNames(['en'],{type:'region'}),shortNames=new Intl.DisplayNames(['en'],{type:'region',style:'short'}),foreignNames=new Set<string>();
for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){
 const code=String.fromCharCode(a,b);
 for(const name of [names.of(code),shortNames.of(code)])if(name&&name!==code&&name!=='Singapore')foreignNames.add(tokens(name));
}

export function buildRetrievalQuery(question:string,planningAreaName?:string|null):string {
 // Inspect the complete source before trimming/truncating so later geography or invalid data is not hidden.
 if(typeof question!=='string'||question.length>2000||!question.trim()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(question))throw new Error('Invalid retrieval question.');
 const text=tokens(question),query=question.trim().replace(/\s+/gu,' ');
 const foreign=[...foreignNames].some(name=>text.includes(name))||/\b(?:usa|u s|uk|u k|uae|prc)\b/u.test(text)||/\bUS\b/u.test(question);
 const ambiguous=/\b(?:international|worldwide|global|foreign|overseas|abroad|bilateral|exports?|imports?|migration|cross border|supply chain)\b/u.test(text);
 let prefix='';
 if(!foreign&&!ambiguous){
  // The caller supplies an already unique planning-area match; geometry and demographic values are irrelevant.
  const area=typeof planningAreaName==='string'?planningAreaName.trim().replace(/\s+/gu,' '):'';
  if(area.length<=80&&/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(area)&&tokens(area)!==' singapore '&&text.includes(tokens(area)))prefix=area+' Singapore: ';
  else if(text.includes(' singapore '))prefix='Singapore: ';
 }
 const bounded=(prefix+query).slice(0,GROUNDING_LIMITS.query);
 // A UTF-16 limit must not turn a valid supplementary character into an isolated high surrogate.
 return bounded.replace(/[\uD800-\uDBFF]$/u,'').trimEnd();
}
