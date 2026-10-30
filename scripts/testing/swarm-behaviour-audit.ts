/** Zero-network audit of actual society transitions, or a saved accepted application world. */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {canonical,ensure} from '../../lib/experiments/validation.ts';
import {createSociety,stepSociety,advanceSociety,act,visibleFeed,restoreSociety,saveSociety,type SocietyWorld,type SocialItem} from '../../lib/society/engine.ts';
import {populationView,buildPopulation} from '../../lib/server/population/store.ts';
import {buildSocietyGeography} from '../../lib/server/population/geography.ts';
import {societyReport} from '../../lib/society/report.ts';
import {societyMapSnapshot} from '../../lib/society/geography.ts';
import {worldFixtures} from '../../lib/world-graph/fixtures.ts';
import {createDynamicPlan} from '../../lib/dynamic-scenarios/plan.ts';
import {createDynamicInput} from '../../lib/dynamic-scenarios/execution.ts';
import {runStakeholderSimulation,deterministicTurn} from '../../lib/stakeholder-simulation/engine.ts';

const option=process.argv.find(s=>s.startsWith('--world='));
const out=join(process.cwd(),'tmp/swarm-behaviour',option?'live':'offline');mkdirSync(out,{recursive:true});
let final:SocietyWorld;
const start=performance.now();
if(option)final=restoreSociety(readFileSync(option.slice(8),'utf8'));
else{
 const f=worldFixtures()[0],plan=await createDynamicPlan(f.request,f.draft);
 const run=await runStakeholderSimulation(await createDynamicInput(plan),{attemptId:'behaviour-baseline',provider:'offline-fixture',model:'deterministic-fixture',generateTurn:async c=>deterministicTurn(c)});
 final=advanceSociety(createSociety({runId:run.runId,question:f.request.question,seed:'behaviour-baseline-v1',population:populationView(buildPopulation({size:10000,seed:'impactlens-society-v1'})),geography:buildSocietyGeography(),roles:plan.draft.agents,jurisdictions:plan.draft.jurisdictions,acceptedActions:run.events.map(e=>({id:e.id,roleId:e.roleId,statement:e.statement,position:e.position}))}),80);
 writeFileSync(join(out,'world.json'),saveSociety(final));
}
const initial=createSociety(final.genesis.input),states:SocietyWorld[]=[initial];
for(let tick=0;tick<final.tick;tick++)states.push(stepSociety(states.at(-1)!));
ensure(canonical(states.at(-1))===canonical(final),'Replay mismatch.');
const itemById=new Map(final.items.map(i=>[i.id,i])),eventById=new Map(final.events.map(e=>[e.id,e]));
const eventIndex=new Map(final.events.map((e,i)=>[e.id,i]));
const briefEvent=(id:string)=>{const e=eventById.get(id)!;return {id:e.id,type:e.type,actorId:e.actorId,minute:e.minute,platform:e.platform,targetId:e.targetId,causes:e.causes,position:e.position,previousPosition:e.previousPosition,source:e.source,sourceEventId:e.sourceEventId};};
function exposes(item:SocialItem,read:SocietyWorld['events'][number]){
 if(read.type!=='read'||eventIndex.get(read.id)!<=eventIndex.get(item.id)!)return false;
 if(read.targetId===item.id)return true;
 if(read.targetId!==item.parentId)return false;
 const at=eventIndex.get(read.id)!;
 return final.items.filter(i=>i.parentId===read.targetId&&eventIndex.get(i.id)!<at&&!final.events.some(e=>e.type==='moderate'&&e.targetId===i.id&&eventIndex.get(e.id)!<at)).slice(-6).some(i=>i.id===item.id);
}
const briefItem=(i:SocialItem)=>({id:i.id,actorId:i.actorId,minute:i.tick*15,platform:i.platform,parentId:i.parentId,text:i.text,position:i.position,likes:i.likes,votes:i.votes,sharedFrom:i.sharedFrom,event:briefEvent(i.id),exposures:final.events.filter(e=>exposes(i,e)).map(e=>briefEvent(e.id))});
function descendants(root:string):SocialItem[]{const children=final.items.filter(i=>i.parentId===root);return children.flatMap(i=>[i,...descendants(i.id)]);}
const threads=(platform:string)=>final.items.filter(i=>i.platform===platform&&!i.parentId).sort((a,b)=>descendants(b.id).length-descendants(a.id).length||b.likes-a.likes).slice(0,3).map(p=>({opening:briefItem(p),comments:descendants(p.id).map(briefItem)}));
const selected=[...final.agents.slice(0,2),...final.agents.slice(4).sort((a,b)=>b.actions-a.actions).slice(0,1)];
const journeys=selected.map(a=>({id:a.id,label:a.label,role:a.role?.id??null,goal:a.goal,resistance:a.resistance,initialPosition:a.initialOpinion,finalPosition:a.opinion,turns:a.turns,actions:a.actions,ties:final.ties.filter(t=>t.source===a.id),finalMemory:a.memory,events:final.events.filter(e=>e.actorId===a.id).map(e=>({...briefEvent(e.id),text:e.text})),memoryCheckpoints:states.filter(w=>[0,8,20,40,60,80].includes(w.tick)).map(w=>({tick:w.tick,memory:w.agents.find(x=>x.id===a.id)!.memory,position:w.agents.find(x=>x.id===a.id)!.opinion}))}));
const shares=final.events.filter(e=>e.type==='share');
const path=shares.map(s=>{const origin=itemById.get(s.targetId!)!,read=final.events.find(e=>e.type==='read'&&e.targetId===s.id&&e.actorId!==s.actorId),later=read?final.events.find(e=>e.actorId===read.actorId&&e.targetId===s.id&&e.type==='opinion'&&e.causes.includes(read.id)):null;return {origin:briefItem(origin),share:briefEvent(s.id),read:read?briefEvent(read.id):null,later:later?briefEvent(later.id):null};}).find(p=>p.later)??null;
const opinionSamples=final.events.filter(e=>e.type==='opinion').slice(0,5).map(e=>{const a=final.agents.find(a=>a.id===e.actorId)!,target=itemById.get(e.targetId!)!;return {...briefEvent(e.id),resistance:a.resistance,targetPosition:target.position,expected:e.previousPosition!+final.genesis.config.influence*(1-a.resistance)*(target.position-e.previousPosition!)};});
// Counterfactuals are labelled probes, never inserted into the saved application world.
const author=initial.agents[1],reader=initial.agents[0];
function probe(text:string){let w=act(initial,{actorId:author.id,type:'post',platform:'instagram',text,position:0.8});const p=w.items.at(-1)!;ensure(visibleFeed(w,reader.id,'instagram').some(i=>i.id===p.id));let noExposureRejected=false;try{act(w,{actorId:reader.id,type:'comment',platform:'instagram',targetId:p.id,text:'Probe reply'});}catch{noExposureRejected=true;}
 w=act(w,{actorId:reader.id,type:'read',platform:'instagram',targetId:p.id});w=act(w,{actorId:reader.id,type:'opinion',platform:'instagram',targetId:p.id});const after=w.agents.find(a=>a.id===reader.id)!;let forgottenRejected=false;try{act({...w,agents:w.agents.map(a=>a.id===reader.id?{...a,memory:[]}:a)},{actorId:reader.id,type:'comment',platform:'instagram',targetId:p.id,text:'Probe reply'});}catch{forgottenRejected=true;}return {position:after.opinion,noExposureRejected,forgottenRejected};}
