'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createScenarioPlanner } from '../lib/scenarios/client.ts';

/** Call invalidate synchronously when switching workspace mode or editor context. */
export function useScenarioPlanner() {
  const [planner] = useState(() => createScenarioPlanner());
  const snapshot = useSyncExternalStore(planner.subscribe, planner.getSnapshot, planner.getSnapshot);
  useEffect(() => () => planner.invalidate(), [planner]);
  return {
    ...snapshot,
    setQuestion: planner.setQuestion,
    setCategory: planner.setCategory,
    setMapPoints: planner.setMapPoints,
    submit: planner.submit,
    reset: planner.reset,
    invalidate: planner.invalidate,
  };
}

export type ScenarioPlannerState = ReturnType<typeof useScenarioPlanner>;
