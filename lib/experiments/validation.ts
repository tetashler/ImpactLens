/** Shared browser-safe primitives. Imported JSON is data, never an executable object. */
export function ensure(value: unknown, message = 'Invalid experiment data'): asserts value {
  if (!value) throw new Error(message);
}

export function object(value: unknown, fields: readonly string[], required: readonly string[] = fields): Record<string, unknown> {
  ensure(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected a plain data object');
  const proto = Object.getPrototypeOf(value);
  ensure(proto === Object.prototype || proto === null, 'Expected a plain data object');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  ensure(Reflect.ownKeys(value).every(key => typeof key === 'string' && fields.includes(key)
    && Object.hasOwn(descriptors[key], 'value') && descriptors[key].enumerable), 'Unknown field or accessor in data object');
  ensure(required.every(key => Object.hasOwn(value, key)), 'Missing required experiment field');
  return value as Record<string, unknown>;
}

export function text(value: unknown, max = 2000, allowEmpty = false): string {
  ensure(typeof value === 'string' && value.length <= max && (allowEmpty || value.trim().length > 0)
    && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value), 'Invalid or oversized experiment text');
  return value;
}

export function identifier(value: unknown): string {
  const result = text(value, 160);
  ensure(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(result), 'Invalid experiment identifier');
  return result;
}

export function timestamp(value: unknown): string {
  const result = text(value, 32);
  ensure(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(result)
    && Number.isFinite(Date.parse(result)) && new Date(result).toISOString() === result, 'Expected an ISO UTC timestamp');
  return result;
}

export function strings(value: unknown, maxItems = 20, maxText = 1000, unique = true): string[] {
  assertJsonData(value);
  ensure(Array.isArray(value) && value.length <= maxItems, 'Too many experiment values');
  const result = Array.from(value, item => text(item, maxText));
  ensure(!unique || new Set(result).size === result.length, 'Duplicate experiment values');
  return result;
}

export function freezeSnapshot<T>(value: T): T {
  const copy = structuredClone(value);
  function freeze(nested: unknown) {
    if (nested !== null && typeof nested === 'object') {
      for (const item of Object.values(nested)) freeze(item);
      Object.freeze(nested);
    }
  }
  freeze(copy);
  return copy;
}

/** Reject accessors/prototypes/cycles before a legacy geometry parser can read them. */
export function assertJsonData(value: unknown, ancestors = new Set<unknown>(), depth = 0): void {
  ensure(depth <= 20, 'Experiment data is nested too deeply');
  if (value === null || typeof value !== 'object') {
    ensure(value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)), 'Expected JSON data');
    return;
  }
  ensure(!ancestors.has(value), 'Cyclic experiment data');
  ancestors.add(value);
  if (Array.isArray(value)) {
    ensure(Object.getPrototypeOf(value) === Array.prototype && value.length <= 2000, 'Expected a bounded plain array');
    ensure(Reflect.ownKeys(value).length === value.length + 1, 'Sparse arrays or extra array properties are unsupported');
    for (let index = 0; index < value.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      ensure(descriptor && Object.hasOwn(descriptor, 'value'), 'Expected plain array data');
      assertJsonData(descriptor.value, ancestors, depth + 1);
    }
  } else {
    const keys = Reflect.ownKeys(value);
    ensure(keys.length <= 100, 'Too many object fields');
    const parsed = object(value, keys.filter((key): key is string => typeof key === 'string'));
    for (const item of Object.values(parsed)) assertJsonData(item, ancestors, depth + 1);
  }
  ancestors.delete(value);
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  ensure(value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)), 'Expected JSON-serialisable experiment data');
  return JSON.stringify(value);
}

export async function digest(prefix: string, value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(value));
  return `${prefix}${[...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function hash(value: unknown, prefix: string): string {
  const result = text(value, prefix.length + 64);
  ensure(result.startsWith(prefix) && /^[a-f0-9]{64}$/.test(result.slice(prefix.length)), 'Invalid full SHA-256 identity');
  return result;
}
