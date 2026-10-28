export const EVIDENCE_TOPICS = ['asean', 'polyclinic', 'mrt', 'aac', 'generic'] as const;
export type EvidenceTopic = typeof EVIDENCE_TOPICS[number];
export const FINDING_CLASSIFICATIONS = ['directly-supported', 'source-reported-estimate', 'inference', 'hypothetical-assumption', 'unresolved-question'] as const;
export type FindingClassification = typeof FINDING_CLASSIFICATIONS[number];

export interface EvidenceSourceV1 {
  id: string;
  url: string;
  publisher: string;
  title: string;
  publishedAt: string | null;
  verifiedAt: string;
  retrievalMode: 'verified-replay';
  documentType: 'official-html' | 'official-pdf';
  fetchStatus: 'verified-snapshot';
  excerpt: string;
}
export interface EvidenceFindingV1 {
  id: string;
  statement: string;
  classification: FindingClassification;
  sourceId: string;
  excerpt: string;
  limitations: string[];
}
export interface EvidenceBundleV1 {
  version: 1;
  bundleId: string;
  scenarioIdentity: string;
  researchAttemptId: string;
  queries: string[];
  sources: EvidenceSourceV1[];
  findings: EvidenceFindingV1[];
  unknowns: string[];
  status: 'complete' | 'partial' | 'empty';
  mode: 'verified-replay';
  createdAt: string;
  limitations: string[];
  snapshotIdentity: string;
}
export interface ResearchRequestV1 {
  version: 1;
  clientRequestId: string;
  scenarioIdentity: string;
  question: string;
  topic: EvidenceTopic;
}
export interface ResearchResponseV1 {
  version: 1;
  clientRequestId: string;
  scenarioIdentity: string;
  researchAttemptId: string;
  evidence: EvidenceBundleV1;
}
export interface EvidenceExpectation { scenarioIdentity?: string; researchAttemptId?: string }
export interface ResearchExpectation extends EvidenceExpectation { clientRequestId: string }
export interface ReplayEvidenceInput { scenarioIdentity: string; researchAttemptId: string; question: string; topic: EvidenceTopic }
