/** Local human-review contracts. No model calls, semantic scoring or browser persistence. */
export type PilotSource = { id: string; title: string; url: string; publisher: string; accessedAt: string; summary: string };
export type PilotDecision = 'insufficient-evidence' | 'supported';
export type PilotCondition = 'brief' | 'discussion';
export type PilotDiscussion = { id: string; text: string; actorLabel: string };
export type PilotCase = {
  id: string; title: string; question: string; decisionQuestion: string; brief: string; sourceIds: string[]; sources: PilotSource[]; generationQuestion: string;
  reference: { expectedDecision: PilotDecision; stakeholders: string[]; limitations: string[] };
  supplement: null | { runId: string; snapshotKey: string; generatedAt: string; items: PilotDiscussion[] };
};
export type PilotAssignment = { reviewerId: string; caseId: string; condition: PilotCondition; order: number };
export type PilotStudy = { version: 1; kind: 'decision-pilot-study'; id: string; seed: string; reviewerIds: string[]; cases: PilotCase[]; assignments: PilotAssignment[] };
export type ReviewerPacketItem = { id: string; caseId: string; order: number; question: string; decisionQuestion: string; brief: string; sources: PilotSource[]; discussion: PilotDiscussion[] };
export type ReviewerPacket = { version: 1; kind: 'decision-pilot-packet'; studyId: string; reviewerId: string; id: string; items: ReviewerPacketItem[] };
export type PilotReview = {
  id: string; studyId: string; packetId: string; reviewerId: string; caseId: string; itemId: string; decision: PilotDecision;
  concerns: { id: string; text: string; referenceIds: string[] }[]; stakeholders: string[];
  claims: { id: string; text: string; referenceIds: string[] }[]; questions: { id: string; text: string }[];
  activeMilliseconds: number; elapsedMilliseconds: number; submittedAt: string; independent: true;
};
export type PilotReviews = { version: 1; kind: 'decision-pilot-reviews'; studyId: string; packetId: string; reviewerId: string; reviews: PilotReview[] };
/** One final adjudicated human row per review. Independent raw coding stays outside this file. */
export type PilotCoding = { reviewId: string; reviewHash: string; coderId: string; usefulConcernIds: string[]; missedStakeholders: string[]; unsupportedClaimIds: string[]; additionalUnsupportedClaims: string[]; actionableQuestionIds: string[]; decisionCorrect: boolean; notes: string };
export type PilotAnalysisRow = {
  reviewId: string; reviewerId: string; caseId: string; itemId: string; packetId: string; condition: PilotCondition;
  usefulConcerns: number | null; missedStakeholders: number | null; unsupportedClaims: number | null;
  actionableQuestions: number | null; activeMinutes: number; elapsedMinutes: number; decisionCorrect: boolean | null;
  review: PilotReview; coding: PilotCoding | null;
};
export type PilotMetricSummary = {
  observations: number; codedObservations: number; missingObservations: number;
  usefulConcerns: number | null; missedStakeholders: number | null; unsupportedClaims: number | null;
  actionableQuestions: number | null; activeMinutes: number | null; elapsedMinutes: number | null; decisionCorrect: number | null;
};
export type PilotAnalysis = {
  status: 'awaiting-reviews' | 'needs-coding' | 'descriptive-results'; studyId: string;
  counts: { expectedReviews: number; reviews: number; missingReviews: number; codedReviews: number; uncodedReviews: number; expectedReviewers: number; reviewersWithResponses: number };
  byCondition: Record<PilotCondition, PilotMetricSummary>;
  byCase: { caseId: string; byCondition: Record<PilotCondition, PilotMetricSummary> }[];
  missing: { reviewerId: string; caseId: string; condition: PilotCondition }[];
  rows: PilotAnalysisRow[];
  interpretation: string;
};

