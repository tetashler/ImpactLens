/** Offline-only authored fixtures. Raw histories never belong in public results or ordinary stdout. */
import {createHash} from 'node:crypto';
import {act, createSociety} from '../../lib/society/engine.ts';
import {buildDecisionContext, finishDecision} from '../../lib/society/hybrid.ts';
import {decodeMenuDecision} from '../../lib/society/decision-menu.ts';
import {canAccessItem} from '../../lib/society/communication.ts';
import {canonical, ensure, freezeSnapshot} from '../../lib/experiments/validation.ts';
import {phase4dWorld} from '../../lib/contracts/tests/phase4d-fixture.ts';
import type {Action, Platform, SocietyInput, SocietyWorld} from '../../lib/society/contract.ts';
import type {DecisionContext, SocialDecision} from '../../lib/society/decision-contract.ts';
import type {IssueUpdate} from '../../lib/society/episodic.ts';

export type TopicMemoryPolicy = 'episodic-v1' | 'episodic-topic-v2';
export type TopicMemoryRelevance = 'relevant' | 'irrelevant' | 'query' | 'inaccessible';
export interface TopicMemoryLabel {itemId: string; relevance: TopicMemoryRelevance; reason: string}
interface DecisionIntent {
  actorId: string; platform: Platform; action: SocialDecision['action']; targetId?: string; groupId?: string;
  text: string; topicIds: string[]; argument: NonNullable<SocialDecision['discussion']>['argument']; issueUpdate: IssueUpdate | null;
}
export type TopicMemoryCommand =
  | {kind: 'act'; tick: number; action: Action; eventId: string}
  | {kind: 'decision'; tick: number; intent: DecisionIntent; eventId: string};
export interface TopicMemoryFixture {
  version: 1; id: string; input: SocietyInput; world: SocietyWorld; commands: TopicMemoryCommand[];
  actorId: string; counterpartyId: string; platform: Platform; targetItemId: string; targetReadEventId: string;
  labels: TopicMemoryLabel[]; earlierItemIds: string[]; earlierReadEventIds: string[];
  competingItemIds: string[]; competingReadEventIds: string[]; historyDigest: string;
}

const sourceText = 'Payroll audit confirms the staggered rest trial protects a monthly floor of 2800 dollars before launch approval.';
const lexicalQuery = 'Payroll audit confirms the staggered rest trial protects a monthly floor before launch approval; please check this requirement.';
const differentQuery = 'Can staff start the shorter working week now, or must someone first verify their guaranteed take-home earnings?';
const serviceText = 'The overnight roster reserves two standby operators for every station during timetable experiments.';
const serviceQuery = 'Who can cover absences while transport personnel try a compressed schedule?';
const distractions = [
  'Ceramic exhibition tickets list blue pottery beside woven baskets.',
  'An astronomy club catalogues distant nebulae through rented telescopes.',
  'A botanical collection arranges orchids beside miniature ferns.',
  'The chess circle compares openings using wooden boards.',
  'A baking workshop decorates cupcakes using violet icing.',
];

/** Predeclared agent-authored fixture labels and query variants are fixed before any retrieval is run. */
const scenarios = freezeSnapshot([
  {id: 'same-wording', variant: 'lexical'},
  {id: 'canonical-topic', variant: 'topic'},
  {id: 'unshared-paraphrase', variant: 'untagged'},
  {id: 'irrelevant-recent-replies', variant: 'importance'},
  {id: 'duplicate-source-reads', variant: 'duplicates'},
  {id: 'cross-platform-accessible', variant: 'cross'},
  {id: 'private-left-membership', variant: 'left'},
  {id: 'private-since-rejoin', variant: 'rejoin'},
  {id: 'unresolved-explicit-issue', variant: 'issue'},
  {id: 'equal-signal-ties', variant: 'ties'},
  {id: 'nonshared-topic-negative', variant: 'negative'},
  {id: 'broad-tag-adversarial', variant: 'broad'},
] as const);

