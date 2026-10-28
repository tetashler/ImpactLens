/** Node-only live activation. Version 1 scripted API remains unchanged. */
import {createDeepseekTransport,encodeTurnContext,MODEL,PROVIDER,type InferenceCallRecord} from './deepseek.ts';
import {runStakeholderSimulation} from '../../stakeholder-simulation/engine.ts';
import {parseStakeholderInput} from '../../stakeholder-simulation/contract.ts';
import {verifyStakeholderRun} from '../../stakeholder-simulation/identities.ts';
import {acquireAiSlot} from '../ai/gate.ts';
import {AiError} from '../ai/errors.ts';
export const LIVE_LIMITS={agents:4,rounds:2,calls:8,outputTokens:800,reservedTokens:214400,runTimeoutMs:120000,costUsd:0.05} as const;
const state=globalThis as typeof globalThis&{__liveInferenceAttemptsV1?:Map<string,number>};
const attempts=state.__liveInferenceAttemptsV1??=new Map<string,number>();
type Transport=ReturnType<typeof createDeepseekTransport>;
export interface LiveDependencies {enabled?:boolean;key?:string;transport?:Transport;reservedTokens?:number}
export function inferenceStatus(){return {version:1,model:MODEL,gateway:'OpenRouter',provider:PROVIDER,fallback:false,connection:process.env.OPENROUTER_API_KEY?.trim()?'configured':'not-configured',enabled:process.env.STAKEHOLDER_LIVE_ENABLED==='true',servingIdentityVerified:false,limits:LIVE_LIMITS};}
export async function executeLiveRun(value:unknown,attemptId:string,overrides:LiveDependencies={},signal?:AbortSignal){
 const input=parseStakeholderInput(value);
 if(input.simulationOptions.mode!=='llm-assisted'||input.stakeholderRoles.length>4||input.simulationOptions.rounds>2)throw new AiError('Live runs require LLM mode, at most four agents and two rounds.','AI_INVALID_REQUEST',400);
 if(!(overrides.enabled??process.env.STAKEHOLDER_LIVE_ENABLED==='true'))throw new AiError('Live execution must be enabled explicitly on the server.','AI_CONFIG',503);
 const key=overrides.key??process.env.OPENROUTER_API_KEY??'';
 if(!key.trim())throw new AiError('OpenRouter is not configured on the server.','AI_CONFIG',503);
 for(const [key,time] of attempts)if(Date.now()-time>86400000)attempts.delete(key);
 if(attempts.has(attemptId))throw new AiError('Use a new attempt identity for each live execution.','AI_DUPLICATE',409);
 if(attempts.size>=2048)throw new AiError('Live attempt retention is full. Wait before another run.','AI_BUSY',429);
 const release=acquireAiSlot(`inference:${attemptId}`),started=Date.now(),records:InferenceCallRecord[]=[];
 attempts.set(attemptId,started);
 let reservedTokens=0,calls=0,readRecords=0;
 const controller=new AbortController(),cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 const timer=setTimeout(cancel,LIVE_LIMITS.runTimeoutMs);
 try{
 const transport=overrides.transport??createDeepseekTransport({key,maxOutputTokens:LIVE_LIMITS.outputTokens,onRecord:record=>records.push(record)});
 const run=await runStakeholderSimulation(input,{attemptId,signal:controller.signal,provider:'openrouter',model:MODEL,generateTurn:async(context,s)=>{
   const reserve=new TextEncoder().encode(encodeTurnContext(context)).byteLength+LIVE_LIMITS.outputTokens+2000;
   if(calls>=8||reservedTokens+reserve>(overrides.reservedTokens??LIVE_LIMITS.reservedTokens)||records.reduce((n,r)=>n+(r.costUsd??0),0)>=LIVE_LIMITS.costUsd)throw new AiError('Live run budget exhausted.','STAKEHOLDER_CALL_BUDGET',429);
   reservedTokens+=reserve;calls++;
   try{const result=await transport.generate(context,s);if(overrides.transport&&transport.records.length===readRecords)records.push(result.record);return result.value;}finally{if(overrides.transport){records.push(...transport.records.slice(readRecords));readRecords=transport.records.length;}}
 }});
 await verifyStakeholderRun(run);
 const sum=(field:'inputTokens'|'outputTokens'|'totalTokens'|'costUsd')=>records.length&&records.every(r=>r[field]!==null)?records.reduce((n,r)=>n+(r[field]??0),0):null;
 return {run,inference:{version:1,requestedModel:MODEL,requestedProvider:PROVIDER,allowFallbacks:false,successfulCalls:records.filter(r=>r.status==='accepted').length,failedCalls:records.filter(r=>r.status==='failed').length,retries:0,inputTokens:sum('inputTokens'),outputTokens:sum('outputTokens'),totalTokens:sum('totalTokens'),costUsd:sum('costUsd'),reservedTokens,reservationBasis:'Conservative UTF-8 bytes plus bounded output; not billed usage.',durationMs:Date.now()-started,roundsCompleted:Math.floor(run.events.length/input.stakeholderRoles.length),activeAgents:input.stakeholderRoles.length,records,limits:LIVE_LIMITS}};
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);release();}
}
export async function handleLiveBody(value:unknown,signal?:AbortSignal,overrides:LiveDependencies={}):Promise<Response>{
 const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 try{
 const b=value as Record<string,unknown>;
 if(!b||Object.keys(b).sort().join(',')!=='attemptId,input,version'||b.version!==2||typeof b.attemptId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(b.attemptId))return json({error:'Supply version 2, attemptId and input.',code:'AI_INVALID_REQUEST'},400);
 let result;try{parseStakeholderInput(b.input);}catch{return json({error:'Invalid live input.',code:'AI_INVALID_REQUEST'},400);}
 result=await executeLiveRun(b.input,b.attemptId,overrides,signal);
 const response={version:2,attemptId:b.attemptId,...result};if(new TextEncoder().encode(JSON.stringify(response)).byteLength>524288)return json({error:'Result exceeds response budget.',code:'AI_RESPONSE_SIZE'},413);
 return json(response);
 }catch(e){return json({error:'Live inference could not start. Check server enablement, credentials and bounded configuration.',code:e instanceof AiError?e.code:'AI_UNAVAILABLE'},e instanceof AiError?e.status:500);}
}
