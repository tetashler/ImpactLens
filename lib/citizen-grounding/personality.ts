/** Private initialization contract. No fetch, credentials, provider transport or paid admission lives here. */
import {verifiedModelIdentity,type InferenceModel,type InferenceServingProvider} from '../inference/model-identity.ts';
import {assertJsonData,canonical,ensure,freezeSnapshot,identifier,object,text} from '../experiments/validation.ts';

export const PERSONALITY_MODEL='deepseek/deepseek-v4-flash-0731';
export const PERSONALITY_PROVIDER='DigitalOcean';
export const PERSONALITY_LIMITS=Object.freeze({capable:70,agents:100,inputBytes:24000,outputTokens:6000,outputBytes:6000,rosterBytes:64000});
const styles=['direct','reflective','concise','exploratory','supportive'] as const;
export interface PersonalityTraits {communicationStyle:typeof styles[number];caution:number;initiative:number;detail:number;cooperation:number;uncertaintyTolerance:number}
export interface CitizenPersonality {citizenId:string;policy:'citizen-personality-v1';origin:'offline-mock'|'model-generated'|'deterministic-rule';traits:PersonalityTraits;generationId:string|null}
export interface PersonalityInitialization {runId:string;capableIds:string[];backgroundIds:string[];seed:string}
/** inputDigest binds the frozen v1 logical request; wireRequestDigest binds an adapted Anthropic HTTP body. */
export interface PersonalityGeneration {id:string;mode:'offline-mock'|'real-provider';status:'accepted';requestId:string;inputDigest:string;outputDigest:string;requestedModel:InferenceModel;servingModel:InferenceModel;servingProvider:InferenceServingProvider;wireRequestDigest?:string;fallback:false;uncertain:false;inputTokens:number;outputTokens:number;costUsd:number|null;usageBasis:'offline-byte-upper-bound'|'provider-reported'|'provider-reported-tokens-cost-unknown'}
export interface PersonalityRoster {version:1;policy:'personality-initialization-v1';id:string;runId:string;seedDigest:string;capableIds:string[];backgroundIds:string[];profiles:CitizenPersonality[];generation:PersonalityGeneration}
interface WireProfile {slotId:string;style:PersonalityTraits['communicationStyle'];c:number;i:number;d:number;k:number;u:number}
export interface PersonalityWireRoster {profiles:WireProfile[]}
export interface PersonalityRequest {version:1;policy:'personality-request-v1';requestId:string;runId:string;seedDigest:string;capableIds:string[];backgroundIds:string[];inputDigest:string;body:{model:typeof PERSONALITY_MODEL;provider:{only:['digitalocean'];allow_fallbacks:false;require_parameters:true};reasoning:{effort:'none';exclude:true};max_tokens:6000;stream:false;messages:{role:'system'|'user';content:string}[];response_format:{type:'json_schema';json_schema:{name:'citizen_personalities_v1';strict:true;schema:Record<string,any>}}}}
export interface MockPersonalityResponse {id:string;model:string;provider:string;choices:{finish_reason:string;message:{content:string}}[];usage:{prompt_tokens:number;completion_tokens:number;cost:number}}
export interface MockPersonalityGateway {mode:'offline-mock';generate(request:Readonly<PersonalityRequest>,signal?:AbortSignal):Promise<MockPersonalityResponse>}
const SYSTEM='Generate distinct fictional communication and decision styles for the supplied anonymous slots. No age, sex, home, occupation, workplace, citizenship, diagnosis, politics, biography or observed personality data are supplied or may be invented. Traits are fictional assumptions, not demographic predictions. style is communication style; c is caution/deliberation, i initiative, d detail preference, k cooperation style, u uncertainty tolerance. Numeric traits are integers from zero to four. Keep all profiles distinct by their complete style and trait vector; no value represents a clinical score or fixed opinion. Select every supplied slot exactly once. Return only the strict profiles schema; never return factual citizen attributes or additional prose.';
const bytes=(value:unknown)=>new TextEncoder().encode(typeof value==='string'?value:canonical(value)).length;
const safe=<T>(code:string,run:()=>T):T=>{try{return run();}catch{throw new Error(code);}};
function check(value:unknown,code:string):asserts value{ensure(value,code);}
const sha=async(value:unknown)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(typeof value==='string'?value:canonical(value))))].map(b=>b.toString(16).padStart(2,'0')).join('');
const ids=(value:unknown,max:number)=>safe('PERSONALITY_INPUT',()=>{assertJsonData(value);check(Array.isArray(value)&&value.length<=max,'PERSONALITY_INPUT');const list=value.map(v=>identifier(v));check(new Set(list).size===list.length,'PERSONALITY_INPUT');return list;});
function initialization(value:PersonalityInitialization){return safe('PERSONALITY_INPUT',()=>{
 assertJsonData(value);object(value,['runId','capableIds','backgroundIds','seed']);identifier(value.runId);text(value.runId,128);text(value.seed,128);
 const capableIds=ids(value.capableIds,PERSONALITY_LIMITS.capable),backgroundIds=ids(value.backgroundIds,PERSONALITY_LIMITS.agents);
 check(capableIds.length>=1&&capableIds.length+backgroundIds.length<=PERSONALITY_LIMITS.agents&&new Set([...capableIds,...backgroundIds]).size===capableIds.length+backgroundIds.length,'PERSONALITY_INPUT');
 return freezeSnapshot({...value,capableIds,backgroundIds});
});}
function neutralInput(capableIds:readonly string[],seedDigest:string){return {version:1,policy:'citizen-personality-v1',slots:capableIds.map((_,i)=>({slotId:'profile-'+(i+1)})),diversityToken:seedDigest};}
function schema(slotIds:string[]){return {type:'object',additionalProperties:false,required:['profiles'],properties:{profiles:{type:'array',minItems:slotIds.length,maxItems:slotIds.length,items:{type:'object',additionalProperties:false,required:['slotId','style','c','i','d','k','u'],properties:{slotId:{type:'string',enum:slotIds},style:{type:'string',enum:[...styles]},...Object.fromEntries(['c','i','d','k','u'].map(k=>[k,{type:'integer',minimum:0,maximum:4}]))}}}}};}

