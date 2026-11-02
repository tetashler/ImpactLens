/** Optional, sequential scenario research. Only this initial stage spends retrieval credits. */
import process from 'node:process';
import {createGroundingBundle,GROUNDING_LIMITS,type GroundingBundle,type GroundingSource,type ScenarioResearch} from '../../grounding/contract.ts';
import {safeRequestedLocality} from '../../grounding/geographic-coverage.ts';
import {buildRetrievalQuery,hasForeignRetrievalScope,retrievalScopeAnchors} from './retrieval-query.ts';
import {retrieveTavilyGrounding,type TavilyGroundingDependencies} from './tavily.ts';

const BUDGET=30;
const abortError=()=>new DOMException('Scenario research cancelled.','AbortError');
const DISCLAIMER='Retrieved candidates are unverified source excerpts. Query coverage is a search heuristic, not verification, completeness, local service availability or public sentiment.';
type Facet={topic:string;terms:string;required:boolean};
const topics:[string,RegExp,string[]][]=[
 ['healthcare',/\b(?:health|healthcare|(?:poly)?clinics?|hospitals?|eldercare|caregivers?|caregiving|medical|seniors?|elderly)\b/i,['existing health and care services eligibility access','caregiver workforce staffing capacity and costs']],
 ['transport',/\b(?:mrt|lrt|trains?|transport|transit|buses?|commut(?:e|es|ers?|ing)?|fares?|traffic|roads?|cycling)\b/i,['public transport services ridership fares and accessibility','transport operations disruptions commuting impacts']],
 ['housing',/\b(?:housing|homes?|hdb|rent|rental|residential|property|tenants?)\b/i,['housing policies affordability eligibility','residents housing services displacement constraints']],
 ['education',/\b(?:school|education|students?|teachers?|university|training|tuition)\b/i,['education policies school enrolment access','students teachers learning resources and costs']],
 ['economy',/\b(?:business|businesses|shops?|workers?|employment|jobs?|wages?|economic|economy|tax|retail|sme)\b/i,['business employment economic data and policies','business workers operating costs and constraints']],
 ['environment',/\b(?:climate|environment|flood|heat|energy|waste|recycling|pollution|water|green)\b/i,['environment climate infrastructure data and policies','environmental mitigation implementation costs constraints']],
 ['technology',/\b(?:internet|technology|digital|ai|automation|data|privacy|cyber|online|app)\b/i,['digital technology adoption access privacy policies','technology implementation security workforce constraints']],
 ['community',/\b(?:volunteer|volunteering|community|festival|neighbourhood|social|charity|poverty)\b/i,['community programmes participation services and accessibility','volunteer resident coordination resource constraints']],
 ['safety',/\b(?:safety|crime|police|emergency|disaster|security)\b/i,['public safety emergency policies published data','emergency response community coordination constraints']],
];

function queryPlan(question:string,locality:string|null|undefined):{query:string;facets:{query:string;topic:string;required:boolean;coverageId:string}[]} {
 // Validate and examine the complete question before bounding it; the existing builder
 // also prevents locality context from overwriting foreign or cross-border scope.
 let query=buildRetrievalQuery(question,locality,'balanced-question-v1');
 const area=safeRequestedLocality(locality);
 if(area&&!hasForeignRetrievalScope(question)){
  const anchor=area.toLowerCase()==='singapore'?'Singapore: ':area+' Singapore: ';
  if(!query.startsWith(anchor)){
   const full=anchor+query.replace(/^Singapore: /,'');
   query=full.length<=GROUNDING_LIMITS.query?full:full.slice(0,337).replace(/[\uD800-\uDBFF]$/u,'')+' … '+full.slice(-160).replace(/^[\uDC00-\uDFFF]/u,'');
  }
 }
 const facets:Facet[]=[
  {topic:'background',terms:'published background existing policies official information',required:true},
  {topic:'implementation',terms:'implementation operations resources costs constraints',required:true},
  {topic:'stakeholders',terms:'affected residents workers service providers access concerns published evidence',required:true},
 ];
 for(const [topic,pattern,terms] of topics)if(pattern.test(question.normalize('NFKC')))for(const term of terms)facets.push({topic,terms:term,required:true});
 // Fallback refinements are useful when earlier facets return no excerpts. They are
 // deterministic and never automatically retry a failed or uncertain request.
 const primary=facets.map(f=>({...f,coverageId:f.topic+':'+f.terms}));
 const expanded=[...primary];
 for(const refinement of ['official statistics baseline','published evaluation limitations'])for(const facet of primary)expanded.push({...facet,terms:facet.terms+' '+refinement,required:false});
 const queries=new Set<string>();
 // Leave room for exact question context and a useful facet even when a question
 // names many countries. Whole anchors are retained; none are synthesized.
 const scope=retrievalScopeAnchors(question).reduce((joined,name)=>{
  const next=joined?joined+', '+name:name;return next.length<=160?next:joined;
 },'');
 return {query,facets:expanded.slice(0,BUDGET).map(facet=>{
  const suffix=' | '+(scope?scope+' | ':'')+facet.terms;
  const room=GROUNDING_LIMITS.query-suffix.length;
  const context=query.length<=room?query:query.slice(0,room-164).replace(/[\uD800-\uDBFF]$/u,'')+' … '+query.slice(-160).replace(/^[\uDC00-\uDFFF]/u,'');
  return {query:context+suffix,topic:facet.topic,required:facet.required,coverageId:facet.coverageId};
 }).filter(facet=>{if(queries.has(facet.query))return false;queries.add(facet.query);return true;})};
}

