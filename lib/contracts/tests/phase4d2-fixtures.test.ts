import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonical} from '../../experiments/validation.ts';
import {buildDecisionContext} from '../../society/hybrid.ts';
import {canAccessItem} from '../../society/communication.ts';
import {act} from '../../society/engine.ts';
import {
  buildTopicMemoryFixtures, replayTopicMemoryFixture, scoreTopicMemoryFixture, topicMemoryPolicyArm,
} from '../../../scripts/testing/phase4d2-memory-fixture.ts';

const hash = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
const fixtures = buildTopicMemoryFixtures();
const fixture = (id: string) => { const f = fixtures.find(f => f.id === id); assert.ok(f, 'Expected fixture ID'); return f; };

test('topic fixtures freeze predeclared relevance labels and genuine reducer histories', () => {
  assert.equal(fixtures.length, 12);
  assert.equal(new Set(fixtures.map(f => f.id)).size, fixtures.length);
  for (const f of fixtures) {
    assert.ok(Object.isFrozen(f) && Object.isFrozen(f.labels) && Object.isFrozen(f.input));
    assert.equal(f.input.intelligence!.memory, 'episodic-v1');
    assert.equal(hash(f.world.genesis.input), hash(f.input));
    assert.equal(hash(buildDecisionContext(f.world, f.actorId, f.platform)), hash(topicMemoryPolicyArm(f, 'episodic-v1').context));
    assert.ok(f.world.hybrid!.records.every(r => r.status === 'accepted'));
    assert.ok(f.commands.some(c => c.kind === 'decision'));
    assert.ok(f.world.tick <= f.world.genesis.config.steps);
    assert.equal(f.labels.filter(l => l.relevance === 'query').length, 1);
    for (const event of f.world.events.filter(e => e.discussion?.topicIds.length)) {
      const record = f.world.hybrid!.records.find(r => r.id === event.decisionId);
      assert.ok(record && record.status === 'accepted');
      assert.equal(hash(event.discussion), hash(record.decision!.discussion));
    }
  }
});

test('v1 fixture commands replay exact accepted decisions, events and complete world state', () => {
  for (const f of fixtures) {
    const replay = replayTopicMemoryFixture(f);
    assert.equal(hash(replay), hash(f.world), 'Replay must reproduce the full private state');
    assert.equal(hash(buildDecisionContext(replay, f.actorId, f.platform)), hash(topicMemoryPolicyArm(f, 'episodic-v1').context));
  }
  const f = fixture('canonical-topic'), altered = structuredClone(f);
  altered.commands[0].eventId += '-changed';
  assert.throws(() => replayTopicMemoryFixture(altered), /TOPIC_FIXTURE_REPLAY_EVENT/);
});

test('frozen-history selector arms preserve every raw history record and leave baseline immutable', () => {
  for (const f of fixtures) {
    const before = hash(f), baseline = topicMemoryPolicyArm(f, 'episodic-v1');
    assert.ok(Object.isFrozen(baseline.world.genesis.input.intelligence));
    assert.equal(hash(f), before);
    assert.equal(hash(baseline.world.events), hash(f.world.events));
    assert.equal(hash(baseline.world.items), hash(f.world.items));
    assert.equal(hash(baseline.world.agents), hash(f.world.agents));
    assert.equal(hash(baseline.world.hybrid), hash(f.world.hybrid));
    assert.equal(hash(baseline.world.genesis), hash(f.world.genesis));
  }
});

test('answer-bearing encounters are genuinely outside ST12 while private source text stays in original items', () => {
  for (const f of fixtures) {
    const actor = f.world.agents.find(a => a.id === f.actorId)!;
    assert.equal(actor.memory.length, 12);
    for (const eventId of f.earlierReadEventIds) {
      assert.ok(!actor.memory.some(m => m.eventId === eventId));
      assert.ok(actor.episodic!.some(m => m.eventId === eventId));
      const event = f.world.events.find(e => e.id === eventId)!;
      assert.equal(event.type, 'read');
      assert.ok(f.earlierItemIds.includes(event.targetId!));
    }
    for (const memory of actor.episodic!) {
      const event = f.world.events.find(e => e.id === memory.eventId)!;
      const source = f.world.events.find(e => e.id === memory.itemId)!;
      assert.ok(event);
      assert.equal(hash(memory.topicIds), hash(source.discussion?.topicIds ?? []));
      assert.ok(!('text' in memory));
    }
  }
});

