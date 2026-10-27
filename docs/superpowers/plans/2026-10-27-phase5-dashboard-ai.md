# Phase 5 dashboard and AI implementation plan

**Goal:** Enhance the existing calculated-impact inspector with readable comparisons, optional Gemini/OpenRouter presentation decisions and grounded synthetic conversations.

**Architecture:** Keep Phase 4C calculations and v1 contracts unchanged. Resolve existing request/run IDs through the existing process-local cache. Two native-fetch provider adapters produce the same finite structured selections; server validators reject unexpected values. React renders numerical/profile facts through trusted metric/template lookups. A deterministic dashboard is always available.

**Constraints:** Work on master at a3b7d21 only. No Git mutations, Terminal 2 files, raw inputs, routing/aggregation algorithms, synthetic weights or .env.local changes. User's detailed Phase 5 brief authorises implementation; no additional design approval needed.

## Work units

- [x] Provider worker: configuration, fixed official API adapters, capability checks, bounded requests/timeouts/safe errors, mocked tests and placeholder .env.example.
- [x] Dashboard worker: authoritative metric mapping, labelled denominators, sorting/group inspection, accessible CSS/SVG charts and focused tests.
- [x] Inline: finite layout/explanation/chat schemas and render templates, run-cache lookup, bounded Node endpoints, concurrency/duplicate protection and lifecycle tests.
- [x] Inline: integrate dashboard/AI controls/chat into current impact inspector; invalidate on run/profile changes, preserve MRT/map/illustrative modes.
- [x] Independent read-only review, full 131-test regression plus new tests, CLI/TypeScript/build checks and Playwright desktop/narrow/no-key/mock-provider workflows.
- [x] Implementation report and central roadmap, retaining Phase 4 trajectory limitation and Phase 6 commitment. No paid tests in ordinary suites; clearly report any separately authorised minimal live check.

## Review focus

Reject browser-provided metrics/profiles/provider URLs; resolve server cache. Recheck run validity after generation. Unknown shares remain null. Treat questions, history and domain labels as untrusted. No generated numeric/text claims are rendered: all visible values/facts come from validated engine results and finite templates. Abort/identity-gate stale UI responses. Limit JSON, history, output and simultaneous provider calls; no automatic retries/fallback.
