import test from 'node:test';
import assert from 'node:assert/strict';
import { readAiConfig, readAiAvailability } from '../../server/ai/config.ts';
import { AiError, createAiProvider } from '../../server/ai/provider.ts';
import type { AiConfig } from '../../server/ai/config.ts';
import type { StructuredRequest } from '../../server/ai/provider.ts';

const secret = 'private-test-key';
const config = (provider: 'gemini' | 'openrouter' = 'gemini'): AiConfig => ({ provider, model: provider === 'gemini' ? 'gemini-test' : 'vendor/model-test:free', apiKey: secret, timeoutMs: 1000, maxOutputTokens: 1000 });
const request = (): StructuredRequest => ({ name: 'proposal', schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false }, system: 'Use only supplied facts.', context: { number: 7 }, user: 'Explain.' });
const json = (value: unknown, status = 200) => Response.json(value, { status });
const geminiModel = () => json({ name: 'models/gemini-test', supportedGenerationMethods: ['generateContent'], outputTokenLimit: 8192 });
const routerModels = (parameters = ['structured_outputs', 'response_format']) => json({ data: [{ id: 'vendor/model-test:free', supported_parameters: parameters }] });
const geminiResult = (text = '{"ok":true}') => json({ candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP', index: 0 }], usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 4, totalTokenCount: 16 } });
const routerResult = (content = '{"ok":true}') => json({ id: 'gen-test', model: 'vendor/model-test:free', choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }], usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 } });
function fake(responses: Array<Response | (() => Promise<Response>)>, inspect?: (url: string, init: RequestInit, index: number) => void): typeof fetch {
  let index = 0;
  return (async (url: string | URL | Request, init: RequestInit = {}) => {
    const current = index++;
    inspect?.(String(url), init, current);
    const response = responses[current];
    assert.ok(response, `Unexpected upstream call ${current + 1}`);
    return typeof response === 'function' ? response() : response;
  }) as typeof fetch;
}
const code = (expected: string) => (error: unknown) => error instanceof AiError && error.code === expected;

test('configuration selects only the named provider key and requires an explicit model', () => {
  assert.equal(readAiConfig({ AI_PROVIDER: 'gemini', GEMINI_MODEL: 'models/gemini-test', GEMINI_API_KEY: secret }).model, 'gemini-test');
  assert.equal(readAiConfig({ AI_PROVIDER: 'openrouter', OPENROUTER_MODEL: 'vendor/model-test:free', OPENROUTER_API_KEY: secret, GEMINI_API_KEY: 'wrong' }).apiKey, secret);
  for (const env of [{}, { AI_PROVIDER: 'other' }, { AI_PROVIDER: 'gemini', GEMINI_API_KEY: secret }, { AI_PROVIDER: 'gemini', GEMINI_MODEL: 'gemini-test' }, { AI_PROVIDER: 'openrouter', OPENROUTER_MODEL: 'vendor/model', GEMINI_API_KEY: secret }]) {
    assert.throws(() => readAiConfig(env), code('AI_CONFIG'));
    assert.equal(readAiAvailability(env).available, false);
    assert.ok(!JSON.stringify(readAiAvailability(env)).includes(secret));
  }
  assert.deepEqual(readAiAvailability({ AI_PROVIDER: 'gemini', GEMINI_MODEL: 'gemini-test', GEMINI_API_KEY: secret }), { available: true, provider: 'gemini', model: 'gemini-test' });
});

test('configuration rejects URLs, ambiguous models, invalid keys, and unbounded controls', () => {
  for (const model of ['https://evil.example/model', '../gemini', 'gemini?key=secret', 'gemini/test']) {
    assert.throws(() => readAiConfig({ AI_PROVIDER: 'gemini', GEMINI_MODEL: model, GEMINI_API_KEY: secret }), code('AI_CONFIG'));
  }
  for (const model of ['https://evil.example/model', 'model', 'vendor/../model', 'vendor/model?x=1']) {
    assert.throws(() => readAiConfig({ AI_PROVIDER: 'openrouter', OPENROUTER_MODEL: model, OPENROUTER_API_KEY: secret }), code('AI_CONFIG'));
  }
  for (const patch of [{ AI_TIMEOUT_MS: '0' }, { AI_TIMEOUT_MS: '120001' }, { AI_TIMEOUT_MS: '1.5' }, { AI_MAX_OUTPUT_TOKENS: '0' }, { AI_MAX_OUTPUT_TOKENS: '16385' }, { GEMINI_API_KEY: 'key\nheader' }]) {
    assert.throws(() => readAiConfig({ AI_PROVIDER: 'gemini', GEMINI_MODEL: 'gemini-test', GEMINI_API_KEY: secret, ...patch }), code('AI_CONFIG'));
  }
});

test('Gemini authenticates metadata and uses documented REST structured JSON without putting keys in URLs', async () => {
  const provider = createAiProvider(config(), fake([geminiModel(), geminiResult()], (url, init, index) => {
    assert.equal(url, `https://generativelanguage.googleapis.com/v1beta/models/gemini-test${index === 1 ? ':generateContent' : ''}`);
    assert.equal(new Headers(init.headers).get('x-goog-api-key'), secret);
    assert.equal(init.redirect, 'error');
    if (index === 1) {
      const body = JSON.parse(String(init.body));
      assert.deepEqual(body.generationConfig.responseFormat, { text: { mimeType: 'APPLICATION_JSON', schema: request().schema } });
      assert.equal(body.generationConfig.maxOutputTokens, 1000);
      assert.equal(body.systemInstruction.parts[0].text, 'Use only supplied facts.');
      assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), { context: { number: 7 }, user: 'Explain.' });
    }
  }));
  assert.deepEqual(await provider.generate(request()), { value: { ok: true }, provider: 'gemini', model: 'gemini-test', usage: { inputTokens: 12, outputTokens: 4, totalTokens: 16 } });
});

