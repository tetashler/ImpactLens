import { createScenarioPlan } from './contract.ts';
/** Async factories return detached, validated browser-safe examples, never engine results. */
export async function createScenarioFixtures() {
  return {
    mrt: await createScenarioPlan({ version: 1, clientRequestId: 'fixture-mrt', question: 'What if Singapore built three new MRT stations between Choa Chu Kang and Sengkang?' }, { version: 1, intent: 'mrt-line', capabilityId: 'mrt-accessibility-v1' }),
    aac: await createScenarioPlan({ version: 1, clientRequestId: 'fixture-aac', question: 'What if a new Active Ageing Centre opened in Bukit Merah?' }, { version: 1, intent: 'aac', capabilityId: 'aac-accessibility-v1' }),
    polyclinic: await createScenarioPlan({ version: 1, clientRequestId: 'fixture-polyclinic', question: 'What if a new polyclinic were built in Sengkang?' }, { version: 1, intent: 'polyclinic', capabilityId: 'evidence-exploration-v1' }),
    asean: await createScenarioPlan({ version: 1, clientRequestId: 'fixture-asean', question: 'What would happen to public opinion if Singapore left ASEAN?', selectedCategory: 'exploratory-agents' }, { version: 1, intent: 'international-policy', capabilityId: 'stakeholder-exploration-v1' }),
  };
}
