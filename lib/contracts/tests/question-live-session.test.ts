import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveInput} from '../../stakeholder-simulation/inference-input.ts';
import {runStakeholderSimulation,deterministicTurn} from '../../stakeholder-simulation/engine.ts';

const MODEL='deepseek/deepseek-v4-flash-0731';
async function api(){const value=await import('../../stakeholder-simulation/inference-client.ts').catch(()=>null);assert.ok(value,'Live inference session must exist');return value;}
const input=()=>createLiveInput('import-tax','What if Singapore increased tax on imported goods?');
async function answer(init?:RequestInit,partial=false){
 const body=JSON.parse(String(init?.body));assert.equal(body.version,2);
 const run=await runStakeholderSimulation(body.input,{attemptId:body.attemptId,provider:'openrouter',model:MODEL,generateTurn:async c=>{if(partial&&c.turnIndex===1)throw new Error('Mock interruption');return deterministicTurn(c);}});
 const records=run.events.map((_,i)=>({requestedModel:MODEL,requestedProvider:'digitalocean',servingModel:MODEL,servingProvider:'DigitalOcean',identityVerification:'completion',generationId:`gen-${i}`,inputTokens:null,outputTokens:null,totalTokens:null,costUsd:null,status:'accepted',errorCode:null,durationMs:1}));
 return Response.json({version:2,attemptId:body.attemptId,run,inference:{version:1,requestedModel:MODEL,requestedProvider:'digitalocean',allowFallbacks:false,successfulCalls:records.length,failedCalls:0,retries:0,inputTokens:null,outputTokens:null,totalTokens:null,costUsd:null,reservedTokens:10000,reservationBasis:'Conservative UTF-8 bytes plus bounded output; not billed usage.',durationMs:100,roundsCompleted:Math.floor(run.events.length/4),activeAgents:4,records,limits:{agents:4,rounds:2,calls:8,outputTokens:800,reservedTokens:120000,runTimeoutMs:120000,costUsd:0.05}}});
}
const real:typeof fetch=async(url,init)=>{assert.equal(url,'/api/stakeholder-simulate');return answer(init);};

test('live session submits v2 and retains completed and partial diagnostics',async()=>{
 const {LiveInferenceSession}=await api(),session=new LiveInferenceSession();
 assert.equal((await session.execute(input(),'A',real))?.run.status,'completed');
 const result=await session.execute(input(),'A',async(_url,init)=>answer(init,true));
 assert.equal(result?.run.status,'partial');assert.equal(result?.run.events.length,1);assert.equal(result?.inference.successfulCalls,1);
});

test('cancelled uncooperative requests settle immediately and cannot resurrect after A to B to A',async()=>{
 const {LiveInferenceSession}=await api(),session=new LiveInferenceSession();
 let ready!:()=>void,release!:(value:Response)=>void,oldInit:RequestInit|undefined;
 const started=new Promise<void>(resolve=>ready=resolve);
 const old=session.execute(input(),'A',async(_url,init)=>{oldInit=init;ready();return new Promise(resolve=>release=resolve);});
 await started;session.setContext('B');session.setContext('A');assert.equal(await old,null);
 const current=await session.execute(input(),'A',real);release(await answer(oldInit));
 assert.equal(current?.run.status,'completed');assert.notEqual(current?.attemptId,JSON.parse(String(oldInit?.body)).attemptId);
});

test('timeout covers stalled fetch and stalled body, releases reader and permits a fresh retry',async()=>{
 const {LiveInferenceSession}=await api(),session=new LiveInferenceSession();
 await assert.rejects(session.execute(input(),'A',async()=>new Promise(()=>{}),10),/timed out/i);
 let cancelled=false;
 await assert.rejects(session.execute(input(),'A',async()=>new Response(new ReadableStream({cancel(){cancelled=true;}})),10),/timed out/i);
 assert.equal(cancelled,true);assert.equal((await session.execute(input(),'A',real))?.run.status,'completed');
});

test('safe HTTP errors never display arbitrary provider text and do not retry automatically',async()=>{
 const {LiveInferenceSession}=await api(),session=new LiveInferenceSession();let calls=0;
 await assert.rejects(session.execute(input(),'A',async()=>{calls++;return Response.json({code:'AI_CONFIG',error:'private key /server/file stack'},{status:503});}),error=>error instanceof Error&&/server|configur/i.test(error.message)&&!(/private|key|stack|\/server/.test(error.message)));
 assert.equal(calls,1);
 await assert.rejects(session.execute(input(),'A',async()=>Response.json({error:'raw upstream secret'},{status:500})),error=>error instanceof Error&&!/secret|raw|upstream/.test(error.message));
});

test('wrong version, attempt, input and over-budget bodies are rejected',async()=>{
 const {LiveInferenceSession}=await api(),session=new LiveInferenceSession();
 for(const mutate of [(body:any)=>body.version=1,(body:any)=>body.attemptId='foreign',(body:any)=>body.run.inputSnapshot.assumptions[0].value='changed']){
  await assert.rejects(session.execute(input(),'A',async(_url,init)=>{const body=await (await answer(init)).json();mutate(body);return Response.json(body);}));
 }
 await assert.rejects(session.execute(input(),'A',async()=>new Response('x'.repeat(524289))),/size|large|budget/i);
 await assert.rejects(session.execute(input(),'A',real,130001),/timeout/i);
});

test('whole-pipeline timeout settles when response fingerprint verification stalls',async()=>{
 const {LiveInferenceSession}=await api(),session=new LiveInferenceSession();
 const original=crypto.subtle.digest,digest=original.bind(crypto.subtle);let release=()=>{};
 try{
  const response=await answer({body:JSON.stringify({version:2,attemptId:'prebuilt',input:input()})});
  crypto.subtle.digest=(...args:Parameters<SubtleCrypto['digest']>)=>new Promise((resolve,reject)=>{release=()=>{digest(...args).then(resolve,reject);};});
  await assert.rejects(session.execute(input(),'A',async(_url,init)=>{
   // The held digest must be in client response verification, after the valid
   // server record is generated and re-attributed to the current request.
   const body=await response.clone().json(),attemptId=JSON.parse(String(init?.body)).attemptId;
   const oldRunId=body.run.runId;body.attemptId=attemptId;body.run.attemptId=attemptId;
   const runId=`run-${body.run.inputFingerprint.slice(0,24)}-${attemptId}`;body.run.runId=runId;
   for(const event of body.run.events){event.id=event.id.replace(oldRunId,runId);event.runId=runId;event.previousEventIds=event.previousEventIds.map((id:string)=>id.replace(oldRunId,runId));event.reasoningSummary=event.reasoningSummary.replaceAll(oldRunId,runId);}
   for(const memory of body.run.memories)memory.eventIds=memory.eventIds.map((id:string)=>id.replace(oldRunId,runId));
   return Response.json(body);
  },20),/timed out/i);
 }finally{release();crypto.subtle.digest=original;session.cancel();}
});
