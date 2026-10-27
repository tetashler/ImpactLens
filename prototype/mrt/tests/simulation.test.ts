import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateIntervention } from '../simulation.ts';
import { baselineFixture, proposalFixture } from './scenario-fixtures.ts';

test('before/after metrics match hand-calculated routing, with proposed use and transfer changes', () => {
  const result = simulateIntervention(baselineFixture(), proposalFixture(), [{ origin: 'Y', destination: 'X' }, { origin: 'NS4', destination: 'X' }]);
  const [viaTransfer, direct] = result.comparisons;
  assert.equal(viaTransfer.status, 'compared');
  assert.equal(viaTransfer.baselineMinutes, 11); // 120 + 60 + 300 + 180 = 660s.
  assert.equal(viaTransfer.scenarioMinutes, 280 / 60);
  assert.equal(viaTransfer.minutesSaved, 380 / 60);
  assert.ok(Math.abs(viaTransfer.percentageChange! - (-380 / 660 * 100)) < 1e-10);
  assert.equal(viaTransfer.usedProposedLine, true);
  assert.equal(viaTransfer.baselineTransfers, 1);
  assert.equal(viaTransfer.scenarioTransfers, 1);
  assert.equal(viaTransfer.transferChange, 0);
  assert.equal(direct.baselineMinutes, 5);
  assert.equal(direct.scenarioMinutes, 1.5);
  assert.equal(direct.minutesSaved, 3.5);
  assert.equal(direct.percentageChange, -70);
  assert.equal(result.serviceDate, '2026-10-27');
  assert.equal(result.departureTime, 'not-modelled');
});
test('unaffected journeys, baseline/source state and repeated simulation results stay identical', () => {
  const baseline = baselineFixture(), before = structuredClone(baseline), proposal = proposalFixture();
  const pair = [{ origin: 'NS4', destination: 'Y' }];
  const first = simulateIntervention(baseline, proposal, pair), second = simulateIntervention(baseline, proposal, pair);
  assert.deepEqual(first, second);
  assert.deepEqual(baseline, before);
  const unchanged = first.comparisons[0];
  assert.equal(unchanged.baselineMinutes, 3);
  assert.equal(unchanged.scenarioMinutes, 3);
  assert.equal(unchanged.minutesSaved, 0);
  assert.equal(unchanged.percentageChange, 0);
  assert.equal(unchanged.usedProposedLine, false);
  assert.deepEqual(unchanged.baseline, unchanged.scenario);
});
test('unreachable, newly reachable, new-station and invalid pairs have explicit outcomes and nullable metrics', () => {
  const pairs = [
    { origin: 'X', destination: 'NS4' }, // directed fixture has no reverse NS path; proposal provides one
    { origin: 'Y', destination: 'HYP_M' },
    { origin: 'MISSING', destination: 'NS4' },
    { origin: '', destination: 'X' },
  ];
  const result = simulateIntervention(baselineFixture(), proposalFixture(), pairs);
  const [restored, newStation, invalid, empty] = result.comparisons;
  assert.equal(restored.baseline.status, 'unreachable');
  assert.equal(restored.scenario.status, 'reachable');
  assert.equal(restored.status, 'newly-reachable');
  assert.equal(restored.baselineMinutes, null);
  assert.equal(restored.minutesSaved, null);
  assert.equal(restored.percentageChange, null);
  assert.equal(newStation.baseline.status, 'station-unavailable');
  assert.equal(newStation.scenario.status, 'reachable');
  assert.equal(newStation.status, 'newly-reachable');
  assert.equal(newStation.transferChange, null);
  assert.equal(invalid.status, 'invalid'); assert.equal(empty.status, 'invalid');
  assert.equal(invalid.scenarioMinutes, null); assert.equal(invalid.usedProposedLine, null);
  const baseline = baselineFixture();
  const proposal = proposalFixture(); proposal.stations.pop(); proposal.segments.pop();
  const stillUnreachable = simulateIntervention(baseline, proposal, [{ origin: 'X', destination: 'NS4' }]).comparisons[0];
  assert.equal(stillUnreachable.status, 'unreachable');
  assert.equal(stillUnreachable.usedProposedLine, null);
});
test('zero baseline duration has undefined percentage change and no transfer or boarding charge', () => {
  const result = simulateIntervention(baselineFixture(), proposalFixture(), [{ origin: 'BP1', destination: 'NS4' }]).comparisons[0];
  assert.equal(result.baselineMinutes, 0);
  assert.equal(result.scenarioMinutes, 0);
  assert.equal(result.minutesSaved, 0);
  assert.equal(result.percentageChange, null);
  assert.equal(result.transferChange, 0);
  assert.equal(result.usedProposedLine, false);
});
