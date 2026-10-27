/**
 * Opt-in integration fixture, never imported by normal application scripts.
 * NODE_OPTIONS=--import=./scripts/testing/phase56-provider-preload.mjs
 * PHASE56_TEST_PROVIDER=none|gemini|openrouter (default: none)
 * Optional PHASE56_TEST_CONTROL_FILE JSON: {mode:'valid'|'invalid',delayMs:0..5000}.
 * All provider credentials are process-local dummy values; external fetches are blocked.
 */
import { readFileSync } from 'node:fs';

const provider=process.env.PHASE56_TEST_PROVIDER??'none';
if(!['none','gemini','openrouter'].includes(provider))throw new Error('Unsupported integration fixture provider');
process.env.AI_PROVIDER=provider==='none'?'':provider;
process.env.GEMINI_MODEL=provider==='none'?'':'integration-gemini';
process.env.OPENROUTER_MODEL=provider==='none'?'':'integration/mock-model';
process.env.GEMINI_API_KEY=provider==='none'?'':'integration-placeholder-only';
process.env.OPENROUTER_API_KEY=provider==='none'?'':'integration-placeholder-only';
process.env.AI_TIMEOUT_MS='10000';
process.env.AI_MAX_OUTPUT_TOKENS='1024';
const originalFetch=globalThis.fetch;

function controls(){
  try{return JSON.parse(readFileSync(process.env.PHASE56_TEST_CONTROL_FILE,'utf8').replace(/^\uFEFF/,''));}
  catch{return {mode:'valid',delayMs:0};}
}
async function delay(milliseconds,signal){
  const ms=Number.isFinite(milliseconds)?Math.max(0,Math.min(5000,milliseconds)):0;
  if(!ms)return;
  await new Promise((resolve,reject)=>{
    const abort=()=>{clearTimeout(timer);reject(new DOMException('Cancelled integration fixture','AbortError'));};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  });
}
function selection(schema,mode){
  if(mode==='invalid')return {version:1,inventedMetric:12345};
  if(schema.properties.title)return {version:1,title:'Coverage before conclusions',kpis:['benefitShare','meanSaved','unassigned'],chart:{dimension:'sex',type:'benefit-bars',sort:'benefit-asc'},notes:['assumed-demand','unknown-outcomes']};
  if(schema.properties.facts)return {version:1,focus:'coverage',facts:[{groupId:'g0',metricId:'meanSaved'},{groupId:'g0',metricId:'unassigned'}],notes:['assumed-demand','unknown-outcomes']};
  // Intentionally leave unsupported-personal-question handling to the real application guard.
  return {version:1,topics:['journey','source','weight']};
}
globalThis.fetch=async(input,init={})=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  const gemini=url.hostname==='generativelanguage.googleapis.com',openrouter=url.hostname==='openrouter.ai';
  if(gemini||openrouter){
    if(provider==='none')throw new Error('No-key fixture must not call a provider');
    if(init.method!=='POST')return gemini
      ?Response.json({supportedGenerationMethods:['generateContent'],outputTokenLimit:16384})
      :Response.json({data:[{id:'integration/mock-model',supported_parameters:['structured_outputs','response_format']}]});
    const wire=JSON.parse(init.body),config=controls();
    const schema=gemini?wire.generationConfig.responseFormat.text.schema:wire.response_format.json_schema.schema;
    await delay(config.delayMs,init.signal);
    const output=JSON.stringify(selection(schema,config.mode));
    return gemini
      ?Response.json({candidates:[{content:{parts:[{text:output}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:40,totalTokenCount:140}})
      :Response.json({choices:[{message:{content:output},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:40,total_tokens:140}});
  }
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('External request blocked by integration fixture');
  return originalFetch(input,{...init,redirect:'error'});
};
