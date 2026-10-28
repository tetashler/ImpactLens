import { createScenarioPlan, parseScenarioRequest, type ScenarioRequest, type ScenarioSelection } from './contract.ts';

const choice = (intent: ScenarioSelection['intent'], capabilityId: ScenarioSelection['capabilityId']): ScenarioSelection => ({ version: 1, intent, capabilityId });
/** Deterministic safety/scope gates apply even when a provider is configured. */
export function guardedSelection(input: ScenarioRequest): ScenarioSelection | null {
  const q = input.question;
  if (/\b(ignore\b.{0,60}\b(registry|instructions|models)|mark\b.{0,50}\b(simulated|executed)|fabricat\w*|invent\b.{0,30}\b(percent|approval|results?))\b/is.test(q))
    return choice('unsupported', 'evidence-exploration-v1');
  if (/\b(exact|specific|identif\w*|name)\b.{0,70}\b(residents?|people|individuals?|persons?)\b/is.test(q))
    return choice('individual-prediction', 'evidence-exploration-v1');
  if (/\bpolyclinics?\b/i.test(q)) return choice('polyclinic', 'evidence-exploration-v1');
  if (/\b(nursing homes?|hospitals?|rehabilitation|day care)\b|\b(?:AACs?|active ag[ei]ing cent(?:re|er)s?)\s*(?:\(\s*)?care\b/i.test(q)) return choice('other-healthcare', 'evidence-exploration-v1');
  if (/\bASEAN\b|\bforeign policy\b/i.test(q)) return choice('international-policy', input.selectedCategory === 'exploratory-agents' ? 'stakeholder-exploration-v1' : 'evidence-exploration-v1');
  if (/\beducation policy\b/i.test(q)) return choice('education-policy', input.selectedCategory === 'exploratory-agents' ? 'stakeholder-exploration-v1' : 'evidence-exploration-v1');
  if (/\b(policy|election\w*|public opinion|GDP|mortality|unemployment)\b/i.test(q)) return choice('clarify', 'evidence-exploration-v1');
  return null;
}
/** Conservative guided selection, not a general political/economic classifier. */
export function fallbackSelection(value: ScenarioRequest): ScenarioSelection {
  const input = parseScenarioRequest(value), guarded = guardedSelection(input);
  if (guarded) return guarded;
  const q = input.question, build = /\b(new|build|built|construct\w*|add\w*|connect\w*|propos\w*|open\w*)\b/i.test(q);
  const mrt = /\b(MRT|LRT)\b/i.test(q), aac = /\bAAC\b|\bactive ag[ei]ing cent(?:re|er)\b/i.test(q);
  // Conflicting technical categories or broad consequential claims need clarification.
  const broad = /\b(econom\w*|GDP|election\w*|public opinion|health outcomes?|mortality|job losses|unemployment)\b/i.test(q);
  if (mrt && aac) return choice('clarify', 'evidence-exploration-v1');
  if (!broad && mrt && build) return choice('mrt-line', 'mrt-accessibility-v1');
  if (!broad && aac && build) return choice('aac', 'aac-accessibility-v1');
  if (input.selectedCategory === 'exploratory-agents') return choice('stakeholder-question', 'stakeholder-exploration-v1');
  return choice('clarify', 'evidence-exploration-v1');
}
export async function planWithoutAi(input: ScenarioRequest) { return createScenarioPlan(input, fallbackSelection(input)); }
