import { createDefaultConfiguration } from '../../experiments/configuration.ts';
import { scenarioIdentityFor } from '../../experiments/identity.ts';
import { createReplayEvidence } from '../../server/evidence/replay.ts';

export async function makeExperimentOptions(question = 'What if Singapore leaves ASEAN?', topic: 'asean' | 'generic' = 'generic') {
  const scenarioIdentity = await scenarioIdentityFor(question);
  const evidence = await createReplayEvidence({ question, topic, scenarioIdentity, researchAttemptId: 'research-test-1' });
  return { question, configuration: createDefaultConfiguration(question), evidence, experimentId: 'experiment-test-1', createdAt: '2026-10-28T10:01:00.000Z' };
}
