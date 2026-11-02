# MRT confirmation review recovery — 2 November 2026

The user drew a route, added station dots and chose Explore. The server returned “Confirm the current station geometry and illustrative timing assumptions before calculating.”

The route/dot workflow had reached the confirmation gate. The interface problem was that Explore closed the Plot Tools panel containing the required controls, leaving a review message and technical location details without a direct recovery action. The handoff represents this result as intervention type `clarify`, so recovery cannot depend solely on `new_mrt_line`.

## Change

- MRT clarification now offers **Review MRT setup**, with short steps for an existing-station connection, station order and illustrative travel times.
- The button reopens the existing review panel and focuses its MRT heading. It does not clear drawings, change station selection, accept assumptions or send another request.
- Technical location details are collapsed for this MRT review. Other clarification cases can reopen their drawing controls.
- Existing server geometry, exact interchange and timing-confirmation checks remain unchanged.

## Verification

- A regression test failed before the change and passed afterward, including the actual `clarify` response type and lowercase “mrt” question.
- 21 focused map, drawing and client tests passed; three server handoff rejection tests passed.
- TypeScript and Git whitespace checks passed.
- Chrome UI check used actual Draw route and Station dot controls, with mocked review responses. It verified panel reopening/focus, unchanged geometry/revision/station selection, explicitly unchecked confirmations, and their inclusion only after ticking them. Two mocked Explore requests; zero paid calls and zero page errors.
- No new production build or real-provider simulation was run for this UI-only change.

Use the new button, connect at least one dot to an existing MRT station if needed, confirm the station order and illustrative times, then choose Explore again. A drawing alone does not establish network connectivity or train travel times.

The user's supplied image remains at [the screenshot](<evidence/Screenshot 2026-11-02 164233.png>). Task-local verification is under ignored `tmp/mrt-review-recovery-20261102/`.

## Follow-up: connected station still rejected

The user then connected an existing station dot and received the station-order rejection. Two defects were confirmed in source: the inspector sent point creation order while the server required travel order along the route; and interchange confirmation moved a mid-segment dot to the catalogue station without moving the alignment through it.

The browser and server now share the unchanged attachment algorithm in `lib/plots/route-stations.ts`. The inspector lists and submits every attached stop in route order. Manual point creation/reordering no longer changes travel order. Ambiguous or overlapping dots receive a specific local explanation.

`planConfirmedAnchor` validates an explicit connection before applying it. It retains the original bends and other station-dot coordinates, inserts needed waypoints, and updates the route through the exact existing station. Already-connected dots stranded outside the line have a **Reconnect … to route** action. The revised geometry must still be reviewed; confirmations bind to revision, selected route, stops, interchanges, service date and timing assumptions.

Fresh stores apply the drawing edit as one undoable operation. An already-open tab retaining the previous store implementation uses a validated load fallback to preserve the drawing during Fast Refresh; that one upgrade can reset drawing Undo history. Connection metadata remains separate from drawing history, as before. Undo therefore does not necessarily revoke an interchange when the original point already matched the exact station coordinate.

The selected draft route is retained even when fewer than two stops attach, allowing repair of a chosen route in a multi-route drawing. Only selections with at least two stops enter the browser's server request.

The user's local attempt namespace was also full: 16 claims and 7 bindings. The bounded ceiling is now 32, preserving all existing records, format and per-run budgets. See [capacity repair](MRT_REVIEW_ATTEMPT_CAPACITY.md). No production claim was deleted, reclaimed or reserved by the tests.

The Chrome test draws a line, adds three dots in a different creation order, connects the middle dot to Tiong Bahru, confirms the revised setup and checks it with the actual server `buildHandoffContext` and served catalogue. The confirmed selection passes; other dot coordinates and identities remain unchanged. Explore responses are mocked after validation so no impact calculation, initialization or paid provider request runs. Logs remain under `tmp/mrt-station-order-fix-20261102/`.

Final combined verification passed **113 tests**, TypeScript and the browser/server-setup check with zero page errors and zero paid calls. This is setup acceptance, not a new full real-provider simulation. No additional production build was run for this follow-up.
