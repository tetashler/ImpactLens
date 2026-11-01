# Citizen selection v2 implementation plan

Use the executing-plans workflow inline. No commits, paid calls, new data or v7 prose changes.

**Goal:** Enrich the existing 50/100-person discussion cohort without changing national calculations.

**Architecture:** A pure seeded selector consumes the already validated full citizen dataset, calculated commute run and accepted MRT binding. Up to 25% changed outcomes and 25% nearby home/work proxies; unused places return to a geographically stratified comparison pool. A server-only callback replaces the bounded population view before preview/personality initialization. Ordered IDs and reasons are frozen in an optional `citizen-selection-v2` input; absent policy retains v1 behaviour. Existing public limitations disclose enrichment without private attributes.

**Files:** New selector and focused tests; narrow edits to population view/store, server population/service/Explore wiring and engine input validation. Reuse the existing browser-safe distance calculation. Keep the population impact graph and numerical summary unchanged.

- [x] RED/GREEN: deterministic ranking, status separation, near/unaffected citizens, comparison diversity, overlap, missing coordinates, capacity and unsupported interventions.
- [x] Connect ordinary Explore before the personality preview; validate immutable metadata and historical absent-policy behaviour. Test production-path initialization, composition, privacy and saved replay.
- [x] Run the actual CCK–Sengkang fixture, affected complete mocked cohorts, browser initialization/Graph/Report/restoration, full blocked suite, TypeScript/build, qualifying history and protected hashes. Reuse unchanged scheduler/storage benchmark evidence explicitly.
- [x] Write concise results in `GEOGRAPHIC_IMPACT_AWARE_CITIZEN_SELECTION.md`, append roadmap and stop task-owned processes; leave unstaged/uncommitted.