function requestBody(capableIds:readonly string[],seedDigest:string):PersonalityRequest['body']{
 const input=neutralInput(capableIds,seedDigest);
 return {model:PERSONALITY_MODEL,provider:{only:['digitalocean'],allow_fallbacks:false,require_parameters:true},reasoning:{effort:'none',exclude:true},max_tokens:6000,stream:false,messages:[{role:'system',content:SYSTEM},{role:'user',content:canonical(input)}],response_format:{type:'json_schema',json_schema:{name:'citizen_personalities_v1',strict:true,schema:schema(input.slots.map(s=>s.slotId))}}};
}
export async function buildPersonalityRequest(value:PersonalityInitialization):Promise<PersonalityRequest>{
 const i=initialization(value),seedDigest=await sha(i.seed),body=requestBody(i.capableIds,seedDigest),inputDigest=await sha(body);
 const requestId=await sha({version:1,policy:'personality-request-v1',runId:i.runId,capableIds:i.capableIds,seedDigest,inputDigest});
 check(bytes(body)<=PERSONALITY_LIMITS.inputBytes,'PERSONALITY_INPUT_LIMIT');
 return freezeSnapshot({version:1,policy:'personality-request-v1',requestId,runId:i.runId,seedDigest,capableIds:i.capableIds,backgroundIds:i.backgroundIds,inputDigest,body});
}
const wireTraits=(p:WireProfile):PersonalityTraits=>({communicationStyle:p.style,caution:p.c,initiative:p.i,detail:p.d,cooperation:p.k,uncertaintyTolerance:p.u});
const encodeTraits=(slotId:string,t:PersonalityTraits):WireProfile=>({slotId,style:t.communicationStyle,c:t.caution,i:t.initiative,d:t.detail,k:t.cooperation,u:t.uncertaintyTolerance});
function traits(value:unknown):PersonalityTraits{
 const t=safe('PERSONALITY_TRAITS',()=>{assertJsonData(value);return object(value,['communicationStyle','caution','initiative','detail','cooperation','uncertaintyTolerance']);});
 check(styles.includes(t.communicationStyle as PersonalityTraits['communicationStyle']),'PERSONALITY_TRAITS');
 for(const k of ['caution','initiative','detail','cooperation','uncertaintyTolerance'])check(Number.isSafeInteger(t[k])&&(t[k] as number)>=0&&(t[k] as number)<=4,'PERSONALITY_TRAITS');
 return t as unknown as PersonalityTraits;
}
function parseWire(value:unknown,count:number):PersonalityWireRoster{
 const root=safe('PERSONALITY_ROSTER',()=>{assertJsonData(value);return object(value,['profiles']);});
 check(Array.isArray(root.profiles)&&root.profiles.length===count,'PERSONALITY_ROSTER');
 const seen=new Set<string>(),vectors=new Set<string>();
 const profiles=root.profiles.map(value=>{
  const row=safe('PERSONALITY_ROSTER',()=>object(value,['slotId','style','c','i','d','k','u']));
  check(typeof row.slotId==='string'&&/^profile-[1-9][0-9]*$/.test(row.slotId)&&Number(row.slotId.slice(8))<=count&&!seen.has(row.slotId),'PERSONALITY_ROSTER');seen.add(row.slotId);
  const p=row as unknown as WireProfile,t=traits(wireTraits(p)),key=canonical(t);check(!vectors.has(key),'PERSONALITY_DIVERSITY');vectors.add(key);return p;
 });
 return {profiles};
}
function vector(index:number):PersonalityTraits{
 let n=((index%15625)+15625)%15625;const communicationStyle=styles[n%5];n=Math.floor(n/5);const values:number[]=[];for(let i=0;i<5;i++){values.push(n%5);n=Math.floor(n/5);}
 return {communicationStyle,caution:values[0],initiative:values[1],detail:values[2],cooperation:values[3],uncertaintyTolerance:values[4]};
}
function backgroundProfiles(backgroundIds:readonly string[],seedDigest:string,capableProfiles:readonly CitizenPersonality[]):CitizenPersonality[]{
 const used=new Set(capableProfiles.map(p=>canonical(p.traits))),offset=parseInt(seedDigest.slice(0,8),16)+1000;
 return backgroundIds.map((citizenId,i)=>{let n=offset+i,t=vector(n);while(used.has(canonical(t)))t=vector(++n);used.add(canonical(t));return {citizenId,policy:'citizen-personality-v1',origin:'deterministic-rule',traits:t,generationId:null};});
}
/** Test fixture only. Its generated values are never labelled as actual DeepSeek output. */
export function createMockPersonalityGateway():MockPersonalityGateway{return {mode:'offline-mock',async generate(request,signal){
 signal?.throwIfAborted();const offset=parseInt(request.seedDigest.slice(0,8),16),profiles=request.capableIds.map((_,i)=>encodeTraits('profile-'+(i+1),vector(offset+i))),content=canonical({profiles});
 check(bytes(content)<=PERSONALITY_LIMITS.outputBytes,'PERSONALITY_OUTPUT_LIMIT');
 return {id:'mock-personality-'+request.requestId.slice(0,40),model:PERSONALITY_MODEL,provider:PERSONALITY_PROVIDER,choices:[{finish_reason:'stop',message:{content}}],usage:{prompt_tokens:bytes(request.body.messages[1].content),completion_tokens:bytes(content),cost:0}};
}};}
function response(value:unknown,count:number){
 const r=safe('PERSONALITY_ENVELOPE',()=>{assertJsonData(value);return object(value,['id','model','provider','choices','usage']);});
 check(r.model===PERSONALITY_MODEL&&r.provider===PERSONALITY_PROVIDER,'PERSONALITY_PROVIDER_IDENTITY');safe('PERSONALITY_ENVELOPE',()=>identifier(r.id));
 check(Array.isArray(r.choices)&&r.choices.length===1,'PERSONALITY_ENVELOPE');
 const choices=r.choices;const choice=safe('PERSONALITY_ENVELOPE',()=>object(choices[0],['finish_reason','message']));check(choice.finish_reason==='stop','PERSONALITY_INCOMPLETE');
 const message=safe('PERSONALITY_ENVELOPE',()=>object(choice.message,['content']));check(typeof message.content==='string','PERSONALITY_ENVELOPE');check(bytes(message.content)<=PERSONALITY_LIMITS.outputBytes,'PERSONALITY_OUTPUT_LIMIT');
 const usage=safe('PERSONALITY_ENVELOPE',()=>object(r.usage,['prompt_tokens','completion_tokens','cost']));
 check(Number.isSafeInteger(usage.prompt_tokens)&&(usage.prompt_tokens as number)>=0&&Number.isSafeInteger(usage.completion_tokens)&&(usage.completion_tokens as number)>0,'PERSONALITY_ENVELOPE');
 check((usage.completion_tokens as number)<=PERSONALITY_LIMITS.outputTokens,'PERSONALITY_OUTPUT_LIMIT');check(usage.cost===0,'PERSONALITY_MOCK_COST');
 let content:unknown;try{content=JSON.parse(message.content);}catch{throw new Error('PERSONALITY_JSON');}
 return {id:r.id as string,wire:parseWire(content,count),inputTokens:usage.prompt_tokens as number,outputTokens:usage.completion_tokens as number};
}

