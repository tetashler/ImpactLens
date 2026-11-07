/** Server-owned allowlist from retained public evidence. Never return the internal discussion pack. */
import {createHash} from 'node:crypto';
import type {PublicExplore} from '../society/public-contract.ts';
import type {PublicDiscussionEvidence} from '../report-summary/discussion-contract.ts';
import {canonicalGroundingUrl} from '../grounding/contract.ts';
import {parseFindingDrafts,parseReportFinding,parseReportEvidenceItem,validateFindingReferences,REPORT_FINDING_LIMITS,type ReportFindingDraft,type ReportFinding,type ReportEvidenceItem} from '../report-detailed/findings.ts';

const clip=(s:string,max:number)=>s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,max).replace(/[\ud800-\udbff]$/,'');
const unique=(s:string[],max=6,width=600)=>[...new Set(s.map(v=>clip(v,width)).filter(Boolean))].slice(0,max);
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,32);
const healthcareText='Waiting-time improvement is unknown. Healthcare waiting times, service capacity and health effects have not been calculated; plotted locations and fictional discussion cannot establish improvement without a service model.';
export function hasHealthcareModelGap(catalog:readonly ReportEvidenceItem[]):boolean{return catalog.some(e=>e.kind==='model-limitation'&&e.scope==='healthcare-service-model');}
function healthcare(run:PublicExplore):boolean{return run.locationContext?.interventionType==='new_polyclinic'||/\b(?:polyclinic|healthcare|health care|hospital|clinic|medical care)\b/i.test(run.question);}

