/** Deterministic, extractive research context. No generated findings or additional retrieval. */
import {canonicalGroundingUrl,parseGroundingBundle,type GroundingBundle} from './contract.ts';
import {assertJsonData,ensure,object} from '../experiments/validation.ts';

export const INITIAL_RESEARCH_ASSUMPTION='Simulation assumption: these published source claims are available as common initial background, with role-relevant excerpts highlighted. They are not verified findings, recorded encounters, evidence that anyone read an announcement, or evidence of agreement. Fictional participant statements remain separate from published claims.';
export const RESEARCH_PROMPT_SCOPE='Research excerpts are attributed published claims, not verified findings or fictional participant statements. Separate source claims, fictional views and your own analytical implications. A missing verified evidence-finding bundle does not erase this source background. Do not invent finding IDs or attribute source claims to participants. Common initial background establishes no encounter, agreement, service availability, exhaustive inventory or public sentiment.';
export interface ResearchBriefing {
 version:1;bundleId:string;status:GroundingBundle['status'];budgetCredits:30;reservedCredits:number;reportedCredits:number|null;searches:number;
 stopReason:NonNullable<GroundingBundle['research']>['stopReason'];assumption:string;
 sources:{id:string;title:string;url:string;publisher:string;publishedAt:string|null;retrievedAt:string;passage:string}[];gaps:string[];
}
export interface ActorResearchContext {
 version:1;bundleId:string;assumption:string;scope:string;
 sources:{id:string;title:string;passage:string}[];
 highlights:{sourceId:string;passage:string}[];gaps:string[];
}
const fail='Invalid research briefing.';
const boundedText=(v:unknown,max:number):string=>{ensure(typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v),fail);return v;};
const date=(v:unknown)=>{const s=boundedText(v,30);ensure(Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s,fail);return s;};
const identifier=(v:unknown)=>{const s=boundedText(v,80);ensure(/^[a-z][a-z0-9_-]{0,79}$/i.test(s),fail);return s;};
function count(v:unknown,max:number):number {ensure(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max,fail);return v;}
function list(v:unknown,max:number):unknown[]{ensure(Array.isArray(v)&&v.length<=max,fail);return v;}