/** Only an explicitly injected mock adapter is accepted. No live transport can be auto-created. */
export async function initializeMockPersonalities(value:PersonalityInitialization,gateway:MockPersonalityGateway,signal?:AbortSignal):Promise<PersonalityRoster>{
 check(gateway?.mode==='offline-mock'&&typeof gateway.generate==='function','PERSONALITY_LIVE_DISABLED');signal?.throwIfAborted();
 const request=await buildPersonalityRequest(value);signal?.throwIfAborted();const accepted=response(await gateway.generate(request,signal),request.capableIds.length);signal?.throwIfAborted();
 const bySlot=new Map(accepted.wire.profiles.map(p=>[p.slotId,p])),profiles:CitizenPersonality[]=request.capableIds.map((citizenId,i)=>({citizenId,policy:'citizen-personality-v1',origin:'offline-mock',traits:wireTraits(bySlot.get('profile-'+(i+1))!),generationId:accepted.id}));
 profiles.push(...backgroundProfiles(request.backgroundIds,request.seedDigest,profiles));
 const normalizedOutput={profiles:request.capableIds.map((_,i)=>encodeTraits('profile-'+(i+1),profiles[i].traits))};
 const generation:PersonalityGeneration={id:accepted.id,mode:'offline-mock',status:'accepted',requestId:request.requestId,inputDigest:request.inputDigest,outputDigest:await sha(normalizedOutput),requestedModel:PERSONALITY_MODEL,servingModel:PERSONALITY_MODEL,servingProvider:PERSONALITY_PROVIDER,fallback:false,uncertain:false,inputTokens:accepted.inputTokens,outputTokens:accepted.outputTokens,costUsd:0,usageBasis:'offline-byte-upper-bound'};
 const body={version:1 as const,policy:'personality-initialization-v1' as const,runId:request.runId,seedDigest:request.seedDigest,capableIds:request.capableIds,backgroundIds:request.backgroundIds,profiles,generation};
 return validatePersonalityRoster({...body,id:'personality-roster-'+await sha(body)},request.capableIds,request.backgroundIds);
}
export const mockPersonalityRoster=(input:PersonalityInitialization,signal?:AbortSignal)=>initializeMockPersonalities(input,createMockPersonalityGateway(),signal);
export function initializeLivePersonalities():never{throw new Error('PERSONALITY_LIVE_DISABLED');}

