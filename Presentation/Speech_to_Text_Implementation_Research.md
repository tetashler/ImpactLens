# Speech-to-text in ImpactLens: implementation research

**Researched:** 2 November 2026  
**Target model:** `openai/whisper-large-v3-turbo` through OpenRouter  
**Status:** Research and proposed implementation only. No application code changed, packages installed, recordings uploaded, or paid API requests made.  
**Source baseline:** Checkout HEAD `58bd4ea` plus the current working tree. Other work is in progress; recheck the files below before implementation.

## Recommendation and realistic time estimate

Build a short-recording input for the existing **Map → Your scenario question** field. Use the browser's microphone API and `MediaRecorder`, send the completed recording through a small Next.js server route, and let the user insert and edit the transcript before pressing Explore.

**Budget 90–120 minutes for a local Chrome/Edge hackathon version**, assuming microphone permission works, the account has model access/credits, and a real browser recording passes the initial API check. One hour is an optimistic happy-path prototype; two hours is the more useful planning estimate. These are engineering estimates, not measured implementation times.

The main uncertainty is the actual browser recording being accepted by the selected OpenRouter backend. Test that first. If it fails, investigate before building the rest of the interface; audio conversion can push the work outside this estimate.

Recommended first-version choices in this document are the researcher's proposals, not previously approved product requirements.

## First-version scope

| Include in 1–2 hours | Defer |
| --- | --- |
| One microphone control on the main Map question form | Every other question/chat input |
| Desktop Chrome/Edge, after capability detection | Guaranteed Safari/iPhone/mobile coverage |
| Up to 30 seconds per recording | Long recordings and audio splitting |
| Record, stop, preview, insert, edit, Explore | Live partial transcription while speaking |
| Clear cancellation, permission and provider errors | Waveforms, audio playback and device selectors |
| Existing OpenRouter server key; separate speech model | Replacing the scenario/chat model |
| Temporary memory only for audio | Upload library, saved audio and meeting transcripts |

Typed input remains available if microphone access, browser support or transcription fails. This feature converts speech into a question; it does not approve an interpretation, start a simulation or create a report by itself.

## Verified service findings

