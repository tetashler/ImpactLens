# Storage Fetch Admission Handoff Repair

2 November 2026. **Focused offline repair: PASS. Real-provider verification: NOT RUN.** This follows the failed smoke test; its report, authority, accepted prefix and application NULL-usage record are unchanged.

## Fix

The ordinary public service wraps fetch to enforce bounded storage admission. That wrapper lost the server-only `INFERENCE_ADMISSION_V1` capability, then appeared to the social transport as an explicit adapter. Explicit adapters correctly cannot inherit ambient process authority, so the guard rejected the first request without a prepared permit.

`lib/server/society/public-service.ts` now explicitly forwards the validated capability through this trusted storage wrapper. It preserves whether the original fetcher was omitted: process registration is permitted only for default fetch. An unrelated explicit adapter stays isolated. Storage and cancellation are checked before preparation; the existing storage check remains at fetch entry. The original preparation receipt is returned unchanged, preserving authoritative cancellation reconciliation.

No prompt, V7 prose validation, source permission, selection, population, MRT, memory, scheduler, journal format or historical policy changed. There is no new inference stage or retry. Existing closed authorities cannot authorise another run with the changed source.

## Evidence

The new public-path tests first reproduced two failures against the old code: explicit capability forwarding and default/process capability forwarding. Both now pass through actual `handlePublicExplore` → bounded storage → `handlePublicSocial` → production social transport.

Six new regressions cover:

- Explicit hook-bearing adapters reach prepared mocked social dispatch.
- Default fetch retains its process capability through storage wrapping.
- Unrelated explicit adapters do not inherit process authority.
- Invalid storage stops before preparation/native dispatch.
- Storage invalidation after preparation stops native dispatch and preserves receipt cleanup and authoritative zero usage.
- A managed 50/35 public coordinator job prepares two unique requests, dispatches and accepts two mocked responses, then stops at its two-call grant. Passive restoration dispatches nothing further.

| Executed gate | Result |
|---|---|
| Related network-blocked suite, including five new cases | 86/86 PASS; no failures/skips/cancellations |
| Separate managed coordinator case | 1/1 PASS; independently repeated |
| Total distinct targeted tests | **87/87 PASS** |
| Application TypeScript | PASS |
| Strict affected-module TypeScript | PASS |
| Existing 350-capacity public-job regression | PASS within the affected suite; mocked, not real inference |
| Four retained-prefix files plus 55 closed-authority pins | 59/59 unchanged |
| Whitespace | PASS |

One initial coordinator-test assertion referenced an ID field absent from the existing fixture's call summaries. It was corrected to capture actual wire-context IDs and still requires two distinct requests. The failed test log is retained; no production expectation or validator was relaxed.

For the requested fast scope, the complete Node suite, production rebuild, twenty-world historical replay and desktop cycle were **not rerun**. Their preceding results are historical evidence, not acceptance of this new source. A fresh production build and applicable admission gates are required before any future separately authorised live test. No actual DeepSeek compliance improvement is claimed.

## Changed files

- `lib/server/society/public-service.ts` — one import and the trusted wrapper repair.
- `lib/contracts/tests/storage-inference-admission.test.ts` — five public storage-path cases.
- `lib/contracts/tests/storage-inference-coordinator.test.ts` — managed 50/35 public-job case.
- This note and an appended development-roadmap entry.

Receipts and isolated synthetic fixtures: `tmp/storage-handoff-repair-20261102/`, including `red.log`, `green-edge.log`, `coordinator-green.log`, `verify-affected-node.json`, `verify-final-typescript-and-coordinator.json`, and `verify-focused-preservation.json`.

**Zero paid calls.** No closed ledger was reopened, no accepted history was edited, no source data was regenerated, and nothing was staged or committed. The earlier US$0.02 reservations and the failed smoke world's separate application placeholder remain unchanged. The deferred V7 factual-prose issue is outside this repair.
