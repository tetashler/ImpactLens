# Detailed AI Report Implementation Plan

> **For agentic workers:** Use the approved shared checkout, exclusive file ownership, and focused test-first implementation. No worktrees or paid test requests.

**Goal:** Add a substantive, downloadable detailed report below the existing quick-read summary.

**Architecture:** A separate authenticated `/api/reports/detailed` endpoint reads a stable retained run and a larger server-only pack of eligible public statements. One structured completion produces six plain-text chapters, stored independently of quick summaries and graph narratives. UI generation/read/download state is isolated. The user subsequently approved automatic generation of both reports at simulation completion: quick summary first, then detailed report.

**Tech stack:** Existing Next.js route handlers, React, TypeScript, node:test, current configured inference transport, browser print-to-PDF and Markdown export. No new dependencies.

**Spec:** Approved design in conversation: preserve quick-read content, add six detailed chapters (assessment, impacts, perspectives, trade-offs, developments, next steps), roughly 1,000–1,500 words when evidence permits; fewer words for sparse evidence. Cache by stable evidence snapshot and prompt version.

## Global constraints

- Same checkout; preserve existing runs, credentials, ledger and quick-summary prompt/cache.
- Server resolves evidence and authenticates access; browser never supplies evidence or reads raw records.
- Public accepted statements only. No private groups, hidden/forwarded content, profiles or memories.
- Running snapshots cannot dispatch a report. Paused snapshots support manual generation; automatic generation is for finished jobs only.
- No automatic retries of failed paid requests; preserve manual retry and existing saved artifacts.
- PDF uses a clean print document; label the button clearly as print/save PDF.

## Shared interfaces and ownership

Coordinator owns `lib/report-detailed/contract.ts`, `lib/report-detailed/evidence.ts`, richer discussion extraction/access, integration wiring and browser checks.

Contract exports `DETAILED_REPORT_PROMPT_VERSION`, `DETAILED_REPORT_SECTION_KEYS`, `DETAILED_REPORT_LABELS`, `DetailedReportSections`, `DetailedReport`, `parseDetailedReportSections`, `parseDetailedReport`, `detailedReportSnapshotPayload(run:PublicExplore):string`.

Section keys: `assessment`, `impacts`, `perspectives`, `tradeoffs`, `developments`, `nextSteps`. Artifact: `{version:1,runId,snapshotKey,generatedAt,question,runStatus,sections}`. Each section is plain text, max 12,000 chars; total section JSON max 60,000 UTF-8 bytes. `detailedReportSnapshotPayload` deterministically serializes bounded detailed public evidence and the independent prompt version; excludes credentials and raw statements. Server hashes it with SHA-256; browser hashes the identical string.

Server worker owns `lib/server/report-detailed.ts`, `app/api/reports/detailed/route.ts`, and detailed-service tests. API GET returns `{snapshotKey,report:DetailedReport|null}`; POST accepts only `{runId,snapshotKey}` and returns `{report}`. Bearer token, Host/Origin check, no-store, bounds and safe errors follow existing summary conventions. Export service/generator/handler and snapshot key for tests. Injected dependencies `readSnapshot`, `readDiscussion`, `generate`, `storeDirectory`, `promptVersion`. Rich discussion helper: `readPublicDetailedReportDiscussion(runId,token,revision,tick)`.

UI worker owns `components/report-detailed.tsx`, `.css`, `lib/report-detailed/export.ts`, and detailed UI/export tests. Component `ReportDetailed({result,onPause,autoGenerate?:boolean}: {result:PublicExplore;onPause?:()=>void;autoGenerate?:boolean})`. Use GET on stable snapshots; explicit Generate when no artifact; stale handling; request cancellation; downloads only from parsed matching saved artifact. Print document escapes all text. The user-facing question is displayed as text, never interpreted HTML.

## Tasks

- [x] Coordinator: write failing contract/evidence tests; implement bounded identity and richer public extraction without changing quick-summary defaults. Preserve authenticated read-only access.
- [x] Server worker: test auth, GET no inference, running/stale rejection, deduplication, separate persistence, malformed output, prompt versioning and no retries; implement one-call detailed writer and route.
- [x] UI worker: test plain text, downloads/escaping, stable matching cache and running states; implement six chapters and PDF/Markdown exports.
- [x] Coordinator and automatic-generation worker: wire detailed section immediately below quick summary and above technical details. Integrate automatic completion flow; sequence calls and suppress paid automatic retry after navigation/reload in the same browser session.
- [x] Verify focused tests with bounded concurrency, TypeScript, mocked browser completion/generation/download/cache flow, quick-summary regression, narrow layout and print content. Do not rerun simulation or call a paid provider.

## Review focus

1. Completion versus initial-stage `completed`: authoritative job state gates generation.
2. Navigation/remounts and multiple components must not issue repeated report requests or silently retry a failed one.
3. The simulation may resume during generation: stale output is rejected, old snapshot never displayed as current.
4. Sparse or omitted discussion cannot support fabricated consensus, chronology, effects or private evidence.
5. Downloads must include every chapter and escape untrusted text without exposing access tokens or raw evidence packs.

The user has approved implementation and requested subagents. Proceed without another plan-approval step. No commit/push is part of this feature request unless separately requested.

## Execution notes

- Three scoped workers implemented the server, UI/export and automatic coordinator in this checkout. Integration review caught a Unicode question truncation mismatch; a failing regression was added and fixed by preserving the validated detailed-report question.
- The long report uses up to 64 eligible public statements at up to 1,600 characters each, a bounded UTF-8 source budget, and selected reply/time context. The quick pack remains at its original bounds and its prompt/cache identity are unchanged.
- Selected completed active runs, including retained completed runs missing reports, are eligible while the workspace is open. Running, paused, failed, cancelled, capacity/budget-limited and historical read-only runs do not auto-dispatch. Paused runs retain explicit generation controls.
- Automatic attempts are remembered in memory and sessionStorage before POST. This is a browser-session guard, not a global durable provider-attempt ledger. Server cache and in-flight deduplication handle ordinary reuse.
- Final focused verification: 88 tests passed, TypeScript passed, live unauthenticated route returned 403/no-store, and mocked Chrome checked completion on Map, sequential generation, exports, mobile width and saved reuse. No real simulation or paid inference was started.
