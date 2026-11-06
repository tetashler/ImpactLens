import type {EdgeDetail} from './contract.ts';
import type {SocietyLink,LinkDetail} from '../society/public-contract.ts';

/** Plain-language wording for a link. Aggregate counts, places, themes and stance changes only. */
export interface LinkExplanation {label:string;description:string;detail:EdgeDetail}
interface Names {source:string;target:string;platformName:(id:string)=>string}

const plural=(n:number,one:string,many=one+'s')=>`${n} ${n===1?one:many}`;
const list=(items:string[])=>items.length<=1?items.join(''):items.slice(0,-1).join(', ')+' and '+items.at(-1);
const times=(n:number)=>n===1?'once':n===2?'twice':`${n} times`;
const TIE:Record<string,{label:string;phrase:string}>={
 'neighbourhood-assumption':{label:'assumed neighbours',phrase:'neighbours'},
 'fictional-friendship':{label:'assumed friends',phrase:'friends'},
 'online-follow':{label:'assumed online follow',phrase:'connected online'}
};
const ARGUMENT:Record<string,string>={concern:'concerns',condition:'conditions',support:'support',question:'questions',disagreement:'disagreement'};

function mixText(mix:LinkDetail['mix']):string|undefined{
 if(!mix)return undefined;
 const parts=[['comment','comment'],['reply','reply','replies'],['group-reply','private reply','private replies'],['share','share']] as const;
 const out=parts.flatMap(([key,one,many])=>mix[key]?[plural(mix[key],one,many)]:[]);
 return out.length?list(out):undefined;
}
function aboutText(d:LinkDetail):string|undefined{
 const out:string[]=[];
 if(d.themes?.length)out.push(`Mostly about ${list(d.themes.map(t=>t.label))}`);
 const args=Object.entries(d.arguments??{}).filter(([,n])=>n).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k,n])=>`${ARGUMENT[k]??k} (${n})`);
 if(args.length)out.push(`${out.length?'mainly':'Mainly'} ${list(args)}`);
 return out.length?out.join('; '):undefined;
}
function sentence(text:string){return text.endsWith('.')?text:text+'.';}

function explainLinkRaw(link:SocietyLink,names:Names):LinkExplanation {
 const d=link.detail??{};
 if(link.kind==='ASSUMED_SOCIAL_TIE'){
  const tie=Object.hasOwn(TIE,d.tie??'')?TIE[d.tie!]:{label:'assumed connection',phrase:'connected'};
  const headline=`${names.source} and ${names.target} were set up as ${tie.phrase}`;
  const note='A starting condition of the simulation. It is not an observed relationship and does not mean they interacted.';
  return {label:tie.label,description:`${sentence(headline)} ${note}`,detail:{label:tie.label,basis:'assumed',headline,note}};
 }
 if(link.kind==='RECORDED_INFORMATION_TRANSFER'){
  const interaction=mixText(d.mix),about=aboutText(d);
  const headline=`${plural(link.count,'reply or share','replies and shares')} carried discussion from ${names.source} to ${names.target}`;
  const note='Fictional simulation record. Message content is not shown.';
  return {label:`carried over ×${link.count}`,description:[sentence(headline),interaction&&sentence(interaction),about&&sentence(about),note].filter(Boolean).join(' '),detail:{label:`carried over ×${link.count}`,basis:'recorded',headline,...(interaction?{interaction}:{}),...(about?{about}:{}),note}};
 }
 const interaction=mixText(d.mix);
 const verb=d.mix?.reply&&!d.mix.comment?'replied to':d.mix?.comment&&!d.mix.reply?'commented on':'responded to';
 const headline=`${names.source} ${verb} ${names.target} ${times(link.count)}`;
 const where=d.platforms?.length?`On ${list(d.platforms.map(names.platformName))}`:undefined;
 const about=aboutText(d);
 const s=d.stance;
 const outcome=s?.changes
  ?`After considering ${names.target}'s posts, ${names.source}'s stance changed ${times(s.changes)}${s.towardSupport&&!s.towardConcern?', toward support':s.towardConcern&&!s.towardSupport?', toward concern':` (${s.towardSupport} toward support, ${s.towardConcern} toward concern)`}. This is an association, not proof of influence`
  :link.detail?`No stance change was recorded for ${names.source} after considering ${names.target}'s posts`:undefined;
 const note='Fictional simulation record. Message content is not shown.';
 return {label:`${verb} ×${link.count}`,description:[sentence(headline),interaction&&sentence(interaction),where&&sentence(where),about&&sentence(about),outcome&&sentence(outcome),note].filter(Boolean).join(' '),detail:{label:`${verb} ×${link.count}`,basis:'recorded',headline,...(interaction?{interaction}:{}),...(where?{where}:{}),...(about?{about}:{}),...(outcome?{outcome}:{}),note}};
}

const plain=(name:string)=>(/^[A-Z0-9_]+$/.test(name)?name:name.replace(/([a-z])([A-Z])/g,'$1 $2')).replace(/[-_]+/g,' ').toLowerCase();
const clip=(text:string,max=380)=>text.length<=max?text:text.slice(0,max-1).trimEnd()+'…';

