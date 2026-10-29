# Dynamic scenario generation implementation plan

**Goal:** A question and optional geometry produce one AI-authored plan, four fictional agents, eight separately generated actions, graph and report.

**Architecture:** Add a bounded browser-safe planning manifest and version-2 stakeholder input. Retain legacy input/response validation and scripts. A server-only endpoint shares the fixed-provider structured transport and orchestrates one planner request plus the existing engine under a single deadline. The UI uses this path for new live questions; old live archives retain their old projection.

**Constraints:** Main worktree only; no secondary-worktree access, paid calls, dependencies, environment edits or Git mutations. Four agents/two rounds/eight action calls, one planning call; explicit provenance and nullable accounting. Drawings do not authorize numerical calculations.

1. Write failing tests for generated manifest validation, versioned role binding and five distinct mocked scenarios. Implement strict identities, reference and provenance validation; preserve V1 catalog checks.
2. Extract the shared fixed model/provider completion boundary without weakening existing action tests. Add bounded planner service and combined endpoint with separate planning accounting, shared cost/deadline/concurrency/cancellation bounds.
3. Reuse the question controller's ownership guards for a dynamic session, bypass preset gates in the primary UI, retain native calculators and explicit scripted demonstration. Add graph/report projection with unverified entity labels and accepted-event lineage.
4. Test five scenarios through real local routes with mocked provider HTTP; test malformed output, serving mismatch, errors, cancellation/ABA/geometry invalidation and old records. Run full Node suite, strict/application TypeScript, build and whitespace sequentially. Browser-check three previously unsupported questions and responsive graph/report navigation on a network-blocked mock-only server.
5. Update the development note and roadmap with exact paths/results and the need for separately authorised paid planner acceptance.

**Review focus:** Invented verification/citations; altered V1 roles; malformed generated IDs/edges; late work after cancellation; combined planning/action costs or limits misreported. No generated text is executable HTML or a source of numerical model outputs.