/** Shared strict output parser; a server transport must supply verified provider provenance separately. */
export function parsePersonalityWire(value:unknown,count:number):PersonalityWireRoster{
 check(Number.isSafeInteger(count)&&count>=1&&count<=PERSONALITY_LIMITS.capable,'PERSONALITY_INPUT');
 return parseWire(value,count);
}

export interface ProviderPersonalityProvenance {id:string;inputTokens:number;outputTokens:number;costUsd:number|null;requestedModel?:string;servingModel?:string;servingProvider?:string;wireRequestDigest?:string}
/** Pure assembly only. This function performs no inference and never substitutes mock profiles. */
export async function acceptProviderPersonalities(request:Readonly<PersonalityRequest>,value:unknown,provenance:ProviderPersonalityProvenance):Promise<PersonalityRoster>{
 const explicitIdentity=provenance.requestedModel!==undefined||provenance.servingModel!==undefined||provenance.servingProvider!==undefined;
 const identity=explicitIdentity?verifiedModelIdentity(provenance.requestedModel,provenance.servingModel,provenance.servingProvider):verifiedModelIdentity(PERSONALITY_MODEL,PERSONALITY_MODEL,PERSONALITY_PROVIDER);
 check(identity!==null,'PERSONALITY_PROVENANCE');
 const wire=parsePersonalityWire(value,request.capableIds.length),bySlot=new Map(wire.profiles.map(p=>[p.slotId,p]));
 const profiles:CitizenPersonality[]=request.capableIds.map((citizenId,i)=>({citizenId,policy:'citizen-personality-v1',origin:'model-generated',traits:wireTraits(bySlot.get('profile-'+(i+1))!),generationId:provenance.id}));
 profiles.push(...backgroundProfiles(request.backgroundIds,request.seedDigest,profiles));
 const generation:PersonalityGeneration={id:provenance.id,mode:'real-provider',status:'accepted',requestId:request.requestId,inputDigest:request.inputDigest,outputDigest:await sha({profiles:request.capableIds.map((_,i)=>encodeTraits('profile-'+(i+1),profiles[i].traits))}),requestedModel:identity.model,servingModel:identity.model,servingProvider:identity.servingProvider,...(provenance.wireRequestDigest===undefined?{}:{wireRequestDigest:provenance.wireRequestDigest}),fallback:false,uncertain:false,inputTokens:provenance.inputTokens,outputTokens:provenance.outputTokens,costUsd:provenance.costUsd,usageBasis:provenance.costUsd===null?'provider-reported-tokens-cost-unknown':'provider-reported'};
 const body={version:1 as const,policy:'personality-initialization-v1' as const,runId:request.runId,seedDigest:request.seedDigest,capableIds:request.capableIds,backgroundIds:request.backgroundIds,profiles,generation};
 return validatePersonalityRoster({...body,id:'personality-roster-'+await sha(body)},request.capableIds,request.backgroundIds);
}

