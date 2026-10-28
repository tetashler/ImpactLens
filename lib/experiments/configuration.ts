import type { ScenarioIntent } from '../scenarios/contract.ts';
import { PLOT_LIMITS } from '../plots/geometry.ts';
import { assertJsonData, ensure, freezeSnapshot, hash, identifier, object, strings, text } from './validation.ts';

export type HorizonYears = 1 | 5 | 10;
export type StakeholderFocus = 'businesses-trade' | 'workers-households' | 'government-diplomacy';
export interface AseanConfigurationV1 {
  kind: 'asean'; withdrawalTiming: 'immediate' | 'negotiated' | 'custom'; transitionMonths: number | null;
  tradeArrangements: 'unresolved' | 'hypothetical-continuity' | 'hypothetical-replacement';
  horizonYears: HorizonYears; stakeholderFocus: StakeholderFocus[]; notes: string;
}
export interface PolyclinicConfigurationV1 {
  kind: 'polyclinic'; location: { lat: number; lon: number } | null; horizonYears: HorizonYears;
  serviceScope: 'general-primary-care' | 'scope-unconfirmed'; notes: string;
}
export interface MrtConfigurationV1 {
  kind: 'mrt'; horizonYears: HorizonYears; planId: string | null; routeId: string | null;
  stationPointIds: string[]; executionStatus: 'not-executed'; notes: string;
}
export interface AacConfigurationV1 {
  kind: 'aac'; horizonYears: HorizonYears; planId: string | null; sitePointId: string | null;
  executionStatus: 'not-executed'; notes: string;
}
export interface GenericConfigurationV1 {
  kind: 'generic'; researchFocus: string; hypotheses: string[];
  namedAssumptions: { id: string; name: string; statement: string }[]; horizonYears: HorizonYears; notes: string;
}
export type ExperimentConfigurationV1 = AseanConfigurationV1 | PolyclinicConfigurationV1 | MrtConfigurationV1 | AacConfigurationV1 | GenericConfigurationV1;
export const STAKEHOLDER_FOCUS: readonly StakeholderFocus[] = Object.freeze(['businesses-trade', 'workers-households', 'government-diplomacy']);

export function parseConfiguration(value: unknown): ExperimentConfigurationV1 {
  assertJsonData(value);
  const base = object(value, ['kind', 'horizonYears', 'notes', 'withdrawalTiming', 'transitionMonths', 'tradeArrangements', 'stakeholderFocus', 'location', 'serviceScope', 'planId', 'routeId', 'stationPointIds', 'sitePointId', 'executionStatus', 'researchFocus', 'hypotheses', 'namedAssumptions'], ['kind', 'horizonYears', 'notes']);
  ensure([1, 5, 10].includes(base.horizonYears as number), 'Choose a 1, 5 or 10 year horizon');
  text(base.notes, 2000, true);
  if (base.kind === 'asean') {
    object(value, ['kind', 'withdrawalTiming', 'transitionMonths', 'tradeArrangements', 'horizonYears', 'stakeholderFocus', 'notes']);
    ensure(['immediate', 'negotiated', 'custom'].includes(base.withdrawalTiming as string));
    ensure(base.withdrawalTiming === 'immediate' ? base.transitionMonths === 0 : base.withdrawalTiming === 'negotiated' ? base.transitionMonths === null
      : typeof base.transitionMonths === 'number' && Number.isSafeInteger(base.transitionMonths) && base.transitionMonths >= 1 && base.transitionMonths <= 120, 'Transition months must match the selected withdrawal timing');
    ensure(['unresolved', 'hypothetical-continuity', 'hypothetical-replacement'].includes(base.tradeArrangements as string));
    const focus = strings(base.stakeholderFocus, 3, 40);
    ensure(focus.length > 0 && focus.every(item => STAKEHOLDER_FOCUS.includes(item as StakeholderFocus)), 'Select at least one supported stakeholder focus');
    // Stakeholder focus is a set: selection order does not create a different configuration.
    return freezeSnapshot({ ...base, stakeholderFocus: STAKEHOLDER_FOCUS.filter(item => focus.includes(item)) }) as unknown as AseanConfigurationV1;
  }
  if (base.kind === 'polyclinic') {
    object(value, ['kind', 'location', 'horizonYears', 'serviceScope', 'notes']);
    ensure(['general-primary-care', 'scope-unconfirmed'].includes(base.serviceScope as string));
    if (base.location !== null) {
      const location = object(base.location, ['lat', 'lon']);
      ensure(typeof location.lat === 'number' && Number.isFinite(location.lat) && location.lat >= PLOT_LIMITS.minLat && location.lat <= PLOT_LIMITS.maxLat
        && typeof location.lon === 'number' && Number.isFinite(location.lon) && location.lon >= PLOT_LIMITS.minLon && location.lon <= PLOT_LIMITS.maxLon, 'Choose a location within Singapore plotting bounds');
    }
  } else if (base.kind === 'mrt' || base.kind === 'aac') {
    object(value, base.kind === 'mrt' ? ['kind', 'horizonYears', 'planId', 'routeId', 'stationPointIds', 'executionStatus', 'notes'] : ['kind', 'horizonYears', 'planId', 'sitePointId', 'executionStatus', 'notes']);
    ensure(base.executionStatus === 'not-executed');
    if (base.planId !== null) hash(base.planId, 'plan-');
    if (base.kind === 'mrt') {
      if (base.routeId !== null) text(base.routeId, 128);
      strings(base.stationPointIds, 40, 128);
    } else if (base.sitePointId !== null) text(base.sitePointId, 128);
  } else if (base.kind === 'generic') {
    object(value, ['kind', 'researchFocus', 'hypotheses', 'namedAssumptions', 'horizonYears', 'notes']);
    text(base.researchFocus, 1000, true);
    strings(base.hypotheses, 12, 1000);
    ensure(Array.isArray(base.namedAssumptions) && base.namedAssumptions.length <= 12, 'Use at most 12 named assumptions');
    const ids = new Set<string>();
    for (const item of Array.from(base.namedAssumptions)) {
      const assumption = object(item, ['id', 'name', 'statement']);
      const id = identifier(assumption.id);
      ensure(!ids.has(id), 'Assumption IDs must be unique'); ids.add(id);
      text(assumption.name, 120); text(assumption.statement, 1000);
    }
  } else throw new Error('Unsupported experiment configuration kind');
  return freezeSnapshot(base) as unknown as ExperimentConfigurationV1;
}

export function createDefaultConfiguration(question: string, intent?: ScenarioIntent): ExperimentConfigurationV1 {
  text(question, 2000);
  const common = { horizonYears: 5, notes: '' };
  if (/\basean\b/i.test(question)) return parseConfiguration({ ...common, kind: 'asean', withdrawalTiming: 'immediate', transitionMonths: 0,
    tradeArrangements: 'unresolved', stakeholderFocus: [...STAKEHOLDER_FOCUS] });
  if (intent === 'mrt-line') return parseConfiguration({ ...common, kind: 'mrt', planId: null, routeId: null, stationPointIds: [], executionStatus: 'not-executed' });
  if (intent === 'aac') return parseConfiguration({ ...common, kind: 'aac', planId: null, sitePointId: null, executionStatus: 'not-executed' });
  if (intent === 'polyclinic' || /\bpolyclinic\b/i.test(question)) return parseConfiguration({ ...common, kind: 'polyclinic', location: null, serviceScope: 'scope-unconfirmed' });
  return parseConfiguration({ ...common, kind: 'generic', researchFocus: '', hypotheses: [], namedAssumptions: [] });
}
