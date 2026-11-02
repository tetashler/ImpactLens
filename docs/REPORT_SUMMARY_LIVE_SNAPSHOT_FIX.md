# Report summary while a simulation is running

Date: 2 November 2026

The MRT report could show “The run changed” when its background simulation was still adding accepted activity. The initial stakeholder execution can say `completed` while the simulation job remains `running`. The report's evidence hash correctly changed with the simulation, but the UI offered summary generation too early.

## Change

- A shared readiness check uses the coordinator job status when available. A paused or terminal job is stable even if older society metadata still says `simulating`. Historical read-only runs remain readable.
- While updating, the report explains that the user can wait or select **Pause to prepare summary**. It does not hash, look up, or generate a changing report. The graph also skips saved-summary lookups for changing runs.
- Pausing uses the existing explicit job control and retains the same run. After the pause settles, **Generate summary** becomes available. Pausing does not itself request AI generation.
- The server independently rejects a running report with HTTP 409 / `REPORT_RUNNING` before reading raw public discussion or invoking the report writer. Snapshot checks remain in place to reject changed evidence.
- Generation callbacks also reject a changed run, access token, or updating state. No automatic generation or retry was added.

## Verification

- 37 focused readiness, service, rendered UI, graph reader, and location-context integration tests passed.
- `npx tsc --noEmit` passed.
- Browser transition verification passed: a running report made no saved-summary reads; one explicit mocked pause enabled manual generation; one mocked writer request displayed all five sections; graph/report navigation reused the saved summary. No page errors occurred. The check used a retained MRT-shaped fixture, a fake access token, and intercepted simulation/report requests. It did not pause the user's real run, restart Explore, or invoke a paid model. Local check: `tmp/report-live-snapshot-fix/browser-check.py` and `result.json`.

The real-provider quality of the narrative is unchanged by this fix. These checks validate readiness, controls, cache reuse, and snapshot handling.
