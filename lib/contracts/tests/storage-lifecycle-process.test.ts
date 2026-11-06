import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import * as admission from '../../server/society/storage-admission.ts';

const directory=resolve('tmp/storage-lifecycle-20261106');mkdirSync(directory,{recursive:true});
const worker=resolve('scripts/testing/storage-lifecycle-worker.ts'),guard=pathToFileURL(resolve('scripts/testing/offline-network.mjs')).href;
const run=(base:string,mode:string)=>{
 const result=spawnSync(process.execPath,['--import',guard,worker,base,mode],{encoding:'utf8',windowsHide:true,timeout:30000});
 assert.equal(result.status,0,result.stderr||result.stdout);return JSON.parse(result.stdout);
};

test('a pending human review blocks offline rotation; stopped processes allow rotation and old attempts remain used',{timeout:45000},async()=>{
 assert.equal(typeof admission.getStorageCapacity,'function');
 const lifecycle=await import('../../server/society/storage-lifecycle.ts'),base=mkdtempSync(join(directory,'process-'));
 const child=spawn(process.execPath,['--import',guard,worker,base,'pending-review'],{stdio:['ignore','pipe','pipe','ipc'],windowsHide:true,timeout:30000});
 const exited=new Promise<number|null>(resolveExit=>child.once('exit',resolveExit));let errors='';child.stderr!.on('data',data=>{errors+=data;});
 try{
  const ready=await new Promise<any>((yes,no)=>{child.once('message',yes);child.once('error',no);child.once('exit',code=>no(Error('Review worker exited '+code+' '+errors)));});
  assert.deepEqual(ready,{pending:true,providerCalls:2});
  assert.throws(()=>lifecycle.rotateStorage(base,{confirm:true}),/STORAGE_.*(?:ACTIVE|BUSY|IN_USE|RUNTIME)/);
  assert.equal(admission.getStorageCapacity(base).used,0,'A pending review must not invent a consumed execution claim.');
 }finally{if(child.exitCode===null){child.send('stop');await exited;}}
 assert.deepEqual(run(base,'fill'),{filled:32});assert.equal(admission.getStorageCapacity(base).available,0);
 lifecycle.rotateStorage(base,{confirm:true});
 const next=admission.getStorageCapacity(base);assert.equal(next.status,'ready');assert.equal(next.used,0);assert.equal(next.available,32);assert.equal(next.archivedPeriods,1);
 assert.deepEqual(run(base,'duplicate'),{duplicateRejected:true});assert.equal(admission.getStorageCapacity(base).used,0);
});