/** Strict public allowlist; hidden profiles and unrecognised fields are rejected. */
export function parseResearchBriefing(value:unknown):ResearchBriefing {
 assertJsonData(value);const r=object(value,['version','bundleId','status','budgetCredits','reservedCredits','reportedCredits','searches','stopReason','assumption','sources','gaps']);
 ensure(r.version===1&&r.budgetCredits===30&&['retrieved','failed','not-configured'].includes(r.status as string)&&['coverage','budget','exhausted','timeout','unavailable','not-configured','uncertain-usage'].includes(r.stopReason as string),fail);
 const sources=list(r.sources,16).map(v=>{const s=object(v,['id','title','url','publisher','publishedAt','retrievedAt','passage']),url=canonicalGroundingUrl(s.url);ensure(url===s.url&&s.publisher===new URL(url).hostname,fail);return {id:identifier(s.id),title:boundedText(s.title,240),url,publisher:boundedText(s.publisher,253),publishedAt:s.publishedAt===null?null:date(s.publishedAt),retrievedAt:date(s.retrievedAt),passage:boundedText(s.passage,800)};});
 ensure(new Set(sources.map(s=>s.id)).size===sources.length&&new Set(sources.map(s=>s.url)).size===sources.length,fail);
 const reportedCredits=r.reportedCredits===null?null:r.reportedCredits;ensure(reportedCredits===null||typeof reportedCredits==='number'&&Number.isFinite(reportedCredits)&&reportedCredits>=0&&reportedCredits<=30,fail);
 const result:ResearchBriefing={version:1,bundleId:identifier(r.bundleId),status:r.status as ResearchBriefing['status'],budgetCredits:30,reservedCredits:count(r.reservedCredits,30),reportedCredits,searches:count(r.searches,30),stopReason:r.stopReason as ResearchBriefing['stopReason'],assumption:boundedText(r.assumption,800),sources,gaps:list(r.gaps,12).map(v=>boundedText(v,500))};
 ensure(result.assumption===INITIAL_RESEARCH_ASSUMPTION,fail);
 ensure(result.searches===result.reservedCredits&&(result.reportedCredits===null||result.reportedCredits<=result.reservedCredits),fail);
 ensure(result.status==='retrieved'||sources.length===0,fail);
 if(result.status==='not-configured')ensure(result.stopReason==='not-configured'&&result.searches===0&&result.reportedCredits===null,fail);
 if(result.stopReason==='not-configured')ensure(result.status==='not-configured',fail);
 if(result.stopReason==='coverage')ensure(sources.length>0,fail);
 if(result.stopReason==='budget')ensure(result.reservedCredits===30,fail);
 if(result.searches===0)ensure(result.reportedCredits===null,fail);
 ensure(new TextEncoder().encode(JSON.stringify(result)).length<=120000,fail);return result;
}
/** Older bundles deliberately have no briefing: preserve their snapshots and identities. */
export function createResearchBriefing(input:GroundingBundle):ResearchBriefing|undefined {
 const bundle=parseGroundingBundle(input);if(!bundle.research)return undefined;
 return parseResearchBriefing({version:1,bundleId:bundle.bundleId,status:bundle.status,budgetCredits:30,reservedCredits:bundle.research.reservedCredits,reportedCredits:bundle.usage.credits,searches:bundle.usage.searches,stopReason:bundle.research.stopReason,assumption:INITIAL_RESEARCH_ASSUMPTION,sources:bundle.sources.map(s=>({id:s.id,title:s.title,url:s.url,publisher:s.publisher,publishedAt:s.publishedAt,retrievedAt:s.retrievedAt,passage:s.passages[0].text})),gaps:[...bundle.limitations,'Published excerpts are not verified; relevance, service availability and completeness remain unverified.','Research coverage is bounded and does not establish an exhaustive local inventory or public sentiment.',...(bundle.status!=='retrieved'||!bundle.sources.length?['No usable published source excerpts were retained.']:[])]});
}
const bytes=(s:string)=>new TextEncoder().encode(s).length;
function prefix(s:string,maxBytes:number):string {let result='';for(const char of s){if(bytes(result)+bytes(char)>maxBytes)break;result+=char;}return result;}
const stop=new Set(['that','this','with','from','their','would','could','should','have','what','when','where','which','about','fictional','scenario','understand','proposed','change','discuss','role']);
/** Lexical highlighting is a navigation aid, never a finding or proof of relevance. */
export function researchForActor(input:ResearchBriefing,roleContext:string):ActorResearchContext {
 const briefing=parseResearchBriefing(input),terms=new Set((roleContext.toLowerCase().match(/[a-z]{4,}/g)??[]).filter(t=>!stop.has(t)));
 const ranked=briefing.sources.map((s,index)=>({s,index,score:[...new Set((s.title+' '+s.passage).toLowerCase().match(/[a-z]{4,}/g)??[])].filter(t=>terms.has(t)).length})).filter(s=>s.score>0).sort((a,b)=>b.score-a.score||a.index-b.index);
 const highlights:ActorResearchContext['highlights']=[];let used=0;for(const {s}of ranked){if(highlights.length===3)break;if(used+bytes(s.passage)>4200)continue;highlights.push({sourceId:s.id,passage:s.passage});used+=bytes(s.passage);}
 return {version:1,bundleId:briefing.bundleId,assumption:briefing.assumption,scope:RESEARCH_PROMPT_SCOPE+' All retained sources have bounded extractive background below. Highlights are complete retained passages selected by lexical role overlap, not verified relevance. Complete citations and excerpts remain in the retained research briefing.',sources:briefing.sources.map(s=>({id:s.id,title:prefix(s.title,80),passage:prefix(s.passage,120)})),highlights,gaps:briefing.gaps.slice(0,4).map(s=>prefix(s,200))};
}
