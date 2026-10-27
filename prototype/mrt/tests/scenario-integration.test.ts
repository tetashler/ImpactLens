import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { loadFeed } from '../gtfs.ts';
import { buildGraph } from '../graph.ts';
import { shortestPathsFrom } from '../routing.ts';
import { analyseConnectivity } from '../validation.ts';
import { simulateIntervention } from '../simulation.ts';
import { illustrativeLine, illustrativeJourneys } from '../examples/illustrative-line.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const directory = join(root, 'data/transport/mrt-network'), feed = loadFeed(directory);
for (const date of ['2026-10-27', '2026-10-31', '2026-11-01']) {
  test(`real ${date}: scenario is connected, cannot worsen any existing OD, retains quarantine and deterministic results`, () => {
    const baseline = buildGraph(feed, { date }), before = structuredClone(baseline);
    const result = simulateIntervention(baseline, illustrativeLine, illustrativeJourneys), graph = result.scenario.graph;
    assert.deepEqual(baseline, before);
    assert.equal(graph.date, baseline.date);
    assert.deepEqual(graph.costs, baseline.costs);
    assert.deepEqual(graph.audit, baseline.audit);
    assert.equal(graph.audit.quarantined.length, 17);
    assert.equal(graph.stations.size, 186);
    assert.equal(graph.states.size, 221);
    assert.equal(graph.edges.length, 512);
    assert.equal(analyseConnectivity(graph).stateStrongComponents.length, 1);
    assert.ok(graph.edges.every(e => Number.isFinite(e.seconds) && e.seconds >= 0));
    const oldEdges = new Map(graph.edges.map(e => [e.id, e]));
    for (const edge of baseline.edges) assert.deepEqual(oldEdges.get(edge.id), edge);
    for (const station of baseline.stations.keys()) {
      const previous = shortestPathsFrom(baseline, station), next = shortestPathsFrom(graph, station);
      // Stronger than sample routes: all 33,672 existing OD pairs, plus every old line-state target.
      for (const id of baseline.states.keys()) assert.ok(next.distances.get(id)! <= previous.distances.get(id)!, `${station} -> ${id} unexpectedly worsened`);
    }
    const [improved, reverse, feeder, unaffected, introduced, zero] = result.comparisons;
    assert.ok(improved.minutesSaved! > 0 && reverse.minutesSaved! > 0 && feeder.minutesSaved! > 0);
    assert.equal(improved.scenarioMinutes, 20); // 150 wait + 300+30 + 360+30 + 300+30 = 1200 seconds.
    assert.equal(improved.usedProposedLine, true);
    assert.equal(unaffected.minutesSaved, 0);
    assert.equal(unaffected.usedProposedLine, false);
    assert.equal(introduced.baseline.status, 'station-unavailable');
    assert.equal(introduced.scenarioMinutes, 14.5); // 150 + 390 + 330 seconds.
    assert.equal(zero.percentageChange, null);
    assert.deepEqual(simulateIntervention(baseline, illustrativeLine, illustrativeJourneys).comparisons, result.comparisons);
    for (const [file, hash] of Object.entries(feed.hashes)) assert.equal(createHash('sha256').update(readFileSync(join(directory, file))).digest('hex'), hash);
  });
}
