# UI redesign: chart-room theme (2026-11-03)

The visual theme changes are presentation-only. Later, user-approved relationship explanations also changed aggregate server projections and graph contracts; see `handoff-ui-and-relationship-explanations-2026-11-03.md` for that scope and the subsequent repair verification.

## Design direction

- **Header:** dark navy bar (`#0e2030`) is the single dark anchor; tabs are a pill switcher.
- **Surfaces:** cool chart-paper greys (`--bg #e8edf1`, `--surface #f8fafb`, `--line #d0dae2`).
- **Action colour:** sea blue `#0a5f86` (primary buttons, focus rings, selected states).
- **Type:** Bricolage Grotesque (headings, `--font-display`) and Instrument Sans (body, `--font-text`), loaded with `next/font/google`.
- Colour remains a presentation role, never a policy verdict or evidence rating.

## Files

| File | Change |
| --- | --- |
| `components/workspace-redesign.css` | New. Loaded last (after `workspace-light.css`), re-tokens the light theme and restyles header, panels, map controls, graph and report. Desktop only (min-width 701px). |
| `components/workspace.tsx` | Imports `workspace-redesign.css`. |
| `app/layout.tsx` | Loads the two fonts and exposes them as CSS variables. |
| `components/knowledge-workspace.tsx` | Explorer tabs; removed hint text and archived note (below). |
| `lib/knowledge-graph/display.ts` | New light-theme categorical node palette. |
| `lib/knowledge-graph/renderer.ts` | Light graph styles (labels, edges, borders, focus) use the new palette. |
| `lib/plots/map-layer.ts` | Map label chip colours match the theme. |

## Changes by area

### Map
- Cleaner scenario sidebar, white inputs with a blue focus ring, rounded buttons, blue primary "Explore".
- Floating controls (3D view, render distance, layers, plot tools) are frosted cards with soft shadows.

### Knowledge graph
- Dotted survey-grid canvas.
- Empty state is a readable centred card.
- Graph colours: saturated categorical palette; all 16 colours keep at least 3:1 contrast on the paper canvas. Edges, labels and focus states use the navy/blue theme.
- Sidebar rework:
  - Removed "Colour: entity type; shape: record kind."
  - Removed the nested scrollbars; each list has one scroller filling the panel.
  - Entity types and Entity index are now tabs (**Entities | Types**). Typing in search switches to Entities; clicking Types clears the search.
  - Removed "Archived immutable context…" note on archived graphs (it overlapped the list). The note for non-archived graphs is unchanged.
- Canvas stops above a solid status strip so bottom nodes and Fit/Reset controls are no longer covered; status text sits on one row.

### Report
- Fixed a dark panel with unreadable dark text; the report is now a light document card on the grey-blue page.
- Tables get a navy header; metric tiles are white cards.

## Tests updated

- `knowledge-ui.test.ts`: asserts the "Colour: entity type" hint is absent.
- `light-knowledge-graph.test.ts`: focused edge colour expectation is now `rgb(10,95,134)`.

Related graph tests pass. In the last full contract run, one backend test ("fresh cold process prewarms the real immutable 10k proof…", about 155s) failed. It is unrelated to the UI and was not investigated.

## Not yet reviewed

- Node inspector popup and full-window details dialog.
- Populated Report sections (AI summary, detailed report, charts).
- Mobile layouts (new styles apply only at 701px and wider).

## Relationship explanations (backend exception)

Edge descriptions such as "1 explicitly assumed fictional social ties" said nothing about how two entities interacted. Links now carry aggregate detail, and the graph explains each relationship in plain language. The backend was in scope for this change only.

