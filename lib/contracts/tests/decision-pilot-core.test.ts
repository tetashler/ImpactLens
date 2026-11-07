import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analysePilot, makePilotStudy, makeReviewerPacket, parsePilotCoding,
  parsePilotReviews, parsePilotStudy, parseReviewerPacket, pilotHash, verifyReviewerPacket,
  type PilotCase, type PilotReview, type PilotReviews,
} from '../../decision-pilot/core.ts';

// Explicitly synthetic contract fixtures; no human observations or generated research evidence.
const cases = (): PilotCase[] => Array.from({ length: 6 }, (_, index) => ({
  id: `case-${index + 1}`, title: `Test-only case ${index + 1}`, question: 'What needs research?', decisionQuestion: 'Does this brief support approving a proposal?',
  brief: 'A hypothetical test-only brief.', sourceIds: ['source-1'],
  sources: [{ id: 'source-1', title: 'Public source', url: 'https://www.moh.gov.sg/', publisher: 'MOH', accessedAt: '2026-11-07', summary: 'Test-only paraphrase.' }],
  generationQuestion: 'Test question. A hypothetical test-only brief.',
  reference: { expectedDecision: 'insufficient-evidence', stakeholders: ['carers'], limitations: ['No local evidence'] },
  supplement: { runId: 'test-run', snapshotKey: 'test-snapshot', generatedAt: '2026-11-07T00:00:00Z', items: [{ id: 'discussion-1', text: 'Test-only fictional dialogue.', actorLabel: 'Fictional actor' }] },
}));
const studyFixture = () => makePilotStudy(cases(), ['R01', 'R02', 'R03'], 'fixed-test-seed');
async function reviewFixture() {
  const study = await studyFixture();
  const packet = await makeReviewerPacket(study, 'R01');
  const item = packet.items[0];
  const review: PilotReview = {
    id: `R01:${item.caseId}`, studyId: study.id, packetId: packet.id, reviewerId: 'R01',
    caseId: item.caseId, itemId: item.id, decision: 'insufficient-evidence',
    concerns: [{ id: 'concern-1', text: 'Check access.', referenceIds: ['source-1'] }],
    stakeholders: ['carers'], claims: [{ id: 'claim-1', text: 'A claim to check.', referenceIds: [] }],
    questions: [{ id: 'question-1', text: 'What access barriers exist?' }],
    activeMilliseconds: 90_000, elapsedMilliseconds: 120_000, submittedAt: '2026-11-07T01:00:00Z', independent: true,
  };
  const reviews: PilotReviews = { version: 1, kind: 'decision-pilot-reviews', studyId: study.id, packetId: packet.id, reviewerId: 'R01', reviews: [review] };
  return { study, packet, review, reviews };
}

test('canonical SHA256 and deterministic balanced assignments bind all study content', async () => {
  assert.equal(await pilotHash({ b: 2, a: 1 }), await pilotHash({ a: 1, b: 2 }));
  assert.equal(await pilotHash({}), '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a');
  for (const count of [3, 4, 5]) {
    const reviewerIds = Array.from({ length: count }, (_, i) => `R0${i + 1}`);
    const study = await makePilotStudy(cases(), reviewerIds, 'seed');
    assert.deepEqual(study, await makePilotStudy(cases(), reviewerIds, 'seed'));
    for (const id of reviewerIds) {
      const assignments = study.assignments.filter((a) => a.reviewerId === id);
      assert.equal(assignments.length, 6);
      assert.equal(assignments.filter((a) => a.condition === 'brief').length, 3);
      assert.equal(new Set(assignments.map((a) => a.caseId)).size, 6);
    }
    for (const c of study.cases) {
      const rows = study.assignments.filter((a) => a.caseId === c.id);
      assert.ok(Math.abs(rows.filter((a) => a.condition === 'brief').length - rows.filter((a) => a.condition === 'discussion').length) <= 1);
    }
  }
});

test('packets withhold keys and unassigned dialogue; imports verify packet and study hashes', async () => {
  const study = await studyFixture();
  const packet = await makeReviewerPacket(study, 'R01');
  assert.deepEqual(await verifyReviewerPacket(packet), packet);
  assert.deepEqual(parseReviewerPacket(packet), packet);
  const json = JSON.stringify(packet);
  assert.ok(!json.includes('expectedDecision'));
  assert.ok(!json.includes('reference"'));
  assert.ok(!json.includes('condition'));
  assert.ok(!json.includes('snapshotKey'));
  assert.equal(packet.items.filter((i) => i.discussion.length).length, 3);
  const tampered = structuredClone(packet); tampered.items[0].brief = 'Changed content';
  await assert.rejects(() => verifyReviewerPacket(tampered), /hash/i);
  const modifiedStudy = structuredClone(study); modifiedStudy.cases[0].title = 'Changed content';
  await assert.rejects(() => makeReviewerPacket(modifiedStudy, 'R01'), /hash/i);
});

