# Phase 7D / Phase 7E compatibility boundary

## Purpose

Phase 7E is being built independently in Terminal 1. This document specifies a narrow transfer boundary for Phase 7D; it does not assert that Terminal 1 already exports these types. Terminal 3 will translate once at this boundary if the eventual experiment contract differs. Phase 7D imports no nonexistent `ScenarioExperimentV1` or evidence module.

This converter and its valid/invalid snapshot cases are implemented and included in Terminal 2's final **435 passing Node tests**; the JSON example below was also parsed through the actual converter with four registered roles. This verifies the independent boundary, not compatibility with uninspected Phase 7E code. Terminal 3 must test its final translation against the actual Phase 7E contract after reconciliation.

Do not cast a larger Phase 7E object to this type or feed its extra application fields directly to the strict converter. Translate deliberately at one boundary. If its source/finding statuses or important provenance cannot be represented here, retain the caveat in the transferred evidence gaps or reject the conversion; do not silently promote unverified research into established facts.

The execution snapshot must identify the exact scenario, experiment, configuration and evidence used by a run. It must be versioned, bounded, fully serialisable, runtime-validated and immutable after execution begins. Provider credentials, environment values, raw source files, executable instructions and React/map state have no place in this transfer.

## Implemented converter

`convertExperimentSnapshot(value, options)` is exported by `lib/stakeholder-simulation/compatibility.ts`. It strictly accepts the following independent proposed transfer shape; unknown fields and versions are rejected. This is **not** a claim about Terminal 1's eventual application-wide experiment schema.

```ts
{
  version: 1;
  experimentId: string;
  scenarioIdentity: string;
  configurationIdentity: string;
  configuration: {
    question: string;
    assumptions: Array<{
      id: string; label: string; value: string;
      provenance: 'user-authored';
    }>;
    horizonYears: number;
  };
  evidence: EvidenceBundleSnapshotV1 | null;
}
```

Options are `{stakeholderRoleIds: string[], simulationOptions: {mode, rounds, seed, memoryEvents}}`. The converter resolves selected IDs against `getStakeholderRoles()`, rejects unknown/duplicate selections, then returns a detached `parseStakeholderInput` result. It does not run a simulation or mutate the originating experiment.

The input parser also requires the full profile definitions to match the current registered catalogue. Do not replace a title with a real official, append an invented biography or silently modify assumed interests while keeping a registered ID.

The resulting `StakeholderSimulationInputV1` contains the same identities plus `question`, `assumptions`, `horizonYears`, full selected `stakeholderRoles`, `evidence` and `simulationOptions`, with `version: 1`. Role IDs are `small-business`, `export-worker`, `supply-chain`, `policy-analyst`, `regional-cooperation` and `household`. Use 2–6 roles, 1–4 rounds, 1–8 memory-event slots and a 1–10-year horizon. HTTP requests are additionally capped at 96 KiB even though the core input parser permits 256 KiB.

```json
{
  "version": 1,
  "experimentId": "experiment-asean-a",
  "scenarioIdentity": "scenario-asean-immutable-a",
  "configurationIdentity": "configuration-a",
  "configuration": {
    "question": "What if Singapore left ASEAN?",
    "assumptions": [
      {"id":"withdrawal","label":"Withdrawal process","value":"immediate","provenance":"user-authored"},
      {"id":"trade-arrangements","label":"Post-withdrawal trade arrangements","value":"unresolved","provenance":"user-authored"}
    ],
    "horizonYears": 5
  },
  "evidence": null
}
```

An example options object is `{stakeholderRoleIds: ['small-business','export-worker','policy-analyst','regional-cooperation'], simulationOptions: {mode: 'deterministic-demo', rounds: 3, seed: 'phase7d-demo', memoryEvents: 6}}`. These are hypothetical experiment inputs, not factual assumptions about actual institutions or people.

Required meanings:

- `scenarioIdentity`: the originating scenario snapshot, not merely the question text.
- `experimentId`: the experiment that owns this immutable configuration.
- `configurationIdentity`: the configuration's external identity; Phase 7D also computes its own full input fingerprint instead of trusting this label as proof.
- Assumptions: explicit user-authored hypothetical setup, each with a stable ID; they are not factual research findings.
- Horizon: a counterfactual exploration window, not economic simulation time or a forecast.
- Roles: bounded fictional analytical participants with explicit assumed interests and constraints; no sampling weights or real-official impersonation.
- Evidence: a versioned snapshot with source/finding IDs and gaps. All referenced IDs must resolve locally. A URL is a link, never permission to fetch or an instruction to an agent.
- Simulation options: explicit execution mode, deterministic seed and bounded rounds/memory.

## Evidence snapshot

`EvidenceBundleSnapshotV1` is exported by the stakeholder contract and re-exported through `evidence.ts`:

```ts
{
  version: 1;
  id: string;
  sources: Array<{id: string; title: string; url: string; referenceDate: string}>;
  findings: Array<{id: string; sourceIds: string[]; statement: string}>;
  gaps: string[];
}
```

There are at most 20 sources and 40 findings; each finding references 1–5 existing source IDs. Source URLs require HTTPS without embedded credentials. Titles, statements and reference labels are bounded text; a reference label is not independent validation of publication date or accuracy. The evidence parser permits at most 100,000 bytes and returns a clone. No document upload, URL fetching, autonomous research or confidential-source transfer is implied.

The converter accepts `null` evidence explicitly. A bundle whose IDs or findings differ has a different content fingerprint even when its caller-supplied bundle ID is unchanged. Phase 7D computes full SHA-256 input/evidence fingerprints instead of trusting the external configuration identity. `verifyStakeholderRun` checks stored hashes and run identity before imports are accepted.

These checks establish structural/reference consistency and input binding. They do not digitally authenticate that an imported statement was originally emitted by the server or establish the truth of supplied source metadata. Keep imported/archive labels visible and never promote an archive automatically to the current scenario's active execution.

## Trust and comparability

Supplied evidence metadata does not establish source truth, legal interpretation or independent retrieval. Untrusted source text cannot override instructions, register tools or create citations. Unsupported claims remain uncertain; synthetic opinions retain their provenance even when they cite background evidence.

No evidence is a supported explicit state. Such a run is ungrounded exploratory dialogue with missing-evidence disclosure, no fabricated sources and no factual forecast. An incompatible/future-version bundle must fail parsing rather than be merged silently.

Changing assumptions, participants, evidence, horizon, seed or rounds creates a new input identity. Replays inspect stored events; they do not ask a provider to regenerate history. Run comparison describes configuration and synthetic event differences, not changes in real Singaporeans' attitudes or societal outcomes.
