# Graph UX and report summary prototype — 2 November 2026

The reduced hackathon implementation is complete. Prototype verification passed with one disclosed interrupted report attempt. This is not full V7/citizen-grounded acceptance.

## Delivered

- Concise graph captions, fewer competing overview labels, and priority for selected/search matches. Full names remain searchable and inspectable.
- Plain-language node explanations before technical provenance, using existing permitted fields without inference on click.
- An explicit **Generate summary** action above the existing report, with Findings, Agreements, Disagreements, Concerns and Unknowns. Authenticated server generation uses bounded permitted inputs; saved output is tied to the run, input fingerprint and prompt/schema version. Viewing or reopening the report does not generate another summary.
- New entity planning offers concrete WhatsApp, Telegram, Instagram and Reddit service names with compatible communication styles. Generic placeholders are rejected for new communication declarations. Historical generic nodes retain their original identity; a service is not inferred retroactively.

The two visible Codex CLI workers used the same checkout, `gpt-6.1-sol`, high effort and the configured fast tier. Initial worker implementation took about seven minutes, excluding integration, checks, the later naming fix and live/browser verification. No worktrees or commits were created; pre-existing transport/admission work was preserved.

## Verification

| Check | Result |
|---|---|
| Final focused planner, graph and report checks | 142 passed, zero failures |
| Application TypeScript | Passed |
| Production build | Passed; build ID `3MIJ-rWnVeXaL-38Cc8CT` |
| Full suite before final naming/copy changes | 2,123 of 2,124 passed; existing cold-process admission test timed out under parallel load, then passed alone in approximately 53 seconds |
| Read-only code review | No Critical or Important findings reported |
| Offline backend/browser preflight | Passed with mocked inference |
| Real social inference | 30 calls, 30 accepted decisions, zero rejected |
| Fresh real report-only attempt | One successful response; no additional social calls |
| Local Chrome automation | Five summary sections, WhatsApp/Reddit labels and inspectors, keyboard selection, zoom and cached return to report passed; zero page errors |
| Accounting | Both hash-chain ledgers checked and authorities closed; no Tavily calls or automatic retries |

The real test used offline synthetic initialization and a v2 fixture containing 50 agents, followed by genuine DeepSeek inference through DigitalOcean. It stopped at the 30-decision cap, at tick 5 of 80. This is a partial simulation, not proof that every agent participated or that a full run completed. The expanded named-service planner schema has focused offline coverage; its real-provider initialization acceptance was not tested.

## Report retry and cost

The first report request ended before a response receipt was recorded. Its US$0.02 reservation remains explicitly uncertain. The user approved one fresh report-only attempt against the same retained run using new test authority. That attempt returned HTTP 200 in approximately 18 seconds and left zero outstanding reservation in its own ledger. The earlier uncertain reservation was not cleared or treated as free.

| Item | Reported cost (USD) |
|---|---:|
| 30 successful social calls | 0.010602662 |
| Successful fresh report call | 0.000308091 |
| Known reported total | **0.010910753** |
| Earlier interrupted request, separately uncertain | **0.020000000 reserved** |

No social simulation was restarted for the report retry or presentation checks. Reopening reused the saved summary without another writer request. No further paid calls are planned.

## Practical limits

The writer receives existing public aggregates and permitted summaries, not raw dialogue, memories, private membership or profiles. In this test it therefore could not establish substantive consensus, disagreements or the content of concerns. Its response explains that limitation instead of inventing agreement. The generated prose remains wordier and more technical than the intended final experience; this prototype verifies integration and safe reuse, not a completed MiroFish-quality narrative.

No dedicated evidence/citation or semantic claim validator was added. Existing access/privacy rules and ordinary output-shape checks remain. A six-chapter report, richer permitted discussion summaries, independent numerical/claim verification and broader graph redesign remain outside this prototype. Full V7/citizen-grounded acceptance is unverified.

## Evidence and implementation

- [Audited result](evidence/graph-report-prototype-20261102/audit.json)
- [Report screenshot](evidence/graph-report-prototype-20261102/report-1440x900.png)
- [Graph overview](evidence/graph-report-prototype-20261102/graph-1440x900.png)
- [WhatsApp inspector](evidence/graph-report-prototype-20261102/graph-whatsapp-1440x900.png)
- [Reddit inspector](evidence/graph-report-prototype-20261102/graph-reddit-1440x900.png)
- [Report implementation plan](../Presentation/Report_Display_and_ReportWriter_Research.md)
- [Graph implementation plan](../Presentation/Knowledge_Graph_and_Report_Improvement_Research.md)
- [Node explanations](../lib/knowledge-graph/node-summary.ts), [display labels](../lib/knowledge-graph/display.ts), [renderer](../lib/knowledge-graph/renderer.ts), [workspace](../components/knowledge-workspace.tsx)
- [Report component](../components/report-ai-summary.tsx), [input allowlist](../lib/report-summary/evidence.ts), [writer/cache](../lib/server/report-summary.ts), [authenticated route](../app/api/reports/summary/route.ts)
- [Named communication services](../lib/server/inference/named-communication.ts), [planner integration](../lib/server/inference/planner.ts)

Task-local logs, closed ledgers and browser results remain under ignored `tmp/graph-report-prototype-20261102`. The retained run's private access token was not copied into these documents or screenshot evidence.