test('empty and incomplete observations remain explicit; uncoded quality is null', async () => {
  const { study, reviews } = await reviewFixture();
  const empty = await analysePilot(study, [], []);
  assert.equal(empty.status, 'awaiting-reviews');
  assert.equal(empty.counts.expectedReviews, 18);
  assert.equal(empty.counts.missingReviews, 18);
  const result = await analysePilot(study, [reviews], []);
  assert.equal(result.status, 'needs-coding');
  assert.equal(result.counts.missingReviews, 17);
  assert.equal(result.rows[0].usefulConcerns, null);
  assert.equal(result.rows[0].decisionCorrect, null);
  assert.equal(result.rows[0].activeMinutes, 1.5);
  assert.equal(result.rows[0].elapsedMinutes, 2);
  assert.equal(result.byCondition.brief.usefulConcerns, null);
  assert.equal(result.byCondition.discussion.usefulConcerns, null);
});

test('human final coding alone supplies quality metrics and exact arithmetic', async () => {
  const { study, review, reviews } = await reviewFixture();
  const coding = { reviewId: review.id, reviewHash: await pilotHash(review), coderId: 'C01', usefulConcernIds: ['concern-1'], missedStakeholders: ['wheelchair users'], unsupportedClaimIds: ['claim-1'], additionalUnsupportedClaims: ['Another unsupported packet assertion.'], actionableQuestionIds: ['question-1'], decisionCorrect: false, notes: 'Test-only coding.' };
  const result = await analysePilot(study, [reviews], [coding]);
  assert.equal(result.status, 'descriptive-results');
  assert.equal(result.rows[0].usefulConcerns, 1);
  assert.equal(result.rows[0].unsupportedClaims, 2);
  assert.equal(result.rows[0].actionableQuestions, 1);
  assert.equal(result.rows[0].missedStakeholders, 1);
  assert.equal(result.rows[0].decisionCorrect, false);
  await assert.rejects(() => analysePilot(study, [reviews], [coding, coding]), /duplicate/i);
  await assert.rejects(() => analysePilot(study, [reviews], [{ ...coding, usefulConcernIds: ['unknown'] }]), /unknown/i);
  await assert.rejects(() => analysePilot(study, [reviews], [{ ...coding, reviewId: 'R02:unknown' }]), /unknown/i);
});

test('analysis rejects duplicate, replaced and unassigned review content or references', async () => {
  const { study, reviews } = await reviewFixture();
  await assert.rejects(() => analysePilot(study, [reviews, reviews], []), /duplicate/i);
  for (const change of [
    { packetId: 'f'.repeat(64) }, { itemId: 'unassigned' }, { caseId: 'unknown' },
    { concerns: [{ id: 'concern-1', text: 'Bad ref', referenceIds: ['unknown'] }] },
  ]) {
    const changed = structuredClone(reviews); Object.assign(changed.reviews[0], change);
    await assert.rejects(() => analysePilot(study, [changed], []));
  }
});

test('strict bounded parsers reject hidden keys, unsafe sources, invalid time and malformed IDs', async () => {
  const { study, packet, reviews } = await reviewFixture();
  assert.deepEqual(parsePilotStudy(study), study);
  assert.deepEqual(parsePilotReviews(reviews), reviews);
  assert.throws(() => parseReviewerPacket({ ...packet, condition: 'brief' }), /unknown/i);
  for (const url of ['http://example.com', 'https://localhost/a', 'https://127.0.0.1/', 'https://[::1]/', 'https://user:pw@example.com/']) {
    const bad = structuredClone(packet); bad.items[0].sources[0].url = url;
    assert.throws(() => parseReviewerPacket(bad), /url/i);
  }
  const badReview = structuredClone(reviews); badReview.reviews[0].activeMilliseconds = 7_200_001;
  assert.throws(() => parsePilotReviews(badReview));
  assert.throws(() => parsePilotCoding({ reviewId: 'R01:case-1', reviewHash: 'a'.repeat(64), coderId: 'C01', usefulConcernIds: [], missedStakeholders: [], unsupportedClaimIds: [], additionalUnsupportedClaims: [], actionableQuestionIds: [], decisionCorrect: true, notes: 'x'.repeat(1201) }), /notes/i);
  await assert.rejects(() => makePilotStudy(cases(), ['person@example.com', 'R02', 'R03'], 'seed'));
  await assert.rejects(() => makePilotStudy(cases().map((c) => ({ ...c, supplement: null })), ['R01', 'R02', 'R03'], 'seed'));
});

test('active time cannot exceed elapsed span and elapsed time cannot exceed two hours', async () => {
  const { reviews } = await reviewFixture();
  const invalid = structuredClone(reviews); invalid.reviews[0].elapsedMilliseconds = 80_000;
  assert.throws(() => parsePilotReviews(invalid));
  invalid.reviews[0].elapsedMilliseconds = 7_200_001;
  assert.throws(() => parsePilotReviews(invalid));
});

