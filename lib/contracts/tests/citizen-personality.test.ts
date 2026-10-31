import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonical} from '../../experiments/validation.ts';
import {
 PERSONALITY_LIMITS, PERSONALITY_MODEL, PERSONALITY_PROVIDER,
 createMockPersonalityGateway, initializeMockPersonalities, mockPersonalityRoster,
 parsePersonalityRoster, validatePersonalityRoster, buildPersonalityRequest,
 initializeLivePersonalities, combinedPlanningCapacity,
 type PersonalityInitialization, type MockPersonalityGateway,
} from '../../citizen-grounding/personality.ts';

const input=(capable=35,background=15):PersonalityInitialization=>({runId:'run-personality-fixture',seed:'neutral-seed',capableIds:Array.from({length:capable},(_,i)=>'citizen-'+(i+1)),backgroundIds:Array.from({length:background},(_,i)=>'background-'+(i+1))});
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const changedGateway=(change:(value:any)=>void):MockPersonalityGateway=>{
 const original=createMockPersonalityGateway();
 return {mode:'offline-mock',async generate(request,signal){const value=clone(await original.generate(request,signal));change(value);return value;}};
};

for(const [capable,background]of [[35,15],[70,30]])test(`${capable}/${background} neutral initialization resolves every source-owned slot once and freezes the full roster`,async()=>{
 const i=input(capable,background),r=await mockPersonalityRoster(i);
 assert.equal(r.policy,'personality-initialization-v1');assert.equal(r.profiles.length,capable+background);
 assert.deepEqual(r.capableIds,i.capableIds);assert.deepEqual(r.backgroundIds,i.backgroundIds);
 assert.equal(r.profiles.filter(p=>p.origin==='offline-mock').length,capable);
 assert.equal(r.profiles.filter(p=>p.origin==='deterministic-rule').length,background);
 assert.equal(new Set(r.profiles.filter(p=>p.origin==='offline-mock').map(p=>canonical(p.traits))).size,capable);
 assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.profiles)&&Object.isFrozen(r.profiles[0].traits));
 await validatePersonalityRoster(r,i.capableIds,i.backgroundIds);
 assert.deepEqual(parsePersonalityRoster(clone(r),i.capableIds,i.backgroundIds),r);
});

test('mock request uses real structured wire bounds and routing restrictions without transmitting demographic or employment facts',async()=>{
 const i=input(70,30),request=await buildPersonalityRequest(i),body=request.body;
 assert.equal(body.model,PERSONALITY_MODEL);assert.equal(PERSONALITY_MODEL,'deepseek/deepseek-v4-flash-0731');assert.equal(PERSONALITY_PROVIDER,'DigitalOcean');
 assert.deepEqual(body.provider,{only:['digitalocean'],allow_fallbacks:false,require_parameters:true});
 assert.deepEqual(body.reasoning,{effort:'none',exclude:true});assert.equal(body.max_tokens,6000);assert.equal(body.stream,false);
 assert.equal(body.response_format.json_schema.name,'citizen_personalities_v1');assert.equal(body.response_format.json_schema.strict,true);
 assert.equal(body.response_format.json_schema.schema.additionalProperties,false);
 const context=JSON.parse(body.messages[1].content);assert.equal(context.slots.length,70);
 assert.ok(!JSON.stringify(body).includes(i.capableIds[0])&&!JSON.stringify(body).includes(i.seed));
 assert.ok(!Object.hasOwn(context,'demographic')&&!Object.hasOwn(context,'occupation')&&!Object.hasOwn(context,'workplace'));
 assert.ok(Buffer.byteLength(JSON.stringify(body))<=24000);
 const result=await createMockPersonalityGateway().generate(request);
 assert.ok(Buffer.byteLength(result.choices[0].message.content)<=PERSONALITY_LIMITS.outputBytes);
});

test('mock initialization dispatches once, retains exact accepted provider-envelope provenance and labels it mock',async()=>{
 const i=input(),underlying=createMockPersonalityGateway();let calls=0;
 const r=await initializeMockPersonalities(i,{mode:'offline-mock',async generate(request,signal){calls++;return underlying.generate(request,signal);}});
 assert.equal(calls,1);assert.equal(r.generation.mode,'offline-mock');assert.equal(r.generation.status,'accepted');
 assert.equal(r.generation.requestedModel,PERSONALITY_MODEL);assert.equal(r.generation.servingModel,PERSONALITY_MODEL);assert.equal(r.generation.servingProvider,PERSONALITY_PROVIDER);
 assert.equal(r.generation.fallback,false);assert.equal(r.generation.uncertain,false);assert.equal(r.generation.costUsd,0);
 assert.ok(r.profiles.filter(p=>p.origin==='offline-mock').every(p=>p.generationId===r.generation.id));
});

