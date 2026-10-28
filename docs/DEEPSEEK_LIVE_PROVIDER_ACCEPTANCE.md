# DeepSeek / DigitalOcean live acceptance

29 October 2026. Main `master`, committed HEAD `e1bcf793df9153bccf343456b849493e6278f510`. User-authorised paid testing ceiling: **USD 2 cumulative**. All changes remain unstaged and uncommitted.

## Confirmed failures and repairs

1. **Reasoning exhausted the completion allowance.** Baseline generation `gen-1793207356-sgdDaw9mZvQQNJCRJjDG`: HTTP 200, model `deepseek/deepseek-v4-flash-0731`, gateway-reported DigitalOcean, finish/native finish `length`, 750 input / 800 output tokens; all 800 output tokens were reasoning. Content was absent, so no action JSON existed. Cost USD 0.00027965. This confirms the reproduced non-stop error's cause, not a reconstructed body for the earlier historical generic incident.
2. **A subsequent role-reference rejection.** After disabling reasoning, normal JSON generation reached the local reference validator. Event/evidence/assumption targets were valid; an addressed-role reference was not. Its raw value was not retained. Bind the strict generated schema to the actual other-role IDs and available reference IDs, and exclude impossible first-turn interaction types. No invented IDs are rewritten or accepted.
3. **An application reservation stopped a valid run.** Seven accepted browser actions exhausted the old cumulative 120,000 reservation before the eighth request. Raise the bounded reservation to 214,400, covering eight maximum 24,000-byte prompts plus 800 output tokens and the existing 2,000 allowance per call. It is an application reservation, not billed usage or a prepaid account guarantee. The USD 0.05 soft run limit, eight-call cap and timeouts remain unchanged. Legacy records retain their original ceiling.
4. **Prompt growth stopped ASEAN locally.** After six accepted actions, repeated metadata made the next prompt exceed 24 KB before any network request. Compact the prompt, rather than increasing that limit: retain the current full role, question, assumptions, evidence, all available event IDs/statements/positions/uncertainties and bounded memory; omit repeated run IDs, prior explanatory summaries and duplicated other-role profiles. Full snapshots and accepted history remain unchanged. The same projection is used for reservation and transport.
5. **Strict semantic rejection remains intentional.** One normally finished import-tax completion failed `AI_ACTION_SEMANTICS`. Its exact subrule was unavailable; no unsupported claim about that subrule is made. The accepted three earlier turns remained visible. A one-call foreign-supplier reproduction passed. Future diagnostic captures retain a finite local rule index, not response prose. Invalid actions are never repaired, substituted or retried automatically.

Output limit before/after: **800 / 800** in application calls. Reasoning before: unspecified (metadata advertised default high). After: `effort:'none', exclude:true`; observed reasoning tokens: zero. Per-call deadline increased from 15 to 30 seconds after an observed interrupted sixth request; the whole-run deadline remains 120 seconds; at most four roles, two rounds, eight calls. Transport's independently bounded option range remains unchanged.

## Provider compatibility and safety

All paid calls used exactly `deepseek/deepseek-v4-flash-0731` through OpenRouter. Routing remains:

```json
{"provider":{"only":["digitalocean"],"allow_fallbacks":false,"require_parameters":true}}
```

Metadata discovery showed DigitalOcean supports reasoning, JSON Schema and structured outputs for this model. No provider/model substitution, automatic retry, fallback or relaxed runtime validator was introduced. Every accepted call verified gateway-reported serving model and DigitalOcean identity. This is gateway attribution, not an independent audit of the physical serving infrastructure.

OpenRouter documents that reasoning and visible completion share the output allowance; hiding reasoning alone does not disable its token consumption. The explicit `none` effort was also checked against the actual model metadata. References: [reasoning controls](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens), [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs), and the public model endpoint metadata at `https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-flash-0731/endpoints`. No paid request is needed to inspect those metadata pages.

## Safe diagnostics

The browser receives optional, strictly parsed per-call `termination` information: HTTP status, finite finish/native-finish labels, reasoning tokens, output cap, JSON validity and action validity. Unknown labels become `other`. Missing data stays null. It also retains generation ID, safe model/provider identity, usage, nullable cost, duration and finite rejection code. No credential, authorization header, provider response body, prompt or private reasoning text is persisted by diagnostics.