/** Synchronous strict shape/provenance parser for pure replay. Full SHA verification is async below. */
export function parsePersonalityRoster(value:unknown,capableIds:readonly string[],backgroundIds:readonly string[]=[]):PersonalityRoster{
 safe('PERSONALITY_ROSTER',()=>assertJsonData(value));check(bytes(value)<=PERSONALITY_LIMITS.rosterBytes,'PERSONALITY_OUTPUT_LIMIT');
 const r=safe('PERSONALITY_ROSTER',()=>object(value,['version','policy','id','runId','seedDigest','capableIds','backgroundIds','profiles','generation']));
 check(r.version===1&&r.policy==='personality-initialization-v1'&&typeof r.id==='string'&&/^personality-roster-[a-f0-9]{64}$/.test(r.id)&&typeof r.seedDigest==='string'&&/^[a-f0-9]{64}$/.test(r.seedDigest),'PERSONALITY_ROSTER');
 safe('PERSONALITY_ROSTER',()=>{identifier(r.runId);text(r.runId,128);});
 const expected=initialization({runId:r.runId as string,seed:'not-used-for-shape',capableIds:[...capableIds],backgroundIds:[...backgroundIds]});
 check(canonical(r.capableIds)===canonical(expected.capableIds)&&canonical(r.backgroundIds)===canonical(expected.backgroundIds),'PERSONALITY_ROSTER');
 check(Array.isArray(r.profiles)&&r.profiles.length===expected.capableIds.length+expected.backgroundIds.length,'PERSONALITY_ROSTER');
 const generationKeys=['id','mode','status','requestId','inputDigest','outputDigest','requestedModel','servingModel','servingProvider','fallback','uncertain','inputTokens','outputTokens','costUsd','usageBasis'];
 const g=safe('PERSONALITY_PROVENANCE',()=>object(r.generation,[...generationKeys,'wireRequestDigest'],generationKeys));
 const identity=verifiedModelIdentity(g.requestedModel,g.servingModel,g.servingProvider);
 if(g.wireRequestDigest!==undefined)check(identity?.provider==='anthropic'&&g.mode==='real-provider'&&typeof g.wireRequestDigest==='string'&&/^[a-f0-9]{64}$/.test(g.wireRequestDigest),'PERSONALITY_PROVENANCE');
 safe('PERSONALITY_PROVENANCE',()=>identifier(g.id));check(['offline-mock','real-provider'].includes(g.mode as string)&&g.status==='accepted'&&identity!==null&&(g.mode!=='offline-mock'||identity.model===PERSONALITY_MODEL)&&g.fallback===false&&g.uncertain===false,'PERSONALITY_PROVENANCE');
 for(const k of ['requestId','inputDigest','outputDigest'])check(typeof g[k]==='string'&&/^[a-f0-9]{64}$/.test(g[k] as string),'PERSONALITY_PROVENANCE');
 check(Number.isSafeInteger(g.inputTokens)&&(g.inputTokens as number)>=0&&Number.isSafeInteger(g.outputTokens)&&(g.outputTokens as number)>0&&(g.outputTokens as number)<=PERSONALITY_LIMITS.outputTokens, 'PERSONALITY_PROVENANCE');
 check(g.costUsd===null?g.mode==='real-provider'&&identity?.provider==='anthropic'&&g.usageBasis==='provider-reported-tokens-cost-unknown':typeof g.costUsd==='number'&&Number.isFinite(g.costUsd)&&g.costUsd>=0,'PERSONALITY_PROVENANCE');
 check(g.mode==='offline-mock'?g.costUsd===0&&g.usageBasis==='offline-byte-upper-bound':g.usageBasis===(g.costUsd===null?'provider-reported-tokens-cost-unknown':'provider-reported'),'PERSONALITY_PROVENANCE');
 const order=[...expected.capableIds,...expected.backgroundIds],vectors=new Set<string>();
 for(const [index,value]of r.profiles.entries()){
  const p=safe('PERSONALITY_ROSTER',()=>object(value,['citizenId','policy','origin','traits','generationId']));check(p.citizenId===order[index]&&p.policy==='citizen-personality-v1','PERSONALITY_ROSTER');const t=traits(p.traits);
  if(index<expected.capableIds.length){check(p.origin===(g.mode==='offline-mock'?'offline-mock':'model-generated')&&p.generationId===g.id,'PERSONALITY_PROVENANCE');const key=canonical(t);check(!vectors.has(key),'PERSONALITY_DIVERSITY');vectors.add(key);}
  else check(p.origin==='deterministic-rule'&&p.generationId===null,'PERSONALITY_PROVENANCE');
 }
 const expectedBackground=backgroundProfiles(expected.backgroundIds,r.seedDigest as string,(r.profiles as CitizenPersonality[]).slice(0,expected.capableIds.length));check(canonical((r.profiles as CitizenPersonality[]).slice(expected.capableIds.length))===canonical(expectedBackground),'PERSONALITY_PROVENANCE');
 return freezeSnapshot(value as PersonalityRoster);
}

