import type { AiConfig } from './config.ts';
import { readAiConfig } from './config.ts';
import { AiError } from './errors.ts';
import { encodeInput, withDeadline } from './http.ts';
import { generateGemini } from './gemini.ts';
import { generateOpenRouter } from './openrouter.ts';
import { generateAnthropic } from './anthropic.ts';
export { AiError } from './errors.ts';
export type AiProviderName = 'gemini' | 'openrouter' | 'anthropic';
export interface StructuredRequest { name: string; schema: Record<string, unknown>; system: string; context: unknown; user: string; signal?: AbortSignal }
export interface AiResult { value: unknown; provider: AiProviderName; model: string; usage: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null } }

export function createAiProvider(config: AiConfig, fetcher: typeof fetch = fetch): { generate(request: StructuredRequest): Promise<AiResult> } {
  // Validate direct callers too; never allow model IDs to become URLs or headers.
  const prefix = config.provider === 'gemini' ? 'GEMINI' : config.provider === 'anthropic' ? 'ANTHROPIC' : 'OPENROUTER';
  const safeConfig = readAiConfig({ AI_PROVIDER: config.provider, [`${prefix}_MODEL`]: config.model, [`${prefix}_API_KEY`]: config.apiKey, AI_TIMEOUT_MS: String(config.timeoutMs), AI_MAX_OUTPUT_TOKENS: String(config.maxOutputTokens) });
  return {
    async generate(request) {
      return withDeadline(safeConfig.timeoutMs, request.signal, async signal => {
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(request.name) || !request.schema || typeof request.schema !== 'object' || Array.isArray(request.schema) || typeof request.system !== 'string' || typeof request.user !== 'string') {
          throw new AiError('AI request requires a schema, valid name, and text instructions.', 'AI_INVALID_REQUEST', 400);
        }
        encodeInput({ name: request.name, schema: request.schema, system: request.system, context: request.context, user: request.user });
        return safeConfig.provider === 'gemini'
          ? generateGemini(safeConfig, request, fetcher, signal)
          : safeConfig.provider === 'anthropic'
            ? generateAnthropic(safeConfig, request, fetcher, signal)
            : generateOpenRouter(safeConfig, request, fetcher, signal);
      });
    },
  };
}
