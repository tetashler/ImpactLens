import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createScenarioFixtures } from '../../scenarios/fixtures.ts';
import { SCENARIO_PROVIDER_NOTICES, type ScenarioResponse, type ScenarioPlan, type ProviderStatus } from '../../scenarios/contract.ts';
import { presentScenarioPlan } from '../../scenarios/presentation.ts';

function response(plan: ScenarioPlan, providerStatus: ProviderStatus = 'not-configured'): ScenarioResponse {
  return { version: 1, requestId: 'presentation-test', clientRequestId: plan.request.clientRequestId, method: providerStatus === 'used' ? 'ai-assisted' : 'deterministic-fallback', providerStatus, plan };
}

test('only calculated MRT and limited AAC plans offer their matching configuration handoff', async () => {
  const f = await createScenarioFixtures();
  assert.deepEqual(presentScenarioPlan(response(f.mrt)).primaryAction, { mode: 'mrt', label: 'Configure MRT scenario' });
  assert.deepEqual(presentScenarioPlan(response(f.aac)).primaryAction, { mode: 'aac', label: 'Place your proposed centre' });
  assert.equal(presentScenarioPlan(response(f.polyclinic)).primaryAction, null);
  assert.equal(presentScenarioPlan(response(f.asean)).primaryAction, null);
});

test('all fixtures retain their registry availability and planning semantics without claiming results', async () => {
  const f = await createScenarioFixtures();
  const expected = [
    [f.mrt, 'MRT accessibility', 'Available for configuration', 'Modelled comparison'],
    [f.aac, 'Active Ageing Centre accessibility', 'Limited area only', 'Modelled comparison'],
    [f.polyclinic, 'Evidence planning', 'Planning only', 'Research plan'],
    [f.asean, 'Synthetic stakeholder exploration', 'Planned capability', 'Future exploration'],
  ] as const;
  for (const [plan, capability, availability, route] of expected) {
    const view = presentScenarioPlan(response(plan));
    assert.equal(view.capabilityLabel, capability);
    assert.equal(view.availabilityLabel, availability);
    assert.equal(view.routeLabel, route);
    assert.equal(view.stateLabel, 'Plan only / not executed');
    assert.doesNotMatch(`${view.availabilityLabel} ${view.routeLabel} ${view.inputHeading}`, /\bready\b|\bresults\b|(?<!not )\bexecuted\b/i);
  }
  assert.match(presentScenarioPlan(response(f.aac)).scopeNote, /Bukit Merah/);
  assert.match(presentScenarioPlan(response(f.asean)).scopeNote, /not implemented/);
  assert.match(presentScenarioPlan(response(f.polyclinic)).scopeNote, /No evidence has been retrieved/);
});

test('every provider state uses the contract notice without presenting fallback as AI interpretation', async () => {
  const { mrt } = await createScenarioFixtures();
  for (const providerStatus of ['used', 'not-configured', 'unavailable', 'invalid-response', 'not-needed'] as const) {
    const view = presentScenarioPlan(response(mrt, providerStatus));
    assert.equal(view.providerNotice, SCENARIO_PROVIDER_NOTICES[providerStatus]);
    assert.equal(view.interpretationLabel, providerStatus === 'used' ? 'AI-assisted interpretation' : 'Deterministic interpretation');
  }
});

test('an inconsistent execution discriminator cannot expose a calculation action', async () => {
  const { mrt } = await createScenarioFixtures();
  const inconsistent = { ...mrt, execution: 'exploratory-agents' } as unknown as ScenarioPlan;
  assert.equal(presentScenarioPlan(response(inconsistent)).primaryAction, null);
});

// Load the real TSX component in Node without adding a browser test framework.
// The loader only compiles TSX and ignores its stylesheet for this markup check.
test('rendered plans expose required inputs and limits, keep research non-executable, and escape text', () => {
  const componentUrl = new URL('../../../components/scenario-plan-view.tsx', import.meta.url).href;
  const fixtureUrl = new URL('../../scenarios/fixtures.ts', import.meta.url).href;
  const script = `
    import { registerHooks } from 'node:module';
    import { readFileSync } from 'node:fs';
    import babel from 'next/dist/compiled/babel/core.js';
    import typescript from 'next/dist/compiled/babel/preset-typescript.js';
    import react from 'next/dist/compiled/babel/preset-react.js';
    import { createElement } from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    registerHooks({ load(url, context, next) {
      if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
      if (url.endsWith('.tsx')) return { format: 'module', source: babel.transformSync(readFileSync(new URL(url), 'utf8'), { filename: new URL(url).pathname, presets: [[typescript, { isTSX: true, allExtensions: true }], [react, { runtime: 'automatic' }]], babelrc: false, configFile: false }).code, shortCircuit: true };
      return next(url, context);
    }});
    const { default: ScenarioPlanView } = await import(${JSON.stringify(componentUrl)});
    const { createScenarioFixtures } = await import(${JSON.stringify(fixtureUrl)});
    const fixtures = await createScenarioFixtures();
    const rendered = {};
    for (const [key, plan] of Object.entries(fixtures)) {
      const response = { version: 1, requestId: 'markup-test', clientRequestId: plan.request.clientRequestId, method: 'deterministic-fallback', providerStatus: 'not-configured', plan };
      rendered[key] = renderToStaticMarkup(createElement(ScenarioPlanView, { response, onConfigure() {}, onRevise() {} }));
    }
    const hostile = { ...fixtures.mrt, title: '<img src=x onerror="alert(1)">', interpretedIntent: '<script>alert(1)</script>' };
    rendered.escaped = renderToStaticMarkup(createElement(ScenarioPlanView, { response: { version: 1, requestId: 'escaped-test', clientRequestId: hostile.request.clientRequestId, method: 'deterministic-fallback', providerStatus: 'not-configured', plan: hostile }, onConfigure() {}, onRevise() {} }));
    process.stdout.write(JSON.stringify(rendered));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const html = JSON.parse(result.stdout) as Record<string, string>;
  for (const key of ['mrt', 'aac', 'polyclinic', 'asean']) {
    assert.match(html[key], /Plan only \/ not executed/);
    assert.match(html[key], /Cannot establish/);
    assert.match(html[key], /Assumptions and limits/);
    assert.match(html[key], /Revise question/);
    assert.doesNotMatch(html[key], /\bready\b|Run simulation|>Execute\b|<script|<iframe/i);
  }
  assert.match(html.mrt, /Configure MRT scenario/);
  assert.match(html.mrt, /exact proposed station locations/);
  assert.match(html.aac, /Place your proposed centre/);
  assert.match(html.aac, /Bukit Merah/);
  assert.match(html.polyclinic, /Research questions/);
  assert.match(html.polyclinic, /Evidence needed/);
  assert.doesNotMatch(html.polyclinic, /Configure MRT scenario|Place your proposed centre/);
  assert.match(html.asean, /Planned capability/);
  assert.match(html.asean, /Research questions/);
  assert.doesNotMatch(html.asean, /Configure MRT scenario|Place your proposed centre/);
  assert.match(html.escaped, /&lt;img/);
  assert.match(html.escaped, /&lt;script&gt;/);
  assert.doesNotMatch(html.escaped, /<img|<script/);
});
