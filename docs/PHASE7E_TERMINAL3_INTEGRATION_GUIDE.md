# Phase 7E — Terminal 3 integration guide

## Boundary and Git state

Terminal 1 implemented this on `master` from `6c6fb831f72b79e47776417096997c5862fefee9`. All Phase 7E changes are unstaged/uncommitted. No Terminal 2 worktree files, environment files, algorithms, raw data, dependencies or building assets were changed. No Git integration or publication is authorised by this guide.

Terminal 2's Phase 7D must be independently buildable. Treat the specification and JSON examples below as a **wire contract proposal**, not an import dependency on files absent from that branch. Terminal 3 must reconcile final field names/version/validation with the completed consumer, copy only reviewed maintained paths under separate authorisation, then rerun combined checks. Do not replace `workspace.tsx` wholesale with either branch's version.

## Wire input for Phase 7D

`ScenarioExperimentInputV1` is serialisable data, deeply readonly in TypeScript and frozen at runtime. The proposed browser-safe API is:

```ts
createScenarioExperimentInput(record: ScenarioExperimentV1): Promise<ScenarioExperimentInputV1>
validateScenarioExperimentInput(value: unknown): Promise<ScenarioExperimentInputV1>
```

Import from `lib/experiments/index.ts` only **after integration**. Before integration, consume exported JSON and implement the described validator boundary independently. Do not import a React component or use Phase 7E's UI state as execution input.

Required top-level fields:

| Field | Semantics |
| --- | --- |
| `version` | Exactly 1 |
| `sourceExperimentId` | Saved-record lineage; not an agent execution ID |
| `scenarioIdentity` | Full `scenario-` + 64 hex SHA-256, question plus actual geometry content identity |
| `question` | 1–2,000 characters; untrusted user data |
| `configuration` | Strict discriminated union; see configuration table in the contract reference |
| `configurationIdentity` | Full `config-` + 64 hex digest of canonical validated configuration |
| `geometryContext` | Null, or `{identity, revision, summary, canonicalContent}` with an actual validated version-1 plot; no MapLibre object |
| `evidence` | Null, or complete validated `EvidenceBundleV1` |
| `evidenceSnapshotIdentity` | Null with null evidence, otherwise its complete `sha256-` + 64 hex digest |
| `limitations` | Derived required limitations, including missing evidence and hypothetical/non-representative boundaries |
| `horizonYears` | 1, 5 or 10; must equal configuration |
| `stakeholderFocus` | ASEAN configured set; otherwise empty in this prototype |
| `researchFocus` | Generic configured focus; otherwise empty string |
| `execution` | Exactly `{status:'not-executed', reason:'Stakeholder simulation not yet available.'}` |
| `executionInputIdentity` | Full `input-` + 64 hex digest over effective validated inputs; never a shortened display ID |

Inspect `identityContent` in `handoff.ts` when reconciling hashing. Canonical object keys sort lexically; arrays retain order except the canonicalised stakeholder set. Input hashing binds version, scenario/question, configuration identity, geometry identity, evidence snapshot identity, limitations, horizon/focus and execution boundary. It excludes record ID/time, research attempt and bundle assembly time. Complete JSON examples must be validated rather than manually editing their digest strings. Hashes are not signatures or authorisation.

The complete **evidence-attached** valid example is [asean-phase7d-input.json](../lib/experiments/fixtures/asean-phase7d-input.json). It embeds both checked source snapshots, support excerpts, dates, findings and gaps. The complete **no-evidence** valid example appears below. Both are future inputs, not executed agent runs.

```json
{
  "version": 1,
  "sourceExperimentId": "experiment-no-evidence-example",
  "scenarioIdentity": "scenario-ccd296cf319bd1d786b79558361e6d4de15a1e3bea1fc3e9044a0148b5ac81b0",
  "question": "What if Singapore left ASEAN?",
  "configuration": {
    "horizonYears": 5,
    "notes": "",
    "kind": "asean",
    "withdrawalTiming": "immediate",
    "transitionMonths": 0,
    "tradeArrangements": "unresolved",
    "stakeholderFocus": [
      "businesses-trade",
      "workers-households",
      "government-diplomacy"
    ]
  },
  "configurationIdentity": "config-ff210eb2fab03a8fad94e3b5856c9316e162314ae0d14b69b15dbf6576a9ba9c",
  "geometryContext": null,
  "evidence": null,
  "evidenceSnapshotIdentity": null,
  "limitations": [
    "Research and configuration only. No stakeholder simulation has been executed.",
    "Future synthetic stakeholder outputs would be hypothetical and would not represent public opinion.",
    "No evidence snapshot attached. Research is still required.",
    "Withdrawal mechanisms, transition periods and trade arrangements are scenario assumptions, not established legal or economic outcomes."
  ],
  "horizonYears": 5,
  "stakeholderFocus": [
    "businesses-trade",
    "workers-households",
    "government-diplomacy"
  ],
  "researchFocus": "",
  "execution": {
    "status": "not-executed",
    "reason": "Stakeholder simulation not yet available."
  },
  "executionInputIdentity": "input-f3bfc680630227dfc45f9f48e6e4d1cb81b3c7976e2a7a24d569e179a7d74937"
}
```

