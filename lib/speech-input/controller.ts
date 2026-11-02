export type SpeechStatus='idle'|'requesting'|'recording'|'stopping'|'transcribing'|'overflow'|'error';
export type SpeechState={status:SpeechStatus;message:string;transcript:string};
export type SpeechStream={getTracks:()=>{stop:()=>void}[]};
export type SpeechRecorder={mimeType:string;state:string;ondataavailable:((event:{data:Blob})=>void)|null;onstop:(()=>void)|null;onerror:(()=>void)|null;start:(timeslice?:number)=>void;stop:()=>void};
export type SpeechDependencies={selectMime:()=>string|null;getStream:()=>Promise<SpeechStream>;createRecorder:(stream:SpeechStream,mime:string)=>SpeechRecorder;transcribe:(audio:Blob,signal:AbortSignal)=>Promise<string>;setTimer:(callback:()=>void,ms:number)=>()=>void;isActive?:()=>boolean};
const MAX_BYTES=1048576;
const idle=():SpeechState=>({status:'idle',message:'',transcript:''});
export const speechPending=(state:SpeechState)=>['requesting','recording','stopping','transcribing','overflow'].includes(state.status);
export function appendSpeechTranscript(question:string,text:string):string|null {
 const words=text.trim();
 const combined=question+(question&&!/\s$/.test(question)?' ':'')+words;
 return combined.length<=2000?combined:null;
}
export class SpeechInputController {
 private state:SpeechState=idle();
 private operation=0;
 private stream:SpeechStream|null=null;
 private recorder:SpeechRecorder|null=null;
 private chunks:Blob[]=[];
 private bytes=0;
 private cancelTimer:(()=>void)|null=null;
 private upload:AbortController|null=null;
 private deps:SpeechDependencies;
 private notify:(state:SpeechState)=>void;
 private accept:(text:string)=>boolean;
 constructor(deps:SpeechDependencies,notify:(state:SpeechState)=>void,accept:(text:string)=>boolean) {
  this.deps=deps;this.notify=notify;this.accept=accept;
 }
 getState() {return this.state;}
 private update(state:SpeechState) {this.state=state;this.notify(state);}
 private releaseCapture() {
  this.cancelTimer?.();this.cancelTimer=null;
  const recorder=this.recorder;this.recorder=null;
  if(recorder){recorder.ondataavailable=null;recorder.onstop=null;recorder.onerror=null;
   if(recorder.state!=='inactive')try{recorder.stop();}catch{/* Already stopped by the browser. */}
  }
  const stream=this.stream;this.stream=null;
  stream?.getTracks().forEach(track=>track.stop());
  this.chunks=[];this.bytes=0;
 }
 cancel() {
  this.operation++;this.upload?.abort();this.upload=null;this.releaseCapture();this.update(idle());
 }
 private fail(message:string) {
  this.operation++;this.upload?.abort();this.upload=null;this.releaseCapture();
  this.update({status:'error',message,transcript:''});
 }
 async toggle() {
  if(this.deps.isActive?.()===false){this.cancel();return;}
  if(this.state.status==='requesting'){this.cancel();return;}
  if(this.state.status==='recording'){this.stop();return;}
  if(speechPending(this.state))return;
  const id=++this.operation;
  try {
   const mime=this.deps.selectMime();
   if(!mime){this.fail('Voice input is unavailable here. Try Chrome or Edge, or type your question.');return;}
   this.update({status:'requesting',message:'Allow microphone access, or click again to cancel.',transcript:''});
   const stream=await this.deps.getStream();
   if(id!==this.operation||this.deps.isActive?.()===false){stream.getTracks().forEach(track=>track.stop());if(id===this.operation)this.cancel();return;}
   this.stream=stream;
   const recorder=this.deps.createRecorder(stream,mime);this.recorder=recorder;
   if(recorder.mimeType.split(';')[0].toLowerCase()!=='audio/webm'){
    this.fail('This browser cannot record a supported format. Type your question instead.');return;
   }
   recorder.ondataavailable=event=>{
    if(id!==this.operation||!event.data.size)return;
    this.bytes+=event.data.size;
    if(this.bytes>MAX_BYTES){this.fail('The recording is too large. Try a shorter recording.');return;}
    this.chunks.push(event.data);
   };
   recorder.onerror=()=>{if(id===this.operation)this.fail('Recording failed. Try again or type your question.');};
   recorder.onstop=()=>{if(id===this.operation)void this.complete(id,recorder.mimeType);};
   recorder.start(250);
   this.update({status:'recording',message:'Listening. Click the microphone to stop (30 seconds maximum).',transcript:''});
   this.cancelTimer=this.deps.setTimer(()=>{if(id===this.operation)this.stop();},30000);
  } catch(error) {
   if(id!==this.operation)return;
   const name=error&&typeof error==='object'&&'name' in error?error.name:'';
   this.fail(name==='NotAllowedError'?'Microphone access was denied. Allow it in your browser or type your question.':name==='NotFoundError'?'No microphone was found. Connect one or type your question.':'Could not start the microphone. Try again or type your question.');
  }
 }
 private stop() {
  if(this.state.status!=='recording'||!this.recorder)return;
  this.cancelTimer?.();this.cancelTimer=null;
  this.update({status:'stopping',message:'Finishing recording…',transcript:''});
  try{this.recorder.stop();}catch{this.fail('Could not finish the recording. Try again or type your question.');}
 }
 private async complete(id:number,mime:string) {
  if(this.deps.isActive?.()===false){this.cancel();return;}
  const blob=new Blob(this.chunks,{type:mime});this.releaseCapture();
  if(!blob.size){this.fail('No audio was recorded. Try again or type your question.');return;}
  if(blob.size>MAX_BYTES){this.fail('The recording is too large. Try a shorter recording.');return;}
  const upload=new AbortController();this.upload=upload;
  this.update({status:'transcribing',message:'Transcribing your question…',transcript:''});
  try{
   const transcript=(await this.deps.transcribe(blob,upload.signal)).trim();
   if(id!==this.operation)return;
   if(this.deps.isActive?.()===false){this.cancel();return;}
   this.upload=null;
   if(!transcript){this.fail('No speech was recognised. Try again or type your question.');return;}
   if(this.accept(transcript))this.update({...idle(),message:'Speech added. Review your question, then choose Explore.'});
   else this.update({status:'overflow',message:'The transcript would exceed 2,000 characters. Shorten your question and add it again, or copy the text below.',transcript});
  }catch(error){
   if(id!==this.operation)return;
   this.fail(error instanceof SpeechRequestError?error.message:'Transcription failed. Try again or type your question.');
  }
 }
 insertRecovered() {
  if(this.state.status==='overflow'&&this.accept(this.state.transcript))this.update({...idle(),message:'Speech added. Review your question, then choose Explore.'});
 }
}

export class SpeechRequestError extends Error {}
