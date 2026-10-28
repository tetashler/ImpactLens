import { randomUUID } from 'node:crypto';
import { EVIDENCE_LIMITS, parseResearchRequest } from '../../evidence/contract.ts';
import type { ResearchResponseV1 } from '../../evidence/types.ts';
import { createReplayEvidence } from './replay.ts';

const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
function error(status: number, message: string) { return Response.json({ error: message }, { status, headers }); }
class BodyTooLarge extends Error {}
async function boundedJson(request: Request): Promise<unknown> {
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > EVIDENCE_LIMITS.bodyBytes)) throw new BodyTooLarge();
  if (!request.body) throw new Error('No body');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > EVIDENCE_LIMITS.bodyBytes) { await reader.cancel(); throw new BodyTooLarge(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(joined));
}
export async function handleEvidenceResearch(request: Request): Promise<Response> {
  if (request.method !== 'POST') return error(405, 'Use POST to request evidence research.');
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '')) return error(415, 'Send a JSON research request.');
  let input;
  try { input = parseResearchRequest(await boundedJson(request)); }
  catch (cause) { return cause instanceof BodyTooLarge ? error(413, 'The research request is too large.') : error(400, 'The research request is invalid.'); }
  try {
    const researchAttemptId = `research-${randomUUID()}`;
    const evidence = await createReplayEvidence({ scenarioIdentity: input.scenarioIdentity, researchAttemptId, question: input.question, topic: input.topic });
    const response: ResearchResponseV1 = { version: 1, clientRequestId: input.clientRequestId, scenarioIdentity: input.scenarioIdentity, researchAttemptId, evidence };
    return Response.json(response, { headers });
  } catch { return error(500, 'Evidence research is unavailable. Please retry.'); }
}
