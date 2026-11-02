import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpeechTranscriptionHandler} from '../../server/speech/service.ts';

const env={OPENROUTER_STT_API_KEY:'private-speech-test-key'};
const origin='http://localhost:3000';
function request(body:BodyInit|null=new Uint8Array([1,2,3]),headers:Record<string,string>={},signal?:AbortSignal) {
  return new Request(`${origin}/api/speech/transcribe`,{method:'POST',headers:{origin,'content-type':'audio/webm;codecs=opus',...headers},body,signal,...(body instanceof ReadableStream?{duplex:'half'}:{})} as RequestInit);
}
function setup(response:()=>Response=()=>Response.json({text:' What if Punggol had a new clinic? '}),options:{env?:Record<string,string|undefined>;deadlineMs?:number}={}) {
  const calls:{url:string;init:RequestInit|undefined}[]=[];
  const fetcher=(async(url,init)=>{calls.push({url:String(url),init});return response();}) as typeof fetch;
  return {calls,handle:createSpeechTranscriptionHandler({env,fetcher,...options})};
}
async function error(response:Response,status:number,code:string) {
  assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json();assert.equal(body.version,1);assert.equal(body.error.code,code);
  assert.equal(typeof body.error.message,'string');assert.ok(!JSON.stringify(body).includes(env.OPENROUTER_STT_API_KEY));return body;
}
function deferred<T>() {let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>resolve=r);return {promise,resolve};}
const settle=()=>new Promise<void>(resolve=>setImmediate(resolve));

test('speech sends the exact dedicated Whisper payload and returns only trimmed transcript',async()=>{
  const d=setup(),response=await d.handle(request());
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(await response.json(),{version:1,text:'What if Punggol had a new clinic?'});
  assert.equal(d.calls.length,1);const call=d.calls[0];
  assert.equal(call.url,'https://openrouter.ai/api/v1/audio/transcriptions');
  assert.equal(call.init?.method,'POST');assert.equal(call.init?.cache,'no-store');assert.equal(call.init?.redirect,'error');
  const headers=new Headers(call.init?.headers);assert.equal(headers.get('authorization'),'Bearer private-speech-test-key');assert.equal(headers.get('content-type'),'application/json');
  assert.deepEqual(JSON.parse(String(call.init?.body)),{model:'openai/whisper-large-v3-turbo',input_audio:{data:'AQID',format:'webm'},response_format:'json'});
  assert.ok(call.init?.signal instanceof AbortSignal);
});

test('missing dedicated key disables speech even if chat key and old opt-in flag exist',async()=>{
  for(const missing of [undefined,'','   ']) {
    const d=setup(undefined,{env:{OPENROUTER_STT_API_KEY:missing,OPENROUTER_API_KEY:'chat-key',SPEECH_TO_TEXT_ENABLED:'true'}});
    await error(await d.handle(request()),503,'STT_UNAVAILABLE');assert.equal(d.calls.length,0);
  }
});

test('speech rejects absent, foreign and null origins without upstream calls',async()=>{
  for(const bad of ['', 'https://attacker.example','null',`${origin}/path`]) {
    const d=setup();await error(await d.handle(request(undefined,{origin:bad})),403,'STT_ORIGIN');assert.equal(d.calls.length,0);
  }
  const d=setup();await error(await d.handle(request(undefined,{'sec-fetch-site':'cross-site'})),403,'STT_ORIGIN');assert.equal(d.calls.length,0);
});

test('speech validates the browser-facing Host when Next uses a canonical localhost URL',async()=>{
  const d=setup();
  const req=new Request('http://localhost:3000/api/speech/transcribe',{method:'POST',headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','content-type':'audio/webm'},body:new Uint8Array([1,2,3])});
  assert.equal((await d.handle(req)).status,200);assert.equal(d.calls.length,1);
  const spoofed=setup();
  await error(await spoofed.handle(request(undefined,{host:'localhost:3000',origin:'http://attacker.example','x-forwarded-host':'attacker.example','x-forwarded-proto':'http'})),403,'STT_ORIGIN');
  assert.equal(spoofed.calls.length,0);
});

test('speech only accepts WebM, while accepting case and codec parameters',async()=>{
  for(const media of ['', 'application/json','audio/ogg','audio/webm-bogus']) {
    const d=setup();await error(await d.handle(request(undefined,{'content-type':media})),415,'STT_FORMAT');assert.equal(d.calls.length,0);
  }
  assert.equal((await setup().handle(request(undefined,{'content-type':'Audio/WebM ; codecs=opus'}))).status,200);
});

test('empty bodies and malformed declared lengths fail before the provider',async()=>{
  for(const req of [request(null),request(new Uint8Array()),request(undefined,{'content-length':'invalid'}),request(undefined,{'content-length':'-1'})]) {
    const d=setup();await error(await d.handle(req),400,'STT_INPUT');assert.equal(d.calls.length,0);
  }
});

test('declared or streamed audio over 1 MiB is rejected and the stream is cancelled',async()=>{
  const d=setup();await error(await d.handle(request(undefined,{'content-length':'1048577'})),413,'STT_TOO_LARGE');assert.equal(d.calls.length,0);
  let cancelled=false;
  const body=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array(1048576));c.enqueue(new Uint8Array([1]));},cancel(){cancelled=true;}});
  await error(await d.handle(request(body)),413,'STT_TOO_LARGE');assert.ok(cancelled);assert.equal(d.calls.length,0);
  assert.equal((await d.handle(request(new Uint8Array(1048576)))).status,200,'exact byte limit is accepted');
});