const positive=probe('Offline probe: I support a shorter workweek.'),negative=probe('Offline probe: I oppose a shorter workweek.');
const generic=final.agents.filter(a=>!a.role),authored=final.events.filter(e=>['post','comment','reply'].includes(e.type)&&e.source==='deterministic-rule');
const seedIds=new Set(final.events.filter(e=>e.sourceEventId).map(e=>e.id));
const seedReads=final.events.filter(e=>e.type==='read'&&seedIds.has(e.targetId??''));
const seedExposure={directReads:seedReads.length,distinctReaders:new Set(seedReads.map(e=>e.actorId)).size,seedPostsRead:new Set(seedReads.map(e=>e.targetId)).size,totalSeedPosts:seedIds.size};
const report=societyReport(final,final.genesis.input.runId),map=societyMapSnapshot(final);
const result={evidence:option?'Saved real-provider-seeded application world; later social events are rules':'Offline fixture only',runId:final.genesis.input.runId,seed:final.genesis.input.seed,agents:final.agents.length,steps:final.tick,minutes:final.tick*15,events:final.events.length,items:final.items.length,modelSeedEvents:final.events.filter(e=>e.sourceEventId).length,ruleEvents:report.ruleActions,platforms:report.platforms,seedExposure,uniqueGenericGoals:new Set(generic.map(a=>a.goal)).size,genericAgents:generic.length,authoredRuleEvents:authored.length,uniqueAuthoredRuleTexts:new Set(authored.map(e=>e.text)).size,memoryMaximum:Math.max(...states.flatMap(w=>w.agents.map(a=>a.memory.length))),replay:'exact',reddit:threads('reddit'),instagram:threads('instagram'),journeys,crossPlatformPath:path,opinionSamples,counterfactualProbes:{positive,negative,semanticTextIgnored:positive.position===negative.position,warning:'Constructed offline probes, not actual recorded conversation evidence.'},map:{located:map.features.features.length,unlocated:map.unlocated,sourceHash:map.sourceHash},bytes:Buffer.byteLength(saveSociety(final)),elapsedMs:performance.now()-start};
writeFileSync(join(out,'behaviour-evidence.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,reddit:result.reddit.map(t=>({id:t.opening.id,comments:t.comments.length,opening:t.opening.text.slice(0,180),firstReply:t.comments[0]?.text.slice(0,220)})),instagram:result.instagram.map(t=>({id:t.opening.id,comments:t.comments.length,likes:t.opening.likes,opening:t.opening.text.slice(0,180)})),journeys:result.journeys.map(j=>({id:j.id,label:j.label,goal:j.goal,initial:j.initialPosition,final:j.finalPosition,memory:j.finalMemory.length,events:j.events.length})),crossPlatformPath:path?{from:path.origin.platform,to:path.share.platform,share:path.share.id,read:path.read?.id,update:path.later?.id}:null},null,2));
