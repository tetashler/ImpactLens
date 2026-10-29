# Dynamic scenario live acceptance

29 October 2026. Main `master`, HEAD `e466f16cfdbd630a6ff3037d39ff67b13f5e2fba`. This is the separately authorised **USD 0.50** dynamic-planning acceptance task; historical action-engine billing is not included in this subtotal. All changes remain unstaged and uncommitted.

## Result

The actual question-first browser flow completed both required scenarios with one genuine planning completion and eight separate genuine action completions each:

| Accepted run | Scope / affiliations | Accepted actions | Input / output tokens, including planning | Reported USD | Planning / action duration |
|---|---|---:|---:|---:|---:|
| Four-day workweek, B5 | Local; Singapore | 8 | 21,274 / 5,143 | 0.0032682160 | 23,323 / 63,814 ms |
| Malaysia water-export restriction, C2 | Cross-border; Singapore and Malaysia | 8 | 21,228 / 5,321 | 0.0030613940 | 22,393 / 37,207 ms |

Workweek run: `run-d9f7050662c26ef914a860c5-attempt-5-dc5817bf-edb8-4e0c-acee-204963801824`.

Cross-border run: `run-5a6cc93d7144ab174b41003c-attempt-11-61837f83-6db3-49c8-9945-2209e642943c`.

The browser accepted full plan/request/run identities through the authoritative parsers. Each role retained two events within the six-event memory limit. Later actions cited accepted events from other participants; the water dialogue explicitly responded to earlier consultation, information-sharing and contingency proposals. Recorded positions remained unchanged in these runs; no position change was invented for presentation.

A separate UBI planning-only retry passed with household, business, government and civil-society categories and local scope. Its first attempt timed out; no UBI action run is claimed.

## Provider compatibility

All requests used OpenRouter model `deepseek/deepseek-v4-flash-0731` with:

```json
{
  "provider": {
    "only": ["digitalocean"],
    "allow_fallbacks": false,
    "require_parameters": true
  },
  "reasoning": {"effort": "none", "exclude": true}
}
```

Planner cap remains **3,000 output tokens / 24 KB JSON**; application actions remain **800 output tokens**. No cap, runtime validator, provider-identity requirement or timeout was relaxed. The successful planner responses fit the existing caps. All 48 normally received completions reported the exact serving model, DigitalOcean, `stop` / native `stop`, zero reasoning tokens and valid JSON/schema. The interrupted request supplied no complete identity/usage envelope; requested routing was not misrepresented as verified serving identity.

Identity verification is gateway-reported attribution, not an independent audit of provider infrastructure. Public endpoint metadata was checked without paid inference; the ignored pricing record binds the exact model/provider and its advertised structured-output/reasoning support. Official references: [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs), [reasoning controls](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens), [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection).

## Confirmed failures and focused corrections

1. **Planning quality:** A1 returned valid JSON/schema but generic analytical roles and an unjustified cross-border interpretation for the domestic workweek question. Instructions now select directly affected roles with distinct practical goals and question-grounded scope.
2. **Undeclared entity reference:** B failed the strict `Unknown generated entity.` check before any action. Instructions explicitly distinguish entity IDs, agent IDs and jurisdiction IDs, require existing exact references and permit empty entity associations. Invalid IDs are never rewritten.
3. **Unsupported quantitative proposal:** B2 was normally finished and schema-valid but rejected by the generated-quantity guard. No offending prose was retained, so its exact statement is not reconstructed. Instructions now prohibit added numerical targets, money, population counts and percentages even in goals/assumptions/quantity-gap examples. The original strict guard remains.
4. **Invalid relationship:** A4 failed the existing relationship-reference rule. The raw offending reference was not retained; it is not established whether it was an unknown endpoint or self-reference. New provider generation constrains role IDs and both relationship endpoints to the same four identity slots, `agent-1` through `agent-4`; this prescribes no stakeholder categories. Self-relations remain rejected. Archived valid IDs remain readable.
5. **Self-only later turn:** B4 accepted four turns, then its fifth completion failed `Later turns must reference another recorded participant`. The action prompt now separates available other-participant IDs from own prior IDs, retains previous position, and explicitly requires an other reference in the structured array. Later-round schema arrays require at least one reference; strict local validation still rejects self-only references.
6. **Wrong report scope:** C completed eight valid actions with Singapore/Malaysia affiliations, but incorrectly labelled the plan local. It was not counted as final cross-border acceptance. A new-generation-only check rejects local scope containing multiple relevant jurisdictions; the prompt explicitly identifies cross-jurisdiction resource transfers as cross-border. Archived contracts retain their original interpretation. A planning-only check passed, followed by the complete C2 run.
7. **Archive navigation:** Browser inspection revealed that entering history erased a completed current result; returning showed Not simulated. The controller now preserves finished current records while inspecting history, and still cancels/clears pending attempts. Tests cover restoration, geometry invalidation and delayed-response rejection. This final UI-only fix was browser-regressed using explicit mocked inference after rebuilding; the real acceptance evidence above remains separately identified.

