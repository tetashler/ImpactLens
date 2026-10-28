import {
  PLOT_LIMITS, geometryKey, parseScenarioGeometry,
  type PlotFeature, type PlotLine, type PlotPoint, type PlotPointRole, type PlotPosition, type ScenarioGeometry,
} from './geometry.ts';

export type PlotMode = 'explore' | 'point' | 'station' | 'line' | 'edit' | 'anchor';
export type PlotSelection = { id: string; vertex?: number } | null;
export type PlotSnapshot = {
  geometry: ScenarioGeometry; revision: number; key: string; mode: PlotMode;
  selection: PlotSelection; activeLineId: string | null; canUndo: boolean; canRedo: boolean;
};

const MODES: readonly PlotMode[] = ['explore', 'point', 'station', 'line', 'edit', 'anchor'];

function freezeGeometry(geometry: ScenarioGeometry): ScenarioGeometry {
  for (const feature of geometry.features) {
    if (feature.kind === 'point') Object.freeze(feature.coordinate);
    else { feature.coordinates.forEach(Object.freeze); Object.freeze(feature.coordinates); }
    Object.freeze(feature);
  }
  Object.freeze(geometry.features);
  return Object.freeze(geometry);
}

function validSelection(selection: PlotSelection, geometry: ScenarioGeometry): PlotSelection {
  if (!selection) return null;
  const feature = geometry.features.find((f) => f.id === selection.id);
  if (!feature) return null;
  if (selection.vertex !== undefined && (feature.kind !== 'line' || !Number.isInteger(selection.vertex)
    || selection.vertex < 0 || selection.vertex >= feature.coordinates.length)) return null;
  return Object.freeze({ id: selection.id, ...(selection.vertex === undefined ? {} : { vertex: selection.vertex }) });
}

