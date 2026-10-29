/** Server-only, optional retrieval. One fixed-endpoint request; source URLs are never fetched. */
import process from 'node:process';
import { canonicalGroundingUrl, createGroundingBundle, groundingContentId, GROUNDING_LIMITS, type GroundingBundle, type GroundingSource } from '../../grounding/contract.ts';

export interface TavilyGroundingDependencies { key?: string; fetcher?: typeof fetch; now?: () => Date; timeoutMs?: number }
const ENDPOINT = 'https://api.tavily.com/search';
const MAX_BYTES = 128 * 1024;
const LIMITATION = 'Retrieved candidates are unverified source excerpts. Retrieval and exact quotation do not establish truth, applicability, or semantic entailment.';
const RANKING_LIMITATION = 'Public institutional domain suffixes are shown first as a presentation heuristic, not verification of authority, reliability, relevance, or source claims. Other publishers remain eligible; provider order is retained within each group.';
const institutionalDomainHint = (hostname: string): boolean => /(?:^|\.)(?:gov|edu)(?:\.[a-z]{2})?$|(?:^|\.)ac\.[a-z]{2}$|(?:^|\.)int$/i.test(hostname);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const abortError = () => new DOMException('Grounding retrieval cancelled.', 'AbortError');
function cleanText(value: unknown, maximum: number): string | null {
  if (typeof value !== 'string') return null;
  const result = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, maximum);
  return result || null;
}
function sourcesFrom(value: unknown, retrievedAt: string): GroundingSource[] {
  if (!object(value) || !Array.isArray(value.results)) throw new Error('Invalid retrieval response.');
  const sources: GroundingSource[] = []; const seen = new Set<string>();
  for (const result of value.results) {
    if (sources.length >= GROUNDING_LIMITS.sources) break;
    if (!object(result)) continue;
    let url: string;
    try { url = canonicalGroundingUrl(result.url); } catch { continue; }
    const title = cleanText(result.title, GROUNDING_LIMITS.title);
    const content = cleanText(result.content, GROUNDING_LIMITS.passage);
    if (!title || !content || seen.has(url)) continue;
    seen.add(url);
    const published = typeof result.published_date === 'string' && result.published_date.length <= 100 ? Date.parse(result.published_date) : NaN;
    sources.push({ id: groundingContentId('s', url), title, url, publisher: new URL(url).hostname, publishedAt: Number.isFinite(published) ? new Date(published).toISOString() : null, retrievedAt, passages: [{ id: groundingContentId('p', content), text: content }] });
  }
  // Rank only accepted candidates, without country restrictions or an allowlist.
  return sources.map((source, index) => ({ source, index, hint: Number(institutionalDomainHint(source.publisher)) }))
    .sort((a, b) => b.hint - a.hint || a.index - b.index).map(candidate => candidate.source);
}
async function boundedJson(response: Response, signal: AbortSignal): Promise<unknown> {
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)) { void response.body?.cancel().catch(() => {}); throw new Error('Response too large.'); }
  if (!response.body) throw new Error('Missing response.');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) { cancel(); throw new Error('Response too large.'); }
      chunks.push(value);
    }
  } finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
  const joined = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(joined));
}

export async function retrieveTavilyGrounding(question: string, signal?: AbortSignal, dependencies: TavilyGroundingDependencies = {}): Promise<GroundingBundle> {
  if (signal?.aborted) throw abortError();
  const query = typeof question === 'string' ? question.trim() : '';
  if (!query || query.length > GROUNDING_LIMITS.query || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(query)) throw new Error('Grounding question must contain 1 to 500 characters.');
  const retrievedAt = (dependencies.now ?? (() => new Date()))().toISOString();
  const key = (dependencies.key ?? process.env.TAVILY_API_KEY ?? '').trim();
  const make = (status: GroundingBundle['status'], sources: GroundingSource[], limitations: string[], searches: number, credits: number | null) => createGroundingBundle({ status, query, retrievedAt, sources, limitations, usage: { searches, credits } });
  if (!key) return make('not-configured', [], ['Optional web grounding is not configured.', LIMITATION], 0, null);
  const controller = new AbortController(); let timedOut = false; let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const deadline = Number.isFinite(dependencies.timeoutMs) ? Math.max(1, Math.min(10_000, dependencies.timeoutMs!)) : 10_000;
  let credits: number | null = null;
  try {
    const stopped = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => reject(abortError()), { once: true });
      timer = setTimeout(() => { timedOut = true; controller.abort(); }, deadline);
    });
    const request = (async () => {
      controller.signal.throwIfAborted();
      const response = await (dependencies.fetcher ?? fetch)(ENDPOINT, { method: 'POST', redirect: 'error', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ query, search_depth: 'basic', chunks_per_source: 1, max_results: GROUNDING_LIMITS.sources, topic: 'general', include_answer: false, include_raw_content: false, include_images: false, include_image_descriptions: false, include_favicon: false, auto_parameters: false, include_published_date: true, include_usage: true }) });
      controller.signal.throwIfAborted();
      if (!response.ok || response.redirected || response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') { void response.body?.cancel().catch(() => {}); throw new Error('Retrieval unavailable.'); }
      const data = await boundedJson(response, controller.signal);
      controller.signal.throwIfAborted();
      if (object(data) && object(data.usage) && typeof data.usage.credits === 'number' && Number.isFinite(data.usage.credits) && data.usage.credits >= 0 && data.usage.credits <= 100) credits = data.usage.credits;
      return sourcesFrom(data, retrievedAt);
    })();
    const sources = await Promise.race([request, stopped]);
    if (signal?.aborted) throw abortError();
    return make('retrieved', sources, [LIMITATION, RANKING_LIMITATION, ...(sources.length === 0 ? ['No usable source excerpts were returned.'] : [])], 1, credits);
  } catch {
    if (signal?.aborted) throw abortError();
    return make('failed', [], [timedOut ? 'Optional web grounding timed out.' : 'Optional web grounding is unavailable.', LIMITATION], 1, credits);
  } finally { if (timer !== undefined) clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
}
