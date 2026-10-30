# Phase 6 — Evidence-aware society reports

Repository baseline: `master`, HEAD `f85fa3feaadf54190cd412753cf8485395f3ae48`, initially clean. The task leaves 30 maintained files changed/new, all unstaged/uncommitted; HEAD and index remain unchanged. The task-owned loopback server was stopped and port 3163 was confirmed closed.

## Implementation

`lib/society/report.ts` derives reports directly from the immutable social world and rejects a different parent run identity. The existing scenario Report remains intact above the new section: original question, staged plan/ontology, eight accepted model actions, Tavily evidence policy, token/cost records and validated MRT/AAC results are not replaced. No second generated narrative or research call is used.

The new section includes explicit simulated time/status, full sample/weight/discrepancy provenance, active fictional profiles, per-platform posts/comments/replies/exposures/reactions/shares/follows, root threads, position trajectories, actual influence references, chronological events, demographic context and source-bound geographic context. Counts come from stored events/items; root shares are separate from original posts. Historical Census weights describe the full population, never a national opinion estimate from the active subgroup. Foreign/unresolved profiles and absent legacy geometry remain unassigned/unlocated.

Position updates show the actual bounded-assimilation calculation, previous/next values and encountered-event references. The −1 to +1 scale, susceptibility, network, activity and participation are uncalibrated assumptions. Geographic summaries refer only to synthetic context markers inside URA subzones, never real geolocated social-media measurements or personal travel. Household/income/employment correlations and quantitative productivity/wage/GDP/health forecasts remain unsupported.

An on-demand, local sensitivity comparison replays the same seed, recorded model inputs and interval with half/1.5× activation probabilities (bounded at one). It compares recorded events and mean model position, without confidence intervals, extra inference or causal policy claims. The latest 50 chronological events, 30 position changes and 20 diffusion paths are displayed; full bounded history remains in the saved world. Clicking an actor opens the same canonical social profile and its memory, graph and map entry points.

## Gate evidence

Six report tests reconcile all platform counts, position arithmetic and actual references; check foreign/legacy non-assignment, exact replay, immutable inputs, bounded sensitivity and the accepted-plan → eight fixture actions → social world → map/graph/report identity chain. Runtime review additionally rejected invented activity contexts, dangling action/thread references and duplicate model-source inputs while preserving valid deterministic replay.

Mocked production-browser acceptance at 1440×900 and 390×844 completed the existing four-role/eight-action flow, then ran 24 persistent social agents to 80 steps / 1,200 simulated minutes: **764 events, 207 items, 6 replies, 66 cross-platform shares, 161 position updates**. Exactly eight accepted fixture statements were seeded once; 756 later events used rules. The report matched local persisted world records. Its eight original statements are mocked provider evidence, not live inference. Source inspectors preserved literal fixture text and the unverified/non-corroborated limitation.

The same completed graph contained 27 world entities/fictional agents and 178 relationships. Mouse dragging reheated alphaTarget to 0.3, moved connected nodes, then settled below 0.001 with the loop stopped. Positions survived Report → Graph navigation. Desktop/mobile screenshots were visually inspected; no page errors or horizontal overflow. During the complete browser session (including map assets/navigation) 38 long tasks were observed, maximum 354 ms; this is not an isolated social-renderer benchmark or sustained-FPS guarantee. Existing dense/300-node graph limitations remain.

Performance sample: 30,000 population profiles generated in 327 ms; 64 active agents / 144 steps produced 3,670 events and 907 items in 551 ms including setup/geography. Report projection 33 ms, exact replay 467 ms, saved world 2,460,036 bytes. Single local observations; no calibrated social-performance claim.

**Final gate ? PASS:** 895 Node tests; application and affected-module strict TypeScript; production build; all six numerical model CLIs; whitespace checks. The first sandboxed eldercare preparation could not write its existing ignored catalogue; rerunning the same CLI with approved local filesystem access passed, as did its simulation. Shapely is unavailable, so GIS tests were not run. No paid inference/retrieval or external social posting occurred.

