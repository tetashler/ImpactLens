import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonical} from '../../experiments/validation.ts';
import {buildPersonalityRequest,mockPersonalityRoster,validatePersonalityRoster,type PersonalityInitialization} from '../../citizen-grounding/personality.ts';
import {initializeProviderPersonalities,personalityBatchEvidence} from '../../server/inference/personality.ts';

const input=(capable=35,background=15):PersonalityInitialization=>({runId:'run-personality-fixture',seed:'neutral-seed',capableIds:Array.from({length:capable},(_,i)=>'citizen-'+(i+1)),backgroundIds:Array.from({length:background},(_,i)=>'background-'+(i+1))});
const hash=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
const clone=<T>(value:T):T=>structuredClone(value);
function content(count=35){return {profiles:Array.from({length:count},(_,i)=>({slotId:'profile-'+(i+1),style:'exploratory',c:i%5,i:Math.floor(i/5)%5,d:Math.floor(i/25)%5,k:4,u:4}))};}
function envelope(count=35){return {id:'gen-fixture-personality-001',model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',choices:[{index:0,finish_reason:'stop',native_finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(content(count)),refusal:null}}],usage:{prompt_tokens:1800,completion_tokens:2200,total_tokens:4000,cost:0.003,completion_tokens_details:{reasoning_tokens:0}}};}

test('real personality initialization uses the existing fixed transport once and preserves provider provenance',async()=>{
 const i=input(),calls:{url:string;body:any}[]=[],records:any[]=[];
 const roster=await initializeProviderPersonalities(i,{key:'fixture-key',fetcher:async(url,init)=>{calls.push({url:String(url),body:JSON.parse(init!.body as string)});return Response.json(envelope());},onRecord:r=>records.push(r)});
 assert.equal(calls.length,1);assert.equal(calls[0].url,'https://openrouter.ai/api/v1/chat/completions');
 const request=await buildPersonalityRequest(i);assert.deepEqual(calls[0].body,request.body);assert.equal(hash(calls[0].body),request.inputDigest);
 assert.equal(roster.generation.mode,'real-provider');assert.equal(roster.generation.usageBasis,'provider-reported');assert.equal(roster.generation.id,'gen-fixture-personality-001');
 assert.equal(roster.generation.inputTokens,1800);assert.equal(roster.generation.outputTokens,2200);assert.equal(roster.generation.costUsd,0.003);
 assert.equal(roster.profiles.filter(p=>p.origin==='model-generated').length,35);assert.equal(roster.profiles.filter(p=>p.origin==='deterministic-rule').length,15);
 assert.ok(roster.profiles.slice(0,35).every(p=>p.generationId==='gen-fixture-personality-001'));
 assert.equal(records.length,1);assert.equal(records[0].status,'accepted');assert.equal(records[0].generationId,roster.generation.id);
 assert.ok(Object.isFrozen(roster)&&Object.isFrozen(roster.profiles[0].traits));await validatePersonalityRoster(clone(roster),i.capableIds,i.backgroundIds);
});

test('existing personality-v1 request and mock roster hashes remain replayable byte for byte',async()=>{
 const i=input(),request=await buildPersonalityRequest(i),roster=await mockPersonalityRoster(i);
 assert.equal(request.inputDigest,'23f88dc33c0c2d8242e857898f7cbf625edef36498432986faca540b25ed9e06');
 assert.equal(request.requestId,'575b8e99059d7abe7930686111f1214f33b2e85b6d7eabcd5f4b804611637bb4');
 assert.equal(roster.id,'personality-roster-f6ad4c365fd1c7b0d9e74c7516b48401c27b21254799ebac6c63d31e60601c1c');
 assert.equal(roster.generation.outputDigest,'856235aa10477fb563a64494c6fd267e53f0b868f2e91d561ede4f961a86eb90');
});

for(const [count,background]of [[35,15],[70,30]])test(`${count} provider profiles fit one bounded request without factual profiles and retain every anonymous slot`,async()=>{
 const i=input(count,background),seen:any[]=[];
 const roster=await initializeProviderPersonalities(i,{key:'fixture-key',fetcher:async(_url,init)=>{seen.push(JSON.parse(init!.body as string));return Response.json(envelope(count));}});
 assert.equal(seen.length,1);assert.equal(roster.profiles.length,count+background);assert.equal(new Set(roster.profiles.map(p=>p.citizenId)).size,count+background);
 assert.equal(new Set(roster.profiles.map(p=>canonical(p.traits))).size,count+background);
 const sent=JSON.stringify(seen[0]),context=JSON.parse(seen[0].messages[1].content);
 assert.ok(!sent.includes('"citizen-1"')&&!sent.includes(i.seed)&&!sent.includes(i.runId));
 assert.deepEqual(context.slots.map((s:any)=>s.slotId),Array.from({length:count},(_,n)=>'profile-'+(n+1)));
 assert.ok(Buffer.byteLength(sent)<=24000);assert.equal(seen[0].max_tokens,6000);
 const evidence=await personalityBatchEvidence(i);assert.equal(evidence.batchCount,1);assert.equal(evidence.maximumBatches,3);
 assert.equal(evidence.maximumCompactOutputBytes,count===35?2665:5325);assert.equal(Buffer.byteLength(JSON.stringify(content(count))),evidence.maximumCompactOutputBytes);
 assert.equal(evidence.requestBodyBytes,count===35?3349:4784);
 assert.ok(evidence.maximumCompactOutputBytes<=6000);assert.ok(evidence.maximumCompactOutputBytes<=evidence.maximumOutputTokens);
 assert.equal(evidence.requestBodyBytes,Buffer.byteLength(canonical(seen[0])));
});

for(const [label,mutate]of [
 ['missing slot',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles.pop();v.choices[0].message.content=JSON.stringify(b);}],
 ['extra slot',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles.push({...b.profiles[0],slotId:'profile-36'});v.choices[0].message.content=JSON.stringify(b);}],
 ['duplicate slot',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles[1].slotId=b.profiles[0].slotId;v.choices[0].message.content=JSON.stringify(b);}],
 ['unknown slot',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles[0].slotId='unknown-slot';v.choices[0].message.content=JSON.stringify(b);}],
 ['duplicate traits',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles[1]={...b.profiles[0],slotId:'profile-2'};v.choices[0].message.content=JSON.stringify(b);}],
 ['extra factual root field',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.home='PRIVATE_FACT_SENTINEL';v.choices[0].message.content=JSON.stringify(b);}],
 ['invented factual field',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles[0].occupation='PRIVATE_FACT_SENTINEL';v.choices[0].message.content=JSON.stringify(b);}],
 ['invalid style',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles[0].style='unknown';v.choices[0].message.content=JSON.stringify(b);}],
 ['invalid trait',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles[0].c=5;v.choices[0].message.content=JSON.stringify(b);}],
 ['model mismatch',(v:any)=>{v.model='other-model';}],
 ['provider mismatch',(v:any)=>{v.provider='other-provider';}],
 ['missing usage',(v:any)=>{delete v.usage;}],
 ['zero output usage',(v:any)=>{v.usage.completion_tokens=0;}],
 ['negative input usage',(v:any)=>{v.usage.prompt_tokens=-1;}],
 ['excess input usage',(v:any)=>{v.usage.prompt_tokens=24001;v.usage.total_tokens=26201;}],
 ['excess output usage',(v:any)=>{v.usage.completion_tokens=6001;}],
 ['fractional output usage',(v:any)=>{v.usage.completion_tokens=2200.5;}],
 ['missing total usage',(v:any)=>{delete v.usage.total_tokens;}],
 ['inconsistent total usage',(v:any)=>{v.usage.total_tokens=4001;}],
 ['missing cost',(v:any)=>{delete v.usage.cost;}],
 ['negative cost',(v:any)=>{v.usage.cost=-1;}],
 ['nonzero reasoning',(v:any)=>{v.usage.completion_tokens_details.reasoning_tokens=1;}],
 ['missing reasoning usage',(v:any)=>{delete v.usage.completion_tokens_details;}],
 ['missing generation ID',(v:any)=>{delete v.id;}],
 ['invalid generation ID',(v:any)=>{v.id='invalid identifier';}],
 ['truncation',(v:any)=>{v.choices[0].finish_reason='length';}],
 ['tool call',(v:any)=>{v.choices[0].message.tool_calls=[];}],
 ['malformed JSON',(v:any)=>{v.choices[0].message.content='{ PRIVATE_FACT_SENTINEL';}],
 ['oversized response',(v:any)=>{v.choices[0].message.content='PRIVATE_FACT_SENTINEL'.repeat(500);}],
] as const)test('real personality transport rejects '+label+' once without mock fallback or private diagnostics',async()=>{
 const v=envelope();mutate(v);let calls=0;const records:any[]=[];
 await assert.rejects(initializeProviderPersonalities(input(),{key:'fixture-key',fetcher:async()=>{calls++;return Response.json(v);},onRecord:r=>records.push(r)}),(e:unknown)=>{assert.ok(!String(e).includes('PRIVATE_FACT_SENTINEL'));return true;});
 assert.equal(calls,1);assert.equal(records.length,1);assert.equal(records[0].status,'failed');assert.ok(!JSON.stringify(records).includes('PRIVATE_FACT_SENTINEL'));
});

