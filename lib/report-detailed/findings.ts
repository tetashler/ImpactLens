/** Browser-safe inspectable findings. References establish traceability, not semantic verification. */
import {canonicalGroundingUrl} from '../grounding/contract.ts';
export const REPORT_FINDING_LIMITS=Object.freeze({findings:5,supports:6,limitations:4,dependencies:4,catalog:80,selectedEvidence:30,catalogBytes:100000});
export const FINDING_EVIDENCE_LABELS={calculation:'Calculated estimate','source-passage':'Published claim',assumption:'Hypothetical assumption','discussion-event':'Fictional discussion','model-limitation':'Unknown / model limitation'} as const;
export interface ReportFindingDraft {text:string;supportIds:string[];limitations:string[];unresolvedDependencies:string[]}
export interface ReportFinding extends ReportFindingDraft {id:string}
interface EvidenceBase {id:string;label:string;text:string;limitations:string[]}
export type ReportEvidenceItem=
 |(EvidenceBase&{kind:'calculation';metric:string;value:number;unit:'minutes'|'share'|'agents'|'population-weight';denominator:number|null;denominatorLabel:string|null;assumptions:string[]})
 |(EvidenceBase&{kind:'source-passage';sourceId:string;passageId:string;title:string;url:string;publisher:string;publishedAt:string|null;retrievedAt:string})
 |(EvidenceBase&{kind:'assumption';assumptionId:string|null;reviewStatus:'allowed-hypothetical'|'unknown'|'stated-hypothetical'})
 |(EvidenceBase&{kind:'discussion-event';phase:'initial'|'followup';actorLabel:string})
 |(EvidenceBase&{kind:'model-limitation';scope:'healthcare-service-model'|'report-evidence'});
