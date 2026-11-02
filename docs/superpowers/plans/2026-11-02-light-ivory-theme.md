# ImpactLens muted paper desktop theme

**Approved direction:** Light ivory background, white panels, dark readable text and restrained teal accents, matching a planning-document workspace. This replaces the dark primary desktop colour, not the application behaviour.

**Review adjustment:** The user found the initial ivory/white version too bright and requested appropriate contrast research. Reduce the brightness of large reading surfaces and the geographic basemap, while retaining dark text and clear input boundaries. White remains the text colour on dark action buttons; reading panels use muted paper.

**Scope:** Desktop only. Preserve the pending semantic-colour work, existing mobile layout, official MRT line identities, graph data/physics, model calculations, APIs, inference and generated report prose. Leave all changes unstaged and uncommitted.

**Architecture:** One final scoped light-theme stylesheet overrides the existing presentation tokens and dark legacy surfaces. A small viewport appearance hook passes a presentation-only light/dark option to the graph and map, so canvases match the surrounding panels. Dark rendering remains the default for legacy/headless callers.

**Final palette:** page #D3D9D0; panel #E4E8E0; raised #CBD5C9; graph #DDE3D9; primary text #172B2B; secondary/muted #43595A; action #00635A with white text; information #245F8A; completion #246544; attention #70490D; error #9B332F; control boundary #63776D. The basemap's maximum raster brightness is .86 with .94 raster opacity; official MRT colours and geometry remain unchanged.

## Contrast research and application

[WCAG 2.2 text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) specifies at least 4.5:1 for ordinary text and 3:1 for large text. ImpactLens uses the ordinary-text target for captions, placeholders, metadata and status text as well as body copy. Lower background luminance does not require lower text contrast: darken foregrounds alongside the paper surfaces.

[WCAG non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) specifies at least 3:1 for essential control-identifying cues and meaningful graphics against adjacent colours. The scenario field uses a clear boundary and the keyboard focus outline uses dark teal. Decorative panel dividers can remain quiet; the guidance does not require every divider to achieve 3:1.

[WCAG use-of-colour guidance](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) requires information beyond colour. Keep named statuses, labelled graph types and record shapes, dashed proposed routes, and labelled time-change directions. Completion green describes a software process, not public support or proposal quality. Agreements and disagreements retain balanced neutral headings.

Measured rendered browser pairs on the final panel (#E4E8E0):

| Foreground role | Contrast |
|---|---:|
| Main text #172B2B | 11.94:1 |
| Labels and secondary text #43595A | 6.01:1 |
| Scenario field boundary #63776D | 3.85:1 |

The sixteen categorical graph fills were checked against the actual muted canvas (#DDE3D9), with every fill above 3:1 before interaction dimming. Selected graph relationships retain dark teal and readable label backplates. Deliberately dimmed unrelated context is not a claim that every graph state meets a complete accessibility audit.

These are targeted contrast checks, not a claim of whole-product WCAG conformance. Geographic raster labels are third-party cartography; reducing tile brightness is a visual treatment, not an accessibility certification of the map.

## Tasks

- [x] Apply muted paper surfaces consistently across the shell, form, map controls, graph sidebar/inspector, reports, dialogs and technical details
- [x] Supply light graph colours, readable canvas labels, restrained edges and clear selection, preserving all layout and data
- [x] Soften geographic basemap/building presentation while preserving official MRT route colours, geometry and calculations
- [x] Retain semantic status meanings with darker foreground colours, and retain labelled blue/orange estimates
- [x] Inspect desktop views at 1440x900 and 1920x1080 with mocked APIs; check contrast, no overflow, interaction and no provider calls
- [x] Run focused graph/map/report tests and TypeScript; confirm no staging or backend changes

Verification: 97 focused tests passed; `npx tsc --noEmit` passed. Isolated browser checks covered map, selected graph nodes, reports, the calculated time-change figure and keyboard focus at both desktop sizes, with no page errors, API writes or provider calls. Local screenshots and check logs are in `tmp/muted-paper-20261102/`. Changes remain unstaged and uncommitted for review; unrelated user file deletions and screenshots were preserved.

Based on unslop by Damir Sokolovsky (@heydamir), CC BY 4.0, and the previously researched SGDS/WCAG semantic-colour guidance. The product itself, rather than decorative imagery, remains the visual focus.