export function buildFindingEvidenceCatalog(run:PublicExplore,discussion:PublicDiscussionEvidence):ReportEvidenceItem[]{
 const result:ReportEvidenceItem[]=[],ids=new Set<string>();
 type WithoutId<T>=T extends unknown?Omit<T,'id'>:never;
 function add(prefix:string,value:WithoutId<ReportEvidenceItem>,privateIdentity?:string){
  const item=parseReportEvidenceItem({id:`${prefix}-${digest([run.runId,value,privateIdentity??null])}`,...value});
  if(result.length>=REPORT_FINDING_LIMITS.catalog||ids.has(item.id)||Buffer.byteLength(JSON.stringify([...result,item]),'utf8')>REPORT_FINDING_LIMITS.catalogBytes)return;
  ids.add(item.id);result.push(item);
 }
 if(healthcare(run))add('limitation',{kind:'model-limitation',scope:'healthcare-service-model',label:'Healthcare service effects are unknown',text:healthcareText,limitations:['No service model, staffing, demand or treatment-capacity calculation is supplied.']});
 const impact=run.grounding?.impact,summary=impact?.summary;
 if(impact&&summary){
  const assumptions=unique(impact.assumptions,12),limitations=unique(['Calculated estimates under stated assumptions, not observed or causal outcomes.',...(run.grounding?.limitations??[])],6);
  const metrics:{metric:string;label:string;value:number|null;unit:'minutes'|'share'|'agents'|'population-weight';denominator:number|null;denominatorLabel:string|null}[]=[
   {metric:'meanMinutesSaved',label:'Weighted mean commute minutes saved',value:summary.meanMinutesSaved,unit:'minutes',denominator:summary.comparableWeight,denominatorLabel:'Comparable represented population weight'},
   {metric:'benefitingShare',label:'Share benefiting among comparable population weight',value:summary.benefitingShare,unit:'share',denominator:summary.comparableWeight,denominatorLabel:'Comparable represented population weight'},
   {metric:'representedAgents',label:'Represented fictional agents',value:summary.representedAgents,unit:'agents',denominator:null,denominatorLabel:null},
   {metric:'representedPopulation',label:'Represented population weight',value:summary.representedPopulation,unit:'population-weight',denominator:null,denominatorLabel:null},
   {metric:'comparableWeight',label:'Comparable represented population weight',value:summary.comparableWeight,unit:'population-weight',denominator:summary.representedPopulation,denominatorLabel:'Total represented population weight'},
  ];
  for(const [status,c]of Object.entries(summary.coverage))for(const [field,unit]of [['agents','agents'],['weight','population-weight']] as const)metrics.push({metric:`coverage.${status}.${field}`,label:`${status}: ${field==='agents'?'fictional agents':'represented population weight'}`,value:c[field],unit,denominator:field==='agents'?summary.representedAgents:summary.representedPopulation,denominatorLabel:field==='agents'?'Total represented fictional agents':'Total represented population weight'});
  for(const metric of metrics){if(metric.value===null||!Number.isFinite(metric.value))continue;add('calculation',{kind:'calculation',...metric,value:metric.value,text:`${metric.label}: ${metric.value} ${metric.unit}.${metric.denominator===null?'':` Denominator: ${metric.denominator} (${metric.denominatorLabel}).`}`,assumptions,limitations});}
 }
 for(const source of (run.research?.sources??[]).slice(0,16)){
  const passage=clip(source.passage,800);if(!passage)continue;
  try{if(canonicalGroundingUrl(source.url)!==source.url)continue;}catch{continue;}
  add('source',{kind:'source-passage',label:clip(source.title,180),text:passage,sourceId:source.id,passageId:`passage-${digest([source.id,source.url,passage])}`,title:clip(source.title,240),url:source.url,publisher:clip(source.publisher,253),publishedAt:source.publishedAt,retrievedAt:source.retrievedAt,limitations:unique(['Attributed published claim; not independently verified, an exhaustive inventory, or evidence of public opinion.',...(run.research?.gaps??[])],6)});
 }
 const reviewed=run.assumptionReview?.items??[],reviewedTexts=new Set(reviewed.map(a=>a.text.trim()));
 for(const a of reviewed.slice(0,6))add('assumption',{kind:'assumption',label:a.decision==='allow'?'Allowed hypothetical premise':'Rejected premise remains unknown',text:clip(a.text,1200),assumptionId:a.assumptionId,reviewStatus:a.decision==='allow'?'allowed-hypothetical':'unknown',limitations:[a.decision==='allow'?'Human approval permits a hypothetical premise; it does not verify the premise.':'Rejected premises are unknown, not false. Do not rely on the premise or infer its opposite.']});
 for(const a of run.assumptions.filter(a=>!reviewedTexts.has(a.trim())).slice(0,12))if(clip(a,1200))add('assumption',{kind:'assumption',label:'Stated hypothetical premise',text:clip(a,1200),assumptionId:null,reviewStatus:'stated-hypothetical',limitations:['Scenario premise only; not an independently verified fact.']});
 // The authenticated extractor already enforces accepted authorship, public channel and public thread ancestry.
 for(const statement of discussion.statements.slice(0,40))if(clip(statement.text,900))add('event',{kind:'discussion-event',label:statement.phase==='initial'?'Initial fictional public statement':'Fictional public follow-up',text:clip(statement.text,900),phase:statement.phase,actorLabel:clip(statement.actor,180)||'Fictional participant',limitations:unique(['Fictional participant statement; not observed behaviour, measured public opinion or verified fact.','The public discussion excerpt is bounded; omitted statements and omitted text are unavailable.',...(statement.text.trim().length>900?['This statement was truncated for the report evidence excerpt.']:[])],6)},statement.id);
 for(const limitation of unique([...(run.limitations??[]),...(run.research?.gaps??[])],12,1200))add('limitation',{kind:'model-limitation',scope:'report-evidence',label:'Retained evidence limitation',text:limitation,limitations:['An evidence boundary, not support for an uncalculated real-world effect.']});
 return result;
}

export function assembleFindingEvidence(drafts:ReportFindingDraft[],catalog:ReportEvidenceItem[]):{findings:ReportFinding[];evidence:ReportEvidenceItem[]}{
 const parsed=parseFindingDrafts(drafts),entries=catalog.map(parseReportEvidenceItem),byId=new Map(entries.map(e=>[e.id,e]));
 if(entries.length>80||byId.size!==entries.length||Buffer.byteLength(JSON.stringify(entries),'utf8')>100000)throw Error('REPORT_FINDINGS_CATALOG');
 const gap=entries.find(e=>e.kind==='model-limitation'&&e.scope==='healthcare-service-model');
 if(gap&&parsed.length>4)throw Error('REPORT_FINDINGS_HEALTHCARE_SLOT');
 if(gap)parsed.push({text:healthcareText,supportIds:[gap.id],limitations:['The proposal has location and fictional discussion context; these do not calculate healthcare service effects.'],unresolvedDependencies:['A service model with demand, staffing and treatment capacity is required to evaluate waiting-time improvement.']});
 const findings=parsed.map((f,index)=>parseReportFinding({id:`finding-${index+1}`,...f})),selected=new Set(findings.flatMap(f=>f.supportIds));
 for(const id of selected)if(!byId.has(id))throw Error('REPORT_FINDINGS_REFERENCE');
 const evidence=entries.filter(e=>selected.has(e.id));validateFindingReferences(findings,evidence);
 return {findings,evidence};
}
