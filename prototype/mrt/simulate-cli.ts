import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { loadFeed } from './gtfs.ts';
import { buildGraph } from './graph.ts';
import { simulateIntervention } from './simulation.ts';
import { illustrativeLine, illustrativeJourneys } from './examples/illustrative-line.ts';
import { REVIEW_DATE } from './policy.ts';

function main() {
  let date = REVIEW_DATE, json = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') json = true;
    else if (args[i] === '--date') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('--date requires YYYY-MM-DD');
      date = args[++i];
    } else throw new Error(`Unknown argument: ${args[i]}`);
  }
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const feed = loadFeed(join(root, 'data/transport/mrt-network')), baseline = buildGraph(feed, { date });
  const result = simulateIntervention(baseline, illustrativeLine, illustrativeJourneys);
  const comparisons = result.comparisons.map(({ baseline: before, scenario: after, ...metrics }) => ({
    ...metrics, baselineStatus: before.status, scenarioStatus: after.status,
    baselineStationIds: before.status === 'reachable' ? before.route.stationIds : null,
    scenarioStationIds: after.status === 'reachable' ? after.route.stationIds : null,
  }));
  const summary = {
    serviceDate: result.serviceDate, departureTime: result.departureTime, model: result.model,
    intervention: result.scenario.intervention,
    graph: { baselineStations: baseline.stations.size, scenarioStations: result.scenario.graph.stations.size,
      baselineEdges: baseline.edges.length, scenarioEdges: result.scenario.graph.edges.length },
    quarantinedTrips: baseline.audit.quarantined.length, comparisons,
  };
  if (json) { process.stdout.write(JSON.stringify(summary, null, 2) + '\n'); return; }
  console.log(`${illustrativeLine.name} | service date ${date}`);
  console.log('Static model estimates only. Explicit segment times; no real-world or demand-weighted prediction.');
  const format = (n: number | null) => n === null ? 'n/a' : n.toFixed(2);
  console.table(comparisons.map(c => ({
    Journey: `${c.origin} -> ${c.destination}`,
    'Baseline min': c.baselineMinutes === null ? c.baselineStatus : format(c.baselineMinutes),
    'Scenario min': c.scenarioMinutes === null ? c.scenarioStatus : format(c.scenarioMinutes),
    'Saved min': format(c.minutesSaved), 'Duration change %': format(c.percentageChange),
    'Uses new line': c.usedProposedLine === null ? 'n/a' : c.usedProposedLine ? 'yes' : 'no',
    Transfers: `${c.baselineTransfers ?? 'n/a'} -> ${c.scenarioTransfers ?? 'n/a'}`,
  })));
  console.log('Positive saved minutes = improvement; negative duration change % = faster. n/a = undefined/unavailable.');
}
try { main(); }
catch (error) { process.stderr.write(`MRT simulation failed: ${(error as Error).message}\n`); process.exitCode = 1; }
