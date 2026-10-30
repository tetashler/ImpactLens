# Phase 4B implementation plan

Baseline: clean `master`, local/origin `fa0df45`, 899 historical tests. No paid calls or Git mutations.

Extend the reducer with opt-in genesis version 4. Earlier worlds keep their exact policy. A bounded initial seed slot and bounded nested-thread exposure precede social decisions. Background goals combine scenario-generated role goals with seeded, explicitly assumed priorities; demographics do not select beliefs.

One pure hybrid coordinator owns selected agents, recorded exposures, decision opportunities, saved decision outcomes and replay. The server owns each execution session and its budget; the browser requests revision-checked steps. The adapter reuses `createStructuredTransport`, with fixed model/provider settings and target enums. Default four selected agents, eight social decisions, one pending operation, 600 output tokens/call, bounded contexts and conservative unknown-cost reservations. A separate `SOCIAL_LLM_ENABLED` flag defaults off, preventing new paid activity merely because existing stakeholder inference is configured. Offline mocks enable the same route with intercepted inference. Failure/cancellation records cannot become substitute conversations.

Accepted decisions apply through `act`, retaining source/memory references and optional explicitly bounded stance transitions. No automatic opinion change from an LLM comment. Saved outcomes replay without inference. Sessions retain a bounded durable journal before provider dispatch; restart cannot silently reset the per-run budget.

Graph platforms/communities are registered simulation entities with event-derived summaries, not claims of actual Reddit/Instagram posting. Feed inspectors and Report distinguish original stakeholder actions, ongoing social model decisions, failures and rules.

Sequence: exposure/thread tests -> seeded priorities -> decision context/schema/apply/replay -> existing gateway adapter/server sessions -> hook/UI -> graph/report -> deterministic acceptance, 24/64-agent benchmarks, full regressions and desktop/mobile mocked browser.

Essential tests: actual seed encounter; substantive fixture reply; later relevant memory; Instagram-to-Reddit context; different goals/responses; unseen/unknown/future references rejected; exact replay; finite calls/tokens/cost/time/cancellation; historical identity; shared Map/Graph/Report data. Semantic fixtures establish wiring, not real-provider quality.