The opt-in `scripts/testing/live-provider-debug.mjs` maintains the ignored `tmp/live-debug/ledger.json`. Before each completion it reserves USD 0.05, checks the cumulative USD 2 ceiling, exact model/provider route and output bounds, and retains an unknown/interrupted reservation instead of counting it as free. There is also a 64-completion ceiling. All tests are sequential. Known reported cost replaces the conservative reservation. The normal application does not import this tool. Ordinary Node tests mock HTTP and incur no inference charges.

Ledger entry 1 originally treated `JSON.parse(null)` as valid JSON in the diagnostic harness. It was explicitly corrected to `jsonValid:false`, with a correction note; absent content is not an action document. This did not affect application validation or acceptance.

## Actual browser acceptance

Real production Next.js server on owned loopback port **3150**, with the spending-guard preload and existing local credentials. The existing main-worktree development server on port 3000 was identified and left untouched. No mock provider preload was used for live acceptance.

- Import-tax run completed with four distinct fictional roles, including `foreign-supplier`, and two rounds. Earlier accepted events were supplied to later calls. The earlier successful import run had 14 recorded event references; the final compact-prompt run had eight events and exactly 12 recorded event-reference relationships; the three-level inspector opened. Report displayed live-LLM mode, domestic and international sections, unresolved tax instrument/rate/coverage and no verified-source attachment.
- After compaction, ASEAN completed eight live actions over four roles/two rounds. Graph: **40 nodes, 150 edges, eight events, 16 event-reference edges**. Report retained two historical evidence replay labels, source dates/unknown-date disclosure and synthetic/forecast limitations. Input/evidence fingerprints and run identity remained inspectable. No source was represented as freshly retrieved by inference.
- The separate deterministic ASEAN demonstration and controlled cancellation/race checks are recorded below. They are not paid LLM evidence.

Safe positional/interaction metadata and screenshots are local ignored artifacts under `tmp/live-debug/`; full prompts and provider response bodies are excluded. The final accounting/browser summary follows below.

## Regression and preservation

Focused regressions reproduce reasoning-only `length`, context-specific reference constraints, late prompt growth, reservation mismatch, strict semantic/reference rejection, finite diagnostics, legacy records and oversized local context without a paid call. Existing timeout, cancellation, stale A→B→A, provider mismatch, partial history and no-retry cases remain in the suite.

Six model CLIs and 19 GIS tests were run; no Overture acquisition/preparation or raw-data changes. The eldercare prepare command needed the normal local derived-file write permission after a sandbox EPERM, and succeeded on rerun. MRT/AAC formulas, demographic weights, citizen/plot/planner contracts, building licences and secondary worktree were not modified.

Private `.env.local` content matches its pre-task SHA-256 checksum. Credentials were loaded process-locally, never printed or copied to source. Pre-existing `next-env.d.ts` content is restored after Next's build-generated rewrite. No staging, commit, merge, reset, stash, branch synchronisation, push or deployment occurred.

## Exact maintained-file inventory

- `lib/server/inference/deepseek.ts`: explicit reasoning setting, strict context-specific schema, compact prompt, safe diagnostics.
- `lib/server/inference/service.ts`: consistent bounded reservation and compact-prompt accounting.
- `lib/stakeholder-simulation/inference-errors.ts`: finite diagnostic categories/termination types (new from the preserved initial investigation).
- `lib/stakeholder-simulation/inference-contract.ts`: strict optional termination parsing and legacy reservation compatibility.
- `lib/stakeholder-simulation/engine.ts`: retain finite rejection codes, including local input-size rejection.
- `lib/question-simulation/errors.ts`: safe user-facing categories.
- `components/question-console.tsx`: display safe individual-call termination details.
- `lib/contracts/tests/deepseek-transport.test.ts`
- `lib/contracts/tests/inference-error-diagnostics.test.ts` (new from initial investigation)
- `lib/contracts/tests/inference-live.test.ts`
- `lib/contracts/tests/question-live-contract.test.ts`
- `scripts/testing/live-provider-debug.mjs` (new, opt-in paid diagnostic tooling)
- `docs/DEEPSEEK_ACTION_DIAGNOSTICS.md` (preserved and extended)
- This new report and `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`.

