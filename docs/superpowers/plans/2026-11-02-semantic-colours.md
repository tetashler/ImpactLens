# ImpactLens semantic colour implementation

**Approved specification:** Implement the colour research recommendation in the current desktop UI. Leave all changes unstaged and uncommitted for review. Preserve backend behaviour, saved records, numerical models, generated text, MRT service colours and existing mobile layout.

**Architecture:** A frontend-only semantic colour stylesheet supplies action teal, information blue, completion green, review amber, operational-error coral and readable neutral unknowns. Existing process/status fields drive presentation attributes only. A separate graph categorical palette avoids accidental hash collisions and is shared by the canvas, filters and entity index. Proposed route drawings gain a dash pattern; the existing MRT network remains unchanged. Existing commute outputs gain labelled blue/orange/neutral treatment without changing calculations.

**Colour pairs:** panel #122128; action #8ED9CD; information #9DC7F4; completion #88C99B; review #E8C07D; error #F29A94; unknown #B3C3CA; control border #607985. Keep dark text on filled teal actions. Ordinary text >=4.5:1; identifying boundaries >=3:1.

## Tasks

- [x] Add meaningful regression tests for categorical uniqueness/consistency, status semantics, unknown values and unchanged graph/metric data
- [x] Replace graph hash collisions with a deterministic per-graph palette, preserving dynamic types, labels and shapes
- [x] Add source-linked information, accurate process feedback and neutral unknown presentation; keep agreements/disagreements balanced
- [x] Distinguish proposed drawings with dashed lines and show signed commute estimates with a labelled zero reference
- [x] Verify field boundaries, desktop views, unchanged numerical values and no API/provider writes with isolated browser fixtures
- [x] Run focused graph/map/report tests and TypeScript; inspect diff for backend or dependency changes

## Constraints

- Research colours describe roles, not verification, public opinion or policy quality
- No new inference, source retrieval, sentiment inference or numerical calculations
- Graph type palettes are categorical; selection and provenance are independently labelled
- No staging, commits or pushes; preserve local screenshot edits

Design references: Singapore Government Design System semantic colour, Carbon categorical/alert palettes, and WCAG 2.2 1.4.1/1.4.3/1.4.11. Visual craft follows unslop by Damir Sokolovsky (@heydamir), CC BY 4.0.


## Verification

- 89 focused graph, renderer, plotting, report, commute and semantic-colour tests passed; TypeScript passed.
- Browser checks passed at 1440x900 and 1920x1080, with no horizontal overflow, browser exceptions, API writes or provider calls.
- Field boundary measured as #607985 against #122128 (3.59:1); report-ready feedback rendered #88C99B.
- The retained MRT example now uses nine distinct category colours for nine types; filtering and search retain the full-graph mapping. Curated colours are distinct through sixteen types; beyond that the labelled categorical key and shapes remain essential.
- Positive, negative, zero and unknown commute estimates have explicit labels; absent data never receives a fabricated zero. Server estimates and data structures remain unchanged.
- Review caught an unstyled mobile figure; the new figure/key are now desktop-only, leaving the existing mobile layout intact. No mobile redesign was undertaken.
- Added regression: initial stakeholder completion cannot colour an authoritative ongoing background job as complete.
- Backend/API/inference, model calculations, dependencies and existing MRT service colours are unchanged. Only frontend graph/plot presentation helpers changed under lib.
- Git index remains empty. All work is unstaged and uncommitted for user review; local screenshot changes preserved.