test('invalid input and cancellation prevent real personality dispatch',async()=>{
 let calls=0;const options={key:'fixture-key',fetcher:async()=>{calls++;return Response.json(envelope());}};
 await assert.rejects(initializeProviderPersonalities({...input(),occupation:'PRIVATE_FACT_SENTINEL'} as never,options));
 const invalid=input();invalid.capableIds[1]=invalid.capableIds[0];await assert.rejects(initializeProviderPersonalities(invalid,options));
 const controller=new AbortController();controller.abort();await assert.rejects(initializeProviderPersonalities(input(),options,controller.signal));assert.equal(calls,0);
});

test('provider failures and bounded timeouts never retry or return a deterministic replacement',async()=>{
 let calls=0;
 await assert.rejects(initializeProviderPersonalities(input(),{key:'fixture-key',fetcher:async()=>{calls++;return new Response('',{status:429});}}));assert.equal(calls,1);
 const records:any[]=[];await assert.rejects(initializeProviderPersonalities(input(),{key:'fixture-key',timeoutMs:5,fetcher:async()=>{calls++;return new Promise<Response>(()=>{});},onRecord:r=>records.push(r)}),/timed out/);
 assert.equal(calls,2);assert.equal(records[0].status,'failed');assert.equal(records[0].errorCode,'AI_TIMEOUT');
});

