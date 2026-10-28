# Phase 7A implementation plan

Start: clean main `master` at `4400f47268663a848ca59d55c6f140dda80c97cc`. Remain in this worktree; no Git mutations, environment/raw input/engine changes. The user's detailed written design authorises direct implementation without another approval round.

Design: Singapore's supplied HDB geometry is the hero. One persistent MapLibre canvas opens over an evidenced Tiong Bahru cluster, with illustrative 12 m heights and a wider-country control. Navy `#0b151d`, map slate `#243c45`, panel `#101c25`, text `#e7eff1`, muted `#9bafb9`, restrained teal `#71d6d0`. Keep local Segoe UI typography, 40 px composer question and compact supporting copy. Avoid hero statistics and extra floating cards. Desktop composition: live map ~75% / minimum-readable right composer ~25%, with a narrow non-interactive gradient seam. Mobile: visible upper map plus readable composer below, no custom gesture sheet.

State: composer/request/validated plan remains separate from active configuration, MRT draft/results, AAC draft/results and existing AI/citizen states. Reuse browser-safe Phase 7B parsers and registry; an external revision-gated client store allows deterministic race tests. Explicit confirmation starts a fresh relevant scenario, clearing its previous results. Back navigation preserves the in-progress draft; a separate existing-workspaces entry keeps the complete legacy toolset accessible. No arbitrary engine dispatch or unsupported substitution.

Composition: retain map in its current tree position while switching CSS layout and side-panel visibility. Add a composer and finite plan view. Guided configuration reuses actual MRT/AAC editors, with ordered steps and advanced timing disclosure; explicit calculation opens actual results and clear demographic navigation. Landing clicks explore only. ResizeObserver maintains the map camera/canvas; no second renderer/loop.

- [x] Planner client/hook + failing tests: request validation, exact parser correlation/hash, provider notices, edit/reset/supersession/A→B→A races and browser import boundary.
- [x] Finite interpretation component/helper + fixture tests: two supported configuration actions, honest research/planned states, no false readiness/execution.
- [x] Parent: landing/composer/guided composition, map interaction isolation/opening camera/buildings, preserved advanced tools/results.
- [x] Real desktop/1920/tablet/mobile browser flows, delayed/corrupted responses, safe text, existing engines/profiles/animation and no-key states.
- [x] Independent review, sequential six CLIs/tests/TypeScript/build/whitespace and raw-byte comparison.
- [x] Phase 7A report + central roadmap/README with actual outcomes and unresolved 7C/7D/Phase 4 limits. Leave uncommitted.
