import {ensure} from '../experiments/validation.ts';
import {advanceSociety,createSociety} from './engine.ts';
import {societyMapSnapshot} from './geography.ts';
import type {Platform,SocialKind,SocietyWorld} from './contract.ts';

const kinds:SocialKind[]=['post','read','comment','reply','like','upvote','downvote','follow','unfollow','share','opinion','activity','inactive','moderate'];
type Bucket={agents:number;events:number;opinionChanges:number};
const bucket=():Bucket=>({agents:0,events:0,opinionChanges:0});

/** Read-only projections of the accepted world, never generated narrative or polling estimates. */
export function societyReport(w:SocietyWorld,expectedRunId:string){
 ensure(w.genesis.input.runId===expectedRunId,'Social report belongs to a different accepted run.');
 const agents=new Map(w.agents.map(a=>[a.id,a]));
 const events=new Map(w.events.map(e=>[e.id,e]));
 const items=new Map(w.items.map(i=>[i.id,i]));
 const participants=new Set(w.events.filter(e=>e.platform).map(e=>e.actorId));
 const platforms=Object.fromEntries((['reddit','instagram'] as const).map(platform=>[platform,{
  actions:Object.fromEntries(kinds.map(kind=>[kind,w.events.filter(e=>e.platform===platform&&e.type===kind).length])) as Record<SocialKind,number>,
  threads:w.items.filter(i=>i.platform===platform&&!i.parentId).length,
  participants:new Set(w.events.filter(e=>e.platform===platform).map(e=>e.actorId)).size,
  visibleItems:w.items.filter(i=>i.platform===platform&&!i.hidden).length,
 }])) as Record<Platform,{actions:Record<SocialKind,number>;threads:number;participants:number;visibleItems:number}>;
 const dimensions={ageBands:{} as Record<string,Bucket>,sex:{} as Record<string,Bucket>,areas:{} as Record<string,Bucket>};
 let locatedProfiles=0;
 for(const a of w.agents){
  if(!a.resident)continue;
  locatedProfiles++;
  const own=w.events.filter(e=>e.actorId===a.id);
  for(const [dimension,key]of [[dimensions.ageBands,a.resident.ageGroup],[dimensions.sex,a.resident.sex],[dimensions.areas,a.resident.planningAreaName]] as const){
   const b=dimension[key]??=bucket();b.agents++;b.events+=own.length;b.opinionChanges+=own.filter(e=>e.type==='opinion').length;
  }
 }
 const map=societyMapSnapshot(w),areas:Record<string,{agents:number;activityEvents:number;socialEvents:number}>={};
 for(const f of map.features.features){
  const b=areas[f.properties.planningArea]??={agents:0,activityEvents:0,socialEvents:0};b.agents++;
  const own=w.events.filter(e=>e.actorId===f.properties.agentId);b.activityEvents+=own.filter(e=>e.type==='activity').length;
  b.socialEvents+=own.filter(e=>e.platform).length;
 }
 const opinionChanges=w.events.filter(e=>e.type==='opinion').map(e=>({
  eventId:e.id,agentId:e.actorId,label:agents.get(e.actorId)!.label,minute:e.minute,
  before:e.previousPosition!,after:e.position!,delta:e.position!-e.previousPosition!,
  causes:e.causes.filter(id=>events.has(id)),
  rule:'bounded-assimilation' as const,
 }));
 const diffusion=w.events.filter(e=>e.type==='share').flatMap(e=>{
  const original=items.get(e.targetId??'');
  return original?[{eventId:e.id,actorId:e.actorId,sourceActorId:original.actorId,sourceItemId:original.id,from:original.platform,to:e.platform!,minute:e.minute,causes:e.causes}]:[];
 });
 return {
  version:1 as const,worldId:w.genesis.id,runId:expectedRunId,question:w.genesis.input.question,
  tick:w.tick,minutes:w.tick*15,status:w.status,eventCount:w.events.length,
  agents:w.agents.length,participants:participants.size,modelRoles:w.genesis.input.roles.length,
  modelStatements:w.events.filter(e=>e.source==='accepted-model-action').length,
  ruleActions:w.events.filter(e=>e.source==='deterministic-rule').length,
  platforms,diffusion,opinionChanges,sharingPolicy:w.genesis.input.sharePolicy??'legacy-sharer-position',
  finalOpinions:w.agents.map(a=>({id:a.id,label:a.label,initial:a.initialOpinion,current:a.opinion})),
  demographics:{locatedProfiles,unassignedProfiles:w.agents.length-locatedProfiles,...dimensions},
  geography:{sourceHash:map.sourceHash,referenceYear:w.genesis.input.geography?.referenceYear??null,located:map.features.features.length,unlocated:map.unlocated,areas},
  population:{id:w.genesis.input.population.id,seed:w.genesis.input.population.seed,size:w.genesis.input.population.sampleSize,source:w.genesis.input.population.source,...w.genesis.input.population.validation},
  chronology:w.events,
  limitations:[
   w.genesis.input.sharePolicy?'Shares preserve the recorded source position; no semantic understanding is implied.':'Legacy sharing uses the sharer position with copied source text; these may disagree. This saved world is replayed unchanged.',
   'Fictional activity is not an observed poll, real social-media engagement or a forecast of Singapore behaviour.',
   'Census weights describe the full generated population. The selected active subgroup and its outcomes are unweighted and must not be extrapolated to Singapore.',
   'Age-band, sex and geographic margins are Census 2020 context; opinions, ties, participation, resistance and influence are uncalibrated assumptions.',
   'Geographic breakdowns associate events with synthetic subzone contexts, not measured social-media locations, home addresses or journeys.',
   'No measured productivity, wages, GDP, health or causal policy effects are produced by the social rules.',
   'Model statements were accepted in the original scenario run. Platform placement is an application assumption; subsequent rule actions require no new inference.',
   ...w.genesis.assumptions,
  ],
 };
}

/** Three small rule-only comparisons; same recorded model inputs, no confidence intervals or provider calls. */
export function societySensitivity(w:SocietyWorld){
 const variants=[{label:'Recorded settings',world:w},
  {label:'Lower participation',world:advanceSociety(createSociety({...w.genesis.input,config:{...w.genesis.config,activation:w.genesis.config.activation*0.5}}),w.tick)},
  {label:'Higher participation',world:advanceSociety(createSociety({...w.genesis.input,config:{...w.genesis.config,activation:Math.min(1,w.genesis.config.activation*1.5)}}),w.tick)}];
 return variants.map(({label,world})=>({label,steps:world.tick,activation:world.genesis.config.activation,events:world.events.length,opinionChanges:world.events.filter(e=>e.type==='opinion').length,meanPosition:world.agents.reduce((s,a)=>s+a.opinion,0)/world.agents.length}));
}
