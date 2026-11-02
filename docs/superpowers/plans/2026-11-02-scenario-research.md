# Scenario Research Implementation Plan

> **For agentic workers:** Use the testing and verification skills. Work in the existing checkout, preserve unrelated changes, and do not commit or push.

**Goal:** Research each new scenario within a hard 30 Tavily-credit ceiling, then reuse a source-linked initial briefing in planning, simulated decisions and generated reports.

**Architecture:** Extend the existing optional Tavily grounding step with bounded, scenario-dependent searches. Retain the resulting excerpts and research accounting in the immutable plan and public run. A deterministic briefing preserves source wording and separates published claims, assumptions and gaps; role-relevant excerpts are highlighted without claiming real participants received an announcement.

**Tech Stack:** Existing TypeScript/Node services, Next.js and node:test; no dependencies or extra inference calls.

**Spec:** User-approved recommendation in this conversation: broader scenario research; thirty credits maximum per simulation; stop early; common background plus role-relevant details; distinguish published information from fictional reactions; cache once with the run.

## Global Constraints

- 30 credits is a per-simulation maximum, not a target. Basic searches reserve one credit before dispatch; uncertain usage is not refunded or automatically retried.
- New searches happen only before planning. GET/status/report/graph operations never trigger research. Existing accepted runs remain readable.
- Support different scenario topics, not a fixed healthcare-only search plan. Location context must not erase explicitly foreign/cross-border scope.
- Preserve source URLs, excerpts and dates. Web claims remain attributed; do not invent proximity, service availability, prices, capacity or public sentiment.
- Research is a bounded optional stage under the existing request deadline. Keep partial useful results when a search fails or times out.
- Do not expose credentials, filesystem paths, private conversations or hidden profiles.
- No paid test requests or changes to retained real simulations. Verify with mock HTTP providers and isolated fixtures.

## Interfaces

- `retrieveScenarioResearch(question, locality, signal, dependencies): Promise<GroundingBundle>` replaces the single-search call in dynamic-service. Dependencies retain key/fetcher/timeouts; the ceiling is server-owned.
- GroundingBundle keeps version 1 and adds optional research metadata only for new research: version 1, budgetCredits 30, reservedCredits, stopReason and bounded query records. Existing bundles keep their original identities.
- Grounding limits permit at most 16 unique sources and 30 searches; each search still asks for at most five excerpts. Total response and planner input bounds remain enforced.
- `createResearchBriefing(bundle)` produces a bounded public DTO containing source excerpts, source links/dates, accounting, explicit initial-background assumption and research gaps.
- `PublicExplore.research` is optional. The original plan owns the briefing; readers, reports and graph summaries reuse it without retrieval.

## Review Focus

1. Duplicate/unknown/provider-failed requests cannot silently restart or exceed the search budget.
2. A long or multi-part question and plotted locality still produce relevant, bounded queries without changing jurisdiction.
3. Failed/empty/duplicate excerpts never masquerade as complete research or verified local services.
4. Old snapshots and deterministic replays keep their original shapes and hashes.
5. Every inference path actually receives permitted evidence; sharing background is not recorded as exposure or agreement.

## Task 1: Bounded retrieval and accounting

Files: `lib/server/evidence/scenario-research.ts`, `lib/server/evidence/tavily.ts`, `lib/grounding/contract.ts`, `lib/grounding/diagnostics.ts`; dedicated scenario-research tests.

- [x] Write failing tests for general/health/MRT queries, localization, 30-credit reservation, deduplication, stop-early, unknown usage, partial failures, cancellation and no-key behavior.
- [x] Implement the research coordinator and compatible optional metadata. Keep one-search helper behavior unchanged for existing callers.
- [x] Run new tests plus Tavily, query and grounding regressions.

## Task 2: Shared briefing, relevant evidence and reporting

Files: new `lib/grounding/briefing.ts`, society/stakeholder context builders and contracts, public projection, report and graph evidence projections; focused briefing tests.

- [x] Write failing tests showing full retained evidence reaches the initial stakeholders and relevant sources reach subsequent decisions.
- [x] Add the source-linked initial briefing and explicit shared-background assumption, preserving old run shapes.
- [x] Project the same briefing into report and graph inputs, with source claims separate from fictional dialogue.
- [x] Verify old/new snapshots, strict parsing, role relevance and privacy boundaries.

## Task 3: Service integration and review

Files: `lib/server/inference/dynamic-service.ts`, research documentation and integration tests.

- [x] Replace the single search with the bounded coordinator; keep attempted research attached to the generated plan.
- [x] Add a mocked integration check for one research phase and no further search during report preparation or continuations.
- [x] Document budget semantics, caching, assumptions, optional failure and limitations.
- [x] Run focused suites, TypeScript and the project suite with bounded test concurrency; review the final diff.

## Execution Notes

- The user approved the complete behavioral recommendation before this plan. Routine implementation decisions are resolved here without another approval round.
- Shared checkout is explicitly preferred in this conversation. Existing unrelated dirty files are preserved.
- Research completeness means query/source coverage only; it is never semantic verification or an exhaustive facility inventory.


## Verification record

- Final research/locality/briefing/planner/UI integration checks: 29 passed.
- Final TypeScript check: `npx tsc --noEmit` passed.
- Full project suite ran at bounded concurrency: 2,303 passed, 14 failed during concurrent implementation. Twelve failures involved source-fingerprint guards while files were changing; two revealed a missing optional field in the public response parser.
- After freezing all code and fixing the public parser, all eight affected guard files passed (183 tests), and both affected deep public-job cases passed individually, including the complete 350-decision job. MRT and polyclinic integration cases also passed.
- Review fixes cover UTF-8 planner limits with sixteen retained sources, middle-of-question country anchors, and plotted-location anchoring. Legacy identity and replay paths were preserved.
- No paid inference or Tavily requests were made. A fresh real-inference simulation remains the end-to-end output-quality acceptance check.
- No commit or push was requested for this change.