const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
/** A selector-only history comparison intentionally retains the already-recorded v1 decision contexts. */
function withPolicy(world: SocietyWorld, policy: TopicMemoryPolicy): SocietyWorld {
  ensure(world.genesis.input.intelligence, 'TOPIC_FIXTURE_POLICY');
  // The cast keeps this offline fixture usable while the opt-in v2 production contract is introduced.
  const intelligence = {...world.genesis.input.intelligence, memory: policy} as SocietyInput['intelligence'];
  return freezeSnapshot({...world, genesis: {...world.genesis, input: {...world.genesis.input, intelligence}}});
}

/** Bind semantic intent to the current real menu. No stored indexes or fabricated topic metadata. */
function acceptIntent(world: SocietyWorld, intent: DecisionIntent): SocietyWorld {
  const context = buildDecisionContext(world, intent.actorId, intent.platform);
  const option = context.menu?.find(o => o.action === intent.action &&
    (intent.targetId === undefined || o.targetKind === 'item' && context.items[o.targetIndex!].id === intent.targetId) &&
    (intent.groupId === undefined || o.groupIndex !== null && context.communication!.groups[o.groupIndex].id === intent.groupId));
  ensure(option, 'TOPIC_FIXTURE_MENU');
  const decision = decodeMenuDecision({choiceId: option.id, text: intent.text,
    motivation: 'Address the recorded fictional question using available experience.', recallIds: [], stanceId: 'keep',
    discussion: {topicIds: intent.topicIds, argument: intent.argument}, issueUpdate: intent.issueUpdate}, context);
  const next = finishDecision({...world, hybrid: {...world.hybrid!, pending: context}}, {decision, usage: null, error: null});
  ensure(next.hybrid!.records.at(-1)?.status === 'accepted', 'TOPIC_FIXTURE_ACCEPTED');
  return next;
}

