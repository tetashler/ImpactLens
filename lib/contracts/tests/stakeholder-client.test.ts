import test from 'node:test';
import assert from 'node:assert/strict';
import {StakeholderRequestGate} from '../../stakeholder-simulation/client.ts';
import {StakeholderRequestSession,addStakeholderHistory} from '../../stakeholder-simulation/client.ts';
import {createDemoInput} from '../../stakeholder-simulation/roles.ts';
import {handleStakeholderRequest} from '../../server/stakeholder-simulation/service.ts';

test('stakeholder attempts reject cancellation, delayed replies and A to B to A resurrection',()=>{
  const gate=new StakeholderRequestGate();gate.setContext('A');const first=gate.begin('A');
  assert.ok(gate.accepts(first,'A'));gate.setContext('B');gate.setContext('A');
  assert.equal(first.controller.signal.aborted,true);assert.equal(gate.accepts(first,'A'),false);
  const retry=gate.begin('A');assert.notEqual(first.attemptId,retry.attemptId);assert.ok(gate.accepts(retry,'A'));
  gate.cancel();assert.equal(gate.accepts(retry,'A'),false);
});
test('unchanged graph navigation preserves acceptance, new attempt supersedes old ticket',()=>{
  const gate=new StakeholderRequestGate();const first=gate.begin('same');gate.setContext('same');assert.ok(gate.accepts(first,'same'));
  const second=gate.begin('same');assert.equal(gate.accepts(first,'same'),false);assert.ok(gate.accepts(second,'same'));
});
test('cancelling a stalled response releases its body reader even when upstream ignores abort',async()=>{
  const session=new StakeholderRequestSession();let cancelled=false,ready!:()=>void;
  const started=new Promise<void>(r=>ready=r);
  const response=new Response(new ReadableStream({start(){},cancel(){cancelled=true;}}));
  const fetcher=(async()=>{ready();return response;})as typeof fetch;
  const result=session.execute(createDemoInput(),'context',fetcher);await started;await new Promise(r=>setTimeout(r,0));session.cancel();
  const winner=await Promise.race([result.then(()=>true),new Promise<boolean>(r=>setTimeout(()=>r(false),150))]);
  assert.ok(winner,'cancel must settle the request');assert.ok(cancelled,'cancel must release body resources');
});
test('client accepts the actual deterministic API envelope and rejects foreign attempt attribution',async()=>{
  const session=new StakeholderRequestSession(),input=createDemoInput();
  const fetcher=(async(_url,init)=>handleStakeholderRequest(new Request('http://localhost/api/stakeholder-simulate',init)))as typeof fetch;
  const run=await session.execute(input,'real-api',fetcher);assert.equal(run?.status,'completed');assert.equal(run?.events.length,18);
  const bad=(async(url,init)=>{const response=await fetcher(url,init),body=await response.json();body.attemptId='foreign';return Response.json(body);})as typeof fetch;
  await assert.rejects(()=>session.execute(input,'real-api',bad),/identity mismatch/);
});
test('late successful reply from cancelled attempt cannot replace a same-input retry',async()=>{
  const session=new StakeholderRequestSession(),input=createDemoInput();let release!:()=>void,started!:()=>void;
  const held=new Promise<void>(r=>release=r),arrived=new Promise<void>(r=>started=r);
  const real=(async(_url,init)=>handleStakeholderRequest(new Request('http://localhost/api/stakeholder-simulate',init)))as typeof fetch;
  const delayed=(async(url,init)=>{const response=await real(url,init);started();await held;return response;})as typeof fetch;
  const old=session.execute(input,'same',delayed);await arrived;
  const current=await session.execute(input,'same',real);release();assert.equal(await old,null);assert.equal(current?.status,'completed');
});
test('history rejects conflicting event text under an existing immutable run identity',async()=>{
  const session=new StakeholderRequestSession();const fetcher=(async(_url,init)=>handleStakeholderRequest(new Request('http://localhost/api/stakeholder-simulate',init)))as typeof fetch;
  const run=(await session.execute(createDemoInput(),'history',fetcher))!;
  const altered=structuredClone(run);altered.events[0].statement='An altered synthetic record under a reused identity.';
  assert.throws(()=>addStakeholderHistory([run],altered),/Conflicting/);
  // Repeated identical imports deduplicate rather than editing an existing record.
  assert.equal(addStakeholderHistory([run],structuredClone(run)).length,1);
});
test('a valid run generated for altered assumptions is rejected as the current response',async()=>{
  const session=new StakeholderRequestSession();
  const wrong=(async(_url,init)=>{const body=JSON.parse(String(init?.body));body.input.assumptions[0].value='negotiated';return handleStakeholderRequest(new Request('http://localhost/api/stakeholder-simulate',{...init,body:JSON.stringify(body)}));})as typeof fetch;
  await assert.rejects(()=>session.execute(createDemoInput(),'submitted',wrong),/does not match/);
});
