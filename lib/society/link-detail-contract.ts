/** Public relationship metadata is an aggregate allowlist, never an arbitrary nested object. */
import {ensure,object,text} from '../experiments/validation.ts';
import type {LinkDetail,SocietyLink} from './public-contract.ts';

const KINDS=['RECORDED_INFORMATION_TRANSFER','RECORDED_PUBLIC_INTERACTION','ASSUMED_SOCIAL_TIE'] as const;
const MIX=['comment','reply','group-reply','share'] as const;
const ARGUMENTS=['concern','condition','support','question','disagreement'] as const;
const TIES=['neighbourhood-assumption','fictional-friendship','online-follow'] as const;
function natural(value:unknown){ensure(Number.isSafeInteger(value)&&(value as number)>=0,'SOCIETY_LINK_COUNT');return value as number;}

export function parseLinkDetail(value:unknown):LinkDetail {
 const d=object(value,['mix','platforms','themes','arguments','stance','tie'],[]);
 if(d.mix!==undefined){const counts=object(d.mix,MIX,[]);for(const count of Object.values(counts))natural(count);}
 if(d.platforms!==undefined){
  ensure(Array.isArray(d.platforms)&&d.platforms.length<=4,'SOCIETY_LINK_PLATFORMS');const seen=new Set<string>();
  for(const raw of d.platforms){const id=text(raw,91);ensure(/^[a-z][a-z0-9:-]{0,90}$/.test(id)&&!seen.has(id),'SOCIETY_LINK_PLATFORM');seen.add(id);}
 }
 if(d.themes!==undefined){
  ensure(Array.isArray(d.themes)&&d.themes.length<=2,'SOCIETY_LINK_THEMES');const seen=new Set<string>();
  for(const raw of d.themes){const theme=object(raw,['label','count']),label=text(theme.label,180,true);ensure(!seen.has(label),'SOCIETY_LINK_THEME');seen.add(label);natural(theme.count);}
 }
 if(d.arguments!==undefined){const counts=object(d.arguments,ARGUMENTS,[]);for(const count of Object.values(counts))natural(count);}
 if(d.stance!==undefined){const stance=object(d.stance,['changes','towardSupport','towardConcern']);const changes=natural(stance.changes),support=natural(stance.towardSupport),concern=natural(stance.towardConcern);ensure(Number.isSafeInteger(support+concern)&&changes===support+concern,'SOCIETY_LINK_STANCE');}
 if(d.tie!==undefined)ensure(TIES.includes(d.tie as typeof TIES[number]),'SOCIETY_LINK_TIE');
 return value as LinkDetail;
}

export function parseSocietyLink(value:unknown):SocietyLink {
 const link=object(value,['source','target','kind','count','detail'],['source','target','kind','count']);
 text(link.source,200);text(link.target,200);ensure(KINDS.includes(link.kind as typeof KINDS[number])&&natural(link.count)>0,'SOCIETY_LINK');
 if(link.detail!==undefined)parseLinkDetail(link.detail);
 return value as SocietyLink;
}
