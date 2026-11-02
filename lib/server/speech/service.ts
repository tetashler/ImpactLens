// Node-only speech adapter. Import only from server routes.
import {Buffer} from 'node:buffer';

const AUDIO_BYTES=1_048_576,RESPONSE_BYTES=65_536,TRANSCRIPT_CHARACTERS=8_000;
const ENDPOINT='https://openrouter.ai/api/v1/audio/transcriptions';
const MODEL='openai/whisper-large-v3-turbo';
class SpeechError extends Error {
  readonly status:number;readonly code:string;
  constructor(status:number,code:string,message:string){super(message);this.status=status;this.code=code;}
}
const invalidInput=()=>new SpeechError(400,'STT_INPUT','Record a nonempty WebM audio clip and try again.');
const providerError=()=>new SpeechError(502,'STT_PROVIDER','Speech transcription failed. Try recording again.');
const tooLarge=()=>new SpeechError(413,'STT_TOO_LARGE','Recording exceeds 1 MiB. Try a shorter recording.');
const cancelled=()=>new SpeechError(499,'STT_CANCELLED','Speech transcription was cancelled.');

function dispose(body:ReadableStream<Uint8Array>|null):void {
  if(body&&!body.locked)void body.cancel().catch(()=>{});
}
function checkLength(headers:Headers,maximum:number,invalid:()=>SpeechError,oversized:()=>SpeechError):void {
  const length=headers.get('content-length');
  if(length===null)return;
  if(!/^\d+$/.test(length))throw invalid();
  if(Number(length)>maximum)throw oversized();
}
// Racing the signal also settles when a transport fails to observe AbortSignal.
async function interruptible<T>(pending:Promise<T>,signal:AbortSignal):Promise<T> {
  if(signal.aborted)throw signal.reason;
  let onAbort!:()=>void;
  const stopped=new Promise<never>((_,reject)=>{onAbort=()=>reject(signal.reason);signal.addEventListener('abort',onAbort,{once:true});});
  try{return await Promise.race([pending,stopped]);}
  finally{signal.removeEventListener('abort',onAbort);}
}
async function readBounded(body:ReadableStream<Uint8Array>|null,maximum:number,signal:AbortSignal,invalid:()=>SpeechError,oversized:()=>SpeechError):Promise<Uint8Array> {
  if(!body)throw invalid();
  const reader=body.getReader(),chunks:Uint8Array[]=[];let size=0,complete=false;
  const stop=()=>{void reader.cancel().catch(()=>{});};
  signal.addEventListener('abort',stop,{once:true});
  try{
    while(true){
      if(signal.aborted)throw signal.reason;
      const {done,value}=await interruptible(reader.read(),signal);
      if(signal.aborted)throw signal.reason;
      if(done)break;
      size+=value.byteLength;if(size>maximum)throw oversized();chunks.push(value);
    }
    if(size===0)throw invalid();
    const bytes=new Uint8Array(size);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    complete=true;return bytes;
  }catch(error){
    if(signal.aborted)throw signal.reason;
    throw error instanceof SpeechError?error:invalid();
  }finally{
    signal.removeEventListener('abort',stop);if(!complete)stop();
    reader.releaseLock();
  }
}
function failure(error:unknown):Response {
  const safe=error instanceof SpeechError?error:providerError();
  return Response.json({version:1,error:{code:safe.code,message:safe.message}},{status:safe.status,headers:{'Cache-Control':'no-store'}});
}

type SpeechOptions={env?:Record<string,string|undefined>;fetcher?:typeof fetch;deadlineMs?:number};
export function createSpeechTranscriptionHandler(options:SpeechOptions={}) {
  // Production exports one handler below; separate factories keep tests isolated.
  let active=false;
  const deadlineMs=options.deadlineMs??45_000;
  if(!Number.isInteger(deadlineMs)||deadlineMs<1||deadlineMs>45_000)throw new Error('Invalid speech deadline.');
  return async (request:Request):Promise<Response> => {
    let acquired=false,timer:ReturnType<typeof setTimeout>|undefined,onCancel:(()=>void)|undefined;
    let upstream:Response|undefined;
    try{
      const key=(options.env??process.env).OPENROUTER_STT_API_KEY?.trim();
      if(!key)throw new SpeechError(503,'STT_UNAVAILABLE','Speech input is unavailable. Type your question instead.');
      // Next can canonicalize the URL to localhost. Host retains the browser's
      // address, as in the existing AI service; never trust forwarded-host headers.
      const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site'),url=new URL(request.url);
      let localOrigin:string;
      try{localOrigin=new URL(`${url.protocol}//${request.headers.get('host')??url.host}`).origin;}
      catch{throw new SpeechError(403,'STT_ORIGIN','Speech input must be sent from this application.');}
      if(origin!==localOrigin||(site!==null&&site!=='same-origin'))throw new SpeechError(403,'STT_ORIGIN','Speech input must be sent from this application.');
      if(request.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase()!=='audio/webm')throw new SpeechError(415,'STT_FORMAT','Speech input requires WebM audio in a supported browser.');
      checkLength(request.headers,AUDIO_BYTES,invalidInput,tooLarge);
      if(request.signal.aborted)throw cancelled();
      if(active)throw new SpeechError(429,'STT_BUSY','Speech transcription is busy. Try again shortly.');
      active=true;acquired=true;
      const controller=new AbortController();
      onCancel=()=>controller.abort(cancelled());
      request.signal.addEventListener('abort',onCancel,{once:true});
      timer=setTimeout(()=>controller.abort(new SpeechError(504,'STT_TIMEOUT','Transcription timed out. Try a shorter recording.')),deadlineMs);
      const signal=controller.signal;
      const audio=await readBounded(request.body,AUDIO_BYTES,signal,invalidInput,tooLarge);
      if(signal.aborted)throw signal.reason;
      const fetcher=options.fetcher??fetch;
      const pending=fetcher(ENDPOINT,{
        method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
        body:JSON.stringify({model:MODEL,input_audio:{data:Buffer.from(audio).toString('base64'),format:'webm'},response_format:'json'}),
        cache:'no-store',redirect:'error',signal,
      });
      // A response arriving after cancellation must release its stream as well.
      void pending.then(response=>{if(signal.aborted)dispose(response.body);},()=>{});
      upstream=await interruptible(pending,signal);
      if(!upstream.ok){
        if(upstream.status===429)throw new SpeechError(429,'STT_BUSY','Speech transcription is busy. Try again shortly.');
        if([401,402,403].includes(upstream.status))throw new SpeechError(503,'STT_UNAVAILABLE','Speech input is unavailable. Type your question instead.');
        throw providerError();
      }
      checkLength(upstream.headers,RESPONSE_BYTES,providerError,providerError);
      const bytes=await readBounded(upstream.body,RESPONSE_BYTES,signal,providerError,providerError);
      let value:unknown;
      try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw providerError();}
      if(!value||typeof value!=='object'||!('text' in value)||typeof value.text!=='string')throw providerError();
      const text=value.text.trim();
      if(!text||text.length>TRANSCRIPT_CHARACTERS)throw providerError();
      return Response.json({version:1,text},{headers:{'Cache-Control':'no-store'}});
    }catch(error){return failure(error);}
    finally{
      if(timer!==undefined)clearTimeout(timer);
      if(onCancel)request.signal.removeEventListener('abort',onCancel);
      dispose(request.body);if(upstream)dispose(upstream.body);
      if(acquired)active=false;
    }
  };
}

export const handleSpeechTranscription=createSpeechTranscriptionHandler();
