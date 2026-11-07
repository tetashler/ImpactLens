'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {PublicExplore} from '../lib/society/public-contract';
import {DETAILED_REPORT_LABELS,DETAILED_REPORT_SECTION_KEYS,detailedReportSnapshotPayload,legacyDetailedReportSnapshotPayload,parseDetailedReport,type DetailedReport} from '../lib/report-detailed/contract';
import {reportDownloadFilename,reportToMarkdown,reportToPrintHtml,reportToJSON} from '../lib/report-detailed/export';
import {isReportRunUpdating} from '../lib/report-summary/readiness';
import type {AutomaticReportsState} from '../lib/report-detailed/automatic';
import {reportPreparationState} from '../lib/report-detailed/preparation';
import {parseSavedDetailedReport} from '../lib/report-summary/saved';
import {ReportFindings} from './report-findings';
import './report-detailed.css';

type View={identity:string;key:string;report:DetailedReport|null;loading:boolean;generating:boolean;error:string};
const empty=(identity:string):View=>({identity,key:'',report:null,loading:true,generating:false,error:''});

export function DetailedReportContent({report}:{report:DetailedReport}) {
 return <div className="report-detailed-content">
  <p className="report-detailed-question">{report.question}</p>
  <p className="report-detailed-metadata">Generated <time dateTime={report.generatedAt}>{new Date(report.generatedAt).toLocaleString()}</time><span>Run status: {report.runStatus}{report.runStatus!=='completed'?' — partial simulation snapshot':''}</span></p>
  {report.version===2?<ReportFindings report={report}/>:<p className="report-detailed-note">This saved report predates inspectable findings. Its original six chapters are retained.</p>}
  {DETAILED_REPORT_SECTION_KEYS.map(key=><section className="report-detailed-chapter" key={key}><h3>{DETAILED_REPORT_LABELS[key]}</h3><p>{report.sections[key]}</p></section>)}
 </div>;
}