test('unfinished/invalid cohorts and impossible calendar dates are rejected', async () => {
  await assert.rejects(() => makePilotStudy(cases(), [], 'seed'));
  await assert.rejects(() => makePilotStudy(cases(), ['R01', 'R01', 'R03'], 'seed'));
  const duplicate = cases(); duplicate[1].id = duplicate[0].id;
  await assert.rejects(() => makePilotStudy(duplicate, ['R01', 'R02', 'R03'], 'seed'));
  const invalidDate = cases(); invalidDate[0].sources[0].accessedAt = '2026-02-30';
  await assert.rejects(() => makePilotStudy(invalidDate, ['R01', 'R02', 'R03'], 'seed'), /date/i);
});

test('case IDs are bounded so every accepted study can produce bounded composite packet IDs', async () => {
  const longId = cases(); longId[0].id = 'c'.repeat(100);
  await assert.rejects(() => makePilotStudy(longId, ['R'.repeat(40), 'R02', 'R03'], 'seed'), /case.*id/i);
});

test('analysis rejects references to dialogue withheld from the assigned brief condition', async () => {
  const { study, packet, review, reviews } = await reviewFixture();
  const item = packet.items.find((i) => !i.discussion.length)!;
  const contaminated = { ...review, id: `R01:${item.caseId}`, caseId: item.caseId, itemId: item.id, concerns: [{ id: 'concern-1', text: 'Contaminated', referenceIds: ['discussion-1'] }] };
  await assert.rejects(() => analysePilot(study, [{ ...reviews, reviews: [contaminated] }], []), /unassigned/i);
});

test('aggregate quality means exclude missing coding instead of counting it as zero', async () => {
  const { study, packet, review, reviews } = await reviewFixture();
  const assignment = study.assignments.find((a) => a.reviewerId === 'R01' && a.caseId === review.caseId)!;
  const other = packet.items.find((i) => i.caseId !== review.caseId && Boolean(i.discussion.length) === (assignment.condition === 'discussion'))!;
  const second = { ...review, id: `R01:${other.caseId}`, caseId: other.caseId, itemId: other.id };
  const coding = { reviewId: review.id, reviewHash: await pilotHash(review), coderId: 'C01', usefulConcernIds: ['concern-1'], missedStakeholders: [], unsupportedClaimIds: [], additionalUnsupportedClaims: [], actionableQuestionIds: [], decisionCorrect: true, notes: '' };
  const result = await analysePilot(study, [{ ...reviews, reviews: [review, second] }], [coding]);
  assert.equal(result.status, 'needs-coding');
  assert.equal(result.byCondition[assignment.condition].observations, 2);
  assert.equal(result.byCondition[assignment.condition].codedObservations, 1);
  assert.equal(result.byCondition[assignment.condition].usefulConcerns, 1);
  assert.equal(result.rows[1].usefulConcerns, null);
  assert.equal(result.byCase.reduce((n, c) => n + c.byCondition.brief.missingObservations + c.byCondition.discussion.missingObservations, 0), 16);
});

test('coding is bound to full reviewed content including text, timing and decision', async () => {
  const { study, review, reviews } = await reviewFixture();
  const coding = { reviewId: review.id, reviewHash: await pilotHash(review), coderId: 'C01', usefulConcernIds: ['concern-1'], missedStakeholders: [], unsupportedClaimIds: [], additionalUnsupportedClaims: [], actionableQuestionIds: [], decisionCorrect: true, notes: '' };
  // Existing coding must not apply to replaced text under unchanged generic item IDs.
  const changed = structuredClone(reviews); changed.reviews[0].concerns[0].text = 'Replacement content';
  await assert.rejects(() => analysePilot(study, [changed], [coding]), /hash/i);
  for (const change of [{ activeMilliseconds: 80_000 }, { elapsedMilliseconds: 130_000 }, { decision: 'supported' as const }]) {
    const changedMetadata = structuredClone(reviews); Object.assign(changedMetadata.reviews[0], change);
    await assert.rejects(() => analysePilot(study, [changedMetadata], [coding]), /hash/i);
  }
  const result = await analysePilot(study, [reviews], [coding]);
  assert.equal(result.rows[0].usefulConcerns, 1);
});

test('packets carry a bounded explicit decision question and supported uses that question', async () => {
  const { study, packet, review, reviews } = await reviewFixture();
  for (const item of packet.items) assert.equal(item.decisionQuestion, study.cases.find((c) => c.id === item.caseId)!.decisionQuestion);
  const bad = structuredClone(packet); bad.items[0].decisionQuestion = 'x'.repeat(601);
  assert.throws(() => parseReviewerPacket(bad), /decisionQuestion/i);
  const supported = { ...reviews, reviews: [{ ...review, decision: 'supported' as const }] };
  assert.equal(parsePilotReviews(supported).reviews[0].decision, 'supported');
  assert.throws(() => parsePilotReviews({ ...reviews, reviews: [{ ...review, decision: 'research-next-step' }] }), /decision/i);
});
