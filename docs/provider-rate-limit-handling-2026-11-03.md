# Provider rate-limit handling repair (2026-11-03)

## Observed failure

Before the user-requested deletion, the latest saved 700-capacity run had stopped with `PROVIDER_RATE_LIMIT` / `AI_RATE_LIMIT` at tick 104 of 320. It contained 237 accepted decisions from 238 recorded attempts, with 462 admission calls remaining. These partial results were inspected for diagnosis and subsequently deleted at the user?s request. No running simulation jobs or live lease files were found during diagnosis.

The two reported report-endpoint access lines show HTTP 429, but their response bodies and reset headers were not retained. Their exact error codes cannot be reconstructed from those lines alone. The saved job and subsequent Explore message confirm that a provider rate limit occurred; they do not identify its exact quota or reset time. Actual social token usage and cost remain unknown in the saved accounting.

## Current behavior after requested cooldown removal

The user requested removal of the application cooldown after encountering the rate-limit message with 100 decision capacity and 50 agents. The shared credential cooldown, pre-dispatch blocker and invented 60-second fallback have been removed. An immediate explicit retry reaches the provider, including when an earlier response supplied a longer `Retry-After`.

- `fetchJson` reports actual upstream HTTP 429 responses with safe error text. It does not remember cooldowns, delay requests or automatically retry.
- Valid provider `Retry-After` seconds or HTTP dates are preserved as advisory metadata, bounded to 1-86,400 seconds. Missing or invalid headers produce no invented wait time.
- Report, graph-summary and Explore responses retain provider retry guidance. Cancellation and stale-response protections are unchanged.
- Every dispatched upstream 429 retains unknown usage unless the provider supplies usable accounting. The removed local block no longer creates zero-cost records. Existing admission controls still account for requests proven not dispatched.
- A provider-limited quick summary still defers the automatic detailed-report POST. Manual report generation remains available. This avoids cascading automatic calls and does not impose a timed block on explicit retries.
- No automatic paid retry, provider fallback, quota increase, simulation restart or decision-capacity change was added.

OpenRouter documents `Retry-After` as guidance for waiting before another request after rate limiting. [Official error-handling documentation](https://openrouter.ai/docs/api_reference/errors-and-debugging#retry-after-header).

## Future requests

The application no longer imposes a cooldown on explicit requests. Any displayed wait is guidance from an actual provider response. The user excluded recovery of saved partial results. No saved partial run was resumed, regenerated or recovered as part of this task. The user subsequently requested deletion of all saved simulations; that deletion is recorded below.

The provider can still reject requests with HTTP 429; removing the application cooldown does not change provider quotas. A 700-decision setting is an application capacity ceiling, not a guarantee that the upstream provider will admit that many requests.

## Verification of the earlier repair

- Red failures reproduced missing retry headers, repeated provider dispatch, and automatic detailed-report dispatch after a summary 429.
- **298 related regression tests passed**, covering transport errors, shared cooldowns, accounting, automatic reports/graph summaries, map interpretation, assumption approval, cancellation and admission deadlines.
- The existing status-isolation test now uses distinct fake credentials for independent 429 and 503 examples, so one example's intentional cooldown cannot contaminate another. Its final focused run passed **17/17**.
- TypeScript passed. Independent read-only review found no important issues in the reviewed cooldown, accounting, deferral or browser-error paths.
- Verification used offline/mock provider responses. No paid inference was run and the full repository suite was not repeated for this repair.
- Local logs: `tmp/provider-rate-limit-final-tests.log`, `tmp/provider-rate-limit-types.log`, `tmp/provider-rate-limit-transport-final.log`, and `tmp/provider-rate-limit-build.log`.

**Final production build passed**, including TypeScript, page generation and postbuild private-trace filtering: `npm.cmd run build -- --webpack`.

## Saved simulation deletion

At the user?s explicit request, all saved simulations, including partial simulations and their reports, were deleted from the three canonical stores: `accepted-private`, `social-sessions` and `session-store-v2` under `data/derived/agents`. This removed **484 files (1,576,933,962 bytes)**; the stores were verified empty after the development server restarted.

The source population datasets and census file were preserved with unchanged SHA-256 hashes. Application source, plot settings and experiment configuration were preserved. No partial simulation was recovered.

A local `NEXT_PUBLIC_RECORDED_RUNS_RESET` epoch triggers one-time removal of simulation history, legacy simulation data and associated automatic-report markers from browser local/session storage when the app loads. Its marker prevents repeated deletion of newly created simulations. The epoch is configured only in ignored `.env.local`; environments without this setting retain their normal behavior. Actual clearing in the user?s browser requires the updated app to load.

Deletion receipt: `tmp/clear-saved-simulations/deletion-receipt.json`. The restarted app returned HTTP 200. The browser reset has focused tests covering selective deletion, preserved settings, missing configuration and new simulations surviving subsequent loads.

## Cooldown removal verification

Regression tests first reproduced the unwanted local message and blocked second dispatch. After removal, 16 focused transport, HTTP, report, Explore and provider-guidance tests passed, including immediate retry dispatch and unknown usage on repeated upstream 429s. Another 36 transport, automatic-report and managed-job regression tests passed (52 focused/regression tests total). TypeScript passed. No paid inference was used. The unrestricted full-suite attempt exhausted available memory; a bounded full-suite attempt was also stopped during unrelated cold-process integration tests. Neither full-suite attempt completed, so no full-suite pass is claimed. Final regression and TypeScript results are recorded in `tmp/provider-no-local-cooldown-regressions.log` and `tmp/provider-no-local-cooldown-types.log`.

## API key replacement and development server restart

After the user replaced their API key, the running development server still inherited the previous key. The earlier maintenance restart had carried file-loaded credentials into the child process environment, which takes precedence over `.env.local`.

The app was restarted with file-defined environment variables removed from inherited startup values so Next.js reads the current local files. The server process was verified to contain the current configured key; the app returned HTTP 200. A metadata-only `GET /api/v1/key` authenticated the new key with HTTP 200. No planning request, paid inference, saved-simulation recovery or source-code change was needed for this correction. The old planning response was not retained, so its exact upstream error is still unconfirmed.

Safe local receipts: `tmp/api-key-reload/restart-receipt.json` and `tmp/api-key-reload/verification.json`. Neither receipt contains credentials. The local provider cooldown remains removed.
