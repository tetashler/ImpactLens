import { AiError } from './errors.ts';

// Preserve the Phase 5 process-wide key, including across separate route bundles/HMR.
const state = globalThis as typeof globalThis & { __impactAiPendingV1?: Set<string> };
const pending = state.__impactAiPendingV1 ??= new Set<string>();
/** Shared by presentation/chat and planning. No retries, queues or extra provider slots. */
export function acquireAiSlot(key: string): () => void {
  if (pending.has(key)) throw new AiError('This AI request is already running. Wait for its response.', 'AI_DUPLICATE', 409);
  if (pending.size >= 2) throw new AiError('Two AI requests are already running. Wait and try again.', 'AI_BUSY', 429);
  pending.add(key);
  let held = true;
  return () => { if (held) { pending.delete(key); held = false; } };
}
