import type { AiProviderName } from './provider.ts';
import { AiError } from './errors.ts';

export interface AiConfig {
  provider: AiProviderName;
  model: string;
  apiKey: string;
  timeoutMs: number;
  maxOutputTokens: number;
}

function boundedInteger(raw: string | undefined, fallback: number, max: number, variable: string): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < 1 || Number(raw) > max) {
    throw new AiError(`${variable} must be an integer between 1 and ${max}.`, 'AI_CONFIG', 503);
  }
  return Number(raw);
}

/** Server-side environment only. No default provider or model, and no key-based guessing. */
export function readAiConfig(env: Record<string, string | undefined> = process.env): AiConfig {
  const provider = env.AI_PROVIDER?.trim();
  if (provider !== 'gemini' && provider !== 'openrouter') {
    throw new AiError('Set AI_PROVIDER to gemini or openrouter to enable AI.', 'AI_CONFIG', 503);
  }
  const prefix = provider === 'gemini' ? 'GEMINI' : 'OPENROUTER';
  const rawModel = env[`${prefix}_MODEL`]?.trim() ?? '';
  const model = provider === 'gemini' ? rawModel.replace(/^models\//, '') : rawModel;
  const pattern = provider === 'gemini' ? /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/ : /^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;
  if (!pattern.test(model) || model.length > 256 || model.includes('..')) {
    throw new AiError(`Set ${prefix}_MODEL to an explicit valid model ID from the provider catalogue.`, 'AI_CONFIG', 503);
  }
  const apiKey = env[`${prefix}_API_KEY`]?.trim() ?? '';
  if (!apiKey || apiKey.length > 1024 || /[^\x21-\x7e]/.test(apiKey)) {
    throw new AiError(`Set ${prefix}_API_KEY on the server to enable the selected provider.`, 'AI_CONFIG', 503);
  }
  return {
    provider, model, apiKey,
    timeoutMs: boundedInteger(env.AI_TIMEOUT_MS, 30_000, 120_000, 'AI_TIMEOUT_MS'),
    maxOutputTokens: boundedInteger(env.AI_MAX_OUTPUT_TOKENS, 4096, 16_384, 'AI_MAX_OUTPUT_TOKENS'),
  };
}

export type AiAvailability = { available: true; provider: AiProviderName; model: string } | { available: false; reason: string };

/** Local configuration status only; this makes no network calls or capability claims. */
export function readAiAvailability(env: Record<string, string | undefined> = process.env): AiAvailability {
  try {
    const { provider, model } = readAiConfig(env);
    return { available: true, provider, model };
  } catch (error) {
    return { available: false, reason: error instanceof AiError ? error.message : 'AI configuration is unavailable.' };
  }
}
