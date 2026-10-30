# Phase 4C implementation plan

Goal: server-only communication records with desktop summary views and bounded automatic progression.

Architecture: retain legacy pure engines and immutable plans. New genesis-v5 worlds add registered communication capabilities and invitation-only groups. Existing inference/record journals stay internal. Public route adapters return allowlisted versioned summaries and graph projections, never internal worlds or stakeholder dialogue. Continuation uses run-scoped capabilities, revisions and explicit bounded requests; navigation only observes.

Constraints: main repository only; no Git mutations, credentials changes, paid requests, new providers, mobile work or secondary-directory access.

- [x] Audit and seal Explore, stakeholder, social, graph, map, inspector and report response boundaries. Add sentinel tests.
- [x] Add capability selection from accepted ontology entities, explicit generic fallback, group reducer permissions and historical membership/replay tests.
- [x] Extend bounded model context/action schemas for accessible groups; keep old v1-v4 replay unchanged.
- [x] Persist accepted runs internally; create one session on Explore, continue bounded batches with durable call reservations, support rule-only mode and read-only status/recovery.
- [x] Replace browser worlds with summary DTOs. Remove feed navigation/imports, playback and transcript inspectors. Use server graph/map projections and summary-only reports.
- [x] Desktop mocked acceptance at 1920x1080 and 1440x900: inspect every JSON response, HTML/storage, groups, summaries, graph physics, recovery and call counts.
- [x] Run full regression/strict TypeScript/build/whitespace checks; document actual limits and desktop-only policy.

Key failure cases: hidden groups entering model context; message text entering graph metadata; navigation spending twice; interrupted reservations redispatched; legacy storage retaining transcripts. Each receives a deterministic regression and desktop network check where applicable.
