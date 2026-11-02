'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import type {PublicExplore} from '../lib/society/public-contract';
import {isReportRunUpdating} from '../lib/report-summary/readiness';
import {graphSummarySnapshotPayload} from '../lib/graph-summary/contract';
import {automaticGraphSummariesIdle, isAutomaticGraphSummaryRunFinished, prepareAutomaticGraphSummaries,
  type AutomaticGraphSummariesState} from '../lib/graph-summary/automatic';

export interface GraphSummaryClientState extends AutomaticGraphSummariesState {
  retry: () => void;
}

/** Mount once in the workspace. Inspecting or selecting a graph node never dispatches work. */
export function useAutomaticGraphSummaries(run: PublicExplore | null | undefined, enabled = true): GraphSummaryClientState {
  const updating = !!run && isReportRunUpdating(run);
  let payload = '';
  try {if (run && !updating) payload = graphSummarySnapshotPayload(run);} catch {payload = 'unavailable';}
  const identity = JSON.stringify([run?.runId ?? '', payload, run ? isAutomaticGraphSummaryRunFinished(run) : false]);
  const token = run?.session?.token;
  const latest = useRef(run);
  latest.current = run;
  const active = useRef<AbortController | null>(null);
  const [view, setView] = useState<{identity: string; token: string | undefined; state: AutomaticGraphSummariesState}>(
    () => ({identity: '', token: undefined, state: automaticGraphSummariesIdle(run?.runId)}));

  const start = useCallback((retry: boolean) => {
    const value = latest.current;
    if (!enabled || !value || updating) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const update = (state: AutomaticGraphSummariesState) => {
      if (!controller.signal.aborted) setView({identity, token, state});
    };
    update({...automaticGraphSummariesIdle(value.runId), phase: 'checking'});
    void prepareAutomaticGraphSummaries(value, {signal: controller.signal, retry, onChange: update}).then(update);
  }, [enabled, identity, token, updating]);

  useEffect(() => {
    start(false);
    return () => active.current?.abort();
  }, [start]);

  const matching = enabled && view.identity === identity && view.token === token;
  const state = matching ? view.state : automaticGraphSummariesIdle(run?.runId);
  const retry = useCallback(() => {
    // This callback is the sole path that can bypass a failed batch marker.
    if (matching && view.state.phase === 'error') start(true);
  }, [matching, view.state.phase, start]);
  return {...state, retry};
}
