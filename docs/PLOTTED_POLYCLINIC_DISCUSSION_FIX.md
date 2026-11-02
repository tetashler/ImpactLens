# Plotted polyclinic discussion implementation plan

Date: 2 November 2026. User authorised implementation and parallel subagents.

Goal: Let “What if a polyclinic was built at this location?” start fictional stakeholder discussion when a point is plotted. No quantitative healthcare model is added.

Architecture: Keep the server's trusted map interpretation. Only a `new_polyclinic` review with `analysisMode: location-context` and an actual plotted location continues through the existing dynamic planning and ordinary fictional-society initialization. Reuse the original question, geometry, revision and attempt identity in one request. Preserve the review as optional public `locationContext`, separate from citizen/MRT grounding. No client-supplied review or new retry mode. Do not attach citizen selection, commute impact or citizen personalities.

Constraints: Same checkout, no worktrees/commits, preserve unrelated dirty work. Existing environment agent/admission limits apply. No paid inference or new dependencies for verification. Other interventions, MRT clarification, invalid geometry and unsupported numerical forecasts retain their current behaviour.

Ownership and checks:

- [x] Server agent: `lib/server/society/public-service.ts` and `lib/contracts/tests/hybrid-public-explore.test.ts`. Tested the failing plotted polyclinic path, ordinary society initialization, absence of citizen/impact calls, original request preservation, passive reads and duplicate protections.
- [x] Coordinator: `lib/society/public-contract.ts`, `lib/question-simulation/public-session.ts`, focused public location-context tests, and integration into `components/communication-report.tsx`. Retained context is validated against the original request; simultaneous citizen grounding is rejected. An actual report-render integration test covers the new display.
- [x] Report agent: new `components/location-discussion-context.tsx`, `lib/report-summary/evidence.ts`, new `lib/contracts/tests/location-discussion-report.test.ts`. Plain-language disclosure, safe location display, bounded writer input, unchanged cache identity for older runs without context.
- [x] Coordinator: focused mocked tests, TypeScript, production build and read-only review of the final diff. The user's dev server was left running.

Acceptance: A plotted polyclinic request reaches an ordinary 50-agent fictional society under the existing configured social-call allowance. Map location and qualitative limitations persist on reload and enter the permitted report evidence. Healthcare numbers and citizen grounding are absent. Existing MRT flow remains protected.

## Verification results

- New regressions were observed failing before implementation and passed afterward.
- 40 combined display, contract, report, snapshot-reader and clarification tests passed.
- The full public Explore integration file passed 12 tests, including existing MRT/citizen/replay and rejection paths. One additional production-style bounded-storage regression passed afterward. The four polyclinic-specific cases were then rerun together: 4 passed.
- The final copy adjustment passed all 9 map interface tests.
- Application TypeScript and `npm run build` passed. Build ID: `9HUDCRLpnUPuMUcS2XhJX`. The build emitted the existing dynamic-filesystem tracing warnings; it exited successfully. Production compilation took several minutes, as with the previous graph/report builds.
- Both subagents reviewed the combined changes without material findings. A minor outdated MRT-only review message was corrected.
- No new paid provider or Tavily calls were made. Tests used mocked inference; the local MRT regression computes real local fixture data without a provider.
- This fix has not been exercised in a new real-provider polyclinic run. It does not establish healthcare predictions, citizen-grounded acceptance or substantive narrative consensus.

Test logs remain under ignored `tmp/plotted-polyclinic-discussion-20261102/`.

## Running it

With the existing API configuration and `SOCIAL_SWARM_SIZE=50`, `SOCIAL_PROVIDER_MAX_CALLS=30`, restart the app if needed, plot the polyclinic site, and ask “What if a polyclinic was built at this location?” Click Explore once. The location-only interpretation now continues into fictional discussion. Open Report and use Generate summary for the AI-written overview. Planning, retrieval and report calls remain separate from the 30 social-call cap.

Both numeric settings were confirmed present in the user's `.env.local` during verification. Existing runs and earlier review attempts were not migrated or resumed by this fix; clicking Explore starts a fresh request with the new flow.

The continuation is deliberately limited to polyclinics. Other unsupported plotted facilities retain their existing review behaviour. Invalid or ambiguous geometry and unsupported quantitative forecast requests still stop for clarification.

## Follow-up: report request origin

The user confirmed Explore and graph generation worked, then encountered `Invalid request origin` when generating the report. This was reproduced on the running Next dev server: a same-origin request using browser Host `127.0.0.1:3000` was rejected because Next's internal request URL used `localhost:3000`.

`handleReportSummary` now uses the browser-facing Host with the request protocol, matching the existing Explore/AI boundaries. It does not trust forwarded-host headers. Two loopback-alias regression cases and hostile-origin/port/protocol cases were observed failing before the fix and passed afterward. All 23 focused report/display tests and TypeScript passed. Unauthenticated requests against the actual dev endpoint now reach authentication for both local names; a hostile origin remains rejected. No paid report call was made; the original origin rejection occurs before snapshot reading or generation. The retained simulation can be reused.
