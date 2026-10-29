import {handleLiveBody,type LiveDependencies} from '../inference/service.ts';
/** Node-only bounded execution boundary. No credentials are read by deterministic mode. */
import {parseStakeholderInput} from '../../stakeholder-simulation/contract.ts';
import {verifyStakeholderRun} from '../../stakeholder-simulation/identities.ts';
import {runStakeholderSimulation} from '../../stakeholder-simulation/engine.ts';
import {createStakeholderTurnGenerator,type StakeholderLlmDependencies} from './llm.ts';
import {acquireAiSlot} from '../ai/gate.ts';
import {AiError} from '../ai/errors.ts';

export const STAKEHOLDER_API_LIMITS={requestBytes:98_304,responseBytes:524_288,concurrentRuns:2} as const;
type Dependencies={live:LiveDependencies;allowLlm:boolean;llm:Partial<StakeholderLlmDependencies>};
class RequestError extends Error {readonly status:number;readonly code:string;constructor(message:string,status:number,code='STAKEHOLDER_REQUEST'){super(message);this.status=status;this.code=code;}}
const state=globalThis as typeof globalThis&{__stakeholderPendingV1?:Set<string>};
const pending=state.__stakeholderPendingV1??=new Set<string>();
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function readBody(request:Request,signal:AbortSignal=request.signal):Promise<unknown>{
  const length=request.headers.get('content-length');
  if(length!==null){if(!/^\d+$/.test(length))throw new RequestError('Invalid content length.',400);if(Number(length)>STAKEHOLDER_API_LIMITS.requestBytes)throw new RequestError('Stakeholder request exceeds 96 KiB.',413);}
  if(!request.body)throw new RequestError('Supply a JSON request.',400);
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  const cancel=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
  try{
    while(true){if(signal.aborted)throw new RequestError('Simulation request cancelled.',499,'STAKEHOLDER_CANCELLED');const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>STAKEHOLDER_API_LIMITS.requestBytes){void reader.cancel().catch(()=>{});throw new RequestError('Stakeholder request exceeds 96 KiB.',413);}chunks.push(next.value);}
    if(signal.aborted)throw new RequestError('Simulation request cancelled.',499,'STAKEHOLDER_CANCELLED');
    const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}
    try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));}catch{throw new RequestError('Supply valid UTF-8 JSON.',400);}
  }finally{signal.removeEventListener('abort',cancel);reader.releaseLock();}
}
/** Live calls are deliberately not authorised in the exported route. Tests inject explicit permission and mocks. */
export async function handleStakeholderRequest(request:Request,overrides:Partial<Dependencies>={}):Promise<Response>{
  let heldAttempt:string|undefined,releaseAi:(()=>void)|undefined;
  try{
    const url=new URL(request.url),origin=request.headers.get('origin');
    const localOrigin=new URL(`${url.protocol}//${request.headers.get('host')??url.host}`).origin;
    if(origin&&origin!==localOrigin)throw new RequestError('Use simulation from the application origin.',403,'STAKEHOLDER_ORIGIN');
    if(url.search)throw new RequestError('Simulation does not accept query parameters.',400);
    if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new RequestError('Send application/json.',415);
    const value=await readBody(request);
    if(!value||typeof value!=='object'||Array.isArray(value))throw new RequestError('Supply a versioned stakeholder simulation request.',400);
    const body=value as Record<string,unknown>;
    if(body.version===2)return handleLiveBody(body,request.signal,overrides.live);
    if(Object.keys(body).length!==3||!['version','attemptId','input'].every(k=>Object.hasOwn(body,k))||body.version!==1||typeof body.attemptId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(body.attemptId))throw new RequestError('Supply version 1, an attempt identifier and simulation input.',400);
    let input;try{input=parseStakeholderInput(body.input);if(input.version!==1)throw new Error();}catch{throw new RequestError('Check the bounded scenario, fictional roles, evidence and simulation options.',400);}
    if(input.simulationOptions.mode==='llm-assisted'&&!overrides.allowLlm)throw new RequestError('Live LLM execution is not authorised in this prototype. Choose deterministic-demo; no provider call was made.',503,'STAKEHOLDER_LLM_UNAVAILABLE');
    if(pending.has(body.attemptId))throw new RequestError('This simulation attempt is already running.',409,'STAKEHOLDER_DUPLICATE');
    if(pending.size>=STAKEHOLDER_API_LIMITS.concurrentRuns)throw new RequestError('Two stakeholder runs are already executing. Wait and retry.',429,'STAKEHOLDER_BUSY');
    pending.add(body.attemptId);heldAttempt=body.attemptId;
    let generateTurn,provider:string|undefined,model:string|undefined;
    if(input.simulationOptions.mode==='llm-assisted'){
      releaseAi=acquireAiSlot(`stakeholder:${body.attemptId}`);
      const generated=createStakeholderTurnGenerator(overrides.llm);generateTurn=generated.generateTurn;provider=generated.provider;model=generated.model;
    }
    const run=await runStakeholderSimulation(input,{attemptId:body.attemptId,signal:request.signal,generateTurn,provider,model});
    await verifyStakeholderRun(run);
    const response={version:1,attemptId:body.attemptId,run};
    if(new TextEncoder().encode(JSON.stringify(response)).byteLength>STAKEHOLDER_API_LIMITS.responseBytes)throw new RequestError('Simulation result exceeds the response budget. Reduce rounds or evidence.',413,'STAKEHOLDER_RESPONSE_SIZE');
    return json(response);
  }catch(error){
    if(error instanceof RequestError)return json({error:error.message,code:error.code},error.status);
    if(error instanceof AiError)return json({error:'The configured model could not start the stakeholder run. No scripted substitution occurred.',code:error.code},error.status);
    return json({error:'Stakeholder execution could not complete. Retry with a smaller valid configuration.',code:'STAKEHOLDER_UNAVAILABLE'},500);
  }finally{if(heldAttempt)pending.delete(heldAttempt);releaseAi?.();}
}
