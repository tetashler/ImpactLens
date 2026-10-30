/** Browser-safe retrieval data. Neither retrieval nor exact quotation verifies a claim. */
import {checkPlan,planGuard,planObject,planText} from '../dynamic-scenarios/diagnostics.ts';
export const GROUNDING_LIMITS = { query: 500, sources: 5, passagesPerSource: 1, passage: 800, title: 240, url: 2048, limitations: 8 } as const;
export interface GroundingPassage { id: string; text: string }
export interface GroundingSource { id: string; title: string; url: string; publisher: string; publishedAt: string | null; retrievedAt: string; passages: GroundingPassage[] }
export interface GroundingBundle {
  version: 1;
  bundleId: string;
  status: 'retrieved' | 'not-configured' | 'failed';
  query: string;
  retrievedAt: string;
  sources: GroundingSource[];
  limitations: string[];
  usage: { searches: number; credits: number | null };
}
export interface GroundingSupport { sourceId: string; passageId: string; quote: string }
const invalid = (): never => { throw new Error('Invalid grounding data.'); };
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return invalid();
  return value as Record<string, unknown>;
};
function exact(value: unknown, keys: string[]): Record<string, unknown> {
  const result = record(value);
  const descriptors = Object.getOwnPropertyDescriptors(result);
  if (Reflect.ownKeys(result).length !== keys.length || keys.some(key => !Object.hasOwn(result, key)) || Object.values(descriptors).some(d => !Object.hasOwn(d, 'value') || !d.enumerable)) return invalid();
  return result;
}
const text = (value: unknown, max: number): string => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) ? value : invalid();
const id = (value: unknown): string => typeof value === 'string' && /^[a-z][a-z0-9_-]{0,79}$/i.test(value) ? value : invalid();
function date(value: unknown): string {
  if (typeof value !== 'string' || value.length > 30 || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) return invalid();
  return value;
}
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max || Reflect.ownKeys(value).length !== value.length + 1) return invalid();
  for (let i = 0; i < value.length; i++) if (!Object.hasOwn(value, i) || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, i)!, 'value')) return invalid();
  return value;
}
function unique(values: string[]): void { if (new Set(values).size !== values.length) invalid(); }

/** Public HTTPS citation URLs only. This does not resolve DNS and never fetches a URL. */
export function canonicalGroundingUrl(value: unknown): string {
  const input = text(value, GROUNDING_LIMITS.url);
  let url: URL;
  try { url = new URL(input); } catch { return invalid(); }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
      !host.includes('.') || host.includes(':') || /^\d+(?:\.\d+)*$/.test(host) ||
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/.test(host) ||
      /(?:^|\.)(?:localhost|local|internal|lan|home|onion|invalid|test|example)$/.test(host) ||
      host === 'metadata.google.internal') return invalid();
  url.hostname = host;
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^(?:utm_.*|fbclid|gclid|dclid|msclkid)$/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  return url.href;
}

