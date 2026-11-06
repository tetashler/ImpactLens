/** Citizen policy only: bounded relationship display, never a replacement for authoritative records. */
import {ensure} from '../experiments/validation.ts';
import type {SocietySummary} from '../society/public-contract.ts';
import {parseSocietyLink} from '../society/link-detail-contract.ts';
const kinds=['RECORDED_INFORMATION_TRANSFER','RECORDED_PUBLIC_INTERACTION','ASSUMED_SOCIAL_TIE'] as const;
type Link=SocietySummary['links'][number];
const bytes=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v)).length;
const key=(l:Link)=>JSON.stringify([l.source,l.target,l.kind]);
const assumed=(l:Link)=>Number(l.kind==='ASSUMED_SOCIAL_TIE');
const compare=(a:Link,b:Link)=>assumed(a)-assumed(b)||b.count-a.count||key(a).localeCompare(key(b),'en');

export function projectCitizenPublicView(summary:SocietySummary):SocietySummary{
 ensure(summary.agents.length<=100&&summary.links.length<=30000&&!summary.limitations.some(l=>l.startsWith('citizen-public-view-v1:')),'CITIZEN_PUBLIC_PROJECTION_INPUT');
 const seen=new Set<string>();for(const l of summary.links){parseSocietyLink(l);ensure(!seen.has(key(l)),'CITIZEN_PUBLIC_LINK');seen.add(key(l));}
 const sorted=[...summary.links].sort(compare),sources=new Map<string,Link>();for(const l of sorted)if(!sources.has(l.source))sources.set(l.source,l);ensure(sources.size<=256,'CITIZEN_PUBLIC_SOURCE_BOUND');
 const first=[...sources.values()].sort((a,b)=>assumed(a)-assumed(b)||a.source.localeCompare(b.source,'en')),selectedKeys=new Set(first.map(key));
 let links=[...first,...sorted.filter(l=>!selectedKeys.has(key(l)))].slice(0,256);
 const stats=(rows:Link[])=>({pairs:rows.length,count:rows.reduce((n,l)=>n+l.count,0)}),complete=stats(sorted);ensure(Number.isSafeInteger(complete.count),'CITIZEN_PUBLIC_LINK_COUNT');
 const render=(shown:Link[]):SocietySummary=>{
  const displayed=stats(shown),metadata={selectedPairs:displayed.pairs,totalPairs:complete.pairs,displayedCount:displayed.count,completeCount:complete.count,kinds:Object.fromEntries(kinds.map(kind=>{const d=stats(shown.filter(l=>l.kind===kind)),c=stats(sorted.filter(l=>l.kind===kind));return [kind,{displayedPairs:d.pairs,completePairs:c.pairs,displayedCount:d.count,completeCount:c.count}];}))};
  return {...summary,links:[...shown].sort(compare),limitations:[...summary.limitations,'citizen-public-view-v1: Selected relationship display only; full pairs remain server-side. Counts and all agents are retained. '+JSON.stringify(metadata)]};
 };
 ensure(bytes(render([]))<=262144,'CITIZEN_PUBLIC_BASE_BOUND');
 while(bytes(render(links))>262144){const perSource=new Map<string,number>();for(const l of links)perSource.set(l.source,(perSource.get(l.source)??0)+1);const weakest=[...links].sort((a,b)=>assumed(b)-assumed(a)||Number(perSource.get(a.source)===1)-Number(perSource.get(b.source)===1)||a.count-b.count||key(b).localeCompare(key(a),'en'))[0];ensure(weakest,'CITIZEN_PUBLIC_BASE_BOUND');links=links.filter(l=>l!==weakest);}
 // Public error/status projection is mutable; detach it fully from the authoritative source.
 return structuredClone(render(links));
}
