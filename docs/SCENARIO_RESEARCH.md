# Scenario research

Each new simulation can research its question through Tavily before planning the fictional stakeholders. This applies across topics: healthcare, transport, housing, education, community programmes and other scenario questions. It is not restricted to facility searches.

## Budget and stopping

- The server owns a hard **30-credit ceiling per simulation**. The browser cannot increase it.
- Searches use Tavily's basic search with automatic parameter selection disabled. One credit is reserved before each request.
- Thirty credits is a maximum, not a spending target. Research stops earlier when the query-coverage heuristic succeeds, the query plan is exhausted or the time bound is reached.
- Failed requests and missing or inconsistent provider usage are not refunded. No failed search is automatically retried. Partial useful results are retained and gaps remain explicit.
- Reported credits and reserved credits are separate. Missing provider usage is shown as unavailable, never as zero.
- The initial research stage uses the existing bounded retrieval deadline (10 seconds in the simulation service). It does not extend the simulation's overall deadline.

## Evidence and participant knowledge

Research uses bounded query facets derived from the question and appropriate location context. It asks about existing provision, implementation, stakeholder concerns and relevant topic-specific background. Queries and excerpts are untrusted content, not instructions or verified facts.

Up to sixteen distinct, canonical source URLs are retained with exact excerpts and publication/retrieval dates. The extractive briefing adds no unsupported factual synthesis. Research does not establish an exhaustive inventory, nearest facility, current capacity, walking time or public sentiment.

The simulation assumes the research briefing is available as initial background. Every retained source is represented in the common context; a bounded selection of more relevant source excerpts is highlighted for a participant's goals. This assumption is distinct from a recorded announcement, read event or proof of agreement. Later conversation and information transfers retain their existing event accounting.

The full source-linked pack is available to generated reports and graph summaries. A collapsible “Research used for this scenario” section below the detailed report shows the briefing, credit accounting and remaining gaps. Reports must separate source-reported information from fictional reactions and hypothetical scenario assumptions.

## Reuse and compatibility

The resulting evidence and search accounting are attached to the immutable scenario plan and retained with the run. Continuing a simulation, opening a node, checking status, refreshing a report or regenerating report prose does not start another search phase.

Existing saved runs remain readable without the new research fields. They are not automatically enriched or rerun. New evidence requires a new simulation.

Tavily remains optional. Without a configured `TAVILY_API_KEY`, the briefing explicitly records that research was not configured and the simulation remains exploratory.

## Verification

Tests use mocked Tavily and inference responses. No real provider request is necessary to verify the credit ceiling, query planning, source propagation, backwards compatibility or report rendering. A fresh real-inference simulation is a separate end-to-end acceptance check.