test('personality request hash inspection finishes before dispatch and cannot rewrite its fixed body',async()=>{
 const i=input(),request=await buildPersonalityRequest(i),order:string[]=[];
 const roster=await initializeProviderPersonalities(i,{key:'fixture-key',beforeDispatch:async info=>{
  order.push('inspect');assert.equal(info.requestBodySha256,request.inputDigest);assert.deepEqual(info.requestBody,request.body);
  assert.equal(info.url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(info.method,'POST');
  try{(info.requestBody as any).model='other-model';}catch{}
 },fetcher:async(_url,init)=>{order.push('dispatch');assert.deepEqual(JSON.parse(init!.body as string),request.body);return Response.json(envelope());}});
 assert.deepEqual(order,['inspect','dispatch']);assert.equal(roster.generation.inputDigest,request.inputDigest);
});

test('a rejected or expired request inspection prevents personality dispatch',async()=>{
 let calls=0;const fetcher:typeof fetch=async()=>{calls++;return Response.json(envelope());};
 await assert.rejects(initializeProviderPersonalities(input(),{key:'fixture-key',fetcher,beforeDispatch:async()=>{throw Error('INSPECTION_REJECTED');}}));
 await assert.rejects(initializeProviderPersonalities(input(),{key:'fixture-key',fetcher,timeoutMs:5,beforeDispatch:async()=>new Promise<void>(()=>{})}),/timed out/);assert.equal(calls,0);
});

test('restoring accepted real personalities performs no fetch and rejects changed source provenance',async()=>{
 const i=input(),roster=await initializeProviderPersonalities(i,{key:'fixture-key',fetcher:async()=>Response.json(envelope())});
 const originalFetch=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('RESTORE_MUST_NOT_INFER');};
 try{
  assert.deepEqual(await validatePersonalityRoster(clone(roster),i.capableIds,i.backgroundIds),roster);
  const changed=clone(roster);changed.generation.id='different-source-generation';await assert.rejects(validatePersonalityRoster(changed,i.capableIds,i.backgroundIds),/PERSONALITY_(PROVENANCE|DIGEST)/);
 }finally{globalThis.fetch=originalFetch;}
 assert.equal(calls,0);
});
