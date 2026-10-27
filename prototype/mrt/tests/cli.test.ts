import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const cli = join(root, 'prototype/mrt/cli.ts');
test('CLI runs from any working directory, reports auditable samples, and is read-only by default', () => {
  const report = join(root, 'docs/MRT_GRAPH_VALIDATION.md');
  const before = existsSync(report) ? readFileSync(report, 'utf8') : null;
  const result = spawnSync(process.execPath, [cli, '--date', '2026-10-27'], { cwd: join(root, 'docs'), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.date, '2026-10-27');
  assert.equal(summary.baseline.stationNodes, 184);
  assert.equal(summary.baseline.unreachableStationPairs, 0);
  assert.ok(summary.samples.some(s => s.transfers > 0 && s.totalMinutes > 0));
  assert.equal(existsSync(report) ? readFileSync(report, 'utf8') : null, before);
});
test('CLI rejects invalid/unsupported dates and unknown arguments with a useful error', () => {
  for (const args of [['--date', '2026-02-30'], ['--date', '2025-10-27'], ['--unexpected'], ['--date']]) {
    const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /date|service|argument/i);
  }
});
