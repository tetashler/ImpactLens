import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {act, createSociety, restoreSociety, saveSociety} from '../../society/engine.ts';
import {buildDecisionContext, finishDecision, parseSocialDecision} from '../../society/hybrid.ts';
import {decodeMenuDecision, encodeMenuContext} from '../../society/decision-menu.ts';
import {canAccessItem} from '../../society/communication.ts';
import {publicSociety, summaryGraph} from '../../server/society/summary.ts';
import {aggregateFacts} from '../../server/society/facts.ts';
import {canonical} from '../../experiments/validation.ts';
import type {Action} from '../../society/contract.ts';
import {phase4dWorld} from './phase4d-fixture.ts';
import {
  buildMemoryStressFixture, buildMatchedMemoryAblation, memoryResponseWire,
  offerMemoryFixtureContext, saveMemoryFixtureJournal, replayMemoryFixtureJournal,
} from '../../../scripts/testing/phase4d1-memory-fixture.ts';

test('a real older encounter survives fourteen unrelated encounters outside ST12 with ordinary 24/4/8/80 limits', () => {
  const f = buildMemoryStressFixture();
  const actor = f.world.agents.find(a => a.id === f.actorId)!;
  assert.equal(f.world.agents.length, 24);
  assert.equal(f.world.genesis.config.steps, 80);
  assert.equal(f.world.genesis.input.hybrid!.selectedAgents, 4);
  assert.equal(f.world.genesis.input.hybrid!.maxCalls, 8);
  assert.equal(f.world.genesis.input.intelligence!.episodicEntries, 32);
  assert.equal(f.unrelatedReadEventIds.length, 14);
  assert.equal(f.commands.filter(c => f.unrelatedReadEventIds.includes(c.eventId) && c.action.type === 'read').length, 14);
  assert.equal(actor.memory.length, 12);
  assert.ok(!actor.memory.some(m => m.eventId === f.earlierEventId));
  assert.ok(actor.episodic!.some(m => m.eventId === f.earlierEventId));
  assert.ok(actor.episodic!.length <= 32);
  const earlier = f.world.events.find(e => e.id === f.earlierEventId)!;
  assert.equal(earlier.type, 'read');
  assert.equal(earlier.targetId, f.earlierItemId);
  assert.ok(earlier.tick < f.world.items.find(i => i.id === f.targetItemId)!.tick);
  assert.ok(f.world.tick <= 80);
});

test('the later related target retrieves the distinct old detail through the real bounded context and menu', () => {
  const f = buildMemoryStressFixture(), c = f.context;
  assert.ok(!f.world.items.find(i => i.id === f.targetItemId)!.text.includes('2800'));
  assert.ok(c.memories.some(m => m.eventId === f.earlierEventId && m.origin === 'episodic'));
  assert.ok(c.items.some(i => i.id === f.earlierItemId && i.text.includes('2800')));
  assert.ok(encodeMenuContext(c).includes('2800'));
  assert.ok(c.memories.length <= 6 && c.items.length <= 8 && Buffer.byteLength(canonical(c)) <= 24000);
  const actor = f.world.agents.find(a => a.id === f.actorId)!;
  for (const m of c.memories) {
    const experience = [...actor.memory, ...actor.episodic!].find(e => e.eventId === m.eventId)!;
    assert.ok(experience, 'Every supplied memory must be an actual reducer experience.');
    assert.ok(m.itemIds.every(id => experience.exposedIds.includes(id)));
  }
  for (const item of c.items) assert.ok(canAccessItem(f.world, f.actorId, f.world.items.find(i => i.id === item.id)!));
  const wire = memoryResponseWire(c, f.targetItemId, [f.earlierEventId]);
  assert.ok(wire.recallIds.length > 0);
  assert.doesNotThrow(() => parseSocialDecision(decodeMenuDecision(wire, c), c));
});

