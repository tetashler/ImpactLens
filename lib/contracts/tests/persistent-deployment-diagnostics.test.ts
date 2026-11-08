import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import type {ChildProcess} from 'node:child_process';

test('startup diagnostics drain output but report only known deployment codes',async()=>{
 const module=await import('../../../scripts/testing/persistent-startup-diagnostics.ts').catch(()=>null);assert.ok(module?.observeStartup,'safe startup diagnostics required');
 const stdout=new PassThrough(),stderr=new PassThrough(),diagnostics=module.observeStartup({stdout,stderr} as unknown as ChildProcess);
 stdout.write('PRIVATE_PROVIDER_KEY=do-not-print\n');stderr.write('{"error":"DEPLOYMENT_STA');stderr.write('TE_CONFIG"}\nPRIVATE_DETAIL\nDEPLOYMENT_FAKE_SECRET\nDEPLOYMENT_STATE_CONFIG\n');
 assert.equal(diagnostics(),'DEPLOYMENT_STATE_CONFIG');
 assert.doesNotMatch(diagnostics(),/PRIVATE|SECRET|FAKE|KEY/);
 stdout.end();stderr.end();
});
