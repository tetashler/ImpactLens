/**
 * Opt-in, unpaid Phase 7H/7J production-server fixture. Normal scripts never import it.
 * NODE_OPTIONS=--import=./scripts/testing/phase7hj-inference-preload.mjs
 * PHASE7HJ_TEST_MODE=enabled|disabled|missing-key (default: disabled)
 * Optional PHASE7HJ_TEST_CONTROL_FILE points to a small JSON file containing:
 * {mode:'valid'|'bad-provider'|'bad-model'|'invalid-json'|'invalid-reference'|
 *       'partial'|'budget'|'http500'|'unknown-cost',delayMs:0..30000,failAfter:0..8}.
 * Optional PHASE7HJ_TEST_TELEMETRY_FILE appends safe records to a .jsonl file.
 * This intercepts individual completion calls; the real engine builds the run.
 * No credential file is read. All non-loopback external fetches are blocked.
 */
import {readFileSync,statSync,appendFileSync} from 'node:fs';
import {basename,extname} from 'node:path';

const testMode=process.env.PHASE7HJ_TEST_MODE??'disabled';
if(!['enabled','disabled','missing-key'].includes(testMode))throw new Error('Unsupported Phase 7H/7J fixture mode.');
process.env.OPENROUTER_API_KEY=testMode==='missing-key'?'':'phase7hj-dummy-no-paid-access';
process.env.STAKEHOLDER_LIVE_ENABLED=testMode==='disabled'?'false':'true';
process.env.AI_PROVIDER='';
process.env.OPENROUTER_MODEL='';
process.env.GEMINI_MODEL='';
process.env.GEMINI_API_KEY='';
process.env.GOOGLE_API_KEY='';
process.env.GOOGLE_GENERATIVE_AI_API_KEY='';

const MODEL='deepseek/deepseek-v4-flash-0731';
const PROVIDER='digitalocean';
const originalFetch=globalThis.fetch;
const modes=new Set(['valid','bad-provider','bad-model','invalid-json','invalid-reference','partial','budget','http500','unknown-cost']);
const callsByExperiment=new Map();
const generations=new Map();
const telemetry=[];
let generationSequence=0;
// Only already-sanitised metadata is exposed here; never retain headers or prompts.
Object.defineProperty(globalThis,'__phase7hjInferenceTelemetry',{value:telemetry,writable:false,configurable:false});

function controls(){
  const file=process.env.PHASE7HJ_TEST_CONTROL_FILE;
  if(!file)return {mode:'valid',delayMs:0,failAfter:2};
  try{
    if(/^\.env(?:\.|$)/i.test(basename(file))||extname(file).toLowerCase()!=='.json'||!statSync(file).isFile()||statSync(file).size>4096)throw new Error();
    const value=JSON.parse(readFileSync(file,'utf8').replace(/^\uFEFF/,''));
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['mode','delayMs','failAfter'].includes(key)))throw new Error();
    const mode=value.mode??'valid',delayMs=value.delayMs??0,failAfter=value.failAfter??2;
    if(!modes.has(mode)||!Number.isSafeInteger(delayMs)||delayMs<0||delayMs>30000||!Number.isSafeInteger(failAfter)||failAfter<0||failAfter>8)throw new Error();
    return {mode,delayMs,failAfter};
  }catch{
    // Malformed controls fail closed with a safe fixture response.
    return {mode:'http500',delayMs:0,failAfter:0};
  }
}

function recordTelemetry(record){
  const safe=Object.freeze({...record});
  telemetry.push(safe);
  if(telemetry.length>512)telemetry.shift();
  const file=process.env.PHASE7HJ_TEST_TELEMETRY_FILE;
  if(file){
    if(/^\.env(?:\.|$)/i.test(basename(file))||extname(file).toLowerCase()!=='.jsonl')throw new Error('Fixture telemetry requires a JSONL destination.');
    try{appendFileSync(file,`${JSON.stringify(safe)}\n`,'utf8');}
    catch{throw new Error('Fixture telemetry could not be written.');}
  }
}

async function delay(ms,signal){
  if(signal?.aborted)throw new DOMException('Fixture request cancelled.','AbortError');
  if(!ms)return;
  await new Promise((resolve,reject)=>{
    const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(new DOMException('Fixture request cancelled.','AbortError'));};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
    signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted)abort();
  });
}

function safeExcerpt(value,maximum){
  return String(value??'unspecified question')
    .replace(/https?:\/\/\S+|www\.\S+/gi,'[source omitted]')
    .replace(/\d+(?:[.,]\d+)*/g,'unspecified')
    .replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,maximum);
}

function action(context,mode){
  const other=[...context.previousEvents].reverse().find(event=>event.roleId!==context.role.id);
  const own=[...context.previousEvents].reverse().find(event=>event.roleId===context.role.id);
  const roleTitle=safeExcerpt(context.role.title,180);
  const excerpt=safeExcerpt(context.input.question,220);
  const concern=safeExcerpt(context.role.interests?.[0]??'the unresolved assumptions',350);
  return {
    type:other?'response':'argument',addressedRoleId:other?.roleId??null,
    statement:`Integration fixture only. As the fictional ${roleTitle}, I would clarify ${concern} for the supplied question "${excerpt}". ${other?'I respond to an earlier recorded participant perspective.':'The initial assumptions need further evidence.'}`,
    previousEventIds:mode==='invalid-reference'?['fixture-unavailable-event']:other?[other.id]:[],
    evidenceFindingIds:(context.input.evidence?.findings??[]).slice(0,1).map(finding=>finding.id),
    assumptionIds:context.input.assumptions.map(assumption=>assumption.id),
    reasoningSummary:'This mock structured action uses the actual bounded participant context and available earlier events; it is not a paid provider opinion.',
    uncertainties:['This is an integration fixture. Actual provider execution, stakeholder behaviour and future outcomes remain unverified.'],
    position:context.memory.position??own?.position??'information-seeking',
    topics:[String(context.role.id).slice(0,100),'fixture-context'],
  };
}

