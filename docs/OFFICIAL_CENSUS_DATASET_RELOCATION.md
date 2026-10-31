# Official Census dataset relocation

Date: 1 November 2026 (Singapore time). Main worktree: `master`, HEAD `039a9d5a45cfcf89f1e722b4f5f30df2ff075cdd`. The pre-existing citizen-grounding implementation and other unstaged work were preserved.

## Current directory structure

All four tables describe labour force, occupation or work-related travel, so they remain one source family under employment:

```text
data/employment/
  README.md
  singstat-census2020-ct17565/
  singstat-census2020-ct17582/
  singstat-census2020-ct17586/
  singstat-census2020-ct17594/
```

Each source folder contains `original.csv`, `README.md` and `source-metadata.json`. The shared index and all four complete folders were moved: 13 files total. The four CSVs and five README files are byte-identical. Metadata changed only its current `path` value; reversing that exact replacement reproduces each original metadata SHA-256. Source organisation, URLs, acquisition dates, reference periods, licence, exclusions, schemas and CSV pins remain unchanged.

| Census table | Unchanged original CSV SHA-256 |
|---|---|
| CT17565 | `3608447d9af126ac805edf9f23a371d7e5fb47057bfa64534e203c5fe38d3128` |
| CT17582 | `28af77107c5294c53de7cb9ea7f2d4c447329bc55101a762a40eaf23eee97da4` |
| CT17586 | `5a2fa157e0dc8d7df17813f0a1baab2be68f9985ed2e0c9badef761aaba33735` |
| CT17594 | `1b96701295e296913c98cbe0a6828e0395ab27fb3e18e4e1f7b526ace872a204` |

The retired `docs/datasets/` directory was removed non-recursively only after every transfer was accounted for, focused tests passed, active references were updated and the directory was verified empty. No symlink or old-directory read fallback was introduced.

## References and immutable provenance

- `lib/citizen-grounding/official.ts`: eight literal allowlisted filesystem assets and strict metadata validation now use `data/employment/`; CSV pins and source validation remain strict.
- `lib/citizen-grounding/generator.ts`: explicit `citizenManifestSourcesV1` serialization preserves the recorded source namespace in existing version-one content identities.
- `lib/citizen-grounding/contract.ts`: documents that a frozen manifest's `path` is historical provenance, not a live filesystem locator.
- `lib/contracts/tests/citizen-data-server.test.ts`: current reads use relocated assets; new regressions cover relocation, rejection of retired metadata locations, unchanged snapshot/manifest hashes and calibration.
- The current implementation report, its plan and development roadmap reference the new location. Dated acceptance results and fingerprints remain historical evidence; they were not replaced with new behavioural claims.

Existing immutable synthetic snapshots/manifests and accepted worlds retain their originally recorded acquisition-path strings. These are not opened as files. Rewriting them would change their content-addressed identity and violate preservation. New physical reads and source metadata use the relocated files; the version-one serializer records the original namespace only for known, hash-pinned official sources. Other source fields and current loader descriptors are not mutated.

The preserved dataset is `citizens-127577cd81ceb3342fd1103b9acb0b182683d795039737e548f15067f793f62c`: snapshot SHA-256 `6931c331515133f14511e20b2821ef1eac3983e63c4fee1564ecd5242675e65b`, manifest SHA-256 `890f1197561912daef6a8a8bf033d0e6530a105553278102cbd1907da6fadbd8`. In-memory verification reproduces these exact bytes; no stored population was regenerated. Calibration remains 1,403 rows: 1,369 within the declared allocation bounds, 34 explicitly unassessed, zero outside tolerance. These remain engineering allocation bounds, not empirical accuracy claims.

## Verification

| Gate | Fresh result |
|---|---|
| Focused data/calibration/MRT/API/society/recovery regressions | 61 / 61 PASS; 55.50 seconds |
| Full network-blocked Node suite | 1,543 / 1,543 PASS; zero failures/skips/cancellations |
| Main TypeScript | PASS |
| Strict affected-module TypeScript | PASS |
| Production build | PASS; 21.12 seconds, no warnings |
| Strict qualifying historical replay | 20 / 20 strict PASS; 148 historical file hashes unchanged; zero provider/network requests |
| Final whitespace | PASS |

The full suite and historical audit use the absolute-URI offline network guard. Focused tests exercised the real local station graph, OD/exit references, deterministic commute adapter, bounded API, trusted citizen-to-society initialization and exact recovery. Two new location-contract cases were observed failing before the migration and passing afterward. A fresh read-only relocation review found no Critical or Important issue.

Build tracing verified all eight relocated CSV/metadata assets in the citizen-impact route, zero retired-location file dependencies across all 23 server traces, and valid local links in the moved dataset index. The existing Next configuration needed no additional include/exclude rules; the narrow literal asset reads remain traceable.

Final preservation: 2,419 baseline files checked. 2,398 unrelated originals retained exact bytes/hashes, eight intended code/documentation files were edited, and thirteen dataset files were transferred with the verified CSV/README/path-only metadata rules. All four pre-existing synthetic snapshot/manifest files retain their exact hashes and file set; no stored population was regenerated. Historical archives, checkpoints, prior paid records and unrelated uncommitted work remain unchanged. The one pinned nonqualifying experimental archive remains preserved with its approved unresolved `SOCIAL_STALE` classification; no replay assertion or acceptance scope was relaxed.

**Verdict: PASS.** Live physical references are updated; recorded immutable provenance is preserved. No tabular data or numerical simulation contracts changed.

The final source fingerprint remains identical to the historical replay proof; `source-build.json` records it with the production build ID and unchanged Git HEAD.

Safe logs, the 13-file transfer inventory and verification results are retained under ignored `tmp/census-relocation-20261031/`. No OpenRouter/Tavily request, new paid ledger, credential edit, staging, commit, push or deployment was performed. No application server or browser was needed for this location-only migration.