test('all baseline contexts remain bounded and expose only experienced currently accessible items', () => {
  for (const f of fixtures) {
    const c = topicMemoryPolicyArm(f, 'episodic-v1').context, score = scoreTopicMemoryFixture(f, c);
    assert.ok(score.memoryCount <= 6 && score.itemCount <= 8 && score.contextBytes <= 24000);
    assert.equal(score.allItemsAccessible, true);
    assert.equal(score.inaccessibleItemSelections, 0);
    const actor = f.world.agents.find(a => a.id === f.actorId)!;
    for (const memory of c.memories) {
      const actual = [...actor.memory, ...actor.episodic!].find(m => m.eventId === memory.eventId);
      assert.ok(actual);
      assert.ok(memory.itemIds.every(id => actual.exposedIds.includes(id)));
    }
    assert.ok(c.items.some(i => i.id === f.targetItemId));
    assert.ok(c.menu!.some(o => o.action === 'comment' && o.targetKind === 'item' && c.items[o.targetIndex!].id === f.targetItemId));
  }
});

test('baseline explicitly characterizes topic paraphrase failure without promising unsupported semantic matching', () => {
  const expectedRecall: Record<string, number | null> = {
    'same-wording': 1, 'canonical-topic': 0, 'unshared-paraphrase': 0, 'irrelevant-recent-replies': 0,
    'duplicate-source-reads': 1, 'cross-platform-accessible': 1, 'private-left-membership': null,
    'private-since-rejoin': null, 'unresolved-explicit-issue': 1, 'equal-signal-ties': 1,
    'nonshared-topic-negative': 0, 'broad-tag-adversarial': 0,
  };
  for (const f of fixtures) assert.equal(scoreTopicMemoryFixture(f, topicMemoryPolicyArm(f, 'episodic-v1').context).recall, expectedRecall[f.id], f.id);
  const f = fixture('canonical-topic'), c = topicMemoryPolicyArm(f, 'episodic-v1').context;
  assert.ok(f.competingReadEventIds.every(id => c.memories.some(m => m.eventId === id)));
  assert.ok(f.earlierReadEventIds.every(id => !c.memories.some(m => m.eventId === id)));
});

test('five repeated reads remain five genuine episodes of one source and expose v1 slot redundancy', () => {
  const f = fixture('duplicate-source-reads'), c = topicMemoryPolicyArm(f, 'episodic-v1').context;
  assert.equal(f.earlierReadEventIds.length, 5);
  assert.equal(new Set(f.earlierReadEventIds).size, 5);
  for (const eventId of f.earlierReadEventIds) assert.equal(f.world.events.find(e => e.id === eventId)!.targetId, f.earlierItemIds[0]);
  const score = scoreTopicMemoryFixture(f, c);
  assert.equal(score.duplicateSourceSelections, 4);
  assert.equal(score.selectedUniqueSources, 1);
  assert.equal(score.selectedEvidenceMemories, 5);
});

test('topic positives, unshared paraphrase and broad-tag adversaries have distinct fixed labels', () => {
  const tagged = fixture('canonical-topic'), unshared = fixture('unshared-paraphrase');
  for (const f of [tagged, unshared]) {
    assert.equal(f.labels.find(l => l.itemId === f.earlierItemIds[0])!.relevance, 'relevant');
    const source = f.world.events.find(e => e.id === f.earlierItemIds[0])!;
    const query = f.world.events.find(e => e.id === f.targetItemId)!;
    assert.equal(source.discussion!.topicIds.length, f === tagged ? 1 : 0);
    assert.equal(query.discussion!.topicIds.length, f === tagged ? 1 : 0);
  }
  const negative = fixture('nonshared-topic-negative');
  assert.equal(negative.labels.find(l => l.itemId === negative.earlierItemIds[0])!.relevance, 'irrelevant');
  assert.equal(negative.labels.find(l => l.itemId === negative.earlierItemIds[1])!.relevance, 'relevant');
  const broad = fixture('broad-tag-adversarial');
  for (const id of broad.competingItemIds) {
    assert.equal(broad.labels.find(l => l.itemId === id)!.relevance, 'irrelevant');
    assert.equal(hash(broad.world.events.find(e => e.id === id)!.discussion!.topicIds), hash(['topic-1']));
    const episode = broad.world.agents.find(a => a.id === broad.actorId)!.episodic!.find(m => m.itemId === id)!;
    assert.equal(episode.importance, 9);
  }
});

test('private left and since-rejoin histories fail real read/share transitions and stay absent from retrieval', () => {
  for (const id of ['private-left-membership', 'private-since-rejoin']) {
    const f = fixture(id), c = topicMemoryPolicyArm(f, 'episodic-v1').context;
    const inaccessible = f.labels.filter(l => l.relevance === 'inaccessible');
    assert.ok(inaccessible.length >= 1);
    for (const label of inaccessible) {
      const item = f.world.items.find(i => i.id === label.itemId)!;
      assert.equal(canAccessItem(f.world, f.actorId, item), false);
      assert.ok(!c.items.some(i => i.id === item.id));
      assert.ok(!c.memories.some(m => m.itemIds.includes(item.id)));
      assert.throws(() => act(f.world, {actorId: f.actorId, type: 'read', platform: item.platform, targetId: item.id}));
      assert.throws(() => act(f.world, {actorId: f.actorId, type: 'share', platform: f.platform, targetId: item.id}));
    }
  }
});

