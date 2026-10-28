import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createQuestionSimulation, type QuestionSimulationSnapshot } from '../../question-simulation/client.ts';
import { runStakeholderSimulation } from '../../stakeholder-simulation/engine.ts';

const geometry = { version: 1 as const, scenarioId: 'question-ui-test', features: [] };
const aseanQuestion = 'What if Singapore leaves ASEAN?';

/** The real component renders through the same local TSX loader used by other UI checks. */
function renderConsole(state: QuestionSimulationSnapshot, options: { question?: string; report?: boolean; landing?: boolean } = {}): string {
  const component = new URL('../../../components/question-console.tsx', import.meta.url).href;
  const script = `
    import {registerHooks} from 'node:module';
    import {readFileSync,existsSync} from 'node:fs';
    import babel from 'next/dist/compiled/babel/core.js';
    import typescript from 'next/dist/compiled/babel/preset-typescript.js';
    import react from 'next/dist/compiled/babel/preset-react.js';
    import {createElement} from 'react';
    import {renderToStaticMarkup} from 'react-dom/server';
    registerHooks({
      resolve(specifier,context,next){if(specifier.startsWith('.')&&context.parentURL){for(const suffix of ['.tsx','.ts']){const candidate=new URL(specifier+suffix,context.parentURL);if(existsSync(candidate))return next(candidate.href,context);}}return next(specifier,context);},
      load(url,context,next){if(url.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(url.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(url),'utf8'),{filename:new URL(url).pathname,presets:[[typescript,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return next(url,context);}
    });
    const {default:QuestionConsole}=await import(${JSON.stringify(component)});
    const props=JSON.parse(readFileSync(0,'utf8'));
    const noop=()=>{};
    process.stdout.write(renderToStaticMarkup(createElement(QuestionConsole,{...props,onQuestion:noop,onStart:noop,onCancel:noop,onMap:noop,onGraph:noop,onReport:noop,mrt:null,aac:null})));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    input: JSON.stringify({ state, question: options.question ?? state.question, ...options }), encoding: 'utf8', timeout: 15000,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message || 'Question console SSR failed');
  return result.stdout;
}

function initialState(question = aseanQuestion): QuestionSimulationSnapshot {
  const controller = createQuestionSimulation();
  controller.invalidate({ question, geometry, geometryRevision: 0 });
  const state = controller.getSnapshot();
  controller.dispose();
  return state;
}

async function terminalState(question: string): Promise<QuestionSimulationSnapshot> {
  const controller = createQuestionSimulation({ fetcher: async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    const run = await runStakeholderSimulation(body.input, { attemptId: body.attemptId });
    return Response.json({ version: 1, attemptId: body.attemptId, run });
  } });
  controller.invalidate({ question, geometry, geometryRevision: 0 });
  await controller.start();
  const state = controller.getSnapshot();
  controller.dispose();
  return state;
}

test('the primary question surface has one labelled question and one start action without configuration forms', () => {
  const html = renderConsole(initialState(), { landing: true });
  assert.equal([...html.matchAll(/<form\b/g)].length, 1);
  assert.equal([...html.matchAll(/<textarea\b/g)].length, 1);
  assert.equal([...html.matchAll(/type="submit"/g)].length, 1);
  assert.match(html, /<label for="primary-question">Your scenario question<\/label>/);
  assert.match(html, /<textarea[^>]*id="primary-question"/);
  assert.match(html, />Start Simulation<\/button>/);
  assert.doesNotMatch(html, /<select\b|<fieldset\b|type="(?:checkbox|number)"/);
  assert.doesNotMatch(html, /Save experiment|Prepare current snapshot|Run stakeholder exploration|Export future agent input/);
});

test('busy phases disable the sole submission while exposing cancellation', () => {
  for (const phase of ['interpreting', 'preparing', 'executing'] as const) {
    const html = renderConsole({ ...initialState(), phase });
    const submit = html.match(/<button[^>]*type="submit"[^>]*>/)?.[0];
    assert.ok(submit, phase);
    assert.match(submit, /disabled=""/, phase);
    assert.match(html, />Cancel<\/button>/, phase);
    assert.match(html, /role="status"/, phase);
  }
});

test('unsupported tax questions report preparation without recording synthetic interactions', async () => {
  const state = await terminalState('What happens if Singapore increases tax on imported goods?');
  assert.equal(state.phase, 'unsupported');
  assert.equal(state.run, null);
  const html = renderConsole(state, { report: true });
  assert.match(html, /Preparation summary/);
  assert.match(html, /Not simulated/);
  assert.match(html, /No supported execution engine for this question yet/);
  assert.match(html, /International and cross-border relevance/);
  assert.doesNotMatch(html, /class="question-events"|Recorded exploration report|Recorded interactions/);
  assert.doesNotMatch(html, /<form\b|type="submit"/);
});

test('local clinic reports do not manufacture international effects or stakeholder turns', async () => {
  const state = await terminalState('What if a new polyclinic opened in Sengkang?');
  assert.equal(state.scope?.scope, 'local');
  const html = renderConsole(state, { report: true });
  assert.match(html, /Within Singapore/);
  assert.match(html, /No stakeholder turns, healthcare outcomes or economic effects were simulated/);
  assert.doesNotMatch(html, /International and cross-border relevance|class="question-events"|Recorded interactions/);
});

test('recorded ASEAN turns carry synthetic disclosures and retain the recorded question', async () => {
  const state = await terminalState(aseanQuestion);
  assert.equal(state.run?.status, 'completed');
  const html = renderConsole(state, { report: true });
  assert.match(html, /Recorded exploration report/);
  assert.match(html, /Deterministic fictional stakeholder script/);
  assert.match(html, /Not live AI, observed public opinion or a validated forecast/);
  assert.match(html, /class="question-events"/);
  assert.equal([...html.matchAll(/data-event-id=/g)].length, state.run!.events.length);
  assert.match(html, /What if Singapore leaves ASEAN\?/);
  assert.match(html, /historical replay checked/);
});

test('a report for a newly edited question cannot display prior ASEAN turns as current outcomes', async () => {
  const previous = await terminalState(aseanQuestion);
  const html = renderConsole(previous, { question: 'What if a new polyclinic opened in Sengkang?', report: true });
  assert.doesNotMatch(html, /class="question-events"|Recorded exploration report/);
  assert.doesNotMatch(html, /International and cross-border relevance/);
});

test('hostile questions remain escaped text in the primary form and report', () => {
  const question = '<img src=x onerror="globalThis.questionXss=1">';
  const state = initialState(question);
  for (const report of [false, true]) {
    const html = renderConsole(state, { report });
    assert.match(html, /&lt;img src=x onerror=&quot;globalThis.questionXss=1&quot;&gt;/);
    assert.doesNotMatch(html, /<(?:img|script|iframe)\b/i);
  }
});
