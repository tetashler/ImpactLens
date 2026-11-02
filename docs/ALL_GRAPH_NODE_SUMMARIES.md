# AI summaries for every graph node

The graph now has its own saved AI summaries, independent of the short report's original 16-node allowance. Every registered node is included after a selected simulation completes, including searchable people, aggregate groups, places, calculations, platforms and private-environment nodes.

The inspector leads with **AI summary**. While preparation runs, it shows a waiting message and graph-wide completed/total progress. Clicking a node reads the existing state; it does not start inference. Successful batches appear immediately and remain available if a later batch fails. **Retry summaries** resumes from the missing batch. Existing technical accounting remains in closed details.

## Meaningful evidence

Summaries lead with recorded discussion and developments where available. Platform/group summaries recap the actual proposal or concern, replies/challenges and unresolved issue rather than defining the platform. Entity summaries recount what participants said about the entity; a model-suggested entity description alone does not prove that its supposed trade-offs, shorter waits or coordination plans were discussed. The writer avoids activity totals, graph-sizing explanations and overlap bookkeeping.

Each batch prioritizes its own participants' or platform's accepted public statements before applying the source limit. The background aggregate receives only statements by its actual non-role complement; other scenario participants' remarks cannot establish that group's view or a consensus. Calculated nodes receive existing scoped commute estimates. Nodes without an attributable statement explain their scenario role and the particular evidence gap.

The user subsequently requested conversation recaps for WhatsApp as well as Reddit. Graph summaries therefore have a separate server-only `channelDiscussions` pack: accepted fictional messages with anonymous speakers, threads and reply references, including fictional private-group messages for their own channel/group summary. Up to 24 statements per selected channel, 1,200 characters each and 60,000 UTF-8 excerpt bytes per batch preserve beginning/middle/end coverage. Hidden, forwarded, failed, rule-authored, cross-group or invalid-ancestry content is excluded. Canonical item ancestry establishes replies; engine event parent metadata can legitimately differ.

Known actor IDs, labels and handles inside source text are anonymised before model input. Private-channel outputs additionally redact known participant identifiers and reject substantial verbatim private-message copies before caching. This is bounded fictional conversation synthesis; memories, individual profiles and membership lists remain excluded. Neither anonymous source packs nor raw messages are HTTP DTOs or saved artifacts.

People and aggregates still receive only attributable public statements. Entity nodes also receive anonymous **public** scenario exchanges so the writer can understand clear references such as familiar doctors and continuity without requiring the exact graph label. Ambiguous references must remain ambiguous; a comment about current care is not a verified claim about a particular clinic. Exact literal references are attached where available.

The graph prompt/cache version is `graph-node-summaries-v2-conversations`. Older definition-style artifacts are invalidated; no simulation rerun is required. Quick-summary and detailed-report input/prompt policy remains unchanged.

## Generation and cache

The workspace starts graph preparation after authoritative job completion, independently of the selected tab. Running jobs skip summary requests and graph-context hashing. Paused or interrupted jobs can read saved output but do not automatically generate more. Historical read-only runs do not dispatch.

Authenticated GET `/api/knowledge-graph/summaries?runId=…` returns saved coverage. POST accepts only `{runId,snapshotKey}` and generates the next missing batch of up to 12 nodes. The server resolves the evidence, validates exact batch IDs, rejects changed/running snapshots, deduplicates concurrent work, and saves partial results under the independent `graph-node-summaries` private-store directory.

Each batch uses one structured completion with a 6,000-token ceiling and 45-second request limit, without transport retries. Total calls depend on graph size: 65 nodes need six successful batches. Failed batches require explicit retry; in-memory/sessionStorage attempt markers suppress automatic retries in the same browser session. This is an open-workspace prototype, not a browser-independent generation queue or a global durable attempt ledger.

Quick summaries, detailed reports and their existing caches/prompts are unchanged.

## Verification

- 100 focused tests passed, including anonymous public/private exchanges, correct replies, privacy guards, entity discussion evidence, aggregate attribution, later participants beyond the report cap, exact batch coverage, partial persistence, invalid/stale results, automatic sequencing and inspector regressions.
- TypeScript and whitespace checks passed; the compiled route rejected an unauthenticated request with HTTP 403 and no-store.
- Mocked Chrome prepared 65 summaries across batches and checked progress, a failed batch, retry, six representative node kinds, all inspector sizes, selection without inference, and cache reuse across navigation/reload.
- A read-only audit used the retained 64-node MRT run and preserved archive/journal bytes. Its background aggregate has one attributable public statement, rather than the whole scenario's discussion.
- A follow-up read-only audit of the retained polyclinic run confirmed 23 eligible Reddit statements (15 reply links) and five eligible WhatsApp messages (four reply links). Its existing-private-clinic node has no exact-label public mention, so anonymous public scenario context is supplied for qualified, ordinary-language interpretation. Archive bytes remained unchanged.

No new simulation or paid inference was used in verification. The new prompt's real-provider narrative quality and runtime remain unmeasured. Local scripts and screenshots are in ignored `tmp/all-graph-summaries-20261102/`.
