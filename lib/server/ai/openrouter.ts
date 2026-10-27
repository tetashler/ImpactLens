import type { AiConfig } from './config.ts';
import type { AiResult, StructuredRequest } from './provider.ts';
import { AiError } from './errors.ts';
import { encodeInput, fetchJson, invalidResponse, object, parseOutput, tokenCount } from './http.ts';

export async function generateOpenRouter(config: AiConfig, request: StructuredRequest, fetcher: typeof fetch, signal: AbortSignal): Promise<AiResult> {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` };
  const catalogue = object(await fetchJson(fetcher, 'https://openrouter.ai/api/v1/models', { headers, signal }, true));
  const model = Array.isArray(catalogue.data) ? catalogue.data.map(object).find(item => item.id === config.model) : undefined;
  const supported = model?.supported_parameters;
  if (!Array.isArray(supported) || !supported.includes('structured_outputs') || !supported.includes('response_format')) {
    throw new AiError('The configured OpenRouter model does not advertise structured_outputs and response_format. Choose a model with both capabilities.', 'AI_UNSUPPORTED_MODEL', 503);
  }
  const body = encodeInput({
    model: config.model,
    messages: [{ role: 'system', content: request.system }, { role: 'user', content: encodeInput({ context: request.context, user: request.user }) }],
    response_format: { type: 'json_schema', json_schema: { name: request.name, strict: true, schema: request.schema } },
    provider: { require_parameters: true, allow_fallbacks: false },
    max_tokens: config.maxOutputTokens,
    stream: false,
  });
  const response = object(await fetchJson(fetcher, 'https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers, body, signal }));
  if (response.error || !Array.isArray(response.choices) || response.choices.length !== 1) throw invalidResponse();
  const choice = object(response.choices[0]);
  const message = object(choice.message);
  if (choice.finish_reason !== 'stop' || message.refusal || message.tool_calls) throw invalidResponse();
  const value = parseOutput(message.content);
  const usage = object(response.usage);
  return { value, provider: 'openrouter', model: config.model, usage: { inputTokens: tokenCount(usage.prompt_tokens), outputTokens: tokenCount(usage.completion_tokens), totalTokens: tokenCount(usage.total_tokens) } };
}