`next-env.d.ts` is pre-existing pending work, outside the inference correction. Ignored logs/screenshots/ledger/backups are not staged. No dependencies were added.

## Reproduction and limits

1. Keep existing server-only OpenRouter credentials and explicitly enable `STAKEHOLDER_LIVE_ENABLED` in the process. Do not copy keys into commands or chat.
2. Run ordinary tests and build first. For a newly authorised paid diagnostic, `node --env-file=.env.local scripts/testing/live-provider-debug.mjs import-tax one` makes one real call. `pair` makes two; `rounds` makes four. `foreign` uses **three scripted fixture context turns plus one real action** and is not full live acceptance. `full` makes up to eight real calls. Preserve the existing cumulative ledger; do not erase it to bypass the budget.
3. For guarded browser acceptance, create an ignored ESM preload that imports `budgetFetch` from that script and assigns `globalThis.fetch=budgetFetch`. Start the built Next server with `--env-file=.env.local --import <preload>` on a free loopback port. This is real inference, not a fake completion transport. Check ownership before stopping a server.
4. Enter the exact import-tax or ASEAN question, Start, wait for validated completion, inspect usage, Knowledge Graph and Report. Do not automatically repeat a failed paid run; inspect its finite error first.

These are fictional qualitative model-generated stakeholder statements, not actual company decisions, population-weighted behaviour or economic/diplomatic forecasts. Live outputs remain stochastic and can be correctly rejected. Arbitrary long inputs/evidence can still hit explicit size/time/cost limits. There is no guarantee every future request completes; failures retain accepted history and never silently substitute a script. No additional live call is necessary merely to verify the original repair once the recorded full browser acceptances below are complete.

## Final acceptance and accounting

**60 paid completion attempts; 55 accepted actions, one incomplete, one role-reference and one semantic rejection, one HTTP 429 and one interrupted timeout.** Known reported cost: **USD 0.0178270806**. Two unreported charges (calls [45, 52]) retain USD 0.05 each, so conservative cumulative budget accounting is **USD 0.1178270806**, below USD 2. No further paid request is required for this repair. No unknown cost is counted as zero.

- Final import-tax: `run-f1cc7f1587e86ff691dac653-attempt-5-1c6d33ac-b07f-4ce7-8d18-276ece9be68d`; four roles, eight events, two rounds; 17034 input / 3727 output tokens; USD 0.0024753904; 29294 ms. All eight HTTP 200, stop/native stop, zero reasoning tokens, JSON/action valid, completion serving identity verified. Graph: 27 nodes, 84 edges, eight events and 12 prior-event uses relationships.
- ASEAN: `run-3392656b4cf61fdfb54acae7-attempt-5-174a9999-a6bd-44cf-bf52-b7bec4b3c5e4`; four roles, eight events, two rounds; 18337 input / 3573 output tokens; USD 0.0023500834; 34116 ms. All calls verified and accepted. Two source records/two findings retained. Graph: 40 nodes, 150 edges, eight events, 16 prior-event uses relationships.
- Each role retained two accepted events within memory limit six; concerns and uncertainty arrays remained bounded. Earlier IDs and role/source lineage passed the authoritative engine and browser validators. Position changes were not required or fabricated.
- The temporary HTTP 429 was preserved as partial, with no automatic retry or substitution. An unpaid quota check did not indicate exhausted credits, but could not explain the upstream limit; its deprecated rate-limit field was not treated as authoritative. A later single authorised action verified recovery. A separate request then exceeded 15 seconds; raising the bounded default to 30 seconds (still a 120-second whole-run cap) passed a fake-clock regression and the final full browser run. The timeout may have been network/upstream latency; no undocumented native finish reason is invented.
- One initial browser status refresh returned unavailable even though the later endpoint check showed configured/enabled. Explicit status refresh recovered before paid execution; no credential change occurred. Its exact transient cause was not established.
- Desktop/mobile Report checks at 1920?1080, 1440?900, 1024?900 and 390?844: no document horizontal overflow, one map canvas. Mobile graph navigation remained usable; the three inspector levels worked. Eight safe finish-detail rows displayed. DOM credential-pattern check found none (a limited check, not a general security proof). One registered citizen custom layer remained on the map. Final browser error/warning collection: zero.
- Controlled browser **mocked** cancellation and A?B?A delayed-response cases made no provider call and left zero stale events. With only connection status mocked disabled, the explicit scripted ASEAN action used the real V1 API and produced 18 labelled scripted events; it was never substituted into a live run. The paid ledger stayed at 60.
- Final verification: **618 Node tests passed, 0 failed/skipped; 61 focused tests; application TypeScript; explicit strict inference/test TypeScript; production build; six CLIs; 19 GIS tests; `git diff --check`.** Paid compatibility is proved by the real runs above; mocks only prove repeatable failure/lifecycle cases.