export default function ReportDetailed({result,onPause,autoGenerate=false,automaticReports}:{result:PublicExplore;onPause?:()=>void;autoGenerate?:boolean;automaticReports?:AutomaticReportsState}) {
 const updating=isReportRunUpdating(result);
 const historical=result.storage?.disposition==='historical-read-only';
 const token=result.session?.token;
 const projection=useMemo(()=>{
  if(updating)return {payload:`updating:${result.runId}`,error:''};
  try{return {payload:historical?`historical-detailed-report:${result.runId}`:detailedReportSnapshotPayload(result),error:''};}
  catch{return {payload:`unavailable:${result.runId}`,error:'The detailed report could not be prepared for this snapshot.'};}
 },[result,updating,historical]);
 // Access changes invalidate both visible content and in-flight responses immediately.
 const identity=`${projection.payload}\u0000${token??''}`;
 const [view,setView]=useState<View>(()=>empty(identity));
 const [reload,setReload]=useState(0);
 const current=view.identity===identity?view:empty(identity);
 const preparation=reportPreparationState(result,automaticReports,'detailed');
 const preparing=preparation.preparing&&!current.report&&!current.error;
 const error=current.error||(!current.report&&!current.generating?preparation.error:'');
 const active=useRef<AbortController|null>(null);
 const busy=useRef(false);
 const latest=useRef({identity,updating});
 latest.current={identity,updating};
 useEffect(()=>{
  const refresh=(event:Event)=>{
   const detail=(event as CustomEvent<{runId?:unknown;kind?:unknown}>).detail;
   if(detail&&detail.runId===result.runId&&detail.kind==='detailed')setReload(v=>v+1);
  };
  window.addEventListener('impactlens:reports-changed',refresh);
  return ()=>window.removeEventListener('impactlens:reports-changed',refresh);
 },[result.runId]);
 useEffect(()=>{
  if(updating){busy.current=false;active.current=null;return;}
  const controller=new AbortController();active.current=controller;busy.current=false;
  const isCurrent=()=>!controller.signal.aborted&&latest.current.identity===identity&&active.current===controller;
  setView(empty(identity));
  async function load(){
   try{
    if(projection.error)throw Error(projection.error);
    if(!token)throw Error('This retained run has no report access token. Reopen the run to check its detailed report.');
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(projection.payload));
    if(!isCurrent())return;
    const key=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const response=await fetch(`/api/reports/detailed?runId=${encodeURIComponent(result.runId)}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:controller.signal});
    const body=await response.json();
    if(!isCurrent())return;
    if(!response.ok)throw Error(body.message||'The saved detailed report could not be loaded.');
    const legacyKey=body.legacyReport?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(legacyDetailedReportSnapshotPayload(result)))),b=>b.toString(16).padStart(2,'0')).join(''):undefined;
    if(!isCurrent())return;
    const saved=parseSavedDetailedReport(body,result,key,legacyKey);
    setView({identity,key:saved.snapshotKey,report:saved.report,loading:false,generating:false,error:''});
   }catch(error){if(isCurrent())setView({...empty(identity),loading:false,error:error instanceof Error?error.message:'The detailed report is unavailable.'});}
  }
  void load();
  return ()=>controller.abort();
 },[identity,updating,projection.error,projection.payload,token,result.runId,result.question,historical,reload]);

 async function generate(){
  const controller=active.current;
  if(historical||preparing||latest.current.updating||latest.current.identity!==identity||busy.current||current.loading||!current.key||!token||!controller||controller.signal.aborted)return;
  const isCurrent=()=>!controller.signal.aborted&&latest.current.identity===identity&&active.current===controller;
  busy.current=true;
  setView(v=>({...v,generating:true,error:''}));
  try{
   const response=await fetch('/api/reports/detailed',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({runId:result.runId,snapshotKey:current.key}),signal:controller.signal});
   const body=await response.json();
   if(!isCurrent())return;
   if(!response.ok)throw Error(body.message||'Detailed report generation failed. You can retry when ready.');
   const report=parseDetailedReport(body.report);
   if(report.runId!==result.runId||report.snapshotKey!==current.key||report.question!==result.question)throw Error('The generated detailed report does not match this run. Refresh the run before retrying.');
   setView(v=>({...v,report,generating:false,error:''}));
  }catch(error){if(isCurrent())setView(v=>({...v,generating:false,error:error instanceof Error?error.message:'Detailed report generation failed. You can retry when ready.'}));}
  finally{if(isCurrent())busy.current=false;}
 }

 function downloadMarkdown(){
  if(!current.report||latest.current.identity!==identity)return;
  const url=URL.createObjectURL(new Blob([reportToMarkdown(current.report)],{type:'text/markdown;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=reportDownloadFilename(current.report,'md');document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function printReport(){
  if(!current.report||latest.current.identity!==identity)return;
  const printWindow=window.open('','_blank');
  if(!printWindow){setView(v=>({...v,error:'Allow pop-ups for this page to open the print / Save as PDF dialog.'}));return;}
  printWindow.opener=null;
  printWindow.document.open();printWindow.document.write(reportToPrintHtml(current.report));printWindow.document.close();printWindow.focus();printWindow.print();
 }
 function downloadEvidenceJSON(){
  if(!current.report||latest.current.identity!==identity)return;
  const url=URL.createObjectURL(new Blob([reportToJSON(current.report)],{type:'application/json;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=reportDownloadFilename(current.report,'json');document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 // The workspace coordinator generates reports independently of the selected tab.
 void autoGenerate;
 return <section className="report-detailed" aria-label="Detailed AI report" aria-busy={!updating&&(preparing||current.loading||current.generating)}>
  <div className="report-detailed-heading"><h2>Detailed AI report</h2>{!updating&&current.report&&<div className="report-detailed-actions"><button type="button" onClick={downloadMarkdown}>Download Markdown</button><button type="button" onClick={printReport}>Print / Save as PDF</button><button type="button" onClick={downloadEvidenceJSON}>Download evidence JSON</button></div>}</div>
  <p className="report-detailed-note">A fuller assessment of this simulation, including competing perspectives, trade-offs and next steps. Participants and discussions are fictional.</p>
  {updating?<><p role="status">The simulation is still running{result.job?` (step ${result.job.tick} of ${result.job.totalSteps})`:''}. Your detailed report will be generated automatically when it finishes. Pause only if you want a partial report now.</p>{onPause&&<button type="button" onClick={onPause}>Pause for a partial report</button>}</>:<>
   {preparing&&<p role="status">{preparation.message}</p>}
   {!preparing&&(current.loading||current.generating)&&<p role="status">{current.generating?'Writing detailed report…':'Checking for a saved detailed report…'}</p>}
   {error&&<p className="report-detailed-error" role="alert">{error}</p>}
   {historical&&!current.loading&&!current.report&&<p>No matching saved detailed report is available for this read-only archived run.</p>}
   {!historical&&!preparing&&!current.loading&&!current.report&&current.key&&<button type="button" disabled={current.generating} onClick={()=>void generate()}>{error?'Retry detailed report':'Generate detailed report'}</button>}
   {!preparing&&!current.loading&&!current.key&&token&&<button type="button" onClick={()=>setReload(v=>v+1)}>Check saved detailed report again</button>}
   {current.report&&<>{historical&&<p className="report-detailed-note">Retained report snapshot; it may predate the archived run’s final state.</p>}{!historical&&current.report.version===1&&<button type="button" disabled={current.generating} onClick={()=>void generate()}>Generate evidence-linked update</button>}<DetailedReportContent report={current.report}/></>}
  </>}
 </section>;
}