test('OpenRouter requires explicit capability support and sends a strict schema with parameter routing', async () => {
  const provider = createAiProvider(config('openrouter'), fake([routerModels(), routerResult()], (url, init, index) => {
    assert.equal(url, `https://openrouter.ai/api/v1/${index === 0 ? 'models' : 'chat/completions'}`);
    assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${secret}`);
    if (index === 1) {
      const body = JSON.parse(String(init.body));
      assert.deepEqual(body.provider, { require_parameters: true, allow_fallbacks: false });
      assert.deepEqual(body.response_format, { type: 'json_schema', json_schema: { name: 'proposal', strict: true, schema: request().schema } });
      assert.equal(body.model, 'vendor/model-test:free');
      assert.equal(body.stream, false);
    }
  }));
  assert.deepEqual(await provider.generate(request()), { value: { ok: true }, provider: 'openrouter', model: 'vendor/model-test:free', usage: { inputTokens: 12, outputTokens: 4, totalTokens: 16 } });
});

test('unsupported or missing model capabilities prevent generation', async () => {
  for (const metadata of [json({ supportedGenerationMethods: ['embedContent'] }), json({})]) {
    await assert.rejects(createAiProvider(config(), fake([metadata])).generate(request()), code('AI_UNSUPPORTED_MODEL'));
  }
  for (const metadata of [routerModels(['response_format']), routerModels(['structured_outputs']), json({ data: [] })]) {
    await assert.rejects(createAiProvider(config('openrouter'), fake([metadata])).generate(request()), code('AI_UNSUPPORTED_MODEL'));
  }
});

test('malformed JSON, refusals, incomplete output, and malformed successful envelopes are rejected', async () => {
  for (const response of [geminiResult('not JSON'), json({ candidates: [] }), json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"ok":true}' }] } }] }), json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: {} }] } }] })]) {
    await assert.rejects(createAiProvider(config(), fake([geminiModel(), response])).generate(request()), code('AI_INVALID_RESPONSE'));
  }
  for (const response of [routerResult('```json\n{}\n```'), json({ error: { message: secret } }), json({ choices: [{ finish_reason: 'stop', message: { refusal: 'no', content: '{}' } }] }), json({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] })]) {
    await assert.rejects(createAiProvider(config('openrouter'), fake([routerModels(), response])).generate(request()), code('AI_INVALID_RESPONSE'));
  }
});

test('missing and invalid token counts stay null instead of becoming invented usage', async () => {
  const response = json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'internal' }, { text: '{}' }] } }], usageMetadata: { promptTokenCount: -1, candidatesTokenCount: '4', totalTokenCount: 1e20 } });
  assert.deepEqual((await createAiProvider(config(), fake([geminiModel(), response])).generate(request())).usage, { inputTokens: null, outputTokens: null, totalTokens: null });
});

test('rate limits and upstream errors are safe and never retried', async () => {
  for (const status of [400, 401, 403, 404, 429, 500]) {
    await assert.rejects(createAiProvider(config(), fake([geminiModel(), json({ error: { message: `secret=${secret}; prompt=private` } }, status)])).generate(request()), (error: unknown) => {
      assert.ok(error instanceof AiError);
      assert.equal(error.code, status === 429 ? 'AI_RATE_LIMIT' : 'AI_UPSTREAM');
      assert.ok(!error.message.includes(secret));
      assert.ok(!error.message.includes('private'));
      if (status === 400) assert.match(error.message, /schema|model/i);
      return true;
    });
  }
  await assert.rejects(createAiProvider(config(), fake([() => Promise.reject(new Error(secret))])).generate(request()), (error: unknown) => error instanceof AiError && !error.message.includes(secret));
});

test('one deadline covers capability discovery, generation, and response body reads', async () => {
  const cfg = { ...config(), timeoutMs: 25 };
  const never = () => new Promise<Response>(() => {});
  await assert.rejects(createAiProvider(cfg, fake([never])).generate(request()), code('AI_TIMEOUT'));
  await assert.rejects(createAiProvider(cfg, fake([() => new Promise(resolve => setTimeout(() => resolve(geminiModel()), 15)), never])).generate(request()), code('AI_TIMEOUT'));
  const body = new ReadableStream<Uint8Array>({ start() {} });
  await assert.rejects(createAiProvider(cfg, fake([geminiModel(), new Response(body)])).generate(request()), code('AI_TIMEOUT'));
});

test('caller cancellation prevents calls and interrupts ongoing generation', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(createAiProvider(config(), fake([])).generate({ ...request(), signal: controller.signal }), code('AI_CANCELLED'));
  const running = new AbortController();
  const result = createAiProvider(config(), fake([geminiModel(), () => { running.abort(); return new Promise(() => {}); }])).generate({ ...request(), signal: running.signal });
  await assert.rejects(result, code('AI_CANCELLED'));
});

test('input and upstream bodies have byte bounds, including model catalogue responses', async () => {
  await assert.rejects(createAiProvider(config(), fake([])).generate({ ...request(), context: 'a'.repeat(300_000) }), code('AI_REQUEST_TOO_LARGE'));
  await assert.rejects(createAiProvider(config(), fake([geminiModel(), new Response('a'.repeat(1_100_000))])).generate(request()), code('AI_INVALID_RESPONSE'));
  await assert.rejects(createAiProvider(config('openrouter'), fake([new Response('a'.repeat(8_500_000))])).generate(request()), code('AI_INVALID_RESPONSE'));
});
