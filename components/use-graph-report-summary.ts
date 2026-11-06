'use client';
import {useEffect,useMemo,useState} from 'react';
import type {PublicExplore} from '../lib/society/public-contract.ts';
import type {KnowledgeGraph} from '../lib/knowledge-graph/contract.ts';
import {parseReportSummary,type ReportSummary} from '../lib/report-summary/contract.ts';
import {projectReportEvidence,reportSnapshotPayload} from '../lib/report-summary/evidence.ts';
import {isReportRunUpdating} from '../lib/report-summary/readiness.ts';
import {savedArtifactSnapshotKey} from '../lib/report-summary/saved.ts';

interface GraphReportSnapshot {runId:string;token:string;payload:string;identity:string;historical:boolean}
export function graphReportSnapshot(run?:PublicExplore|null,graph:KnowledgeGraph|null|undefined=run?.graph):GraphReportSnapshot|null {
  if(!run?.runId||!run.session?.token||isReportRunUpdating(run))return null;
  if(!graph||graph.executionIdentity!==run.runId||run.graph.executionIdentity!==run.runId||graph.scenarioIdentity!==run.graph.scenarioIdentity)return null;
  try {
    const payload=reportSnapshotPayload(projectReportEvidence(run));
    const historical=run.storage?.disposition==='historical-read-only';
    return {runId:run.runId,token:run.session.token,payload,identity:JSON.stringify([run.runId,run.session.token,payload,historical]),historical};
  } catch {return null;}
}

/** Read only: graph navigation never generates a summary or advances a run. */
export function watchSavedGraphReportSummary(snapshot:GraphReportSnapshot|null,active:boolean,receive:(summary:ReportSummary|null)=>void,fetcher:typeof fetch=fetch):()=>void {
  if(!active||!snapshot)return ()=>{};
  const controller=new AbortController();
  async function load() {
    try {
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(snapshot!.payload));
      if(controller.signal.aborted)return;
      const expectedKey=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      const response=await fetcher(`/api/reports/summary?runId=${encodeURIComponent(snapshot!.runId)}`,{method:'GET',headers:{Authorization:`Bearer ${snapshot!.token}`},cache:'no-store',signal:controller.signal});
      if(!response.ok)return;
      const body=await response.json();
      if(controller.signal.aborted)return;
      const key=savedArtifactSnapshotKey(snapshot!.historical,expectedKey,body?.snapshotKey);
      const summary=body.summary===null?null:parseReportSummary(body.summary);
      if(summary&&(summary.runId!==snapshot!.runId||summary.snapshotKey!==key))return;
      if(!controller.signal.aborted)receive(summary);
    } catch {/* Deterministic node explanations remain available if no matching summary can be read. */}
  }
  void load();
  return ()=>controller.abort();
}

/** Reload on activation or evidence changes; no polling, no per-node requests. */
export function useGraphReportSummary(run?:PublicExplore|null,active=true,graph:KnowledgeGraph|null|undefined=run?.graph):ReportSummary|null {
  const snapshot=useMemo(()=>graphReportSnapshot(run,graph),[run,graph]);
  const identity=snapshot?.identity;
  const [saved,setSaved]=useState<{identity:string;summary:ReportSummary|null}|null>(null);
  useEffect(()=>{
    setSaved(null);
    return watchSavedGraphReportSummary(snapshot,active,summary=>setSaved({identity:snapshot!.identity,summary}));
  },[identity,active]);
  return active&&identity&&saved?.identity===identity?saved.summary:null;
}
