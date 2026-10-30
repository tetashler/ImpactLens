/** Authoritative local sessions. Client worlds/costs are never executable inputs. */
import {existsSync,mkdirSync,readFileSync,openSync,closeSync,writeSync,fsyncSync,statSync} from 'node:fs';
import {join} from 'node:path';import {randomUUID,createHash} from 'node:crypto';
import {verifyStakeholderRun} from '../../stakeholder-simulation/identities.ts';
import type {StakeholderSimulationRunV1} from '../../stakeholder-simulation/contract.ts';
import {createSociety,restoreSocietyForInput,type SocietyWorld,type SocietyInput} from '../../society/engine.ts';
import {prepareHybridStep,finishDecision,hybridBudget,replayHybrid} from '../../society/hybrid.ts';
import {HYBRID_DEFAULTS,type DecisionContext} from '../../society/decision-contract.ts';
import {buildPopulation,populationView} from '../population/store.ts';import {buildSocietyGeography} from '../population/geography.ts';
import {createSocialTransport} from '../inference/social.ts';import {acquireAiSlot} from '../ai/gate.ts';
import {canonical,ensure,object} from '../../experiments/validation.ts';
export interface SocialDependencies {enabled?:boolean;key?:string;fetcher?:typeof fetch;directory?:string}
interface Session {id:string;runId:string;world:SocietyWorld;revision:number;busy:boolean;reservation:DecisionContext|null}
const globalState=globalThis as typeof globalThis&{__socialSessions?:Map<string,Session>};const sessions=globalState.__socialSessions??=new Map<string,Session>();
const enabled=(d:SocialDependencies)=>d.enabled??(process.env.SOCIAL_LLM_ENABLED==='true'&&process.env.STAKEHOLDER_LIVE_ENABLED==='true');
const directory=(d:SocialDependencies)=>d.directory??join(process.cwd(),'data/derived/agents/social-sessions');
const response=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export function socialStatus(d:SocialDependencies={}){return {version:1,enabled:enabled(d),configured:!!(d.key??process.env.OPENROUTER_API_KEY)?.trim(),limits:HYBRID_DEFAULTS,model:'deepseek/deepseek-v4-flash-0731',provider:'digitalocean',fallback:false};}
function persist(s:Session,root:string){mkdirSync(root,{recursive:true});const path=join(root,s.id+'.jsonl');ensure(!existsSync(path)||statSync(path).size<64*1024*1024,'SOCIAL_STORAGE_LIMIT');const line=JSON.stringify({id:s.id,runId:s.runId,revision:s.revision,input:s.world.genesis.input,tick:s.world.tick,hybrid:s.world.hybrid,reservation:s.reservation})+'\n';ensure(Buffer.byteLength(line)<2*1024*1024,'SOCIAL_STORAGE_LIMIT');const fd=openSync(path,'a');try{ensure(writeSync(fd,line)===Buffer.byteLength(line));fsyncSync(fd);}finally{closeSync(fd);}}
function load(id:string,root:string):Session{ensure(/^[a-f0-9-]{36}$/.test(id),'SOCIAL_SESSION');const key=root+'/'+id;const cached=sessions.get(key);if(cached){if(cached.reservation&&!cached.busy){cached.world=finishDecision(cached.world,{decision:null,usage:null,error:'SOCIAL_UNCERTAIN'});cached.reservation=null;cached.revision++;persist(cached,root);}return cached;}const path=join(root,id+'.jsonl');ensure(statSync(path).size<66*1024*1024,'SOCIAL_STORAGE_LIMIT');const lines=readFileSync(path,'utf8');ensure(lines.endsWith('\n'),'SOCIAL_STORAGE_INCOMPLETE');const v=JSON.parse(lines.trimEnd().split('\n').at(-1)!);let world=replayHybrid(v.input,v.tick,v.hybrid.records,v.hybrid.pending);const s:Session={id,runId:v.runId,world,revision:v.revision,busy:false,reservation:null};if(v.reservation){ensure(canonical(world.hybrid?.pending)===canonical(v.reservation));s.world=finishDecision(world,{decision:null,usage:null,error:'SOCIAL_UNCERTAIN'});s.revision++;persist(s,root);}if(sessions.size>=4){const first=[...sessions.entries()].find(([,s])=>!s.busy);ensure(first,'SOCIAL_BUSY');sessions.delete(first[0]);}sessions.set(key,s);return s;}
async function body(request:Request){const reader=request.body?.getReader();ensure(reader,'SOCIAL_REQUEST');const chunks:Uint8Array[]=[];let size=0;try{while(true){request.signal.throwIfAborted();const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>524288){await reader.cancel();throw Error('SOCIAL_REQUEST_SIZE');}chunks.push(r.value);}}finally{reader.releaseLock();}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
export async function handleSocialRequest(request:Request,d:SocialDependencies={}){
 if(request.method==='GET')return response(socialStatus(d));
 try{
  const url=new URL(request.url),localOrigin=new URL(`${url.protocol}//${request.headers.get('host')??url.host}`).origin;ensure(!url.search&&(!request.headers.get('origin')||request.headers.get('origin')===localOrigin),'SOCIAL_ORIGIN');ensure(request.headers.get('content-type')?.split(';')[0]==='application/json','SOCIAL_REQUEST');
  ensure(enabled(d),'SOCIAL_DISABLED');const root=directory(d),b=await body(request);
  if(b.operation==='start'){
   object(b,['operation','run']);await verifyStakeholderRun(b.run as StakeholderSimulationRunV1);const run=b.run as StakeholderSimulationRunV1;ensure(run.inputSnapshot.version===2,'SOCIAL_RUN');const plan=run.inputSnapshot.scenarioPlan;
   mkdirSync(root,{recursive:true});const index=join(root,createHash('sha256').update(run.runId).digest('hex')+'.index');
   if(existsSync(index)){const s=load(readFileSync(index,'utf8'),root);return response({version:1,sessionId:s.id,revision:s.revision,world:s.world});}
   const fs=await import('node:fs');ensure(fs.readdirSync(root).filter(s=>s.endsWith('.index')).length<16,'SOCIAL_SESSION_LIMIT');
   const input:SocietyInput={runId:run.runId,question:plan.request.question,seed:plan.requestIdentity.slice(-32),population:populationView(buildPopulation({size:10000,seed:'impactlens-society-v1'})),geography:buildSocietyGeography(),sharePolicy:'source-position-v1',socialPolicy:'memory-aware-v1',hybrid:{...HYBRID_DEFAULTS,maxCalls:Number(process.env.SOCIAL_MAX_DECISIONS??HYBRID_DEFAULTS.maxCalls),selectedAgents:Number(process.env.SOCIAL_CONTROLLED_AGENTS??HYBRID_DEFAULTS.selectedAgents)},config:{agents:Number(process.env.SOCIAL_ACTIVE_AGENTS??24)},briefing:{assumptions:plan.draft.assumptions.slice(0,4).map(a=>a.text.slice(0,300)),sources:(plan.grounding?.sources??[]).slice(0,2).map(s=>({id:s.id,title:s.title,url:s.url,retrievedAt:s.retrievedAt,publishedAt:s.publishedAt,passage:s.passages[0].text.slice(0,600)}))},roles:plan.draft.agents,jurisdictions:plan.draft.jurisdictions,acceptedActions:run.events.map(e=>({id:e.id,roleId:e.roleId,statement:e.statement,position:e.position}))};
   const s:Session={id:randomUUID(),runId:run.runId,world:createSociety(input),revision:0,busy:false,reservation:null};persist(s,root);fs.writeFileSync(index,s.id,{flag:'wx'});if(sessions.size>=4){const entry=[...sessions.entries()].find(([,s])=>!s.busy);ensure(entry,'SOCIAL_BUSY');sessions.delete(entry[0]);}sessions.set(root+'/'+s.id,s);return response({version:1,sessionId:s.id,revision:0,world:s.world});
  }
  object(b,['operation','sessionId','revision']);ensure(b.operation==='step'&&Number.isSafeInteger(b.revision),'SOCIAL_REQUEST');const s=load(b.sessionId,root);ensure(!s.busy&&s.revision===b.revision,'SOCIAL_STALE');s.busy=true;
  try{
   let world=prepareHybridStep(s.world);
   if(world.hybrid?.pending&&!hybridBudget(world).exhausted){
    const release=acquireAiSlot('social:'+s.id);try{
     const transport=createSocialTransport({key:d.key??process.env.OPENROUTER_API_KEY??'',fetcher:d.fetcher});s.world=world;s.reservation=world.hybrid.pending;persist(s,root);
     let decision:unknown|null=null,error:string|null=null;try{decision=(await transport.generate(world.hybrid.pending,request.signal)).value;if(request.signal.aborted){decision=null;error='AI_CANCELLED';}}catch(e){error=typeof (e as {code?:unknown})?.code==='string'?(e as {code:string}).code:'SOCIAL_FAILURE';}
     world=finishDecision(world,{decision,usage:transport.records.at(-1)??null,error:transport.records.at(-1)?.socialValidationRule??error});s.reservation=null;
    }finally{release();}
   }
   s.world=world;s.revision++;persist(s,root);return response({version:1,sessionId:s.id,revision:s.revision,world:s.world,budget:hybridBudget(s.world)});
  }finally{s.busy=false;}
 }catch(e){const reason=e instanceof Error&&/^SOCIAL_[A-Z_]+$/.test(e.message)?e.message:'SOCIAL_UNAVAILABLE';return response({version:1,error:reason,message:'The bounded social operation could not complete. Accepted events remain available.'},reason==='SOCIAL_DISABLED'?503:409);}
}
