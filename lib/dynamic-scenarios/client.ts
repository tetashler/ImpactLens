/** Bounded browser transport for live batches; playback starts from accepted records. */
import {StakeholderRequestGate} from '../stakeholder-simulation/client.ts';
import {parseDynamicRequest,type DynamicRequest} from './plan.ts';
import {validateDynamicResponse,type DynamicResponse,type DynamicFailure} from './response.ts';
import {assertJsonData} from '../experiments/validation.ts';
const INFERENCE_RESPONSE_BYTES=1048576;
/** Start confirmed native work before yielding; cancellation must never launch it afterwards. */
export async function startQuestionWork(start:()=>Promise<void>,mrt?:()=>Promise<void>,aac?:()=>void){const exploration=start(),calculation=mrt?.();aac?.();await Promise.all([exploration,calculation]);}
export class DynamicSession extends StakeholderRequestGate {
 async execute(value:DynamicRequest,key:string,fetcher:typeof fetch=fetch,timeoutMs=125000):Promise<DynamicResponse|DynamicFailure|null>{
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>130000)throw new Error('Live inference timeout must be an integer from 1 to 130000 milliseconds.');
  assertJsonData(value);const input=parseDynamicRequest(value);

  const ticket=this.begin(key),timeoutError=new Error('Live inference request timed out. Start a new attempt.');
  let timedOut=false,rejectInterrupt!:(reason:unknown)=>void;
  const interrupted=new Promise<never>((_,reject)=>{rejectInterrupt=reject;});
  const interrupt=()=>rejectInterrupt(timedOut?timeoutError:new Error('Live inference request cancelled.'));
  ticket.controller.signal.addEventListener('abort',interrupt,{once:true});
  const timer=setTimeout(()=>{if(this.accepts(ticket,key)){timedOut=true;ticket.controller.abort();}},timeoutMs);
  const executeRequest=async()=>{
   if(!this.accepts(ticket,key))return null;
   const response=await fetcher('/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},signal:ticket.controller.signal,body:JSON.stringify({version:1,attemptId:ticket.attemptId,request:input})});
   if(!this.accepts(ticket,key)){void response.body?.cancel().catch(()=>{});return null;}
   const declared=response.headers.get('content-length');
   if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>INFERENCE_RESPONSE_BYTES)){void response.body?.cancel().catch(()=>{});throw new Error('Live inference response exceeds the supported size.');}
   const reader=response.body?.getReader();if(!reader)throw new Error('Live inference returned an empty response.');
   const cancelReader=()=>{void reader.cancel().catch(()=>{});};ticket.controller.signal.addEventListener('abort',cancelReader,{once:true});if(ticket.controller.signal.aborted)cancelReader();
   const chunks:Uint8Array[]=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>INFERENCE_RESPONSE_BYTES){cancelReader();throw new Error('Live inference response exceeds the supported size.');}chunks.push(value);}}finally{ticket.controller.signal.removeEventListener('abort',cancelReader);reader.releaseLock();}
   if(!this.accepts(ticket,key))return null;
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   let body:unknown;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new Error('Live inference returned an invalid response.');}
   if(!response.ok&&!(body!==null&&typeof body==='object'&&(body as {kind?:string}).kind==='planning-failed'))throw new Error('Dynamic scenario request could not complete.');
   const accepted=await validateDynamicResponse(body,{version:1,attemptId:ticket.attemptId,request:input});
   return this.accepts(ticket,key)?accepted:null;
  };
  try{return await Promise.race([executeRequest(),interrupted]);}
  catch(error){if(timedOut&&this.owns(ticket,key))throw timeoutError;if(!this.accepts(ticket,key))return null;throw error;}
  finally{clearTimeout(timer);ticket.controller.signal.removeEventListener('abort',interrupt);}
 }
}