/** Stable content identity, not a signature or proof that the content is trustworthy. */
export function groundingContentId(prefix: string, content: string): string {
  let first = 2166136261; let second = 3335557771;
  for (let i = 0; i < content.length; i++) {
    first = Math.imul(first ^ content.charCodeAt(i), 16777619);
    second = Math.imul(second ^ content.charCodeAt(i), 2246822519);
  }
  return `${prefix}_${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
}
function bundleIdentity(bundle: Omit<GroundingBundle, 'version' | 'bundleId'>): string {
  return groundingContentId('g1', JSON.stringify({ status: bundle.status, query: bundle.query, sources: bundle.sources.map(source => ({ id: source.id, title: source.title, url: source.url, publisher: source.publisher, publishedAt: source.publishedAt, passages: source.passages.map(passage => ({ id: passage.id, text: passage.text })) })), limitations: bundle.limitations, usage: { searches: bundle.usage.searches, credits: bundle.usage.credits } }));
}
export function createGroundingBundle(input: Omit<GroundingBundle, 'version' | 'bundleId'>): GroundingBundle {
  // Canonical field construction also prevents caller property order affecting the identity.
  const candidate = { version: 1, bundleId: 'temporary', status: input.status, query: input.query, retrievedAt: input.retrievedAt, sources: input.sources, limitations: input.limitations, usage: input.usage };
  candidate.bundleId = bundleIdentity(input);
  return parseGroundingBundle(candidate);
}
export function parseGroundingBundle(input: unknown): GroundingBundle {
  const data = exact(input, ['version', 'bundleId', 'status', 'query', 'retrievedAt', 'sources', 'limitations', 'usage']);
  if (data.version !== 1 || typeof data.status !== 'string' || !['retrieved', 'not-configured', 'failed'].includes(data.status)) return invalid();
  const sources: GroundingSource[] = list(data.sources, GROUNDING_LIMITS.sources).map(inputSource => {
    const source = exact(inputSource, ['id', 'title', 'url', 'publisher', 'publishedAt', 'retrievedAt', 'passages']);
    const url = canonicalGroundingUrl(source.url);
    if (url !== source.url || source.publisher !== new URL(url).hostname) return invalid();
    const passages = list(source.passages, GROUNDING_LIMITS.passagesPerSource).map(inputPassage => {
      const passage = exact(inputPassage, ['id', 'text']);
      return { id: id(passage.id), text: text(passage.text, GROUNDING_LIMITS.passage) };
    });
    if (passages.length === 0) return invalid();
    unique(passages.map(p => p.id));
    return { id: id(source.id), title: text(source.title, GROUNDING_LIMITS.title), url, publisher: text(source.publisher, 253), publishedAt: source.publishedAt === null ? null : date(source.publishedAt), retrievedAt: date(source.retrievedAt), passages };
  });
  unique(sources.map(source => source.id)); unique(sources.map(source => source.url));
  const usage = exact(data.usage, ['searches', 'credits']);
  if ((usage.searches !== 0 && usage.searches !== 1) || (usage.credits !== null && (typeof usage.credits !== 'number' || !Number.isFinite(usage.credits) || usage.credits < 0 || usage.credits > 100))) return invalid();
  const bundle: GroundingBundle = {
    version: 1, bundleId: id(data.bundleId), status: data.status as GroundingBundle['status'], query: text(data.query, GROUNDING_LIMITS.query), retrievedAt: date(data.retrievedAt), sources,
    limitations: list(data.limitations, GROUNDING_LIMITS.limitations).map(value => text(value, 500)), usage: { searches: usage.searches, credits: usage.credits as number | null },
  };
  if (bundle.status !== 'retrieved' && sources.length !== 0) return invalid();
  if (bundle.status === 'not-configured' && (bundle.usage.searches !== 0 || bundle.usage.credits !== null)) return invalid();
  if (bundle.bundleId !== bundleIdentity(bundle)) return invalid();
  return bundle;
}

/** Exact quotation checks provenance only; it does not establish truth or semantic entailment. */
export function parseGroundingSupport(input: unknown, inputBundle: GroundingBundle, path='draft.ontology'): GroundingSupport {
  const bundle = planGuard(path,()=>parseGroundingBundle(inputBundle));
  const data = planObject(input, ['sourceId', 'passageId', 'quote'],path);
  const readId=(field:'sourceId'|'passageId')=>{const v=planText(data[field],80,`${path}.${field}`);checkPlan(/^[a-z][a-z0-9_-]{0,79}$/i.test(v),'plan.invalid_identifier',`${path}.${field}`,v);return v;};
  const quote=planText(data.quote,GROUNDING_LIMITS.passage,`${path}.quote`);checkPlan(!/\u007f/.test(quote),'plan.invalid_text',`${path}.quote`,quote);
  const support={sourceId:readId('sourceId'),passageId:readId('passageId'),quote};
  const source=bundle.sources.find(source=>source.id===support.sourceId);
  checkPlan(source,'ontology.source_reference_unknown',`${path}.sourceId`,data.sourceId);
  const passage=source.passages.find(candidate=>candidate.id===support.passageId);
  checkPlan(passage,'ontology.source_passage_unknown',`${path}.passageId`,data.passageId);
  checkPlan(passage.text.includes(support.quote),'ontology.source_quote_not_found',`${path}.quote`,quote);
  return support;
}
