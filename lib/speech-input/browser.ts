import {SpeechRequestError,type SpeechDependencies,type SpeechRecorder} from './controller.ts';

export async function transcribeSpeech(audio:Blob,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<string> {
 const response=await fetcher('/api/speech/transcribe',{method:'POST',headers:{'Content-Type':audio.type},body:audio,signal,cache:'no-store'});
 let payload:unknown;
 try{payload=await response.json();}catch{throw new SpeechRequestError('Transcription returned an unreadable response. Try again or type your question.');}
 if(payload&&typeof payload==='object'&&'version' in payload&&payload.version===1){
  if(response.ok&&'text' in payload&&typeof payload.text==='string'&&payload.text.trim())return payload.text.trim();
  if(!response.ok&&'error' in payload&&payload.error&&typeof payload.error==='object'&&'message' in payload.error&&typeof payload.error.message==='string'&&payload.error.message.length<=300){
   throw new SpeechRequestError(payload.error.message);
  }
 }
 throw new SpeechRequestError('Transcription failed. Try again or type your question.');
}

// Browser globals are inspected only after the user clicks the microphone.
export function browserSpeechDependencies():SpeechDependencies {
 return {
  selectMime:()=>{
   if(typeof window==='undefined'||!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')return null;
   return ['audio/webm;codecs=opus','audio/webm'].find(mime=>MediaRecorder.isTypeSupported(mime))??null;
  },
  getStream:()=>navigator.mediaDevices.getUserMedia({audio:true}),
  createRecorder:(stream,mime)=>new MediaRecorder(stream as MediaStream,{mimeType:mime,audioBitsPerSecond:64000}) as unknown as SpeechRecorder,
  transcribe:transcribeSpeech,
  setTimer:(callback,ms)=>{const timer=setTimeout(callback,ms);return ()=>clearTimeout(timer);},
 };
}
