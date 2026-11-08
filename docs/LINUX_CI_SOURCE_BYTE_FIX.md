# Persistent Linux CI: source-byte identity failure

Investigation: 8 November 2026. All four workflow runs covering the five latest commits fail at the snapshot/archive test step. Dependency installation and service/shell checks pass; production build and server smoke are skipped.

| Commits | Failed workflow |
| --- | --- |
| `f948ca7` — decision usefulness pilot | [42392234590](https://github.com/tetashler/ImpactLens/actions/runs/42392234590) |
| `b8c1be7` — controlled MRT options | [42367886839](https://github.com/tetashler/ImpactLens/actions/runs/42367886839) |
| `a0b788d` — inspectable findings; `c2506bb` — cleanup (same push) | [42360362735](https://github.com/tetashler/ImpactLens/actions/runs/42360362735) |
| `2d9c01c` — persistent deployment | [42346834410](https://github.com/tetashler/ImpactLens/actions/runs/42346834410) |

## Root cause

Two tests in `lib/contracts/tests/citizen-data-server.test.ts` assert the accepted citizen identity and preserved snapshot/manifest bytes. On Windows they receive `citizens-127577cd81ceb3342fd1103b9acb0b182683d795039737e548f15067f793f62c`; Linux receives `citizens-ee901a866915daf8e29c127dea3c20a41a6e5065c167e4d3dc7e6e06168fdafc`.

The boundary GeoJSON was stored in Git with LF endings but checked out on Windows with CRLF. `buildSocietyGeography()` hashes its raw bytes, and that hash is part of the citizen manifest and dataset identity. The Windows geometry hash is `77e30aa02b1784b649d9b6f23e3b2ebb825af787de554f3a3fb76bbee3013c42`; LF gives `db8171786e0ebc83319a00ef091800ba9f0d3c6104a19b3308fb9690e5b9d3c9`.

An in-memory calculation replacing only the geography source hash with its LF equivalent reproduced GitHub's exact failing citizen ID. The source descriptions and parsed geography did not change. This failure predates the report/comparison/pilot features; it was already present on the first persistent-deployment workflow.

## Repair

- `.gitattributes` marks the byte-identified Census, geography, OD, exit and stop-crosswalk inputs `-text`, so Git cannot silently clean/smudge them according to the checkout platform. CR is permitted at line endings for these retained source files.
- The boundary GeoJSON, exit GeoJSON and `stops.txt` are retained in Git with the exact CRLF bytes already accepted by the existing immutable identities and transport pins. Their Windows working-tree bytes are unchanged. Their differences from the prior Git blobs are line endings only, verifiable with `git diff --ignore-space-at-eol -- data`.
- The already-LF Census and OD files receive the same byte-preservation policy without changing their content.
- New `persistent-deployment-source-bytes.test.ts` tests raw SHA256 pins and runs Git's clean filter under both `core.autocrlf=true` and `false`. It is automatically selected by the existing workflow wildcard.

The fix does not change accepted hash constants, weaken validation, regenerate saved datasets, rewrite archives or disable any CI tests. The three source-file byte changes must be committed together with `.gitattributes`; changing attributes alone cannot fix previously stored LF blobs.

## Verification and limitations

The new regression was observed failing before the attribute fix. Git export verification uses an isolated temporary index and `core.autocrlf=false`, checking that a fresh export retains the accepted source bytes, then runs the workflow's exact test selection. The user's index, branch and source bytes are not modified by that export; temporary files are removed without following links.

This computer has no installed Linux/WSL distribution. Local POSIX-only singleton tests therefore remain skipped; a Linux Actions rerun after pushing is required before claiming the complete deployment workflow is green. The earlier red workflow runs will remain historical failures.

Verified on 8 November 2026:

- A fresh temporary Git export with `core.autocrlf=false` and the pending source-byte repair retained the exact accepted raw files. The workflow's complete test selection returned **46 passed, 0 failed, 1 Linux-only test skipped**. Evidence: `tmp/deployment-clean-export-verification.log` and `tmp/deployment-clean-export-tests.log`.
- Source identity, citizen persistence and transport-source tests returned **21 passed, 0 failed**, including the unchanged legacy citizen/snapshot/manifest identities. Evidence: `tmp/deployment-byte-identity-tests.log`.
- TypeScript `--noEmit` and whitespace checks passed. `git diff --ignore-space-at-eol -- data` is empty.
- An initial run inside the OneDrive workspace hit an unrelated `EPERM` on an archive test directory rename; the same selection passed in the isolated export outside OneDrive. No archive test or production storage behavior was changed to suppress that local failure.

No application deployment, CI rerun or push was performed. The repair remains uncommitted, and live Linux build/server acceptance is still pending the next push.
