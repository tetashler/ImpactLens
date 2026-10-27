import type { AiConfig } from './config.ts';
import type { AiResult, StructuredRequest } from './provider.ts';
import { AiError } from './errors.ts';
import { encodeInput, fetchJson, invalidResponse, object, parseOutput, tokenCount } from './http.ts';

/** Native REST format verified against Google's v1beta discovery schema (2026-10-27). */
export async function generateGemini(config: AiConfig, request: StructuredRequest, fetcher: typeof fetch, signal: AbortSignal): Promise<AiResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}`;
  const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey };
  const metadata = object(await fetchJson(fetcher, url, { headers, signal }));
  if (!Array.isArray(metadata.supportedGenerationMethods) || !metadata.supportedGenerationMethods.includes('generateContent')) {
    throw new AiError('The configured Gemini model does not support generateContent. Choose a text model supporting structured JSON.', 'AI_UNSUPPORTED_MODEL', 503);
  }
  if (typeof metadata.outputTokenLimit === 'number' && metadata.outputTokenLimit < config.maxOutputTokens) {
    throw new AiError('AI_MAX_OUTPUT_TOKENS exceeds the configured Gemini model limit. Reduce it or select another model.', 'AI_UNSUPPORTED_MODEL', 503);
  }
  const body = encodeInput({
    systemInstruction: { parts: [{ text: request.system }] },
    contents: [{ role: 'user', parts: [{ text: encodeInput({ context: request.context, user: request.user }) }] }],
    generationConfig: {
      maxOutputTokens: config.maxOutputTokens,
      responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema: request.schema } },
    },
  });
  const response = object(await fetchJson(fetcher, `${url}:generateContent`, { method: 'POST', headers, body, signal }));
  if (response.error || !Array.isArray(response.candidates) || response.candidates.length !== 1) throw invalidResponse();
  const candidate = object(response.candidates[0]);
  const parts = object(candidate.content).parts;
  if (candidate.finishReason !== 'STOP' || !Array.isArray(parts)) throw invalidResponse();
  const outputParts = parts.map(object).filter(part => part.thought !== true);
  if (!outputParts.length || outputParts.some(part => typeof part.text !== 'string' || part.functionCall !== undefined)) throw invalidResponse();
  const value = parseOutput(outputParts.map(part => part.text).join(''));
  const usage = object(response.usageMetadata);
  return { value, provider: 'gemini', model: config.model, usage: { inputTokens: tokenCount(usage.promptTokenCount), outputTokens: tokenCount(usage.candidatesTokenCount), totalTokens: tokenCount(usage.totalTokenCount) } };
}
