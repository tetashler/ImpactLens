import test from 'node:test';
import assert from 'node:assert/strict';
import {StakeholderRequestSession} from '../../stakeholder-simulation/client.ts';
import {createDemoInput} from '../../stakeholder-simulation/roles.ts';
import {runStakeholderSimulation} from '../../stakeholder-simulation/engine.ts';

const nativeSetTimeout=setTimeout,nativeClearTimeout=clearTimeout;
function input(){const value=createDemoInput();value.stakeholderRoles=value.stakeholderRoles.slice(0,2);value.simulationOptions.rounds=1;return value;}
async function within<T>(promise:Promise<T>):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([promise,new Promise<never>((_,reject)=>{timer=nativeSetTimeout(()=>reject(new Error('Request did not settle within the test bound.')),5000);})]);}
  finally{nativeClearTimeout(timer);}
}
function stalledFetch(){
  let started!:()=>void,signal:AbortSignal|undefined;
  const ready=new Promise<void>(resolve=>started=resolve);
  const fetcher=(async(_url,init)=>{signal=init?.signal??undefined;started();return new Promise<Response>(()=>{});})as typeof fetch;
  return {ready,fetcher,get signal(){return signal;}};
}
async function recordedFetch(){
  const recorded=await runStakeholderSimulation(input(),{attemptId:'timeout-recorded-fixture'});
  return (async(_url,init)=>{
    const request=JSON.parse(String(init?.body));
    const runId=`run-${recorded.inputFingerprint.slice(0,24)}-${request.attemptId}`;
    const run=JSON.parse(JSON.stringify(recorded).replaceAll(recorded.runId,runId));
    run.attemptId=request.attemptId;
    return Response.json({version:1,attemptId:request.attemptId,run});
  })as typeof fetch;
}

test('default 15-second deadline rejects even when fetch never observes abort',async context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  const session=new StakeholderRequestSession(),pending=stalledFetch();
  const result=session.execute(input(),'same',pending.fetcher);await pending.ready;
  context.mock.timers.tick(14999);assert.equal(pending.signal?.aborted,false);
  const rejected=assert.rejects(()=>within(result),/timed out/i);
  context.mock.timers.tick(1);await rejected;
  assert.equal(pending.signal?.aborted,true);
});

test('deadline cancels a stalled response body and reports a safe timeout',async context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  const session=new StakeholderRequestSession();let cancelled=false,started!:()=>void;
  const ready=new Promise<void>(resolve=>started=resolve);
  const fetcher=(async()=>{started();return new Response(new ReadableStream({start(){},cancel(){cancelled=true;}}));})as typeof fetch;
  const rejected=assert.rejects(()=>within(session.execute(input(),'body',fetcher,30)),/^Error: Stakeholder request timed out\. Try again\.$/);
  await ready;await new Promise(resolve=>setImmediate(resolve));context.mock.timers.tick(30);await rejected;
  assert.ok(cancelled);
});

test('manual cancellation and A to B to A return null promptly instead of timing out',async context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  for(const change of [(session:StakeholderRequestSession)=>session.cancel(),(session:StakeholderRequestSession)=>{session.setContext('B');session.setContext('A');}]){
    const session=new StakeholderRequestSession(),pending=stalledFetch();
    const result=session.execute(input(),'A',pending.fetcher,100);await pending.ready;change(session);
    assert.equal(await within(result),null);
    assert.equal(pending.signal?.aborted,true);
  }
});

test('supersession in the deadline turn cannot report an old timeout as the current attempt',async context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  const session=new StakeholderRequestSession(),pending=stalledFetch();
  const result=session.execute(input(),'A',pending.fetcher,20);await pending.ready;
  context.mock.timers.tick(20);
  session.setContext('B');session.setContext('A');
  assert.equal(await within(result),null);
});

test('same-input retry supersedes an ignored-abort request and timeout allows a fresh retry',async context=>{
  const realFetch=await recordedFetch();context.mock.timers.enable({apis:['setTimeout']});
  const session=new StakeholderRequestSession(),pending=stalledFetch(),value=input();
  const old=session.execute(value,'same',pending.fetcher,100);await pending.ready;
  const current=session.execute(value,'same',realFetch,500);
  assert.equal(await within(old),null);
  assert.equal((await within(current))?.status,'completed');
  const timedOut=stalledFetch();
  const rejected=assert.rejects(()=>within(session.execute(value,'same',timedOut.fetcher,20)),/timed out/i);
  await timedOut.ready;context.mock.timers.tick(20);await rejected;
  assert.equal((await within(session.execute(value,'same',realFetch,500)))?.status,'completed');
});

test('successful completion clears deadline and a late timed-out response releases its body',async context=>{
  const realFetch=await recordedFetch();context.mock.timers.enable({apis:['setTimeout']});
  const session=new StakeholderRequestSession();let successfulSignal:AbortSignal|undefined;
  const success=(async(url,init)=>{successfulSignal=init?.signal??undefined;return realFetch(url,init);})as typeof fetch;
  assert.equal((await within(session.execute(input(),'success',success,100)))?.status,'completed');
  context.mock.timers.tick(120);
  assert.equal(successfulSignal?.aborted,false,'completed request must not be aborted by a leftover timer');
  let release!:(response:Response)=>void,started!:()=>void,cancelled=false;
  const ready=new Promise<void>(resolve=>started=resolve);
  const held=(async()=>{started();return new Promise<Response>(resolve=>release=resolve);})as typeof fetch;
  const result=session.execute(input(),'late',held,20);await ready;
  const rejected=assert.rejects(()=>within(result),/timed out/i);context.mock.timers.tick(20);await rejected;
  release(new Response(new ReadableStream({start(){},cancel(){cancelled=true;}})));
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(cancelled,'ignored-abort late response must release body resources');
});

test('timeout overrides are bounded integers and invalid values never dispatch',async()=>{
  const session=new StakeholderRequestSession();let calls=0;
  const fetcher=(async()=>{calls++;throw new Error('Unexpected dispatch');})as typeof fetch;
  for(const duration of [0,-1,1.5,NaN,Infinity,120001])await assert.rejects(()=>session.execute(input(),'invalid',fetcher,duration),/timeout/i);
  assert.equal(calls,0);
});