export type FindingBasis='calculated'|'published'|'hypothetical'|'fictional'|'unknown';
const fail=()=>{throw Error('REPORT_FINDINGS_SHAPE');};
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return fail();return value as Record<string,unknown>;}
function exact(value:Record<string,unknown>,keys:readonly string[]){if(Reflect.ownKeys(value).length!==keys.length||Object.keys(value).sort().join(',')!==[...keys].sort().join(','))fail();}
function text(value:unknown,max:number):string {if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))return fail();return value.trim();}
function id(value:unknown):string {const result=text(value,160);if(!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(result))return fail();return result;}
function strings(value:unknown,min:number,max:number,width:number,ids=false):string[]{if(!Array.isArray(value)||value.length<min||value.length>max)return fail();const result=Array.from(value,v=>ids?id(v):text(v,width));if(new Set(result).size!==result.length)return fail();return result;}
function draft(value:unknown,stored:boolean):ReportFindingDraft|ReportFinding{
 const r=object(value);exact(r,[...(stored?['id']:[]),'text','supportIds','limitations','unresolvedDependencies']);
 const result:ReportFindingDraft={text:text(r.text,1500),supportIds:strings(r.supportIds,1,6,160,true),limitations:strings(r.limitations,1,4,600),unresolvedDependencies:strings(r.unresolvedDependencies,0,4,600)};
 if(!stored)return result;const findingId=id(r.id);if(!/^finding-[1-5]$/.test(findingId))return fail();return {id:findingId,...result};
}
export function parseFindingDrafts(value:unknown):ReportFindingDraft[]{if(!Array.isArray(value)||value.length>5)return fail();return Array.from(value,v=>draft(v,false) as ReportFindingDraft);}
export function parseReportFinding(value:unknown):ReportFinding{return draft(value,true) as ReportFinding;}
export function parseReportEvidenceItem(value:unknown):ReportEvidenceItem{
 const r=object(value),common=['id','kind','label','text','limitations'];
 const extras:Record<string,string[]>={calculation:['metric','value','unit','denominator','denominatorLabel','assumptions'],'source-passage':['sourceId','passageId','title','url','publisher','publishedAt','retrievedAt'],assumption:['assumptionId','reviewStatus'],'discussion-event':['phase','actorLabel'],'model-limitation':['scope']};
 if(typeof r.kind!=='string'||!Object.hasOwn(extras,r.kind))return fail();exact(r,[...common,...extras[r.kind]]);
 const base={id:id(r.id),label:text(r.label,180),text:text(r.text,r.kind==='discussion-event'?900:r.kind==='source-passage'?800:1200),limitations:strings(r.limitations,1,6,600)};
 switch(r.kind){
  case 'calculation':{
   if(typeof r.value!=='number'||!Number.isFinite(r.value)||!['minutes','share','agents','population-weight'].includes(r.unit as string)||!(r.denominator===null||typeof r.denominator==='number'&&Number.isFinite(r.denominator)&&r.denominator>=0))return fail();
   const denominatorLabel=r.denominatorLabel===null?null:text(r.denominatorLabel,180);if((r.denominator===null)!==(denominatorLabel===null))return fail();
   if(r.unit==='share'&&(r.value<0||r.value>1)||['agents','population-weight'].includes(r.unit as string)&&r.value<0||r.unit==='agents'&&!Number.isSafeInteger(r.value))return fail();
   return {...base,kind:r.kind,metric:text(r.metric,100),value:r.value,unit:r.unit as 'minutes'|'share'|'agents'|'population-weight',denominator:r.denominator as number|null,denominatorLabel,assumptions:strings(r.assumptions,0,12,600)};
  }
  case 'source-passage':{
   const url=text(r.url,1600);try{if(canonicalGroundingUrl(url)!==url)return fail();}catch{return fail();}
   const date=(v:unknown)=>{const result=text(v,40);if(!Number.isFinite(Date.parse(result)))return fail();return result;};
   const passageId=id(r.passageId);if(!/^passage-[a-f0-9]{32}$/.test(passageId))return fail();
   return {...base,kind:r.kind,sourceId:id(r.sourceId),passageId,title:text(r.title,240),url,publisher:text(r.publisher,253),publishedAt:r.publishedAt===null?null:date(r.publishedAt),retrievedAt:date(r.retrievedAt)};
  }
  case 'assumption':if(!['allowed-hypothetical','unknown','stated-hypothetical'].includes(r.reviewStatus as string))return fail();return {...base,kind:r.kind,assumptionId:r.assumptionId===null?null:id(r.assumptionId),reviewStatus:r.reviewStatus as 'allowed-hypothetical'|'unknown'|'stated-hypothetical'};
  case 'discussion-event':if(!['initial','followup'].includes(r.phase as string))return fail();return {...base,kind:r.kind,phase:r.phase as 'initial'|'followup',actorLabel:text(r.actorLabel,180)};
  case 'model-limitation':if(!['healthcare-service-model','report-evidence'].includes(r.scope as string))return fail();return {...base,kind:r.kind,scope:r.scope as 'healthcare-service-model'|'report-evidence'};
  default:return fail();
 }
}
export function validateFindingReferences(findings:readonly ReportFinding[],evidence:readonly ReportEvidenceItem[]):void{
 if(findings.length>5||evidence.length>30)fail();const ids=new Set<string>(),findingIds=new Set<string>();
 for(const raw of evidence){const e=parseReportEvidenceItem(raw);if(ids.has(e.id))fail();ids.add(e.id);}
 for(const raw of findings){const f=parseReportFinding(raw);if(findingIds.has(f.id)||f.supportIds.some(s=>!ids.has(s)))fail();findingIds.add(f.id);}
}
export function findingBasis(finding:ReportFindingDraft,evidence:readonly ReportEvidenceItem[]):FindingBasis[]{
 const byId=new Map(evidence.map(e=>[e.id,e]));const result=new Set<FindingBasis>();
 for(const support of finding.supportIds){const e=byId.get(support);if(!e)return fail();result.add(e.kind==='calculation'?'calculated':e.kind==='source-passage'?'published':e.kind==='discussion-event'?'fictional':e.kind==='assumption'&&e.reviewStatus!=='unknown'?'hypothetical':'unknown');}
 return [...result];
}