B3 stopped locally before its sixth HTTP request after five accepted actions, with `AI_UPSTREAM`, no HTTP status and no corresponding paid-ledger entry. Its exact pre-request cause was not captured and was not reproduced. Later full runs passed. The testing guard now records finite safe guard-failure categories; no claim of a diagnosed provider fault is made.

UBI D received HTTP 200 but its body did not complete within the unchanged 30-second call deadline. No generation ID, finish reason, serving identity, tokens or actual cost was available. A USD 0.02 reservation remains. The one controlled D2 retry passed. No automatic retries or fixture substitution were introduced.

## Billing and independent guard

**49 paid completion attempts:** 15 planning and 34 action requests. There were 33 locally accepted actions, one rejected action, three semantically rejected plans and one interrupted planner request. Other normally received plans include the deliberately rejected quality/scope acceptance cases above. Three full action runs finished (B5, C and C2); C's scope defect is explicitly excluded from final cross-border acceptance.

Known reported charges: **USD 0.0171181024**. One unknown charge (call 48) retains **USD 0.0200000000**. Conservative cumulative accounting: **USD 0.0371181024 / 0.50**. Known reported usage totals **87,348 input / 38,286 output tokens**, excluding the unknown request. Zero unknown costs were counted as free.

| Stage | Paid calls | Reported USD | Accounted USD | Outcome |
|---|---:|---:|---:|---|
| A1 | 1 | 0.0003528350 | 0.0003528350 | Valid structure; role/scope quality failed |
| A2 | 1 | 0.0004566030 | 0.0004566030 | Planning passed |
| B | 1 | 0.0004837350 | 0.0004837350 | Entity-reference rejection |
| A3 | 1 | 0.0004439890 | 0.0004439890 | Planning passed |
| B2 | 1 | 0.0004629338 | 0.0004629338 | Quantitative-proposal rejection |
| A4 | 1 | 0.0004740008 | 0.0004740008 | Relationship rejection |
| A5 | 1 | 0.0004850440 | 0.0004850440 | Planning passed |
| B3 | 6 | 0.0014870954 | 0.0014870954 | Five actions; local pre-request stop |
| B4 | 6 | 0.0017582012 | 0.0017582012 | Four actions; self-only later-reference rejection |
| B5 | 9 | 0.0032682160 | 0.0032682160 | Complete workweek acceptance |
| C | 9 | 0.0034637806 | 0.0034637806 | Eight actions; incorrect scope |
| C-scope | 1 | 0.0004608870 | 0.0004608870 | Correct cross-border planning |
| C2 | 9 | 0.0030613940 | 0.0030613940 | Complete cross-border acceptance |
| D | 1 | Unknown | 0.0200000000 | UBI timeout |
| D2 | 1 | 0.0004593876 | 0.0004593876 | UBI planning passed |

The opt-in `scripts/testing/dynamic-live-debug.mjs` reserves USD 0.02 before each call, rejects concurrent requests using an exclusive lock, verifies fixed routing/reasoning/body/output bounds and checks fresh conservative pricing. Unknown/interrupted requests retain reservations. Known actual charges replace reservations. The maximum 48 KB request and 3,000 output tokens fit below USD 0.0135 at the verified price ceilings; the reservation is deliberately higher. The finite call ceiling was explicitly raised from 40 to 60 for the diagnosed scope repair/reacceptance; the USD 0.50 ceiling and all prior entries were preserved. Corrupt cost/ceiling metadata fails closed.

The new-task ledger is ignored at `tmp/dynamic-live/ledger.json`; every call retains safe identity, termination, token, category, byte, latency and cost metadata. The historical `tmp/live-debug/ledger.json` checksum is unchanged. No full provider body, private reasoning, credential or private prompt is saved in diagnostic records. An interrupted request has unavailable fields, not fabricated values.

## Browser evidence and provenance

Real production UI on owned loopback port 3152 used existing process-local credentials plus the spending guard, **not** the mock preload. Planning/action requests came from the actual Start Simulation button. The real `POST /api/scenario-simulate` returned the complete validated runs.