export const PILOT_MAX_FILE_BYTES = 300 * 1024;
export const PILOT_MAX_ACTIVE_MILLISECONDS = 2 * 60 * 60 * 1000;
type Obj = Record<string, unknown>;
function fail(message: string): never { throw new Error(`Decision pilot: ${message}`); }
function object(value: unknown, keys: string[], label: string): Obj {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  const v = value as Obj;
  for (const key of Object.keys(v)) if (!keys.includes(key)) fail(`unknown ${label} field ${key}`);
  for (const key of keys) if (!Object.hasOwn(v, key)) fail(`missing ${label} field ${key}`);
  return v;
}
function bounded(value: unknown, label: string, max = 1200, empty = false): string {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) fail(`${label} must be bounded text (max ${max})`);
  return value;
}
function id(value: unknown, label = 'id'): string {
  const v = bounded(value, label, 100);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(v)) fail(`${label} is invalid`);
  return v;
}
function pseudonym(value: unknown): string {
  const v = bounded(value, 'pseudonym', 40);
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(v)) fail('reviewer/coder pseudonym is invalid');
  return v;
}
function hashId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail('invalid hash id');
  return value;
}
function list<T>(value: unknown, label: string, max: number, parse: (v: unknown, i: number) => T, min = 0): T[] {
  if (!Array.isArray(value) || value.length > max || value.length < min) fail(`${label} must have ${min}..${max} entries`);
  return value.map(parse);
}
function unique(values: string[], label: string): string[] {
  if (new Set(values).size !== values.length) fail(`duplicate ${label}`);
  return values;
}
function ids(value: unknown, label: string, max = 24): string[] { return unique(list(value, label, max, (v) => id(v, label)), label); }
function texts(value: unknown, label: string, max = 12): string[] { return unique(list(value, label, max, (v) => bounded(v, label)), label); }
function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) fail(`${label} is outside ${min}..${max}`);
  return value;
}
function date(value: unknown, label: string): string {
  const v = bounded(value, label, 40);
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(v) || !Number.isFinite(Date.parse(v))) fail(`${label} must be an ISO date`);
  const [year, month, day] = v.slice(0, 10).split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1]) fail(`${label} must be a real calendar date`);
  return v;
}
function decision(value: unknown): PilotDecision {
  if (value !== 'insufficient-evidence' && value !== 'supported') fail('unknown decision');
  return value;
}
function condition(value: unknown): PilotCondition {
  if (value !== 'brief' && value !== 'discussion') fail('unknown condition');
  return value;
}
function header(v: Obj, kind: string) { if (v.version !== 1 || v.kind !== kind) fail(`expected version 1 ${kind}`); }
function fileBound(value: unknown) {
  let encoded: string;
  try { encoded = JSON.stringify(value); } catch { fail('input must be JSON'); }
  if (typeof encoded !== 'string' || new TextEncoder().encode(encoded).length > PILOT_MAX_FILE_BYTES) fail('file exceeds 300KB');
}
function source(value: unknown): PilotSource {
  const v = object(value, ['id', 'title', 'url', 'publisher', 'accessedAt', 'summary'], 'source');
  const url = bounded(v.url, 'source URL', 1500);
  let parsed: URL;
  try { parsed = new URL(url); } catch { fail('invalid source URL'); }
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !hostname.includes('.') || hostname.endsWith('.') || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || /^[\d.]+$/.test(hostname) || hostname.includes(':') || hostname.includes('[')) fail('source URL must be public HTTPS without credentials or IPs');
  return { id: id(v.id), title: bounded(v.title, 'source title', 250), url, publisher: bounded(v.publisher, 'publisher', 200), accessedAt: date(v.accessedAt, 'accessedAt'), summary: bounded(v.summary, 'summary') };
}
function sources(value: unknown): PilotSource[] {
  const result = list(value, 'sources', 12, source, 1); unique(result.map((s) => s.id), 'source id'); return result;
}
function discussion(value: unknown, min = 0): PilotDiscussion[] {
  const result = list(value, 'discussion', 12, (entry) => {
    const v = object(entry, ['id', 'text', 'actorLabel'], 'discussion item');
    return { id: id(v.id), text: bounded(v.text, 'excerpt', 900), actorLabel: bounded(v.actorLabel, 'actorLabel', 120) };
  }, min);
  unique(result.map((s) => s.id), 'discussion id'); return result;
}
export function parsePilotCase(value: unknown): PilotCase {
  const v = object(value, ['id', 'title', 'question', 'decisionQuestion', 'brief', 'sourceIds', 'sources', 'generationQuestion', 'reference', 'supplement'], 'case');
  const caseId = id(v.id, 'case id');
  if (caseId.length > 50) fail('case id must be at most 50 characters');
  const sourceList = sources(v.sources); const sourceIds = ids(v.sourceIds, 'sourceIds', 12);
  if (sourceIds.length !== sourceList.length || sourceIds.some((s) => !sourceList.some((p) => p.id === s))) fail('sourceIds must match case sources');
  const brief = bounded(v.brief, 'brief', 1600); const generationQuestion = bounded(v.generationQuestion, 'generationQuestion', 2000);
  if (!generationQuestion.includes(brief)) fail('generationQuestion must contain the exact frozen brief');
  const r = object(v.reference, ['expectedDecision', 'stakeholders', 'limitations'], 'reference');
  let supplement: PilotCase['supplement'] = null;
  if (v.supplement !== null) {
    const s = object(v.supplement, ['runId', 'snapshotKey', 'generatedAt', 'items'], 'supplement');
    supplement = { runId: id(s.runId, 'runId'), snapshotKey: bounded(s.snapshotKey, 'snapshotKey', 250), generatedAt: date(s.generatedAt, 'generatedAt'), items: discussion(s.items, 1) };
    unique([...sourceList.map((s) => s.id), ...supplement.items.map((s) => s.id)], 'source/discussion id');
  }
  return { id: caseId, title: bounded(v.title, 'title', 250), question: bounded(v.question, 'question'), decisionQuestion: bounded(v.decisionQuestion, 'decisionQuestion', 600), brief, sourceIds, sources: sourceList, generationQuestion, reference: { expectedDecision: decision(r.expectedDecision), stakeholders: texts(r.stakeholders, 'reference stakeholders'), limitations: texts(r.limitations, 'limitations') }, supplement };
}

