import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { parseEldercareResponse } from '../contract.ts';

test('offline CLI returns compact valid population-weighted scenario and unsupported geography',()=>{
  const run=()=>spawnSync(process.execPath,['prototype/eldercare/cli.ts','--size','2000','--json'],{encoding:'utf8'});
  const a=run();assert.equal(a.status,0,a.stderr);const result=parseEldercareResponse(JSON.parse(a.stdout));
  assert.equal(result.baselineFacilities.length,4);assert.equal(result.comparisons.length,2);
  assert.ok(result.metrics[0].unlocatedPopulation>0);assert.equal(result.provenance.population.referenceYear,2020);
  assert.ok(a.stdout.length<100000);assert.equal(a.stdout,run().stdout);
});
test('CLI rejects unknown flags, malformed thresholds and impossible sample sizes',()=>{
  for(const [args,pattern] of [[['--unknown'],/Unknown option/],[['--thresholds','NaN'],/threshold/i],[['--size','1'],/positive cells/i]] as const){
    const run=spawnSync(process.execPath,['prototype/eldercare/cli.ts',...args],{encoding:'utf8'});assert.notEqual(run.status,0);assert.match(run.stderr,pattern);
  }
});
test('JSON remains a valid response when benchmarking is requested',()=>{
  const run=spawnSync(process.execPath,['prototype/eldercare/cli.ts','--json','--benchmark'],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);parseEldercareResponse(JSON.parse(run.stdout));assert.match(run.stderr,/preparationMilliseconds/);
});
test('public eldercare contract imports with Node modules blocked',()=>{
  const url=new URL('../contract.ts',import.meta.url).href;
  const code=`import {registerHooks,builtinModules} from 'node:module';registerHooks({resolve(s,c,next){if(s.startsWith('node:')||builtinModules.includes(s))throw new Error('Node import at browser boundary');return next(s,c);}});const c=await import(${JSON.stringify(url)});if(typeof c.parseEldercareResponse!=='function')throw new Error('Missing parser');`;
  const run=spawnSync(process.execPath,['--input-type=module','--eval',code],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
});
