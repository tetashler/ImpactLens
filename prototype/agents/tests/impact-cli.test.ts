import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { parseCitizenSimulation } from '../../../lib/contracts/citizen-simulation.ts';

test('impact CLI validates compact payload, conserves full sample, exposes assumptions',()=>{
  const run=spawnSync(process.execPath,['prototype/agents/impact-cli.ts','--size','1000','--render-limit','2','--json'],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const result=JSON.parse(run.stdout); parseCitizenSimulation(result.payload);
  assert.equal(result.payload.citizens.length,2); assert.equal(result.payload.metadata.population.agentCount,1000);
  assert.ok(Math.abs(result.metrics[0].coverage.representedPopulation-result.payload.metadata.population.representedPopulation)<1e-6);
  assert.equal(result.payload.metadata.resultKind,'illustrative'); assert.equal(result.diagnostics.uniqueOdPairs,3);
});
test('impact CLI rejects unknown flags and impossible sample sizes',()=>{
  for(const [args,pattern] of [[['--unknown'],/Unknown option/],[['--size','2'],/positive cells/],[['--threshold','NaN'],/threshold/i]] as const) {
    const run=spawnSync(process.execPath,['prototype/agents/impact-cli.ts',...args],{encoding:'utf8'});
    assert.notEqual(run.status,0);
    assert.match(run.stderr,pattern);
  }
});
