import test from 'node:test';
import assert from 'node:assert/strict';
import {SpeechInputController, appendSpeechTranscript, type SpeechDependencies, type SpeechRecorder} from '../../speech-input/controller.ts';
import {transcribeSpeech} from '../../speech-input/browser.ts';

function deferred<T>() {
 let resolve!: (value:T)=>void, reject!: (reason:unknown)=>void;
 const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
}
const flush=()=>new Promise<void>(resolve=>setImmediate(resolve));
function setup() {
 let tracksStopped=0, question='Typed question', accepts=true;
 const permission=deferred<{getTracks:()=>{stop:()=>void}[]}>();
 const response=deferred<string>();
 const recorder:SpeechRecorder={mimeType:'audio/webm;codecs=opus',state:'inactive',ondataavailable:null,onstop:null,onerror:null,
  start(){this.state='recording';},stop(){this.state='inactive';}};
 const uploads:{blob:Blob;signal:AbortSignal}[]=[], timers=new Map<number,()=>void>();
 const deps:SpeechDependencies={selectMime:()=>recorder.mimeType,getStream:()=>permission.promise,createRecorder:()=>recorder,
  transcribe:async(blob,signal)=>{uploads.push({blob,signal});return response.promise;},
  setTimer:(callback,ms)=>{assert.equal(ms,30000);timers.set(1,callback);return ()=>{timers.delete(1);};}};
 const controller=new SpeechInputController(deps,()=>{},text=>{
  const next=appendSpeechTranscript(question,text);
  if(!accepts||next===null)return false;
  question=next;return true;
 });
 const grant=()=>permission.resolve({getTracks:()=>[{stop:()=>{tracksStopped++;}}]});
 const finish=(blob=new Blob(['audio']))=>{recorder.ondataavailable?.({data:blob});recorder.onstop?.();};
 return {controller,recorder,deps,grant,finish,response,permission,uploads,timers,
  stopped:()=>tracksStopped,question:()=>question,type:(text:string)=>{question=text;},rejectInsert:()=>{accepts=false;}};
}

test('stop waits for final audio, uploads once using actual MIME, and appends to the latest typed text',async()=>{
 const s=setup();const start=s.controller.toggle();s.grant();await start;
 assert.equal(s.controller.getState().status,'recording');
 s.controller.toggle();s.controller.toggle();
 assert.equal(s.uploads.length,0);
 s.type('Edited while speaking');s.finish();await flush();
 assert.equal(s.uploads.length,1);assert.equal(s.uploads[0].blob.type,'audio/webm;codecs=opus');
 assert.equal(await s.uploads[0].blob.text(),'audio');assert.equal(s.stopped(),1);
 s.type('Edited during upload');s.response.resolve('new words');await flush();
 assert.equal(s.question(),'Edited during upload new words');assert.equal(s.controller.getState().status,'idle');
});

test('a second click cancels unanswered permission and releases a late stream',async()=>{
 const s=setup();const start=s.controller.toggle();await s.controller.toggle();
 assert.equal(s.controller.getState().status,'idle');s.grant();await start;
 assert.equal(s.stopped(),1);assert.equal(s.recorder.state,'inactive');assert.equal(s.uploads.length,0);
});

test('cancelling upload aborts transport and ignores a late transcript',async()=>{
 const s=setup();const start=s.controller.toggle();s.grant();await start;
 s.controller.toggle();s.finish();await flush();s.controller.cancel();
 assert.equal(s.uploads[0].signal.aborted,true);s.response.resolve('late words');await flush();
 assert.equal(s.question(),'Typed question');assert.equal(s.controller.getState().status,'idle');
});

test('cancelling capture detaches stale callbacks and stops tracks',async()=>{
 const s=setup();const start=s.controller.toggle();s.grant();await start;
 const staleStop=s.recorder.onstop,staleData=s.recorder.ondataavailable;
 s.controller.cancel();staleData?.({data:new Blob(['old audio'])});staleStop?.();await flush();
 assert.equal(s.stopped(),1);assert.equal(s.timers.size,0);assert.equal(s.uploads.length,0);
});

test('the 30 second deadline stops and transcribes a complete recording',async()=>{
 const s=setup();const start=s.controller.toggle();s.grant();await start;
 s.timers.get(1)!();assert.equal(s.recorder.state,'inactive');assert.equal(s.controller.getState().status,'stopping');
 s.finish();await flush();assert.equal(s.uploads.length,1);
 s.response.resolve('timed recording');await flush();assert.equal(s.question(),'Typed question timed recording');
});

