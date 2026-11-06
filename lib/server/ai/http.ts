import { AiError } from './errors.ts';
import {providerRateLimitError} from './rate-limit.ts';

// A byte ceiling also bounds worst-case input tokens without adding a tokenizer.
export const INPUT_BYTE_LIMIT = 24_000;
export const OUTPUT_BYTE_LIMIT = 1_048_576;
const CATALOGUE_BYTE_LIMIT = 8_388_608;

export function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function encodeInput(value: unknown): string {
  let text: string;
  try { text = JSON.stringify(value); }
  catch { throw new AiError('AI input must be serializable JSON.', 'AI_INVALID_REQUEST', 400); }
  if (typeof text !== 'string') throw new AiError('AI input must be serializable JSON.', 'AI_INVALID_REQUEST', 400);
  if (Buffer.byteLength(text, 'utf8') > INPUT_BYTE_LIMIT) {
    throw new AiError('AI input is too large. Reduce the supplied context.', 'AI_REQUEST_TOO_LARGE', 413);
  }
  return text;
}

/** A single deadline surrounds discovery, generation, and body reads, even for injected fetchers. */
export async function withDeadline<T>(timeoutMs: number, caller: AbortSignal | undefined, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  if (caller?.aborted) throw new AiError('AI request was cancelled.', 'AI_CANCELLED', 499);
  const controller = new AbortController();
  let rejectAbort: (error: AiError) => void = () => {};
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const stop = (error: AiError) => { controller.abort(error); rejectAbort(error); };
  const cancel = () => stop(new AiError('AI request was cancelled.', 'AI_CANCELLED', 499));
  caller?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => stop(new AiError('AI request timed out. Try again later.', 'AI_TIMEOUT', 504)), timeoutMs);
  try {
    return await Promise.race([run(controller.signal), aborted]);
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    if (error instanceof AiError) throw error;
    throw new AiError('The AI provider could not be reached. Try again later.', 'AI_UPSTREAM', 502);
  } finally {
    clearTimeout(timer);
    caller?.removeEventListener('abort', cancel);
  }
}

function httpError(status: number): AiError {
  if (status === 402) return new AiError('The AI provider reports insufficient credits. Check the account billing or choose another configured model.', 'AI_CREDITS', 402);
  if (status === 429) return new AiError('The AI provider rate limit was reached. Try again later.', 'AI_RATE_LIMIT', 429);
  if (status === 400 || status === 422) return new AiError('The AI provider rejected the schema or request. Check the configured model supports this JSON Schema.', 'AI_UPSTREAM', 502);
  if (status === 401 || status === 403) return new AiError('The AI provider rejected server credentials or model access. Check the configured API key and account permissions.', 'AI_UPSTREAM', 502);
  if (status === 404) return new AiError('The configured AI model is unavailable. Choose a current model ID from the provider catalogue.', 'AI_UPSTREAM', 502);
  return new AiError('The AI provider request failed. Try again later.', 'AI_UPSTREAM', 502);
}

export async function fetchJson(fetcher: typeof fetch, url: string, init: RequestInit, catalogue = false): Promise<unknown> {
  const response = await fetcher(url, { ...init, redirect: 'error', cache: 'no-store' });
  if (!response.ok) {
    void response.body?.cancel().catch(() => {});
    throw response.status===429?providerRateLimitError(response.headers):httpError(response.status);
  }
  const limit = catalogue ? CATALOGUE_BYTE_LIMIT : OUTPUT_BYTE_LIMIT;
  const declared = response.headers.get('content-length');
  if (declared && Number(declared) > limit) {
    void response.body?.cancel().catch(() => {});
    throw invalidResponse();
  }
  if (!response.body) throw invalidResponse();
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  init.signal?.addEventListener('abort', cancel, { once: true });
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      if (init.signal?.aborted) throw init.signal.reason;
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { cancel(); throw invalidResponse(); }
      chunks.push(value);
    }
    if (init.signal?.aborted) throw init.signal.reason;
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { throw invalidResponse(); }
  } finally {
    init.signal?.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

export function invalidResponse(): AiError {
  return new AiError('The AI provider returned an invalid or incomplete response. Try again later.', 'AI_INVALID_RESPONSE', 502);
}

export function parseOutput(text: unknown): unknown {
  if (typeof text !== 'string' || !text.trim() || Buffer.byteLength(text, 'utf8') > OUTPUT_BYTE_LIMIT) throw invalidResponse();
  try { return JSON.parse(text); }
  catch { throw invalidResponse(); }
}

export function tokenCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000 ? value : null;
}