/** Browser-owned immutable store. Completed line strokes occupy one history entry. */
export function createPlotStore(options: { scenarioId?: string } = {}) {
  const initialGeometry = freezeGeometry(parseScenarioGeometry({ version: 1, scenarioId: options.scenarioId ?? crypto.randomUUID(), features: [] }));
  const past: ScenarioGeometry[] = [];
  const future: ScenarioGeometry[] = [];
  const listeners = new Set<() => void>();
  let pending: { before: ScenarioGeometry } | null = null;
  let snapshot: PlotSnapshot = Object.freeze({
    geometry: initialGeometry, revision: 0, key: geometryKey(initialGeometry), mode: 'explore',
    selection: null, activeLineId: null, canUndo: false, canRedo: false,
  });
  const serverSnapshot = snapshot;

  function pushPast(geometry: ScenarioGeometry) {
    past.push(geometry);
    if (past.length > PLOT_LIMITS.historySize) past.shift();
  }

  function publish(geometry: ScenarioGeometry, fields: Partial<Pick<PlotSnapshot, 'mode' | 'selection' | 'activeLineId'>> = {}, recordHistory = true) {
    const parsed = parseScenarioGeometry(geometry);
    const key = geometryKey(parsed);
    const changed = key !== snapshot.key;
    const selection = validSelection(fields.selection === undefined ? snapshot.selection : fields.selection, parsed);
    const mode = fields.mode ?? snapshot.mode;
    const activeLineId = fields.activeLineId === undefined ? snapshot.activeLineId : fields.activeLineId;
    if (changed && recordHistory) { pushPast(snapshot.geometry); future.length = 0; }
    const canUndo = pending !== null || past.length > 0;
    const canRedo = pending === null && future.length > 0;
    if (!changed && mode === snapshot.mode && activeLineId === snapshot.activeLineId
      && JSON.stringify(selection) === JSON.stringify(snapshot.selection) && canUndo === snapshot.canUndo && canRedo === snapshot.canRedo) return;
    snapshot = Object.freeze({
      geometry: changed ? freezeGeometry(parsed) : snapshot.geometry,
      revision: snapshot.revision + (changed ? 1 : 0), key, mode, selection, activeLineId, canUndo, canRedo,
    });
    for (const listener of listeners) listener();
  }

  function idle() { if (pending) throw new Error('Finish or cancel the active line before editing other plots'); }
  function clone() { return parseScenarioGeometry(snapshot.geometry); }
  function feature(geometry: ScenarioGeometry, id: string): PlotFeature {
    const found = geometry.features.find((f) => f.id === id);
    if (!found) throw new Error('Plot feature does not exist');
    return found;
  }
  function point(geometry: ScenarioGeometry, id: string): PlotPoint {
    const found = feature(geometry, id);
    if (found.kind !== 'point') throw new Error('Plot feature is not a point');
    return found;
  }
  function line(geometry: ScenarioGeometry, id: string): PlotLine {
    const found = feature(geometry, id);
    if (found.kind !== 'line') throw new Error('Plot feature is not a line');
    return found;
  }
  function vertex(line: PlotLine, index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= line.coordinates.length) throw new Error('Line vertex does not exist');
  }
  function offset(value: number) { if (!Number.isInteger(value)) throw new Error('Reorder offset must be an integer'); }

  function cancel() {
    const geometry = pending?.before ?? snapshot.geometry;
    pending = null;
    publish(geometry, { mode: 'explore', activeLineId: null }, false);
  }

  const actions = {
    setMode(mode: PlotMode) {
      if (!MODES.includes(mode)) throw new Error('Unsupported plot mode');
      if (mode === snapshot.mode) return;
      const geometry = pending?.before ?? snapshot.geometry;
      pending = null;
      publish(geometry, { mode, activeLineId: null }, false);
    },
    select(selection: PlotSelection) {
      if (selection !== null) {
        if (!selection || typeof selection !== 'object' || Object.keys(selection).some((key) => key !== 'id' && key !== 'vertex')) throw new Error('Invalid plot selection');
        if (!validSelection(selection, snapshot.geometry)) throw new Error('Selected plot or vertex does not exist');
      }
      publish(snapshot.geometry, { selection }, false);
    },
    addPoint(position: PlotPosition, role?: PlotPointRole): string {
      idle();
      const geometry = clone();
      const id = crypto.randomUUID();
      const pointRole = role ?? (snapshot.mode === 'station' ? 'station' : 'unassigned');
      geometry.features.push({ kind: 'point', id, label: `${pointRole === 'station' ? 'Station' : 'Point'} ${geometry.features.filter((f) => f.kind === 'point').length + 1}`,
        coordinate: position, role: pointRole, provenance: 'user-drawn' });
      publish(geometry, { selection: { id } });
      return id;
    },
    addVertex(position: PlotPosition) {
      if (snapshot.mode !== 'line') throw new Error('Choose line mode before adding vertices');
      const geometry = clone();
      const id = snapshot.activeLineId ?? crypto.randomUUID();
      if (snapshot.activeLineId) line(geometry, id).coordinates.push(position);
      else geometry.features.push({ kind: 'line', id, label: `Line ${geometry.features.filter((f) => f.kind === 'line').length + 1}`, coordinates: [position], provenance: 'user-drawn' });
      // Validate before opening the draft transaction so a failed first click is atomic.
      const validated = parseScenarioGeometry(geometry);
      pending ??= { before: snapshot.geometry };
      const last = line(validated, id).coordinates.length - 1;
      publish(validated, { activeLineId: id, selection: { id, vertex: last } }, false);
    },
    finishLine() {
      if (!pending || !snapshot.activeLineId) throw new Error('There is no active line');
      if (line(snapshot.geometry, snapshot.activeLineId).coordinates.length < 2) throw new Error('Add at least two vertices before finishing the line');
      pushPast(pending.before); future.length = 0;
      const id = snapshot.activeLineId;
      pending = null;
      publish(snapshot.geometry, { mode: 'explore', activeLineId: null, selection: { id } }, false);
    },
    cancel,
    movePoint(id: string, position: PlotPosition) {
      idle(); const geometry = clone(); point(geometry, id).coordinate = position; publish(geometry);
    },
    moveVertex(id: string, index: number, position: PlotPosition) {
      idle(); const geometry = clone(); const found = line(geometry, id); vertex(found, index); found.coordinates[index] = position; publish(geometry);
    },
    updateLabel(id: string, label: string) {
      idle(); const geometry = clone(); feature(geometry, id).label = label; publish(geometry);
    },
    setPointRole(id: string, role: PlotPointRole) {
      idle(); const geometry = clone(); point(geometry, id).role = role; publish(geometry);
    },
    removeFeature(id: string) {
      idle(); const geometry = clone(); feature(geometry, id); geometry.features = geometry.features.filter((f) => f.id !== id); publish(geometry);
    },
    removeVertex(id: string, index: number) {
      idle(); const geometry = clone(); const found = line(geometry, id); vertex(found, index);
      let selection = snapshot.selection;
      if (found.coordinates.length <= 2) geometry.features = geometry.features.filter((f) => f.id !== id);
      else {
        found.coordinates.splice(index, 1);
        if (selection?.id === id && selection.vertex !== undefined) {
          selection = selection.vertex === index ? { id } : { id, vertex: selection.vertex > index ? selection.vertex - 1 : selection.vertex };
        }
      }
      publish(geometry, { selection });
    },
    reorderPoint(id: string, by: number) {
      idle(); offset(by); const geometry = clone(); point(geometry, id);
      const indices = geometry.features.flatMap((f, i) => f.kind === 'point' ? [i] : []);
      const from = indices.findIndex((i) => geometry.features[i].id === id);
      const to = from + by;
      if (to < 0 || to >= indices.length || to === from) return;
      [geometry.features[indices[from]], geometry.features[indices[to]]] = [geometry.features[indices[to]], geometry.features[indices[from]]];
      publish(geometry);
    },
    reorderVertex(id: string, index: number, by: number) {
      idle(); offset(by); const geometry = clone(); const found = line(geometry, id); vertex(found, index);
      const to = index + by;
      if (to < 0 || to >= found.coordinates.length || to === index) return;
      [found.coordinates[index], found.coordinates[to]] = [found.coordinates[to], found.coordinates[index]];
      let selection = snapshot.selection;
      if (selection?.id === id && selection.vertex !== undefined) selection = { id,
        vertex: selection.vertex === index ? to : selection.vertex === to ? index : selection.vertex };
      publish(geometry, { selection });
    },
    undo() {
      if (pending) { cancel(); return; }
      const previous = past.at(-1);
      if (!previous) return;
      past.pop(); future.push(snapshot.geometry);
      publish(previous, { activeLineId: null }, false);
    },
    redo() {
      if (pending) return;
      const next = future.at(-1);
      if (!next) return;
      future.pop(); pushPast(snapshot.geometry);
      publish(next, { activeLineId: null }, false);
    },
    clear() {
      const before = pending?.before ?? snapshot.geometry;
      const geometry: ScenarioGeometry = { version: 1, scenarioId: before.scenarioId, features: [] };
      if (before.features.length) { pushPast(before); future.length = 0; }
      pending = null;
      publish(geometry, { mode: 'explore', selection: null, activeLineId: null }, false);
    },
    startNew() {
      const geometry = parseScenarioGeometry({ version: 1, scenarioId: crypto.randomUUID(), features: [] });
      past.length = 0; future.length = 0; pending = null;
      publish(geometry, { mode: 'explore', selection: null, activeLineId: null }, false);
    },
    /** Replace the scenario with a validated detached fixture and reset local history. */
    load(value: unknown) {
      const geometry = parseScenarioGeometry(value);
      past.length = 0; future.length = 0; pending = null;
      publish(geometry, { mode: 'explore', selection: null, activeLineId: null }, false);
    },
  };

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    ...actions,
  };
}

export type PlotStore = ReturnType<typeof createPlotStore>;