test('matched A/B removes exactly the old real episode and rebuilds legitimate contexts, with all differences declared', () => {
  const f = buildMemoryStressFixture(), pair = buildMatchedMemoryAblation(f);
  const expected = structuredClone(pair.full.world);
  expected.agents.find(a => a.id === f.actorId)!.episodic = expected.agents.find(a => a.id === f.actorId)!.episodic!.filter(m => m.eventId !== f.earlierEventId);
  assert.deepEqual(pair.control.world, expected);
  assert.ok(pair.full.context.memories.some(m => m.eventId === f.earlierEventId));
  assert.ok(!pair.control.context.memories.some(m => m.eventId === f.earlierEventId));
  assert.ok(!encodeMenuContext(pair.control.context).includes('2800'));
  assert.deepEqual(pair.full.context.actor, pair.control.context.actor);
  assert.deepEqual(pair.full.context.items.find(i => i.id === f.targetItemId), pair.control.context.items.find(i => i.id === f.targetItemId));
  const keys = [...new Set([...Object.keys(pair.full.context), ...Object.keys(pair.control.context)])].filter(k => canonical((pair.full.context as unknown as Record<string, unknown>)[k] ?? null) !== canonical((pair.control.context as unknown as Record<string, unknown>)[k] ?? null));
  assert.deepEqual(pair.differences.contextKeys, keys);
  assert.deepEqual(pair.differences.removedEpisodeEventIds, [f.earlierEventId]);
  assert.ok(pair.differences.removedItemIds.includes(f.earlierItemId));
  assert.equal(pair.differences.worldMutation, 'Remove exactly one genuine actor episodic entry; retain genesis, all events/items, short-term memory, state and latest encounter.');
});

test('both matched arms pass menu decoding, ordinary social validation and accepted event application', () => {
  const f = buildMemoryStressFixture(), pair = buildMatchedMemoryAblation(f);
  for (const [name, arm] of Object.entries({full: pair.full, control: pair.control})) {
    const recalled = name === 'full' ? [f.earlierEventId] : [];
    const wire = memoryResponseWire(arm.context, f.targetItemId, recalled);
    const decision = parseSocialDecision(decodeMenuDecision(wire, arm.context), arm.context);
    const next = finishDecision(offerMemoryFixtureContext(arm.world, arm.context), {decision, usage: null, error: null});
    const event = next.events.at(-1)!;
    assert.equal(next.hybrid!.records.at(-1)!.status, 'accepted');
    assert.equal(event.source, 'social-model');
    assert.equal(event.targetId, f.targetItemId);
    assert.equal(event.type, 'comment');
    assert.equal(event.memoryIds!.includes(f.earlierEventId), name === 'full');
    assert.ok(event.memoryIds!.every(id => arm.context.memories.some(m => m.eventId === id)));
    assert.equal(next.genesis.input.hybrid!.maxCalls, 8);
  }
});

test('distinct competing direct-reply episodes remain real, bounded and selectively recalled', () => {
  const f = buildMemoryStressFixture();
  assert.equal(new Set(f.competingReadEventIds).size, 5);
  const episodes = f.world.agents.find(a => a.id === f.actorId)!.episodic!;
  for (const id of f.competingReadEventIds) {
    const episode = episodes.find(m => m.eventId === id)!;
    assert.equal(episode.importance, 9);
    const item = f.world.items.find(i => i.id === episode.itemId)!;
    assert.equal(f.world.items.find(i => i.id === item.parentId)!.actorId, f.actorId);
    assert.equal(f.world.events.find(e => e.id === id)!.targetId, item.id);
  }
  assert.ok(f.competingReadEventIds.some(id => !f.context.memories.some(m => m.eventId === id)));
  assert.ok(f.context.memories.some(m => m.eventId === f.earlierEventId));
});

test('current lexical retrieval omits a wording-different retained safeguard when five direct-reply episodes compete', () => {
  const f = buildMemoryStressFixture({wording: 'paraphrase'});
  assert.ok(f.world.agents.find(a => a.id === f.actorId)!.episodic!.some(m => m.eventId === f.earlierEventId));
  assert.ok(canAccessItem(f.world, f.actorId, f.world.items.find(i => i.id === f.earlierItemId)!));
  assert.ok(f.context.items.some(i => i.id === f.targetItemId));
  assert.ok(!f.context.memories.some(m => m.eventId === f.earlierEventId), 'This is an explicit characterization of the current semantic-paraphrase limitation, not a successful semantic recall claim.');
  assert.ok(f.competingReadEventIds.every(id => f.context.memories.some(m => m.eventId === id)));
});