/** Use at the trusted async service boundary before genesis; restore performs no inference. */
export async function validatePersonalityRoster(value:unknown,capableIds:readonly string[],backgroundIds:readonly string[]=[]):Promise<PersonalityRoster>{
 const r=parsePersonalityRoster(value,capableIds,backgroundIds),inputDigest=await sha(requestBody(r.capableIds,r.seedDigest));
 const requestId=await sha({version:1,policy:'personality-request-v1',runId:r.runId,capableIds:r.capableIds,seedDigest:r.seedDigest,inputDigest});
 const outputDigest=await sha({profiles:r.capableIds.map((_,i)=>encodeTraits('profile-'+(i+1),r.profiles[i].traits))});
 const {id,...body}=r;check(r.generation.inputDigest===inputDigest&&r.generation.requestId===requestId&&r.generation.outputDigest===outputDigest&&id==='personality-roster-'+await sha(body),'PERSONALITY_DIGEST');return r;
}

/** Capacity accounting only: adding a roster to an already-full legacy request cannot be guaranteed. */
export function combinedPlanningCapacity(legacyInputBytes:number,legacyOutputTokens:number,capableAgents:number){
 check(Number.isSafeInteger(legacyInputBytes)&&legacyInputBytes>=0&&legacyInputBytes<=24000&&Number.isSafeInteger(legacyOutputTokens)&&legacyOutputTokens>=0&&legacyOutputTokens<=6000&&Number.isSafeInteger(capableAgents)&&capableAgents>=1&&capableAgents<=70,'PERSONALITY_INPUT');
 const maximum={profiles:Array.from({length:capableAgents},(_,i)=>({slotId:'profile-'+(i+1),style:'exploratory',c:4,i:4,d:4,k:4,u:4}))};
 return {existingRelationshipContract:'dynamic_relationships_v2',combinedEnabled:false,guaranteed:false,inputHeadroomBytes:24000-legacyInputBytes,outputHeadroomTokens:6000-legacyOutputTokens,standaloneMaximumOutputBytes:bytes(maximum),standaloneOutputByteCeiling:PERSONALITY_LIMITS.outputBytes,liveInitializationEnabled:false,reason:'Existing relationship schema is relationship-only. No roster space is reserved at maximum valid input/output; a separate bounded interface is available only to offline mocks until new admission is authorised.'};
}
