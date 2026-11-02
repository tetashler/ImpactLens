# UI redesign: chart-room theme (2026-11-03)

Presentation-only changes. No backend, API or simulation logic was modified.

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