function privateEpisodeFixture(sharing: 'members-may-forward' | 'no-forwarding' = 'members-may-forward') {
  const input = structuredClone(phase4dWorld().genesis.input);
  input.communication!.privateSharing = sharing;
  let world = createSociety(input), tick = 0;
  const group = world.groups![0], creatorId = world.agents[0].id, actorId = world.agents[1].id, outsiderId = world.agents[8].id;
  const perform = (action: Action) => { world = act({...world, tick: ++tick}, action); return world.events.at(-1)!.id; };
  const oldItemId = perform({actorId: creatorId, type: 'message', platform: group.platform, groupId: group.id, text: 'RAW_PHASE4D1_PRIVATE_HISTORY_SENTINEL'});
  const oldReadId = perform({actorId, type: 'read', platform: group.platform, targetId: oldItemId});
  for (let i = 0; i < 14; i++) {
    const item = perform({actorId: creatorId, type: 'post', platform: 'instagram', text: 'Unrelated fictional birdwatching observations ' + i});
    perform({actorId, type: 'read', platform: 'instagram', targetId: item});
  }
  return {get world() { return world; }, actorId, creatorId, outsiderId, group, oldItemId, oldReadId, perform};
}

test('private episodic recall follows current membership and since-rejoin history, including reducer reads and shares', () => {
  const f = privateEpisodeFixture();
  const recalled = () => JSON.stringify(buildDecisionContext(f.world, f.actorId, 'instagram'));
  const actor = f.world.agents.find(a => a.id === f.actorId)!;
  assert.ok(!actor.memory.some(m => m.eventId === f.oldReadId));
  assert.ok(actor.episodic!.some(m => m.eventId === f.oldReadId));
  assert.ok(recalled().includes('RAW_PHASE4D1_PRIVATE_HISTORY_SENTINEL'));
  assert.ok(!JSON.stringify(buildDecisionContext(f.world, f.outsiderId, 'reddit')).includes('RAW_PHASE4D1_PRIVATE_HISTORY_SENTINEL'));
  assert.throws(() => act(f.world, {actorId: f.outsiderId, type: 'read', platform: f.group.platform, targetId: f.oldItemId}));
  assert.throws(() => act(f.world, {actorId: f.outsiderId, type: 'share', platform: 'reddit', targetId: f.oldItemId}));
  assert.doesNotThrow(() => act(f.world, {actorId: f.actorId, type: 'share', platform: 'reddit', targetId: f.oldItemId}));
  f.perform({actorId: f.actorId, type: 'group-leave', platform: f.group.platform, targetId: f.group.id});
  assert.ok(!recalled().includes('RAW_PHASE4D1_PRIVATE_HISTORY_SENTINEL'));
  assert.throws(() => act(f.world, {actorId: f.actorId, type: 'share', platform: 'reddit', targetId: f.oldItemId}));
  f.perform({actorId: f.creatorId, type: 'group-invite', platform: f.group.platform, targetId: f.group.id, memberIds: [f.actorId]});
  f.perform({actorId: f.actorId, type: 'group-join', platform: f.group.platform, targetId: f.group.id});
  assert.ok(!recalled().includes('RAW_PHASE4D1_PRIVATE_HISTORY_SENTINEL'));
  assert.throws(() => act(f.world, {actorId: f.actorId, type: 'read', platform: f.group.platform, targetId: f.oldItemId}));
  assert.throws(() => act(f.world, {actorId: f.actorId, type: 'share', platform: 'reddit', targetId: f.oldItemId}));
  const newId = f.perform({actorId: f.creatorId, type: 'message', platform: f.group.platform, groupId: f.group.id, text: 'RAW_PHASE4D1_NEW_JOIN_SENTINEL'});
  f.perform({actorId: f.actorId, type: 'read', platform: f.group.platform, targetId: newId});
  const current = recalled();
  assert.ok(current.includes('RAW_PHASE4D1_NEW_JOIN_SENTINEL'));
  assert.ok(!current.includes('RAW_PHASE4D1_PRIVATE_HISTORY_SENTINEL'));
  assert.ok(f.world.agents.find(a => a.id === f.actorId)!.episodic!.some(m => m.eventId === f.oldReadId));
});