test('same accepted mock seed and roster reproduce exact identities; restore never calls the gateway',async()=>{
 const i=input(),a=await mockPersonalityRoster(i),b=await mockPersonalityRoster(i);
 assert.equal(canonical(a),canonical(b));const originalFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('UNEXPECTED_NETWORK');};
 try{await validatePersonalityRoster(clone(a),i.capableIds,i.backgroundIds);parsePersonalityRoster(clone(a),i.capableIds,i.backgroundIds);}finally{globalThis.fetch=originalFetch;}
 assert.equal(calls,0);
});

test('caller mutation cannot rewrite accepted profiles or the frozen roster',async()=>{
 const i=input(),r=await mockPersonalityRoster(i),before=canonical(r);i.capableIds[0]='changed';
 assert.equal(canonical(r),before);assert.throws(()=>{r.profiles[0].traits.caution=4;});
});

test('initialization refuses unadmitted live mode before any gateway invocation',async()=>{
 let calls=0;
 assert.throws(()=>initializeLivePersonalities(),/PERSONALITY_LIVE_DISABLED/);
 await assert.rejects(initializeMockPersonalities(input(),{mode:'real-provider',generate:async()=>{calls++;throw Error('called');}} as never),/PERSONALITY_LIVE_DISABLED/);
 assert.equal(calls,0);
});

test('unknown source-fact fields cannot enter the neutral initializer',async()=>{
 await assert.rejects(buildPersonalityRequest({...input(),age:34} as never),/PERSONALITY_INPUT/);
 await assert.rejects(buildPersonalityRequest({...input(),occupation:'nurse'} as never),/PERSONALITY_INPUT/);
});

for(const mutate of [
 (i:PersonalityInitialization)=>{i.capableIds[1]=i.capableIds[0];},
 (i:PersonalityInitialization)=>{i.backgroundIds[0]=i.capableIds[0];},
 (i:PersonalityInitialization)=>{i.capableIds[0]='unknown id with spaces';},
 (i:PersonalityInitialization)=>{i.capableIds=[];},
 (i:PersonalityInitialization)=>{i.capableIds=Array.from({length:71},(_,n)=>'c-'+n);},
])test('invalid or overlapping source identities fail before dispatch: '+mutate.toString().slice(0,60),async()=>{
 const i=input();mutate(i);let calls=0;
 await assert.rejects(initializeMockPersonalities(i,{mode:'offline-mock',async generate(){calls++;throw Error('called');}}),/PERSONALITY_INPUT/);assert.equal(calls,0);
});

for(const [label,change,code]of [
 ['unknown slot',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles[0].slotId='invented-slot';v.choices[0].message.content=JSON.stringify(b);},'PERSONALITY_ROSTER'],
 ['missing agent',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles.pop();v.choices[0].message.content=JSON.stringify(b);},'PERSONALITY_ROSTER'],
 ['duplicate slot',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles[1].slotId=b.profiles[0].slotId;v.choices[0].message.content=JSON.stringify(b);},'PERSONALITY_ROSTER'],
 ['duplicate traits',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles[1]={...b.profiles[0],slotId:b.profiles[1].slotId};v.choices[0].message.content=JSON.stringify(b);},'PERSONALITY_DIVERSITY'],
 ['unsupported style',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles[0].style='diagnosed-personality';v.choices[0].message.content=JSON.stringify(b);},'PERSONALITY_TRAITS'],
 ['unsupported trait',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles[0].c=5;v.choices[0].message.content=JSON.stringify(b);},'PERSONALITY_TRAITS'],
 ['source mutation',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.profiles[0].workplace='invented';v.choices[0].message.content=JSON.stringify(b);},'PERSONALITY_ROSTER'],
 ['extra root field',(v:any)=>{const b=JSON.parse(v.choices[0].message.content);b.age=34;v.choices[0].message.content=JSON.stringify(b);},'PERSONALITY_ROSTER'],
 ['model mismatch',(v:any)=>{v.model='other-model';},'PERSONALITY_PROVIDER_IDENTITY'],
 ['provider mismatch',(v:any)=>{v.provider='other-provider';},'PERSONALITY_PROVIDER_IDENTITY'],
 ['uncertain completion',(v:any)=>{v.choices[0].finish_reason='length';},'PERSONALITY_INCOMPLETE'],
 ['tool call',(v:any)=>{v.choices[0].message.tool_calls=[];},'PERSONALITY_ENVELOPE'],
 ['malformed JSON',(v:any)=>{v.choices[0].message.content='{';},'PERSONALITY_JSON'],
 ['oversized content',(v:any)=>{v.choices[0].message.content='x'.repeat(PERSONALITY_LIMITS.outputBytes+1);},'PERSONALITY_OUTPUT_LIMIT'],
 ['token overflow',(v:any)=>{v.usage.completion_tokens=6001;},'PERSONALITY_OUTPUT_LIMIT'],
] as const)test('mock provider safely rejects '+label+' without retry',async()=>{
 let calls=0;const gateway=changedGateway(change);
 await assert.rejects(initializeMockPersonalities(input(),{mode:'offline-mock',async generate(request,signal){calls++;return gateway.generate(request,signal);}}),new RegExp(code));assert.equal(calls,1);
});

