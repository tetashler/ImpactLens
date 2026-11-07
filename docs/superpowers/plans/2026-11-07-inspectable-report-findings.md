# Inspectable detailed report findings

**Goal:** Add three to five important, traceable findings to new detailed reports, with inspectable public support, limitations/dependencies and the same references in Markdown/print exports.

**Architecture:** Preserve the six chapters and introduce a strict V2 artifact. Build a bounded public evidence catalog server-side from retained calculations, published excerpts, reviewed/stated assumptions and the existing authenticated public-discussion extractor. The report writer selects catalog IDs in its existing single call; server validation rejects unknown/duplicate references and persists only selected sanitized entries. Native disclosure controls open supporting evidence alongside each finding. References establish traceability, not proof that an interpretation is justified.

## Decisions and constraints

- Keep the user's uncommitted workspace-reduction changes intact. No mobile work, new retrieval/provider calls, saved-partial recovery, private environment edit, commit or push.
- Calculations retain units, denominators, scope and model assumptions. Published support requires an actual retained passage, not a title. Allowed assumptions stay hypothetical; rejected assumptions stay unknown and do not imply their opposite.
- Discussion support comes only from the existing public-thread filtering path. Generate opaque report-scoped event references; never expose raw actor/node/private event/reply IDs, profiles, private groups, memories or access capabilities.
- Aim for three to five supported findings. Sparse runs may honestly provide fewer with an evidence-sufficiency notice; do not fabricate conclusions to satisfy a count.
- Polyclinic/healthcare context receives a mandatory server-authored model-limitation finding: waiting-time improvement, capacity and health effects remain uncalculated without a service model. No claim that ID checks establish semantic faithfulness.
- V2 report identity includes a new prompt/schema version. Strict V1 parsing/read/export remains. Active matching V1 appears as a separate legacy artifact with an explicit upgrade action; automatic report preparation does not spend on a legacy upgrade. Archived reports remain immutable/read-only and return their retained artifact identity after authentication and manifest verification, without needing V2 evidence construction.
- Existing canonical cache filename is retained. Explicit generation can replace an active V1 report with V2; archived bytes are never rewritten. This is an implementation decision, not a new retention promise for active cache revisions.
- Model output is bounded to the existing 6,000-token / 60-KB transport budget; complete V2 artifacts have a deliberate 180-KB bound including selected evidence. Catalog and excerpt limits apply before prompting and persisting.

## Work packages

1. Evidence/validation: new browser-safe findings/evidence contracts, server catalog builder/assembler and focused privacy/reference/model-gap tests.
2. Backend/compatibility: V2 writer schema/prompt/service, selected-support persistence, stable snapshot checks, legacy active/archived reads and automatic-report upgrade suppression.
3. UI/exports: findings with evidence-type labels, limitations/dependencies and “Why this finding?” disclosures; escaped support records and IDs in existing Markdown/print exports; legacy notice and explicit upgrade control.
4. Verification: contract/schema/privacy/ID/unknown cases; legacy, stale and archived regressions; UI disclosure/browser checks with mock fixtures; TypeScript and production build. Keep generated test artifacts bounded and clean new passing fixtures.

Separate read-only evidence/privacy and cache-compatibility audits preceded implementation. Implementation will be reviewed independently after integration.

## Completion evidence — 2026-11-07

- [x] Strict V2 finding/evidence records, bounded public catalog, selected-only persistence and mandatory healthcare unknown.
- [x] Single writer call, known-ID schema and server validation, stable snapshot checks, raw discussion ID sanitization and output echo rejection.
- [x] Findings, evidence-type labels, limitations/dependencies and native accessible disclosures above the existing chapters; equivalent evidence in Markdown and print exports.
- [x] Active V1 reads, explicit upgrade with no overwrite on failure, suppression of automatic paid upgrades and immutable archived reads.
- [x] Independent final review: no confirmed remaining findings. Its initial privacy finding was repaired and covered by input-redaction and output-echo regressions.
- [x] Final bounded offline regression selection: **130/130 passed** (`tmp/report-findings-final-tests.log`). Includes detailed/quick report, automatic report, assumption propagation and archive compatibility tests.
- [x] TypeScript `--noEmit` passed. Documented deployment build `npm run build -- --webpack` passed, including page generation and private trace filtering (`tmp/report-findings-build-webpack.log`). The default Turbopack attempt encountered a pre-existing dangling junction inside an old ignored test fixture; that fixture was retained, and deployment bundler settings were not changed.
- [x] Desktop browser checks using actual components with an offline fixture: mouse open, keyboard Enter/Tab disclosure navigation, correct published/hypothetical/fictional labels, calculation denominator and print document references; no horizontal overflow at the checked desktop viewport. No mobile work.
- [x] Production HTTP smoke: root 200; unauthenticated detailed-report request 403 `REPORT_ACCESS`, `Cache-Control: no-store`. No paid inference, fresh retrieval or saved-partial recovery.

User/developer guide: `docs/INSPECTABLE_REPORT_FINDINGS.md`. Existing workspace-reduction changes remain uncommitted and untouched by this feature. No commit or push performed.