test('private no-forwarding removes share choices and public aggregate projections omit private content sentinels', () => {
  const f = privateEpisodeFixture('no-forwarding');
  const c = buildDecisionContext(f.world, f.actorId, 'instagram');
  assert.ok(c.items.some(i => i.id === f.oldItemId));
  assert.ok(!c.menu!.some(o => o.action === 'share' && o.targetKind === 'item' && c.items[o.targetIndex!].id === f.oldItemId));
  assert.throws(() => act(f.world, {actorId: f.actorId, type: 'share', platform: 'reddit', targetId: f.oldItemId}));
  const summary = publicSociety(f.world);
  const graph = summaryGraph({version: 1, scenarioIdentity: 'phase4d1-offline', executionIdentity: f.world.genesis.input.runId, nodes: [], edges: [], limitations: []}, summary);
  const facts = aggregateFacts(f.world, f.world.events);
  assert.ok(!JSON.stringify({summary, graph, facts}).includes('RAW_PHASE4D1_'));
  assert.ok(!('items' in summary) && !('events' in summary) && !('hybrid' in summary));
});

test('an authorised public share is readable by an outsider while the original private item remains inaccessible and untargetable', () => {
  const f = privateEpisodeFixture();
  const original = f.world.items.find(i => i.id === f.oldItemId)!;
  assert.equal(canAccessItem(f.world, f.outsiderId, original), false);
  const copyId = f.perform({actorId: f.actorId, type: 'share', platform: 'reddit', targetId: f.oldItemId});
  const copy = f.world.items.find(i => i.id === copyId)!;
  assert.equal(copy.sharedFrom, f.oldItemId);
  assert.equal(copy.platform, 'reddit');
  assert.ok(!copy.groupId);
  assert.ok(copy.text.includes(original.text));
  assert.equal(canAccessItem(f.world, f.outsiderId, copy), true);
  // A real follow places the sharer's public copy in this outsider's ordinary feed.
  f.perform({actorId: f.outsiderId, type: 'follow', platform: 'reddit', targetId: f.actorId});
  const readId = f.perform({actorId: f.outsiderId, type: 'read', platform: 'reddit', targetId: copyId});
  assert.equal(f.world.events.find(e => e.id === readId)!.targetId, copyId);
  const c = buildDecisionContext(f.world, f.outsiderId, 'reddit');
  assert.ok(c.items.some(i => i.id === copyId));
  assert.ok(c.memories.some(m => m.eventId === readId && m.itemIds.includes(copyId)));
  assert.ok(!c.items.some(i => i.id === f.oldItemId));
  assert.ok(!c.memories.some(m => m.itemIds.includes(f.oldItemId)));
  assert.ok(!c.menu!.some(o => o.targetKind === 'item' && c.items[o.targetIndex!]?.id === f.oldItemId));
  const allowed = decodeMenuDecision(memoryResponseWire(c, copyId), c);
  assert.doesNotThrow(() => parseSocialDecision(allowed, c));
  assert.throws(() => parseSocialDecision({...allowed, targetId: f.oldItemId}, c), /SOCIAL_TARGET/);
  assert.equal(canAccessItem(f.world, f.outsiderId, original), false);
  assert.throws(() => act(f.world, {actorId: f.outsiderId, type: 'read', platform: f.group.platform, targetId: f.oldItemId}));
  assert.throws(() => act(f.world, {actorId: f.outsiderId, type: 'share', platform: 'instagram', targetId: f.oldItemId}));
  assert.ok(!JSON.stringify(publicSociety(f.world)).includes('RAW_PHASE4D1_'));
});