export async function retrieveScenarioResearch(question:string,locality:string|null|undefined,signal?:AbortSignal,dependencies:TavilyGroundingDependencies={}):Promise<GroundingBundle> {
 if(signal?.aborted)throw abortError();
 const plan=queryPlan(question,locality);
 const retrievedAt=(dependencies.now??(()=>new Date()))().toISOString();
 const key=(dependencies.key??process.env.TAVILY_API_KEY??'').trim();
 const research:ScenarioResearch={version:1,budgetCredits:BUDGET,reservedCredits:0,stopReason:'exhausted',queries:[]};
 const sources:GroundingSource[]=[];
 let anyRetrieved=false;
 const make=(extra:string[]=[])=>{
  const status:GroundingBundle['status']=research.stopReason==='not-configured'?'not-configured':anyRetrieved?'retrieved':'failed';
  const credits=research.queries.length&&research.queries.every(q=>q.credits!==null)?research.queries.reduce((sum,q)=>sum+q.credits!,0):null;
  return createGroundingBundle({status,query:plan.query,retrievedAt,sources,limitations:[DISCLAIMER,
   'Institutional domain ranking is a presentation heuristic, not verification of authority or relevance. Excerpts remain attributed to their publishers.',
   'Search facets are deterministic wording from the question, not inferred facts. Hypothetical interventions and simulated reactions are not published claims.',
   ...extra],usage:{searches:research.queries.length,credits},research});
 };
 if(!key){research.stopReason='not-configured';return make(['Optional web grounding is not configured.']);}

 const controller=new AbortController();let timedOut=false;
 const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
 const timeout=Number.isFinite(dependencies.timeoutMs)?Math.max(1,Math.min(20_000,dependencies.timeoutMs!)):20_000;
 const expiresAt=Date.now()+timeout;
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeout);
 const required=new Set(plan.facets.filter(f=>f.required).map(f=>f.coverageId));
 const covered=new Set<string>();
 const limitations:string[]=[];
 try {
  for(const facet of plan.facets){
   if(signal?.aborted)throw abortError();
   if(controller.signal.aborted||Date.now()>=expiresAt){research.stopReason='timeout';break;}
   if(research.reservedCredits>=BUDGET){research.stopReason='budget';break;}
   // Reserve before dispatch and never refund: neither an error nor absent usage
   // proves a provider did not charge. No parallel in-flight requests or retries.
   research.reservedCredits++;
   const record:ScenarioResearch['queries'][number]={query:facet.query,topic:facet.topic,status:'failed',credits:null,sourceIds:[]};
   research.queries.push(record);
   let result:GroundingBundle;
   try {
    result=await retrieveTavilyGrounding(facet.query,controller.signal,{...dependencies,key,timeoutMs:Math.max(1,expiresAt-Date.now()),passagePolicy:'locality-window-v1',locality});
   }catch{
    if(signal?.aborted)throw abortError();
    research.stopReason=timedOut||controller.signal.aborted?'timeout':'unavailable';break;
   }
   if(signal?.aborted)throw abortError();
   record.status=result.status;
   // A basic request is reserved as one credit. An unexpected report is uncertain
   // accounting and stops dispatch; it cannot authorize additional requests.
   record.credits=result.usage.credits!==null&&result.usage.credits<=1?result.usage.credits:null;
   for(const source of result.sources){
    let retained=sources.find(s=>s.url===source.url);
    if(!retained&&sources.length<GROUNDING_LIMITS.sources){sources.push(source);retained=source;}
    if(retained&&!record.sourceIds.includes(retained.id))record.sourceIds.push(retained.id);
   }
   if(result.status==='retrieved')anyRetrieved=true;
   if(result.status!=='retrieved'){
    research.stopReason=result.limitations.some(l=>/timed out/i.test(l))?'timeout':'unavailable';break;
   }
   if(record.credits===null){research.stopReason='uncertain-usage';break;}
   if(record.sourceIds.length)covered.add(facet.coverageId);
   if(sources.length>=4&&[...required].every(query=>covered.has(query))){research.stopReason='coverage';break;}
   if(research.reservedCredits===BUDGET)research.stopReason='budget';
  }
  if(research.stopReason==='timeout')limitations.push('Optional web grounding timed out. Completed source excerpts were retained; research coverage is partial.');
  else if(research.stopReason==='unavailable')limitations.push('Optional web grounding is unavailable. Completed source excerpts were retained; no failed request was retried.');
  else if(research.stopReason==='uncertain-usage')limitations.push('Provider credit usage was missing or inconsistent with the one-credit basic reservation. Research stopped without refunding the reservation.');
  else if(research.stopReason!=='coverage')limitations.push('Research stopped within its query or credit bound. Missing query coverage remains a research gap.');
  if(!sources.length)limitations.push('No usable source excerpts were returned.');
  const area=safeRequestedLocality(locality);
  const words=(s:string)=>' '+s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()+' ';
  if(area&&!sources.some(s=>s.passages.some(p=>words(p.text).includes(words(area)))))limitations.push(`No supplied passage mentions ${area}; national or other background must not be represented as locality-specific support.`);
  limitations.push('Locality-window-v1 retains bounded exact substrings. Omitted source text is unavailable; locality mentions do not verify applicability.');
  return make(limitations);
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
