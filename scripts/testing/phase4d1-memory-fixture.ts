/** Offline reducer fixture. Never import this test utility into a public/client payload. */
import {createHash} from 'node:crypto';
import {act, createSociety} from '../../lib/society/engine.ts';
import {buildDecisionContext} from '../../lib/society/hybrid.ts';
import {canonical, ensure} from '../../lib/experiments/validation.ts';
import type {Action, Platform, SocietyInput, SocietyWorld} from '../../lib/society/contract.ts';
import type {DecisionContext} from '../../lib/society/decision-contract.ts';
import {phase4dWorld} from '../../lib/contracts/tests/phase4d-fixture.ts';

export interface MemoryFixtureCommand {tick: number; action: Action; eventId: string}
export interface MemoryStressFixture {
  version: 1;
  input: SocietyInput;
  commands: MemoryFixtureCommand[];
  world: SocietyWorld;
  context: DecisionContext;
  actorId: string;
  counterpartyId: string;
  platform: Platform;
  earlierItemId: string;
  earlierEventId: string;
  targetItemId: string;
  targetReadEventId: string;
  unrelatedReadEventIds: string[];
  competingReadEventIds: string[];
  wording: 'lexical' | 'paraphrase';
}

const earlierStatement = 'Payroll audit confirms the staggered rest trial protects a monthly floor of 2800 dollars before launch approval.';
const laterStatements = {
  lexical: 'Before approving the staggered rest trial, what did the earlier payroll audit confirm about the protected monthly floor?',
  paraphrase: 'Can staff start the shorter working week now, or must someone first verify their guaranteed take-home earnings?',
};
const distractions = [
  'Ceramic exhibition tickets list blue pottery beside woven baskets.',
  'An astronomy club catalogues distant nebulae through rented telescopes.',
  'A botanical collection arranges orchids beside miniature ferns.',
  'The chess circle compares openings using wooden boards.',
  'A baking workshop decorates cupcakes using violet icing.',
];

/** All memories are created by successful real reducer acts; ticks are recorded, never scheduled implicitly. */
export function buildMemoryStressFixture(options: {wording?: 'lexical' | 'paraphrase'} = {}): MemoryStressFixture {
  const wording = options.wording ?? 'lexical';
  const input = structuredClone(phase4dWorld().genesis.input);
  input.runId = 'phase4d1-memory-' + wording;
  // A genuine accepted genesis statement provides high-importance earlier information.
  // It is read exactly once, never copied into the later question or an actor goal.
  input.acceptedActions[1].statement = earlierStatement;
  let world = createSociety(input), tick = 0;
  const actorId = world.agents[0].id, counterpartyId = world.agents[1].id;
  const earlier = world.items.find(i => i.actorId === counterpartyId && world.events.find(e => e.id === i.id)?.sourceEventId === input.acceptedActions[1].id)!;
  const platform = earlier.platform, commands: MemoryFixtureCommand[] = [];
  function perform(action: Action) {
    ensure(++tick <= world.genesis.config.steps, 'MEMORY_FIXTURE_TICKS');
    world = act({...world, tick}, action);
    const eventId = world.events.at(-1)!.id;
    commands.push({tick, action: structuredClone(action), eventId});
    return eventId;
  }
  const earlierEventId = perform({actorId, type: 'read', platform, targetId: earlier.id});
  const unrelatedReadEventIds: string[] = [];
  for (let i = 0; i < 14; i++) {
    const itemId = perform({actorId: counterpartyId, type: 'post', platform, text: 'Unrelated fictional birdwatching observations numbered ' + i});
    unrelatedReadEventIds.push(perform({actorId, type: 'read', platform, targetId: itemId}));
  }
  // Distinct genuine direct replies compete with the older accepted statement.
  // Five siblings plus their root occupy six item slots, leaving space for the old and latest items.
  const anchorId = perform({actorId, type: 'post', platform, text: 'A fictional community noticeboard invites miscellaneous hobby announcements.'});
  perform({actorId: counterpartyId, type: 'read', platform, targetId: anchorId});
  const competingReadEventIds: string[] = [];
  for (const text of distractions) {
    const itemId = perform({actorId: counterpartyId, type: 'comment', platform, targetId: anchorId, text});
    competingReadEventIds.push(perform({actorId, type: 'read', platform, targetId: itemId}));
  }
  const targetItemId = perform({actorId: counterpartyId, type: 'post', platform, text: laterStatements[wording]});
  const targetReadEventId = perform({actorId, type: 'read', platform, targetId: targetItemId});
  return {version: 1, input, commands, world, context: buildDecisionContext(world, actorId, platform), actorId, counterpartyId, platform, earlierItemId: earlier.id, earlierEventId, targetItemId, targetReadEventId, unrelatedReadEventIds, competingReadEventIds, wording};
}

