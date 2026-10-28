import { EVIDENCE_TOPICS, FINDING_CLASSIFICATIONS, type EvidenceBundleV1, type EvidenceExpectation, type EvidenceFindingV1, type EvidenceSourceV1, type ResearchExpectation, type ResearchRequestV1, type ResearchResponseV1 } from './types.ts';
import { getVerifiedReplayFindings, getVerifiedReplaySources, REPLAY_LIMITATIONS } from './snapshots.ts';

export const EVIDENCE_LIMITS = Object.freeze({ bodyBytes: 8_192, responseBytes: 65_536, questionCharacters: 2000, sources: 8, findings: 24, listItems: 24 });
function ensure(ok: unknown): asserts ok { if (!ok) throw new Error('Invalid evidence data'); }

/** Validate descriptors before reading properties, so getters never execute. */
function detachedData(value: unknown): unknown {
  const seen = new Set<object>();
  let nodes = 0;
  let characters = 0;
  function visit(input: unknown, depth: number): unknown {
    ensure(++nodes <= 2048 && depth <= 12);
    if (typeof input === 'string') { characters += input.length; ensure(characters <= EVIDENCE_LIMITS.responseBytes); return input; }
    if (input === null || typeof input === 'boolean') return input;
    if (typeof input === 'number') { ensure(Number.isFinite(input)); return input; }
    ensure(typeof input === 'object' && input !== null && !seen.has(input));
    seen.add(input);
    const array = Array.isArray(input);
    ensure(Object.getPrototypeOf(input) === (array ? Array.prototype : Object.prototype) || (!array && Object.getPrototypeOf(input) === null));
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    ensure(keys.length <= 128 && keys.every(key => typeof key === 'string'));
    const output: Record<string, unknown> | unknown[] = array ? [] : {};
    if (array) {
      const length = descriptors.length?.value;
      ensure(Number.isInteger(length) && length >= 0 && length <= 128 && keys.length === length + 1);
      for (let i = 0; i < length; i++) {
        const descriptor = descriptors[String(i)];
        ensure(descriptor && descriptor.enumerable && Object.hasOwn(descriptor, 'value'));
        (output as unknown[]).push(visit(descriptor.value, depth + 1));
      }
    } else {
      for (const key of keys as string[]) {
        ensure(!['__proto__', 'prototype', 'constructor'].includes(key));
        const descriptor = descriptors[key];
        ensure(descriptor.enumerable && Object.hasOwn(descriptor, 'value'));
        (output as Record<string, unknown>)[key] = visit(descriptor.value, depth + 1);
      }
    }
    seen.delete(input);
    return output;
  }
  const detached = visit(value, 0);
  ensure(new TextEncoder().encode(JSON.stringify(detached)).byteLength <= EVIDENCE_LIMITS.responseBytes);
  return detached;
}
function object(value: unknown, fields: readonly string[]): Record<string, unknown> {
  ensure(value !== null && typeof value === 'object' && !Array.isArray(value));
  const result = value as Record<string, unknown>;
  ensure(Object.keys(result).length === fields.length && fields.every(field => Object.hasOwn(result, field)));
  return result;
}
function text(value: unknown, maximum = 2000): asserts value is string {
  ensure(typeof value === 'string' && value.trim().length > 0 && value.length <= maximum && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value));
}
function identifier(value: unknown): asserts value is string { ensure(typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value)); }
function dateTime(value: unknown): asserts value is string {
  ensure(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value);
}
function list(value: unknown, maximum: number, parse: (item: unknown) => void): asserts value is unknown[] {
  ensure(Array.isArray(value) && value.length <= maximum); value.forEach(parse);
}
function strings(value: unknown, maximum: number = EVIDENCE_LIMITS.listItems): asserts value is string[] { list(value, maximum, item => text(item)); }
function unique(values: readonly string[]) { ensure(new Set(values).size === values.length); }
function publicSourceUrl(value: unknown): asserts value is string {
  text(value, 2048);
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error('Invalid evidence data'); }
  ensure(parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.port && !parsed.hash && parsed.href === value);
  // This replay accepts only the exact checked public source URLs. No DNS, redirects,
  // arbitrary hosts, IP literals, user-supplied URLs, or URL fetch endpoint are exposed.
  ensure(getVerifiedReplaySources().some(source => source.url === value));
}
function parseSource(value: unknown): EvidenceSourceV1 {
  const source = object(value, ['id', 'url', 'publisher', 'title', 'publishedAt', 'verifiedAt', 'retrievalMode', 'documentType', 'fetchStatus', 'excerpt']);
  identifier(source.id); publicSourceUrl(source.url); text(source.publisher, 200); text(source.title, 300); text(source.excerpt, 500);
  ensure(source.publishedAt === null || (typeof source.publishedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.publishedAt) && Number.isFinite(Date.parse(source.publishedAt))));
  dateTime(source.verifiedAt);
  ensure(source.retrievalMode === 'verified-replay' && source.fetchStatus === 'verified-snapshot' && ['official-html', 'official-pdf'].includes(source.documentType as string));
  ensure(source.excerpt.split(/\s+/).length <= 20);
  const checked = getVerifiedReplaySources().find(item => item.id === source.id);
  ensure(checked && Object.keys(source).every(key => source[key] === checked[key as keyof EvidenceSourceV1]));
  return source as unknown as EvidenceSourceV1;
}
function parseFinding(value: unknown, sources: EvidenceSourceV1[]): EvidenceFindingV1 {
  const finding = object(value, ['id', 'statement', 'classification', 'sourceId', 'excerpt', 'limitations']);
  identifier(finding.id); identifier(finding.sourceId); text(finding.statement); text(finding.excerpt, 500); strings(finding.limitations);
  ensure(FINDING_CLASSIFICATIONS.includes(finding.classification as EvidenceFindingV1['classification']));
  const source = sources.find(item => item.id === finding.sourceId);
  ensure(source && finding.excerpt === source.excerpt);
  if (finding.classification === 'directly-supported' || finding.classification === 'source-reported-estimate') {
    const checked = getVerifiedReplayFindings().find(item => item.id === finding.id);
    ensure(checked && finding.statement === checked.statement && finding.sourceId === checked.sourceId && finding.classification === checked.classification);
  }
  return finding as unknown as EvidenceFindingV1;
}
export function parseResearchRequest(value: unknown): ResearchRequestV1 {
  const request = object(detachedData(value), ['version', 'clientRequestId', 'scenarioIdentity', 'question', 'topic']);
  ensure(request.version === 1); identifier(request.clientRequestId); identifier(request.scenarioIdentity); text(request.question, EVIDENCE_LIMITS.questionCharacters);
  ensure(EVIDENCE_TOPICS.includes(request.topic as ResearchRequestV1['topic']));
  return request as unknown as ResearchRequestV1;
}
export function parseEvidenceBundle(value: unknown, expected: EvidenceExpectation = {}): EvidenceBundleV1 {
  const bundle = object(detachedData(value), ['version', 'bundleId', 'scenarioIdentity', 'researchAttemptId', 'queries', 'sources', 'findings', 'unknowns', 'status', 'mode', 'createdAt', 'limitations', 'snapshotIdentity']);
  ensure(bundle.version === 1 && bundle.mode === 'verified-replay' && ['complete', 'partial', 'empty'].includes(bundle.status as string));
  identifier(bundle.scenarioIdentity); identifier(bundle.researchAttemptId); dateTime(bundle.createdAt);
  ensure(typeof bundle.bundleId === 'string' && /^evidence-[a-f0-9]{64}$/.test(bundle.bundleId));
  ensure(typeof bundle.snapshotIdentity === 'string' && /^sha256-[a-f0-9]{64}$/.test(bundle.snapshotIdentity));
  strings(bundle.queries, 8); strings(bundle.unknowns); strings(bundle.limitations);
  ensure(bundle.queries.length > 0 && REPLAY_LIMITATIONS.every(item => (bundle.limitations as string[]).includes(item)));
  list(bundle.sources, EVIDENCE_LIMITS.sources, parseSource);
  const sources = bundle.sources as EvidenceSourceV1[];
  list(bundle.findings, EVIDENCE_LIMITS.findings, item => parseFinding(item, sources));
  const findings = bundle.findings as EvidenceFindingV1[];
  unique(sources.map(item => item.id)); unique(findings.map(item => item.id));
  ensure(bundle.status === 'empty' ? !sources.length && !findings.length && bundle.unknowns.length > 0 : sources.length > 0 && findings.length > 0);
  ensure(bundle.status !== 'complete' || bundle.unknowns.length === 0);
  if (expected.scenarioIdentity !== undefined) ensure(bundle.scenarioIdentity === expected.scenarioIdentity);
  if (expected.researchAttemptId !== undefined) ensure(bundle.researchAttemptId === expected.researchAttemptId);
  return bundle as unknown as EvidenceBundleV1;
}
/** Fixed schema order makes the complete content hash independent of object key insertion order. */
export async function computeEvidenceSnapshotIdentity(value: EvidenceBundleV1): Promise<string> {
  const b = parseEvidenceBundle(value);
  const sources = b.sources.map(s => ({ id: s.id, url: s.url, publisher: s.publisher, title: s.title, publishedAt: s.publishedAt, verifiedAt: s.verifiedAt, retrievalMode: s.retrievalMode, documentType: s.documentType, fetchStatus: s.fetchStatus, excerpt: s.excerpt }));
  const findings = b.findings.map(f => ({ id: f.id, statement: f.statement, classification: f.classification, sourceId: f.sourceId, excerpt: f.excerpt, limitations: f.limitations }));
  const content = { version: b.version, queries: b.queries, sources, findings, unknowns: b.unknowns, status: b.status, mode: b.mode, limitations: b.limitations };
  const bytes = new TextEncoder().encode(JSON.stringify(content));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return `sha256-${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
export async function validateEvidenceBundle(value: unknown, expected: EvidenceExpectation = {}): Promise<EvidenceBundleV1> {
  const bundle = parseEvidenceBundle(value, expected);
  const identity = await computeEvidenceSnapshotIdentity(bundle);
  ensure(bundle.snapshotIdentity === identity && bundle.bundleId === `evidence-${identity.slice(7)}`);
  return bundle;
}
export async function parseResearchResponse(value: unknown, expected: ResearchExpectation): Promise<ResearchResponseV1> {
  const response = object(detachedData(value), ['version', 'clientRequestId', 'scenarioIdentity', 'researchAttemptId', 'evidence']);
  ensure(response.version === 1); identifier(response.clientRequestId); identifier(response.scenarioIdentity); identifier(response.researchAttemptId);
  ensure(response.clientRequestId === expected.clientRequestId);
  if (expected.scenarioIdentity !== undefined) ensure(response.scenarioIdentity === expected.scenarioIdentity);
  if (expected.researchAttemptId !== undefined) ensure(response.researchAttemptId === expected.researchAttemptId);
  response.evidence = await validateEvidenceBundle(response.evidence, { scenarioIdentity: response.scenarioIdentity, researchAttemptId: response.researchAttemptId });
  return response as unknown as ResearchResponseV1;
}