- Workweek graph: **29 nodes / 105 edges**, four agents, eight event nodes, **12 event-to-event uses edges**, five separately labelled proposed role relations.
- Corrected water graph: **28 nodes / 103 edges**, four agents, eight event nodes, **16 event-to-event uses edges**, five proposed role relations.
- Graph search, popup, inspector and full-window details retained fictional/unverified provenance; mobile inspection worked.
- Reports showed actual accepted events, planning-plus-action usage and source gaps. Workweek omitted unrelated international analysis; C2 displayed domestic/international context.
- Report checks at **1920x1080, 1440x900, 1024x900 and 390x844** found no horizontal document overflow, eight visible events and one MapLibre canvas. A limited DOM credential-pattern check found none.
- A clean browser context loaded the real server with one map, an editable question, no stale events and no console/page warnings or errors. No paid request was made by this fresh-session check.
- Inspected local screenshots: `tmp/dynamic-live/workweek-report-1440.png`, `workweek-report-mobile.png`, `workweek-graph.png`, `water-report-*.png`, `water-graph.png`, `water-inspector-mobile.png`, `fresh-landing.png`. Safe run metadata is in `workweek-safe.json` and `water-safe.json`.

The verified evidence registry is empty. Institutions and affiliations were never independently verified. Generated context can contain factual/taxonomy mistakes: for example, one workweek suggestion classified a union as a country and dialogue asserted legal background without source verification. Those are unverified model outputs, not established facts. This acceptance proves bounded execution/provenance, not factual research quality, treaty interpretation, public opinion or policy forecasting. No quantitative health/economic forecast or MRT/AAC result was fabricated.

## Automated verification and file inventory

Final counts and final-build browser recovery are recorded below. Six original CLIs passed sequentially: `mrt:validate`, `mrt:simulate`, `agents:generate`, `agents:impact`, `eldercare:prepare`, `eldercare:simulate`. The eldercare preparation initially hit sandbox EPERM on an ignored derived catalogue; the authorised rerun succeeded. No raw/building acquisition occurred.

Main Python's GIS loader failed because `shapely` is missing. No GIS pass is claimed, no dependency was installed, and the unused secondary directory/environment was not accessed.

Changes added by this acceptance task, on top of the preserved 31-path dynamic implementation:

- Modified: `lib/server/inference/planner.ts`, `lib/dynamic-scenarios/schema.ts`, `lib/server/inference/deepseek.ts`, `lib/question-simulation/client.ts`, `docs/DYNAMIC_SCENARIO_GENERATION.md`, `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`.
- Created: `lib/contracts/tests/dynamic-live-regressions.test.ts`, `scripts/testing/dynamic-live-debug.mjs`, `scripts/testing/dynamic-live-debug.test.mjs`, this report.
- Ignored only: safe ledger, pricing, screenshots, logs and before-edit backups under `tmp/dynamic-live/`. None are staged.
- No private environment changes, dependencies, formulas, raw datasets, source/licence changes or secondary-worktree access. HEAD/index are unchanged.

Read-only independent review found no material defects in the fixes, scope compatibility, archive lifecycle or guard. Regression tests cover the observed rejections and preservation boundaries.

## Reproduction

Ordinary verification makes no paid calls:

```powershell
npm.cmd test
node --test scripts/testing/dynamic-live-debug.test.mjs
npx.cmd --no-install tsc --noEmit
npm.cmd run build
git diff --check
```

Any future paid acceptance requires its own authorisation/accounting. Do not erase either historical ledger. For an authorised planning-only diagnostic, refresh the ignored public pricing metadata, then use `node --env-file=.env.local scripts/testing/dynamic-live-debug.mjs workweek` (or `water` / `basic-income`). The script validates the plan and derived execution input, and sends no action completions.

For real UI acceptance, load the spending guard through an ignored preload assigning `globalThis.fetch=guardedDynamicFetch`, set live enablement process-locally, and start the built app on an owned free loopback port. Never load `dynamic-provider-preload.mjs` for real-provider acceptance: that separate preload supplies deterministic mocks only. No further paid test is required for the completed acceptance above.

## Final verification record

- **653 Node tests passed; zero failures or skips.** The nine added regression tests cover the observed planner/action defects, new/legacy IDs, scope compatibility and archive/cancellation behavior. Two additional isolated spending-guard tests passed without network access.
- Application TypeScript, explicit strict affected-module/test TypeScript, final production build and `git diff --check` passed. TypeScript 7 explicit-file commands require `--ignoreConfig --types node`; initial invocation-option errors were corrected, not application code errors.
- All six model CLIs passed. GIS was attempted and failed at import with missing Shapely; no GIS test pass is claimed.
- Final-build archive browser regression on owned port 3153 used fake process-local credentials plus the network-blocked mock preload. It created two fixture runs, inspected the older run, returned to Current question and recovered exactly the newer run's eight event IDs and cross-border report. Screenshot: `tmp/dynamic-live/archive-final-mocked.png`. Paid-ledger count stayed at 49.
- The real-provider server was stopped after acceptance. The separate mocked server was stopped after UI recovery verification. Original user-owned port 3000 was left untouched.
- Private environment and historical ledger hashes match the initial audit; initial 31 pending paths were preserved. Main remains `master` at the same HEAD with no staged changes.
