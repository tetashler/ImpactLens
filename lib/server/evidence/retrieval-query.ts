/** Search wording only: geographic anchors do not establish source relevance or facts. */
import {GROUNDING_LIMITS} from '../../grounding/contract.ts';

const tokens=(value:string)=>' '+value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()+' ';
// Match the existing scope constraint's country-name recognition without changing its generation policy.
const names=new Intl.DisplayNames(['en'],{type:'region'}),shortNames=new Intl.DisplayNames(['en'],{type:'region',style:'short'}),foreignNames=new Set<string>();
for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){
 const code=String.fromCharCode(a,b);
 for(const name of [names.of(code),shortNames.of(code)])if(name&&name!==code&&name!=='Singapore')foreignNames.add(tokens(name));
}

/** Inspect complete wording before bounding a query. Shared with scenario-only site anchoring. */
export function hasForeignRetrievalScope(question:string):boolean {
 const text=tokens(question);
 return [...foreignNames].some(name=>text.includes(name))||/\b(?:usa|u s|uk|u k|uae|prc)\b/u.test(text)||/\bUS\b/u.test(question)||/\b(?:international|worldwide|global|foreign|overseas|abroad|bilateral|exports?|imports?|migration|cross border|supply chain)\b/u.test(text);
}

/** Literal recognized country/scope names to retain when a long research query is cropped. */
export function retrievalScopeAnchors(question:string):string[] {
 const text=tokens(question),anchors:string[]=[];
 for(const name of foreignNames)if(text.includes(name)){
  const pattern=name.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'[^\\p{L}\\p{N}]+');
  anchors.push(new RegExp(pattern,'iu').exec(question)?.[0]??name.trim());
 }
 for(const match of question.matchAll(/\b(?:Singapore|USA|UK|UAE|PRC|international|worldwide|global|foreign|overseas|abroad|bilateral|cross[ -]border)\b|\bU[ .]+[SK]\.?(?=\W|$)/gi))anchors.push(match[0]);
 // Match the detector's case-sensitive US alias without turning the pronoun
 // "us" into a geographic anchor. Dotted aliases need no boundary after a dot.
 for(const match of question.matchAll(/\bUS\b/g))anchors.push(match[0]);
 return [...new Set(anchors)].sort((a,b)=>b.length-a.length).filter((name,index,all)=>!all.slice(0,index).some(longer=>tokens(longer).includes(tokens(name))));
}

export function buildRetrievalQuery(question:string,planningAreaName?:string|null,policy?:'balanced-question-v1'):string {
 // Inspect the complete source before trimming/truncating so later geography or invalid data is not hidden.
 if(typeof question!=='string'||question.length>2000||!question.trim()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(question))throw new Error('Invalid retrieval question.');
 const text=tokens(question),query=question.trim().replace(/\s+/gu,' ');
 let prefix='';
 if(!hasForeignRetrievalScope(question)){
  // The caller supplies an already unique planning-area match; geometry and demographic values are irrelevant.
  const area=typeof planningAreaName==='string'?planningAreaName.trim().replace(/\s+/gu,' '):'';
  if(area.length<=80&&/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(area)&&tokens(area)!==' singapore '&&text.includes(tokens(area)))prefix=area+' Singapore: ';
  else if(text.includes(' singapore '))prefix='Singapore: ';
 }
 const full=prefix+query;
 const headLength=GROUNDING_LIMITS.query-163;
 const bounded=policy==='balanced-question-v1'&&full.length>GROUNDING_LIMITS.query?full.slice(0,headLength).replace(/[\uD800-\uDBFF]$/u,'')+' … '+query.slice(-160).replace(/^[\uDC00-\uDFFF]/u,''):full.slice(0,GROUNDING_LIMITS.query);
 // A UTF-16 limit must not turn a valid supplementary character into an isolated high surrogate.
 return bounded.replace(/[\uD800-\uDBFF]$/u,'').trimEnd();
}