/** Canonical object-key ordering; array order is meaningful. Only finite JSON values. */
function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Obj)[key])}`).join(',')}}`;
  }
  return fail('hash input must contain only JSON values');
}
export async function pilotHash(value: unknown): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
function unsigned<T extends { id: string }>(value: T): Omit<T, 'id'> { const { id: _id, ...content } = value; return content; }
async function verifyStudy(value: unknown): Promise<PilotStudy> {
  const study = parsePilotStudy(value);
  if (study.id !== await pilotHash(unsigned(study))) fail('study hash mismatch');
  return study;
}
function assignments(cases: PilotCase[], reviewerIds: string[], seed: string): PilotAssignment[] {
  // One common shuffled order lets alternating reviewer parity balance every case;
  // each person has exactly three of each condition without seeing a case twice.
  let state = 2166136261;
  for (const ch of seed) state = Math.imul(state ^ ch.charCodeAt(0), 16777619) >>> 0;
  const random = () => { state += 0x6d2b79f5; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const shuffled = [...cases];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const phase = Math.floor(random() * 2);
  return reviewerIds.flatMap((reviewerId, reviewerIndex) => shuffled.map((c, index) => ({ reviewerId, caseId: c.id, condition: (index + reviewerIndex + phase) % 2 ? 'discussion' as const : 'brief' as const, order: index + 1 })));
}
export function parsePilotStudy(value: unknown): PilotStudy {
  fileBound(value);
  const v = object(value, ['version', 'kind', 'id', 'seed', 'reviewerIds', 'cases', 'assignments'], 'study'); header(v, 'decision-pilot-study');
  const reviewerIds = unique(list(v.reviewerIds, 'reviewerIds', 5, pseudonym, 3), 'reviewer');
  const cases = list(v.cases, 'cases', 6, parsePilotCase, 6); unique(cases.map((c) => c.id), 'case');
  if (cases.some((c) => !c.supplement)) fail('all six actual discussion supplements are required');
  const seed = bounded(v.seed, 'seed', 200);
  const rows = list(v.assignments, 'assignments', 30, (entry) => {
    const a = object(entry, ['reviewerId', 'caseId', 'condition', 'order'], 'assignment');
    return { reviewerId: pseudonym(a.reviewerId), caseId: id(a.caseId), condition: condition(a.condition), order: integer(a.order, 'order', 1, 6) };
  }, reviewerIds.length * 6);
  if (canonical(rows) !== canonical(assignments(cases, reviewerIds, seed))) fail('assignments must match the seeded balanced allocation');
  return { version: 1, kind: 'decision-pilot-study', id: hashId(v.id), seed, reviewerIds, cases, assignments: rows };
}
export async function makePilotStudy(caseValues: PilotCase[], reviewerValues: string[], seedValue: string): Promise<PilotStudy> {
  const cases = caseValues.map(parsePilotCase); const reviewerIds = reviewerValues.map(pseudonym); const seed = bounded(seedValue, 'seed', 200);
  const content = { version: 1 as const, kind: 'decision-pilot-study' as const, seed, reviewerIds, cases, assignments: assignments(cases, reviewerIds, seed) };
  return parsePilotStudy({ ...content, id: await pilotHash(content) });
}
export function parseReviewerPacket(value: unknown): ReviewerPacket {
  fileBound(value);
  const v = object(value, ['version', 'kind', 'studyId', 'reviewerId', 'id', 'items'], 'packet'); header(v, 'decision-pilot-packet');
  const reviewerId = pseudonym(v.reviewerId);
  const items = list(v.items, 'packet items', 6, (entry, i) => {
    const p = object(entry, ['id', 'caseId', 'order', 'question', 'decisionQuestion', 'brief', 'sources', 'discussion'], 'packet item');
    const sourceList = sources(p.sources); const excerpts = discussion(p.discussion);
    unique([...sourceList.map((s) => s.id), ...excerpts.map((s) => s.id)], 'source/discussion id');
    const caseId = id(p.caseId); const itemId = id(p.id);
    if (itemId !== `${reviewerId}:${caseId}` || integer(p.order, 'order', 1, 6) !== i + 1) fail('packet item ID/order mismatch');
    return { id: itemId, caseId, order: i + 1, question: bounded(p.question, 'question'), decisionQuestion: bounded(p.decisionQuestion, 'decisionQuestion', 600), brief: bounded(p.brief, 'brief', 1600), sources: sourceList, discussion: excerpts };
  }, 6);
  unique(items.map((i) => i.caseId), 'packet case');
  if (items.filter((i) => i.discussion.length).length !== 3) fail('packet must contain three assigned discussion versions');
  return { version: 1, kind: 'decision-pilot-packet', studyId: hashId(v.studyId), reviewerId, id: hashId(v.id), items };
}
export async function verifyReviewerPacket(value: unknown): Promise<ReviewerPacket> {
  const packet = parseReviewerPacket(value);
  if (packet.id !== await pilotHash(unsigned(packet))) fail('packet hash mismatch');
  return packet;
}
export async function makeReviewerPacket(studyValue: PilotStudy, reviewerId: string): Promise<ReviewerPacket> {
  const study = await verifyStudy(studyValue);
  if (!study.reviewerIds.includes(reviewerId)) fail('unknown reviewer');
  const items = study.assignments.filter((a) => a.reviewerId === reviewerId).sort((a, b) => a.order - b.order).map((a) => {
    const c = study.cases.find((c) => c.id === a.caseId)!;
    return { id: `${reviewerId}:${c.id}`, caseId: c.id, order: a.order, question: c.question, decisionQuestion: c.decisionQuestion, brief: c.brief, sources: c.sources, discussion: a.condition === 'discussion' ? c.supplement!.items : [] };
  });
  const content = { version: 1 as const, kind: 'decision-pilot-packet' as const, studyId: study.id, reviewerId, items };
  return parseReviewerPacket({ ...content, id: await pilotHash(content) });
}
function review(value: unknown): PilotReview {
  const v = object(value, ['id', 'studyId', 'packetId', 'reviewerId', 'caseId', 'itemId', 'decision', 'concerns', 'stakeholders', 'claims', 'questions', 'activeMilliseconds', 'elapsedMilliseconds', 'submittedAt', 'independent'], 'review');
  const reviewerId = pseudonym(v.reviewerId); const caseId = id(v.caseId);
  if (id(v.id) !== `${reviewerId}:${caseId}` || v.independent !== true) fail('review ID/independence mismatch');
  const responseItems = (input: unknown, prefix: string, references: boolean) => list(input, prefix, 12, (entry, i) => {
    const r = object(entry, references ? ['id', 'text', 'referenceIds'] : ['id', 'text'], prefix);
    if (r.id !== `${prefix}-${i + 1}`) fail(`${prefix} IDs must use sequential category prefix`);
    return { id: r.id as string, text: bounded(r.text, `${prefix} text`), ...(references ? { referenceIds: ids(r.referenceIds, 'reference IDs') } : {}) };
  });
  const elapsedMilliseconds = integer(v.elapsedMilliseconds, 'elapsedMilliseconds', 0, PILOT_MAX_ACTIVE_MILLISECONDS);
  const activeMilliseconds = integer(v.activeMilliseconds, 'activeMilliseconds', 0, elapsedMilliseconds);
  return { id: `${reviewerId}:${caseId}`, studyId: hashId(v.studyId), packetId: hashId(v.packetId), reviewerId, caseId, itemId: id(v.itemId), decision: decision(v.decision), concerns: responseItems(v.concerns, 'concern', true) as PilotReview['concerns'], stakeholders: texts(v.stakeholders, 'stakeholders'), claims: responseItems(v.claims, 'claim', true) as PilotReview['claims'], questions: responseItems(v.questions, 'question', false), activeMilliseconds, elapsedMilliseconds, submittedAt: date(v.submittedAt, 'submittedAt'), independent: true };
}
export function parsePilotReviews(value: unknown): PilotReviews {
  fileBound(value);
  const v = object(value, ['version', 'kind', 'studyId', 'packetId', 'reviewerId', 'reviews'], 'reviews export'); header(v, 'decision-pilot-reviews');
  const studyId = hashId(v.studyId); const packetId = hashId(v.packetId); const reviewerId = pseudonym(v.reviewerId);
  const reviews = list(v.reviews, 'reviews', 6, review); unique(reviews.map((r) => r.id), 'review');
  if (reviews.some((r) => r.studyId !== studyId || r.packetId !== packetId || r.reviewerId !== reviewerId)) fail('review export metadata mismatch');
  return { version: 1, kind: 'decision-pilot-reviews', studyId, packetId, reviewerId, reviews };
}
export function parsePilotCoding(value: unknown): PilotCoding {
  fileBound(value);
  const v = object(value, ['reviewId', 'reviewHash', 'coderId', 'usefulConcernIds', 'missedStakeholders', 'unsupportedClaimIds', 'additionalUnsupportedClaims', 'actionableQuestionIds', 'decisionCorrect', 'notes'], 'coding');
  if (typeof v.decisionCorrect !== 'boolean') fail('decisionCorrect must be boolean human judgment');
  return { reviewId: id(v.reviewId), reviewHash: hashId(v.reviewHash), coderId: pseudonym(v.coderId), usefulConcernIds: ids(v.usefulConcernIds, 'usefulConcernIds', 12), missedStakeholders: texts(v.missedStakeholders, 'missedStakeholders'), unsupportedClaimIds: ids(v.unsupportedClaimIds, 'unsupportedClaimIds', 12), additionalUnsupportedClaims: texts(v.additionalUnsupportedClaims, 'additionalUnsupportedClaims'), actionableQuestionIds: ids(v.actionableQuestionIds, 'actionableQuestionIds', 12), decisionCorrect: v.decisionCorrect, notes: bounded(v.notes, 'coding notes', 1200, true) };
}
function summary(rows: PilotAnalysisRow[], expected: number): PilotMetricSummary {
  const mean = (values: (number | null)[]) => { const present = values.filter((v): v is number => v !== null); return present.length ? present.reduce((a, b) => a + b, 0) / present.length : null; };
  return { observations: rows.length, codedObservations: rows.filter((r) => r.coding).length, missingObservations: expected - rows.length, usefulConcerns: mean(rows.map((r) => r.usefulConcerns)), missedStakeholders: mean(rows.map((r) => r.missedStakeholders)), unsupportedClaims: mean(rows.map((r) => r.unsupportedClaims)), actionableQuestions: mean(rows.map((r) => r.actionableQuestions)), activeMinutes: mean(rows.map((r) => r.activeMinutes)), elapsedMinutes: mean(rows.map((r) => r.elapsedMinutes)), decisionCorrect: mean(rows.map((r) => r.decisionCorrect === null ? null : Number(r.decisionCorrect))) };
}
export async function analysePilot(studyValue: PilotStudy, reviewValues: PilotReviews[], codingValues: PilotCoding[]): Promise<PilotAnalysis> {
  const study = await verifyStudy(studyValue);
  if (!Array.isArray(reviewValues) || reviewValues.length > 5 || !Array.isArray(codingValues) || codingValues.length > 30) fail('too many review/coding files');
  fileBound(codingValues);
  const files = reviewValues.map(parsePilotReviews); const codings = codingValues.map(parsePilotCoding);
  unique(files.map((f) => f.reviewerId), 'reviewer export'); unique(codings.map((c) => c.reviewId), 'coding review');
  const all = files.flatMap((f) => f.reviews); unique(all.map((r) => r.id), 'review');
  const packets = new Map<string, ReviewerPacket>();
  for (const file of files) {
    if (file.studyId !== study.id || !study.reviewerIds.includes(file.reviewerId)) fail('unknown study/reviewer in reviews');
    const packet = await makeReviewerPacket(study, file.reviewerId);
    if (packet.id !== file.packetId) fail('review packet hash/reference mismatch');
    packets.set(file.reviewerId, packet);
  }
  for (const coding of codings) {
    const r = all.find((r) => r.id === coding.reviewId); if (!r) fail('unknown coding review');
    if (coding.reviewHash !== await pilotHash(r)) fail('coding review hash mismatch: the reviewed content changed');
    for (const [references, actual] of [[coding.usefulConcernIds, r.concerns], [coding.unsupportedClaimIds, r.claims], [coding.actionableQuestionIds, r.questions]] as const) {
      if (references.some((id) => !actual.some((item) => item.id === id))) fail('unknown coding item ID');
    }
  }
  const rows: PilotAnalysisRow[] = all.map((r) => {
    const packet = packets.get(r.reviewerId)!; const item = packet.items.find((i) => i.caseId === r.caseId);
    const assignment = study.assignments.find((a) => a.reviewerId === r.reviewerId && a.caseId === r.caseId);
    if (!item || !assignment || item.id !== r.itemId) fail('unknown/unassigned case or item reference');
    const allowed = new Set([...item.sources.map((s) => s.id), ...item.discussion.map((d) => d.id)]);
    if ([...r.concerns, ...r.claims].some((entry) => entry.referenceIds.some((id) => !allowed.has(id)))) fail('unknown/unassigned source or discussion reference');
    const c = codings.find((c) => c.reviewId === r.id) ?? null;
    return { reviewId: r.id, reviewerId: r.reviewerId, caseId: r.caseId, itemId: r.itemId, packetId: r.packetId, condition: assignment.condition, usefulConcerns: c ? c.usefulConcernIds.length : null, missedStakeholders: c ? c.missedStakeholders.length : null, unsupportedClaims: c ? c.unsupportedClaimIds.length + c.additionalUnsupportedClaims.length : null, actionableQuestions: c ? c.actionableQuestionIds.length : null, activeMinutes: r.activeMilliseconds / 60_000, elapsedMinutes: r.elapsedMilliseconds / 60_000, decisionCorrect: c ? c.decisionCorrect : null, review: r, coding: c };
  });
  const missing = study.assignments.filter((a) => !rows.some((r) => r.reviewerId === a.reviewerId && r.caseId === a.caseId)).map(({ reviewerId, caseId, condition }) => ({ reviewerId, caseId, condition }));
  const group = (caseId?: string): Record<PilotCondition, PilotMetricSummary> => ({
    brief: summary(rows.filter((r) => r.condition === 'brief' && (!caseId || r.caseId === caseId)), study.assignments.filter((a) => a.condition === 'brief' && (!caseId || a.caseId === caseId)).length),
    discussion: summary(rows.filter((r) => r.condition === 'discussion' && (!caseId || r.caseId === caseId)), study.assignments.filter((a) => a.condition === 'discussion' && (!caseId || a.caseId === caseId)).length),
  });
  return { status: !rows.length ? 'awaiting-reviews' : codings.length < rows.length ? 'needs-coding' : 'descriptive-results', studyId: study.id, counts: { expectedReviews: study.assignments.length, reviews: rows.length, missingReviews: missing.length, codedReviews: codings.length, uncodedReviews: rows.length - codings.length, expectedReviewers: study.reviewerIds.length, reviewersWithResponses: new Set(rows.map((r) => r.reviewerId)).size }, byCondition: group(), byCase: study.cases.map((c) => ({ caseId: c.id, byCondition: group(c.id) })), missing, rows, interpretation: 'Descriptive pilot observations only. Missing observations and human coding remain explicit. No causal conclusion, resident fidelity, population benefit or market demand can be inferred.' };
}
