# Direct Claude Haiku API implementation

**Goal:** Use direct Anthropic API requests with `claude-haiku-5-5` for scenario planning, decisions and reports, with a private API-key entry ready for the user.

**Architecture:** Keep the existing prompts, response parsers, assumption approval, budgets and cancellation. Add an Anthropic Messages adapter behind the shared structured transport, and select it explicitly with `AI_PROVIDER=anthropic`. Expand the strict identity contracts to accept the exact Claude/Anthropic pair as well as historical DeepSeek/DigitalOcean records. Report the actual serving model and provider. A missing Claude key disables the selected route rather than falling back.

**Constraints:** No mobile work, paid inference, automatic retries, local cooldown, historical simulation recovery, or credential disclosure. Preserve unrelated uncommitted repairs and existing environment values. Keep OpenRouter speech transcription configuration separate.

- [x] Transport: add bounded Anthropic Messages requests and schema compatibility handling; test routing, returned identity, usage, refusals, rate limits and cancellation with offline fixtures.
- [x] Contracts: accept only the two supported identity pairs, including execution metadata and status; preserve old stored runs without rewriting them.
- [x] Callers: select the configured credential for planning, social decisions and all report generators; update provider status and UI disclosures.
- [x] Generic AI: support Anthropic in the existing AI configuration/provider interfaces and presentation parsers.
- [x] Configuration: add server-only `ANTHROPIC_API_KEY=`, `ANTHROPIC_MODEL=claude-haiku-5-5`, and select `AI_PROVIDER=anthropic` in ignored `.env.local`; document setup in `.env.example`.
- [x] Verification: run focused offline regressions with bounded concurrency, TypeScript and a production build; independently review provider identity, schema compatibility, missing-key behavior and privacy.

The user has authorized implementation and autonomous parallel work. The live inference check remains pending until they enter their key; offline tests must not consume provider credits.
