# Phase 4D storage reliability repair

Run inline in the main worktree. The user authorises offline implementation and disposable probes without routine approval gates; no Git mutations, credential files, paid providers or unrelated directories.

## Evidence and design

The same exclusive-create/fsync/rename/replace/readback probe fails with EPERM in the restricted Codex account at both original stores, while succeeding as the normal Windows user at those exact paths. Temporary storage succeeds in either context. Directory metadata shows no read-only/reparse attribute. No ACL/security changes or automatic migration are justified.

Keep original defaults and trusted override. Add fail-fast, safe private-store admission before Explore can dispatch inference. Probe only unique owned files, preserve atomic/durable writes, return fixed diagnostics without paths/content. Passive history GET remains read-only.

## Tasks

- [x] Regression: unwritable accepted or journal store must reject before any provider adapter dispatch; default/override paths agree.
- [x] Implement disposable durable-store preflight and bounded safe failure envelope; test replacement failure cleanup and preservation.
- [x] Offline lifecycle runner: create accepted fixture, start/continue session, restart process, exact replay, history/summary restoration, no duplicate session/inference; default original paths as normal user and isolated trusted override.
- [x] Hash all existing default records before/after; clean only verified task-owned fixture/probe files.
- [x] Full tests, app/strict types, build and whitespace; mocked desktop 1440x900/1920x1080 with original default stores and blocked provider egress.
- [x] Document exact access-context cause/limits, configuration, history continuity, evidence and readiness. Stop owned server.

## Review focus

No provider dispatch when either store is unusable. Never serialize raw paths/errors. Never delete an unowned file. Default accepted and journal roots stay paired. Existing files and hashes remain unchanged. Restoration and navigation cannot trigger new inference. No workaround is labelled proof that the original path works.

Completed: normal-user original defaults and trusted override pass full mocked lifecycle, 55 original top-level hashes preserved, historical worlds restored read-only, 1,001 tests/types/build/desktop pass. Restricted default EPERM remains an explicit context restriction. Failure cleanup and awaited continuation write regressions repaired. No security or Git mutation.
