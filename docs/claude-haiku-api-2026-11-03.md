# Direct Claude Haiku 5.5 API

New planning, simulation decisions, personality initialization, reports and graph summaries can use the direct Anthropic Messages API. The selected model is `claude-haiku-5-5`, verified against [Anthropic's model reference](https://platform.claude.com/docs/en/models/overview).

## Local configuration

The ignored `.env.local` file now has these server-only settings. Enter the key locally; never commit it or use a `NEXT_PUBLIC_` prefix.

```env
AI_PROVIDER=anthropic
ANTHROPIC_MODEL=claude-haiku-5-5
ANTHROPIC_API_KEY=
```

The user entered a key during implementation. A metadata-only model lookup authenticated successfully and confirmed access to the requested model. The running app's inference and generic AI status endpoints both report Anthropic and Haiku 5.5 as configured. No paid inference was performed by the implementation checks.

An empty selected Claude key disables generation; it does not silently use the OpenRouter key. To return to the historical route, select `AI_PROVIDER=openrouter` and configure the existing OpenRouter settings. Speech transcription retains its separate OpenRouter speech key because this change concerns text generation.

## Implementation

- `lib/server/inference/route.ts` selects credentials and the exact model/provider pair explicitly.
- `lib/server/ai/anthropic-messages.ts` sends one bounded direct Messages request with the server key in `x-api-key`, thinking disabled and low effort. It does not retry, impose a local cooldown or switch providers.
- Supported schemas use Anthropic's structured output format. Schemas exceeding the documented grammar limits use JSON/schema instructions instead, followed by the same strict local parsers before any output can be accepted. Unsupported schema constraints remain guidance and are enforced by local validation. See [Anthropic's structured output documentation](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
- The shared transport preserves deadlines, cancellation, admission checks, usage and safe error handling. Rate limits from Anthropic remain rate limits; changing API providers does not promise unlimited capacity.
- Browser contracts accept the exact Claude/Anthropic identity and the historical DeepSeek/DigitalOcean identity. Crossed identities are rejected. Previously saved simulations are not rewritten.
- Personality initialization validates the actual transformed request and its hash before dispatch. The roster keeps the historical logical request digest plus a separate actual wire digest for Claude.
- Anthropic token counts are retained, including cache counts if supplied. Dollar cost remains unknown (`null`) because the Messages response does not report a charge. Existing budget reservations remain separate from reported cost. Claude personality provenance explicitly labels reported tokens with unknown cost.
- Assumption approval, original output validation and separately calculated numerical models remain in their existing workflows. No saved simulation was resumed or recovered.

## Verification

- Parent combined regression run and final flow checks: **189 tests passed**, including direct Claude transport, generic configuration, identity contracts, personality initialization, provider failures, reports and legacy routing.
- Full mocked flows passed: two planning stages plus eight participant turns; direct Messages interpretation and personality initialization; first-call rate limiting stops without retries or actions.
- TypeScript passed and `npm.cmd run build -- --webpack` passed, including postbuild trace filtering.
- Independent read-only review found no material credential, identity, schema-validation, accounting or request-binding issues.
- All generation tests used offline/mock provider responses. The final user-triggered live simulation remains the live inference check.

Local verification logs: `tmp/claude-haiku-regressions.log`, `tmp/claude-integration-types.log`, `tmp/claude-haiku-build.log`, and `tmp/claude-personality-provider-tests.log`, `tmp/claude-haiku-flow-final.log`, and `tmp/claude-haiku-types-final.log`.