### What a recorded interaction now shows
- **What happened:** interaction mix, for example "1 comment and 2 replies".
- **Where:** the platform(s) it happened on. There is deliberately no time or time window.
- **About:** the top themes and argument types (concerns, questions, support...), taken from explicit accepted decision tags.
- **Outcome:** stance changes recorded after the person considered the other participant's posts (toward support or toward concern), or an explicit "no stance change recorded". Wording says this is an association, not proof of influence.
- **Direction:** "Ann replied to Ben twice" rather than a neutral link.
- Assumed ties read as starting conditions ("assumed neighbours / friends / online follow") that do not imply interaction. Transfers read as discussion carried from one environment to another.
- The "fictional / message content not shown" caveat is one collapsed "About this link" note instead of repeated on every edge.

### Privacy boundary (unchanged)
Only aggregate counts, platform names, theme labels and stance-change counts are exposed. No message text, quotes, event IDs or timestamps. Tests assert this.

### Code
| File | Change |
| --- | --- |
| `lib/society/public-contract.ts` | New `LinkDetail` and `SocietyLink`; `SocietySummary.links` uses `SocietyLink`. |
| `lib/server/society/link-detail.ts` | New `buildLinks(world)`: same links and counts as before, plus aggregate `detail`. Replaces the inline link code in `summary.ts`. |
| `lib/server/society/summary.ts` | Calls `buildLinks`. |
| `lib/knowledge-graph/edge-explain.ts` | New pure wording function `explainLink`. |
| `lib/knowledge-graph/contract.ts` | `KnowledgeEdge.detail` (`EdgeDetail`) with validation. |
| `lib/server/society/entity-graph.ts` | Edges use `explainLink` for label, description and detail. Edge ids are unchanged. |
| `lib/citizen-grounding/public-view.ts` | Link validation accepts the optional `detail` object. |
| `lib/knowledge-graph/renderer.ts` | Assumed links are dashed. |
| `components/knowledge-workspace.tsx` | Edge inspector shows headline, basis badge, What happened / Where / About / Outcome and the collapsed note. Legend shows recorded (solid) vs assumed (dashed). |
| `components/workspace-redesign.css` | Styles for the above. |
| `lib/contracts/tests/link-explanation.test.ts` | New tests: wording, aggregate-only detail, graph integration. |

### Existing runs
Runs created before this change have no link `detail`. Their edges get the new plain-language headline and labels, but show no where / about / outcome rows, because that data was never recorded. The wording never claims "no stance change" unless the run recorded detail. New runs get the full explanations.

### Other relationship types covered (found in a real run)
A real run also contained relationships built outside the social-simulation links, which showed raw labels such as `PROPOSED_INTERACTION` and `RECORDED_EVIDENCE_QUESTION`. These now have plain wording too:

| Source | Reads as | Basis |
| --- | --- | --- |
| Stakeholder turn (`RECORDED_*`) | "Volunteer asked for evidence from Planner", with topics and stance ("information seeking and became more conditional"). The statement text is not shown. | recorded |
| `PROPOSED_INTERACTION` | "could interact with", with the model's opportunity text | proposed (dashed) |
| Ontology relationships (`CONSULTS_WITH`, `hostsDiscussion`...) | "consults with", "hosts discussion" | proposed or reported by a source |
| `REPRESENTS_FICTIONAL_SCENARIO_ROLE`, `SIMULATED_PARTICIPATION`, `CREATED_FICTIONAL_GROUP`, `USES_SIMULATED_ENVIRONMENT` | "represents role", "took part on", "created group", "runs on" | assumed or recorded |

Edge `detail.basis` is one of `assumed`, `recorded`, `proposed`, `reported`. Assumed and proposed links are dashed. The inspector badge reads "Assumed connection", "Recorded in the simulation", "Model-suggested" or "Reported by a source".

### Design decision: `relationshipLabel` is unchanged
The AI node-summary cache key includes each edge's `relationshipLabel`. Changing it would have forced every saved run to regenerate its paid summaries. The raw kind stays in `relationshipLabel`; the plain label is `detail.label`, and the display prefers it.

### Not covered
The planning-stage graph in `lib/dynamic-scenarios/projection.ts` (before a run) still uses its original wording.