/** Plain wording for the fixed relationship kinds the society graph creates between its own records. */
function explainKnownRaw(kind:string,n:{source:string;target:string},description:string):EdgeDetail|undefined {
 const table:Record<string,{label:string;headline:string;basis:EdgeDetail['basis'];note:string}>={
  REPRESENTS_FICTIONAL_SCENARIO_ROLE:{label:'represents role',headline:`${n.source} represents the scenario role ${n.target}`,basis:'assumed',note:'A binding set by the simulation. It does not establish a real job, authority or demographic.'},
  SIMULATED_PARTICIPATION:{label:'took part on',headline:`${n.source} took part on ${n.target}`,basis:'recorded',note:'Recorded activity in the fictional environment. No real platform account is implied.'},
  AGGREGATED_SIMULATED_PARTICIPATION:{label:'took part on',headline:`${n.source} took part on ${n.target}`,basis:'recorded',note:'Counts people with recorded activity, not an event total.'},
  CREATED_FICTIONAL_GROUP:{label:'created group',headline:`${n.source} created the group ${n.target}`,basis:'recorded',note:'Private participant lists stay on the server.'},
  USES_SIMULATED_ENVIRONMENT:{label:'runs on',headline:`${n.source} runs on ${n.target}`,basis:'recorded',note:'Fictional group inside the simulated environment.'}
 };
 const k=Object.hasOwn(table,kind)?table[kind]:undefined;if(!k)return undefined;
 return {label:k.label,basis:k.basis,headline:k.headline,about:clip(description),note:k.note};
}

const EVENT:Record<string,{label:string;verb:string}>={
 argument:{label:'made an argument',verb:'made an argument to'},response:{label:'responded',verb:'responded to'},
 'challenge-assumption':{label:'challenged an assumption',verb:'challenged an assumption of'},'evidence-question':{label:'asked for evidence',verb:'asked for evidence from'},
 acknowledgement:{label:'acknowledged',verb:'acknowledged'},revision:{label:'revised view',verb:'revised their view after hearing'}
};
const CHANGE:Record<string,string>={revised:'revised their position',unchanged:'kept their position','more-conditional':'became more conditional'};
/** One fictional stakeholder turn between two roles. Never includes the statement text. */
function explainStakeholderEventRaw(e:{type:string;position:string;positionChange:string;topics:string[]},n:{source:string;target:string}):EdgeDetail {
 const t=Object.hasOwn(EVENT,e.type)?EVENT[e.type]:{label:plain(e.type),verb:plain(e.type)+' to'};
 const topics=e.topics.slice(0,3).filter(Boolean);
 const change=Object.hasOwn(CHANGE,e.positionChange)?CHANGE[e.positionChange]:undefined;
 return {label:t.label,basis:'recorded',headline:`${n.source} ${t.verb} ${n.target}`,interaction:`One fictional stakeholder turn (${plain(e.type)})`,
  ...(topics.length?{about:`Topics: ${list(topics)}`}:{}),
  outcome:`${n.source} was ${e.position.replace('-',' ')}${change?` and ${change} in this turn`:''}`,note:'Fictional stakeholder dialogue. The statement text is not shown here and is not an observed view.'};
}
/** A model-proposed opportunity or relationship. Never presented as observed. */
function explainProposedRaw(kindName:string,n:{source:string;target:string},statement:string,reported:boolean):EdgeDetail {
 const phrase=plain(kindName);
 return {label:phrase,basis:reported?'reported':'proposed',headline:`${n.source} ${phrase} ${n.target}`,about:clip(statement),
  note:reported?'Taken from a source passage. Not independently corroborated.':'Suggested by the model. Not an observed or causal relationship, and not verified.'};
}

/** Source labels remain untouched. Derived display strings must satisfy the stricter edge-detail contract. */
const FIELD_MAX=399;
const displayText=(text:string)=>text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ').replaceAll('<','‹').replaceAll('>','›').trim();
function fitText(text:string,max=FIELD_MAX){
 if(text.length<=max)return text;
 let end=max-1;
 // Do not split a UTF-16 surrogate pair at the display limit.
 if(/[\uD800-\uDBFF]/.test(text[end-1]??'')&&/[\uDC00-\uDFFF]/.test(text[end]??''))end--;
 return text.slice(0,end).trimEnd()+'…';
}
function fit(detail:EdgeDetail):EdgeDetail {
 const out={...detail} as Record<string,string>;
 for(const key of ['headline','interaction','where','about','outcome','note'])if(typeof out[key]==='string'){
  const value=displayText(out[key]);if(value)out[key]=fitText(value);else delete out[key];
 }
 out.headline??='Relationship in this scenario';
 out.label=fitText(displayText(out.label)||'related to',80);
 return out as unknown as EdgeDetail;
}
export function explainLink(link:SocietyLink,names:Names):LinkExplanation {const e=explainLinkRaw(link,names),detail=fit(e.detail);return {label:detail.label,description:fitText(displayText(e.description)||detail.headline,1990),detail};}
export function explainKnown(kind:string,n:{source:string;target:string},description:string):EdgeDetail|undefined {const d=explainKnownRaw(kind,n,description);return d&&fit(d);}
export function explainStakeholderEvent(e:{type:string;position:string;positionChange:string;topics:string[]},n:{source:string;target:string}):EdgeDetail {return fit(explainStakeholderEventRaw(e,n));}
export function explainProposed(kindName:string,n:{source:string;target:string},statement:string,reported:boolean):EdgeDetail {return fit(explainProposedRaw(kindName,n,statement,reported));}
