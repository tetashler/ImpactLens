# Phase 7E experiment snapshots and future Phase 7D input

The browser-safe API is `lib/experiments/index.ts`. These records preserve research inputs and evidence. Every experiment and future input has execution status `not-executed` and reason `Stakeholder simulation not yet available.` No stakeholder agent, forecast, vote, approval score or economic effect is produced.

## Configuration

`createDefaultConfiguration(question, intent?)` returns a detached, deeply frozen configuration. Edit a copy and pass it to `parseConfiguration`. Each configuration includes `horizonYears: 1 | 5 | 10` and `notes` (at most 2,000 characters).

| Kind | Additional fields and restrictions |
| --- | --- |
| `asean` | `withdrawalTiming: immediate | negotiated | custom`; `transitionMonths` is respectively `0`, `null`, or an integer from 1 to 120. `tradeArrangements: unresolved | hypothetical-continuity | hypothetical-replacement`. `stakeholderFocus` contains one to three unique values from `businesses-trade`, `workers-households`, `government-diplomacy`; selection order is canonicalised. |
| `polyclinic` | `location: {lat,lon} | null` within the existing Singapore plotting bounds. `serviceScope: general-primary-care | scope-unconfirmed`. No location is invented. |
| `mrt` | `planId: string | null`, `routeId: string | null`, `stationPointIds: string[]` (unique, at most 40), `executionStatus: not-executed`. |
| `aac` | `planId: string | null`, `sitePointId: string | null`, `executionStatus: not-executed`. |
| `generic` | `researchFocus` (at most 1,000 characters), up to 12 unique `hypotheses`, and up to 12 `namedAssumptions: {id,name,statement}[]` with unique IDs. |

The ASEAN default is immediate withdrawal, zero transition months, unresolved trade arrangements, five years and all three stakeholder groups. These are explicit hypothetical inputs. A default does not establish a feasible withdrawal procedure or continued treaty rights. Polyclinic defaults are five years, no location and unconfirmed service scope.

MRT/AAC fields reference existing plans and actual drawings. They do not reproduce confirmed engine inputs, timing, anchors or an accepted calculation. Referenced plot IDs must exist in the retained geometry with the appropriate point/line kind. Existing MRT/AAC calculators remain the execution owners.

## Identity and validation

All content identities use complete SHA-256 digests through browser Web Crypto. They detect content differences; they are not signatures, authentication or independent verification of evidence.

| Field | Meaning |
| --- | --- |
| `experimentId` | Unique saved record; generated with `crypto.randomUUID()` unless supplied. |
| `createdAt` | ISO UTC record creation time; excluded from content identity. |
| `scenarioIdentity` (`scenario-…`) | Question plus actual geometry identity. Configuration, UI revision, research attempt and record time are excluded. Different assumptions for the same question/context share a scenario identity. |
| `configurationIdentity` (`config-…`) | Complete validated configuration, including horizon, focus and notes. |
| `geometryContext.identity` (`geometry-…`) | Complete validated plot snapshot, retained as bounded canonical JSON in `canonicalContent`. `revision` is useful UI context, not content identity. |
| `evidence.snapshotIdentity` (`sha256-…`) | Evidence content and source verification metadata under the evidence contract. Research attempt ID and replay creation time are excluded. |
| `executionInputIdentity` (`input-…`) | Scenario, configuration and geometry identities; evidence snapshot identity or explicit absence; limitations, horizon, focus and execution boundary. Record ID, record time and research attempt are excluded. |

`createGeometryContext(geometry, revision)` retains actual bounded plotting data with a derived summary. `scenarioIdentityFor(question, geometryContext?)` and `configurationIdentity(configuration)` can be computed independently.

`createExperiment({question, configuration, evidence, geometryContext?, experimentId?, createdAt?})` embeds the full evidence snapshot, or the explicit value `null`. Evidence must match the scenario identity. `parseExperiment(value)` validates structure and returns a detached frozen record. `validateExperiment(value)` additionally recomputes all content hashes and verifies evidence through its own contract. Use the asynchronous validator at import, storage and other trust boundaries.

Parsers reject unknown fields, unsupported versions, non-data accessors, custom prototypes, malformed dates, duplicate IDs, invalid coordinates, excessive counts and oversized payloads. They do not execute imported getters. Records are limited to 220,000 UTF-8 bytes; geometry canonical content to 150,000 characters.

## Local registry and comparison

`loadExperiments(storage?)`, `saveExperiment(record, storage?)`, `exportExperiments(records)` and `importExperiments(json, existing = [])` are asynchronous and validate hashes. The default storage is browser `localStorage`, key `impactlens.experiments.v1`. A supplied storage object needs `getItem` and `setItem`.

The version-1 JSON envelope is `{version:1, experiments:[…]}`. It contains complete evidence, rather than an evidence ID that cannot be resolved offline. Up to 24 records and 2,000,000 UTF-8 bytes are supported. Import validates the complete merge before returning. An identical existing record is idempotent; a conflicting record with the same ID is rejected. Duplicate IDs inside an imported file are rejected. Storage failures and corrupted contents are reported. Data remains local until the user exports or otherwise shares it. Browser storage is not encrypted and concurrent cross-tab writes are not a transactional database.

`compareExperiments(a,b)` reports changed/unchanged labelled configuration fields; shared and differing source references, findings and evidence gaps; and source verification freshness. It compares content instead of treating a new research attempt as new evidence. Two absent snapshots have `snapshotStatus: missing`; one absent and one attached has `different`. The comparison is descriptive and never generates impacts or stakeholder responses. Its synchronous parser assumes records came through the asynchronous creation/import/storage boundary.

## Future Phase 7D handoff

`createScenarioExperimentInput(record)` produces `ScenarioExperimentInputV1`: deeply readonly TypeScript data and a runtime frozen, JSON-serialisable snapshot. It carries the question, scenario/configuration/geometry, embedded evidence or `null`, limitations, horizon, stakeholder focus, generic research focus and complete `executionInputIdentity`. `sourceExperimentId` retains lineage without changing input content identity.

`validateScenarioExperimentInput(value)` recomputes hashes, checks evidence/scenario correlation, validates plotted references, requires the derived limitations and checks that duplicated horizon/focus values agree with the configuration. Missing evidence adds `No evidence snapshot attached. Research is still required.` The handoff cannot claim agents have executed. A future consumer must still supply and validate its own execution model, assumptions, safeguards and outputs.

The complete JSON fixture is [`lib/experiments/fixtures/asean-phase7d-input.json`](../lib/experiments/fixtures/asean-phase7d-input.json). It contains two checked official source snapshots with excerpts, dated verification metadata, findings and unresolved questions. It is a future input fixture, not a simulation result.

Focused verification without preparation hooks:

```powershell
node --test lib/contracts/tests/experiment-configuration.test.ts lib/contracts/tests/experiment-identity.test.ts lib/contracts/tests/experiment-record.test.ts lib/contracts/tests/experiment-persistence.test.ts lib/contracts/tests/experiment-comparison.test.ts lib/contracts/tests/experiment-handoff.test.ts
npx.cmd tsc --noEmit --incremental false
```