Screenshots inspected: `tmp/live-debug/final-report-390.png`, `final-report-1440.png`, `final-usage.png`, earlier `import-graph.png`; additional four-width report captures, mobile graph, and ASEAN report are in the same ignored directory. Safe run/event/identity metadata: `finalImportSafe.json`, `finalAseanSafe.json`, graph summaries, `responsive.json`, `controlledRecovery.json`, `mapIntegrity.json`. The local opt-in ledger holds generation IDs. No complete provider body or private prompt was saved.

### Completion ledger

Every row requested the exact mandated model and DigitalOcean-only route. `DO` means returned DigitalOcean/model metadata was verified; `?` means unavailable, never inferred from routing. Tokens are reported input/output/reasoning. Running accounting includes conservative reservations.

| Call | Actual provider | Finish / error | Tokens (in/out/reasoning) | Reported USD | Cumulative accounted USD |
|---:|---|---|---|---:|---:|
| 1 | DO | AI_RESPONSE_INCOMPLETE | 750/800/800 | 0.00027965 | 0.00027965 |
| 2 | DO | AI_ACTION_REFERENCE | 671/259/0 | 0.000141491 | 0.000421141 |
| 3 | DO | stop | 671/299/0 | 0.0001266398 | 0.0005477808 |
| 4 | DO | stop | 671/331/0 | 0.0001098846 | 0.0006576654 |
| 5 | DO | stop | 1109/358/0 | 0.0001928038 | 0.0008504692 |
| 6 | DO | stop | 671/295/0 | 0.0001256878 | 0.0009761570 |
| 7 | DO | stop | 1103/414/0 | 0.0002054178 | 0.0011815748 |
| 8 | DO | stop | 1731/459/0 | 0.0002908598 | 0.0014724346 |
| 9 | DO | stop | 2304/515/0 | 0.0003480036 | 0.0018204382 |
| 10 | DO | stop | 1438/260/0 | 0.000233002 | 0.0020534402 |
| 11 | DO | stop | 1832/424/0 | 0.0002214352 | 0.0022748754 |
| 12 | DO | stop | 2397/403/0 | 0.0002836722 | 0.0025585476 |
| 13 | DO | stop | 2918/428/0 | 0.0003516212 | 0.0029101688 |
| 14 | DO | stop | 3575/493/0 | 0.0004452742 | 0.0033554430 |
| 15 | DO | stop | 4208/495/0 | 0.000496706 | 0.0038521490 |
| 16 | DO | stop | 4792/504/0 | 0.0006902 | 0.0045423490 |
| 17 | DO | stop | 1429/344/0 | 0.000251923 | 0.0047942720 |
| 18 | DO | stop | 1878/363/0 | 0.0002123912 | 0.0050066632 |
| 19 | DO | stop | 2392/423/0 | 0.0002878372 | 0.0052945004 |
| 20 | DO | stop | 2925/526/0 | 0.0003757782 | 0.0056702786 |
| 21 | DO | stop | 3676/470/0 | 0.0004518192 | 0.0061220978 |
| 22 | DO | stop | 4314/529/0 | 0.0005417832 | 0.0066638810 |
| 23 | DO | stop | 4931/533/0 | 0.0006161582 | 0.0072800392 |
| 24 | DO | stop | 5182/536/0 | 0.000744226 | 0.0080242652 |
| 25 | DO | stop | 1729/377/0 | 0.000295477 | 0.0083197422 |
| 26 | DO | stop | 2228/425/0 | 0.000244426 | 0.0085641682 |
| 27 | DO | stop | 2786/602/0 | 0.000352954 | 0.0089171222 |
| 28 | DO | stop | 3536/589/0 | 0.00043911 | 0.0093562322 |
| 29 | DO | stop | 4384/602/0 | 0.000543116 | 0.0098993482 |
| 30 | DO | stop | 5135/578/0 | 0.0006024018 | 0.0105017500 |
| 31 | DO | stop | 1359/305/0 | 0.000234311 | 0.0107360610 |
| 32 | DO | stop | 1604/328/0 | 0.0001714552 | 0.0109075162 |
| 33 | DO | stop | 1839/455/0 | 0.0002296462 | 0.0111371624 |
| 34 | DO | stop | 2119/383/0 | 0.0002458302 | 0.0113829926 |
| 35 | DO | stop | 2493/460/0 | 0.0003086622 | 0.0116916548 |
| 36 | DO | stop | 2776/435/0 | 0.0003363892 | 0.0120280440 |
| 37 | DO | stop | 3055/521/0 | 0.0003900582 | 0.0124181022 |
| 38 | DO | stop | 3092/686/0 | 0.0004337312 | 0.0128518334 |
| 39 | DO | stop | 1108/303/0 | 0.000203966 | 0.0130557994 |
| 40 | DO | stop | 1359/397/0 | 0.0001830934 | 0.0132388928 |
| 41 | DO | stop | 1623/434/0 | 0.0002233154 | 0.0134622082 |
| 42 | DO | AI_ACTION_SEMANTICS | 1931/483/0 | 0.0002716294 | 0.0137338376 |
| 43 | DO | stop | 1056/281/0 | 0.000192542 | 0.0139263796 |
| 44 | DO | stop | 1108/332/0 | 0.000210868 | 0.0141372476 |
| 45 | ? | AI_RATE_LIMIT | unknown/unknown/unknown | unknown (0.05 reserved) | 0.0641372476 |
| 46 | DO | stop | 505/282/0 | 0.000127211 | 0.0642644586 |
| 47 | DO | stop | 1102/303/0 | 0.000203252 | 0.0644677106 |
| 48 | DO | stop | 1331/319/0 | 0.0001611974 | 0.0646289080 |
| 49 | DO | stop | 1563/356/0 | 0.0001976114 | 0.0648265194 |
| 50 | DO | stop | 1809/337/0 | 0.0002223634 | 0.0650488828 |
| 51 | DO | stop | 2155/502/0 | 0.0003028074 | 0.0653516902 |
| 52 | ? | AI_TIMEOUT | unknown/unknown/unknown | unknown (0.05 reserved) | 0.1153516902 |
| 53 | DO | stop | 1093/349/0 | 0.000213129 | 0.1155648192 |
| 54 | DO | stop | 1342/345/0 | 0.0001686944 | 0.1157335136 |
| 55 | DO | stop | 1596/469/0 | 0.0002284324 | 0.1159619460 |
| 56 | DO | stop | 1878/414/0 | 0.0002489004 | 0.1162108464 |
| 57 | DO | stop | 2326/546/0 | 0.0003336284 | 0.1165444748 |
| 58 | DO | stop | 2661/499/0 | 0.0003623074 | 0.1169067822 |
| 59 | DO | stop | 3018/475/0 | 0.0003990784 | 0.1173058606 |
| 60 | DO | stop | 3120/630/0 | 0.00052122 | 0.1178270806 |

Stages: 1 original reasoning exhaustion; 2 role rejection; 3 accepted single; 4?5 pair; 6?9 two-role/two-round; 10?16 first browser reservation stop; 17?24 first complete import-tax browser run; 25?30 ASEAN input-size stop; 31?38 complete compact ASEAN; 39?42 semantic partial; 43 one live foreign action with scripted diagnostic context; 44?45 rate-limited browser attempt; 46 post-cooldown single; 47?52 timed-out browser attempt; 53?60 final complete import-tax browser run. Local rejections before HTTP are not counted as paid attempts.
