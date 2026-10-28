import type { EvidenceFindingV1, EvidenceSourceV1 } from './types.ts';

// These are manually checked historical excerpts, not runtime fetch results.
// The browser-safe registry also prevents uploaded data inventing verification metadata.
const verifiedAt = '2026-10-28T11:45:14.000Z';
const sources: readonly EvidenceSourceV1[] = [
  {
    id: 'asean-summit-official-20261028',
    url: 'https://asean.org/about-asean/asean-summit/',
    publisher: 'ASEAN Secretariat',
    title: 'ASEAN Summit',
    publishedAt: null,
    verifiedAt,
    retrievalMode: 'verified-replay',
    documentType: 'official-html',
    fetchStatus: 'verified-snapshot',
    excerpt: 'The ASEAN Summit is the highest policy-making body in ASEAN',
  },
  {
    id: 'singapore-fta-official-20261028',
    url: 'https://www.meti.gov.sg/trade-international-economic-relations/agreements/free-trade-agreements-fta/',
    publisher: 'Singapore Ministry of Energy, Trade and Industry',
    title: 'Free Trade Agreements (FTAs)',
    publishedAt: '2026-08-21',
    verifiedAt,
    retrievalMode: 'verified-replay',
    documentType: 'official-html',
    fetchStatus: 'verified-snapshot',
    excerpt: 'Free Trade Agreements (FTAs) are treaties which make trade and investment between 2 or more economies easier.',
  },
];
const findings: readonly EvidenceFindingV1[] = [
  {
    id: 'asean-summit-institutional-role',
    statement: 'The ASEAN Summit is ASEAN’s highest policy-making body.',
    classification: 'directly-supported',
    sourceId: 'asean-summit-official-20261028',
    excerpt: sources[0].excerpt,
    limitations: ['This describes an institutional role; it does not establish a withdrawal procedure.'],
  },
  {
    id: 'fta-treaty-definition',
    statement: 'FTAs are treaties intended to make trade and investment between economies easier.',
    classification: 'directly-supported',
    sourceId: 'singapore-fta-official-20261028',
    excerpt: sources[1].excerpt,
    limitations: ['This definition does not establish what happens to any specific treaty after an ASEAN membership change.'],
  },
];
export const REPLAY_LIMITATIONS: readonly string[] = Object.freeze([
  'Historical snapshot: these excerpts were checked on 28 October 2026 and replayed; no live source retrieval or new verification occurred for this request.',
  'The ASEAN excerpt was checked against search-indexed content of the official page; direct automated access returned HTTP 403. The full page was not directly retrieved.',
  'The trade-agreement page was checked at its final official METI URL after the MTI URL redirected. Its displayed last-updated date is recorded as publishedAt, not a first-publication date.',
  'This small reference set does not answer the whole scenario, quantify impacts, establish legal advice, or predict stakeholder responses.',
]);
export function getVerifiedReplaySources(): EvidenceSourceV1[] { return structuredClone(sources) as EvidenceSourceV1[]; }
export function getVerifiedReplayFindings(): EvidenceFindingV1[] { return structuredClone(findings) as EvidenceFindingV1[]; }
