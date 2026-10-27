import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const cli = join(root, 'prototype/mrt/simulate-cli.ts');
test('demonstration CLI prints concise hypothetical before/after comparisons and reproducible JSON', () => {
  const human = spawnSync(process.execPath, [cli], { cwd: join(root, 'docs'), encoding: 'utf8' });
  assert.equal(human.status, 0, human.stderr);
  assert.match(human.stdout, /hypothetical/i);
  assert.match(human.stdout, /baseline/i);
  assert.match(human.stdout, /saved/i);
  const run = () => spawnSync(process.execPath, [cli, '--date', '2026-10-31', '--json'], { cwd: root, encoding: 'utf8' });
  const first = run(), second = run();
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  const result = JSON.parse(first.stdout);
  assert.equal(result.serviceDate, '2026-10-31');
  assert.ok(result.comparisons.some(c => c.minutesSaved > 0 && c.usedProposedLine));
  assert.ok(result.comparisons.some(c => c.minutesSaved === 0 && !c.usedProposedLine));
});
test('simulation CLI rejects unknown flags and unsupported service dates', () => {
  for (const args of [['--wat'], ['--date'], ['--date', '2025-10-27']]) {
    const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /argument|date|service/i);
  }
});
