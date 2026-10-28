'use client';

import { useState, useSyncExternalStore } from 'react';
import { createPlotStore } from '../lib/plots/store.ts';

/** Own one scenario store for the lifetime of the mounted workspace. */
export function useScenarioPlot(options: { scenarioId?: string } = {}) {
  const [store] = useState(() => createPlotStore(options));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { ...store, ...snapshot };
}