function buildFixture(scenario: typeof scenarios[number]): TopicMemoryFixture {
  const {id, variant} = scenario;
  const input = structuredClone(phase4dWorld().genesis.input);
  input.runId = 'phase4d2-' + id;
  input.acceptedActions = [];
  // Neutral fixture goals prevent the answer or a preferred topic being baked into the actor query.
  input.roles[0].goals[0] = 'Evaluate recorded evidence and consider practical questions.';
  let world = createSociety(input), tick = 0;
  const privateCase = variant === 'left' || variant === 'rejoin';
  const actorId = world.agents[privateCase ? 1 : 0].id, counterpartyId = world.agents[privateCase ? 0 : 1].id;
  const platform: Platform = 'reddit', sourcePlatform: Platform = privateCase ? 'whatsapp' : variant === 'cross' ? 'instagram' : platform;
  const commands: TopicMemoryCommand[] = [], labels: TopicMemoryLabel[] = [];
  const earlierItemIds: string[] = [], earlierReadEventIds: string[] = [], competingItemIds: string[] = [], competingReadEventIds: string[] = [];
  const label = (itemId: string, relevance: TopicMemoryRelevance, reason: string) => { labels.push({itemId, relevance, reason}); return itemId; };
  const advance = (sameTick = false) => { if (!sameTick) tick++; ensure(tick <= world.genesis.config.steps, 'TOPIC_FIXTURE_TICKS'); world = {...world, tick}; };
  function perform(action: Action, sameTick = false) {
    advance(sameTick); const before = world.events.length; world = act(world, action);
    ensure(world.events.length === before + 1, 'TOPIC_FIXTURE_ACT');
    const eventId = world.events.at(-1)!.id; commands.push({kind: 'act', tick, action: structuredClone(action), eventId}); return eventId;
  }
  function author(intent: DecisionIntent, sameTick = false) {
    advance(sameTick); world = acceptIntent(world, intent);
    const eventId = world.events.at(-1)!.id; commands.push({kind: 'decision', tick, intent: structuredClone(intent), eventId}); return eventId;
  }
  const group = privateCase ? world.groups![0] : undefined;
  const addEarlier = (text: string, topicIds: string[], relevance: TopicMemoryRelevance = 'relevant', sameTick = false) => {
    const itemId = author({actorId: variant === 'issue' ? actorId : counterpartyId, platform: sourcePlatform,
      action: privateCase ? 'message' : 'post', ...(group ? {groupId: group.id} : {}), text, topicIds,
      argument: variant === 'issue' ? 'condition' : 'support',
      issueUpdate: variant === 'issue' ? {kind: 'condition', topicId: 'topic-1', issueId: null} : null}, sameTick);
    earlierItemIds.push(label(itemId, relevance, relevance === 'relevant' ? 'earlier-answer-bearing-source' : relevance === 'inaccessible' ? 'private-history-access-boundary' : 'different-canonical-topic'));
    if (variant !== 'issue') earlierReadEventIds.push(perform({actorId, type: 'read', platform: sourcePlatform, targetId: itemId}, variant === 'ties' || sameTick));
    return itemId;
  };
  const primary = addEarlier(sourceText, variant === 'untagged' ? [] : ['topic-1'], privateCase ? 'inaccessible' : variant === 'negative' ? 'irrelevant' : 'relevant');
  if (variant === 'negative') addEarlier(serviceText, ['topic-2']);
  if (variant === 'ties') addEarlier(sourceText, ['topic-1'], 'relevant', true);
  if (variant === 'duplicates') for (let i = 0; i < 4; i++) earlierReadEventIds.push(perform({actorId, type: 'read', platform: sourcePlatform, targetId: primary}));
  if (privateCase) {
    perform({actorId, type: 'group-leave', platform: sourcePlatform, targetId: group!.id});
    if (variant === 'rejoin') {
      const prejoin = author({actorId: counterpartyId, action: 'message', platform: sourcePlatform, groupId: group!.id,
        text: 'A private payroll attachment records an additional launch restriction for invited members.', topicIds: ['topic-1'], argument: 'condition', issueUpdate: null});
      label(prejoin, 'inaccessible', 'never-experienced-before-current-join');
      perform({actorId: counterpartyId, type: 'group-invite', platform: sourcePlatform, targetId: group!.id, memberIds: [actorId]});
      perform({actorId, type: 'group-join', platform: sourcePlatform, targetId: group!.id});
    }
  }
  // Fourteen genuine unrelated reads remove the earlier encounter from ST12.
  for (let i = 0; i < 14; i++) {
    const itemId = perform({actorId: counterpartyId, type: 'post', platform, text: 'Unrelated fictional birdwatching observations numbered ' + i});
    label(itemId, 'irrelevant', 'unrelated-history');
    perform({actorId, type: 'read', platform, targetId: itemId});
  }
  const anchorId = perform({actorId, type: 'post', platform, text: 'A fictional community noticeboard invites miscellaneous hobby announcements.'});
  label(anchorId, 'irrelevant', 'unrelated-thread-root');
  perform({actorId: counterpartyId, type: 'read', platform, targetId: anchorId});
  for (const text of distractions.slice(0, variant === 'ties' ? 4 : 5)) {
    const itemId = variant === 'broad'
      ? author({actorId: counterpartyId, action: 'comment', platform, targetId: anchorId, text, topicIds: ['topic-1'], argument: 'support', issueUpdate: null})
      : perform({actorId: counterpartyId, type: 'comment', platform, targetId: anchorId, text});
    competingItemIds.push(label(itemId, 'irrelevant', variant === 'broad' ? 'same-broad-tag-unrelated-substance' : 'recent-high-importance-unrelated-reply'));
    competingReadEventIds.push(perform({actorId, type: 'read', platform, targetId: itemId}));
  }
  const queryText = ['lexical', 'duplicates', 'ties'].includes(variant) ? lexicalQuery : variant === 'negative' ? serviceQuery : differentQuery;
  const targetItemId = author({actorId: counterpartyId, action: 'post', platform, text: queryText,
    topicIds: variant === 'untagged' ? [] : variant === 'negative' ? ['topic-2'] : ['topic-1'], argument: 'question', issueUpdate: null});
  label(targetItemId, 'query', 'current-question-is-not-recalled-evidence');
  const targetReadEventId = perform({actorId, type: 'read', platform, targetId: targetItemId});
  // Genesis-authored items are explicitly labelled background, so precision has no unlabeled candidates.
  for (const item of world.items) if (!labels.some(l => l.itemId === item.id)) label(item.id, 'irrelevant', 'genesis-background');
  return freezeSnapshot({version: 1, id, input: world.genesis.input, world, commands, actorId, counterpartyId, platform,
    targetItemId, targetReadEventId, labels, earlierItemIds, earlierReadEventIds, competingItemIds, competingReadEventIds,
    historyDigest: digest({events: world.events, items: world.items, agents: world.agents, groups: world.groups})});
}

