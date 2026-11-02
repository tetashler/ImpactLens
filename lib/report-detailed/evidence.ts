import type {PublicExplore} from '../society/public-contract.ts';
import {projectReportEvidence} from '../report-summary/evidence.ts';

const clip=(value:string,max:number)=>Array.from(value.trim()).slice(0,max).join('');
const list=(values:string[],count=24,width=800)=>values.slice(0,count).map(value=>clip(value,width));
function publicUrl(value:string):string|null {
 try {const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href.slice(0,1600):null;}catch{return null;}
}
/** Expanded public context only. Raw discussion is authenticated and added server-side. */
export function projectDetailedReportEvidence(run:PublicExplore){
 const base=projectReportEvidence(run);
 const evidence={...base,question:run.question.slice(0,2000),assumptions:list(run.assumptions),limitations:list(run.limitations),
  stakeholders:run.roles.slice(0,24).map(role=>({label:clip(role.label,180),goals:list(role.goals,6,500)})),
  sources:run.sources.slice(0,16).flatMap(source=>{const url=publicUrl(source.url);return url?[{title:clip(source.title,400),url,publisher:clip(source.publisher,240),publishedAt:source.publishedAt===null?null:clip(source.publishedAt,80),retrievedAt:clip(source.retrievedAt,80)}]:[];}),
  reportScope:'Public fictional stakeholder statements and stated calculation assumptions only. Source metadata establishes provenance, not independent verification. A source title alone cannot support a substantive factual claim. Participant suggestions and analyst follow-up questions must be distinguished.',
 };
 if(new TextEncoder().encode(JSON.stringify(evidence)).length>(run.research?210000:90000))throw Error('DETAILED_REPORT_INPUT_SIZE');
 return evidence;
}
export type DetailedReportEvidence=ReturnType<typeof projectDetailedReportEvidence>;
