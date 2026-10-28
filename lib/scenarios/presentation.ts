import { SCENARIO_PROVIDER_NOTICES, type ScenarioResponse } from './contract.ts';
import { getCapability, type Capability, type CapabilityId } from './registry.ts';

export type ScenarioConfigurationMode = 'mrt' | 'aac';
export interface ScenarioPlanPresentation {
  capabilityLabel: string;
  availabilityLabel: string;
  routeLabel: string;
  stateLabel: 'Plan only / not executed';
  inputHeading: string;
  outcomesHeading: string;
  scopeNote: string;
  providerNotice: string;
  interpretationLabel: string;
  primaryAction: { mode: ScenarioConfigurationMode; label: string } | null;
}

const capabilityLabels: Record<CapabilityId, string> = {
  'mrt-accessibility-v1': 'MRT accessibility',
  'aac-accessibility-v1': 'Active Ageing Centre accessibility',
  'stakeholder-exploration-v1': 'Synthetic stakeholder exploration',
  'evidence-exploration-v1': 'Evidence planning',
};
const availabilityLabels: Record<Capability['availability'], string> = {
  available: 'Available for configuration',
  'available-limited': 'Limited area only',
  planned: 'Planned capability',
  'planning-only': 'Planning only',
};
const routeLabels: Record<Capability['execution'], string> = {
  calculated: 'Modelled comparison',
  'exploratory-agents': 'Future exploration',
  'evidence-analysis': 'Research plan',
};
const scopeNotes: Record<CapabilityId, string> = {
  'mrt-accessibility-v1': 'A hypothetical accessibility comparison needs a complete configuration and your confirmation before calculation.',
  'aac-accessibility-v1': 'Bukit Merah preset only. The incomplete AAC catalogue and landmark population proxies cannot establish nationwide coverage or health outcomes.',
  'stakeholder-exploration-v1': 'The stakeholder engine is not implemented. Future reactions would be synthetic, not representative public opinion.',
  'evidence-exploration-v1': 'No evidence has been retrieved or analysed. This route structures research and cannot calculate the requested impact.',
};

/** Accepts a validated response. Navigation opens an editor; it never authorises execution. */
export function presentScenarioPlan(response: ScenarioResponse): ScenarioPlanPresentation {
  const { plan } = response;
  const capability = getCapability(plan.capabilityId);
  let primaryAction: ScenarioPlanPresentation['primaryAction'] = null;
  if (plan.execution === 'calculated' && capability.execution === 'calculated'
    && plan.readiness === 'needs-input' && plan.executionState === 'not-executed') {
    if (capability.id === 'mrt-accessibility-v1' && capability.availability === 'available')
      primaryAction = { mode: 'mrt', label: 'Configure MRT scenario' };
    if (capability.id === 'aac-accessibility-v1' && capability.availability === 'available-limited')
      primaryAction = { mode: 'aac', label: 'Place your proposed centre' };
  }
  return {
    capabilityLabel: capabilityLabels[capability.id],
    availabilityLabel: availabilityLabels[capability.availability],
    routeLabel: routeLabels[capability.execution],
    stateLabel: 'Plan only / not executed',
    inputHeading: capability.execution === 'calculated' ? 'Inputs to confirm' : 'Research scope to confirm',
    outcomesHeading: capability.execution === 'calculated' ? 'What the model can compare' : 'What this plan supports',
    scopeNote: scopeNotes[capability.id],
    providerNotice: SCENARIO_PROVIDER_NOTICES[response.providerStatus],
    interpretationLabel: response.providerStatus === 'used' ? 'AI-assisted interpretation' : 'Deterministic interpretation',
    primaryAction,
  };
}
