'use client';

import {useEffect, useRef, useState} from 'react';
import type {PublicExplore} from '../lib/society/public-contract';
import {projectReportEvidence, reportSnapshotPayload} from '../lib/report-summary/evidence';
import {detailedReportSnapshotPayload} from '../lib/report-detailed/contract';
import {automaticReportsIdle, isAutomaticReportRunFinished, prepareAutomaticReports, type AutomaticReportsState} from '../lib/report-detailed/automatic';

/** Mount once in the active workspace, independently of which report tab is open. */
export function useAutomaticReports(run: PublicExplore | null | undefined, enabled: boolean): AutomaticReportsState {
  const eligible = !!run && enabled && isAutomaticReportRunFinished(run);
  let identity = `${run?.runId ?? ''}:inactive`;
  if (eligible) {
    const projections = [() => reportSnapshotPayload(projectReportEvidence(run)), () => detailedReportSnapshotPayload(run)];
    identity = JSON.stringify([run.runId, ...projections.map(project => {
      try {return project();} catch {return 'unavailable';}
    })]);
  }
  const token = run?.session?.token;
  const latest = useRef(run);
  latest.current = run;
  const [view, setView] = useState<{identity: string; token: string | undefined; state: AutomaticReportsState}>(() => ({identity: '', token: undefined, state: automaticReportsIdle(run?.runId)}));

  useEffect(() => {
    const value = latest.current;
    if (!eligible || !value) return;
    const controller = new AbortController();
    const update = (state: AutomaticReportsState) => {
      if (!controller.signal.aborted) setView({identity, token, state});
    };
    void prepareAutomaticReports(value, {signal: controller.signal, onChange: (state, kind) => {
      update(state);
      if (kind && !controller.signal.aborted) window.dispatchEvent(new CustomEvent('impactlens:reports-changed', {detail: {runId: value.runId, kind}}));
    }}).then(update);
    return () => controller.abort();
  }, [eligible, identity, token]);

  return eligible && view.identity === identity && view.token === token ? view.state : automaticReportsIdle(run?.runId);
}