OpenRouter documents the following speech endpoint contract. [Speech-to-text guide](https://openrouter.ai/docs/guides/overview/multimodal/stt)

| Item | Finding |
| --- | --- |
| Endpoint | `POST https://openrouter.ai/api/v1/audio/transcriptions` |
| Authentication | Bearer OpenRouter API key |
| JSON input | `model`, `input_audio.data` containing raw base64, and `input_audio.format` |
| Output | JSON `text`; usage fields may be absent |
| Language | Optional ISO language code; omission enables detection |
| Formats | Include WebM; acceptance varies by provider |
| Discovery | `/api/v1/models?output_modalities=transcription` |
| Timeout | Upstream processing timeout is 60 seconds, not a recording-duration limit |
| Routing | Transcription does not apply chat's `only`, `order` or `ignore` preferences |

The model listing identifies `openai/whisper-large-v3-turbo` and lists DeepInfra and Groq. Displayed audio prices are **US$0.000003/second** and **US$0.000011/second**, respectively. A 30-second clip therefore works out to about **US$0.00009–0.00033**, before any minimum billing or account-specific effects. This is arithmetic from published rates, not a measured bill. Check actual usage cost during the later smoke test. [Model and provider prices](https://openrouter.ai/openai/whisper-large-v3-turbo)

**Documentation caution:** The generic model page suggests provider pinning, while the dedicated speech guide excludes those routing controls. Follow the endpoint-specific guide and verify behavior. Do not copy ImpactLens's DigitalOcean-only chat policy into this request or claim speech uses that provider.

## Where this fits in the current code

These findings come from local source inspection, not assumptions about an earlier UI.

| Existing file | Observed behavior | Implementation consequence |
| --- | --- | --- |
| [app/page.tsx](../app/page.tsx) | Renders `Workspace` | Main app entry point |
| [components/workspace.tsx](../components/workspace.tsx) | Renders `MapScenarioPanel`; passes `onQuestion={editQuestion}` | Insert through the existing callback |
| [components/map-scenario-panel.tsx](../components/map-scenario-panel.tsx) | Main question textarea has a 2,000-character limit and an Explore submit button | Add the first voice control here |
| [components/map-first.css](../components/map-first.css) | Styles that form and its buttons | Reuse its visual language |
| [components/question-console.tsx](../components/question-console.tsx), [components/scenario-composer.tsx](../components/scenario-composer.tsx) | Other question surfaces still exist | Do not mistake them for the main Map input |
| [lib/server/ai/openrouter.ts](../lib/server/ai/openrouter.ts) | Checks a chat catalogue for structured-output capability and parses chat `choices` | Cannot serve as the speech adapter |
| [lib/server/ai/config.ts](../lib/server/ai/config.ts) | Selects a general AI provider/model | Keep speech configuration independent |
| [lib/server/ai/http.ts](../lib/server/ai/http.ts) | `encodeInput` caps JSON at 24,000 bytes; HTTP errors mention chat schemas | Do not feed base64 audio through `encodeInput` or reuse its errors blindly |
| [lib/server/eldercare-service.ts](../lib/server/eldercare-service.ts) | Shows streamed request-byte accounting | Reference its bounded-reader pattern; do not change its JSON protocol |
| [app/api/reports/summary/route.ts](../app/api/reports/summary/route.ts) | Thin Node route delegates to a server service | Follow this organization for speech |
| [.env.example](../.env.example) | Defines server-only `OPENROUTER_API_KEY` and a separate chat model | Reuse the key, preserve all existing settings |

`editQuestion` updates planner text and invalidates question-dependent work using the current geometry. Calling it preserves the same behavior as typing. Do not write only to a DOM textarea, invoke the planner directly, or bypass invalidation.

The installed Next.js guides were read for Route Handlers, client/server boundaries and environment variables. They describe `route.ts`, native Request/Response handlers, and browser access from client components. Before coding, reread the relevant installed guides as required by the project's AGENTS.md:

- [Route Handlers](../node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md)
- [Server and Client Components](../node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md)
- [Environment variables](../node_modules/next/dist/docs/01-app/02-guides/environment-variables.md)

## Proposed architecture

```text
Map question form
  → user grants microphone permission
  → MediaRecorder collects one complete WebM recording
  → browser POSTs binary audio to /api/speech/transcribe
  → Next.js validates and base64-encodes the bounded audio
  → OpenRouter transcribes with whisper-large-v3-turbo
  → browser displays a transcript preview
  → user chooses Insert into question
  → existing onQuestion / editQuestion updates the question
  → user edits and presses Explore through the existing flow
```

No SDK, WebSocket service, database or audio conversion package is needed for this proposed version. Use native browser APIs and server `fetch`.

### Proposed file changes

| File | Responsibility |
| --- | --- |
| `components/use-speech-input.ts` — new | Permission, recorder lifecycle, operation identity, cancellation, upload and preview state |
| `components/map-scenario-panel.tsx` — edit | Controls, transcript preview, insertion through `onQuestion`, and form gating |
| `components/map-first.css` — edit | Compact controls, readable status and error styling |
| `app/api/speech/transcribe/route.ts` — new | `runtime = 'nodejs'`; thin POST delegate |
| `lib/server/speech/service.ts` — new | Separate configuration, bounded input, provider call and safe responses |
| `lib/contracts/tests/speech-transcription.test.ts` — new | Focused server/request tests with mocked fetch |
| `.env.example` — edit | Document the speech opt-in setting without changing existing chat configuration |

The hook is imported by the Map component, so it participates in type checking through that import. Follow the existing hook conventions; this feature should not require a TypeScript configuration change.

## Browser behavior and lifecycle

Microphone capture needs a secure context and permission. Use localhost/loopback for the local demo or HTTPS when hosted. A phone opening an ordinary HTTP LAN address is not equivalent to localhost. Permission can remain unanswered; the UI needs a Cancel action while waiting. [MDN: getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

1. On the explicit Record click, check `window.isSecureContext`, `navigator.mediaDevices?.getUserMedia` and `MediaRecorder` inside client-side code. Do not access them at module load or during server rendering.
2. Prefer `audio/webm;codecs=opus`, then `audio/webm`, using `MediaRecorder.isTypeSupported`. If neither is available, show a typed-input fallback. A positive capability check is not proof that recording will succeed. [MDN: format detection](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static)
3. Request `{ audio: true }`; attach recorder handlers before starting. A 64 kbps audio bitrate can be requested, but treat it as a hint.
4. Collect nonempty chunks and assemble one Blob only after the final `dataavailable` and `stop` sequence. Do not upload immediately after calling `stop()`. [MDN: recorder stop](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/stop)
5. Auto-stop at 30 seconds. Start a separate elapsed-time timer after capture starts. Chunk intervals are not accurate clocks, and individual chunks should not be treated as independent complete recordings. [MDN: dataavailable](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/dataavailable_event)
6. Reject an empty Blob or one larger than 1 MiB before uploading. Use the actual recorder MIME type; changing a filename or Blob type does not transcode audio.
7. Release every microphone track after stop, cancellation, failure or unmount, including a permission promise resolving after cancellation. [MDN: track stop](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/stop)

Suggested UI states: `idle → requesting-permission → recording → transcribing → preview`, with cancellation back to idle and a separate readable error.

Use buttons with `type="button"` inside the form, text labels such as Record question / Stop recording / Cancel, and a polite status announcement. Keep errors separate from simulation errors. Temporarily disable Explore during permission, capture, transcription and preview; guard the submit handler as well as the button.

### Preserve typed questions and avoid stale writes

The preview is a deliberate simplification: completion does not mutate the question asynchronously. **Insert into question** appends the transcript to the latest question with a single separating space, or inserts directly if it is empty, then calls `onQuestion` once. Clear the preview afterward. The user can discard it instead.

Check the combined length before insertion. If it exceeds 2,000 characters, retain the preview and ask the user to shorten the question or copy/edit the transcript. Do not silently truncate or replace typed content.

Give each recording a monotonically increasing operation ID. Cancel/unmount increments it and aborts the upload. Every asynchronous callback must confirm it still owns the operation before changing UI. Late permission results must immediately release their tracks. Clear recording/preview state on leaving the Map form and if an existing simulation becomes busy. If view changes do not unmount the form, explicitly cancel on that transition.

## Proposed application endpoint

This is an ImpactLens protocol choice, not the OpenRouter protocol.

```http
POST /api/speech/transcribe
Content-Type: audio/webm;codecs=opus

<raw Blob bytes>
```

Keep the first version WebM-only. Strip MIME parameters when comparing the base media type. Read the body incrementally with a **1,048,576-byte ceiling**, checking both any declared length and actual accumulated bytes. Reject zero bytes. A missing Content-Length must not bypass the limit. Do not call an unbounded `arrayBuffer()` and only check afterward.

Proposed service order:

1. Verify the feature opt-in and a valid server key; return 503 if unavailable.
2. Require a matching application Origin for browser requests; derive the expected origin consistently with the app's trusted deployment setup. Origin validation alone is not authentication.
3. Validate content type; acquire one process-local speech slot or return 429. This local-demo limit is independent of simulation admission/storage slots.
4. Start a 45-second whole-request deadline covering upload reads, upstream fetch and response reads. Combine it with request cancellation; abort/cancel readers and release the slot in `finally`.
5. Read bounded bytes, encode with `Buffer.from(bytes).toString('base64')`, and make one provider POST. No discovery request is required per recording.
6. Read a bounded upstream response, suggested ceiling 64 KiB; validate `text` as a string. Trim whitespace; reject empty text and unexpectedly huge output. Return plain text data, rendered as React text rather than HTML.
7. Return a small JSON envelope and `Cache-Control: no-store`. Never send raw upstream errors or credentials to the browser.

Success shape: `{ "version": 1, "text": "What if we added a polyclinic near Punggol?" }`.

Failure shape: `{ "version": 1, "error": { "code": "STT_TIMEOUT", "message": "Transcription timed out. Try a shorter recording." } }`.

Suggested mappings: 400 empty/invalid input; 403 wrong origin; 413 oversized body; 415 unsupported format; 429 busy/rate-limited; 503 disabled/missing credentials or unavailable credits; 504 deadline; 502 provider rejection or invalid output. Keep user messages specific to speech.

The 30-second limit is a browser convenience. A byte cap and MIME declaration do not establish genuine audio duration or file validity; the MVP delegates decoding to the provider. Do not expose this as a public anonymous paid endpoint without deployment-appropriate authentication, quotas and stronger abuse controls.

## Configuration and provider request

Proposed server configuration:

```dotenv
# Add later; preserve existing .env.local entries.
SPEECH_TO_TEXT_ENABLED=true
# OPENROUTER_API_KEY already exists; fill it privately if needed.
```

Fix the speech model in server code to `openai/whisper-large-v3-turbo` for this narrow feature. Do not change `OPENROUTER_MODEL`, `AI_PROVIDER`, simulation provider restrictions or existing timeouts. Never use a `NEXT_PUBLIC_` key. An unconfigured speech endpoint should fail without affecting typed questions.

The proposed upstream payload is based on the documented STT fields; the surrounding application behavior is our design. [OpenRouter STT request reference](https://openrouter.ai/docs/guides/overview/multimodal/stt)

```json
{
  "model": "openai/whisper-large-v3-turbo",
  "input_audio": {
    "data": "<base64 of the complete recording bytes; no data URI prefix>",
    "format": "webm"
  },
  "response_format": "json"
}
```

Send it using server `fetch` with Bearer authorization, JSON content type, `cache: 'no-store'`, redirect rejection and the bounded AbortSignal. Use ordinary JSON serialization after applying audio-byte limits; the existing 24 KB chat encoder is unsuitable. Omit a language hint initially so Singapore users can test more than English; assess English/Mandarin code-switching rather than promising it works well. Add an English hint later only if the intended demo needs it and testing supports it.

Do not automatically retry transcription after timeout or network failure: the first provider call may already have incurred cost. Cancellation stops local waiting and attempts to abort transport; it cannot guarantee that remote processing or billing stopped.

Keep raw audio in browser/server memory only for the operation. Release references after completion/cancellation and avoid recording bodies, transcripts or authorization headers in logs. Audio leaves the computer for OpenRouter and an upstream provider; describe that clearly beside the control. Do not claim end-to-end local processing or zero retention without separately verified provider policies.

## Timeboxed implementation sequence

| Elapsed budget | Work | Exit condition |
| --- | --- | --- |
| 0–15 min | Recheck current diff/docs and make a tiny real WebM transcription check | Actual target-browser audio returns usable text with the exact model |
| 15–40 min | Add separate server service/route, bounds, deadline and mocked server cases | One request succeeds; invalid/disabled/oversized cases make no provider call |
| 40–75 min | Add recording hook and Map controls | Permission, stop, cancel and track cleanup work |
| 75–90 min | Add preview/insert behavior and minimal styling | Existing question/geometry workflow stays correct |
| 90–110 min | Run focused tests, type checking and real microphone acceptance | Correct model/format and no unintended simulation calls |
| 110–120 min | Fix small issues and record limitations | Demo-ready on the tested browser |

If the first spike is blocked by model access, unsupported WebM or deployment constraints, revise the estimate. Do not consume the two-hour budget adding transcoding, live streaming, Safari workarounds or a second speech vendor without agreeing to the expanded scope.

## Verification to run during implementation

Focused mocked server cases should cover: disabled/missing-key behavior; wrong origin/type; empty audio; declared and streamed oversize; exact model and endpoint; base64 decodes back to the supplied bytes; empty/malformed provider text; deadline/cancellation; safe errors; and a second in-flight request. Keep these tests in the repository's existing native Node test setup.

Suggested commands, after those files exist:

```powershell
node --test lib/contracts/tests/speech-transcription.test.ts
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
```

The repository's `npm test` has a `pretest` asset preparation step and a broader suite. Run it when appropriate after the focused checks; account for existing working-tree changes when interpreting failures. A build can verify Next integration, but it does not prove microphone capture works.

Manual acceptance checklist:

- [ ] A 5–15 second Singapore scenario spoken in the target Chrome/Edge browser returns an understandable transcript.
- [ ] Stop creates one provider request, and Insert updates the current question through `onQuestion` exactly once.
- [ ] Existing typed content is retained; combined overflow is explained without truncation.
- [ ] Record/Stop/Insert never submit Explore or call simulation/research/report APIs.
- [ ] Denied permission, missing device, ignored permission prompt and unsupported format have usable fallbacks.
- [ ] Cancel during permission, capture or upload cannot produce a late transcript or leave this feature's microphone tracks active.
- [ ] Navigating away and React development remounts clean up resources.
- [ ] The 30-second stop and 1 MiB checks work; no camera is requested.
- [ ] Silence, background noise, MRT names, Punggol/Tampines and any intended multilingual input are assessed manually. Review remains necessary even for plausible output.
- [ ] Offline/provider failure retains the question and allows typing or a deliberate new recording.
- [ ] Browser requests contain no OpenRouter credential; `.env.local` is not committed.
- [ ] Measured end-to-end transcription latency and reported cost are written down; published provider latency is not treated as a user-experience guarantee.

## Implementation handoff

Start with the **15-minute real WebM compatibility check**, using one deliberately recorded non-sensitive sentence. Research has verified the published interfaces and the code integration points; actual account access, recording compatibility, recognition quality, latency, spend and browser cleanup remain untested.

This document does not authorize a deployment or mark speech input implemented. The later implementation task should use this scoped design, preserve unrelated working-tree changes, and record the target browser plus observed acceptance results.