## Reproduction and artifacts

Run `node scripts/testing/society-smoke.ts` for an entirely offline vertical-slice smoke test. Run `npm.cmd test`, `npx.cmd --no-install tsc --noEmit`, `npm.cmd run build`, `git diff --check` for full verification. No new dependencies or services.

Browser reproduction uses a task-owned loopback production server after building:

```powershell
$env:STAKEHOLDER_LIVE_ENABLED='true'
$env:IMPACTLENS_PHASE2B_MOCK='true'
$env:NODE_OPTIONS='--import ./scripts/testing/dynamic-provider-preload.mjs'
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3163
```

Use an isolated browser context, ask `What if Singapore introduces a four-day workweek?`, Explore, then Social Simulation. The preload explicitly intercepts fixture providers and rejects other external server requests. Remove these process-local switches before ordinary real-provider development; no private environment file is modified. Existing browser OSM tiles are separate, free map assets. No paid API calls occurred in this assignment.

Ignored screenshots/logs under `tmp/phases36/`: `phase6-complete-report-desktop.png`, `phase6-complete-report-mobile.png`, `phase6-trajectories-desktop.png`, `phase6-source-inspector.png`, `phase6-graph-before-drag.png`, `phase6-graph-during-drag.png`, `phase6-graph-settled.png`, `phase6-graph-mobile.png`; `final-tests.log`, `final-tsc.log`, `strict-tsc.log`, `final-build.log`, `performance.log`. Earlier phase evidence is listed in their reports. Screenshots are local artifacts, not committed evidence.

## Changed files for this phase

- `lib/society/report.ts`
- `components/society-report.tsx`
- `components/social-simulation.css`
- `components/workspace.tsx`
- `lib/contracts/tests/society-report.test.ts`
- `lib/contracts/tests/society-engine.test.ts`, `lib/society/engine.ts` (final boundary checks)
- `scripts/testing/society-smoke.ts`
- This report and the development roadmap/implementation checklist.

The project-wide inventory and final verification checkpoint follow in the roadmap. No historical plan hashes, source datasets, numerical formulas or inference routing are changed. GIS remains unavailable without Shapely; no GIS pass is claimed. Stories, calibrated recommendations, household/workplace synthesis, personal commute routes and per-step live LLM decisions remain explicitly outside this implemented slice.

## Final-build replay and inventory

After the final transition-boundary checks, a fresh isolated mocked Explore completed four roles/eight actions and 80 social steps again: **783 events, 199 items, 2 replies, 63 cross-platform shares, 178 position changes**, eight source model statements exactly once. The same world produced **27 graph nodes / 180 relationships** and a matching Report; its persisted snapshot was 906,925 characters. This is a new genesis/seed, not a claim that different research snapshots produce identical trajectories. Exact replay uses the same saved genesis, seed and accepted outputs. CDP console inspection and page-error capture found no errors during cross-view navigation. Desktop/mobile had no horizontal overflow. Final screenshots: `tmp/phases36/phase6-final-report-desktop.png`, `phase6-final-report-mobile.png`, `phase6-final-graph-desktop.png`.

The final mocked provider ledger recorded one retrieval, two planning stages and eight action completions for that browser attempt; all were fixtures, with **zero actual paid calls**. Ordinary production inference limits/model/provider were unchanged. The offline smoke CLI independently produced 10,000 residents, 24 active profiles, eight accepted fixture actions, 772 social events, 24 map contexts, 36 graph nodes / 186 edges and exact replay in 608 ms; its larger fixture ontology and different seed explain the different inventory. Neither fixture is live acceptance.

Full changed-file inventory is listed in the development roadmap. This phase adds the report projection/component/tests and offline smoke CLI; previous phase changes remain unstaged/uncommitted. Task-owned servers are stopped after verification. No private environment file, geographic source dataset, existing numerical model, historic plan hash or secondary directory is modified.
