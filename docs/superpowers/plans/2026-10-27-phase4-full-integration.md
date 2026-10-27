# Phase 4 Full Integration Plan

**Goal:** Connect the current MRT proposal to weighted demographic results and profiles while retaining an explicitly separate illustrative city.

**Architecture:** Reuse the existing MRT baseline/service and Phase 4C engine on the Node side. A small versioned companion HTTP envelope validates the unchanged v1 citizen payload and extended metrics. A dedicated impact panel retains one comparison-bearing result; baseline/scenario is presentation state, never a recalculation. Calculated citizens remain profile-only. The existing fixture renderer/import/playback stays in a distinct labelled mode with the editable proposal hidden.

**Spec:** User's Phase 4B + 4C full integration brief. Main implementation is explicitly authorised; no Gemini, eldercare, infrastructure or schema-v1 redesign.

## Checkpoints and constraints

- Both original inputs started at `98c91d6`; working changes audited by hashes and credential checks.
- Phase 4B: `2a99dbb`, 97 tests/build pass. Phase 4C: `b87db99`, 104 tests/build/explicit types pass.
- Merge: `7b7f33d`, no conflicts; 117 tests/build pass; Three.js lockfile retained.
- Keep source datasets, population/routing algorithms, shared v1 definitions and environment files unchanged.
- API supports only the existing declared CCK destination-distribution preset: NS4 origins, destination shares NE16 50%, NS4/NS5 25% each. Participation is explicit/configurable. No inferred home coordinates or arbitrary demand uploads.
- Bound JSON body to 16 KiB, population to 500–5,000, visual/profile sample to 0–150, threshold to 0–180 minutes; retain at most two profile runs for ten minutes. No raw graph/population response.
- Request identity is SHA-256 over canonical sorted-key JSON (ordered arrays retained). Validate echoed request, hash, service date/intervention and engine run identity. Same name/ID alone is never sufficient.
- Preserve existing dark map palette, Segoe type and compact panel layout; use accessible labelled tables and responsive stacked metric rows, with teal for calculated changes and coral for illustrative warnings. No redesign or new chart dependency.

## Tasks

1. Write failing integration tests for bounded requests, response/core-metric/extended-denominator validation, run-bound profile lookup, cache expiry, real engine determinism/change/sample invariance, absent animations, and revision-gated late responses.
2. Add `lib/impact/api-contract.ts`, `lib/impact/lifecycle.ts`, `lib/server/impact-api-service.ts`, `app/api/impact/route.ts`, `app/api/impact/profile/route.ts`. Reuse the actual engine and existing proposal validator/baseline; expose baseline access without changing its algorithm.
3. Add `components/impact-panel.tsx` and scoped CSS; narrowly update workspace wiring. Preserve MRT editor/illustrative controls, show full weighted metrics by age/area/sex and run-bound profiles. Clear/hide results immediately when proposal/date/settings change, abort requests and revision-check before accepting outcomes/profiles.
4. Run all required CLI commands, complete suite, app/explicit TypeScript and production build. Review adapters independently; reproduce/fix blockers with tests.
5. Use Playwright MCP for original MRT edit/rerun, calculated report/profile/edit/rerun, animation playback/selection/view switching, invalid input and delayed-response rejection, desktop/mobile overflow and console checks. Measure only observed latency/frame data.
6. Document architecture, limits, denominator semantics, exact reproduction and rebuild steps in `docs/PHASE4_FULL_INTEGRATION.md`. Update the roadmap: combined local workflow complete, full Phase 4 geographic visual/quantitative agreement only partially met because calculated profiles have no justified paths.
7. Audit staged contents and environment hashes, commit integration, fast-forward the clean feature branch and verify both worktrees/branches and secret exclusions. No push.

## Review focus

- Stale proposal/configuration results and profile races, including edits while requests are delayed.
- Sample versus full-population denominators; extended metrics stay outside strict v1 and reconcile to it.
- Result identity at every server/client boundary, including unknown/expired/cross-run profiles.
- No accidental fixture path/selected profile leakage into calculated mode, including map overlays/fallbacks.
- No growing cache, unbounded body/agent/route work, raw data serialization or secret changes.
