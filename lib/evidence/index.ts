// Browser-safe types and validators. Runtime retrieval belongs under lib/server/evidence.
export * from './types.ts';
export { EVIDENCE_LIMITS, parseEvidenceBundle, validateEvidenceBundle, computeEvidenceSnapshotIdentity, parseResearchRequest, parseResearchResponse } from './contract.ts';
export { createReplayEvidence } from './replay.ts';
