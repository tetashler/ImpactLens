# Inspectable report findings

New detailed reports retain the six narrative chapters and add structured findings above them. The existing report writer aims for three to five supported findings in its single completion. Sparse evidence can produce fewer; the report explains the shortfall instead of inventing support.

Each finding contains its text, support IDs, limitations and unresolved dependencies. **Why this finding?** opens the exact retained evidence used by that finding. The disclosure works with a mouse or keyboard. The same findings, IDs and evidence appear in Download Markdown and Print / Save as PDF.

## What the evidence means

| Label | What is inspectable | Interpretation boundary |
| --- | --- | --- |
| Calculated estimate | Aggregate metric, value, units, denominator and model assumptions | An estimate under assumptions, not an observed or causal outcome |
| Published claim | Retained passage, source and passage IDs, publisher, dates and source URL | An attributed source claim; neither independent verification nor proof that the finding follows |
| Hypothetical assumption | Scenario premise, assumption ID where available and review status | Approval permits a premise; it does not verify it |
| Rejected premise — unknown | Rejected assumption and review status | Rejection leaves the premise unknown and does not establish its opposite |
| Fictional discussion | Public statement excerpt, fictional speaker and phase | Not measured public opinion or real participant testimony |
| Unknown / model limitation | Relevant model or evidence gap | Identifies what the run cannot establish |

For healthcare questions, including a proposed polyclinic, the server adds an explicit finding that waiting-time improvements, service capacity and health effects remain uncalculated. Location, commute estimates and fictional discussion cannot substitute for a healthcare service model with demand, staffing and treatment capacity.

For example, a staffing constraint can cite a retained published passage, an approved hypothetical premise, a fictional statement, or several of these. The displayed labels and excerpts show which basis was actually selected. ID validation establishes traceability; readers must still review whether the cited material supports the interpretation.

## Generation and storage

1. Authenticate the retained run and confirm its snapshot is stable.
2. Read accepted public discussion through the existing public-thread filter. Replace internal event, node and reply identifiers with opaque references before passing it to the writer.
3. Build a server-owned evidence catalog from retained aggregate calculations, published passages, premises and public statements. No new source retrieval or simulation execution is added.
4. The writer returns six chapters plus findings selecting exact catalog IDs. It cannot supply its own evidence records.
5. Validate shape, bounds and references; reject unknown IDs and raw discussion identifier echoes. Assign finding IDs and retain only referenced catalog records. For healthcare questions reserve one of the five finding slots for the server-authored unknown.
6. Recheck snapshot stability and atomically save the report. Reopening a saved report requires no inference or discussion/source reads.

Bounds: five findings, six supports per finding, thirty selected evidence records, eighty catalog records / 100 KB, 900 characters per discussion excerpt and 800 per source passage. The existing writer ceiling remains 6,000 output tokens / 60 KB; the saved artifact ceiling is 180 KB including evidence. These bounds deliberately limit completeness. Excerpts and missing evidence must be interpreted accordingly.

Private profiles, memories, private groups, access tokens and raw discussion identifiers are not part of the selected evidence artifact. Public fictional roles and their public statements remain visible as context.

## Existing reports

- V1 reports remain readable and exportable. Their six original chapters are retained.
- An active matching V1 report offers **Generate evidence-linked update**. The action uses the current V2 snapshot identity and existing report-generation flow. Automatic preparation does not pay for a legacy upgrade.
- A successful explicit update replaces the active cached V1 artifact using the existing cache filename. A failed update leaves its bytes intact.
- Archived reports remain immutable and read-only. Their authenticated retained artifact identity is used without requiring the current evidence projector. They cannot be upgraded in place.
- New or regenerated reports use the V2 prompt/schema identity, so stale V1 or changed-run artifacts cannot masquerade as matching V2 results.

## Implementation map

- `lib/report-detailed/findings.ts`: browser-safe record types and strict validators.
- `lib/server/report-detailed-findings.ts`: catalog, selected-support assembly and healthcare unknown.
- `lib/server/report-detailed-discussion.ts`: writer input sanitization and raw-reference output guard.
- `lib/server/report-detailed.ts`: single writer completion, stable snapshot checks and persistence.
- `components/report-findings.tsx`: evidence labels and disclosures.
- `lib/report-detailed/export.ts`: Markdown and print evidence appendices.
- `lib/report-detailed/automatic.ts` and `lib/report-summary/saved.ts`: legacy and saved-report handling.

## Verification

Run the bounded offline regression selection:

```powershell
node --test --test-concurrency=2 lib/contracts/tests/report-*.test.ts lib/contracts/tests/automatic-reports.test.ts lib/contracts/tests/assumption-propagation.test.ts lib/contracts/tests/storage-archive-reports.test.ts lib/contracts/tests/storage-archive-readers.test.ts
node node_modules/typescript/bin/tsc --noEmit
npm run build -- --webpack
```

These checks cover shape/size limits, source and calculation identity, selected-only persistence, raw-ID echo rejection with no overwrite, stale snapshots, legacy upgrades, immutable archived reads, escaped exports and actual component rendering. Browser verification uses an offline public-only fixture rendered with the real components, including mouse and keyboard disclosure actions and the print document. No paid provider request or real simulation recovery is required. Model interpretation quality still needs human review; offline tests do not establish the factual faithfulness of future provider output.

Verified on 2026-11-07: **130/130 selected tests passed**, TypeScript passed, and the documented Webpack production build passed including private trace filtering. Production HTTP smoke returned 200 for the app and 403 / `no-store` for unauthenticated detailed-report access. The default Turbopack attempt hit an existing broken junction in an old ignored test fixture; no fixture or bundler configuration was changed to hide that failure.