test('explicit unresolved conditions and equal-signal candidates originate in actual accepted transitions', () => {
  const f = fixture('unresolved-explicit-issue'), actor = f.world.agents.find(a => a.id === f.actorId)!;
  assert.equal(actor.issues!.length, 1);
  assert.equal(actor.issues![0].sourceEventId, f.earlierItemIds[0]);
  assert.equal(actor.issues![0].status, 'open');
  assert.ok(topicMemoryPolicyArm(f, 'episodic-v1').context.issues!.some(i => i.id === actor.issues![0].id));
  const ties = fixture('equal-signal-ties'), sources = ties.earlierItemIds.map(id => ties.world.items.find(i => i.id === id)!);
  assert.equal(sources.length, 2);
  // Equal text, canonical tags, author and item tick; event identity provides a deterministic final order.
  assert.equal(hash(sources[0].text), hash(sources[1].text));
  assert.equal(sources[0].tick, sources[1].tick);
  assert.equal(sources[0].actorId, sources[1].actorId);
  assert.equal(hash(topicMemoryPolicyArm(ties, 'episodic-v1').context), hash(topicMemoryPolicyArm(ties, 'episodic-v1').context));
});

test('v2 matched arms change only the immutable selector and rebuild bounded authorized contexts', () => {
  for (const f of fixtures) {
    const before = hash(f), arm = topicMemoryPolicyArm(f, 'episodic-topic-v2');
    const expectedInput = structuredClone(f.input);
    expectedInput.intelligence!.memory = 'episodic-topic-v2';
    assert.equal(hash(arm.world.genesis.input), hash(expectedInput));
    assert.ok(Object.isFrozen(arm.world.genesis.input) && Object.isFrozen(arm.world.genesis.input.intelligence));
    assert.equal(hash(arm.world.events), hash(f.world.events));
    assert.equal(hash(arm.world.items), hash(f.world.items));
    assert.equal(hash(arm.world.agents), hash(f.world.agents));
    assert.equal(hash(arm.world.hybrid), hash(f.world.hybrid));
    assert.equal(hash(buildDecisionContext(arm.world, f.actorId, f.platform)), hash(arm.context));
    const score = scoreTopicMemoryFixture(f, arm.context);
    assert.equal(score.allItemsAccessible, true);
    assert.equal(score.inaccessibleItemSelections, 0);
    assert.equal(score.duplicateSourceSelections, 0);
    assert.ok(score.memoryCount <= 6 && score.itemCount <= 8 && score.contextBytes <= 24000);
    assert.equal(hash(f), before);
  }
});

test('fresh v2 reducer replay preserves raw histories while rebuilding historical decision contexts', () => {
  for (const f of fixtures) {
    const fresh = replayTopicMemoryFixture(f, 'episodic-topic-v2');
    assert.equal(fresh.genesis.input.intelligence!.memory, 'episodic-topic-v2');
    assert.ok(fresh.hybrid!.records.every(r => r.status === 'accepted'));
    assert.equal(hash({events: fresh.events, items: fresh.items, agents: fresh.agents, groups: fresh.groups}), f.historyDigest);
    assert.equal(hash(buildDecisionContext(fresh, f.actorId, f.platform)), hash(topicMemoryPolicyArm(f, 'episodic-topic-v2').context));
  }
});

test('v2 fixture evidence records canonical recall gains and keeps unshared and broad-tag limits visible', () => {
  const canonicalFixture = fixture('canonical-topic');
  const before = scoreTopicMemoryFixture(canonicalFixture, topicMemoryPolicyArm(canonicalFixture, 'episodic-v1').context);
  const after = scoreTopicMemoryFixture(canonicalFixture, topicMemoryPolicyArm(canonicalFixture, 'episodic-topic-v2').context);
  assert.equal(before.recall, 0);
  assert.equal(after.recall, 1);
  assert.equal(after.irrelevantSourceSelections, 0);
  const unshared = fixture('unshared-paraphrase');
  assert.equal(scoreTopicMemoryFixture(unshared, topicMemoryPolicyArm(unshared, 'episodic-topic-v2').context).recall, 0);
  const broad = fixture('broad-tag-adversarial');
  const broadScore = scoreTopicMemoryFixture(broad, topicMemoryPolicyArm(broad, 'episodic-topic-v2').context);
  assert.equal(broadScore.recall, 1);
  assert.ok(broadScore.irrelevantSourceSelections > 0, 'Shared canonical tags do not establish semantic relevance');
  assert.ok(broadScore.precision! < 1);
});
