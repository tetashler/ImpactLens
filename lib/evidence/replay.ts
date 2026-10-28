import { computeEvidenceSnapshotIdentity, parseResearchRequest, validateEvidenceBundle } from './contract.ts';
import { getVerifiedReplayFindings, getVerifiedReplaySources, REPLAY_LIMITATIONS } from './snapshots.ts';
import type { EvidenceBundleV1, ReplayEvidenceInput } from './types.ts';

/** Deliberately offline: no arbitrary URL fetch, AI call, filesystem access or API key. */
export async function createReplayEvidence(input: ReplayEvidenceInput): Promise<EvidenceBundleV1> {
  const request = parseResearchRequest({ version: 1, clientRequestId: 'replay-validation', scenarioIdentity: input.scenarioIdentity, question: input.question, topic: input.topic });
  const asean = request.topic === 'asean';
  const bundle: EvidenceBundleV1 = {
    version: 1,
    bundleId: `evidence-${'0'.repeat(64)}`,
    scenarioIdentity: request.scenarioIdentity,
    researchAttemptId: input.researchAttemptId,
    queries: [request.question],
    sources: asean ? getVerifiedReplaySources() : [],
    findings: asean ? getVerifiedReplayFindings() : [],
    unknowns: asean ? [
      'A procedure, legal basis and negotiated terms for a hypothetical Singapore withdrawal from ASEAN have not been established by this reference set.',
      'Whether any individual FTA would continue, change or require termination depends on that treaty and any future arrangements; automatic termination is not established here.',
      'Economic magnitudes, implementation timelines, public opinion and stakeholder responses have not been established.',
    ] : [`No verified source snapshot for the ${request.topic} topic is available in this replay. Research is still required for this question.`],
    status: asean ? 'partial' : 'empty',
    mode: 'verified-replay',
    createdAt: new Date().toISOString(),
    limitations: [...REPLAY_LIMITATIONS, ...(asean ? [] : ['No verified sources or findings are supplied for this topic; an empty replay is not a completed evidence review.'])],
    snapshotIdentity: `sha256-${'0'.repeat(64)}`,
  };
  bundle.snapshotIdentity = await computeEvidenceSnapshotIdentity(bundle);
  bundle.bundleId = `evidence-${bundle.snapshotIdentity.slice(7)}`;
  return validateEvidenceBundle(bundle);
}
