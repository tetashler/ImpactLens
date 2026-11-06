'use client';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {PublicExplore} from '../lib/society/public-contract';
import {parseReportSummary, REPORT_SECTION_KEYS, type ReportSummary} from '../lib/report-summary/contract';
import {projectReportEvidence, reportSnapshotPayload} from '../lib/report-summary/evidence';
import {isReportRunUpdating} from '../lib/report-summary/readiness';
import type {AutomaticReportsState} from '../lib/report-detailed/automatic';
import {reportPreparationState} from '../lib/report-detailed/preparation';
import {parseSavedReportSummary} from '../lib/report-summary/saved';
import './report-ai-summary.css';

type View = {identity: string; key: string; summary: ReportSummary | null; loading: boolean; generating: boolean; error: string};
const empty = (identity: string): View => ({identity, key: '', summary: null, loading: true, generating: false, error: ''});
const labels = {findings: 'Findings', agreements: 'Agreements', disagreements: 'Disagreements', concerns: 'Concerns', unknowns: 'Unknowns'};
export default function ReportAiSummary({result, onPause, automaticReports}: {result: PublicExplore; onPause?: () => void; automaticReports?:AutomaticReportsState}) {
  const updating = isReportRunUpdating(result);
  const historical=result.storage?.disposition==='historical-read-only';
  const projection = useMemo(() => {
    if (updating) return {identity: `updating:${result.runId}`, error: ''};
    try {return {identity: reportSnapshotPayload(projectReportEvidence(result)), error: ''};}
    catch {return {identity: `unavailable:${result.runId}`, error: 'This report exceeds the summary input limit. The original report remains available below.'};}
  }, [result, updating]);
  const identity = projection.identity;
  const [view, setView] = useState<View>(() => empty(identity));
  const [reload, setReload] = useState(0);
  const current = view.identity === identity ? view : empty(identity);
  const preparation=reportPreparationState(result,automaticReports,'summary');
  const preparing=preparation.preparing&&!current.summary&&!current.error;
  const error=current.error||(!current.summary&&!current.generating?preparation.error:'');
  const active = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const token = result.session?.token;
  const latest = useRef({updating, identity, token});
  latest.current = {updating, identity, token};
  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{runId?: unknown; kind?: unknown}>).detail;
      if (detail?.runId === result.runId && detail.kind === 'summary') setReload(v => v + 1);
    };
    window.addEventListener('impactlens:reports-changed', refresh);
    return () => window.removeEventListener('impactlens:reports-changed', refresh);
  }, [result.runId]);
  useEffect(() => {
    if (updating) {active.current = null; busy.current = false; return;}
    const controller = new AbortController(); active.current = controller; busy.current = false;
    setView(v => v.identity === identity ? {...v, loading: !v.summary, generating: false, error: ''} : empty(identity));
    async function load() {
      try {
        if (projection.error) throw Error(projection.error);
        if (!token) throw Error('This retained run has no report access token. The original report is available below.');
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
        if (controller.signal.aborted) return;
        const key = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
        const response = await fetch(`/api/reports/summary?runId=${encodeURIComponent(result.runId)}`, {headers: {Authorization: `Bearer ${token}`}, cache: 'no-store', signal: controller.signal});
        const body = await response.json();
        if (!response.ok) throw Error(body.message || 'The saved summary could not be loaded.');
        const saved=parseSavedReportSummary(body,result,key);
        if (!controller.signal.aborted) setView({identity, key:saved.snapshotKey, summary:saved.summary, loading: false, generating: false, error: ''});
      } catch (error) {
        if (!controller.signal.aborted) setView({...empty(identity), loading: false, error: error instanceof Error ? error.message : 'Summary unavailable.'});
      }
    }
    void load();
    return () => controller.abort();
  }, [updating, identity, projection.error, token, result.runId, historical, reload]);
  async function generate() {
    if (historical || preparing || latest.current.updating || latest.current.identity !== identity || latest.current.token !== token || busy.current || !current.key || !token) return;
    busy.current = true;
    const controller = active.current;
    setView(v => ({...v, generating: true, error: ''}));
    try {
      const response = await fetch('/api/reports/summary', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`}, body: JSON.stringify({runId: result.runId, snapshotKey: current.key}), signal: controller?.signal});
      const body = await response.json();
      if (!response.ok) throw Error(body.message || 'Summary generation failed.');
      const summary = parseReportSummary(body.summary);
      if (summary.runId !== result.runId || summary.snapshotKey !== current.key) throw Error('The summary does not match this report.');
      if (!controller?.signal.aborted) setView(v => ({...v, summary, generating: false}));
    } catch (error) {
      if (!controller?.signal.aborted) setView(v => ({...v, generating: false, error: error instanceof Error ? error.message : 'Summary generation failed.'}));
    } finally {if (!controller?.signal.aborted) busy.current = false;}
  }
  return <section className="report-ai-summary" aria-label="AI-generated report summary" aria-busy={!updating && (preparing || current.loading || current.generating)}>
    <h2>AI-generated summary</h2>
    <p className="report-ai-summary-note">A plain-language summary of this simulation. Participants and discussions are fictional. Detailed results are below.</p>
    {updating && <><p role="status">The simulation is still running{result.job ? ` (step ${result.job.tick} of ${result.job.totalSteps})` : ''}. Your quick summary will be generated automatically when it finishes. Pause only if you want a partial summary now.</p>{onPause && <button type="button" onClick={onPause}>Pause for a partial summary</button>}</>}
    {!updating && <>
      {preparing && <p role="status">{preparation.message}</p>}
      {!preparing && (current.loading || current.generating) && <p role="status">{current.generating ? 'Writing summary…' : 'Checking for a saved summary…'}</p>}
      {error && <p role="alert">{error}</p>}
      {historical&&!current.loading&&!current.summary&&<p>No matching saved summary is available for this read-only archived run.</p>}
      {!historical && !preparing && !current.loading && !current.summary && current.key && <button type="button" disabled={current.generating} onClick={() => void generate()}>{error?'Retry summary':'Generate summary'}</button>}
      {!preparing && !current.loading && !current.key && token && <button type="button" onClick={() => setReload(v => v + 1)}>Check saved summary again</button>}
      {current.summary && <><small>Generated {new Date(current.summary.generatedAt).toLocaleString()}</small>{REPORT_SECTION_KEYS.map(key => <section key={key} data-report-section={key}><h3>{labels[key]}</h3><p className="report-ai-summary-text">{current.summary!.sections[key]}</p></section>)}</>}
    </>}
  </section>;
}
