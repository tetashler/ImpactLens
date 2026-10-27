/** Browser-safe form state and HTTP request construction; no accessibility calculations. */
import type { AccessibilityOptions, Position } from '../../prototype/eldercare/types.ts';
import { position as validatePosition } from '../../prototype/eldercare/validation.ts';
import { createDefaultEldercareRequest, parseEldercareApiRequest } from './api-contract.ts';
import type { EldercareApiRequest } from './api-contract.ts';

export interface AacDraft {
  position: Position | null;
  name: string;
  thresholdMetres: number;
  comparisonThresholdsMetres: number[];
  minimumAge: number;
  existingAvailability: AccessibilityOptions['existingAvailability'];
  capacityUsers: number | null;
  walkingMetresPerSecond: number | null;
  size: number;
  seed: string;
  referenceDate: string;
}

export function createAacDraft(): AacDraft {
  const request = createDefaultEldercareRequest('aac-draft');
  const [thresholdMetres, ...comparisonThresholdsMetres] = request.options.thresholdsMetres;
  return {
    position: null,
    name: request.intervention.name,
    thresholdMetres,
    comparisonThresholdsMetres,
    minimumAge: request.options.minimumAge,
    existingAvailability: request.options.existingAvailability,
    capacityUsers: request.intervention.capacity?.users ?? null,
    walkingMetresPerSecond: request.options.straightLineWalkingMetresPerSecond ?? null,
    size: request.population.size,
    seed: request.population.seed,
    referenceDate: request.options.referenceDate,
  };
}

/** Only this explicit action selects the reproducible demonstration point. */
export function demonstrationAacDraft(): AacDraft {
  const position = createDefaultEldercareRequest('aac-demonstration').intervention.position;
  if (!validAacPosition(position)) throw new Error('Invalid demonstration AAC position');
  return { ...createAacDraft(), position: { ...position } };
}

/** Exact shared server validation: latitude 1.15–1.5, longitude 103.6–104.1, inclusive. */
export function validAacPosition(value: unknown): value is Position {
  try {
    validatePosition(value);
    return true;
  } catch {
    return false;
  }
}

export function buildAacRequest(draft: AacDraft, clientRequestId: string): EldercareApiRequest {
  if (!validAacPosition(draft.position)) throw new Error('Choose an AAC point within the supported Singapore-region bounds');
  const request = createDefaultEldercareRequest(clientRequestId);
  request.population = { size: draft.size, seed: draft.seed };
  request.intervention.position = { ...draft.position };
  request.intervention.name = draft.name;
  request.intervention.rationale = 'Unsurveyed hypothetical AAC point selected for an illustrative geographic-access comparison; no site, operating or service-boundary approval is asserted.';
  request.intervention.assumptions = request.intervention.assumptions.map(assumption => assumption.id === 'illustrative-aac-site'
    ? { ...assumption, description: 'Unsurveyed hypothetical centre position selected in the editor; actual premises, opening status and service eligibility are unverified.' }
    : assumption);
  request.intervention.capacity = draft.capacityUsers === null ? null : {
    users: draft.capacityUsers,
    basis: 'illustrative-assumption',
    rationale: 'User-supplied illustrative capacity assumption; service allocation and existing-centre capacity are not modelled.',
  };
  request.intervention.assumptions.push({
    id: 'visual-straight-line-radius',
    description: 'The displayed radius is a visual straight-line geographic threshold, not a walking route, service boundary or confirmed catchment.',
  });
  request.options = {
    referenceDate: draft.referenceDate,
    minimumAge: draft.minimumAge,
    thresholdsMetres: [...new Set([draft.thresholdMetres, ...draft.comparisonThresholdsMetres])].sort((a, b) => a - b),
    existingAvailability: draft.existingAvailability,
    eligibility: request.options.eligibility,
    ...(draft.walkingMetresPerSecond === null ? {} : { straightLineWalkingMetresPerSecond: draft.walkingMetresPerSecond }),
  };
  return parseEldercareApiRequest(request);
}

/** Synchronous draft identity, including invalid inputs so stale valid results cannot match. */
export function draftKey(draft: AacDraft): string {
  const settings = {
    position: draft.position, name: draft.name, thresholdMetres: draft.thresholdMetres,
    comparisonThresholdsMetres: draft.comparisonThresholdsMetres, minimumAge: draft.minimumAge,
    existingAvailability: draft.existingAvailability, capacityUsers: draft.capacityUsers,
    walkingMetresPerSecond: draft.walkingMetresPerSecond, size: draft.size, seed: draft.seed,
    referenceDate: draft.referenceDate,
  };
  return JSON.stringify(settings, (_key, value: unknown) => {
    if (typeof value === 'number' && !Number.isFinite(value)) return { invalidNumber: String(value) };
    if (value === undefined) return { invalidValue: 'undefined' };
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
    }
    return value;
  });
}