/** New instances are independent; fixtures and inputs are deeply frozen before either arm is measured. */
export function buildTopicMemoryFixtures(): readonly TopicMemoryFixture[] { return freezeSnapshot(scenarios.map(buildFixture)); }

/** Frozen-history intervention, not production save/restore or natural genesis replay. */
export function topicMemoryPolicyArm(fixture: TopicMemoryFixture, policy: TopicMemoryPolicy) {
  const world = withPolicy(fixture.world, policy);
  return {world, context: buildDecisionContext(world, fixture.actorId, fixture.platform)};
}

/** Rebuild ordinary worlds using the selected genesis policy and actual authoritative transitions. */
export function replayTopicMemoryFixture(fixture: TopicMemoryFixture, policy: TopicMemoryPolicy = 'episodic-v1'): SocietyWorld {
  const input = structuredClone(fixture.input);
  input.intelligence!.memory = policy as NonNullable<SocietyInput['intelligence']>['memory'];
  let world = createSociety(input);
  for (const command of fixture.commands) {
    ensure(command.tick >= world.tick && command.tick <= world.genesis.config.steps, 'TOPIC_FIXTURE_REPLAY_TICK');
    world = {...world, tick: command.tick};
    world = command.kind === 'act' ? act(world, command.action) : acceptIntent(world, command.intent);
    ensure(world.events.at(-1)!.id === command.eventId, 'TOPIC_FIXTURE_REPLAY_EVENT');
  }
  if (policy === 'episodic-v1') ensure(digest(world) === digest(fixture.world), 'TOPIC_FIXTURE_REPLAY_WORLD');
  return freezeSnapshot(world);
}

/** Safe counts/IDs only. Query-source memories are excluded from relevance precision. */
export function scoreTopicMemoryFixture(fixture: TopicMemoryFixture, context: DecisionContext) {
  const byItem = new Map(fixture.labels.map(l => [l.itemId, l.relevance]));
  const retrieved = context.memories.map(m => m.primaryItemId).filter((id): id is string => !!id && byItem.get(id) !== 'query');
  const unique = [...new Set(retrieved)], relevant = fixture.labels.filter(l => l.relevance === 'relevant').map(l => l.itemId);
  const supplied = new Set(context.items.map(i => i.id));
  const recalled = unique.filter(id => byItem.get(id) === 'relevant' && supplied.has(id));
  const inaccessible = fixture.labels.filter(l => l.relevance === 'inaccessible').map(l => l.itemId);
  const inaccessibleIncluded = context.items.filter(i => inaccessible.includes(i.id));
  return {fixtureId: fixture.id, relevantSources: relevant.length, recalledRelevantSources: recalled.length,
    recall: relevant.length ? recalled.length / relevant.length : null,
    precision: unique.length ? recalled.length / unique.length : null,
    selectedEvidenceMemories: retrieved.length, selectedUniqueSources: unique.length,
    duplicateSourceSelections: retrieved.length - unique.length,
    missingPrimaryContent: retrieved.filter(id => !supplied.has(id)).length,
    irrelevantSourceSelections: unique.filter(id => byItem.get(id) === 'irrelevant').length,
    inaccessibleItemSelections: inaccessibleIncluded.length,
    relevantItemIds: relevant, recalledRelevantItemIds: recalled,
    inaccessibleItemIds: inaccessible, selectedItemIds: context.items.map(i => i.id),
    allItemsAccessible: context.items.every(i => canAccessItem(fixture.world, fixture.actorId, fixture.world.items.find(item => item.id === i.id)!)),
    contextBytes: Buffer.byteLength(canonical(context)), memoryCount: context.memories.length, itemCount: context.items.length};
}
