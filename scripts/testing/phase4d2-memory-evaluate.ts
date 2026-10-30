/** Isolated two-policy evaluator. Private journals contain raw fixtures; ordinary output contains safe facets only. */
import {mkdirSync, readFileSync, writeFileSync, openSync, writeSync, fsyncSync, closeSync, existsSync, unlinkSync, statSync, fstatSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';
import {userInfo} from 'node:os';
import nextEnvironment from '@next/env';
import {buildTopicMemoryFixtures, replayTopicMemoryFixture, type TopicMemoryFixture, type TopicMemoryPolicy} from './phase4d2-memory-fixture.ts';
import {createSocialTransport} from '../../lib/server/inference/social.ts';
import {buildDecisionContext, finishDecision} from '../../lib/society/hybrid.ts';
import {encodeMenuContext} from '../../lib/society/decision-menu.ts';
import type {DecisionContext, SocialDecisionRecord} from '../../lib/society/decision-contract.ts';
import type {SocietyWorld} from '../../lib/society/contract.ts';
import type {MemoryRetrievalDiagnostics} from '../../lib/society/memory-diagnostics.ts';
import type {InferenceCallRecord} from '../../lib/server/inference/deepseek.ts';
import {publicSociety, summaryGraph} from '../../lib/server/society/summary.ts';
import {aggregateFacts} from '../../lib/server/society/facts.ts';
import {privateStoreDirectory, verifyPrivateStore, replacePrivateCheckpoint} from '../../lib/server/society/storage.ts';
import {canonical, ensure, freezeSnapshot} from '../../lib/experiments/validation.ts';

interface RequestRecord {
  id: number; condition: string; contextHash: string; state: 'reserved' | 'accepted' | 'rejected'; reservedUsd: number;
  costUsd: number | null; inputTokens: number | null; outputTokens: number | null; identity: string | null; error: string | null; durationMs: number | null;
}
interface Ledger {version: 1; task: string; requests: RequestRecord[]; halted: boolean}
interface Arm {condition: 'A' | 'B'; policy: TopicMemoryPolicy; world: SocietyWorld; context: DecisionContext}
interface FixtureJournal {version: 1; kind: 'phase4d2-topic-command-journal'; fixture: TopicMemoryFixture; fixtureDigest: string}
interface PrivateRecord {
  version: 1; fixtureJournal: string; condition: 'A' | 'B'; policy: TopicMemoryPolicy; contextHash: string;
  pending?: DecisionContext; accepted?: SocialDecisionRecord; worldHash?: string;
}
const mode = process.argv[2] ?? 'offline', replaySource = process.argv[3] ?? 'live';
const directory = resolve(process.env.IMPACTLENS_PHASE4D2_DIRECTORY ?? 'tmp/phase4d2'), privateRoot = join(directory, 'private');
const live = mode === 'live', journal = join(directory, live ? 'ledger.jsonl' : 'offline-ledger.jsonl');
const resultFile = join(directory, live ? 'real-evaluation.json' : 'offline-evaluation.json');
const reserveUsd = 0.0135, limits = {completions: 8, usd: 0.15};
const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
const historyDigest = (world: SocietyWorld) => digest({events: world.events, items: world.items, agents: world.agents, groups: world.groups});
const totals = (state: Ledger) => ({completions: state.requests.length,
  reportedUsd: state.requests.reduce((n, r) => n + (r.costUsd ?? 0), 0),
  conservativeUsd: state.requests.reduce((n, r) => n + (r.costUsd ?? r.reservedUsd), 0),
  unknownCharges: state.requests.filter(r => r.costUsd === null).length});
function readLedger(): Ledger {
  if (!existsSync(journal)) return {version: 1, task: 'phase4d2-memory', requests: [], halted: false};
  const raw = readFileSync(journal, 'utf8');
  ensure(raw.endsWith('\n'), 'MEMORY_LEDGER_INCOMPLETE');
  const state = JSON.parse(raw.trimEnd().split('\n').at(-1)!) as Ledger;
  ensure(state.version === 1 && state.task === 'phase4d2-memory' && Array.isArray(state.requests) && typeof state.halted === 'boolean', 'MEMORY_LEDGER_SHAPE');
  for (const r of state.requests) ensure(Number.isSafeInteger(r.id) && typeof r.contextHash === 'string' &&
    ['reserved', 'accepted', 'rejected'].includes(r.state) && r.reservedUsd === reserveUsd &&
    (r.costUsd === null || typeof r.costUsd === 'number' && Number.isFinite(r.costUsd) && r.costUsd >= 0), 'MEMORY_LEDGER_SHAPE');
  return state;
}
/** Every admission snapshot is appended and flushed before the corresponding POST. */
function saveLedger(state: Ledger) {
  const fd = openSync(journal, 'a', 0o600);
  try {const raw = JSON.stringify(state) + '\n'; ensure(writeSync(fd, raw) === Buffer.byteLength(raw), 'MEMORY_LEDGER_WRITE'); fsyncSync(fd);}
  finally {closeSync(fd);}
}
function offerContext(world: SocietyWorld, context: DecisionContext): SocietyWorld {
  ensure(world.hybrid && !world.hybrid.pending, 'MEMORY_FIXTURE_PENDING');
  ensure(digest(buildDecisionContext(world, context.actor.id, context.platform)) === digest(context), 'MEMORY_FIXTURE_CONTEXT');
  return {...world, hybrid: {...world.hybrid, pending: context}};
}
function mockWire(context: DecisionContext, f: TopicMemoryFixture, includeOld: boolean) {
  const option = context.menu?.find(o => o.action === 'comment' && o.targetKind === 'item' && context.items[o.targetIndex!].id === f.targetItemId);
  ensure(option, 'MEMORY_FIXTURE_TARGET_NOT_OFFERED');
  const oldIndex = context.memories.findIndex(m => m.eventId === f.earlierReadEventIds[0]);
  ensure(!includeOld || oldIndex >= 0, 'MEMORY_FIXTURE_RECALL_NOT_OFFERED');
  return {choiceId: option.id,
    text: includeOld ? 'Before launch approval, confirm the protected monthly pay floor of 2800 dollars recorded in the earlier payroll audit.'
      : 'I do not have the earlier audit detail; confirm the guaranteed monthly pay safeguard before approving launch.',
    motivation: 'Address the current encountered question using only available recorded evidence.',
    recallIds: includeOld ? ['memory-' + (oldIndex + 1)] : [], stanceId: 'keep',
    discussion: {topicIds: ['topic-1'], argument: 'condition'}, issueUpdate: null};
}
function assertPublicPrivacy(world: SocietyWorld, context: DecisionContext, authoredText: string) {
  const summary = publicSociety(world);
  const graph = summaryGraph({version: 1, scenarioIdentity: 'phase4d2-memory-private-audit', executionIdentity: world.genesis.input.runId,
    nodes: [], edges: [], limitations: []}, summary);
  const encoded = JSON.stringify({summary, graph, facts: aggregateFacts(world, world.events)});
  const privateStrings = [...world.items.map(i => i.text), ...context.memories.map(m => m.text), authoredText].filter(s => s.length >= 24);
  ensure(privateStrings.every(s => !encoded.includes(s)), 'MEMORY_PUBLIC_LEAK');
  return {rawLiteralLeaks: 0, projectionsChecked: ['summary', 'graph', 'facts']};
}
function restoreFixtureJournal(raw: string) {
  const saved = JSON.parse(raw) as FixtureJournal;
  ensure(saved.version === 1 && saved.kind === 'phase4d2-topic-command-journal' && saved.fixture.id === 'canonical-topic', 'MEMORY_FIXTURE_JOURNAL');
  ensure(digest(saved.fixture) === saved.fixtureDigest, 'MEMORY_FIXTURE_JOURNAL_DIGEST');
  const f = freezeSnapshot(saved.fixture), replay = replayTopicMemoryFixture(f, 'episodic-v1');
  ensure(historyDigest(replay) === f.historyDigest, 'MEMORY_FIXTURE_HISTORY');
  return f;
}
function checkOfflineGates(arms: Arm[]) {
  const safe = JSON.parse(readFileSync(join(directory, 'offline-evaluation.json'), 'utf8'));
  ensure(safe.mode === 'offline' && safe.fixture?.matchedRawHistory === true && safe.results?.length === 2 &&
    safe.results.every((r: any, i: number) => r.condition === arms[i].condition && r.policy === arms[i].policy &&
      r.contextHash === digest(arms[i].context) && r.status === 'accepted' && r.substantiveRecall === (i === 1) &&
      r.oldEpisodeInContext === (i === 1) && r.oldPrimaryItemInContext === (i === 1)), 'MEMORY_OFFLINE_GATES');
}

async function replay() {
  ensure(['offline', 'live'].includes(replaySource), 'MEMORY_REPLAY_SOURCE');
  await import('./offline-network.mjs');
  let externalFetchBlocked = false;
  try {await fetch('https://phase4d2-replay-egress.invalid/');} catch (error) {externalFetchBlocked = (error as Error).message === 'OFFLINE_EXTERNAL_FETCH_BLOCKED';}
  ensure(externalFetchBlocked, 'MEMORY_REPLAY_EGRESS');
  const results = [];
  for (const condition of ['A', 'B'] as const) {
    const record = JSON.parse(readFileSync(join(privateRoot, replaySource + '-' + condition + '.json'), 'utf8')) as PrivateRecord;
    const policy: TopicMemoryPolicy = condition === 'A' ? 'episodic-v1' : 'episodic-topic-v2';
    ensure(record.version === 1 && record.condition === condition && record.policy === policy && record.accepted?.status === 'accepted', 'MEMORY_REPLAY_RECORD');
    const f = restoreFixtureJournal(record.fixtureJournal), world = replayTopicMemoryFixture(f, policy);
    ensure(historyDigest(world) === f.historyDigest, 'MEMORY_FIXTURE_HISTORY');
    const context = buildDecisionContext(world, f.actorId, f.platform);
    ensure(digest(context) === record.contextHash && digest(context) === digest(record.accepted.context), 'MEMORY_CONTEXT_REPLAY');
    const next = finishDecision(offerContext(world, context), {decision: record.accepted.decision, usage: record.accepted.usage, error: record.accepted.error});
    ensure(digest(next) === record.worldHash && digest(next.hybrid!.records.at(-1)) === digest(record.accepted), 'MEMORY_DECISION_REPLAY');
    const privacy = assertPublicPrivacy(next, context, record.accepted.decision?.text ?? '');
    results.push({condition, policy, contextExact: true, decisionExact: true, worldExact: true, publicLiteralLeaks: privacy.rawLiteralLeaks});
  }
  console.log(JSON.stringify({mode, source: replaySource, replay: results, externalFetchBlocked, providerCalls: 0}));
}

async function main() {
  if (mode === 'replay') return replay();
  let native: typeof fetch = globalThis.fetch;
  if (live) {
    ensure(process.env.IMPACTLENS_PHASE4D2_LIVE === 'true' && !/offline-network|provider-preload|live-guard/.test(process.env.NODE_OPTIONS ?? ''), 'MEMORY_LIVE_OPT_IN');
    nextEnvironment.loadEnvConfig(process.cwd(), false, {info: () => {}, error: () => {throw Error('MEMORY_ENV_CONFIG');}});
    ensure(!Object.entries(process.env).some(([key, value]) => /MOCK|PREFLIGHT/.test(key) && value === 'true'), 'MEMORY_MOCK_SWITCH');
    ensure(!!process.env.OPENROUTER_API_KEY?.trim(), 'MEMORY_CREDENTIALS_REQUIRED');
    ensure(!process.env.SOCIAL_STORAGE_ROOT?.trim(), 'MEMORY_ORIGINAL_STORAGE_REQUIRED');
    await verifyPrivateStore(privateStoreDirectory('accepted-private'));
    await verifyPrivateStore(privateStoreDirectory('social-sessions'));
    writeFileSync(join(directory, 'storage-preflight.json'), JSON.stringify({account: userInfo().username, configuration: 'original-defaults',
      acceptedRoot: privateStoreDirectory('accepted-private'), sessionRoot: privateStoreDirectory('social-sessions'), durableProbe: true, paidRequests: 0}, null, 2));
  } else {await import('./offline-network.mjs'); native = globalThis.fetch;}
  await verifyPrivateStore(privateRoot);
  const f = buildTopicMemoryFixtures().find(f => f.id === 'canonical-topic')!;
  const arms: Arm[] = (['episodic-v1', 'episodic-topic-v2'] as const).map((policy, i) => {
    const world = replayTopicMemoryFixture(f, policy);
    ensure(historyDigest(world) === f.historyDigest, 'MEMORY_FIXTURE_HISTORY');
    const actor = world.agents.find(a => a.id === f.actorId)!;
    ensure(!actor.memory.some(m => m.eventId === f.earlierReadEventIds[0]) && actor.episodic?.some(m => m.eventId === f.earlierReadEventIds[0]), 'MEMORY_FIXTURE_NOT_EVICTED');
    return {condition: i === 0 ? 'A' : 'B', policy, world, context: buildDecisionContext(world, f.actorId, f.platform)};
  });
  const old = f.world.items.find(i => i.id === f.earlierItemIds[0])!.text, distinct = old.match(/floor of ([0-9]+) dollars/)![1];
  for (const [i, arm] of arms.entries()) ensure(arm.context.memories.some(m => m.eventId === f.earlierReadEventIds[0]) === (i === 1) &&
    arm.context.items.some(item => item.id === f.earlierItemIds[0]) === (i === 1) && encodeMenuContext(arm.context).includes(distinct) === (i === 1), 'MEMORY_POLICY_PAIR');
  if (live) checkOfflineGates(arms);
  const fixtureJournal = JSON.stringify({version: 1, kind: 'phase4d2-topic-command-journal', fixture: f, fixtureDigest: digest(f)} satisfies FixtureJournal);
  ensure(digest(restoreFixtureJournal(fixtureJournal)) === digest(f), 'MEMORY_FIXTURE_REPLAY');
  const initial = readLedger();
  ensure(!initial.halted && !initial.requests.some(r => r.state === 'reserved') && totals(initial).completions + 2 <= limits.completions &&
    totals(initial).conservativeUsd + 2 * reserveUsd <= limits.usd, 'MEMORY_PAIR_BUDGET');
  // Admit both contexts before replacing any pending or accepted checkpoint.
  for (const arm of arms) ensure(!initial.requests.some(r => r.contextHash === digest(arm.context)) &&
    !existsSync(join(privateRoot, (live ? 'live-' : 'offline-') + arm.condition + '.json')), 'MEMORY_CONTEXT_DUPLICATE');
  const results = [];
  for (const arm of arms) {
    let diagnostic: MemoryRetrievalDiagnostics | undefined;
    buildDecisionContext(arm.world, f.actorId, f.platform, value => {diagnostic = value;});
    const contextHash = digest(arm.context), path = join(privateRoot, (live ? 'live-' : 'offline-') + arm.condition + '.json');
    const privateRecord = {version: 1 as const, fixtureJournal, condition: arm.condition, policy: arm.policy, contextHash};
    await replacePrivateCheckpoint(path, JSON.stringify({...privateRecord, pending: arm.context}));
    let recordId: number | null = null;
    const guarded: typeof fetch = async (url, init) => {
      const address = String(url);
      if (address.startsWith('https://openrouter.ai/api/v1/generation?')) {ensure(recordId !== null, 'MEMORY_IDENTITY_LOOKUP'); return native(url, init);}
      ensure(address === 'https://openrouter.ai/api/v1/chat/completions' && init?.method === 'POST', 'MEMORY_PROVIDER_DENIED');
      const body = String(init?.body ?? ''); ensure(Buffer.byteLength(body) <= 98304, 'MEMORY_REQUEST_BYTES'); const b = JSON.parse(body);
      ensure(b.model === 'deepseek/deepseek-v4-flash-0731' && canonical(b.provider) === canonical({only: ['digitalocean'], allow_fallbacks: false, require_parameters: true}) &&
        canonical(b.reasoning) === canonical({effort: 'none', exclude: true}) && b.max_tokens === 600 && b.stream === false &&
        b.response_format?.type === 'json_schema' && b.response_format.json_schema.name === 'social_decision_v1' && b.response_format.json_schema.strict === true, 'MEMORY_PROVIDER_CONFIG');
      const state = readLedger(), count = totals(state);
      ensure(!state.halted && !state.requests.some(r => r.state === 'reserved') && !state.requests.some(r => r.contextHash === contextHash) &&
        count.completions < limits.completions && count.conservativeUsd + reserveUsd <= limits.usd, 'MEMORY_REQUEST_BUDGET');
      recordId = state.requests.length + 1;
      state.requests.push({id: recordId, condition: arm.condition, contextHash, state: 'reserved', reservedUsd: reserveUsd,
        costUsd: null, inputTokens: null, outputTokens: null, identity: null, error: null, durationMs: null});
      saveLedger(state);
      if (live) return native(url, init);
      return Response.json({id: 'mock-phase4d2-' + arm.condition, model: b.model, provider: 'DigitalOcean',
        choices: [{finish_reason: 'stop', message: {content: JSON.stringify(mockWire(arm.context, f, arm.policy === 'episodic-topic-v2'))}}],
        usage: {prompt_tokens: 400, completion_tokens: 120, total_tokens: 520, cost: 0.0001, completion_tokens_details: {reasoning_tokens: 0}}});
    };
    const onRecord = (r: InferenceCallRecord) => {
      if (recordId === null) return;
      const state = readLedger(), entry = state.requests.find(v => v.id === recordId)!;
      Object.assign(entry, {state: r.status === 'accepted' ? 'accepted' : 'rejected', costUsd: r.costUsd, inputTokens: r.inputTokens,
        outputTokens: r.outputTokens, identity: r.identityVerification, error: r.socialValidationRule ?? r.errorCode, durationMs: r.durationMs});
      if (r.errorCode === 'AI_PROVIDER_IDENTITY' || totals(state).conservativeUsd > limits.usd) state.halted = true;
      saveLedger(state);
    };
    const transport = createSocialTransport({key: live ? process.env.OPENROUTER_API_KEY! : 'offline-topic-memory-only', timeoutMs: 30000, fetcher: guarded, onRecord});
    const out = await transport.generate(arm.context);
    const next = finishDecision(offerContext(arm.world, arm.context), {decision: out.value, usage: out.record, error: null}), accepted = next.hybrid!.records.at(-1)!;
    await replacePrivateCheckpoint(path, JSON.stringify({...privateRecord, accepted, worldHash: digest(next)}));
    const choice = arm.context.menu!.find(c => c.id === accepted.decision?.selection?.choiceId)!;
    const oldIndex = arm.context.memories.findIndex(m => m.eventId === f.earlierReadEventIds[0]), oldRef = oldIndex >= 0 ? 'memory-' + (oldIndex + 1) : null;
    const required = new Set(choice.memoryIndices.map(i => 'memory-' + (i + 1)));
    if (accepted.decision?.stance) required.add('memory-' + (arm.context.memories.findIndex(m => m.eventId === accepted.decision!.stance!.exposureId) + 1));
    const text = accepted.decision?.text ?? '';
    const specificFact = (text.match(/\b[0-9][0-9,]*(?:\.[0-9]+)?\b/g) ?? []).some(n => Number(n.replaceAll(',', '')) === Number(distinct)) || /two\s+thousand(?:\s+and)?\s+eight\s+hundred/i.test(text);
    const payMeaning = /pay|floor|salary|earnings|monthly/i.test(text), approvalCondition = /before|until|launch|approv|confirm|condition/i.test(text);
    const authored = ['post', 'comment', 'reply', 'message', 'group-reply'].includes(accepted.decision?.action ?? '');
    const targetsCurrentQuestion = accepted.decision!.targetId === f.targetItemId;
    const optionalOlderRecall = !!oldRef && !required.has(oldRef) && !!accepted.decision!.selection?.recallIds.includes(oldRef);
    const oldPrimaryItemInContext = arm.context.items.some(i => i.id === f.earlierItemIds[0]);
    const privacy = assertPublicPrivacy(next, arm.context, text);
    results.push({condition: arm.condition, policy: arm.policy, realProvider: live, status: accepted.status, action: accepted.decision!.action,
      targetsCurrentQuestion, diagnostic, contextHash, earlierAbsentShortTerm: true, oldEpisodeInContext: oldIndex >= 0, oldPrimaryItemInContext,
      explicitOlderRecall: !!oldRef && !!accepted.decision!.selection?.recallIds.includes(oldRef), optionalOlderRecallBeyondTargetAndStance: optionalOlderRecall,
      olderBindingRequired: !!oldRef && required.has(oldRef), specificOldFactCorrect: specificFact, payMeaning, approvalCondition, authored,
      unsupportedSpecificFact: arm.policy === 'episodic-v1' && specificFact,
      substantiveRecall: arm.policy === 'episodic-topic-v2' && authored && targetsCurrentQuestion && oldIndex >= 0 && oldPrimaryItemInContext && optionalOlderRecall && specificFact && payMeaning && approvalCondition,
      usage: {inputTokens: out.record.inputTokens, outputTokens: out.record.outputTokens, costUsd: out.record.costUsd,
        identity: out.record.identityVerification, durationMs: out.record.durationMs}, privacy, worldHash: digest(next)});
  }
  const safe = {mode, limits, results, totals: totals(readLedger()), fixture: {id: f.id, commands: f.commands.length, tick: f.world.tick,
    oldEventId: f.earlierReadEventIds[0], oldItemId: f.earlierItemIds[0], currentTargetId: f.targetItemId,
    matchedRawHistory: true, matchedActor: true, matchedLatestTarget: true, fixtureAcceptedDecisionRecordsPerArm: f.world.hybrid!.records.length,
    fixtureRecordProvenance: 'agent-authored-offline-fixture-no-provider', earlierGatewayCalls: 0, plannedGatewayCalls: 2},
    assessmentLimit: 'Two stochastic decisions are exploratory. Numeric and keyword facets are bounded diagnostics, not a blinded semantic evaluation.'};
  writeFileSync(resultFile, JSON.stringify(safe, null, 2));
  console.log(JSON.stringify({mode, conditions: results.map(({condition, policy, status, action, targetsCurrentQuestion, oldEpisodeInContext, oldPrimaryItemInContext,
    explicitOlderRecall, optionalOlderRecallBeyondTargetAndStance, specificOldFactCorrect, unsupportedSpecificFact, substantiveRecall, usage}) =>
    ({condition, policy, status, action, targetsCurrentQuestion, oldEpisodeInContext, oldPrimaryItemInContext, explicitOlderRecall,
      optionalOlderRecallBeyondTargetAndStance, specificOldFactCorrect, unsupportedSpecificFact, substantiveRecall, usage})), totals: safe.totals}));
}

let lock: number | undefined;
const lockPath = journal + '.lock';
try {
  ensure(['offline', 'live', 'replay'].includes(mode), 'MEMORY_EVAL_MODE');
  mkdirSync(privateRoot, {recursive: true, mode: 0o700});
  if (mode !== 'replay') {try {lock = openSync(lockPath, 'wx', 0o600);} catch {throw Error('MEMORY_LEDGER_LOCK');}}
  await main();
} catch (error) {
  const code = (error as {code?: string}).code, message = (error as Error).message;
  console.error(JSON.stringify({error: code && /^[A-Z_]+$/.test(code) ? code : /^(MEMORY_|SOCIAL_|TOPIC_FIXTURE_)[A-Z_]+$/.test(message) ? message : 'MEMORY_EVALUATION_FAILED',
    mode: ['offline', 'live', 'replay'].includes(mode) ? mode : 'invalid'}));
  process.exitCode = 1;
} finally {
  if (lock !== undefined) {
    const owned = fstatSync(lock); closeSync(lock);
    if (existsSync(lockPath)) {const current = statSync(lockPath); if (current.ino === owned.ino && current.dev === owned.dev) unlinkSync(lockPath);}
  }
}
