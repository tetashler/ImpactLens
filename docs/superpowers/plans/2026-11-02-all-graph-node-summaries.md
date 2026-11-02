# All Graph Node Summaries Implementation Plan

**Goal:** Automatically prepare useful AI-written summaries for every node after a simulation finishes, including aggregate and private-environment nodes, without exposing private records or inventing group opinions.

**Architecture:** Independent graph-summary cache and prompt, separate from quick/detailed reports. The server processes the next missing batch of at most 12 nodes per explicit request. A workspace coordinator checks saved results then prepares batches sequentially after completion, exposing progress and explicit retry after failures. Inspecting a node never starts a paid call.

**Constraints:** Same checkout, exclusive worker files, no new simulation or paid test requests, no prompt/cache changes to existing reports. The user's follow-up explicitly authorizes anonymous server-only synthesis of fictional private-channel messages for graph conversation recaps; raw messages, identities, profiles, memories and member lists must not enter browser DTOs/artifacts. People and aggregates retain strict attributable-public-statement scope. A node without relevant recorded discussion must state that gap without fabricating a view. Technical accounting stays in existing details.

## Shared interfaces

Root owns `lib/graph-summary/contract.ts`, `evidence.ts`, `lib/server/graph-summary-evidence.ts`, authenticated public-service access and workspace wiring.

- `GRAPH_SUMMARY_PROMPT_VERSION='graph-node-summaries-v1'`, `GRAPH_SUMMARY_BATCH_SIZE=12`.
- `GraphNodeSummary={nodeId:string;summary:string}` (max1,200chars).
- `GraphNodeSummaries={version:1;runId:string;snapshotKey:string;generatedAt:string;totalNodes:number;summaries:GraphNodeSummary[]}`.
- `parseGraphNodeSummaries(value,allowedNodeIds?:ReadonlySet<string>)`, `parseGraphNodeSummaryBatch(value,expectedIds:ReadonlySet<string>)` where model output is `{summaries:[...]}` and must exactly cover the batch.
- `graphSummarySnapshotPayload(run:PublicExplore,promptVersion?:string):string` hashes an independent bounded public context plus retained revision, never tokens/private records. Root evidence exports `projectGraphSummaryContext(run)` with `{runId,question,runStatus,revision,tick,nodes:[{nodeId,label,kind,description,relationships,metrics,limitations}],calculatedCommute,limitations}`.
- Server writer evidence `GraphSummaryWriterEvidence={...projectGraphSummaryContext(run),nodes:context.nodes filtered to batch,publicDiscussion:PublicDiscussionEvidence}`. Root access helper `readPublicGraphSummaryEvidence(runId,token,revision,tick,nodeIds:string[]):Promise<GraphSummaryWriterEvidence>`.
- Endpoint `/api/knowledge-graph/summaries`: authenticated GET `{snapshotKey,artifact:GraphNodeSummaries|null,totalNodes,complete}`; POST accepts only `{runId,snapshotKey}`, server chooses next missing batch and returns the same envelope. No browser-supplied evidence or arbitrary node targets.
- Workspace hook `useAutomaticGraphSummaries(run,enabled=true)` returns `GraphSummaryClientState={runId,snapshotKey:string|null,artifact:GraphNodeSummaries|null,phase:'idle'|'checking'|'generating'|'complete'|'error',error:string,retry:()=>void}`. Raw source evidence never enters this state. Automatic completion eligibility follows existing job semantics; paused runs may load cached summaries without auto-dispatch. Retry is explicit.
- Graph component optional prop `nodeSummaries?:GraphSummaryClientState` (type exported from `components/use-automatic-graph-summaries.ts`). Root passes this from workspace. Render saved summaries first, per-node pending state while preparing, progress and explicit retry. Never show another node/run's text.

## Ownership and tasks

