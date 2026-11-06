# Speech input implementation plan

**Goal:** Add an SVG microphone inside the bottom-left of the main Map question box. Click to record; click again to stop, transcribe with `openai/whisper-large-v3-turbo` through OpenRouter, and append the transcript through the existing question callback without submitting.

**Architecture:** Dedicated Node route/service handles bounded raw WebM recordings and the server-only `OPENROUTER_STT_API_KEY`. A browser recording controller owns asynchronous capture/cancellation; a React hook connects it to MapScenarioPanel. Keep existing scenario planning, geometry, review, chat providers and keys intact. Native browser APIs and fetch; no new dependency.

**Reference:** `Presentation/Speech_to_Text_Implementation_Research.md`. User's latest request overrides its preview/Insert proposal. Use the dedicated configured key, without requiring a second opt-in env setting. No automatic retry or live partial transcripts. Thirty-second capture limit, 1 MiB upload cap, 45-second server deadline. Handle permission denial, stale callbacks, view changes and character overflow without losing typed text.

## Tasks

1. Server agent: write failing native Node tests; implement `lib/server/speech/service.ts` and `app/api/speech/transcribe/route.ts`; document `OPENROUTER_STT_API_KEY` in `.env.example`. Prove exact payload, bounds, no secret exposure, cancellation/deadline, concurrency and error handling with mocked fetch. Never read/print key values or alter `.env.local`.
2. UI agent: build testable recording controller, native Node lifecycle tests and React hook; integrate an accessible inline SVG microphone at bottom left inside the textarea frame. Toggle recording, show status, cancel cleanly, append through `onQuestion`. Disable form submit while capturing/transcribing; preserve overflow for manual recovery. Add theme-compatible styles. Pass visibility from Workspace because hidden panels remain mounted. Keep all changes confined to agreed UI/client files.
3. Root: review tasks, verify integration, run focused tests and typecheck/build as appropriate. Use browser automation with mocked microphone/provider responses to check toggle, insertion, errors, stale work and icon position; do not trigger simulations or paid calls accidentally.
4. Independent final reviewer: check request compliance and lifecycle/security correctness; address substantive findings. Record evidence and remaining real-microphone/provider limitations.

## Progress

- Planning: complete. Research and current primary endpoint docs checked; installed Next route/client guides read.
- Ruling: automatic append instead of preview/Insert matches the explicit user interaction. Preserve concurrent user edits by appending only to latest question through the callback; do not auto-submit.
- Ruling: use dedicated key already provided; configured key enables this optional feature, no additional opt-in switch.
- Server: complete; exact payload, bounds, origin, cancellation/deadline and slot tests pass.
- UI: complete; SVG microphone at bottom left, native capture, automatic append and overflow recovery. Hidden-view/late-permission cleanup and current-text insertion covered by controller tests.
- Integration/review: complete; independent review found no actionable material issues.

## Verification evidence

- `node --test lib/contracts/tests/speech-input.test.ts lib/contracts/tests/speech-transcription.test.ts lib/contracts/tests/map-first-ui.test.ts`: **39 passed, 0 failed**. Both agents observed targeted failures before their implementations/fixes.
- `tsc.cmd --noEmit --incremental false`: passed.
- Actual running Next app GET `/`: HTTP 200; rendered question frame contains the labelled, non-submit SVG microphone.
- Actual running Next app POST `/api/speech/transcribe`: HTTP 200 using the dedicated configured key and fixed Whisper Large V3 Turbo model. A 29,973-byte offline-generated WebM clip saying “What if we built a new clinic near the train station” returned “What if we build a new clinic near the train station?” in 15,581 ms including development compilation/network time. One successful provider transcription was made; no automatic retry. Temporary audio/receipt are git-ignored under `tmp/speech-acceptance/`.
- The first route check failed locally with 403 before an upstream call. Root cause: Next builds an internal URL with its configured hostname. Added a failing regression and then matched Origin against the browser-facing Host using the existing app convention; arbitrary forwarded-host headers remain untrusted.
- `git diff --check`: passed.

## Limits of verification

- Browser automation navigation was rejected by the tool approval policy. Native microphone interaction and visual positioning were not verified in a real browser; capture/toggle behavior uses injected recorder tests, and markup/CSS were checked by rendering and code review.
- A broader `npm test` run was stopped incomplete after seven failures in untouched admission/permit/planning tests and no further useful progress. No overall pass claim is made. Observed failures involved cold proof/prewarm, deferred admission timer, one-use/source-context permits, source build/run identity, zero-cost proof, native proof reads, and retrieval/schema planning order. No changes were made to those systems to address this feature.
- Initial browser target remains Chrome/Edge with WebM support, localhost or HTTPS. Recording stops automatically at 30 seconds. Real recognition accuracy, especially multilingual/code-switched speech and Singapore names, needs user testing.
- Existing `.env.local` values were preserved. `.env.example` documents `OPENROUTER_STT_API_KEY`; no second enable flag is required and the chat key is not used as a fallback.
