/** Browser-safe authority for model availability. No provider-generated executors. */
export const CAPABILITY_IDS = ['mrt-accessibility-v1', 'aac-accessibility-v1', 'stakeholder-exploration-v1', 'evidence-exploration-v1'] as const;
export type CapabilityId = typeof CAPABILITY_IDS[number];
export type GeographyKind = 'ordered-points' | 'existing-station-selection' | 'proposed-facility-location' | 'none';
export interface InputRequirement { id: string; label: string }
export interface Capability {
  id: CapabilityId;
  domain: 'transport' | 'eldercare' | 'general';
  execution: 'calculated' | 'exploratory-agents' | 'evidence-analysis';
  availability: 'available' | 'available-limited' | 'planned' | 'planning-only';
  requiredInputs: InputRequirement[];
  supportedOutcomes: string[];
  unsupportedOutcomes: string[];
  geography: GeographyKind[];
  adapter: string | null;
  assumptions: string[];
  limitations: string[];
}
const registry: Capability[] = [
  {
    id: 'mrt-accessibility-v1', domain: 'transport', execution: 'calculated', availability: 'available',
    requiredInputs: [
      { id: 'station-layout', label: 'Confirm exact proposed station locations and ordered line structure.' },
      { id: 'interchanges', label: 'Select served existing stations and interchange walking assumptions.' },
      { id: 'service-assumptions', label: 'Confirm service date, segment running/dwell times and waiting assumptions.' },
      { id: 'travel-demand', label: 'Confirm supported origin/destination and population-weighting assumptions.' },
      { id: 'validated-configuration', label: 'Validate the full MRT configuration and explicitly confirm calculation.' },
    ],
    supportedOutcomes: ['Modelled baseline/scenario journey durations and transfers.', 'Existing station connectivity.', 'Weighted demographic differences under supported illustrative travel demand.'],
    unsupportedOutcomes: ['Real ridership forecasts, employment or economic impacts.', 'Representative public opinion or individual behavioural predictions.'],
    geography: ['ordered-points', 'existing-station-selection'], adapter: '/api/impact',
    assumptions: ['Explicit hypothetical running, dwell, waiting and interchange times.', 'Travel-demand assignments are illustrative, not observed demographic commuting flows.'],
    limitations: ['Additive network model retains existing routes; crowding, service reductions and construction disruption are not modelled.', 'Track geometry and operations are uncalibrated; population-weighted coverage uses supported presets only.'],
  },
  {
    id: 'aac-accessibility-v1', domain: 'eldercare', execution: 'calculated', availability: 'available-limited',
    requiredInputs: [
      { id: 'centre-location', label: 'Select and confirm a hypothetical AAC location.' },
      { id: 'limited-geography', label: 'Confirm the supported Bukit Merah landmark-proxy population preset.' },
      { id: 'access-assumptions', label: 'Confirm age bands, distance thresholds, reference date and listed-facility availability.' },
      { id: 'eligibility-capacity', label: 'Acknowledge age-only eligibility interpretation and unknown existing capacity; any proposed capacity is assumed.' },
      { id: 'validated-configuration', label: 'Validate the full AAC configuration and explicitly confirm calculation.' },
    ],
    supportedOutcomes: ['Straight-line nearest-compatible-facility distance comparisons.', 'Assumed distance-threshold coverage and weighted older-age demographic differences in the limited preset.'],
    unsupportedOutcomes: ['Nationwide AAC coverage or actual pedestrian journey times.', 'Utilisation, care placement, health or loneliness improvements.', 'Nursing-home, AAC (Care) or polyclinic accessibility calculations.'],
    geography: ['proposed-facility-location'], adapter: '/api/eldercare/simulate',
    assumptions: ['Existing listed facilities require an explicit availability policy.', 'Census 2020 age bands establish age-targeted representation, not confirmed service eligibility.'],
    limitations: ['Four corroborated AAC classifications use historical MOH coordinates; current operation and capacity remain unknown.', 'Two landmark proxy locations are not homes; significant represented older population remains unlocated.', 'The catalogue is incomplete even for Bukit Merah; straight-line distance does not establish uptake or health effects.'],
  },
  {
    id: 'stakeholder-exploration-v1', domain: 'general', execution: 'exploratory-agents', availability: 'planned',
    requiredInputs: [{ id: 'stakeholders', label: 'Define stakeholder categories and explicit synthetic-reaction assumptions.' }, { id: 'evidence', label: 'Obtain and verify relevant evidence before configuring exploration.' }, { id: 'future-engine', label: 'Open Stakeholder simulation for an explicitly configured scripted experiment; automatic planner execution remains unregistered.' }],
    supportedOutcomes: ['Planning future synthetic stakeholder exploration only.'],
    unsupportedOutcomes: ['Executed agents, representative polling, predictions or numerical social impacts.'],
    geography: ['none'], adapter: null,
    assumptions: ['Future stakeholder reactions would be synthetic and assumption-dependent, not representative public opinion.'],
    limitations: ['This planning route does not execute stakeholder turns. The independent Phase 7D deterministic experiment is available through Stakeholder simulation; no run is created by this plan.'],
  },
  {
    id: 'evidence-exploration-v1', domain: 'general', execution: 'evidence-analysis', availability: 'planning-only',
    requiredInputs: [{ id: 'research-scope', label: 'Confirm the research question and relevant stakeholder categories.' }, { id: 'evidence', label: 'Identify, retrieve and verify evidence in a future research workflow.' }],
    supportedOutcomes: ['Structure research questions, competing hypotheses, evidence needs and uncertainties.'],
    unsupportedOutcomes: ['Completed document analysis, invented sources, quantitative forecasts or individual predictions.'],
    geography: ['none'], adapter: null,
    assumptions: ['No evidence has been retrieved or analysed by this planning endpoint.'],
    limitations: ['Planning support only: no retrieval/research executor is registered.', 'Unsupported healthcare and policy scenarios cannot be substituted into MRT or AAC algorithms.'],
  },
];
/** Detached values prevent consumers from changing the authoritative registry. */
export function getCapabilities(): Capability[] { return structuredClone(registry); }
export function getCapability(id: CapabilityId): Capability {
  const result = registry.find(c => c.id === id);
  if (!result) throw new Error('Unregistered scenario capability');
  return structuredClone(result);
}