test('speech rejects malformed, empty, non-string and excessive provider text safely',async()=>{
  for(const provider of [()=>new Response('not-json'),()=>Response.json({text:'  '}),()=>Response.json({text:8}),()=>Response.json({text:'x'.repeat(8001)}),()=>Response.json({}),()=>new Response(new Uint8Array([255]))]) {
    const d=setup(provider);await error(await d.handle(request()),502,'STT_PROVIDER');assert.equal(d.calls.length,1);
  }
});

test('upstream body reads are bounded at 64 KiB and cancelled promptly',async()=>{
  let cancelled=false;
  const d=setup(()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(65537));},cancel(){cancelled=true;}})));
  await error(await d.handle(request()),502,'STT_PROVIDER');assert.ok(cancelled);
});

test('upstream failures map to safe speech errors without leaking or retrying',async()=>{
  for(const [status,want,code] of [[429,429,'STT_BUSY'],[401,503,'STT_UNAVAILABLE'],[402,503,'STT_UNAVAILABLE'],[403,503,'STT_UNAVAILABLE'],[500,502,'STT_PROVIDER'],[400,502,'STT_PROVIDER']] as const) {
    const d=setup(()=>new Response(`private provider failure ${env.OPENROUTER_STT_API_KEY}`,{status}));
    const body=await error(await d.handle(request()),want,code);assert.ok(!body.error.message.includes('private provider failure'));assert.equal(d.calls.length,1);
  }
  let calls=0;const handle=createSpeechTranscriptionHandler({env,fetcher:(async()=>{calls++;throw Error(env.OPENROUTER_STT_API_KEY);}) as typeof fetch});
  await error(await handle(request()),502,'STT_PROVIDER');assert.equal(calls,1);
});

test('one handler admits one speech operation and releases its slot after completion',async()=>{
  const upstream=deferred<Response>(),started=deferred<void>();let calls=0;
  const handle=createSpeechTranscriptionHandler({env,fetcher:(async()=>{calls++;started.resolve();return calls===1?upstream.promise:Response.json({text:'next'});}) as typeof fetch});
  const first=handle(request());await started.promise;
  await error(await handle(request()),429,'STT_BUSY');assert.equal(calls,1);
  upstream.resolve(Response.json({text:'first'}));assert.equal((await first).status,200);
  assert.equal((await handle(request())).status,200);assert.equal(calls,2);
});

test('the default 45 second deadline covers stalled incoming audio and frees the slot',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let cancelled=false;
  const body=new ReadableStream<Uint8Array>({start(){},cancel(){cancelled=true;}}),d=setup();
  const pending=d.handle(request(body));await settle();t.mock.timers.tick(44999);await settle();assert.equal(cancelled,false);
  t.mock.timers.tick(1);await error(await pending,504,'STT_TIMEOUT');assert.ok(cancelled);assert.equal(d.calls.length,0);
  assert.equal((await d.handle(request())).status,200);
});

test('deadline aborts an uncooperative fetch and disposes any late response',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});const upstream=deferred<Response>(),started=deferred<void>();let signal:AbortSignal|undefined,cancelled=false;
  const handle=createSpeechTranscriptionHandler({env,deadlineMs:20,fetcher:(async(_url,init)=>{signal=init?.signal??undefined;started.resolve();return upstream.promise;}) as typeof fetch});
  const pending=handle(request());await started.promise;t.mock.timers.tick(20);await error(await pending,504,'STT_TIMEOUT');assert.ok(signal?.aborted);
  upstream.resolve(new Response(new ReadableStream({start(){},cancel(){cancelled=true;}})));await settle();assert.ok(cancelled);
});

test('deadline also cancels a stalled provider response body',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let cancelled=false;const started=deferred<void>();
  const handle=createSpeechTranscriptionHandler({env,deadlineMs:20,fetcher:(async()=>{started.resolve();return new Response(new ReadableStream({start(){},cancel(){cancelled=true;}}));}) as typeof fetch});
  const pending=handle(request());await started.promise;await settle();t.mock.timers.tick(20);
  await error(await pending,504,'STT_TIMEOUT');assert.ok(cancelled);
});

test('request cancellation stops upload/provider work and releases the slot',async()=>{
  const controller=new AbortController(),started=deferred<void>();let signal:AbortSignal|undefined,cancelled=false;
  const handle=createSpeechTranscriptionHandler({env,fetcher:(async(_url,init)=>{signal=init?.signal??undefined;started.resolve();return new Promise<Response>(()=>{});}) as typeof fetch});
  const pending=handle(request(undefined,{},controller.signal));await started.promise;controller.abort();
  await error(await pending,499,'STT_CANCELLED');assert.ok(signal?.aborted);
  const d=setup(),incoming=new AbortController();const body=new ReadableStream<Uint8Array>({start(){},cancel(){cancelled=true;}});
  const upload=d.handle(request(body,{},incoming.signal));await settle();incoming.abort();await error(await upload,499,'STT_CANCELLED');assert.ok(cancelled);assert.equal(d.calls.length,0);
  assert.equal((await d.handle(request())).status,200);
});

test('already cancelled requests never reach the provider and successful requests clear timers',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let signal:AbortSignal|undefined;
  const handle=createSpeechTranscriptionHandler({env,deadlineMs:20,fetcher:(async(_url,init)=>{signal=init?.signal??undefined;return Response.json({text:'ok'});}) as typeof fetch});
  const controller=new AbortController();controller.abort();await error(await handle(request(undefined,{},controller.signal)),499,'STT_CANCELLED');assert.equal(signal,undefined);
  assert.equal((await handle(request())).status,200);t.mock.timers.tick(100);assert.equal((signal as AbortSignal|undefined)?.aborted,false);
});