test('empty and over-limit recordings release the microphone without uploading',async()=>{
 for(const data of [new Blob(),new Blob([new Uint8Array(1048577)])]){
  const s=setup();const start=s.controller.toggle();s.grant();await start;s.controller.toggle();s.finish(data);await flush();
  assert.equal(s.controller.getState().status,'error');assert.equal(s.stopped(),1);assert.equal(s.uploads.length,0);
 }
});

test('unsupported browsers and denied permission retain typed input',async()=>{
 const unsupported=setup();unsupported.deps.selectMime=()=>null;await unsupported.controller.toggle();
 assert.equal(unsupported.controller.getState().status,'error');assert.equal(unsupported.uploads.length,0);
 const denied=setup();const start=denied.controller.toggle();denied.permission.reject({name:'NotAllowedError'});await start;
 assert.equal(denied.controller.getState().status,'error');assert.equal(denied.question(),'Typed question');
});

test('overflow preserves the complete transcript for explicit recovery instead of truncation',async()=>{
 const s=setup();s.type('a'.repeat(1999));const start=s.controller.toggle();s.grant();await start;
 s.controller.toggle();s.finish();await flush();s.response.resolve('all spoken words');await flush();
 assert.equal(s.question().length,1999);assert.equal(s.controller.getState().status,'overflow');
 assert.equal(s.controller.getState().transcript,'all spoken words');
 s.type('Shortened');s.controller.insertRecovered();assert.equal(s.question(),'Shortened all spoken words');
 assert.equal(s.controller.getState().status,'idle');
 assert.equal(appendSpeechTranscript('','  words  '),'words');
 assert.equal(appendSpeechTranscript('typed  ','words'),'typed  words');
});

test('recorder failure releases resources and does not start transcription',async()=>{
 const s=setup();const start=s.controller.toggle();s.grant();await start;s.recorder.onerror?.();
 assert.equal(s.stopped(),1);assert.equal(s.timers.size,0);assert.equal(s.controller.getState().status,'error');
 assert.equal(s.uploads.length,0);
});

test('browser upload sends raw audio with its MIME and cancellation signal, then validates the response',async()=>{
 const audio=new Blob(['complete audio'],{type:'audio/webm;codecs=opus'}),abort=new AbortController();
 const text=await transcribeSpeech(audio,abort.signal,async(input,init)=>{
  assert.equal(input,'/api/speech/transcribe');assert.equal(init?.method,'POST');
  assert.equal(init?.body,audio);assert.equal(init?.signal,abort.signal);
  assert.equal(new Headers(init?.headers).get('Content-Type'),'audio/webm;codecs=opus');
  return Response.json({version:1,text:'  recognised words  '});
 });
 assert.equal(text,'recognised words');
 for(const response of [Response.json({version:1,text:''}),Response.json({version:2,text:'wrong envelope'}),Response.json({error:{message:'unsafe unversioned'}},{status:502})]){
  await assert.rejects(()=>transcribeSpeech(audio,abort.signal,async()=>response),/Transcription/);
 }
 await assert.rejects(()=>transcribeSpeech(audio,abort.signal,async()=>Response.json({version:1,error:{code:'STT_TIMEOUT',message:'Transcription timed out. Try a shorter recording.'}},{status:504})),/shorter recording/);
});

test('hidden views cannot request capture, retain late permission, upload, or insert speech',async()=>{
 const hidden=setup();hidden.deps.isActive=()=>false;const noCapture=hidden.controller.toggle();hidden.grant();await noCapture;
 assert.equal(hidden.controller.getState().status,'idle');
 const late=setup();let active=true;late.deps.isActive=()=>active;
 const start=late.controller.toggle();active=false;late.grant();await start;
 assert.equal(late.stopped(),1);assert.equal(late.recorder.state,'inactive');
 const uploading=setup();active=true;uploading.deps.isActive=()=>active;
 const capture=uploading.controller.toggle();uploading.grant();await capture;
 uploading.controller.toggle();uploading.finish();await flush();active=false;
 uploading.response.resolve('hidden words');await flush();
 assert.equal(uploading.question(),'Typed question');assert.equal(uploading.controller.getState().status,'idle');
});

test('unsupported actual recorder MIME never starts capture or upload',async()=>{
 const s=setup();s.recorder.mimeType='audio/mp4';const start=s.controller.toggle();s.grant();await start;
 assert.equal(s.controller.getState().status,'error');assert.equal(s.stopped(),1);
 assert.equal(s.recorder.state,'inactive');assert.equal(s.uploads.length,0);
});
