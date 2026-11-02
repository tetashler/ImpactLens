# Plotted-site location correction

**Goal:** Keep the location in AI scenario assumptions consistent with the user's plotted point.

**Architecture:** Resolve named sites using the existing official boundary lookup and send the same compact context to entity, relationship and legacy planners. Validate direct generated claims about a plotted site's location before the draft reaches assumption review. Leave archived plan validation and immutable runs unchanged.

**Evidence:** The retained point at latitude 1.325243, longitude 103.856099 resolves to NOVENA / BALESTIER, while the generated assumption states Sengkang. Current prompts supply raw coordinates without the resolved names and contain a hard-coded Sengkang example.

**Scope:** No new retrieval or inference calls, no changes to geometry, demographic population assignment, financial accounting or UI styling. Work in the shared checkout as requested. No automatic commit/push for this fix.

## Tasks

- [x] Add failing regressions for the Whampoa-area point, legitimate Sengkang, multiple sites, unknown sites and valid comparison references.
- [x] Add a server-only named-site context and targeted contradiction check using existing boundary data.
- [x] Pass `plottedSiteContext` to each planner; remove the neighbourhood-specific prompt example; enforce consistency only on newly generated drafts.
- [x] Verify encoded transport inputs and refusal of a contradictory site claim without a retry.
- [x] Carry the already-allowlisted official `locationContext` into graph summary evidence, with precedence over conflicting model descriptions and assumptions.
- [x] Run focused planner, location, assumption review and report regressions plus TypeScript; review shared changes.

## Review focus

- Official planning-area/subzone names may differ from colloquial neighbourhood names: do not rewrite map coordinates or claim an address-level lookup.
- Multiple plotted sites may legitimately cross planning areas; preserve each site's own result.
- Comparative references to services elsewhere must remain legal.
- Missing or ambiguous boundary data must remain unknown.
- Historical reports and accepted runs must retain their original immutable content.

## Verification record

The five initial planner transport regressions failed before implementation: all planners omitted named site context and accepted the fabricated Sengkang placement. The new diagnostic test also failed before its semantic rule was added. Helper and graph-evidence regressions were independently exercised red-to-green by the delegated workers.

Final verification: **228 focused tests passed**, including staged and legacy planners, bounded research contexts, geographic lookup, assumption review, graph summary services/cache keys, report services and immutable archive validation. `npx tsc --noEmit` and `git diff --check` passed. GET requests to the local scenario and social API routes returned their expected method/request-validation responses (405 and 409), confirming Next.js compiled the helper after a temporary missing-module error during concurrent editing.

No real inference, Tavily requests, cache edits or simulation writes were performed. Adding official location evidence changes graph-summary snapshot keys for affected runs, so a newly requested graph summary will not reuse the old context's artifact. This does not rewrite a saved scenario's old assumptions or descriptions. Start a fresh exploration to obtain a corrected plan and assumption review.

The placement validator recognises bounded direct assertions about named administrative locations, including description/trigger/assumption fields; it is not exhaustive natural-language fact checking. Comparisons, quoted source statements, questions and conditional discussion remain permitted. Official 2019 labels describe boundary membership, not current land availability, feasibility or an address-level neighbourhood verification. Context stays under the existing 24,000-byte transport ceiling; oversized combinations still fail before provider dispatch without a retry.
