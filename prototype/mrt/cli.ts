import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { loadFeed } from './gtfs.ts';
import { buildGraph } from './graph.ts';
import { createReport, graphSummary, sampleRoutes } from './report.ts';
import { INTERCHANGES, REVIEW_DATE, SUSPECT_PAIRS } from './policy.ts';

function main() {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  let date = REVIEW_DATE, write = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('--date requires YYYY-MM-DD');
      date = args[++i];
    } else if (args[i] === '--write') write = true;
    else throw new Error(`Unknown argument: ${args[i]}`);
  }
  const feed = loadFeed(join(root, 'data/transport/mrt-network'));
  const graph = buildGraph(feed, { date }), raw = buildGraph(feed, { date, mode: 'raw' });
  const checks = [...new Set([date, '2026-10-27', '2026-10-31', '2026-11-01'])].map(day => ({ date: day, summary: graphSummary(day === date ? graph : buildGraph(feed, { date: day })) }));
  const summary = { date, baseline: graphSummary(graph), raw: graphSummary(raw), checks, samples: sampleRoutes(graph) };
  for (const [file, hash] of Object.entries(feed.hashes)) {
    const current = createHash('sha256').update(readFileSync(join(feed.root, file))).digest('hex');
    if (current !== hash) throw new Error(`Input changed during validation: ${file}`);
  }
  if (write) {
    const target = join(root, 'data/derived/mrt');
    mkdirSync(target, { recursive: true });
    const baseline = {
      schemaVersion: 1, researchOnly: true, date, mode: graph.mode, costs: graph.costs,
      sourceDirectory: 'data/transport/mrt-network', sourceHashes: feed.hashes,
      sourceRefFields: ['trip_id', 'trips.txt line', 'from stop_times.txt line', 'to stop_times.txt line'],
      stations: [...graph.stations.values()], aliases: Object.fromEntries(graph.aliases),
      states: [...graph.states.values()], edges: graph.edges,
    };
    const audit = {
      schemaVersion: 1, researchOnly: true, date, sourceHashes: feed.hashes,
      feedInfo: feed.tables.feed_info, calendar: feed.tables.calendar, calendarDates: feed.tables.calendar_dates,
      policy: { reviewedOn: REVIEW_DATE, interchanges: INTERCHANGES, suspectPairs: SUSPECT_PAIRS, costAssumptions: graph.costs },
      ...summary, audit: graph.audit,
    };
    writeFileSync(join(target, `baseline-${date}.json`), JSON.stringify(baseline) + '\n');
    writeFileSync(join(target, `audit-${date}.json`), JSON.stringify(audit, null, 2) + '\n');
    writeFileSync(join(root, 'docs/MRT_GRAPH_VALIDATION.md'), createReport(feed, graph, raw, checks));
  }
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}
try { main(); }
catch (error) { process.stderr.write(`MRT validation failed: ${(error as Error).message}\n`); process.exitCode = 1; }
