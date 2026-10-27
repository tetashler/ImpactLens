import test from 'node:test';
import assert from 'node:assert/strict';
import type { ImpactResponse } from '../../impact/api-contract.ts';
import type { ImpactMetric } from '../../../prototype/agents/impact/types.ts';
import { metricPresentation, groupMetrics, sortGroupMetrics, groupLabel } from '../../dashboard/metrics.ts';

// Literal stored values deliberately differ from anything in the display sample.
function metric(overrides: Partial<ImpactMetric> = {}): ImpactMetric {
  return {
    group: {},
    coverage: { agentCount: 10, representedPopulation: 1000, assignedPopulation: 700, comparablePopulation: 600, unassignedPopulation: 300, invalidPopulation: 20, newlyReachablePopulation: 50, unreachablePopulation: 30 },
    outcomes: { unassigned: { agents: 3, representedPopulation: 300 }, compared: { agents: 4, representedPopulation: 600 }, invalid: { agents: 1, representedPopulation: 20 }, 'newly-reachable': { agents: 1, representedPopulation: 50 }, unreachable: { agents: 1, representedPopulation: 30 } },
    weightedBenefitingPopulation: 450,
    benefiting: { value: .75, numeratorPopulation: 450, denominatorPopulation: 600, denominator: 'comparable-population' },
    unchanged: { value: .25, numeratorPopulation: 150, denominatorPopulation: 600, denominator: 'comparable-population' },
    weightedMeanMinutesSaved: 8.25, weightedTotalMinutesSaved: 4950, weightedMeanTransferChange: -.5,
    accessibility: { thresholdMinutes: 30, baseline: { value: .25, numeratorPopulation: 170, denominatorPopulation: 680, denominator: 'assigned-noninvalid-population' }, scenario: { value: .5, numeratorPopulation: 340, denominatorPopulation: 680, denominator: 'assigned-noninvalid-population' }, changePercentagePoints: 25 },
    ...overrides,
  };
}
function report(metrics: ImpactMetric[] = [metric()]): ImpactResponse {
  return { metrics, payload: { citizens: [], journeys: [], metrics: [] } } as unknown as ImpactResponse;
}

test('presents stored metric references and names the correct population denominator', () => {
  const r = report();
  const cases = [
    ['represented', 1000, '1,000', 'represented residents'],
    ['assigned', 700, '700', 'represented residents'],
    ['comparable', 600, '600', 'represented residents'],
    ['unassigned', 300, '300', 'represented residents; journey outcome unknown'],
    ['benefiting', 450, '450', '600 comparable represented residents'],
    ['benefitShare', .75, '75%', '600 comparable represented residents'],
    ['meanSaved', 8.25, '8.25', '600 comparable represented residents'],
    ['accessChange', 25, '+25', '680 assigned non-invalid represented residents'],
    ['transferChange', -.5, '−0.5', '600 comparable represented residents'],
    ['newlyReachable', 50, '50', '700 assigned represented residents'],
  ] as const;
  for (const [id, value, formatted, denominator] of cases) {
    const presentation = metricPresentation(r, id);
    assert.equal(presentation.value, value, id);
    assert.equal(presentation.formatted, formatted, id);
    assert.equal(presentation.denominator, denominator, id);
  }
  assert.equal(metricPresentation(r, 'meanSaved').unit, 'min');
  assert.equal(metricPresentation(r, 'accessChange').unit, 'percentage points');
  assert.equal(metricPresentation(r, 'transferChange').unit, 'transfers');
});

test('uses the requested group metric without aggregating the display sample', () => {
  const group = metric({ group: { sex: 'female' }, weightedMeanMinutesSaved: 2.75 });
  assert.equal(metricPresentation(report(), 'meanSaved', group).value, 2.75);
});

test('retains null benefit, saving and transfer values when there is no comparable population', () => {
  const unknown = metric({ benefiting: { value: null, numeratorPopulation: 0, denominatorPopulation: 0, denominator: 'comparable-population' }, weightedMeanMinutesSaved: null, weightedMeanTransferChange: null });
  for (const id of ['benefitShare', 'meanSaved', 'transferChange'] as const) {
    const p = metricPresentation(report([unknown]), id);
    assert.equal(p.value, null);
    assert.equal(p.formatted, 'Unknown');
    assert.equal(p.denominator, '0 comparable represented residents');
  }
  assert.equal(metricPresentation(report([unknown]), 'unassigned').value, 300);
  assert.match(metricPresentation(report([unknown]), 'unassigned').denominator, /outcome unknown/);
});

test('preserves actual zero outcomes and never formats non-finite values as results', () => {
  assert.equal(metricPresentation(report([metric({ weightedMeanMinutesSaved: 0 })]), 'meanSaved').formatted, '0');
  assert.equal(metricPresentation(report([metric({ weightedMeanMinutesSaved: Infinity })]), 'meanSaved').formatted, 'Unknown');
  assert.equal(metricPresentation(report([]), 'meanSaved').value, null);
});

test('groups independent age, sex and area metrics without double counting subzones', () => {
  const age = metric({ group: { ageGroup: '20_24' } });
  const sex = metric({ group: { sex: 'male' } });
  const area = metric({ group: { planningArea: 'choa-chu-kang' } });
  const subzone = metric({ group: { planningArea: 'choa-chu-kang', subzone: 'yew-tee' } });
  const combined = metric({ group: { ageGroup: '20_24', sex: 'male' } });
  const r = report([metric(), age, sex, area, subzone, combined]);
  assert.deepEqual(groupMetrics(r, 'ageGroup'), [age]);
  assert.deepEqual(groupMetrics(r, 'sex'), [sex]);
  assert.deepEqual(groupMetrics(r, 'planningArea'), [area]);
  assert.deepEqual(groupMetrics(r, 'subzone'), [subzone]);
  assert.equal(groupLabel(age, 'ageGroup'), '20–24');
  assert.equal(groupLabel(subzone, 'subzone'), 'Yew Tee · Choa Chu Kang');
});

test('sorts stored values deterministically, keeps unknowns last and does not mutate reports', () => {
  const unknown = metric({ group: { planningArea: 'a' }, benefiting: { value: null, numeratorPopulation: 0, denominatorPopulation: 0, denominator: 'comparable-population' } });
  const low = metric({ group: { planningArea: 'b' }, benefiting: { value: .2, numeratorPopulation: 120, denominatorPopulation: 600, denominator: 'comparable-population' } });
  const high = metric({ group: { planningArea: 'c' } });
  const groups = [unknown, low, high];
  assert.deepEqual(sortGroupMetrics(groups, 'planningArea', 'benefit-desc'), [high, low, unknown]);
  assert.deepEqual(sortGroupMetrics(groups, 'planningArea', 'benefit-asc'), [low, high, unknown]);
  assert.deepEqual(sortGroupMetrics(groups, 'planningArea', 'name'), [unknown, low, high]);
  assert.deepEqual(groups, [unknown, low, high]);
  const fewer = metric({ group: { planningArea: 'd' }, coverage: { ...high.coverage, comparablePopulation: 10 } });
  assert.deepEqual(sortGroupMetrics([high, fewer], 'planningArea', 'coverage-asc'), [fewer, high]);
});