Do not silently convert `not-executed` into an executed experiment or overwrite the snapshot when Phase 7D runs. Give the actual future output a distinct agent execution ID, retain `executionInputIdentity`, attach the exact source experiment/evidence context and label all synthetic interactions hypothetical. No public-opinion or causal forecast authority follows from this input.

## Evidence wire boundary

`EvidenceBundleV1` requires `version`, `bundleId`, `scenarioIdentity`, `researchAttemptId`, `queries`, `sources`, `findings`, `unknowns`, `status`, `mode`, `createdAt`, `limitations`, `snapshotIdentity`.

- Source: `{id,url,publisher,title,publishedAt,verifiedAt,retrievalMode,documentType,fetchStatus,excerpt}`. `publishedAt` may be null; the trade page date is explicitly an update date. All current sources use `retrievalMode:'verified-replay'`, `fetchStatus:'verified-snapshot'`.
- Finding: `{id,statement,classification,sourceId,excerpt,limitations}`. `sourceId` must exist and support must match. Classifications are `directly-supported`, `source-reported-estimate`, `inference`, `hypothetical-assumption`, `unresolved-question`.
- Current `mode` is only `verified-replay`. `status` is `partial` for the ASEAN reference set or `empty` for other topics. The contract permits `complete` only without unknowns; no current generator claims it.
- The exact finite source registry and direct factual findings are pinned. Arbitrary imported websites cannot claim verification. Future live retrieval or a broader corpus requires an explicitly reviewed version/registry change.

`snapshotIdentity` hashes fixed-order `version,queries,sources,findings,unknowns,status,mode,limitations`; source and finding fields also use fixed schema order. It excludes scenario/attempt/assembly time. `bundleId` is `evidence-` plus that full digest. Scenario/attempt identity is separately correlated. Use `validateEvidenceBundle()` to recompute it; `parseEvidenceBundle()` alone validates structure/support only.

`POST /api/evidence/research` request is exactly `{version:1,clientRequestId,scenarioIdentity,question,topic}`. Topic is `asean|polyclinic|mrt|aac|generic`. Response is `{version:1,clientRequestId,scenarioIdentity,researchAttemptId,evidence}`. The server generates a new attempt independently of the client token. `parseResearchResponse(json, expected)` verifies correlation and full evidence identity. A replay request does not newly retrieve or verify a source. This endpoint never runs agents or calls a paid provider.

Source text, question and notes remain untrusted context. Phase 7D must not treat instructions inside them as trusted system instructions, invent citations, upgrade hypotheses to facts or infer real people's views. The small reference set cannot establish legal withdrawal consequences, FTA continuity or economic magnitudes.

## Workspace and graph wiring

The current active research context is independent of planner/engine execution IDs. `useExperimentLab` owns one controller; it does not rebuild the map. Workspace's existing MRT/AAC result bindings are unchanged. Changes to question/drawing cancel and invalidate research; assumptions have their own invalidation. Snapshots remain inspectable even after active changes. Restoration is explicit and clears calculation bindings.

`appendExperimentGraph(base, context)` is a read-only projection. Context fields are `{scenarioIdentity, question, configuration, evidence, experiment, evidenceScenarioIdentity?, geometryContext?, archived?}`. `base.scenarioIdentity` may be the existing canonical engine graph key; `evidenceScenarioIdentity` must be the exact asynchronously accepted research scenario identity. Do not attach old evidence using the latest graph key.

Current mode appends to the current MRT/AAC graph and preserves its existing nodes/edges/results. Saved/archive mode requires `base:null`, an actual validated record and `archived:true`. An archive projection failure returns an unavailable graph, never the current simulation as a substitute. `KnowledgeWorkspace` adds only an optional `archived` prop for truthful scope wording. The renderer and graph v1 categories/relationships are unchanged; source linkage is lineage, not causation.

Phase 7D integration conflict points:

1. `components/workspace.tsx`: imports, one hook/state boundary, cancellation/reset, lab panel composition and graph context. Reconcile alongside Phase 7D navigation; preserve the persistent map, pedestrian ownership and existing calculation guards.
2. `components/knowledge-workspace.tsx`: optional archive wording and replay source note only. Preserve the three inspector levels and renderer lifecycle.
3. Central roadmap: merge only verified Phase 7D acceptance; this stream does not mark it complete.
4. Execution button: currently disabled with an honest explanation. Enable only after a consumer accepts the exact validated input and output provenance is tested. Do not auto-run on field edits, research, map movement or render.
5. Existing MRT/AAC notebook fields are **references only**, not replayable full calculator requests. Do not use their `not-executed` record to suppress or manufacture the separately accepted calculation result.