test('response error projection does not include rejected body text',async()=>{
 const marker='PRIVATE_PERSONALITY_RESPONSE_SENTINEL';
 await assert.rejects(initializeMockPersonalities(input(),changedGateway(v=>{v.choices[0].message.content=JSON.stringify({profiles:[],hidden:marker});})),(error:unknown)=>{assert.ok(!String(error).includes(marker));return true;});
});

test('accepted roster rejects content/provenance mutation and false deterministic/model labels',async()=>{
 const i=input(),r=await mockPersonalityRoster(i);
 for(const mutation of [
  (v:any)=>{v.profiles[0].traits.caution=(v.profiles[0].traits.caution+1)%5;},
  (v:any)=>{v.generation.inputDigest='0'.repeat(64);},
  (v:any)=>{v.generation.outputDigest='0'.repeat(64);},
  (v:any)=>{v.id='personality-roster-'+'0'.repeat(64);},
 ]){const v=clone(r);mutation(v);await assert.rejects(validatePersonalityRoster(v,i.capableIds,i.backgroundIds),/PERSONALITY_(DIGEST|DIVERSITY)/);}
 const v=clone(r);v.profiles[0].origin='model-generated';assert.throws(()=>parsePersonalityRoster(v,i.capableIds,i.backgroundIds),/PERSONALITY_PROVENANCE/);
 const w=clone(r);w.profiles.at(-1)!.origin='offline-mock';assert.throws(()=>parsePersonalityRoster(w,i.capableIds,i.backgroundIds),/PERSONALITY_PROVENANCE/);
});

test('oversized accepted snapshots, extra facts and mismatched expected roster are rejected',async()=>{
 const i=input(),r=await mockPersonalityRoster(i),extra=clone(r) as any;extra.profiles[0].age=34;
 assert.throws(()=>parsePersonalityRoster(extra,i.capableIds,i.backgroundIds),/PERSONALITY_ROSTER/);
 assert.throws(()=>parsePersonalityRoster({...r,unknown:'x'.repeat(100000)},i.capableIds,i.backgroundIds),/PERSONALITY_(ROSTER|OUTPUT_LIMIT)/);
 assert.throws(()=>parsePersonalityRoster(r,[...i.capableIds].reverse(),i.backgroundIds),/PERSONALITY_ROSTER/);
});

test('worst-case combined-stage admission does not claim spare space in a full existing planner request',async()=>{
 const result=combinedPlanningCapacity(24000,6000,70);
 assert.equal(result.combinedEnabled,false);assert.equal(result.guaranteed,false);assert.equal(result.inputHeadroomBytes,0);assert.equal(result.outputHeadroomTokens,0);
 assert.ok(result.standaloneMaximumOutputBytes<=6000);assert.equal(result.liveInitializationEnabled,false);
 assert.equal(result.existingRelationshipContract,'dynamic_relationships_v2');
});

test('cancellation before mock dispatch does not invoke a gateway',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 await assert.rejects(initializeMockPersonalities(input(),{mode:'offline-mock',async generate(){calls++;throw Error('called');}},controller.signal));assert.equal(calls,0);
});

test('input provenance hashes the complete routing, prompt and response-schema request body',async()=>{
 const i=input(),request=await buildPersonalityRequest(i),r=await mockPersonalityRoster(i);
 assert.equal(r.generation.inputDigest,createHash('sha256').update(canonical(request.body)).digest('hex'));
});

test('synchronous replay validates deterministic background vectors rather than trusting their label',async()=>{
 const i=input(),r=clone(await mockPersonalityRoster(i));r.profiles.at(-1)!.traits.caution=(r.profiles.at(-1)!.traits.caution+1)%5;
 assert.throws(()=>parsePersonalityRoster(r,i.capableIds,i.backgroundIds),/PERSONALITY_PROVENANCE/);
});