export function buildMatchedMemoryAblation(f: MemoryStressFixture) {
  const actor = f.world.agents.find(a => a.id === f.actorId)!;
  ensure(!actor.memory.some(m => m.eventId === f.earlierEventId), 'MEMORY_FIXTURE_NOT_EVICTED');
  ensure(actor.episodic?.filter(m => m.eventId === f.earlierEventId).length === 1, 'MEMORY_FIXTURE_NO_EPISODE');
  // Test-only server projection: remove the one actual old episode; do not change the event/item registry.
  const controlWorld: SocietyWorld = {...f.world, agents: f.world.agents.map(a => a.id === f.actorId ? {...a, episodic: a.episodic!.filter(m => m.eventId !== f.earlierEventId)} : a)};
  const full = {world: f.world, context: buildDecisionContext(f.world, f.actorId, f.platform)};
  const control = {world: controlWorld, context: buildDecisionContext(controlWorld, f.actorId, f.platform)};
  const difference = <T,>(a: T[], b: T[]) => a.filter(id => !b.includes(id));
  const fullContext = full.context as unknown as Record<string, unknown>, controlContext = control.context as unknown as Record<string, unknown>;
  const differences = {
    worldMutation: 'Remove exactly one genuine actor episodic entry; retain genesis, all events/items, short-term memory, state and latest encounter.',
    removedEpisodeEventIds: [f.earlierEventId],
    contextKeys: [...new Set([...Object.keys(fullContext), ...Object.keys(controlContext)])].filter(key => canonical(fullContext[key] ?? null) !== canonical(controlContext[key] ?? null)),
    removedMemoryEventIds: difference(full.context.memories.map(m => m.eventId), control.context.memories.map(m => m.eventId)),
    addedMemoryEventIds: difference(control.context.memories.map(m => m.eventId), full.context.memories.map(m => m.eventId)),
    removedItemIds: difference(full.context.items.map(i => i.id), control.context.items.map(i => i.id)),
    addedItemIds: difference(control.context.items.map(i => i.id), full.context.items.map(i => i.id)),
    // Full rebuilt menus are supplied for precise inspection; indexes and choice IDs may change.
    fullMenu: full.context.menu,
    controlMenu: control.context.menu,
  };
  return {full, control, differences};
}

/** A real offered comment choice plus optional actual recalled episode references; no arbitrary target IDs. */
export function memoryResponseWire(c: DecisionContext, targetItemId: string, recallEventIds: string[] = [], text = 'The earlier safeguard should be checked before this fictional proposal proceeds.') {
  const option = c.menu?.find(o => o.action === 'comment' && o.targetKind === 'item' && c.items[o.targetIndex!].id === targetItemId);
  ensure(option, 'MEMORY_FIXTURE_TARGET_NOT_OFFERED');
  const recallIds = recallEventIds.map(id => {
    const index = c.memories.findIndex(m => m.eventId === id);
    ensure(index >= 0, 'MEMORY_FIXTURE_RECALL_NOT_OFFERED');
    return 'memory-' + (index + 1);
  });
  return {choiceId: option.id, text, motivation: 'Address the encountered question using only supplied experienced information.', recallIds, stanceId: 'keep', discussion: {topicIds: ['topic-1'], argument: 'condition'}, issueUpdate: null};
}

/** Offer an already-built authoritative context without invoking the ordinary attention scheduler. */
export function offerMemoryFixtureContext(world: SocietyWorld, context: DecisionContext): SocietyWorld {
  ensure(world.hybrid && !world.hybrid.pending, 'MEMORY_FIXTURE_PENDING');
  ensure(canonical(buildDecisionContext(world, context.actor.id, context.platform)) === canonical(context), 'MEMORY_FIXTURE_CONTEXT');
  return {...world, hybrid: {...world.hybrid, pending: context}};
}

interface MemoryFixtureJournal {version: 1; kind: 'phase4d1-explicit-act-journal'; input: SocietyInput; commands: MemoryFixtureCommand[]; worldDigest: string}
const worldDigest = (world: SocietyWorld) => createHash('sha256').update(canonical(world)).digest('hex');

/** Fixture-only persistence. Production saveSociety/restoreSociety does not replay manually issued acts. */
export function saveMemoryFixtureJournal(f: Pick<MemoryStressFixture, 'input' | 'commands' | 'world'>): string {
  const journal: MemoryFixtureJournal = {version: 1, kind: 'phase4d1-explicit-act-journal', input: f.input, commands: f.commands, worldDigest: worldDigest(f.world)};
  return JSON.stringify(journal);
}

/** Replay original complete Action inputs, checking each resulting event ID and the complete resulting state. */
export function replayMemoryFixtureJournal(saved: string): SocietyWorld {
  const journal = JSON.parse(saved) as MemoryFixtureJournal;
  ensure(journal.version === 1 && journal.kind === 'phase4d1-explicit-act-journal' && Array.isArray(journal.commands), 'MEMORY_FIXTURE_JOURNAL');
  let world = createSociety(journal.input);
  for (const command of journal.commands) {
    ensure(Number.isSafeInteger(command.tick) && command.tick >= world.tick && command.tick <= world.genesis.config.steps, 'MEMORY_FIXTURE_TICKS');
    const before = world.events.length;
    world = act({...world, tick: command.tick}, command.action);
    ensure(world.events.length === before + 1 && world.events.at(-1)!.id === command.eventId, 'MEMORY_FIXTURE_EVENT');
  }
  ensure(worldDigest(world) === journal.worldDigest, 'MEMORY_FIXTURE_DIGEST');
  return world;
}