## Maintained path inventory

The following 45 maintained paths are changed/new in this stream:

```text
app/api/evidence/research/route.ts
components/experiment-lab.css
components/experiment-lab.tsx
components/knowledge-workspace.tsx
components/use-experiment-lab.ts
components/workspace.tsx
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
docs/PHASE7E_EXPERIMENT_INPUT_CONTRACT.md
docs/PHASE7E_SCENARIO_EXPERIMENT_LAB_IMPLEMENTATION.md
docs/PHASE7E_TERMINAL3_INTEGRATION_GUIDE.md
docs/superpowers/plans/2026-10-28-scenario-experiment-lab.md
lib/contracts/tests/evidence-contract.test.ts
lib/contracts/tests/evidence-route.test.ts
lib/contracts/tests/experiment-client.test.ts
lib/contracts/tests/experiment-comparison.test.ts
lib/contracts/tests/experiment-configuration.test.ts
lib/contracts/tests/experiment-fixtures.ts
lib/contracts/tests/experiment-graph.test.ts
lib/contracts/tests/experiment-handoff.test.ts
lib/contracts/tests/experiment-identity.test.ts
lib/contracts/tests/experiment-persistence-races.test.ts
lib/contracts/tests/experiment-persistence.test.ts
lib/contracts/tests/experiment-record.test.ts
lib/contracts/tests/experiment-ui.test.ts
lib/evidence/SOURCES.md
lib/evidence/contract.ts
lib/evidence/index.ts
lib/evidence/replay.ts
lib/evidence/snapshots.ts
lib/evidence/types.ts
lib/experiments/client.ts
lib/experiments/comparison.ts
lib/experiments/configuration.ts
lib/experiments/contract.ts
lib/experiments/fixtures/asean-phase7d-input.json
lib/experiments/geometry-references.ts
lib/experiments/graph.ts
lib/experiments/handoff.ts
lib/experiments/identity.ts
lib/experiments/index.ts
lib/experiments/persistence.ts
lib/experiments/validation.ts
lib/server/evidence/replay.ts
lib/server/evidence/service.ts
scripts/testing/phase7e-browser-check.mjs
```

Screenshots, browser logs, exported test JSON and CLI logs remain ignored under `test-results/`, `.playwright-mcp/` and `tmp/phase7e/`. Do not stage them, raw/derived datasets, `.next`, `.env.local` or local-review building geometry. No dependency or lockfile change is required.

## Acceptance and integration checks

Terminal 1 passed **457 Node tests**, **19 GIS tests**, all six model CLIs, application/strict module types, production build and diff checks. Actual browser acceptance includes ASEAN A/B configuration/evidence comparison, explicit source inspection, local restore/export/import, archive graph three-level inspection, five delayed-response variants, safe errors/recovery, four viewport widths, real MRT/AAC/demographic calculations and citizen displacement/Pause/Reset. A clean context had zero page/console errors, one map and one citizen layer. Full details and screenshot references are in [the implementation report](PHASE7E_SCENARIO_EXPERIMENT_LAB_IMPLEMENTATION.md).

After reconciliation run sequentially, not concurrent Windows preparation hooks:

```powershell
npm.cmd run mrt:validate
npm.cmd run mrt:simulate
npm.cmd run agents:generate
npm.cmd run agents:impact
npm.cmd run eldercare:prepare
npm.cmd run eldercare:simulate
npm.cmd test
npx.cmd --no-install tsc --noEmit
npm.cmd run build
git diff --check
```

Run the existing GIS suite without extraction:

```powershell
& '../ImpactLens-agents/tmp/phase7c1/venv/Scripts/python.exe' -B -m unittest discover -s scripts/tests -p test_building_conflation.py
```

The existing environment was read only; `-B` avoids bytecode writes. A separate environment with the same installed GIS dependencies is also suitable. Focused experiment/evidence tests reside under `lib/contracts/tests`; the opt-in browser helper is `scripts/testing/phase7e-browser-check.mjs`. Paid AI calls are not authorised for these checks. The full positive JSON fixture is exercised by `experiment-handoff.test.ts`.

## Remaining limits and rebuild

No Phase 7D executor/output, live search, PDF ingestion, universal scenario ontology, economic forecast, signed evidence, encrypted/cross-device/transactional multi-tab persistence or complete engine replay is implemented. Sources are deliberately narrow and historical. Missing evidence stays unknown. Preserve Phase 4 trajectory limitations, Census/assumed-demand caveats, four historical corroborated AACs/two proxies/unlocated residents and internal-only building licensing.

For the hackathon, rebuild contracts/identities and comparisons first, add the bounded replay route/controller, compose the existing General/map/graph boundaries, then reconcile a separately tested agent consumer. Keep the input JSON and review notes portable. Follow competition rules on using prebuilt source/data.