- [x] Server worker: `lib/server/graph-node-summaries.ts`, `app/api/knowledge-graph/summaries/route.ts`, `lib/contracts/tests/graph-node-summary-service.test.ts`. Test before implementation; independent bounded cache, auth+origin/no-store, running/stale rejection, partial batches, exact coverage, cache reuse, concurrent dedup, no transport retries. At most6,000 output tokens/45sec/batch.
- [x] Automatic worker: `lib/graph-summary/automatic.ts`, `components/use-automatic-graph-summaries.ts`, automatic coordinator tests. Stable authenticated reads, sequential progress, no repeated paid batch on failure/navigation/reload in same browser session, stale/cancel guards and manual retry.
- [x] Inspector worker: `components/knowledge-workspace.tsx`, `lib/knowledge-graph/node-summary.ts`, focused inspector/fallback tests. Show AI summary for every node, waiting/progress/retry state; move aggregate bookkeeping out of headline summary. Preserve existing graph layout/search/selection and other inspectors.
- [x] Root: contract/context evidence tests, public accepted-statement extraction with correct aggregate attribution, stable authenticated access, workspace integration and documentation.
- [x] Focused tests with bounded concurrency, TypeScript, mocked browser coverage of aggregate/private/calculation/person/entity nodes and >16 nodes across batches, cached reuse, progress, failure/manual retry. No real inference or simulation restart.

## Review focus

All graph nodes includes private environments: summarize only already-public context, never private discussion. Aggregate statements must match the exact complement of primary non-role people; do not attribute all scenario discussion to the group. Model output must cover precisely every requested node once; unknown/duplicate/missing IDs reject the batch. Partial successful batches survive later failure. New snapshots cannot consume earlier results. Navigation/selection must not dispatch new provider requests.

The user explicitly selected automatic preparation of every node and requested subagents. Implementation is authorized; no additional plan approval needed. No commit/push until requested.

## Execution and review

Three workers implemented server, automatic coordinator and inspector in this checkout. A review worker hit a model-capacity error; its saved implementation was preserved and its review was restarted. Cross-review found that the detailed report's global statement limit could discard a later participant's evidence before node selection. Graph-only extraction now prioritizes batch-attributable public statements before the bounded selection; existing quick/detailed report selection remains unchanged. The regression uses a valid 80-person fixture and verifies participant 79 retains their statement.

Updating jobs skip graph-context hashing and summary requests entirely. Completed selected active runs prepare all nodes, including currently hidden/searchable candidates, in batches of 12. Failed batches retain previously saved output and require explicit retry. Attempt suppression is per browser session, not a global durable failed-provider-attempt ledger.

Verification: 86 focused tests, TypeScript and whitespace checks passed. Mocked Chrome covered 65 nodes, including an added private-group fixture: six successful batches, one intentional failed batch, saved progress, explicit retry, all six representative node kinds, popup/expanded/full inspectors, no requests on selection, and cached reuse after navigation/reload. A live unauthenticated route check returned 403/no-store. A read-only audit of the actual retained 64-node MRT run found 8 eligible initial statements and 26 public follow-ups, with one statement specifically attributable to its background aggregate; retained archive/journal bytes remained unchanged. No paid inference or new simulation was used by these checks. Real-provider narrative quality for the new prompt remains unmeasured.

### Follow-up: tell the reader what happened

The user reported definition-style Reddit/WhatsApp/clinic text. Channels now receive bounded anonymous conversation excerpts, including authorized fictional private messages, with real canonical item reply links and thread boundaries. The prompt leads with concrete discussion and responses, forbids majority claims from scores and avoids generic real-sentiment disclaimers. Entities receive anonymous public scenario context for relevant ordinary-language references. Model descriptions do not establish actual discussion or outcomes. Prompt/cache version v2 invalidates old graph narratives without rerunning the simulation. Source identities are anonymised and private output receives identity redaction/verbatim overlap rejection. The review suggestion to require event.parentId===item.parentId was rejected because the engine intentionally records different fields for valid comments; a regression characterises canonical item ancestry instead. Follow-up verification: 100 focused tests and TypeScript passed; real polyclinic evidence audit found 23 eligible public statements and five private-channel messages without altering retained records. No paid provider request was used by the checks.
