import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const fixture=fileURLToPath(new URL('../../../scripts/testing/phase4e2-restart-fixture.ts',import.meta.url));
const guard=new URL('../../../scripts/testing/offline-network.mjs',import.meta.url).href;
const hashFile=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');

test('three actual multi-day processes preserve a two-call checkpoint, restore passively, then complete at tick320 using only the remaining two calls',()=>{
 const parent=resolve('tmp');mkdirSync(parent,{recursive:true});const directory=mkdtempSync(join(parent,'phase4e2-process-restart-'));
 const child=(operation:string)=>{
  const p=spawnSync(process.execPath,[fixture,operation,directory],{cwd:resolve('.'),env:{...process.env,NODE_OPTIONS:'--import='+guard},encoding:'utf8',timeout:120_000,maxBuffer:2*1024*1024});
  assert.equal(p.status,0,JSON.stringify({operation,status:p.status,signal:p.signal,stdout:p.stdout,stderr:p.stderr}));
  const row=p.stdout.split(/\r?\n/).find(line=>line.startsWith('PHASE4E2_RESTART_RESULT '));assert.ok(row,operation+' safe result unavailable');
  return JSON.parse(row.slice('PHASE4E2_RESTART_RESULT '.length));
 };
 const first=child('first');
 assert.equal(first.profileId,'multi-day-50-320-v1');assert.equal(first.pacingTarget,4);assert.equal(first.pacingRevision,'loan-repayment-v1');assert.equal(first.totalSteps,320);
 assert.equal(first.calls,2);assert.equal(first.accepted,2);assert.equal(first.job.status,'running');assert.equal(first.job.acceptedDecisions,2);assert.equal(first.checkpoint,true);
 const journal=join(directory,'sessions',first.sessionId+'.jsonl'),before=hashFile(journal);
 const passive=child('passive');
 assert.notEqual(first.pid,passive.pid);assert.equal(passive.job.status,'paused');assert.equal(passive.job.reason,'APPLICATION_RESTART');
 assert.equal(passive.calls,0);assert.equal(passive.accepted,2);assert.equal(passive.restoredDigest,first.worldDigest);
 assert.equal(hashFile(journal),before,'Passive restart must leave the accepted journal byte-for-byte unchanged');
 const resumed=child('resume');
 assert.notEqual(resumed.pid,first.pid);assert.notEqual(resumed.pid,passive.pid);assert.equal(resumed.beforeCalls,0);assert.equal(resumed.beforeAccepted,2);assert.equal(resumed.beforeDigest,first.worldDigest);
 assert.equal(resumed.calls,2);assert.equal(resumed.accepted,4);assert.equal(resumed.job.status,'completed');assert.equal(resumed.job.reason,null);
 assert.equal(resumed.job.tick,320);assert.equal(resumed.job.totalSteps,320);assert.equal(resumed.completed,true);
 assert.equal(resumed.job.remainingCalls,0);assert.equal(resumed.job.revision,resumed.revision);assert.equal(resumed.job.id,first.job.id);
 assert.equal(resumed.fullReplay,true);assert.equal(resumed.checkpointTailReplay,true);assert.equal(resumed.checkpointRecordsBeforeResume,2);
 assert.equal(new Set([...first.requestIds,...resumed.requestIds]).size,4);assert.equal(resumed.providerConcurrency,1);
 assert.equal(resumed.requestTicks.at(-1),320,'The final admitted call remains reserved for the final simulated tick');
 assert.deepEqual(resumed.admission,{calls:4,maxCalls:4});
 writeFileSync(join(directory,'evidence.json'),JSON.stringify({version:1,network:'blocked in all three processes; mocked gateway only',first,passive,resumed},null,2),{mode:0o600});
});