test('saved explicit-act command journals replay exact state/context and reject altered traces while normal restore remains honest', () => {
  const f = buildMemoryStressFixture();
  assert.throws(() => restoreSociety(saveSociety(f.world)), 'Normal restore cannot reproduce explicitly injected reducer commands.');
  const directory = join(process.cwd(), 'tmp');
  mkdirSync(directory, {recursive: true});
  const path = join(directory, `phase4d1-memory-journal-${process.pid}.json`);
  try {
    writeFileSync(path, saveMemoryFixtureJournal(f), 'utf8');
    const saved = readFileSync(path, 'utf8');
    const replay = replayMemoryFixtureJournal(saved);
    assert.deepEqual(replay, f.world);
    assert.equal(encodeMenuContext(buildDecisionContext(replay, f.actorId, f.platform)), encodeMenuContext(f.context));
    const tampered = JSON.parse(saved);
    tampered.commands[0].eventId += '-altered';
    assert.throws(() => replayMemoryFixtureJournal(JSON.stringify(tampered)), /MEMORY_FIXTURE_EVENT/);
    const wrongText = JSON.parse(saved);
    wrongText.commands.find((c: {action: Action}) => c.action.type === 'post').action.text += ' altered';
    assert.throws(() => replayMemoryFixtureJournal(JSON.stringify(wrongText)), /MEMORY_FIXTURE_DIGEST/);
  } finally {
    rmSync(path, {force: true});
  }
});

test('a separate offline Node process replays the saved explicit-command journal with exact safe state and context hashes', () => {
  const f = buildMemoryStressFixture();
  const directory = join(process.cwd(), 'tmp');
  mkdirSync(directory, {recursive: true});
  const path = join(directory, `phase4d1-memory-process-journal-${process.pid}.json`);
  const digest = (value: string) => createHash('sha256').update(value).digest('hex');
  // The child uses the fixture-only command replay, never production scheduler restore.
  // It receives the same offline guard explicitly and inherits the current process environment.
  const program = `
    import {readFileSync} from 'node:fs';
    import {createHash} from 'node:crypto';
    import {canonical} from './lib/experiments/validation.ts';
    import {buildDecisionContext} from './lib/society/hybrid.ts';
    import {encodeMenuContext} from './lib/society/decision-menu.ts';
    import {replayMemoryFixtureJournal} from './scripts/testing/phase4d1-memory-fixture.ts';
    const [path,actorId,platform]=process.argv.slice(1);
    let egressBlocked=false;
    try { await fetch('https://phase4d1-egress.invalid/'); }
    catch(error) { egressBlocked=error.message==='OFFLINE_EXTERNAL_FETCH_BLOCKED'; }
    if(!egressBlocked)throw Error('MEMORY_FIXTURE_CHILD_EGRESS_GUARD');
    const world=replayMemoryFixtureJournal(readFileSync(path,'utf8'));
    const digest=value=>createHash('sha256').update(value).digest('hex');
    process.stdout.write(JSON.stringify({
      kind:'fixture-only-explicit-command-replay',egressBlocked,
      worldDigest:digest(canonical(world)),
      contextDigest:digest(encodeMenuContext(buildDecisionContext(world,actorId,platform))),
      eventCount:world.events.length,
    }));
  `;
  try {
    writeFileSync(path, saveMemoryFixtureJournal(f), 'utf8');
    const child = spawnSync(process.execPath, [
      '--import', pathToFileURL(join(process.cwd(), 'scripts', 'testing', 'offline-network.mjs')).href,
      '--input-type=module', '--eval', program, path, f.actorId, f.platform,
    ], {cwd: process.cwd(), env: process.env, encoding: 'utf8', timeout: 15000, windowsHide: true});
    assert.ifError(child.error);
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), {
      kind: 'fixture-only-explicit-command-replay', egressBlocked: true,
      worldDigest: digest(canonical(f.world)), contextDigest: digest(encodeMenuContext(f.context)),
      eventCount: f.world.events.length,
    });
  } finally {
    rmSync(path, {force: true});
  }
});
