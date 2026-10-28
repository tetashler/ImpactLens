import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyQuestionContext } from '../../question-simulation/context.ts';
import { createDemoInput } from '../../stakeholder-simulation/roles.ts';
import { runStakeholderSimulation } from '../../stakeholder-simulation/engine.ts';
import type { SimulationResponse } from '../../map-contract.ts';
import { createDefaultEldercareRequest } from '../../eldercare/api-contract.ts';
import { calculateEldercare } from '../../server/eldercare-service.ts';
import { spawnSync } from 'node:child_process';

const api = await import('../../question-simulation/report.ts').catch(() => null);
const localResult: SimulationResponse = { serviceDate: '2026-10-27', model: 'static-median-travel-time', comparisons: [{
  origin: 'NS4', destination: 'NE16', status: 'compared', baselineMinutes: 12, scenarioMinutes: 7, minutesSaved: 5, percentageChange: -41.6666666667,
  usedProposedLine: true, baselineTransfers: 1, scenarioTransfers: 0, transferChange: -1, baselineStatus: 'reachable', scenarioStatus: 'reachable',
  baselineRoute: { stationIds: ['NS4', 'NE16'], lines: ['NSL'], coordinates: [[103.745, 1.385], [103.895, 1.392]] },
  scenarioRoute: { stationIds: ['NS4', 'NE16'], lines: ['DEMO'], coordinates: [[103.745, 1.385], [103.895, 1.392]] },
}] };

test('local report stays local and does not claim stakeholder execution or international effects', async () => {
  assert.ok(api, 'question report projector is required');
  const context = classifyQuestionContext('What if we built a park in Tampines?');
  const report = await api.projectQuestionReport({ context });
  assert.equal(report.runStatus, 'not-run');
  assert.equal(report.executionMode, 'not-run');
  assert.ok(report.sections.some(section => section.id === 'local-research'));
  assert.equal(report.sections.some(section => section.id === 'cross-border-research' || section.id === 'international-research'), false);
  assert.equal(report.sections.some(section => section.kind === 'synthetic-observations'), false);
  assert.ok(Object.isFrozen(report.sections));
  const optional = await api.projectQuestionReport({ context, run: undefined, calculationIdentity: undefined, calculatedResults: undefined });
  assert.deepEqual(optional, report);
});

test('cross-border report presents research questions without invented tariff or social outcome magnitudes', async () => {
  assert.ok(api, 'question report projector is required');
  const report = await api.projectQuestionReport({ context: classifyQuestionContext('What if Singapore increased taxes on imported goods?') });
  const crossBorder = report.sections.find(section => section.id === 'cross-border-research');
  assert.equal(crossBorder?.kind, 'research-questions');
  assert.ok(crossBorder?.items.every(item => item.classification === 'research-question'));
  assert.ok(crossBorder?.items.some(item => /GST|excise|tariff/.test(item.text)));
  assert.equal(report.runId, null);
  assert.deepEqual(report.calculatedResults, []);
  assert.doesNotMatch(JSON.stringify(report), /\d\s*(?:%|percent)|\d\s+(?:jobs|workers|households)/i);
});

test('report projects actual accepted stakeholder statements and preserves failed execution status', async () => {
  assert.ok(api, 'question report projector is required');
  const input = createDemoInput();
  const context = classifyQuestionContext(input.question);
  const run = await runStakeholderSimulation(input, { attemptId: 'question-report-run' });
  const report = await api.projectQuestionReport({ context, run });
  assert.equal(report.runId, run.runId);
  assert.equal(report.runStatus, 'completed');
  assert.equal(report.executionMode, 'deterministic-demo');
  const statements = report.sections.find(section => section.kind === 'synthetic-observations')!.items;
  assert.deepEqual(statements.map(item => item.text), run.events.map(event => event.statement));
  assert.deepEqual(statements.map(item => item.eventId), run.events.map(event => event.id));
  assert.ok(report.limitations.some(limit => /scripted/i.test(limit)));
  assert.ok(report.sections.some(section => section.id === 'evidence' && section.items.some(item => /No evidence/i.test(item.text))));
  await assert.rejects(api.projectQuestionReport({ context: classifyQuestionContext('A different question'), run }), /question|scenario/i);
  await assert.rejects(api.projectQuestionReport({ context, run: { ...run, inputFingerprint: '0'.repeat(64) } }));
  const failedInput = structuredClone(input); failedInput.simulationOptions.mode = 'llm-assisted';
  const failed = await runStakeholderSimulation(failedInput, { attemptId: 'question-report-failed' });
  const failedReport = await api.projectQuestionReport({ context, run: failed });
  assert.equal(failedReport.runStatus, 'failed');
  assert.equal(failedReport.sections.some(section => section.kind === 'synthetic-observations'), false);
});

test('existing MRT calculator output is retained exactly and rejected under a stale calculation binding', async () => {
  assert.ok(api, 'question report projector is required');
  const context = classifyQuestionContext('Add a new MRT line in Singapore');
  const calculation = { kind: 'mrt' as const, scenarioIdentity: 'existing-current-key', executionIdentity: 'accepted-mrt-run', result: localResult };
  const report = await api.projectQuestionReport({ context, calculationIdentity: 'existing-current-key', calculatedResults: [calculation] });
  assert.deepEqual(report.calculatedResults[0], calculation);
  assert.ok(report.sections.some(section => section.kind === 'calculated-results'));
  assert.equal(report.runStatus, 'not-run');
  assert.ok(Object.isFrozen(report.calculatedResults[0].result));
  await assert.rejects(api.projectQuestionReport({ context, calculationIdentity: 'another-key', calculatedResults: [calculation] }), /identity|binding/i);
  await assert.rejects(api.projectQuestionReport({ context, calculatedResults: [calculation] }), /identity|binding/i);
  const invalid = { ...calculation, result: { ...localResult, comparisons: [{ ...localResult.comparisons[0], baselineMinutes: Infinity }] } };
  await assert.rejects(api.projectQuestionReport({ context, calculationIdentity: 'existing-current-key', calculatedResults: [invalid] }));
});

test('accepted limited AAC output retains its populations, units and coverage limitations', async () => {
  assert.ok(api, 'question report projector is required');
  const result = await calculateEldercare(createDefaultEldercareRequest('question-report-aac'));
  const calculation = { kind: 'aac' as const, scenarioIdentity: 'current-aac-context', executionIdentity: 'accepted-aac-output', result };
  const report = await api.projectQuestionReport({ context: classifyQuestionContext('What if a new AAC opened in Singapore?'), calculationIdentity: 'current-aac-context', calculatedResults: [calculation] });
  assert.deepEqual(report.calculatedResults[0], calculation);
  assert.ok(result.limitations.every(limit => report.limitations.includes(limit)));
  assert.equal(report.runStatus, 'not-run');
});

test('context and report modules import without server dependencies or execution side effects', () => {
  const url = new URL('../../question-simulation/report.ts', import.meta.url).href;
  const script = `import {registerHooks,builtinModules} from 'node:module';registerHooks({resolve(specifier,context,next){if(specifier.startsWith('node:')||builtinModules.includes(specifier)||/[\\\\/]server[\\\\/]/.test(specifier))throw new Error('Server dependency in question report');return next(specifier,context);}});globalThis.fetch=()=>{throw new Error('Report import attempted network execution');};await import(${JSON.stringify(url)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