function requestMatches(wire){
  const provider=wire.provider,schema=wire.response_format?.json_schema;
  const fields=['type','addressedRoleId','statement','previousEventIds','evidenceFindingIds','assumptionIds','reasoningSummary','uncertainties','position','topics'];
  return wire.model===MODEL&&provider&&Object.keys(provider).length===3
    &&Array.isArray(provider.only)&&provider.only.length===1&&provider.only[0]===PROVIDER
    &&provider.allow_fallbacks===false&&provider.require_parameters===true&&wire.stream===false
    &&Number.isSafeInteger(wire.max_tokens)&&wire.max_tokens>0&&wire.max_tokens<=800
    &&wire.response_format.type==='json_schema'&&schema?.strict===true&&schema.name==='stakeholder_turn_v1'
    &&schema.schema?.type==='object'&&schema.schema.additionalProperties===false
    &&Array.isArray(schema.schema.required)&&schema.schema.required.length===fields.length
    &&fields.every(field=>schema.schema.required.includes(field)&&Object.hasOwn(schema.schema.properties??{},field))
    &&Array.isArray(wire.messages)&&wire.messages.length===2&&wire.messages[0].role==='system'&&wire.messages[1].role==='user';
}

globalThis.fetch=async(input,init={})=>{
  const request=input instanceof Request?input:null;
  const url=new URL(request?request.url:String(input));
  const method=(init.method??request?.method??'GET').toUpperCase();
  const signal=init.signal??request?.signal;
  if(url.hostname==='openrouter.ai'){
    if(testMode!=='enabled')throw new Error('This fixture configuration must not call a provider.');
    if(url.origin!=='https://openrouter.ai'||url.username||url.password)throw new Error('Unexpected fixture provider destination.');
    if(method==='GET'&&url.pathname==='/api/v1/generation'&&[...url.searchParams.keys()].join(',')==='id'){
      const generation=generations.get(url.searchParams.get('id'));
      if(!generation)return Response.json({error:'Unknown fixture generation.'},{status:404});
      return Response.json({data:{id:generation.id,model:MODEL,provider_name:'DigitalOcean',native_tokens_prompt:100,native_tokens_completion:50,total_cost:generation.cost}});
    }
    if(method!=='POST'||url.pathname!=='/api/v1/chat/completions'||url.search)throw new Error('Unexpected fixture provider operation.');
    let wire,context;
    try{
      const body=init.body??(request?await request.clone().text():'');
      if(typeof body!=='string'||body.length>65536)throw new Error();
      wire=JSON.parse(body);
      if(!requestMatches(wire))throw new Error();
      context=JSON.parse(wire.messages[1].content);
      if(!context?.input||typeof context.input.experimentId!=='string'||context.input.experimentId.length>128
        ||typeof context.input.question!=='string'||!Array.isArray(context.input.assumptions)
        ||!context.role||typeof context.role.id!=='string'||!Array.isArray(context.previousEvents)
        ||!context.memory||!Number.isSafeInteger(context.turnIndex)||context.turnIndex<0||context.turnIndex>=8)throw new Error();
    }catch{throw new Error('Fixture rejected an unexpected completion request.');}
    const config=controls(),experiment=context.input.experimentId;
    if(context.turnIndex===0)callsByExperiment.set(experiment,0);
    if(callsByExperiment.size>512)callsByExperiment.delete(callsByExperiment.keys().next().value);
    const call=(callsByExperiment.get(experiment)??0)+1;
    callsByExperiment.set(experiment,call);
    recordTelemetry({mode:config.mode,model:wire.model,provider:PROVIDER,allowFallbacks:wire.provider.allow_fallbacks,
      turnIndex:context.turnIndex,roleId:context.role.id,previousEventCount:context.previousEvents.length,
      otherParticipantReferenceCount:context.previousEvents.some(event=>event.roleId!==context.role.id)?1:0,call});
    await delay(config.delayMs,signal);
    if(config.mode==='http500'||config.mode==='partial'&&call>config.failAfter)return Response.json({error:'Controlled fixture failure.'},{status:500});
    const cost=config.mode==='unknown-cost'?null:config.mode==='budget'&&call===1?0.06:0.0001;
    const id=`gen-phase7hj-${++generationSequence}`;
    generations.set(id,{id,cost});
    if(generations.size>512)generations.delete(generations.keys().next().value);
    return Response.json({id,model:config.mode==='bad-model'?'fixture/other-model':MODEL,
      provider:config.mode==='bad-provider'?'OtherFixtureProvider':'DigitalOcean',
      choices:[{finish_reason:'stop',message:{content:config.mode==='invalid-json'?'{':JSON.stringify(action(context,config.mode))}}],
      usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150,cost}});
  }
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('External request blocked by the unpaid Phase 7H/7J fixture.');
  return originalFetch(input,{...init,redirect:'error'});
};
