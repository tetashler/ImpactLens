# Readable discussion summaries repair

Date: 2 November 2026. The user reported that both the report and graph inspector still read like technical activity logs.

## Diagnosis

The retained polyclinic run has 50 participants, eight initial AI stakeholder statements, zero social AI calls and 30 skipped opportunities. `SOCIAL_LLM_ENABLED` was absent from `.env.local`; the remaining 1,560 events were rule-driven. Completing the simulated clock did not establish AI deliberation. Separately, the writer input intentionally omitted discussion content and supplied aggregates, so it could not explain the initial views or later substantive agreement. Graph summaries repeated metrics and methodological qualifications.

## Architecture and scope

Keep the retained run immutable. Enable the missing flag for future manually started runs, without automatically starting inference. Extract a small server-only pack of accepted public fictional statements from the exact authenticated run/revision; exclude private groups, private-channel messages, memories, profiles, failed/rule events and forwarded private content. No raw statements are returned in browser DTOs.

The existing single report-writing call receives that pack alongside the permitted public metrics. It writes five short, everyday-language sections plus bounded summaries for known graph node IDs. Initial remarks must be distinguished from AI follow-up discussion. Counts and position scores cannot establish consensus. The prompt/cache version changes so old aggregate-only prose is not reused. No new paid inference is performed during development.

Graph inspectors load the saved report artifact with an authenticated GET when opened. They never trigger inference. If no current artifact exists, a concise scenario-aware description explains what is available. Technical counts, classifications, provenance and timelines remain accessible under a collapsed details section.

## Ownership and verification

- [x] Evidence agent: pure bounded public-statement extraction; authenticated passive helper; strictly read-only society load; focused privacy, stale-state and persistence tests.
- [x] Graph agent: concise node descriptions, saved-summary GET hook, collapsed technical details, focused rendering/staleness tests.
- [x] Coordinator: report contract/generator/cache integration, explicit AI participation evidence, workspace wiring, environment flag, prompt-version invalidation and combined focused checks.
- [x] Coordinator: read-only review, TypeScript, source/runtime checks and production build. No paid simulation was started for verification.

No dedicated semantic evidence validator, new agent pipeline, per-node AI call, knowledge graph engine replacement, private-dialogue disclosure or healthcare outcome model is included.

## Completed verification

- **76 focused tests passed**, covering the writer, public input, source exclusions, immutable reads, graph cache identity, inspector rendering, prior graph behaviour, snapshot readers and origin handling.
- TypeScript passed. Production build passed with ID `Pr-wYpgzLuEgFEnRIoJaG`; compilation took 8.8 minutes. Existing dynamic-filesystem tracing warnings remain.
- Both subagents reviewed the combined implementation without remaining important findings. Stale source revisions return a reload-needed response before paid generation; unknown, duplicate and incomplete node references are rejected as ordinary output-shape checks.
- Reading the actual retained polyclinic run yielded **8 initial public statements, 0 public follow-up statements and 13 node contexts**. Archive/session files were hashed before and after; all bytes stayed unchanged. No source text or session token was copied into these notes.
- The running dev endpoint reports `modelEnabled: true` and `transcripts: false` after the missing switch was corrected. `.env.example` now documents both required live switches and the separate 30-social-call cap.
- Local Chrome UI verification passed with a **mocked writer**, not real inference: five report sections, closed technical details, saved Reddit narrative, keyboard expansion and report reuse; one mock writer POST, three saved reads, zero page errors and no other POSTs.
- Browser automation initially assumed a different archived-run selector and did not account for hidden native details or duplicate popup/sidebar renderings. The harness was corrected to follow the recorded-run UI and scope the inspector. These retries made no provider calls.
- No new real-provider narrative was generated. The revised model's prose quality still needs review when the user explicitly chooses Generate summary. Source extraction, output contract and UI reuse are verified; generated consensus is never inferred from counts alone.

Logs and explicitly mocked UI captures remain in `tmp/readable-discussion-summary-20261102/`. Published evidence captures, if linked below, are labelled as mocked UI verification rather than real model results.

- [Report presentation — mocked writer](evidence/readable-discussion-summary-20261102/report-ui-mocked-1440.png)
- [Graph inspector — mocked saved narrative](evidence/readable-discussion-summary-20261102/graph-ui-mocked-1440.png)
- [Browser verification receipt](evidence/readable-discussion-summary-20261102/browser-result.json)
- [Retained-source read-only audit](evidence/readable-discussion-summary-20261102/retained-source-audit.json)

## What the user does next

Refresh the application, reopen the existing polyclinic report and select **Generate summary**. The new prompt version invalidates the old aggregate-only summary. This uses the retained initial remarks and also saves the readable graph-node narratives; returning to Graph loads them without another writer call.

To obtain actual AI follow-up discussion, start a new simulation after the corrected environment is loaded. The previous completed rule-only run is not rewritten or resumed. Its 8 initial statements can be summarised, but it cannot retroactively supply a debate that never occurred.
