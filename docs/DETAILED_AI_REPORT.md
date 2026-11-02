# Detailed AI report

The Report page keeps its existing quick-read summary and adds a separate **Detailed AI report** below it, before technical methodology.

The detailed writer produces six readable chapters: overall assessment, calculated impacts, stakeholder perspectives, agreements and trade-offs, discussion developments, and open questions/next steps. It aims for 1,000–1,500 words where the evidence supports that depth; missing evidence must not be padded with invented arguments or outcomes.

## Generation

While the workspace is open, a selected completed simulation checks for both saved reports. Missing reports generate in order: quick summary, then detailed report. Initial stakeholder execution saying `completed` is insufficient; the background job must have finished. Existing saved outputs are reused.

At completion, the report panels immediately show preparation, writing and saved-output loading states. Manual Generate buttons remain hidden throughout automatic preparation, including the interval before the first request starts and the handoff to the saved report. The detailed panel explains that it follows the quick summary. Failed/already-attempted automatic requests expose an explicit Retry action; paused runs keep their manual controls.

Running, paused, failed, cancelled, budget-limited and capacity-limited jobs do not automatically generate. Users can pause and generate from that partial snapshot manually. Historical read-only runs do not start automatic requests. A completed retained active run can prepare missing reports when selected.

Failed automatic POSTs are remembered before dispatch in memory and sessionStorage, so navigation/reload in the same browser session does not retry them. Users can explicitly retry. This prototype does not provide a durable global failed-attempt ledger across different browser sessions. Automatic preparation runs in the open workspace rather than a browser-independent server queue.

## Evidence and storage

`/api/reports/detailed` authenticates the existing retained run and accepts only a run ID and snapshot key for generation. GET reads saved output without inference. The separate detailed-report identity includes its own prompt version, public context and retained revision, and excludes access tokens.

The fuller server-only pack contains up to 64 eligible public fictional statements, each up to 1,600 characters, with a 120,000-byte statement-text budget, selected reply references and simulated minutes. Public role goals and source metadata add context; available aggregate commute results retain their existing assumptions and denominators. Private groups, profiles, memories, hidden or forwarded statements and rule-authored content remain excluded. Raw source packs are not HTTP DTOs or saved report artifacts.

One structured completion uses the existing configured provider, up to 6,000 output tokens and a 45-second request limit, with no transport retries. Inputs and saved chapter lengths are bounded. The server rejects changing snapshots before source reading/provider dispatch and checks again before saving.

Detailed artifacts are saved separately under the existing private store's `detailed-reports` directory. Neither their prompt nor their output overwrites quick summaries or graph narratives.

## Downloads

- **Download Markdown** saves the six chapters and public report metadata.
- **Print / Save as PDF** opens a clean escaped print document. Choose the browser's Save as PDF destination. It includes every chapter and identifies interrupted snapshots; it does not include raw evidence, access tokens or technical logs.

## Verification

88 focused tests and TypeScript passed. Chrome checks used an actual retained MRT-shaped fixture with a fake token and intercepted AI/simulation requests: completion while on Map, quick-then-detailed generation once each, unchanged quick-read text, six detailed chapters below it, Markdown download, PDF print document, escaped content, mobile width and saved reuse across navigation/reload. A separate mocked failure check verified that reload does not automatically retry the failed request and that manual retry succeeds. A live unauthenticated request verified the new route compiles and denies access with no-store headers.

Tests did not rerun a simulation or invoke paid inference. Narrative quality and real-provider latency for this new prompt have not been measured. Local browser artifacts are under ignored `tmp/detailed-report-20261102/`.

Preparation-state follow-up: 59 focused tests and TypeScript passed. The mocked Chrome check deliberately held both writer responses pending and verified there were no Generate buttons during either wait, followed by normal saved output, reuse and explicit retry after failure (`browser-preparation-check.py`).
