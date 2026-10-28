/** Bounded browser transport for live batches; playback starts from accepted records. */
import {StakeholderRequestGate} from './client.ts';
import {parseStakeholderInput,type StakeholderSimulationInputV1} from './contract.ts';
import {assertJsonData} from '../experiments/validation.ts';
import {INFERENCE_RESPONSE_BYTES,validateInferenceResponse,type InferenceResponseV2} from './inference-contract.ts';

const HTTP_ERRORS:Record<string,string>={
 AI_CONFIG:'Live inference is not configured or enabled on the server. Check Settings.',
 AI_BUSY:'Live inference is busy. Wait before starting a new attempt.',
 AI_DUPLICATE:'This attempt was already used. Start a new attempt.',
 AI_INVALID_REQUEST:'This input cannot run with the supported live inference settings.',
 AI_RESPONSE_SIZE:'The live inference result exceeds the supported size.',
 AI_PROVIDER_IDENTITY:'The required serving model and provider could not be verified.',
 STAKEHOLDER_ORIGIN:'Start inference from the application origin.',
};

export class LiveInferenceSession extends StakeholderRequestGate {
 async execute(value:StakeholderSimulationInputV1,key:string,fetcher:typeof fetch=fetch,timeoutMs=125000):Promise<InferenceResponseV2|null>{
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>130000)throw new Error('Live inference timeout must be an integer from 1 to 130000 milliseconds.');
  assertJsonData(value);const input=parseStakeholderInput(value);
  if(input.simulationOptions.mode!=='llm-assisted'||input.stakeholderRoles.length>4||input.simulationOptions.rounds>2)throw new Error('Select a supported bounded live inference input.');
  const ticket=this.begin(key),timeoutError=new Error('Live inference request timed out. Start a new attempt.');
  let timedOut=false,rejectInterrupt!:(reason:unknown)=>void;
  const interrupted=new Promise<never>((_,reject)=>{rejectInterrupt=reject;});
  const interrupt=()=>rejectInterrupt(timedOut?timeoutError:new Error('Live inference request cancelled.'));
  ticket.controller.signal.addEventListener('abort',interrupt,{once:true});
  const timer=setTimeout(()=>{if(this.accepts(ticket,key)){timedOut=true;ticket.controller.abort();}},timeoutMs);
  const executeRequest=async()=>{
   if(!this.accepts(ticket,key))return null;
   const response=await fetcher('/api/stakeholder-simulate',{method:'POST',headers:{'Content-Type':'application/json'},signal:ticket.controller.signal,body:JSON.stringify({version:2,attemptId:ticket.attemptId,input})});
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
   if(!response.ok){const code=body!==null&&typeof body==='object'&&!Array.isArray(body)&&(body as Record<string,unknown>).code;throw new Error(typeof code==='string'&&Object.hasOwn(HTTP_ERRORS,code)?HTTP_ERRORS[code]:'Live inference could not complete. Start a new attempt.');}
   const accepted=await validateInferenceResponse(body,{attemptId:ticket.attemptId,input});
   return this.accepts(ticket,key)?accepted:null;
  };
  try{return await Promise.race([executeRequest(),interrupted]);}
  catch(error){if(timedOut&&this.owns(ticket,key))throw timeoutError;if(!this.accepts(ticket,key))return null;throw error;}
  finally{clearTimeout(timer);ticket.controller.signal.removeEventListener('abort',interrupt);}
 }
}
