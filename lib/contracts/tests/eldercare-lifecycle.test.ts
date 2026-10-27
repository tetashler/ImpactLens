import test from 'node:test';
import assert from 'node:assert/strict';
import { AacRequestSession } from '../../eldercare/session.ts';
import { createDefaultEldercareRequest } from '../../eldercare/api-contract.ts';
import { calculateEldercare } from '../../server/eldercare-service.ts';
const request=()=>{const r=createDefaultEldercareRequest('aac-test-1');r.population.size=1000;return r;};
let cached:ReturnType<typeof calculateEldercare>|undefined;
const result=()=>cached??=calculateEldercare(request());
const respond=(value:unknown,status=200)=>Response.json(value,{status});
test('AAC session validates the actual response and sends only the explicit API request',async()=>{
  const session=new AacRequestSession();session.setContext(true,'a');let sent:any;
  const parsed=await session.calculate(request(),'a',(async(_url,init)=>{sent=JSON.parse(init!.body as string);return respond(await result());}) as typeof fetch);
  assert.equal(sent.preset,'bukit-merah-landmarks-v1');assert.equal(parsed!.identity.clientRequestId,'aac-test-1');
  assert.equal(parsed!.result.metrics[0].population,44520);
});
test('inactive mode never sends a calculation and mode switch rejects late completion',async()=>{
  const s=new AacRequestSession();s.setContext(false,'a');let calls=0;
  assert.equal(await s.calculate(request(),'a',(async()=>{calls++;return respond(await result());}) as typeof fetch),null);assert.equal(calls,0);
  let release!:(v:Response)=>void;s.setContext(true,'a');const pending=s.calculate(request(),'a',(()=>new Promise(r=>release=r)) as typeof fetch);
  s.setContext(false,'a');release(respond(await result()));assert.equal(await pending,null);
});
test('input change, reset and same-input repeat cannot restore an earlier request',async()=>{
  for(const action of ['move','threshold','reset'] as const){
    const s=new AacRequestSession();s.setContext(true,'a');let release!:(v:Response)=>void;
    const old=s.calculate(request(),'a',(()=>new Promise(r=>release=r)) as typeof fetch);
    if(action==='reset')s.cancel();else s.setContext(true,action);
    release(respond(await result()));assert.equal(await old,null);
  }
  const s=new AacRequestSession();s.setContext(true,'a');let release!:(v:Response)=>void;
  const old=s.calculate(request(),'a',(()=>new Promise(r=>release=r)) as typeof fetch);
  assert.ok(await s.calculate(request(),'a',(async()=>respond(await result())) as typeof fetch));
  release(respond(await result()));assert.equal(await old,null);
});
test('wrong coordinate/token responses and malformed or failed responses are rejected',async()=>{
  const s=new AacRequestSession();s.setContext(true,'a');const wrong=structuredClone(await result());wrong.request.intervention.position.lon+=.001;
  await assert.rejects(()=>s.calculate(request(),'a',(async()=>respond(wrong)) as typeof fetch));
  const other=structuredClone(await result());other.identity.clientRequestId='old-attempt';
  await assert.rejects(()=>s.calculate(request(),'a',(async()=>respond(other)) as typeof fetch));
  await assert.rejects(()=>s.calculate(request(),'a',(async()=>new Response('{')) as typeof fetch),/read|valid|response/i);
  await assert.rejects(()=>s.calculate(request(),'a',(async()=>respond({version:1,error:{code:'CALCULATION_FAILED',message:'Try again.'}},503)) as typeof fetch),/Try again/);
});
